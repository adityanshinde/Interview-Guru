import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

function extractJSON(content: string): any {
  if (!content) return {};
  try {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function getGroq(customKey?: string) {
  const key = customKey || process.env.GROQ_API_KEY;
  if (!key) {
    const err = new Error('API key is required. Please provide it in settings or set GROQ_API_KEY in Vercel env vars.');
    (err as any).status = 401;
    throw err;
  }
  return new Groq({ apiKey: key });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-model, x-persona, x-mode');
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const customKey  = req.headers['x-api-key'] as string;
    const customModel = req.headers['x-model'] as string;
    const persona    = (req.headers['x-persona'] as string) || 'Technical Interviewer';
    const mode       = (req.headers['x-mode'] as string) || 'voice';
    const groq       = getGroq(customKey);

    const { transcript, resume, jd } = req.body as any;
    if (!transcript) return res.status(400).json({ error: 'No transcript provided' });

    // ── CHAT MODE ──────────────────────────────────────────────────────
    if (mode === 'chat') {
      // Step 1: Classify question type + difficulty
      let questionType = 'concept';
      let difficulty   = 'medium';
      try {
        const classifyRes = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a classifier. Return ONLY valid JSON, nothing else.
Schema: {"type": "concept | coding | system_design | behavioral", "difficulty": "easy | medium | hard"}
Rules:
- concept: definitions, explanations, comparisons of technologies
- coding: algorithm, data structure, write code, implement
- system_design: architecture, distributed systems, scalability, design a system
- behavioral: experience, soft skills, tell me about a time
- easy: basic definitions, junior-level
- medium: trade-offs, algorithms, intermediate
- hard: system design, architecture, advanced algorithms`,
            },
            { role: 'user', content: `Classify: ${transcript}` },
          ],
          model: 'llama-3.1-8b-instant',
          response_format: { type: 'json_object' },
          temperature: 0.1,
        });
        const cd = extractJSON(classifyRes.choices[0]?.message?.content || '{}');
        questionType = cd.type || 'concept';
        difficulty   = cd.difficulty || 'medium';
      } catch { /* use defaults */ }

      // Step 2: Build adaptive prompt
      const sectionHint =
        questionType === 'coding'
          ? `Sections MUST be: "Problem Understanding", "Approach & Logic", "Complexity Analysis". Always fill the code field with complete working code.`
          : questionType === 'behavioral'
          ? `Sections MUST be: "Situation", "What I Did", "Result & Learnings". Write in confident first-person.`
          : questionType === 'system_design'
          ? `Sections: "Architecture Overview", "Core Components", "Trade-offs & Bottlenecks", "Scaling Strategy". Focus on distributed systems thinking.`
          : `If comparing TWO things: "X Overview", "Y Overview", "Key Differences", "When To Use Which". If one concept: "What It Is", "How It Works", "Trade-offs", "When To Use".`;

      const depthHint =
        difficulty === 'easy'
          ? `DEPTH: Focus on clarity and intuition. Avoid unnecessary complexity. Prioritize simple, memorable explanations a junior can follow.`
          : difficulty === 'hard'
          ? `DEPTH: Break down reasoning deeply. Discuss scalability, reliability, and bottlenecks. Mention trade-offs between approaches. Cite Big-O where relevant.`
          : `DEPTH: Include practical engineering trade-offs. Mention complexity where relevant. Balance theory with real-world usage.`;

      const systemPrompt = `You are a senior software engineer, system design mentor, and interview coach.

Your task: answer the user's question in a clear, structured, interview-ready format.

STRICT OUTPUT RULE:
Return ONLY valid JSON. Do NOT include markdown, code fences, commentary, or any text outside the JSON object.

JSON SCHEMA (match exactly):
{
  "sections": [
    {
      "title": "Short section title (2-5 words)",
      "content": "2-4 sentences explaining this clearly in a confident, narrative first-person tone.",
      "points": ["Short key takeaway (max 12 words)", "Short key takeaway (max 12 words)"]
    }
  ],
  "code": "Complete working code if question asks for coding. Otherwise empty string. No markdown fences.",
  "codeLanguage": "language name (csharp, python, javascript, java, sql, etc.) or empty string"
}

SECTION RULES:
${sectionHint}
- Minimum 2 sections, maximum 5 sections.
- Each "content": 2-4 sentences, natural prose, NO nested bullets.
- Each "points": 2-4 items, max 12 words each, crisp and scannable.

CODE RULES:
- Only include code if the question asks to write, implement, create, or demonstrate code.
- If code is included: complete and runnable, comments on key lines, handle edge cases.
- No markdown fences inside the "code" field.

${depthHint}

CONTEXT:
Resume: ${resume || 'Not provided'}
Job Description: ${jd || 'Not provided'}
Persona: ${persona}

PERSONA ADJUSTMENTS:
${persona === 'Technical Interviewer' ? '- Emphasize architecture decisions, Big-O complexity, trade-offs, and production concerns.' : ''}
${persona === 'Executive Assistant' ? '- Emphasize business impact, strategic implications, and communication clarity.' : ''}
${persona === 'Language Translator' ? '- Emphasize language nuance, cultural context, and translation accuracy.' : ''}

FINAL RULE: Return ONLY the JSON object. No markdown. No explanations outside JSON.`;

      // Step 3: Generate answer
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Question: ${transcript}` },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        response_format: { type: 'json_object' },
      });

      const chatData = extractJSON(chatCompletion.choices[0]?.message?.content || '{}');

      // Step 4: Self-verification for hard questions
      if ((difficulty === 'hard' || questionType === 'system_design')) {
        try {
          const verifyRes = await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: `You are a senior engineer reviewing an AI-generated interview answer for correctness.
Check for: factual errors, incorrect Big-O complexity, hallucinated APIs or syntax, missing important edge cases.
Return ONLY valid JSON: {"valid": boolean, "issues": ["issue description"], "improvedSections": <same sections array format, or null if valid>}`,
              },
              { role: 'user', content: `Original Question: ${transcript}\nGenerated Answer: ${JSON.stringify(chatData)}` },
            ],
            model: 'llama-3.1-8b-instant',
            response_format: { type: 'json_object' },
            temperature: 0.2,
          });
          const verifyData = extractJSON(verifyRes.choices[0]?.message?.content || '{}');
          if (!verifyData.valid && Array.isArray(verifyData.improvedSections) && verifyData.improvedSections.length > 0) {
            chatData.sections = verifyData.improvedSections;
          }
        } catch { /* use original answer */ }
      }

      // Step 5: Normalize + return
      const sections = Array.isArray(chatData.sections) ? chatData.sections : [];
      if (sections.length === 0 && (chatData.explanation || chatData.answer)) {
        sections.push({
          title: 'Answer',
          content: chatData.explanation || chatData.answer || '',
          points: Array.isArray(chatData.bullets) ? chatData.bullets : [],
        });
      }

      return res.json({
        isQuestion: true,
        question: transcript,
        confidence: 1.0,
        type: questionType,
        difficulty,
        sections,
        code: chatData.code || '',
        codeLanguage: chatData.codeLanguage || chatData.language || '',
        bullets: [],
        spoken: chatData.spoken || '',
      });
    }

    // ── VOICE MODE ─────────────────────────────────────────────────────
    const voiceSystemPrompt = `You are an AI assistant helping a candidate during a live interview.
Analyze the transcript and determine if the interviewer asked a REAL interview question.
Ignore conversational filler, pleasantries, or technical difficulties.

Return ONLY valid JSON. No markdown. No extra text.

JSON FORMAT:
{
  "isQuestion": boolean,
  "question": "Detected question or empty string",
  "confidence": 0.0-1.0,
  "type": "technical | behavioral | general",
  "bullets": ["Short talking point (max 10 words)", "Short talking point (max 10 words)"],
  "spoken": "1-2 sentence confident answer the user could say aloud."
}

CONTEXT:
Resume: ${resume || 'Not provided'}
Job Description: ${jd || 'Not provided'}
Persona: ${persona}
${persona === 'Technical Interviewer' ? '\nFocus on engineering depth, Big-O complexity, and edge cases.' : ''}

Return ONLY JSON.`;

    const voiceModel = customModel || 'llama-3.1-8b-instant';
    const voiceCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: voiceSystemPrompt },
        { role: 'user', content: `Transcript: "${transcript}"` },
      ],
      model: voiceModel,
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const voiceData = extractJSON(voiceCompletion.choices[0]?.message?.content || '{}');

    if (!voiceData.isQuestion) {
      return res.json({ isQuestion: false });
    }

    return res.json({
      isQuestion: true,
      question: voiceData.question || transcript,
      confidence: voiceData.confidence ?? 0.9,
      type: voiceData.type || 'technical',
      bullets: Array.isArray(voiceData.bullets) ? voiceData.bullets : [],
      spoken: voiceData.spoken || '',
    });

  } catch (error: any) {
    console.error('[/api/analyze] Error:', error);
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Analysis failed' });
  }
}
