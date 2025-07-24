// src/pages/api/pitch.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable                   from 'formidable';
import fs                           from 'fs';
import pdf                          from 'pdf-parse';
import mammoth                      from 'mammoth';
import { z }                        from 'zod';
import { client, modelName }       from '../../lib/openai';

export const config = {
  api: {
    bodyParser: false, // allow formidable to handle multipart
  },
};

const BodySchema = z.object({
  jobTitle:          z.string().trim().min(2),
  purpose:           z.string().trim().min(2),
  focusArea:         z.string().optional().default(''),
  audience:          z.string().optional().default(''),
  additionalContext: z.string().optional().default(''),
  tone:              z.string().optional().default(''),
  length:            z.string().optional().default(''),
});

function parseForm(req: NextApiRequest) {
  const form = formidable({ multiples: false });
  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
    (resolve, reject) =>
      form.parse(req, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      )
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    // ── 1) parse the multipart form data ────────────────────────────────
    const { fields, files } = await parseForm(req);

    // ── 2) flatten & coerce every incoming field to a string ─────────────
    const input = {
      jobTitle:          Array.isArray(fields.jobTitle)          ? String(fields.jobTitle[0])          : String(fields.jobTitle ?? ''),
      purpose:           Array.isArray(fields.purpose)           ? String(fields.purpose[0])           : String(fields.purpose  ?? ''),
      focusArea:         Array.isArray(fields.focusArea)         ? String(fields.focusArea[0])         : String(fields.focusArea ?? ''),
      audience:          Array.isArray(fields.audience)          ? String(fields.audience[0])          : String(fields.audience  ?? ''),
      additionalContext: Array.isArray(fields.additionalContext) ? String(fields.additionalContext[0]) : String(fields.additionalContext ?? ''),
      tone:              Array.isArray(fields.tone)              ? String(fields.tone[0])              : String(fields.tone      ?? ''),
      length:            Array.isArray(fields.length)            ? String(fields.length[0])            : String(fields.length    ?? ''),
    };

    console.log('▶️ Coerced input:', input);
    console.log('▶️ Received files:', files);

    // ── 3) validate with Zod ──────────────────────────────────────────────
    const result = BodySchema.safeParse(input);
    if (!result.success) {
      return res.status(422).json({ errors: result.error.errors });
    }
    const { jobTitle, purpose, focusArea, audience, additionalContext, tone, length } =
      result.data;

    // ── 4) extract resume text if a file was uploaded ────────────────────
    let resumeText = '';
    if (files.resumeFile) {
      // formidable may give you an array or a single File
      const fOrArray = files.resumeFile;
      const f: formidable.File = Array.isArray(fOrArray) ? fOrArray[0] : fOrArray;

      // some versions of formidable use .filepath, others .path
      const filePath: string | undefined =
        typeof f.filepath === 'string'
          ? f.filepath
          : typeof (f as any).path === 'string'
          ? (f as any).path
          : undefined;

      if (filePath) {
        const buffer = fs.readFileSync(filePath);
        if (f.mimetype === 'application/pdf') {
          const pdfData = await pdf(buffer);
          resumeText = pdfData.text;
        } else if (
          f.mimetype ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
          const { value } = await mammoth.extractRawText({ buffer });
          resumeText = value;
        }
      } else {
        console.warn('⚠️  resumeFile uploaded but no filepath/path found on File object');
      }
    }

    // ── 5) build the prompt ────────────────────────────────────────────────
    let prompt = `
You are a career‑coaching assistant.
Generate a ${length || '60‑second'} elevator pitch for someone targeting ${jobTitle}.
Purpose: ${purpose}.
Focus area: ${focusArea || 'unspecified'}.
Audience: ${audience || 'general'}.
`;
    const context = resumeText || additionalContext;
    if (context) prompt += `Context (resume or notes):\n${context}\n`;
    if (tone)    prompt += `Tone: ${tone}.\n`;
    prompt += 'Return only the pitch text.';

    // ── 6) call Azure OpenAI ─────────────────────────────────────────────
    const aiRes = await client.chat.completions.create({
      model:    modelName,
      messages: [
        { role: 'system', content: 'You are an expert career writer.' },
        { role: 'user',   content: prompt },
      ],
    });

    const pitch = aiRes.choices?.[0]?.message?.content?.trim() ?? '';
    return res.status(200).json({ pitch });
  } catch (err: any) {
    console.error('💥 API handler error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
