// api/proposal.js
import { put } from '@vercel/blob';

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
function safeId() {
  // 6-char base36 ID, easy to read/type
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
function buildPayload(map) {
  return {
    client1: {
      first_name: map.firstNameC1 || map['3'] || map.q3_firstNameClient1 || "",
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
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).send('POST your Jotform webhook to this endpoint.');
    return;
  }

  const raw = await readRawBody(req);
  const ctype = req.headers['content-type'] || '';
  let map = {};
  try {
    if (ctype.includes('application/x-www-form-urlencoded')) {
      map = parseUrlEncoded(raw.toString('utf8'));
    } else if (ctype.includes('application/json')) {
      map = JSON.parse(raw.toString('utf8'));
    } else {
      map = parseUrlEncoded(raw.toString('utf8'));
    }
  } catch (e) {
    console.error('Parse error:', e);
  }

  const obj = buildPayload(map);
  const jsonText = JSON.stringify(obj, null, 2);

  const code = safeId();
  const key = `proposals/${code}.json`;

  // Store publicly in Vercel Blob
  const { url } = await put(key, jsonText, {
    access: 'public',
    contentType: 'application/json; charset=utf-8',
  });

  // Simple thank-you HTML the agent will see if you also redirect here
  const gptLink = 'https://chat.openai.com/g/gp-your-custom-gpt'; // <-- your GPT link
  const html = `
<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proposal saved</title>
<style>
 body{font-family:system-ui,Arial;margin:2rem;line-height:1.5}
 .box{border:1px solid #e1e5ea;border-radius:10px;padding:1rem;background:#fafbfd}
 .code{font-weight:700;letter-spacing:1px}
 a.button{display:inline-block;margin-top:1rem;padding:.7rem 1rem;border-radius:8px;border:1px solid #d1d5db;text-decoration:none}
</style>
</head><body>
  <h1>Proposal saved</h1>
  <div class="box">
    <p><strong>Proposal Code:</strong> <span class="code">${code}</span></p>
    <p><a href="${url}" class="button" download>Download JSON</a></p>
    <p><a href="${gptLink}" class="button" target="_blank" rel="noopener">Open Proposal Assistant</a></p>
    <p class="muted">In your Proposal Assistant, type: <code>load ${code}</code>.</p>
  </div>
</body></html>`;
  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
}
