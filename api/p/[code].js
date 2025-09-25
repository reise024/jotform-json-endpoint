// api/p/[code].js
// Redirects to the public Blob URL for the given code
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const { code } = req.query;
  const key = `proposals/${(code || '').toUpperCase()}.json`;

  // Look up the blob by prefix (cheap way to verify existence)
  const { blobs } = await list({ prefix: `proposals/${code.toUpperCase()}` });
  const hit = blobs.find(b => b.pathname === key);
  if (!hit) {
    res.status(404).send('Not found');
    return;
  }
  // 302 redirect to the actual public blob URL
  res.writeHead(302, { Location: hit.url });
  res.end();
}
