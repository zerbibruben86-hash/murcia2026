// Vercel serverless — notifie l'auteur d'un post quand quelqu'un commente
// Body attendu : { postAuthorKey, commenterName, postId, secret }

import crypto from "crypto";

const PROJECT_ID = "murcia2026-72651";
let _accessToken = null;
let _tokenExpiry  = 0;

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT non configuré");

  let sa;
  try { sa = JSON.parse(raw); }
  catch (e) { throw new Error("FIREBASE_SERVICE_ACCOUNT invalide : " + e.message); }

  const privateKey = (sa.private_key || "").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg:"RS256", typ:"JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  })).toString("base64url");

  const toSign = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(toSign);
  const signature = signer.sign(privateKey, "base64url");

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type":"application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:   `${toSign}.${signature}`,
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error("OAuth2 failed : " + JSON.stringify(data));

  _accessToken = data.access_token;
  _tokenExpiry  = Date.now() + 55 * 60 * 1000;
  return _accessToken;
}

async function firestoreQuery(accessToken, structuredQuery) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const resp = await fetch(url, {
    method:  "POST",
    headers: { Authorization:`Bearer ${accessToken}`, "Content-Type":"application/json" },
    body:    JSON.stringify({ structuredQuery }),
  });
  if (!resp.ok) throw new Error(`Firestore query failed ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function sendFCM(accessToken, token, title, body, data) {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method:  "POST",
      headers: { Authorization:`Bearer ${accessToken}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: Object.fromEntries(Object.entries(data || {}).map(([k,v]) => [k, String(v)])),
          webpush: {
            notification: {
              title, body,
              icon:  "/icons/icon-192.png",
              badge: "/icons/badge-72.png",
              tag:   (data || {}).tag || "murcia-comment",
              renotify: true,
            },
            fcm_options: { link: "/" },
          },
        },
      }),
    }
  );
  if (!resp.ok) throw new Error(`FCM ${resp.status}: ${(await resp.text()).slice(0,200)}`);
  return resp.json();
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") return res.status(405).json({ error:"Method Not Allowed" });

  const secret = process.env.NOTIFY_SECRET;
  if (secret && req.body?.secret !== secret) return res.status(403).json({ error:"Forbidden" });

  const { postAuthorKey, commenterName, postId } = req.body || {};
  if (!postAuthorKey || !commenterName) return res.status(400).json({ error:"postAuthorKey and commenterName required" });

  try {
    const accessToken = await getAccessToken();

    // Récupère les tokens push de l'auteur du post
    const tokenResults = await firestoreQuery(accessToken, {
      from: [{ collectionId:"pushTokens" }],
      where: {
        fieldFilter: {
          field: { fieldPath:"userId" },
          op: "EQUAL",
          value: { stringValue: postAuthorKey },
        },
      },
    });

    const tokens = tokenResults
      .filter(r => r.document?.fields?.token?.stringValue)
      .map(r => r.document.fields.token.stringValue);

    if (tokens.length === 0) {
      return res.status(200).json({ sent:0, msg:"No push tokens for post author" });
    }

    const results = await Promise.allSettled(
      tokens.map(t => sendFCM(accessToken, t,
        "Murci'App 💬",
        `${commenterName} a commenté ta photo !`,
        { type:"comment", postId: postId || "", tag:`cmt-${postId || postAuthorKey}` }
      ))
    );

    const sent   = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    const errors = results.filter(r => r.status === "rejected").map(r => r.reason?.message).filter(Boolean);

    console.log(`[notify-comment] postAuthorKey=${postAuthorKey} tokens=${tokens.length} sent=${sent} failed=${failed}`);
    return res.status(200).json({ sent, failed, errors });

  } catch (e) {
    console.error("[notify-comment] error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
