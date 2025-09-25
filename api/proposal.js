// api/proposal.js

// Tell Vercel not to parse body so we can read raw POST from Jotform
export const config = { api: { bodyParser: false } };

/* ----------------- helpers ----------------- */
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
// first non-empty value from a set of candidate keys
function val(map, ...keys) {
  for (const k of keys) {
    const v = map[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}
function normalizeCoverage(label) {
  if (!label) return "";
  const s = String(label).toLowerCase();
  if (s.includes("medicare advantage") || s.includes("(ma)")) return "MA";
  if (s.includes("medicare supplement") || s.includes("(ms)")) return "MS";
  if (s.includes("prescription drug") || s.includes("pdp")) return "PDP";
  return label;
}

/* ------------- normalized payload ------------- */
function buildPayload(map) {
  const howMany = val(map, "howmany", "HowMany", "q2_howmany");

  // ------- Client 1 -------
  const c1_first = val(
    map, "firstname", "firstName", "first_name", "q3_firstNameClient1", "firstNameClient1"
  );
  const c1_currentCoverage = normalizeCoverage(val(
    map, "typea12[0]", "typea12", "currentCoverageC1", "q4_currentCoverageTypeClient1"
  ));
  const c1_quotingCoverage = normalizeCoverage(val(
    map, "whatare[0]", "whatare", "whatAreWeQuotingC1"
  ));
  const c1_maSelection = val(map, "maplan33", "maPlanSelectionMethodClient1");
  const c1_currentMA = val(map, "currentma43", "currentMa43", "currentMAPlanClient1");
  const c1_ma1 = val(map, "maPlan", "maPlan1", "maPlanCode1C1");
  const c1_ma2 = val(map, "maPlan2", "maPlanCode2C1");
  const c1_ma3 = val(map, "maPlan3", "maPlanCode3C1");
  const c1_maCodes = [c1_ma1, c1_ma2, c1_ma3].filter(Boolean);
  const c1_msCode    = val(map, "currentMs", "currentMSCodeClient1");
  const c1_msPremium = val(map, "premiumclient", "premiumClient1");
  const c1_pdpCode   = val(map, "currentPdp", "currentPDPCodeClient1");

  // ------- Client 2 (aliases best-guess; adjust after seeing raw) -------
  const c2_first = val(
    map, "firstname2", "firstName2", "first_name2", "q3_firstNameClient2", "firstNameClient2"
  );
  const c2_currentCoverage = normalizeCoverage(val(
    map, "typea12[1]", "typea12_2", "currentCoverageC2", "q4_currentCoverageTypeClient2"
  ));
  const c2_quotingCoverage = normalizeCoverage(val(
    map, "whatare[1]", "whatAreWeQuotingC2"
  ));
  const c2_maSelection = val(map, "maplan33_2", "maPlanSelectionMethodClient2");
  const c2_currentMA = val(map, "currentma43_2", "currentMAPlanClient2");
  const c2_ma1 = val(map, "maPlan_2", "maPlan1C2", "maPlanCode1C2");
  const c2_ma2 = val(map, "maPlan2_2", "maPlanCode2C2");
  const c2_ma3 = val(map, "maPlan3_2", "maPlanCode3C2");
  const c2_maCodes = [c2_ma1, c2_ma2, c2_ma3].filter(Boolean);
  const c2_msCode    = val(map, "currentMs_2", "currentMSCodeClient2");
  const c2_msPremium = val(map, "premiumclient_2", "premiumClient2");
  const c2_pdpCode   = val(map, "currentPdp_2", "currentPDPCodeClient2");

  return {
    how_many: howMany || "Single",

    client1: {
      first_name: c1_first,
      current_coverage: c1_currentCoverage,
      quoting_coverage: c1_quotingCoverage,
      ma_selection_method: c1_maSelection,
      current_ma_plan: c1_currentMA,
      ma_codes: c1_maCodes,
      ms_code: c1_msCode,
      ms_premium: c1_msPremium,
      pdp_code: c1_pdpCode
    },

    client2: {
      first_name: c2_first,
      current_coverage: c2_currentCoverage,
      quoting_coverage: c2_quotingCoverage,
      ma_selection_method: c2_maSelection,
      current_ma_plan: c2_currentMA,
      ma_codes: c2_maCodes,
      ms_code: c2_msCode,
      ms_premium: c2_msPremium,
      pdp_code: c2_pdpCode
    },

    meta: {
      submission_id: val(map, "id", "submissionID"),
      submitted_utc: new Date().toISOString(),
      form_version: "v1.0"
    },

    raw: map
  };
}

/* ----------------- main handler ----------------- */
export default async function handler(req, res) {
  try {
    let map = {};

    if (req.method === "GET") {
      // for manual/browser tests
      map = parseQuery(req);
    } else if (req.method === "POST") {
      // Jotform Thank-You redirect with HTTP POST or Webhook
      const raw = await readRawBody(req);
      const ctype = (req.headers["content-type"] || "").toLowerCase();
      if (ctype.includes("application/json")) {
        map = JSON.parse(raw.toString("utf8"));
      } else {
        // Jotform usually posts as x-www-form-urlencoded
        map = parseUrlEncoded(raw.toString("utf8"));
      }
    } else {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const normalized = buildPayload(map);
    const jsonText = JSON.stringify(normalized, null, 2);

    // force download of proposal.json
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="proposal.json"');
    res.status(200).send(jsonText);
  } catch (err) {
    console.error("proposal endpoint error:", err);
    res.status(500).send("Server error");
  }
}
