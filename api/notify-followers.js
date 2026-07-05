// Vercel serverless — notifie les abonnés d'un auteur quand il poste
// Tourne côté serveur (service account) → pas de problème de règles Firebase
// Body attendu : { authorKey, authorName, secret }

import crypto from "crypto";

const PROJECT_ID = "murcia2026-72651";
let _accessToken = null;
let _tokenExpiry  = 0;

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT non configuré dans Vercel");

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

// Requête Firestore via REST API (admin rights)
async function firestoreQuery(accessToken, structuredQuery) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const resp = await fetch(url, {
    method:  "POST",
    headers: { Authorization:`Bearer ${accessToken}`, "Content-Type":"application/json" },
    body:    JSON.stringify({ structuredQuery }),
  });
  if (!resp.ok) throw new Error(`Firestore query failed ${resp.status}: ${await resp.text()}`);
  return resp.json(); // array of { document: { name, fields } } (peut contenir des docs vides si pas de résultats)
}

async function sendOne(accessToken, token, title, body, data) {
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
              tag:   (data || {}).tag || "murcia-post",
              renotify: true,
            },
            fcm_options: { link: "/" },
          },
        },
      }),
    }
  );
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`FCM ${resp.status}: ${txt.slice(0,200)}`);
  }
  return resp.json();
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") return res.status(405).json({ error:"Method Not Allowed" });

  const secret = process.env.NOTIFY_SECRET;
  if (secret && req.body?.secret !== secret) return res.status(403).json({ error:"Forbidden" });

  const { authorKey, authorName } = req.body || {};
  if (!authorKey || !authorName) return res.status(400).json({ error:"authorKey and authorName required" });

  try {
    const accessToken = await getAccessToken();

    // 1. Trouve tous les abonnés (docs subscriptions où following array-contains authorKey)
    const subResults = await firestoreQuery(accessToken, {
      from: [{ collectionId:"subscriptions" }],
      where: {
        fieldFilter: {
          field: { fieldPath:"following" },
          op: "ARRAY_CONTAINS",
          value: { stringValue: authorKey },
        },
      },
    });

    // Extrait les IDs (document name = .../{collectionId}/{docId})
    const followerKeys = subResults
      .filter(r => r.document)
      .map(r => r.document.name.split("/").pop());

    if (followerKeys.length === 0) {
      return res.status(200).json({ sent:0, failed:0, msg:"No followers" });
    }

    // 2. Récupère les tokens push de ces abonnés (par lots de 10, limite Firestore IN)
    const tokens = [];
    for (let i = 0; i < followerKeys.length; i += 10) {
      const batch = followerKeys.slice(i, i + 10);
      const tokenResults = await firestoreQuery(accessToken, {
        from: [{ collectionId:"pushTokens" }],
        where: {
          fieldFilter: {
            field: { fieldPath:"userId" },
            op: "IN",
            value: { arrayValue: { values: batch.map(k => ({ stringValue: k })) } },
          },
        },
      });
      tokenResults
        .filter(r => r.document?.fields?.token?.stringValue)
        .forEach(r => tokens.push(r.document.fields.token.stringValue));
    }

    if (tokens.length === 0) {
      return res.status(200).json({ sent:0, failed:0, msg:"No push tokens for followers", followerKeys });
    }

    // 3. Envoie les notifications
    const results = await Promise.allSettled(
      tokens.map(t => sendOne(accessToken, t,
        "Murci'App 📸",
        `${authorName} a posté une nouvelle photo !`,
        { type:"post", authorKey, tag:`post-${authorKey}` }
      ))
    );

    const sent   = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    const errors = results.filter(r => r.status === "rejected").map(r => r.reason?.message).filter(Boolean);

    console.log(`[notify-followers] authorKey=${authorKey} followers=${followerKeys.length} tokens=${tokens.length} sent=${sent} failed=${failed}`);
    return res.status(200).json({ sent, failed, errors, followerKeys: followerKeys.length });

  } catch (e) {
    console.error("[notify-followers] error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
