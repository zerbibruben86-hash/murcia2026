// Vercel serverless — retourne le vrai nombre de posts via Firestore REST API (admin rights)

import crypto from "crypto";

const PROJECT_ID = "murcia2026-72651";
let _accessToken = null;
let _tokenExpiry  = 0;

async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT manquant");
  let sa;
  try { sa = JSON.parse(raw); } catch (e) { throw new Error("SA invalide: " + e.message); }
  const privateKey = (sa.private_key || "").replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg:"RS256", typ:"JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  })).toString("base64url");
  const toSign = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(toSign);
  const sig = signer.sign(privateKey, "base64url");
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${toSign}.${sig}` }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error("OAuth2: " + JSON.stringify(data));
  _accessToken = data.access_token;
  _tokenExpiry  = Date.now() + 55 * 60 * 1000;
  return _accessToken;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=30"); // cache 30s côté Vercel CDN
  try {
    const accessToken = await getAccessToken();
    // Aggregation query via REST
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runAggregationQuery`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredAggregationQuery: {
          structuredQuery: { from: [{ collectionId: "posts" }] },
          aggregations: [{ count: {}, alias: "count" }],
        },
      }),
    });
    if (!resp.ok) throw new Error(`Firestore ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    const count = parseInt(data[0]?.result?.aggregateFields?.count?.integerValue || "0", 10);
    return res.status(200).json({ count });
  } catch (e) {
    console.error("[post-count]", e.message);
    return res.status(500).json({ error: e.message, count: null });
  }
}
