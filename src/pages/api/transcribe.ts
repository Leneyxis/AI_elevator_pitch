import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';

// -----------------------------------------------------------------------------
// Next.js API route config – disable default body parsing so formidable can run
// -----------------------------------------------------------------------------
export const config = {
  api: { bodyParser: false },
};

// -----------------------------------------------------------------------------
// OpenAI configuration – set OPENAI_API in .env.local
// -----------------------------------------------------------------------------
const OPENAI_KEY = process.env.OPENAI_API;
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
const MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';

if (!OPENAI_KEY) {
  // Fail fast at build/start time so the developer sees missing env var
  console.warn('⚠️  Missing OPENAI_API environment variable – /api/transcribe will fail');
}

// -----------------------------------------------------------------------------
// Helper: parse multipart form with formidable
// -----------------------------------------------------------------------------
function parseForm(req: NextApiRequest) {
  const form = formidable({ multiples: false });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

// -----------------------------------------------------------------------------
// POST /api/transcribe → forwards to OpenAI gpt-4o-transcribe
// -----------------------------------------------------------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // 1) Parse incoming multipart request
    const { files } = await parseForm(req);
    const file = files.file;
    if (!file) return res.status(400).json({ error: 'No audio file uploaded.' });

    const f = Array.isArray(file) ? file[0] : file;
    const filePath: string = (f as any).filepath || (f as any).path;

    // 2) Read file into buffer
    const buffer = await fs.readFile(filePath);

    // 3) Build WHATWG FormData body
    const fd = new FormData();
    fd.append('model', MODEL);
    fd.append('response_format','json');
    fd.append('file', new Blob([buffer], { type: f.mimetype || 'audio/webm' }), f.originalFilename || 'audio.webm');

    // 4) Send to OpenAI
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const openaiRes = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: fd,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('OpenAI error', openaiRes.status, text);
      return res.status(openaiRes.status).json({ error: 'OpenAI API error', details: text });
    }

    const data = await openaiRes.json();
    return res.status(200).json({ text: data.text || '' });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return res.status(408).json({ error: 'Timeout', details: 'OpenAI request timed out' });
    }
    console.error('Server error', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
