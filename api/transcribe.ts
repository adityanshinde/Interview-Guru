import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';

function getGroq(customKey?: string) {
  const key = customKey || process.env.GROQ_API_KEY;
  if (!key) {
    const err = new Error('API key is required.');
    (err as any).status = 401;
    throw err;
  }
  return new Groq({ apiKey: key });
}

const hallucinations = [
  'thank you', 'thanks for watching', 'thank you for watching', 'please subscribe',
  'www.openai.com', 'you', 'bye', 'goodbye', 'oh', 'uh', 'um', "i'm sorry",
  "i don't know", 'the end', 'watching', 'be sure to like and subscribe',
  'thanks for listening', 'thank you so much', 'peace', 'see you in the next one',
  'god bless', 'have a great day', 'see you soon', 'take care', 'stay tuned',
  'welcome back', "let's get started", 'in this video', 'today we are going to',
];

const corrections: Record<string, string> = {
  'virtual dome': 'virtual DOM',
  'react.js': 'React',
  'view.js': 'Vue.js',
  'node.js': 'Node.js',
  'next.js': 'Next.js',
  'typescript': 'TypeScript',
  'javascript': 'JavaScript',
  'tailwind': 'Tailwind CSS',
  'postgress': 'PostgreSQL',
  'mongo db': 'MongoDB',
  'graphql': 'GraphQL',
  'rest api': 'REST API',
  'kubernetes': 'Kubernetes',
  'aws': 'AWS',
  'eaml': 'YAML',
  'travel inheritance': 'types of inheritance',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-voice-model');
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let tmpFilePath = '';
  try {
    const customKey       = req.headers['x-api-key'] as string;
    const customVoiceModel = req.headers['x-voice-model'] as string;
    const groq = getGroq(customKey);

    const { audioBase64, mimeType } = req.body as any;
    if (!audioBase64) return res.status(400).json({ error: 'No audio provided' });

    const ext = mimeType?.includes('mp4') ? 'mp4' : 'webm';
    tmpFilePath = path.join(os.tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`);
    fs.writeFileSync(tmpFilePath, Buffer.from(audioBase64, 'base64'));

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tmpFilePath),
      model: customVoiceModel || 'whisper-large-v3-turbo',
      response_format: 'json',
    });

    let text = transcription.text || '';

    // Apply corrections
    let corrected = text;
    for (const [wrong, right] of Object.entries(corrections)) {
      corrected = corrected.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right);
    }
    text = corrected;

    // Filter hallucinations
    const cleanText = text.trim().toLowerCase().replace(/[.,!?;:]/g, '');
    const isHallucination = hallucinations.some(h => cleanText === h && text.length < 20);

    if (isHallucination || text.length < 2) text = '';

    return res.json({ text });
  } catch (error: any) {
    console.error('[/api/transcribe] Error:', error);
    const status = error.status || 500;
    if (status === 429) {
      return res.status(429).json({
        error: 'Rate limit reached. Please wait a moment.',
        retryAfter: error.headers?.['retry-after'] || 3,
      });
    }
    return res.status(status).json({ error: error.message || 'Transcription failed' });
  } finally {
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      try { fs.unlinkSync(tmpFilePath); } catch { /* ignore */ }
    }
  }
}
