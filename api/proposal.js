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
const pick = (map, ...keys) => {
  for (const k of keys) {
    const v = s(map[k]);
    if (v) return v;
  }
  return "";
};
const normalizeCoverage = label => {
  if (!label) return "";
  const t = label.toLowerCase();
  if (t.includes("medicare advantage") || t.includes("(ma)")) return "MA";
  if (t.includes("medicare supplement") || t.includes("(ms)")) return "MS";
  if (t.includes("prescription drug") || t.includes("pdp")) return "PDP";
  return label;
};

/* ----------------- build normalized proposal ----------------- */
function buildProposal(map) {
  const howMany = pick(map, "howmany", "q2_howmany") || "Single";

  // Client 1
  const c1_first   = pick(map, "firstname", "firstNameClient1", "q3_firstNameClient1");
  const c1_currCov = normalizeCoverage(pick(map, "typea12[0]", "currentCoverageC1"));
  const c1_quote   = normalizeCoverage(pick(map, "whatare[0]", "whatAreWeQuotingC1"));
  const c1_maSel   = pick(map, "maplan33", "maPlanSelectionMethodClient1");
  const c1_maNow   = pick(map, "currentma43", "currentMAPlanClient1");
  const c1_msCode  = pick(map, "currentMs", "currentMSCodeClient1");
  const c1_msPrem  = pick(map, "premiumclient", "premiumClient1");
  const c1_pdp     = pick(map, "currentPdp", "currentPDPCodeClient1");

  const c1_ma1 = pick(map, "maPlan", "maPlanCode1C1");
  const c1_ma2 = pick(map, "maPlan2", "maPlanCode2C1");
  const c1_ma3 = pick(map, "maPlan3", "maPlanCode3C1");
  const c1_maCodes = [c1_ma1, c1_ma2, c1_ma3].filter(Boolean);

  // Client 2
  const c2_first   = pick(map, "firstname2", "firstNameClient2");
  const c2_currCov = normalizeCoverage(pick(map, "typea12[1]", "currentCoverageC2"));
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
        payload = parseForm(raw); // Jotform usually posts x-www-form-urlencoded
      }
    } else {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    const proposal = buildProposal(payload);
    const jsonText = JSON.stringify(proposal, null, 2);

    // -------- HTML that downloads file and then redirects --------
    const GPT_URL = "https://chatgpt.com/g/g-68cd8d223ebc8191a2c3f2b0089be39d-ibc-proposal-tool-v2";

    const escapeForScript = s =>
      s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/<\/script>/gi, '<\\/script>');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Preparing your download…</title>
</head>
<body>
  <p>Downloading proposal.json… redirecting to Proposal Assistant.</p>
  <a id="dl" download="proposal.json">Download again</a>
  <script>
    (function(){
      const data = \`${escapeForScript(jsonText)}\`;
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a = document.getElementById('dl');
      a.href = url;
      a.click();
      setTimeout(function(){
        window.location.replace("${GPT_URL}");
      }, 800);
    })();
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);

  } catch (e) {
    console.error("proposal endpoint error:", e);
    res.status(500).json({ error: "Server error" });
  }
}

