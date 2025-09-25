// api/proposal.js
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks).toString("utf8");  // <-- fixed here
}

function parseQuery(req) {
  try {
    const q = (req.url.split("?")[1] || "");
    return Object.fromEntries(new URLSearchParams(q));
  } catch (e) {
    return { _queryParseError: String(e) };
  }
}

function parseForm(body) {
  try {
    return Object.fromEntries(new URLSearchParams(body));
  } catch (e) {
    return { _formParseError: String(e), _raw: body };
  }
}

export default async function handler(req, res) {
  try {
    let payload = {};
    if (req.method === "GET") {
      payload = parseQuery(req);
    } else if (req.method === "POST") {
      const raw = await readRawBody(req);
      const ctype = (req.headers["content-type"] || "").toLowerCase();
      if (ctype.includes("application/json")) {
        try { payload = JSON.parse(raw); }
        catch (e) { payload = { _jsonParseError: String(e), _raw: raw }; }
      } else {
        payload = parseForm(raw); // Jotform usually posts x-www-form-urlencoded
      }
    } else {
      res.status(405).json({ ok: false, error: "Method Not Allowed" });
      return;
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="proposal.json"');
    res.status(200).send(JSON.stringify({ ok: true, method: req.method, payload }, null, 2));
  } catch (e) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(500).send(JSON.stringify({ ok: false, error: String(e) }, null, 2));
  }
}
