// Proxy serveur pour les images Firebase Storage
// Évite le "tainted canvas" CORS côté client
//
// ⚠️  NE PAS appeler decodeURIComponent(req.query.url) :
//     Vercel décode déjà les query params une fois.
//     Un double décodage transforme posts%2Ffile.jpg → posts/file.jpg
//     et Firebase Storage ne reconnaît plus l'objet (chemin cassé).

export default async function handler(req, res) {
  // req.query.url est déjà décodé une fois par Vercel — on l'utilise tel quel
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing url");

  // Sécurité : on ne proxie que Firebase / Google Storage
  const allowed =
    url.startsWith("https://firebasestorage.googleapis.com/") ||
    url.startsWith("https://storage.googleapis.com/");
  if (!allowed) return res.status(403).send("Forbidden");

  try {
    // Firebase Storage URLs sans ?alt=media renvoient du JSON (métadonnées)
    // → on force le téléchargement de l'image
    let fetchUrl = url;
    if (!fetchUrl.includes("alt=media")) {
      fetchUrl += (fetchUrl.includes("?") ? "&" : "?") + "alt=media";
    }

    const response = await fetch(fetchUrl);

    // Propagate les erreurs upstream (ex: token invalide → 403)
    if (!response.ok) {
      console.error("proxy upstream error:", response.status, fetchUrl.slice(0, 120));
      return res.status(response.status).send(`Upstream ${response.status}`);
    }

    const ct = response.headers.get("content-type") || "image/jpeg";
    // Rejeter si Firebase renvoie du JSON (erreur ou métadonnées) au lieu d'une image
    if (!ct.startsWith("image/") && !ct.startsWith("application/octet-stream")) {
      console.error("proxy: non-image content-type:", ct, fetchUrl.slice(0, 120));
      return res.status(502).send("Non-image response from upstream");
    }

    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", ct);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(Buffer.from(buffer));
  } catch (e) {
    console.error("proxy error:", e);
    res.status(500).send("Error");
  }
}
