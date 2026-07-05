// Vercel serverless — envoie des push notifications via FCM HTTP v1 API
// Variables d'environnement Vercel requises :
//   FIREBASE_SERVICE_ACCOUNT  = contenu JSON du service account Firebase
//   NOTIFY_SECRET             = mot de passe simple pour sécuriser l'endpoint (optionnel)
//
// Authentification : JWT RSA-SHA256 manuel via crypto natif Node.js
// (pas de google-auth-library pour éviter les problèmes ESM en serverless)

import crypto from "crypto";

const PROJECT_ID = "murcia2026-72651";
let _accessToken = null;
let _tokenExpiry  = 0;

// Construit un JWT signé et l'échange contre un access token OAuth2
async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT non configuré dans Vercel");

  let sa;
  try {
    sa = JSON.parse(raw);
  } catch (e) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT n'est pas un JSON valide : " + e.message);
  }

  // Certains outils stockent les \n littéraux dans la clé privée — on corrige
  const privateKey = (sa.private_key || "").replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  })).toString("base64url");

  const toSign  = `${header}.${payload}`;
  const signer  = crypto.createSign("RSA-SHA256");
  signer.update(toSign);
  const signature = signer.sign(privateKey, "base64url");
  const jwt = `${toSign}.${signature}`;

  // Échange JWT → access token
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:   jwt,
    }),
  });

  const data = await resp.json();
  if (!data.access_token) {
    throw new Error("Échec token OAuth2 : " + JSON.stringify(data));
  }

  _accessToken = data.access_token;
  _tokenExpiry  = Date.now() + 55 * 60 * 1000;
  return _accessToken;
}

async function sendOne(accessToken, token, title, body, data, link = "/") {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method:  "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body: body || "" },
          data: {
            ...Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)])),
            link,  // inclus dans data pour que le SW puisse le lire au clic
          },
          webpush: {
            // webpush.notification remplace l'affichage auto FCM → icône + tag anti-doublon
            notification: {
              title,
              body:  body || "",
              icon:  "/icons/icon-192.png",
              badge: "/icons/badge-72.png",
              tag:   (data || {}).tag || "murcia-notif",
              renotify: true,
            },
            fcm_options: { link },
          },
        },
      }),
    }
  );
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`FCM ${resp.status}: ${txt.slice(0, 200)}`);
  }
  return resp.json();
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Sécurité basique : secret partagé
  const secret = process.env.NOTIFY_SECRET;
  if (secret && req.body?.secret !== secret) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { tokens, title, data, link = "/" } = req.body || {};
  // Le body est forcé côté serveur selon le type — le client n'a pas de contrôle dessus
  let body = req.body?.body || "";
  // iOS tronque le title à ~1 ligne — si le body est vide (envoi manuel sans body),
  // on bascule le titre en body et on met un titre minimal.
  if (!body) {
    body  = title;   // message complet dans la zone body
    title = "📢";    // titre minimal (iOS force un titre, on peut pas l'enlever)
  }
  if (!tokens?.length) return res.status(400).json({ error: "No tokens — aucun appareil enregistré" });
  if (!title && !body) return res.status(400).json({ error: "No title nor body" });

  try {
    const accessToken = await getAccessToken();

    const results = await Promise.allSettled(
      tokens.map(t => sendOne(accessToken, t, title, body || "", data, link))
    );

    const sent   = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    const errors = results
      .filter(r => r.status === "rejected")
      .map(r => r.reason?.message)
      .filter(Boolean);

    console.log(`[notify] sent=${sent} failed=${failed}`, errors.slice(0, 3));
    return res.status(200).json({ sent, failed, errors });
  } catch (e) {
    console.error("[notify] error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
