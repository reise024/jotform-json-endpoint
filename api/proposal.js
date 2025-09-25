// api/proposal.js
export const config = { api: { bodyParser: false } };

/* ----------------- minimal parsing ----------------- */
async function readRawBody(req) {
  const chunks = [];
  for await (const ch of req) chunks.push(ch);
  return Buffer.concat(chunks).toString("utf8");
}
function parseQuery(req) {
  const q = (req.url.split("?")[1] || "");
  return Object.fromEntries(new URLSearchParams(q));
}
function parseForm(body) {
  return Object.fromEntries(new URLSearchParams(body));
}

/* ----------------- tiny safe helpers ----------------- */
const s = v => (v ?? "").toString().trim();
const g = (map, key) => s(map[key]);
const pick = (map, ...keys) => {
  for (const k of keys) {
    const v = s(map[k]);
    if (v) return v;
  }
  return "";
};
const normalizeCoverage = label => {
  const t = label.toLowerCase();
  if (t.includes("medicare advantage") || t.includes("(ma)")) return "MA";
  if (t.includes("medicare supplement") || t.includes("(ms)")) return "MS";
  if (t.includes("prescription drug") || t.includes("pdp")) return "PDP";
  return label;
};

/* ----------------- build normalized proposal ----------------- */
function buildProposal(map) {
  // how many clients (Single / Joint)
  const howMany = pick(map, "howmany", "q2_howmany") || "Single";

  // Client 1 (keys based on your POST payload)
  const c1_first   = pick(map, "firstname", "firstNameClient1", "q3_firstNameClient1");
  const c1_currCov = normalizeCoverage(pick(map, "typea12[0]", "currentCoverageC1", "q4_currentCoverageTypeClient1"));
  const c1_quote   = normalizeCoverage(pick(map, "whatare[0]", "whatAreWeQuotingC1"));
  const c1_maSel   = pick(map, "maplan33", "maPlanSelectionMethodClient1");
  const c1_maNow   = pick(map, "currentma43", "currentMAPlanClient1");
  const c1_msCode  = pick(map, "currentMs", "currentMSCodeClient1");
  const c1_msPrem  = pick(map, "premiumclient", "premiumClient1");
  const c1_pdp     = pick(map, "currentPdp", "currentPDPCodeClient1");

  // Optional: allow up to 3 MA codes if you later add them
  const c1_ma1 = pick(map, "maPlan", "maPlanCode1C1");
  const c1_ma2 = pick(map, "maPlan2", "maPlanCode2C1");
  const c1_ma3 = pick(map, "maPlan3", "maPlanCode3C1");
  const c1_maCodes = [c1_ma1, c1_ma2, c1_ma3].filter(Boolean);

  // Client 2 placeholders (we’ll fill once your form sends these)
  const c2_first   = pick(map, "firstname2", "firstNameClient2", "q3_firstNameClient2");
  const c2_currCov = normalizeCoverage(pick(map, "typea12[1]", "currentCoverageC2", "q4_currentCoverageTypeClient2"));
  const c2_quote   = normalizeCoverage(pick(map, "whatare[1]", "whatAreWeQuotingC2"));
  const c2_maSel   = pick(map, "maplan33_2", "maPlanSelectionMethodClient2");
  const c2_maNow   = pick(map, "currentma43_2", "currentMAPlanClient2");
  const c2_msCode  = pick(map, "currentMs_2", "currentMSCodeClient2");
  const c2_msPrem  = pick(map, "premiumclient_2", "premiumClient2");
  const c2_pdp     = pick(map, "currentPdp_2", "currentPDPCodeClient2");
  const c2_ma1 = pick(map, "maPlan_2", "maPlanCode1C2");
  const c2_ma2 = pick(map, "maPlan2_2", "maPlanCode2C2");
  const c2_ma3 = pick(map, "maPlan3_2", "maPlanCode3C2");
  const c2_maCodes = [c2_ma1, c2_ma2, c2_ma3].filter(Boolean);

  return {
    how_many: howMany,

    client1: {
      first_name: c1_first,
      current_coverage: c1_currCov,
      quoting_coverage: c1_quote,
      current_ma_plan: c1_maNow,
      ma_selection_method: c1_maSel,
      ma_codes: c1_maCodes,
      ms_code: c1_msCode,
      ms_premium: c1_msPrem,
      pdp_code: c1_pdp
    },

    client2: {
      first_name: c2_first,
      current_coverage: c2_currCov,
      quoting_coverage: c2_quote,
      current_ma_plan: c2_maNow,
      ma_selection_method: c2_maSel,
      ma_codes: c2_maCodes,
      ms_code: c2_msCode,
      ms_premium: c2_msPrem,
      pdp_code: c2_pdp
    },

    meta: {
      submission_id: pick(map, "submission_id", "id"),
      form_id: pick(map, "formID"),
      ip: pick(map, "ip"),
      submitted_utc: new Date().toISOString(),
      form_version: "v1.0"
    },

    raw: map
  };
}

/* ----------------- main handler ----------------- */
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
        catch { payload = { _jsonParseError: true, _raw: raw }; }
      } else {
        payload = parseForm(raw); // Jotform uses x-www-form-urlencoded
      }
    } else {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const proposal = buildProposal(payload);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="proposal.json"');
    res.status(200).send(JSON.stringify(proposal, null, 2));
  } catch (e) {
    console.error("proposal endpoint error:", e);
    res.status(500).json({ error: "Server error" });
  }
}
