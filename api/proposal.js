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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).send("POST a Jotform submission to this endpoint.");
    return;
  }
  const raw = await readRawBody(req);
  const ctype = req.headers["content-type"] || "";

  let formData = {};
  try {
    if (ctype.includes("application/x-www-form-urlencoded")) {
      formData = parseUrlEncoded(raw.toString("utf8"));
    } else if (ctype.includes("application/json")) {
      formData = JSON.parse(raw.toString("utf8"));
    } else {
      // fallback: try urlencoded
      formData = parseUrlEncoded(raw.toString("utf8"));
    }
  } catch (_) {}

  const obj = {
    client1: {
      first_name: formData.firstNameC1 || "",
      current_coverage: formData.currentCoverageC1 || "",
      ma_selection_method: formData.maSelectionMethodC1 || "",
      ma_codes: [
        formData.maPlanCode1C1 || "",
        formData.maPlanCode2C1 || "",
        formData.maPlanCode3C1 || ""
      ],
      ms_selection_method: formData.msSelectionMethodC1 || "",
      ms_code: formData.msCodeC1 || "",
      ms_premium: formData.msPremiumC1 || "",
      pdp_code: formData.pdpCodeC1 || ""
    },
    client2: {
      first_name: formData.firstNameC2 || "",
      current_coverage: formData.currentCoverageC2 || "",
      ma_selection_method: formData.maSelectionMethodC2 || "",
      ma_codes: [
        formData.maPlanCode1C2 || "",
        formData.maPlanCode2C2 || "",
        formData.maPlanCode3C2 || ""
      ],
      ms_selection_method: formData.msSelectionMethodC2 || "",
      ms_code: formData.msCodeC2 || "",
      ms_premium: formData.msPremiumC2 || "",
      pdp_code: formData.pdpCodeC2 || ""
    },
    meta: {
      submission_id: formData.submissionID || formData.id || "",
      submitted_utc: new Date().toISOString(),
      form_version: "v1.0"
    },
    raw: formData
  };

  const jsonText = JSON.stringify(obj, null, 2);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="proposal.json"');
  res.status(200).send(jsonText);
}
