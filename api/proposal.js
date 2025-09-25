// api/proposal.js
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks);
}
function parseUrlEncoded(s) {
  const params = new URLSearchParams(s);
  return Object.fromEntries(params);
}
function parseQuery(req) {
  const q = (req.url.split("?")[1] || "");
  return Object.fromEntries(new URLSearchParams(q));
}

// Build normalized JSON from a flat map
function buildPayload(map) {
  const obj = {
    client1: {
      first_name: map.firstNameC1 || map["3"] || map.q3_firstNameClient1 || "",
      current_coverage: map.currentCoverageC1 || map.q4_currentCoverageTypeClient1 || "",
      ma_selection_method: map.maSelectionMethodC1 || "",
      ma_codes: [
        map.maPlanCode1C1 || "",
        map.maPlanCode2C1 || "",
        map.maPlanCode3C1 || ""
      ],
      ms_selection_method: map.msSelectionMethodC1 || "",
      ms_code: map.msCodeC1 || "",
      ms_premium: map.msPremiumC1 || "",
      pdp_code: map.pdpCodeC1 || ""
    },
    client2: {
      first_name: map.firstNameC2 || "",
      current_coverage: map.currentCoverageC2 || "",
      ma_selection_method: map.maSelectionMethodC2 || "",
      ma_codes: [
        map.maPlanCode1C2 || "",
        map.maPlanCode2C2 || "",
        map.maPlanCode3C2 || ""
      ],
      ms_selection_method: map.msSelectionMethodC2 || "",
      ms_code: map.msCodeC2 || "",
      ms_premium: map.msPremiumC2 || "",
      pdp_code: map.pdpCodeC2 || ""
    },
    meta: {
      submission_id: map.submissionID || map.id || "",
      submitted_utc: new Date().toISOString(),
      form_version: "v1.0"
    },
    raw: map
  };
  return obj;
}

export default async function handler(req, res) {
  // --- GET (used by Thank-You redirect → download proposal.json)
  if (req.method === "GET") {
    const map = parseQuery(req);
    const jsonText = JSON.stringify(buildPayload(map), null, 2);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="proposal.json"');
    res.status(200).send(jsonText);
    return;
  }

  // --- POST (used by Webhook)
  if (req.method === "POST") {
    const raw = await readRawBody(req);
    const ctype = req.headers["content-type"] || "";
    let map = {};
    try {
      if (ctype.includes("application/x-www-form-urlencoded")) {
        map = parseUrlEncoded(raw.toString("utf8"));
      } else if (ctype.includes("application/json")) {
        map = JSON.parse(raw.toString("utf8"));
      } else {
        map = parseUrlEncoded(raw.toString("utf8"));
      }
    } catch (_) {}

    const jsonText = JSON.stringify(buildPayload(map), null, 2);
    console.log("Webhook received keys:", Object.keys(map).slice(0, 20));
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).send(jsonText);
    return;
  }

  res.status(405).send("Method Not Allowed");
}
