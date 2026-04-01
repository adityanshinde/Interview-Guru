type PromptContext = {
  resume?: string;
  jd?: string;
  persona?: string;
};

type ChatPromptContext = PromptContext & {
  questionType: 'concept' | 'coding' | 'system_design' | 'behavioral' | string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
};

type CacheAnswerPromptContext = PromptContext & {
  question: string;
};

function normalizeContextValue(value?: string): string {
  return value && value.trim() ? value.trim() : 'Not provided';
}

function getSectionHint(questionType: ChatPromptContext['questionType']): string {
  if (questionType === 'coding') {
    return 'Sections MUST be: "Problem Understanding", "Approach & Logic", "Complexity Analysis". Always fill the code field with complete working code.';
  }

  if (questionType === 'behavioral') {
    return 'Sections MUST be: "Situation", "What I Did", "Result & Learnings". Write in confident first-person.';
  }

  if (questionType === 'system_design') {
    return 'Sections: "Architecture Overview", "Core Components", "Trade-offs & Bottlenecks", "Scaling Strategy". Focus on distributed systems thinking.';
  }

  return 'If comparing TWO things: "X Overview", "Y Overview", "Key Differences", "When To Use Which". If one concept: "What It Is", "How It Works", "Trade-offs", "When To Use".';
}

function getDepthHint(difficulty: ChatPromptContext['difficulty']): string {
  if (difficulty === 'easy') {
    return 'DEPTH: Focus on clarity and intuition. Avoid unnecessary complexity. Prioritize simple, memorable explanations a junior can follow.';
  }

  if (difficulty === 'hard') {
    return 'DEPTH: Break down reasoning deeply. Discuss scalability, reliability, and bottlenecks. Mention trade-offs between approaches. Cite Big-O where relevant.';
  }

  return 'DEPTH: Include practical engineering trade-offs. Mention complexity where relevant. Balance theory with real-world usage.';
}

function getPersonaAdjustments(persona?: string): string {
  return [
    persona === 'Technical Interviewer' ? '- Emphasize architecture decisions, Big-O complexity, trade-offs, and production concerns.' : '',
    persona === 'Executive Assistant' ? '- Emphasize business impact, strategic implications, and communication clarity.' : '',
    persona === 'Language Translator' ? '- Emphasize language nuance, cultural context, and translation accuracy.' : '',
  ].filter(Boolean).join('\n');
}

export function buildQuestionClassificationPrompt(): string {
  return `You are a classifier. Return ONLY valid JSON, nothing else.
Schema: {"type": "concept | coding | system_design | behavioral", "difficulty": "easy | medium | hard"}
Rules:
- concept: definitions, explanations, comparisons of technologies
- coding: algorithm, data structure, write code, implement
- system_design: architecture, distributed systems, scalability, design a system
- behavioral: experience, soft skills, tell me about a time
- easy: basic definitions, junior-level
- medium: trade-offs, algorithms, intermediate
- hard: system design, architecture, advanced algorithms`;
}

export function buildChatSystemPrompt({ questionType, difficulty, resume, jd, persona }: ChatPromptContext): string {
  const sectionHint = getSectionHint(questionType);
  const depthHint = getDepthHint(difficulty);
  const personaAdjustments = getPersonaAdjustments(persona);

  return `You are a senior software engineer, system design mentor, and interview coach.

Your task: answer the user's question in a clear, structured, interview-ready format.

STRICT OUTPUT RULE:
Return ONLY valid JSON. Do NOT include markdown, code fences, commentary, or any text outside the JSON object.

JSON SCHEMA (match exactly):
{
  "sections": [
    {
      "title": "Short section title (2-5 words)",
      "content": "2-4 sentences explaining this clearly in a confident, narrative first-person tone. Vary your openers (e.g., 'In my projects...', 'I've found that...', 'Architecturally, I prefer...', 'One thing I prioritize is...'). Avoid repeating 'I typically' or 'In my experience' at the start of every paragraph. NO bullet points inside content.",
      "points": [
        "Short key takeaway (max 12 words)",
        "Short key takeaway (max 12 words)"
      ]
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
- Titles: short, bold-worthy (e.g. "Lambda Syntax", "Time Complexity", "Key Trade-offs").

CODE RULES:
- Only include code if the question asks to write, implement, create, or demonstrate code.
- If code is included: complete and runnable, comments on key lines, handle edge cases (null, empty, etc.).
- No markdown fences inside the "code" field.

${depthHint}

CONTEXT:
Resume: ${normalizeContextValue(resume)}
Job Description: ${normalizeContextValue(jd)}
Persona: ${normalizeContextValue(persona)}

PERSONA ADJUSTMENTS:
${personaAdjustments || '- Keep the answer clear, grounded, and interview-ready.'}

FINAL RULE: Return ONLY the JSON object. No markdown. No explanations outside JSON.`;
}

export function buildAnswerConfidencePrompt(question: string, answer: string): string {
  return `You are evaluating the quality and correctness of an AI's answer to an interview question. Rate your confidence that the answer correctly and fully addresses the question. Output ONLY a JSON object: {"confidence": number} where the number is a float between 0.0 (completely wrong/irrelevant) and 1.0 (perfectly accurate/highly relevant).

Question: ${question}
Answer: ${answer}`;
}

