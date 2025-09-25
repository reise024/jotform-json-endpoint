// Helper: return first non-empty value among possible keys
function val(map, ...keys) {
  for (const k of keys) {
    const v = map[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

// Helper: normalize coverage labels like "(MA) Medicare Advantage" => "MA"
function normalizeCoverage(label) {
  if (!label) return "";
  const s = String(label).toLowerCase();
  if (s.includes("medicare advantage") || s.includes("(ma)")) return "MA";
  if (s.includes("medicare supplement") || s.includes("(ms)")) return "MS";
  if (s.includes("prescription drug") || s.includes("pdp")) return "PDP";
  return label;
}

// Build normalized JSON from Jotform's raw map
function buildPayload(map) {
  // how many clients? (Single/Joint)
  const howMany = val(map, "howmany", "HowMany", "q2_howmany");

  // -------- Client 1 mappings --------
  const c1_first = val(map,
    "firstname",              // seen in your raw
    "firstName", "first_name",
    "q3_firstNameClient1", "firstNameClient1"
  );

  // Current coverage & quoting coverage (Jotform puts [0] for single-selects sometimes)
  const c1_currentCoverage = normalizeCoverage(val(map,
    "typea12[0]", "typea12", "currentCoverageC1", "q4_currentCoverageTypeClient1"
  ));
  const c1_quotingCoverage = normalizeCoverage(val(map,
    "whatare[0]", "whatare", "whatAreWeQuotingC1"
  ));

  // MA selection method and MA codes (use whatever you collect)
  const c1_maSelection = val(map,
    "maplan33", "maPlanSelectionMethodClient1"
  );

  // Current MA plan/code you showed in raw as `currentma43`
  const c1_currentMA = val(map,
    "currentma43", "currentMa43", "currentMAPlanClient1"
  );

  // Up to 3 MA plan codes the agent might enter
  const c1_ma1 = val(map, "maPlan", "maPlan1", "maPlanCode1C1");
  const c1_ma2 = val(map, "maPlan2", "maPlanCode2C1");
  const c1_ma3 = val(map, "maPlan3", "maPlanCode3C1");
  const c1_maCodes = [c1_ma1, c1_ma2, c1_ma3].filter(Boolean);

  // MS + PDP
  const c1_msCode    = val(map, "currentMs", "currentMSCodeClient1");
  const c1_msPremium = val(map, "premiumclient", "premiumClient1");
  const c1_pdpCode   = val(map, "currentPdp", "currentPDPCodeClient1");

  // -------- Client 2 mappings (best-guess keys; adjust as you see raw) --------
  const c2_first = val(map,
    "firstname2", "firstName2", "first_name2",
    "q3_firstNameClient2", "firstNameClient2"
  );
  const c2_currentCoverage = normalizeCoverage(val(map,
    "typea12[1]", "typea12_2", "currentCoverageC2", "q4_currentCoverageTypeClient2"
  ));
  const c2_quotingCoverage = normalizeCoverage(val(map,
    "whatare[1]", "whatAreWeQuotingC2"
  ));
  const c2_maSelection = val(map,
    "maplan33_2", "maPlanSelectionMethodClient2"
  );
  const c2_currentMA = val(map,
    "currentma43_2", "currentMAPlanClient2"
  );
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
      pdp_code: c1_pdpCode,
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
      pdp_code: c2_pdpCode,
    },

    meta: {
      submission_id: val(map, "id", "submissionID"),
      submitted_utc: new Date().toISOString(),
      form_version: "v1.0"
    },

    // Always include the full payload for safety/traceability
    raw: map
  };
}