export function buildAnswerVerificationPrompt(question: string, answer: string): string {
  return `You are a senior engineer reviewing an AI-generated interview answer for correctness.
Check for: factual errors, incorrect Big-O complexity, hallucinated APIs or syntax, missing important edge cases.
Return ONLY valid JSON: {"valid": boolean, "issues": ["issue description"], "improvedSections": <same sections array format, or null if valid>}

Original Question: ${question}
Generated Answer: ${answer}`;
}

export function buildVoiceSystemPrompt({ resume, jd, persona }: PromptContext): string {
  return `You are an AI assistant helping a candidate during a live interview.
Analyze the transcript and determine if the interviewer asked a REAL interview question.
Ignore conversational filler, pleasantries, or technical difficulties (e.g., "Can you hear me?", "How are you?").

Return ONLY valid JSON. No markdown. No extra text.

JSON FORMAT:
{
  "isQuestion": boolean,
  "question": "Detected question or empty string",
  "confidence": 0.0-1.0,
  "type": "technical | behavioral | general",
  "bullets": [
    "Short talking point (max 10 words)",
    "Short talking point (max 10 words)",
    "Short talking point (max 10 words)",
    "Short talking point (max 10 words)"
  ],
  "spoken": "1-2 sentence confident answer the user could say aloud."
}

DETECTION RULES:
- If transcript contains a genuine interview question: isQuestion = true, extract the main question
- If it's just filler/pleasantries (e.g. "I can see your screen", "Let's get started"): isQuestion = false
- If no question detected: isQuestion = false, return empty bullets array

BULLET STYLE — TECHNICAL QUESTIONS:
Include keyword-dense talking points with:
• Algorithm or pattern name
• Big-O complexity (e.g. O(n log n))
• Key trade-offs
• Production/edge case consideration
Examples: "HashMap lookup O(1) average case" | "Avoid nested loops, use sorting O(n log n)" | "Handle null and empty input edge cases"

BULLET STYLE — BEHAVIORAL QUESTIONS (STAR method):
• Situation: what was the context?
• Task: what was your responsibility?
• Action: what did you specifically do?
• Result: measurable outcome
Examples: "Legacy API slowed under heavy traffic" | "Led async processing refactor" | "Reduced latency by 60%" | "Improved reliability 99.9% uptime"

SPOKEN FIELD: A confident, complete 1-2 sentence answer the user can say out loud immediately.

CONTEXT:
Resume: ${normalizeContextValue(resume)}
Job Description: ${normalizeContextValue(jd)}
Persona: ${normalizeContextValue(persona)}
${persona === 'Technical Interviewer' ? '\nFocus on engineering depth, Big-O complexity, and edge cases.' : ''}
${persona === 'Executive Assistant' ? '\nFocus on business impact, decision making, and strategy.' : ''}
${persona === 'Language Translator' ? '\nTranslate accurately while maintaining tone and cultural context.' : ''}

Return ONLY JSON.`;
}

export function buildVoiceQuestionConfidencePrompt(transcript: string): string {
  return `You are evaluating an audio transcript to determine if it contains a genuine interview question or just filler conversation. Rate your confidence that the transcript contains a real question. Return ONLY a JSON object: {"confidence": number} where the number is a float between 0.0 (definitely just filler/no question) and 1.0 (definitely a clear question).

Transcript: "${transcript}"`;
}

export function buildCacheQuestionsPrompt(jd: string): string {
  return `You are a senior technical interviewer. Based on this job description, generate 35 distinct, highly likely interview questions.
Include concept questions, system design questions, coding queries, and behavioral questions.
Return ONLY a valid JSON object matching this exact schema:
{
  "questions": [
    "Explain the difference between REST and GraphQL.",
    "Design a scalable notification system.",
    "Tell me about a time you resolved a difficult bug."
  ]
}

Job Description:
${jd}`;
}

export function buildCacheAnswerPrompt({ question, resume, jd }: CacheAnswerPromptContext): string {
  return `You are a senior software engineer and interview coach.
Answer the interview question comprehensively. Ensure you provide paraphrased variants of the question to assist vector similarity searching.
Return ONLY valid JSON matching exactly:
{
  "variants": ["Paraphrase 1", "Paraphrase 2", "Paraphrase 3"],
  "sections": [
    {
      "title": "Short section title (2-5 words)",
      "content": "2-4 sentences explaining this clearly in a confident, narrative first-person tone. Vary your openers (e.g., 'In my projects...', 'I've found that...', 'Architecturally, I prefer...', 'One thing I prioritize is...'). Avoid repeating 'I typically' or 'In my experience' at the start of every paragraph.",
      "points": ["Scannable key takeaway max 10 words", "Another short takeaway"]
    }
  ],
  "bullets": ["Technical bullet 1", "Technical bullet 2", "Technical bullet 3"],
  "code": "Complete code snippet if coding is requested, else strictly an empty string",
  "codeLanguage": "language name or empty string",
  "spoken": "A 1-2 sentence confident spoken answer.",
  "type": "concept",
  "difficulty": "medium",
  "category": "backend"
}
Keep sections to mostly 2-3 maximum. DO NOT include markdown code fences overall.
RULES:
1. "code" MUST ALWAYS be a string. Never null. Always use "" for empty code.
2. "difficulty" MUST ALWAYS be included exactly as "easy", "medium", or "hard".
3. "variants" MUST include at least 2 conversational variations of the question.

Question: ${question}

Resume Context: ${normalizeContextValue(resume)}
Job Context: ${normalizeContextValue(jd).slice(0, 1000)}`;
}

export function buildSpeechPrompt(text: string): string {
  return `Say naturally: ${text}`;
}