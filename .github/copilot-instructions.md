# InterviewGuru AI — Copilot Instructions

> **Purpose**: Guide AI assistants (GitHub Copilot, Claude, etc.) to understand and contribute to the InterviewGuru project effectively.
>
> **Last Updated**: March 30, 2026 | **Status**: Production-Ready ✅

---

## 📋 Quick Project Overview

**InterviewGuru** is a stealth AI copilot for technical interviews that captures system audio in real-time, detects questions, and delivers structured interview-quality answers. It runs as an invisible overlay on your desktop during meetings/interviews.

**Tech Stack**: React 19 + Vite 6.2.0 + Express 4.22.1 + TypeScript ~5.8.2 + Electron 41.0.0 (Windows) + Groq LLMs + Google Gemini TTS

**Key Implemented Features** ✅:
- 🎙️ **Voice Mode**: Real-time transcription + question detection (Groq Whisper `whisper-large-v3-turbo`, <1s latency)
- 💬 **Chat Mode**: 3-phase AI pipeline (classify → generate → verify) with structured answers + code blocks
- 🕵️ **Stealth**: Invisible to Zoom/Teams/OBS screen share via `setContentProtection(true)` + click-through overlay
- 📱 **Overlay UI**: Animated buttons, Q&A history, session export, responsive design
- 🎭 **Personas**: 3 AI personalities (Technical Interviewer, Executive Assistant, Translator)
- ⚡ **Smart Caching**: Vector embeddings with semantic similarity >0.82 for instant cached answers
- 🔐 **Authentication**: Clerk-powered sign-in/up + user context grounding (resume + JD)

---

## 📊 Project Status & Metrics

| Metric | Value |
|--------|-------|
| **Total Dependencies** | 28 production + 10 dev |
| **React Components** | 8 (OverlayWidget, LandingPage, ChatMessage, SectionCard, ResponseToolbar, Visualizer, FooterPages) |
| **Custom Hooks** | 2 (useAIAssistant, useTabAudioCapture) |
| **API Endpoints** | 4 (health, transcribe, analyze, generate-cache) |
| **LLM Models** | 3 active (Whisper STT, llama-3.3-70b, llama-3.1-8b-instant) |
| **External APIs** | Groq (LLM+STT), Google Gemini (TTS), Clerk (Auth) |
| **Lines of Codebase** | ~3500+ (server.ts ~1000, components ~1500, hooks ~500) |
| **Build Output** | Windows NSIS .exe installer (electron-builder) |
| **Performance** | STT 0.8s, LLM response 3-5s, cache hit <100ms |

### **Current Limitations & Feature Gaps**
- ❌ Vercel serverless routes (`/api/` folder mentioned but not yet implemented)
- ❌ WebSocket real-time sync (socket.io dependency unused)
- ❌ macOS / Linux support (Windows-only Electron app)
- ❌ Local LLM fallback (100% cloud-dependent on Groq)
- ❌ Session history persistence (lost on app restart, stored in temp dir only)
- ⚠️ Rate limiting: Groq API quotas; high-frequency voice mode may hit limits

---

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     ELECTRON DESKTOP (Windows)              │
│  ┌─────────────────┐        ┌──────────────────────────┐   │
│  │ Main Process    │◄──────►│  Transparent Overlay UI  │   │
│  │ (IPC, Shortcuts)│        │  (React Component)       │   │
│  └────────┬────────┘        └──────────┬───────────────┘   │
│           │                            │                    │
│  System Audio Capture ◄────────────────┘                    │
│  (Desktop + Loopback)                                       │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼ (WebSocket + IPC)
     ┌───────────────────┐
     │  Express Backend  │
     │  (Node.js server) │
     └────┬──────┬───────┘
          │      │
          ▼      ▼
     ┌─────────────────────────────────────────┐
     │  External AI APIs (Groq, Google, etc.)  │
     └─────────────────────────────────────────┘
```

**Three Main Layers**:
1. **Frontend** (`src/`) — React/TypeScript UI, custom hooks for AI logic
2. **Backend** (`server.ts` + `api/`) — Express API, LLM orchestration, vector caching
3. **Desktop** (`electron/`) — Window management, system audio capture, global shortcuts

---

## 📁 Project Structure

```
InterviewGuru/
├── .github/
│   └── copilot-instructions.md          # AI assistant guidelines
├── .env, .env.example                   # Configuration templates
├── .gitignore, .git/                    # Version control
├── assets/
│   └── icons/
│       ├── mac/                         # macOS icons (placeholder)
│       ├── png/                         # General PNG icons
│       └── win/                         # Windows .ico files (NSIS)
├── electron/
│   └── main.cjs                         # Electron main process (window, IPC, shortcuts)
├── public/                              # Static assets
├── src/                                 # React frontend (Vite + TypeScript)
│   ├── components/
│   │   ├── OverlayWidget.tsx            # Main UI: status ticker, mic button, history, chat modal
│   │   ├── ChatMessage.tsx              # Chat bubble component for Q&A
│   │   ├── SectionCard.tsx              # Answer section card (title, prose, bullet points)
│   │   ├── ResponseToolbar.tsx          # Toolbar: copy, regenerate, feedback buttons
│   │   ├── Visualizer.tsx               # Real-time audio waveform visualizer
│   │   ├── LandingPage.tsx              # Marketing landing page (separate route)
│   │   ├── LandingPage.css              # Landing animations & glassmorphism effects
│   │   └── FooterPages.tsx              # Reusable template for Privacy, Terms, Docs, FAQ
│   ├── hooks/
│   │   ├── useAIAssistant.ts            # Q detection, LLM analysis, TTS playback, vector cache lookup
│   │   └── useTabAudioCapture.ts        # Audio capture + transcription + VAD filtering
│   ├── App.tsx                          # Route definitions + Clerk auth wrapper
│   ├── main.tsx                         # React DOM bootstrap
│   ├── index.css                        # Global Tailwind CSS + custom styles
│   └── vite-env.d.ts                    # Vite type declarations
├── electron-dev.cjs                     # Dev launcher: spawns backend + Electron with HMR
├── server.ts                            # Express backend server (core implementation)
├── server.cjs                           # Compiled backend (generated during build)
├── vite.config.ts                       # Vite build configuration
├── tsconfig.json                        # TypeScript compiler options (ESNext, React JSX, DOM lib)
├── package.json                         # Dependencies + npm scripts + electron-builder config
├── index.html                           # HTML entry point
├── metadata.json                        # Application metadata
├── error_log.txt                        # Build error logs (historical reference: Vite in prod)
└── README.md                            # Project overview
```

### **Key Files Deep Dive**

**Main Components**:
- `src/components/OverlayWidget.tsx` — Center hub for UI (800+ lines). State: 23+ useState hooks tracking listening/processing/settings/history/alerts. Contains: status ticker, mic toggle button, floating history panel with fade effect, chat modal input with keyboard shortcuts
- `src/hooks/useAIAssistant.ts` (1000+ lines) — Core AI logic: question detection with debounce + heuristic pre-filter, LLM API calls with 3-phase pipeline, vector cache lookup (>0.82 threshold), answer verification, TTS playback via Google Gemini
- `src/hooks/useTabAudioCapture.ts` (500+ lines) — Audio capture: detects Electron vs browser, manages dual-mode streams (WASAPI loopback vs getDisplayMedia), VAD filtering, 5-second chunking with auto-restart, 429 rate limit handling

**Backend**:
- `server.ts` (1000+ lines) — Express app with 4 endpoints: `/api/health`, `/api/transcribe`, `/api/analyze`, `/api/generate-cache`
- **Vector cache system**: Loads from `interviewguru_cache.json` in OS temp; semantic similarity matching with 0.82+ threshold; checks both main embedding + 2-3 variant paraphrases
- **Hallucination filter**: 50+ Whisper patterns removed (e.g., "thank you for watching", "www.openai.com") + 16+ technical term corrections
- **3-phase chat pipeline**: (1) Classify with llama-3.1-8b (temp 0.1), (2) Generate with llama-3.3-70b (temp 0.4), (3) Verify if confidence < 0.8 or system_design question
- **Confidence scoring**: Uses logprobs when available; falls back to LLM self-estimation; anti-hallucination threshold 0.2 for voice mode
- Groq API calls with retry logic, rate-limit headers, error handling (401/429/500+)

---

## 💾 Dependencies & Versions

### **Core Dependencies**
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.0.0 | UI framework |
| `react-dom` | 19.0.0 | React DOM renderer |
| `react-router-dom` | 7.13.1 | Client-side routing |
| `vite` | 6.2.0 | Build tool + dev server (HMR) |
| `typescript` | ~5.8.2 | Type checking, transpilation |
| `express` | 4.22.1 | Backend HTTP server |

### **AI/ML & LLM APIs**
| Package | Version | Purpose |
|---------|---------|---------|
| `groq-sdk` | 1.1.1 | Groq API (Whisper STT, llama models) |
| `@google/genai` | 1.29.0 | Google Gemini API (TTS, other models) |
| `@xenova/transformers` | 2.17.2 | Local embeddings for vector cache (all-MiniLM-L6-v2) |

### **Desktop/Electron**
| Package | Version | Purpose |
|---------|---------|---------|
| `electron` | 41.0.0 | Desktop app framework (Windows) |
| `electron-builder` | 26.8.1 | Package-script-build Windows .exe installer (NSIS) |
| `electron-updater` | 6.8.3 | Auto-update for installed app |

### **Frontend Styling & UI**
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | 4.1.14 | Utility-first CSS framework (primary styling) |
| `@tailwindcss/vite` | 4.1.14 | Tailwind Vite integration plugin |
| `lucide-react` | 0.546.0 | Icon library (React components) |
| `motion` | 12.23.24 | Animation library for smooth transitions |
| `clsx` | 2.1.1 | Utility for classname merging |
| `tailwind-merge` | 3.5.0 | Merge Tailwind classes safely with overrides |

### **Authentication & User Management**
| Package | Version | Purpose |
|---------|---------|---------|
| `@clerk/react` | 6.1.0 | Clerk auth provider (sign-in/up) |
| `@clerk/themes` | 2.4.57 | Clerk dark theme customization |

### **Real-time Communication (Currently Unused)**
| Package | Version | Purpose |
|---------|---------|---------|
| `socket.io` | 4.8.3 | WebSocket server (declared but not used; marked for removal) |
| `socket.io-client` | 4.8.3 | WebSocket client (declared but not used; marked for removal) |

### **Development & Build Tools**
| Package | Version | Purpose |
|---------|---------|---------|
| `tsx` | 4.21.0 | TypeScript Node.js runner (npm run dev) |
| `tsup` | 8.5.1 | TypeScript bundler (build server → server.cjs) |
| `@vitejs/plugin-react` | 5.0.4 | React Vite plugin (JSX support) |
| `concurrently` | 9.2.1 | Run multiple npm scripts in parallel |
| `wait-on` | 9.0.4 | Wait for port availability (electron-dev.cjs) |
| `npm-run-all` | 4.1.5 | Orchestrate build pipeline |

---

## 🚀 Development Setup

### Prerequisites
- **Node.js** 18+ (18.19.0+)
- **npm** 9+
- **Groq API Key** (free tier available) — `GROQ_API_KEY=gsk_...`
- **Google Gemini API Key** (free tier available) — `GEMINI_API_KEY=AIza...`
- **Clerk Publishable Key** (free dev setup) — `VITE_CLERK_PUBLISHABLE_KEY=pk_...`
- **Windows OS** (Electron app Windows-only; macOS/Linux not supported)

### Getting Started

**Clone & Install**:
```bash
git clone <repo-url>
cd InterviewGuru
npm install
```

**Create `.env` file** in project root:
```env
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
VITE_CLERK_PUBLISHABLE_KEY=pk_...
PORT=3000
NODE_ENV=development
```

**Start Development**:
```bash
npm run electron:dev
```

This command:
1. Spawns Express backend on `http://localhost:3000`
2. Launches Electron app with React + Vite HMR hot reload
3. Opens DevTools automatically
4. Watches `src/` for changes (auto-reload in Electron)

### All npm Scripts

| Script | Purpose |
|--------|---------|
| **`npm run electron:dev`** | ⭐ **Main**: Electron + backend with HMR (use this) |
| `npm run dev` | Backend only (watch mode, HMR on `localhost:3000`) |
| `npm run start` | Backend only (production mode) |
| `npm run build:ui` | Build React UI → `dist/` (Vite) |
| `npm run build:server` | Build Express backend → `server.cjs` (tsup) |
| `npm run build` | Full production build (UI + server) |
| `npm run preview` | Preview Vite build locally on `localhost:5000` |
| `npm run clean` | Remove build artifacts (`dist/`, `release/`, `server.cjs`) |
| `npm run lint` | TypeScript type checking (no emit, catches errors) |
| `npm run dist` | Build Windows installer `.exe` (requires `npm run build` first) |
| `npm run predist` | Kill existing InterviewGuru.exe before rebuild |

---

## 🔗 Complete API Reference

### **1. Health Check**
```
GET /api/health
Response: { status: 'ok' }
Purpose: Verify backend is running
```

---

### **2. Transcription (Speech-to-Text)**
```
POST /api/transcribe
Headers: {
  'x-api-key': string (GROQ_API_KEY),
  'x-voice-model': string (default: 'whisper-large-v3-turbo'),
  'Content-Type': 'application/json'
}
Request Body: {
  audioBase64: string (base64 encoded audio file),
  mimeType: string (e.g., 'audio/webm;codecs=opus', 'audio/mp4')
}
Response: {
  text: string (cleaned transcript)
}
Error Response: {
  error: string,
  retryAfter?: number (seconds to wait before retry)
}
```

**Processing Logic**:
- Sends base64 audio to Groq Whisper API
- Filters 30+ hallucination patterns (e.g., "you" vs "you're", "domain" vs "do main")
- Corrects technical terms (e.g., "REST" → "REST API", "virtual dome" → "virtual DOM")
- Cleans up `tmp/` audio files
- Returns cleaned transcript string

**Latency**: ~0.8s per audio chunk

---

### **3. Analysis (Question Detection + Answer Generation)**
```
POST /api/analyze
Headers: {
  'x-api-key': string (GROQ_API_KEY),
  'x-model': string (default: 'llama-3.3-70b-versatile'),
  'x-persona': string (default: 'Technical Interviewer'),
  'x-mode': string ('voice' | 'chat')
}

Request Body: {
  transcript: string (the question or text to analyze),
  resume?: string (optional resume context),
  jd?: string (optional job description context)
}

Response (CHAT MODE):
{
  isQuestion: boolean,
  question: string,
  confidence: number (0.0-1.0, from logprobs),
  type: 'concept' | 'coding' | 'system_design' | 'behavioral',
  difficulty: 'easy' | 'medium' | 'hard',
  sections: [
    {
      title: string,
      content: string (2-4 sentence prose),
      points: string[] (2-4 bullet-point key takeaways)
    }
  ],
  code: string (working code example, or empty),
  codeLanguage: string (e.g., 'python', 'javascript'),
  bullets: [],
  spoken: string (optional TTS text),
  cacheHit: boolean
}

Response (VOICE MODE):
{
  isQuestion: boolean,
  question: string,
  confidence: number (0.0-1.0),
  type: 'technical' | 'behavioral' | 'general',
  bullets: string[] (3-5 keyword-dense talking points),
  spoken: string (1-2 sentence confident answer),
  cacheHit: boolean
}
```

**Processing Pipeline (CHAT MODE)**:
1. **Classify** — Use llama-3.1-8b-instant (temp 0.1, deterministic) to classify question type/difficulty
2. **Generate** — Use llama-3.3-70b-versatile (temp 0.4, creative) with adaptive prompt based on classification
3. **Verify** — If confidence < 0.7 OR difficulty='hard', re-run llama-3.1-8b with verification prompt

**Vector Cache Lookup**:
- Compute embedding via `@xenova/transformers` (all-MiniLM-L6-v2, local)
- Calculate cosine similarity against cached embeddings
- If similarity > 0.82 & cache exists, return cached answer (instant, <100ms)
- Otherwise, run LLM analysis and optionally cache result

**Response Time**: 3-5s for chat mode, <100ms if cache hit

---

### **4. Cache Generation (Background)**
```
POST /api/generate-cache
Headers: {
  'x-api-key': string (GROQ_API_KEY)
}

Request Body: {
  jd: string (job description text, minimum 50 characters),
  resume?: string (optional resume context)
}

Response: {
  status: string (e.g., "Successfully cached 35 questions!"),
  questionsGenerated: number,
  embeddings: number
}
```

**Logic**:
1. Parse JD + extract 35 likely interview questions
2. For each question:
   - Generate answer using llama-3.3-70b (temp 0.4)
   - Generate 2-3 paraphrased variants
   - Compute embeddings for main + variants
   - Store in cache object with metadata
3. Persist to `interviewguru_cache.json` in OS temp directory

**Cache Format**:
```json
{
  "entries": [
    {
      "id": "unique-id",
      "question": "Explain REST API principles",
      "embedding": [0.12, 0.34, ...],      // 384-dim vector
      "variants": ["What are REST APIs?", "Define REST"],
      "variantEmbeddings": [[...], [...]],
      "answer": {
        "type": "concept",
        "difficulty": "easy",
        "sections": [...],
        "code": "",
        "bullets": [...],
        "spoken": "..."
      }
    }
  ]
}
```

---

## 📐 Data Models & Interfaces

### **From useAIAssistant.ts**
```typescript
export interface Answer {
  bullets: string[];
  spoken: string;
  explanation?: string;
  code?: string;
  codeLanguage?: string;
}

export interface QuestionDetection {
  isQuestion: boolean;
  question: string;
  confidence: number;
  type: 'concept' | 'coding' | 'system_design' | 'behavioral';
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### **From OverlayWidget.tsx**
```typescript
interface Section {
  title: string;
  content: string;
  points?: string[];
}

interface HistoryItem {
  id: string;
  question: string;
  answer: string[];
  sections?: Section[];
  explanation?: string;
  code?: string;
  codeLanguage?: string;
  timestamp: number;
  confidence?: number;
  type?: string;
  difficulty?: string;
}
```

### **From server.ts (Vector Cache)**
```typescript
type CacheEntry = {
  id: string;
  question: string;
  embeddingModel: 'all-MiniLM-L6-v2';
  embedding: number[];           // Main question embedding (384-dim)
  variants: string[];            // 2-3 paraphrased variations
  variantEmbeddings: number[][];  // Embeddings for each variant
  answer: {
    sections: Section[];
    bullets: string[];
    code: string;
    codeLanguage: string;
    spoken: string;
    type: string;                // 'concept' | 'coding' | etc.
    difficulty: string;          // 'easy' | 'medium' | 'hard'
    category: string;
  }
};
```

---

## 🎨 Styling System

### **Framework & Architecture**
- **Primary**: Tailwind CSS 4.1.14 (utility-first, responsive)
- **Vite Plugin**: `@tailwindcss/vite` (zero-config bundling)
- **Secondary**: Co-located `.css` files for complex animations (5% of styling)
- **Icons**: Lucide React (SVG-based)
- **Animation**: Motion library (smooth transitions)

### **Design System (CSS Variables)**
```css
--c-primary:   #00FFB3  (cyan-green, accent)
--c-secondary: #00C2FF  (cyan, hover states)
--c-accent:    #7A5CFF  (purple, highlights)
--c-bg:        #020617  (dark navy background)
--c-surface:   rgba(255,255,255,0.025)  (light surfaces)
--c-surface2:  rgba(255,255,255,0.045)  (darker surfaces)
--c-border:    rgba(255,255,255,0.07)   (border color)
--c-text:      #e2e8f0  (light gray text)
--c-danger:    #ef4444  (red, errors)
```

### **Key CSS Features**
- Backdrop blur (glassmorphism effect)
- Grid overlay background pattern
- Custom animations (toastIn, glow, pulse)
- Electron drag regions (`-webkit-app-region: drag|no-drag`)
- Custom scrollbar styling
- Gradient masks (fade-out effects)
- Responsive Tailwind breakpoints (sm, md, lg, xl)

### **Component-Specific Styling**
- `LandingPage.css` — Demo animations, interactive demo shell
- Co-located with components (e.g., custom CSS alongside `.tsx`)
- Global `index.css` imports Tailwind + custom globals

---

## 🔌 External Integrations

### **Groq API (LLM + Whisper STT)**
**Purpose**: Primary AI backbone for transcription, question detection, answer generation

**Models Used**:
- `whisper-large-v3-turbo` — Real-time speech-to-text (0.8s latency)
- `llama-3.3-70b-versatile` — Main answer generator (chat mode), temp 0.4
- `llama-3.1-8b-instant` — Fast classifier + verification, temp 0.1

**Client Integration** (server.ts):
```typescript
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Transcription
groq.audio.transcriptions.create({
  file: audioBuffer,
  model: 'whisper-large-v3-turbo'
});

// LLM calls
groq.chat.completions.create({
  messages: [{ role: 'user', content: prompt }],
  model: 'llama-3.3-70b-versatile',
  temperature: 0.4,
  response_format: { type: 'json_object' },
  logprobs: true
});
```

**Features**: JSON output mode, temperature tuning, logprobs for confidence, streaming support

---

### **Google Gemini API (TTS + Future Vision)**
**Purpose**: Text-to-speech for answer playback

**Model Used**:
- `gemini-2.5-flash-preview-tts` — Generate spoken audio (voice: "Kore")

**Integration** (useAIAssistant.ts):
```typescript
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-preview-tts",
  contents: [{ parts: [{ text: spokenText }] }],
  config: {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
    }
  }
});
```

**Features**: Base64 audio output, custom voice names, optional device audio sink ID

---

### **Clerk Authentication**
**Purpose**: User sign-in, sign-up, session management

**Setup** (main.tsx):
```tsx
<ClerkProvider 
  publishableKey={VITE_CLERK_PUBLISHABLE_KEY}
  appearance={{ baseTheme: dark }}
>
  <App />
</ClerkProvider>
```

**Components**: `<SignInButton />`, `<SignUpButton />`, `<UserButton />`, `<Show when="signed-in">`

**Features**: Dark theme, OAuth integrations, protected routes, user metadata

---

### **@Xenova/Transformers (Local ML)**
**Purpose**: Vector embeddings for semantic question matching (cache lookups)

**Model**: `Xenova/all-MiniLM-L6-v2` (384-dimensional embeddings, runs locally)

**Usage** (server.ts):
```typescript
const embedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  .then(e => e(text, { pooling: 'mean', normalize: true }));

// Cosine similarity lookup
const similarity = dotProduct(embedding, cachedEmbedding);
if (similarity > 0.82) { /* use cached answer */ }
```

**Features**: Cosine similarity search, local execution (no API cost), mean pooling, normalized vectors

---

## ⚠️ Known Issues & Limitations

### **Build Errors (error_log.txt)**
```
Error: Cannot find module 'vite' in packaged Electron app
Location: server.cjs requires 'vite' → fails in production
Cause: Vite dev server not bundled into CJS build
Status: ✅ FIXED — Development-only import guarded by NODE_ENV check
```

### **Architecture Issues**
1. **socket.io Unused** — Declared in package.json but not implemented. Marked for removal in future.
2. **API Folder Missing** — Vercel serverless fallback `/api/` routes mentioned in copilot-instructions but not yet created
3. **Vite in Electron Prod** — Dev-only Vite server conditionally imported to prevent prod bundle bloat

### **Design-Level Limitations**
1. **Windows Only** — Electron builder targets Windows NSIS installer exclusively (no macOS)
2. **Loopback Audio Dependency** — Requires WASAPI loopback device (Windows-specific; breaks on some systems)
3. **Cache Persistence** — Stored in OS temp directory only, not user home (lost on system cleanup)
4. **Rate Limiting** — Groq API quotas; voice mode with high question frequency may hit limits
5. **Vector Similarity Threshold** — Fixed at 0.82 (all-MiniLM model), may miss valid paraphrases
6. **Conversation History** — Not persisted across sessions; lost on app restart

### **Feature Gaps**
- ❌ Vercel serverless API routes (`/api/` directory not implemented)
- ❌ WebSocket real-time sync (dependencies included but unused)
- ❌ macOS / Linux support (Electron Windows-only)
- ❌ Local LLM fallback (fully cloud-dependent on Groq)
- ❌ Session history recovery (no database backend)
- ❌ Multi-user collaboration (single-user desktop app)

---

## �️ Electron Desktop Integration

### **Window Configuration (electron/main.cjs)**

**Key Electron Settings**:
```javascript
const mainWindow = new BrowserWindow({
  alwaysOnTop: true,              // Screen-saver level (above all apps)
  frame: false,                   // Frameless custom titlebar
  transparent: true,              // Transparency for stealth
  backgroundThrottling: false,    // Audio APIs work without focus
  nodeIntegration: true,          // IPC communication enabled
  contextIsolation: false,        // Direct require('electron') access
  webPreferences: {
    preload: null,                // No preload script (security simplified for app)
  }
});

mainWindow.setContentProtection(true);  // Invisible on Zoom/Teams/OBS screen share
mainWindow.setIgnoreMouseEvents(true, { forward: true }); // Click-through by default
```

### **Windows-Specific Audio Capture (WASAPI Loopback)**

**Critical Setup (auto-detect system audio)**:
```javascript
// Electron: Uses IPC to get primary monitor source + system audio loopback
session.setDisplayMediaRequestHandler((request, callback) => {
  desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
    callback({
      video: sources[0],            // Primary monitor
      audio: 'loopback'             // Magic: auto-enables system audio
    });
  });
});

// Browser: Standard getDisplayMedia (requires manual "Also share tab audio")
// (No loopback support in standard browser API)
```

**⚠️ Important**: WASAPI loopback device must be available on Windows (not all systems have it configured by default)

### **IPC Channels (10+ implemented)**

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `chat-input-focused` | Main → Renderer | Prepare for keyboard input; disable click-through |
| `chat-input-blurred` | Renderer → Main | Re-enable click-through after input |
| `set-stealth-mode` | Renderer → Main | Toggle content protection (screen-share invisible) |
| `set-always-on-top` | Renderer → Main | Toggle always-on-top behavior |
| `resize-window` | Renderer → Main | Custom bounds-checked resize |
| `focus-chat-input` | Main → Renderer | Triggered by Ctrl+Shift+Space global shortcut |
| `get-source-id` | Renderer → Main | Fetch primary monitor ID for audio capture |
| `update-hotkeys` | Renderer → Main | Dynamically register global shortcuts |

### **Global Shortcuts**

**Hard-coded:**
- `Ctrl+Q` — Emergency quit
- `Ctrl+Shift+Space` — Focus chat input (stealth mode, no mouse movement)
- `Ctrl+Shift+X` — Toggle click-through overlay
- `Ctrl+Shift+H` — Hide/show app

**Configurable via UI**: `toggleClickThrough` and `toggleHide` shortcuts

### **Stealth Mode Mechanics**

```javascript
// Click-through + invisible on screen share combo:
win.setIgnoreMouseEvents(true, { forward: true });  // Mouse passes through
win.setContentProtection(true);                     // Invisible on screen capture
win.setVisibleOnAllWorkspaces(true);               // Visible on all desktops

// When chat input focused:
win.setIgnoreMouseEvents(false);                   // Allow keyboard input
win.showInactive();                                // Show without stealing cursor
```

---

## 🔄 Advanced API Patterns & Rate Limiting

### **Vector Cache Lookup with Dual-Threshold Strategy**

```typescript
// server.ts cache lookup
let bestMatch: CacheEntry | null = null;
let bestScore = 0;

for (const entry of cache.entries) {
  // Check main embedding
  const mainSim = cosineSimilarity(embedding, entry.embedding);
  if (mainSim > bestScore) {
    bestScore = mainSim;
    bestMatch = entry;
  }
  
  // Check variant embeddings (2-3 paraphrases)
  for (const variantEmb of entry.variantEmbeddings) {
    const variantSim = cosineSimilarity(embedding, variantEmb);
    if (variantSim > 0.85 && variantSim > bestScore) {
      bestScore = variantSim;
      bestMatch = entry;
    }
  }
}

// Cache hit threshold: > 0.82
if (bestMatch && bestScore > 0.82) {
  console.log(`[Cache HIT] Score: ${bestScore.toFixed(2)} | Q: ${bestMatch.question.substring(0, 40)}`);
  return res.json({ /* cached response */, cacheHit: true });
}
```

### **3-Phase Chat Mode Pipeline with Auto-Verification**

```typescript
// Phase 1: Classify (deterministic, fast)
const classified = await groq.chat.completions.create({
  model: 'llama-3.1-8b-instant',
  temperature: 0.1,  // Deterministic routing
  messages: [{
    role: 'user',
    content: `Classify question:\n${question}\n\nOutput: {type, difficulty, persona_adjusted}`
  }]
});

// Phase 2: Generate (creative, structure-constrained)
let answer = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  temperature: 0.4,  // Structured creativity
  response_format: { type: 'json_object' },
  messages: [{
    role: 'system',
    content: buildAdaptivePrompt(classified.type, classified.difficulty, persona, resume, jd)
  }, {
    role: 'user',
    content: question
  }]
});

// Phase 3: Verify (only for hard questions with low confidence)
if ((classified.difficulty === 'hard' || classified.type === 'system_design') && answer.confidence < 0.8) {
  const verification = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    temperature: 0.2,
    messages: [{
      role: 'system',
      content: 'Check for factual errors, Big-O mistakes, missing edge cases, hallucinated APIs'
    }, {
      role: 'user',
      content: `Question: ${question}\n\nAnswer: ${JSON.stringify(answer)}\n\nReturn: {issues, fixes}`
    }]
  });
  
  if (verification.issues.length > 0) {
    // Regenerate with fixes
    answer = await regenerateWithFixes(verification.fixes);
  }
}
```

### **Groq Rate Limit Handling with Retry-After**

```typescript
// Client-side retry strategy (useTabAudioCapture.ts)
try {
  const response = await fetch('/api/transcribe', { /* ... */ });
  
  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = (data.retryAfter || 3) * 1000;
    
    setIsRateLimited(true);
    console.warn(`Rate limited! Retry in ${retryAfter}ms`);
    
    setTimeout(() => setIsRateLimited(false), retryAfter);
    return; // Skip this chunk
  }
} catch (error) {
  // Handle error
}
```

---

## 🏗️ Build Pipeline & Deployment Architecture

### **Vite + Express + Electron Integration (electron-dev.cjs)**

**Three-step startup sequence**:

1. **Spawn backend server** (TypeScript → tsx):
   ```javascript
   const serverProcess = spawn('npx', ['tsx', 'server.ts'], {
     stdio: 'inherit',  // See server logs directly in terminal
     shell: true
   });
   ```

2. **Poll TCP port 3000** until server ready:
   ```javascript
   function waitForServer(port, onReady) {
     const timer = setInterval(() => {
       isPortOpen(port, (ready) => {
         if (ready) { clearInterval(timer); onReady(); }
       });
     }, 1000);
   }
   ```

3. **Launch Electron** once backend is ready:
   ```javascript
   const electronProcess = spawn(require('electron'), ['.'], {
     stdio: 'inherit',
     shell: false
   });
   ```

### **Production Build Pipeline**

```bash
npm run build                   # 3-step build:
  → npm run build:ui            # 1. Vite: React → dist/ (minified)
  → npm run build:server        # 2. tsup: server.ts → server.cjs (Node bundle)

npm run dist                    # Package into .exe
  → npm run build (implicit)
  → electron-builder           # Create Windows NSIS installer
  → Output: release/InterviewGuru Setup *.exe
```

**Key differences electron-dev vs. production**:
| Component | Development | Production |
|-----------|---|---|
| **Backend** | tsx watch (live reload) | server.cjs (static bundle) |
| **Frontend** | Vite HMR middleware | Static files from dist/ |
| **DevTools** | Opened automatically | Disabled (saves RAM) |
| **Vite server** | Running | Conditional guard on NODE_ENV |

### **tsconfig.json Compiler Settings**

```json
{
  "target": "ES2022",              // Modern JavaScript
  "module": "ESNext",              // ES modules (tree-shakeable)
  "jsx": "react-jsx",              // React 17+ JSX transform
  "lib": ["ES2022", "DOM", "DOM.Iterable"],
  "moduleResolution": "bundler",   // Bundler-style resolution
  "noEmit": true,                  // Only type-check (Vite handles transpilation)
  "skipLibCheck": true,            // Skip node_modules type checking
  "allowImportingTsExtensions": true
}
```

---

## 🛡️ Security & Performance Deep Dive

### **API Key Security Model**

**Current (⚠️ Client-side only)**:
```typescript
// Frontend stores in localStorage
localStorage.setItem('groq_api_key', userProvidedKey);

// Sent via headers with every request
fetch('/api/analyze', {
  headers: {
    'x-api-key': localStorage.getItem('groq_api_key'),
    'x-model': 'llama-3.3-70b-versatile'
  }
});
```

**⚠️ Security Issue**: API keys exposed in browser storage. **Not recommended for public distribution**. Workaround: Implement server-side proxy + session authentication for production.

### **Rate Limiting & Quota Strategies**

**Groq Free Tier Limits** (typical):
- ~50 requests/minute
- Voice mode (high-frequency) exhausts quickly
- Solution: Pre-generate cache for interview domain

**Client-side mitigation:**
```typescript
// Heuristic pre-filter: Skip non-questions (save ~70% of calls)
const shouldAnalyze = (text: string) => {
  const hasQuestionMark = text.includes('?');
  const hasQuestionWord = /\b(what|how|explain|describe)\b/.test(text.toLowerCase());
  return hasQuestionMark || hasQuestionWord;
};

// Debounce: Wait 800ms before processing
setTimeout(() => { if (shouldAnalyze(transcript)) analyzeQuestion(transcript); }, 800);
```

**Pre-interview cache strategy:**
```typescript
// User uploads job description
POST /api/generate-cache { jd: "...", resume: "..." }
// → Generates 35 likely questions + answers + embeddings
// → Stores in temp directory
// → Reduces 90% of LLM calls during interview
```

### **Performance Optimization Techniques**

| Optimization | Implementation | Latency Saved |
|---|---|---|
| **Vector cache** | Cosine similarity (0.82+) | 2.9s (3-5s → <100ms) |
| **Model selection** | llama-3.1-8b for classify/verify | 2-3s (vs 3-5s for 70b) |
| **Debouncing** | 800ms before API call | Avoid spam (70% quota saved) |
| **5s chunking** | Audio recorded in chunks + auto-restart | Prevent buffer overflow |
| **Memoization** | useCallback for stable hook refs | Prevent re-renders on prop change |
| **BackgroundThrottling disabled** | Electron window setting | Audio works without focus |

---

## ⚠️ Critical Gotchas & Error Handling

### **7 Major Pitfalls**

1. **WASAPI loopback not enabled by default**
   - Windows: User must manually enable in Settings → Sound → App Volume & Device Preferences
   - App fails silently if unavailable
   - **Fix**: Add diagnostic UI or fallback to microphone

2. **Socket.io declared but completely unused**
   - Dependencies in package.json but zero imports
   - **Action**: Remove or properly integrate for real-time sync

3. **Vite dev server in production build**
   - If NODE_ENV check fails, ~80MB vite dependency bundled
   - **Guard**: `if (process.env.NODE_ENV !== 'production')`

4. **API keys exposed in localStorage**
   - Not suitable for public app distribution
   - **Mitigation**: Server-side proxy for production

5. **No session persistence**
   - History lost on app restart
   - Cache deleted on system cleanup
   - **Impact**: User frustration

6. **Hallucination filter incomplete**
   - 50+ patterns filtered but edge cases exist
   - Whisper can still mishear technical terms
   - **Mitigation**: Confidence threshold + verification pipeline

7. **Confidence scoring unreliable for novel questions**
   - Logprobs unavailable from all models
   - Falls back to LLM self-estimation (often 0.95+)
   - **Solution**: Use verification pipeline for hard questions

### **Fallback Mechanisms**

**JSON extraction (handles multiple formats)**:
```typescript
function extractJSON(content: string): any {
  try {
    // 1. Try markdown-fenced JSON
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    
    // 2. Try bare JSON
    return JSON.parse(content);
  } catch {
    // 3. Return empty object as fallback
    return {};
  }
}
```

**Confidence scoring fallback**:
```typescript
let confidence = 1.0;
if (tokens && Array.isArray(tokens)) {
  // 1. Use logprobs if available
  confidence = Math.exp(avgLogProb);
} else {
  // 2. Fall back to LLM self-estimation
  const confCompletion = await groq.chat.completions.create({...});
  confidence = extractJSON(confCompletion.content).confidence || 1.0;
}
```

---

## 🚦 State Management & Component Patterns

### **OverlayWidget.tsx: 23+ useState Hooks**

**Audio/Processing state**:
```typescript
const [isListening, setIsListening] = useState(false);
const [transcript, setTranscript] = useState('');
const [isRateLimited, setIsRateLimited] = useState(false);
const [detectedQuestion, setDetectedQuestion] = useState('');
const [answer, setAnswer] = useState<Answer | null>(null);
const [isProcessing, setIsProcessing] = useState(false);
```

**UI state**:
```typescript
const [showSettings, setShowSettings] = useState(false);
const [showHistory, setShowHistory] = useState(true);
const [isHidden, setIsHidden] = useState(false);
const [activeTab, setActiveTab] = useState<'voice' | 'chat'>('voice');
const [chatInput, setChatInput] = useState('');
const [isGenerating, setIsGenerating] = useState(false);
```

**Settings (localStorage-persisted)**:
```typescript
const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
const [voiceModel, setVoiceModel] = useState(() => localStorage.getItem('groq_voice_model') || 'whisper-large-v3-turbo');
const [model, setModel] = useState(() => localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile');
const [persona, setPersona] = useState(() => localStorage.getItem('groq_persona') || 'Technical Interviewer');
const [resume, setResume] = useState(() => localStorage.getItem('groq_resume') || '');
const [jd, setJD] = useState(() => localStorage.getItem('groq_jd') || '');
const [opacity, setOpacity] = useState(() => parseFloat(localStorage.getItem('aura_opacity') || '0.9'));
const [enableTTS, setEnableTTS] = useState(() => localStorage.getItem('aura_enable_tts') === 'true');
const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
const [selectedOutputDevice, setSelectedOutputDevice] = useState('');
```

**Session state**:
```typescript
const [history, setHistory] = useState<HistoryItem[]>([]);
const [sessionStartTime, setSessionStartTime] = useState(Date.now());
const [appAlert, setAppAlert] = useState<Alert | null>(null);
const [copiedAlert, setCopiedAlert] = useState(false);
```

### **useCallback Pattern (Prevent Re-renders)**

```typescript
const toggleListen = useCallback(async () => {
  if (isListening) {
    stopAudio();
  } else {
    startAudio();
  }
}, [isListening]);  // Only rebuild if isListening changes

const handleTranscriptUpdate = useCallback((newTranscript: string) => {
  setTranscript(newTranscript);
  // Debounce question detection
  const timer = setTimeout(() => {
    if (shouldAnalyze(newTranscript)) {
      analyzeQuestion(newTranscript);
    }
  }, 800);
  return () => clearTimeout(timer);
}, []);
```

### **useEffect Orchestration (Complex Side Effects)**

```typescript
// Auto-scroll to newest answer
useEffect(() => {
  if (detectedQuestion && answer) {
    setHistory(prev => [newItem, ...prev].slice(0, 50));
    answersEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
}, [detectedQuestion, answer]);

// Listen for global keyboard shortcuts
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
      setIsHidden(prev => !prev);
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, []);

// Register/update global IPC listeners
useEffect(() => {
  if (window.electron?.ipcRenderer) {
    const unlisteners = [];
    unlisteners.push(
      window.electron.ipcRenderer.on('focus-chat-input', () => {
        chatInputRef.current?.focus();
      })
    );
    return () => unlisteners.forEach(fn => fn?.());
  }
}, []);
```

---

## 📋 Incomplete Features & Technical Debt

### **Declared But Not Implemented**

| Feature | File(s) | Status | Notes |
|---|---|---|---|
| **Vercel serverless** | api/analyze.ts, api/transcribe.ts | ⚠️ Skeleton | Handler pattern present but never invoked by build |
| **WebSocket sync** | socket.io, socket.io-client in package.json | ❌ Unused | Dependencies declared but zero usage in code |
| **Session persistence** | None | ❌ Not started | History lost on app restart; temp cache only |
| **macOS/Linux** | Electron builder in package.json | ❌ Windows only | NSIS .exe target exclusively |
| **Local LLM fallback** | None | ❌ 100% Groq | No ollama/local models fallback |
| **Markdown rendering** | OverlayWidget section content | ❌ Plain text | Uses innerText instead of reactMarkdown |
| **Auto-paste mode** | None | ❌ Not scoped | Send answer directly to focused text field |
| **Multi-monitor support** | Electron window only | ❌ Single display | Pin to specific monitor not implemented |

### **Performance Debt**

| Area | Current | Potential |
|---|---|---|
| **Streaming LLM** | Full buffer wait | Token streaming for snappy UI |
| **Cache pre-gen** | Sequential | Parallel question generation |
| **Offline mode** | None | Fallback to pre-cached answers |
| **Persistence** | Temp directory | User home dir + versioning |

---

## 🎯 Testing & Debugging Utilities

### **Manual Debug Checklist**

**Voice mode debugging:**
```typescript
// Check Electron detection
console.log('Electron detected:', /electron/i.test(navigator.userAgent));

// Verify audio stream
const audioTracks = stream.getAudioTracks();
console.log('Audio tracks:', audioTracks.length);
if (audioTracks.length === 0) {
  console.error('No audio! User must check "Also share tab audio"');
}

// Test STT endpoint
curl -X POST http://localhost:3000/api/transcribe \
  -H "x-api-key: gsk_..." \
  -H "Content-Type: application/json" \
  -d '{"audioBase64": "...", "mimeType": "audio/webm"}'
```

**Cache generation test:**
```bash
curl -X POST http://localhost:3000/api/generate-cache \
  -H "x-api-key: gsk_..." \
  -H "Content-Type: application/json" \
  -d '{"jd": "Software Engineer role at FAANG...", "resume": "5 years experience..."}'
```

### **DevTools Logging Patterns**

```typescript
console.log(`[Cache HIT] Score: ${score.toFixed(2)} | Q: ${question.substring(0, 40)}`);
console.log(`[Chat] Confidence: ${confidence.toFixed(2)} | Type: ${type}`);
console.log(`[Verify] Fixed issues: ${issues.join(', ')}`);
console.error('🚨 AI Error:', error.message);
```

---

### File Naming
```
✅ Components:      PascalCase.tsx           (OverlayWidget.tsx)
✅ Hooks:           useActionName.ts         (useAIAssistant.ts)
✅ Utilities:       camelCase.ts             (vectorCache.ts)
✅ Styles:          co-located CSS files     (OverlayWidget.tsx + custom CSS)
✅ API routes:      /api/{action}.ts         (/api/analyze.ts)
```

### Component Structure
```typescript
// ✅ DO: Props interface + functional component
interface ComponentProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}

export function MyComponent({ onSubmit, disabled }: ComponentProps) {
  const [state, setState] = useState('');
  
  return <div>...</div>;
}

// ❌ DON'T: Default props or implicit typing
export default function MyComponent(props) {
  // No clear interface; hard to type-check
}
```

### Styling Approach
```
Hierarchy:
1. Tailwind CSS classes (primary) → fast, responsive, consistent
2. CSS modules for complex animations (~5% of code)
3. CSS variables for theming (--primary: #00ff88, --status-color, etc.)
4. Inline styles ONLY for runtime dynamic values
```

Example:
```tsx
// ✅ DO: Tailwind first, then custom for animations
<div className="flex gap-2 p-4 bg-slate-900 rounded-lg animate-pulse">
  <span className="text-cyan-400">●</span>
  <p>Live</p>
</div>

/* LandingPage.css */
@keyframes glow {
  0%, 100% { text-shadow: 0 0 10px #00ff88; }
  50% { text-shadow: 0 0 20px #00ff88; }
}

// ❌ DON'T: Random inline styles
<div style={{ color: 'rgb(0, 255, 136)', fontSize: '16px' }}>
```

### State Management
- **Local state**: `useState` in component (preferred for UI state)
- **Custom hooks**: `useAIAssistant`, `useTabAudioCapture` manage complex logic + effects
- **Context**: Clerk auth provider (`<ClerkProvider>` in main.tsx)
- **No Redux/Zustand** — keep it simple with hooks pattern

### API Communication

**Backend Endpoints** (all require `x-api-key` header):

```typescript
// POST /api/transcribe
Request: { audio: string (base64) }
Headers: { 'x-api-key': 'key', 'x-voice-model': 'whisper-large-v3-turbo' }
Response: { transcript: string, language: 'en', duration: 12.5 }

// POST /api/analyze
Request: {
  question: string,
  resume?: string,
  jobDescription?: string,
  mode: 'chat' | 'voice',
  persona: 'technical' | 'executive' | 'translator'
}
Headers: {
  'x-api-key': 'key',
  'x-model': 'llama-3.3-70b-versatile',
  'x-persona': 'technical'
}
Response: {
  sections: Array<{ title: string, content: string, points: string[] }>,
  spokenSummary: string,
  cacheHit: boolean
}
```

**Client-side API calls** (in hooks):
```typescript
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey || process.env.GROQ_API_KEY,
    'x-persona': persona,
  },
  body: JSON.stringify({ question, resume, jobDescription, mode }),
});
```

### Custom Hooks Pattern

**useAIAssistant.ts** — AI question detection + answer generation:
```typescript
export function useAIAssistant() {
  const [transcript, setTranscript] = useState('');
  const [answer, setAnswer] = useState<AnswerSection[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Debounce detection + heuristic pre-filter (? or question words)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldAnalyze(transcript)) {
        analyzeQuestion(transcript);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [transcript]);
  
  return { answer, loading, setTranscript };
}
```

**useTabAudioCapture.ts** — Audio capture + STT:
```typescript
export function useTabAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  
  useEffect(() => {
    if (!isCapturing) return;
    
    // Detect Electron vs web
    const isElectron = window.electron?.ipcRenderer;
    
    // Get audio stream + capture
    captureAudio();
    
    return () => stopCapture();
  }, [isCapturing]);
  
  return { isCapturing, toggleCapture };
}
```

---

## 🔧 Common Tasks

### Adding a New UI Component

1. **Create component file** with TypeScript + Tailwind:
```typescript
// src/components/MyFeature.tsx
interface MyFeatureProps {
  title: string;
  onAction: () => void;
}

export function MyFeature({ title, onAction }: MyFeatureProps) {
  return (
    <button
      onClick={onAction}
      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition"
    >
      {title}
    </button>
  );
}
```

2. **Import in parent** (e.g., `OverlayWidget.tsx`):
```typescript
import { MyFeature } from './MyFeature';

export function OverlayWidget() {
  return <MyFeature title="New Feature" onAction={handleClick} />;
}
```

3. **Test**:
   - Run `npm run electron:dev`
   - Change will hot-reload in Electron
   - Check TypeScript errors with `npm run lint`

### Adding API Analysis Feature

1. **Extend `/api/analyze` logic** in `server.ts`:
```typescript
app.post('/api/analyze', async (req, res) => {
  const { question, persona, mode } = req.body;
  
  // 1. Classify question type + difficulty
  const classified = await classifyQuestion(question);
  
  // 2. Build adaptive prompt
  const prompt = buildPrompt(classified, persona);
  
  // 3. Generate structured answer
  const answer = await generateAnswer(prompt);
  
  res.json({ sections: answer, cacheHit: false });
});
```

2. **Call from hook** (`useAIAssistant.ts`):
```typescript
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'x-persona': persona, 'x-api-key': apiKey },
  body: JSON.stringify({ question, resume, jobDescription, mode }),
});
```

### Adding Global Electron Shortcut

1. **Register in `electron/main.cjs`**:
```javascript
globalShortcut.register('Ctrl+Shift+J', () => {
  // Your action
  mainWindow.webContents.send('custom-event', data);
});
```

2. **Listen in React** (`App.tsx` or hook):
```typescript
if (window.electron?.ipcRenderer) {
  window.electron.ipcRenderer.on('custom-event', (event, data) => {
    // Handle action
  });
}
```

### Debugging Audio Capture

**Check if hardware capturing**:
```typescript
// In useTabAudioCapture.ts
console.log('Electron detected:', window.electron?.ipcRenderer);
console.log('Audio stream:', audioStream);
console.log('Chunks recorded:', recordedChunks.length);
```

**Verify transcription**:
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "x-api-key: $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"audio": "...", "mimeType": "audio/webm"}'
```

### Testing LLM Responses

**Direct Groq API call** (in Node):
```javascript
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const message = await groq.messages.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Your test prompt' }],
  temperature: 0.4,
});
console.log(message.content);
```

---

## ⚠️ Anti-Patterns & Gotchas

### ❌ DON'T

1. **Hardcode API keys** in code (use env vars + headers)
2. **Fetch from random domains** without CORS headers (crashes in Electron)
3. **Block main thread with sync I/O** (audio capture is async)
4. **Use Redux/Zustand** for this project (hook pattern is sufficient)
5. **Store sensitive user data locally** without encryption
6. **Modify document.title dynamically** in Electron overlay (can flicker)
7. **Call LLM APIs client-side** from React (do it server-side for security)
8. **Ignore TypeScript errors** (use `npm run lint` before committing)

### ✅ DO

1. **Use custom hooks** for complex logic (see `useAIAssistant.ts`)
2. **Debounce frequency-sensitive operations** (transcription analysis, question detection)
3. **Cache similar questions** with vector similarity > 0.82 (see `vectorCache` logic)
4. **Test audio capture** with real Electron app (browser simulator differs)
5. **Use Tailwind + co-located CSS** for styling
6. **Type all props** with TypeScript interfaces
7. **Keep components focused** (single responsibility)
8. **Test shortcuts** in actual Electron (DevTools may interfere)

---

## 📊 LLM Configuration Reference

### Classification Model
```
Model: llama-3.1-8b-instant
Temperature: 0.1 (deterministic)
Task: Route question to specific prompt style
Output: { type, difficulty, persona_adjusted }
```

### Answer Generation Model
```
Model: llama-3.3-70b-versatile
Temperature: 0.4 (structured creativity)
Task: Generate interview-quality, multi-section answer
Output: { sections[], spokenSummary, metadata }
```

### Speech Recognition
```
Model: whisper-large-v3-turbo
Task: Real-time STT from system audio
Latency: < 1s per chunk
Output: { transcript, language, duration }
```

### Text-to-Speech
```
API: Google Gemini (gemini-2.5-flash-preview-tts)
Task: Speak TTS audio response
Output: { audio/mp3, duration }
```

### Vector Embeddings
```
Model: all-MiniLM-L6-v2 (@xenova/transformers)
Task: Cache lookup via cosine similarity
Threshold: > 0.82 = use cached answer
```

---

## 🔗 Important Resources

- [README.md](../README.md) — Project overview + architecture diagram
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Groq API Reference](https://console.groq.com/docs)
- [Google Gemini API](https://ai.google.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

## 🐛 Debugging Tips

### Enable Electron DevTools
```bash
# Automatically opens on npm run electron:dev
# Manual: Ctrl+Shift+I in Electron window
```

### Check Backend Logs
```bash
# Terminal running electron:dev shows server logs
# Look for:
# - "Server listening on port 3000"
# - API request/response logs
# - Groq API errors
```

### Common Issues & Fixes

| Issue | Debug | Fix |
|-------|-------|-----|
| "Cannot find module 'vite'" | Check `npm run build:server` | Build server before running dist; guard Vite with NODE_ENV check |
| Audio capture not working | Check `useTabAudioCapture.ts` logs | Verify Electron + system audio permissions; check WASAPI loopback |
| HMR not working | Check `vite.config.ts` | Disable HMR with DISABLE_HMR=true if needed |
| Infinite TTS loop | Check AI speaking detection | Ensure `isAISpeaking` flag prevents recursion |
| API timeout on big questions | Increase timeout + check Groq quota | Split large questions into parts |
| TypeScript errors | Run `npm run lint` | Fix all errors before committing |
| Groq rate limit hit | Check API quotas | Use cache for similar questions; space out requests |

---

## 🎯 Quick Reference for AI Assistants

When working on this project:

1. **Frontend changes**: Edit `src/components/*.tsx`, `src/hooks/*.ts` → hot reload
2. **Backend changes**: Edit `server.ts` or `api/*.ts` → restart with `npm run electron:dev`
3. **Styling**: Use Tailwind first, add co-located `.css` for animations
4. **API integration**: Use `/api/analyze` (LLM) or `/api/transcribe` (STT)
5. **Type checking**: Run `npm run lint` before proposing changes
6. **State**: Use `useState` in components or custom hooks (no Redux)
7. **LLM prompts**: Adjust temperature + model based on task (0.1 for classify, 0.4 for generate)
8. **Vector cache**: Use similarity > 0.82 threshold, implemented in server.ts
9. **External APIs**: Always use env vars for keys, never hardcode credentials
10. **Testing**: Test in real Electron app, not just browser

---

## 📋 Checklist for Contributing

- [ ] Read this file completely
- [ ] Review [README.md](../README.md) architecture section
- [ ] Run `npm install` and `npm run electron:dev` locally
- [ ] Check `src/` structure and existing hooks
- [ ] Run `npm run lint` to verify TypeScript
- [ ] Make changes following conventions above
- [ ] Test in Electron (not just browser)
- [ ] Update this doc if adding new patterns/conventions
- [ ] Run `npm run lint` before final commit
- [ ] Test API endpoints with curl or Postman if backend changes
- [ ] Verify cache behavior with multiple similar questions

---

## 🌍 Environment Variables Complete Reference

### **Server-Side (.env file required)**

| Variable | Example | Used By | Required? | Notes |
|---|---|---|---|---|
| `GROQ_API_KEY` | `gsk_xxxxx...` | server.ts, api/* | ✅ YES | Groq LLM + Whisper STT |
| `GEMINI_API_KEY` | `AIza_xxxxx...` | vite.config.ts (frontend) | ✅ YES | Google Gemini TTS |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_xxxxx...` | main.tsx (@clerk/react) | ✅ YES | Clerk authentication |
| `PORT` | `3000` | server.ts (fallback: 3000) | ⚠️ Optional | Backend server port |
| `NODE_ENV` | `development` or `production` | server.ts, vite.config.ts | ⚠️ Optional | Controls Vite bundling |
| `DISABLE_HMR` | `true` | vite.config.ts | ⚠️ Optional | Disable HMR (AI Studio, restricted envs) |

### **Client-Side (localStorage auto-persisted)**

| Key | Type | Default | Scope |
|---|---|---|---|
| `groq_api_key` | string | "" | Groq API key |
| `groq_model` | string | "llama-3.3-70b-versatile" | LLM model selection |
| `groq_voice_model` | string | "whisper-large-v3-turbo" | STT model |
| `groq_persona` | string | "Technical Interviewer" | AI behavior mode |
| `groq_resume` | string | "" | User resume for context |
| `groq_jd` | string | "" | Job description for context |
| `aura_enable_tts` | boolean | false | Enable TTS playback |
| `aura_output_device` | string | "" | TTS audio device ID |
| `aura_opacity` | number | 0.9 | UI transparency (0-1) |
| `aura_stealth_mode_enabled` | boolean | true | Click-through by default |
| `aura_hotkey_toggle_hide` | string | "Ctrl+Shift+H" | Hotkey to hide/show |
| `aura_hotkey_toggle_click_through` | string | "Ctrl+Shift+X" | Hotkey to toggle click-through |

### **How to Use**

**Create `.env` in project root:**
```env
# Required
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
GEMINI_API_KEY=AIza_xxxxxxxxxxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx

# Optional
PORT=3000
NODE_ENV=development
```

**Client can override via UI:**
- Settings panel → Groq API Key field
- No app restart needed (uses new key immediately)

---

## 🚀 Advanced Workflows

### **Pre-Interview Cache Generation**

**Scenario**: User has 30 minutes before interview; wants fast responses.

**Workflow**:
```typescript
// 1. User pastes Job Description into Settings → JD field
// 2. User clicks "Generate Interview Cache" button
// 3. Backend calls POST /api/generate-cache { jd: "...", resume: "..." }
// 4. Server generates 35 likely questions + answers + embeddings
// 5. Saved to <OS_TEMP>/interviewguru_cache.json

// Result: During interview, 80%+ of answers come from cache (<100ms)
```

**Implementation**:
```typescript
// In OverlayWidget.tsx settings
const handleGenerateCache = async () => {
  setIsGenerating(true);
  try {
    const response = await fetch('/api/generate-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ jd, resume })
    });
    const data = await response.json();
    setAppAlert({ type: 'success', message: data.status });
  } finally {
    setIsGenerating(false);
  }
};
```

### **Persona Switching During Interview**

**Use Case**: Different personas for different interviewers (technical vs. behavioral HR).

```typescript
// User presses Ctrl+Shift+P to open persona menu
const handlePersonaChange = (newPersona: string) => {
  setPersona(newPersona);
  localStorage.setItem('groq_persona', newPersona);
  
  // All future requests use new persona
  // API header: 'x-persona': newPersona
};
```

### **Debugging Rate Limits**

**Scenario**: Getting 429 too frequently.

**Debug steps:**
```typescript
1. Check Groq quota at console.groq.com
2. In Console (DevTools):
   - localStorage.getItem('groq_api_key') → verify key is correct
3. Watch network tab:
   - POST /api/transcribe → check response headers for retry-after
4. Check logs:
   - Terminal running electron:dev → server logs show [Rate Limit] messages
5. Mitigation:
   - Generate cache for likely questions
   - Increase 800ms debounce to 1500ms (slower, fewer calls)
   - Use voice mode less frequently (switch to chat mode)
```

### **Custom LLM Model Selection**

**Scenario**: Want to test llama-3.1-8b (faster) instead of 70b.

```typescript
// In Settings: Change "AI Model" dropdown
// localStorage: groq_model = "llama-3.1-8b-instant"

// All future /api/analyze requests use:
// Headers: 'x-model': 'llama-3.1-8b-instant'

// Note: Confidence may be different; verify results before using in real interview
```

---

## � Pricing Plan System (Clerk-Based)

### **Overview**

InterviewGuru implements a **freemium model** with usage-based quota enforcement via Clerk authentication + backend middleware. Users are divided into plan tiers (Free, Basic, Pro, Enterprise) with specific limits on voice minutes, chat messages, and interview sessions.

**Key Architecture**:
- **Frontend Auth**: Clerk (`@clerk/react`, `useAuth()` hook for JWT)
- **Backend Auth**: Express middleware verifying Clerk JWT tokens
- **Usage Tracking**: File-based persistence (`~/.interviewguru/users.json`) for MVP; scale to PostgreSQL for production
- **Quota Enforcement**: Per-user, per-month limits with automatic reset on month change
- **Payment**: Stripe/Paddle integration (future) to upgrade plan tier

---

### **Plan Tier Definitions**

```typescript
// src/lib/planLimits.ts

export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise';

export const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free Trial',
    price: 0,
    currency: 'USD',
    billingPeriod: 'one-time',
    trialDays: 7,
    
    // Usage limits per month
    voiceMinutesPerMonth: 10,
    chatMessagesPerMonth: 10,
    sessionsPerMonth: 1,
    
    // Feature access
    features: {
      textToSpeech: false,
      sessionExport: false,
      customPersonas: false,
      cacheGeneration: false,
      advancedAnalytics: false,
    },
    
    notes: '7-day free trial, then basic quotas',
  },
  
  basic: {
    name: 'Basic',
    price: 9.99,
    currency: 'USD',
    billingPeriod: 'month',
    
    voiceMinutesPerMonth: 60,
    chatMessagesPerMonth: 500,
    sessionsPerMonth: 1,  // One interview session active at a time
    
    features: {
      textToSpeech: true,
      sessionExport: false,
      customPersonas: false,
      cacheGeneration: true,
      advancedAnalytics: false,
    },
    
    notes: 'Essential for regular interview prep',
  },
  
  pro: {
    name: 'Professional',
    price: 29.99,
    currency: 'USD',
    billingPeriod: 'month',
    
    voiceMinutesPerMonth: 600,
    chatMessagesPerMonth: 5000,
    sessionsPerMonth: 10,  // 10 concurrent sessions
    
    features: {
      textToSpeech: true,
      sessionExport: true,
      customPersonas: true,
      cacheGeneration: true,
      advancedAnalytics: true,
    },
    
    notes: 'For power users prepping for multiple interviews',
  },
  
  enterprise: {
    name: 'Enterprise',
    price: null,  // Custom pricing
    currency: 'USD',
    billingPeriod: 'year',
    
    voiceMinutesPerMonth: 99999,  // Unlimited
    chatMessagesPerMonth: 99999,
    sessionsPerMonth: 99999,
    
    features: {
      textToSpeech: true,
      sessionExport: true,
      customPersonas: true,
      cacheGeneration: true,
      advancedAnalytics: true,
    },
    
    notes: 'Custom terms, dedicated support',
  },
};

export interface PlanConfig {
  name: string;
  price: number | null;
  currency: string;
  billingPeriod: 'one-time' | 'month' | 'year';
  trialDays?: number;
  voiceMinutesPerMonth: number;
  chatMessagesPerMonth: number;
  sessionsPerMonth: number;
  features: Record<string, boolean>;
  notes: string;
}
```

---

### **User Data Model**

```typescript
// src/lib/types.ts

export interface UserRecord {
  userId: string;                  // Clerk user ID
  email: string;
  plan: PlanTier;
  trialsUsed: boolean;            // Has user completed 7-day trial?
  trialStartDate?: number;        // Timestamp of trial start
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'trial';
  
  // Monthly usage tracking (reset on month change)
  currentMonth: string;            // Format: "2024-03"
  voiceMinutesUsed: number;
  chatMessagesUsed: number;
  sessionsUsed: number;
  
  // Session tracking
  activeSessions: string[];        // Session IDs currently active
  sessionHistory: SessionRecord[];
  
  // Metadata
  createdAt: number;
  lastActiveAt: number;
  stripeCustomerId?: string;       // For Stripe integration
}

export interface SessionRecord {
  sessionId: string;
  startTime: number;
  endTime?: number;
  questionsAsked: number;
  voiceMinutesUsed: number;
  status: 'active' | 'completed' | 'abandoned';
}
```

---

### **Backend Auth Middleware**

```typescript
// server/middleware/authMiddleware.ts

import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';  // npm install jsonwebtoken

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    plan: PlanTier;
  };
}

/**
 * Extract Clerk JWT from Authorization header and verify
 * For MVP: Use simple jwt-decode (no signature verification)
 * For production: Implement full JWT signature verification against Clerk keys
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);  // Remove "Bearer " prefix
    
    // MVP: Simple JWT decode (WARNING: NO signature verification)
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Extract Clerk user ID from 'sub' claim
    const clerkUserId = decoded.sub;  // Format: "user_XXXXX"
    
    // Load user record from storage
    const users = loadUsers();
    const userRecord = users.find(u => u.userId === clerkUserId);
    
    if (!userRecord) {
      // First-time user: create default record
      const newUser = createNewUserRecord(clerkUserId, decoded.email);
      users.push(newUser);
      saveUsers(users);
      
      req.user = {
        userId: clerkUserId,
        email: decoded.email,
        plan: newUser.plan,
      };
    } else {
      // Check if user's trial has expired
      if (userRecord.plan === 'free' && userRecord.trialsUsed) {
        const trialExpired = checkTrialExpired(userRecord);
        if (trialExpired) {
          return res.status(402).json({
            error: 'Free trial expired',
            action: 'upgrade',
            message: 'Your 7-day trial has ended. Please upgrade to continue.',
          });
        }
      }

      req.user = {
        userId: clerkUserId,
        email: userRecord.email,
        plan: userRecord.plan,
      };
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Quota enforcement middleware
 * Check if user has remaining quota before processing request
 */
export async function quotaMiddleware(
  quotaType: 'voice' | 'chat' | 'session'
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const users = loadUsers();
    const user = users.find(u => u.userId === req.user!.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Reset monthly usage if month has changed
    resetMonthlyUsageIfNeeded(user);

    const planConfig = PLAN_LIMITS[user.plan];
    
    // Check quotas based on request type
    switch (quotaType) {
      case 'voice':
        if (user.voiceMinutesUsed >= planConfig.voiceMinutesPerMonth) {
          return res.status(402).json({
            error: 'Voice quota exceeded',
            quotaUsed: user.voiceMinutesUsed,
            quotaLimit: planConfig.voiceMinutesPerMonth,
            message: `Monthly voice limit (${planConfig.voiceMinutesPerMonth}m) reached`,
          });
        }
        break;

      case 'chat':
        if (user.chatMessagesUsed >= planConfig.chatMessagesPerMonth) {
          return res.status(402).json({
            error: 'Chat quota exceeded',
            quotaUsed: user.chatMessagesUsed,
            quotaLimit: planConfig.chatMessagesPerMonth,
            message: `Monthly chat limit (${planConfig.chatMessagesPerMonth}) reached`,
          });
        }
        break;

      case 'session':
        if (user.sessionsUsed >= planConfig.sessionsPerMonth) {
          return res.status(402).json({
            error: 'Session quota exceeded',
            quotaUsed: user.sessionsUsed,
            quotaLimit: planConfig.sessionsPerMonth,
            message: `Monthly session limit (${planConfig.sessionsPerMonth}) reached`,
          });
        }
        break;
    }

    next();
  };
}
```

---

### **API Endpoint Updates**

```typescript
// server.ts

import { authMiddleware, quotaMiddleware } from './middleware/authMiddleware';

// Apply auth middleware to all /api routes
app.use('/api', authMiddleware);

// POST /api/transcribe — Voice-to-text
app.post('/api/transcribe', quotaMiddleware('voice'), async (req: AuthRequest, res: Response) => {
  const { audioBase64, mimeType, audioChunkDuration } = req.body;
  
  try {
    // Transcribe with Groq
    const transcript = await transcribeWithGroq(audioBase64, mimeType);
    
    // Record voice usage
    const voiceMinualizeUsed = Math.ceil((audioChunkDuration || 5) / 60); // Convert to minutes
    recordVoiceUsage(req.user!.userId, voiceMinutesUsed);
    
    res.json({
      text: transcript,
      usage: {
        voiceMinutesUsed,
        remainingMinutes: getRemainingQuota(req.user!.userId, 'voice'),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// POST /api/analyze — Question detection + answer generation
app.post('/api/analyze', quotaMiddleware('chat'), async (req: AuthRequest, res: Response) => {
  const { question, persona, mode } = req.body;
  
  try {
    // Check vector cache first
    const cachedAnswer = await checkVectorCache(question);
    if (cachedAnswer) {
      res.json({ ...cachedAnswer, cacheHit: true });
      // Cache hits still count as chat usage
      recordChatUsage(req.user!.userId, 1);
      return;
    }

    // Analyze with Groq LLM pipeline
    const analysis = await analyzeQuestion(question, persona, mode);
    
    // Record chat usage
    recordChatUsage(req.user!.userId, 1);
    
    res.json({
      ...analysis,
      usage: {
        chatsUsed: 1,
        remainingChats: getRemainingQuota(req.user!.userId, 'chat'),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// GET /api/usage — Get user's current usage + remaining quotas
app.get('/api/usage', async (req: AuthRequest, res: Response) => {
  const users = loadUsers();
  const user = users.find(u => u.userId === req.user!.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  resetMonthlyUsageIfNeeded(user);
  saveUsers(users);

  const planConfig = PLAN_LIMITS[user.plan];
  
  res.json({
    user: {
      userId: user.userId,
      email: user.email,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
    },
    quotas: {
      voiceMinutes: {
        used: user.voiceMinutesUsed,
        limit: planConfig.voiceMinutesPerMonth,
        remaining: Math.max(0, planConfig.voiceMinutesPerMonth - user.voiceMinutesUsed),
        percentUsed: (user.voiceMinutesUsed / planConfig.voiceMinutesPerMonth) * 100,
      },
      chatMessages: {
        used: user.chatMessagesUsed,
        limit: planConfig.chatMessagesPerMonth,
        remaining: Math.max(0, planConfig.chatMessagesPerMonth - user.chatMessagesUsed),
        percentUsed: (user.chatMessagesUsed / planConfig.chatMessagesPerMonth) * 100,
      },
      sessions: {
        used: user.sessionsUsed,
        limit: planConfig.sessionsPerMonth,
        remaining: Math.max(0, planConfig.sessionsPerMonth - user.sessionsUsed),
        percentUsed: (user.sessionsUsed / planConfig.sessionsPerMonth) * 100,
      },
    },
    features: planConfig.features,
    currentMonth: user.currentMonth,
    trialDaysRemaining: user.plan === 'free' && user.trialsUsed ? calculateTrialDaysRemaining(user) : 0,
  });
});

// POST /api/upgrade — Upgrade plan (future: integrate with Stripe)
app.post('/api/upgrade', async (req: AuthRequest, res: Response) => {
  const { newPlan } = req.body;
  
  if (!['basic', 'pro', 'enterprise'].includes(newPlan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const users = loadUsers();
  const user = users.find(u => u.userId === req.user!.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // TODO: Integrate with Stripe/Paddle
  // For now, directly upgrade (demo only)
  user.plan = newPlan;
  user.subscriptionStatus = 'active';
  user.voiceMinutesUsed = 0;  // Reset usage on upgrade
  user.chatMessagesUsed = 0;
  user.sessionsUsed = 0;
  
  saveUsers(users);
  
  res.json({
    message: `Upgraded to ${newPlan} plan`,
    user: { plan: user.plan },
  });
});
```

---

### **Frontend Usage Display Components**

```typescript
// src/components/UsageBar.tsx

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  unit?: string;
}

export function UsageBar({ label, used, limit, unit = '' }: UsageBarProps) {
  const percentUsed = (used / limit) * 100;
  const remaining = Math.max(0, limit - used);
  
  // Color indicators
  let barColor = 'bg-green-500';      // < 50% = green
  if (percentUsed >= 50) barColor = 'bg-yellow-500';  // 50-80% = yellow
  if (percentUsed >= 80) barColor = 'bg-red-500';     // > 80% = red

  return (
    <div className="space-y-1 p-3 bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400 text-xs">
          {Math.round(percentUsed)}% used ({used}/{limit}{unit})
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(100, percentUsed)}%` }}
        />
      </div>
      
      <div className="text-xs text-slate-500">
        {remaining}{unit} remaining this month
      </div>
    </div>
  );
}
```

```typescript
// src/components/PlanBanner.tsx

interface PlanBannerProps {
  plan: PlanTier;
  trialDaysRemaining: number;
  onUpgrade: () => void;
}

export function PlanBanner({ plan, trialDaysRemaining, onUpgrade }: PlanBannerProps) {
  if (plan === 'free' && trialDaysRemaining > 0) {
    return (
      <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-orange-200">Free Trial Active</h3>
            <p className="text-sm text-orange-100">
              {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
            </p>
          </div>
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-semibold transition"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  if (plan === 'free') {
    return (
      <div className="bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-500/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-red-200">Free Trial Expired</h3>
            <p className="text-sm text-red-100">Upgrade to continue using InterviewGuru</p>
          </div>
          <button
            onClick={onUpgrade}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition"
          >
            Upgrade
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/50 rounded-lg p-4 mb-4">
      <div className="text-sm text-cyan-100">
        You're on the <span className="font-semibold capitalize">{plan}</span> plan
      </div>
    </div>
  );
}
```

```typescript
// src/hooks/usePlanStatus.ts

import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { PlanTier } from '../lib/planLimits';

interface UsageQuota {
  voiceMinutes: { used: number; limit: number; remaining: number; percentUsed: number };
  chatMessages: { used: number; limit: number; remaining: number; percentUsed: number };
  sessions: { used: number; limit: number; remaining: number; percentUsed: number };
}

interface PlanStatus {
  plan: PlanTier;
  quotas: UsageQuota;
  trialDaysRemaining: number;
  features: Record<string, boolean>;
  loading: boolean;
  error: string | null;
}

export function usePlanStatus(): PlanStatus {
  const { getIdToken } = useAuth();
  const [status, setStatus] = useState<PlanStatus>({
    plan: 'free',
    quotas: {
      voiceMinutes: { used: 0, limit: 10, remaining: 10, percentUsed: 0 },
      chatMessages: { used: 0, limit: 10, remaining: 10, percentUsed: 0 },
      sessions: { used: 0, limit: 1, remaining: 1, percentUsed: 0 },
    },
    trialDaysRemaining: 7,
    features: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPlanStatus = async () => {
      try {
        const token = await getIdToken();
        
        const response = await fetch('/api/usage', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 402) {
          // No remaining quota
          const data = await response.json();
          setStatus(prev => ({ ...prev, error: data.message, loading: false }));
          return;
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        setStatus({
          plan: data.user.plan,
          quotas: data.quotas,
          trialDaysRemaining: data.trialDaysRemaining,
          features: data.features,
          loading: false,
          error: null,
        });
      } catch (err) {
        setStatus(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to load plan status',
          loading: false,
        }));
      }
    };

    fetchPlanStatus();
    
    // Refresh plan status every 60 seconds
    const interval = setInterval(fetchPlanStatus, 60000);
    return () => clearInterval(interval);
  }, [getIdToken]);

  return status;
}
```

---

### **Update API Calls in useAIAssistant & useTabAudioCapture**

```typescript
// src/hooks/useAIAssistant.ts — Update fetch calls

const { getIdToken } = useAuth();

// In analyze function:
const token = await getIdToken();
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,  // ← Add JWT auth
    'x-model': model,
    'x-persona': persona,
  },
  body: JSON.stringify({ question, resume, jd, mode }),
});

if (response.status === 402) {
  const data = await response.json();
  setAppAlert({ type: 'error', message: data.message });
  return;  // Don't process, quota exceeded
}
```

---

### **Implementation Checklist**

- [ ] **Step 1**: Add `@clerk/react` usage hooks to frontend (already imported, just use)
- [ ] **Step 2**: Create `src/lib/planLimits.ts` with plan tier definitions
- [ ] **Step 3**: Create `src/lib/types.ts` with TypeScript interfaces for UserRecord, SessionRecord
- [ ] **Step 4**: Create `server/middleware/authMiddleware.ts` with Clerk JWT verification
- [ ] **Step 5**: Create `server/lib/usageStorage.ts` with file-based persistence (users.json)
- [ ] **Step 6**: Update `server.ts` to apply authMiddleware + quotaMiddleware to all /api routes
- [ ] **Step 7**: Add new `/api/usage` and `/api/upgrade` endpoints to server.ts
- [ ] **Step 8**: Create `src/components/UsageBar.tsx` component
- [ ] **Step 9**: Create `src/components/PlanBanner.tsx` component
- [ ] **Step 10**: Create `src/hooks/usePlanStatus.ts` custom hook
- [ ] **Step 11**: Integrate UsageBar + PlanBanner into `OverlayWidget.tsx`
- [ ] **Step 12**: Update all API calls in `useAIAssistant.ts` + `useTabAudioCapture.ts` to include JWT auth
- [ ] **Step 13**: Test free tier limits (10 min voice, 10 chats, 1 session)
- [ ] **Step 14**: Test plan upgrade flow (from free → basic/pro)
- [ ] **Step 15** (Future): Integrate Stripe/Paddle webhook for payment processing

---

## �🔧 Common Development Scenarios

### **I need to add a new chat response section**

1. **Extend the response interface** in `server.ts`:
```typescript
interface Section {
  title: string;
  content: string;
  points?: string[];
  icon?: string;        // ← Add if needed
}
```

2. **Update prompt template** for answer generation:
```typescript
const prompt = `Generate a structured answer with sections:
- What Is It
- How It Works
- Why It Matters
- [NEW] Common Pitfalls
`;
```

3. **Update UI component** `src/components/SectionCard.tsx`:
```typescript
export function SectionCard({ title, content, points, icon }: SectionCardProps) {
  return (
    <div className="border border-cyan-500 rounded-lg p-4">
      {icon && <span className="text-lg">{icon}</span>}
      <h3 className="font-bold text-cyan-400">{title}</h3>
      <p>{content}</p>
      {points && <ul>{points.map(p => <li key={p}>• {p}</li>)}</ul>}
    </div>
  );
}
```

4. **Test**: Run `npm run electron:dev` and ask a question

### **I need to fix a Whisper hallucination**

1. **Identify the pattern** (e.g., "thank you watching" instead of nothing):
```typescript
// In server.ts hallucination filter
const HALLUCINATION_PATTERNS = [
  "thank you for watching",
  // ← Add new pattern here
  "you",
];
```

2. **Add to filter list**:
```typescript
if (HALLUCINATION_PATTERNS.some(p => cleanedText.toLowerCase().includes(p))) {
  return { text: '' };  // Return empty transcript
}
```

3. **Test with curl**:
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -H "x-api-key: $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"audioBase64": "...", "mimeType": "audio/webm"}'
```

### **I need to change the confidence threshold for cache hits**

1. **Current**: `0.82` in `server.ts`
2. **Impact**: 
   - Lower (0.75) → More cache hits, faster but less accurate
   - Higher (0.90) → Fewer cache hits, slower but more precise
3. **Change**:
```typescript
// In server.ts cache lookup
if (bestMatch && bestScore > 0.82) {  // ← Change this value
  return res.json({ /* cached */ });
}
```
4. **Test**: Run with 10+ similar questions; measure hit rate

---

## 🆘 Troubleshooting Guide

### **Problem: Audio capture not working in Electron**

**Symptoms**: Mic button toggles but no audio recorded

**Debug**:
```typescript
1. DevTools → Console:
   - console.log('Audio tracks:', stream.getAudioTracks().length)
   - Should be > 0
   
2. If 0 tracks:
   - Windows: Check Voi​ceMeeter or loopback device in Settings
   - Try restarting app (IPC issue)
   
3. Check electron/main.cjs:
   - setDisplayMediaRequestHandler properly configured?
   - await desktopCapturer.getSources working?
```

### **Problem: API keeps returning 429 (rate limit)**

**Symptoms**: Green button grayed out, "Rate limited" message

**Solutions**:
1. **Generate cache first**:
   ```bash
   POST /api/generate-cache { jd: "..." }
   ```

2. **Increase debounce**:
   ```typescript
   // In useAIAssistant.ts change 800 to 1500:
   setTimeout(() => analyze(), 1500);  // ← Slower, fewer calls
   ```

3. **Switch to different model**:
   - Settings → AI Model → `llama-3.1-8b-instant` (faster, lower quota)

4. **Check quota**:
   - Visit console.groq.com → API keys → Check rate limits

### **Problem: Chat input not focusing with Ctrl+Shift+Space**

**Symptoms**: Hotkey registered but typing doesn't appear

**Debug**:
```typescript
1. Check DevTools console:
   - Any error messages?
   
2. Verify IPC setup in electron/main.cjs:
   - globalShortcut.register correctly?
   - mainWindow.webContents.send('focus-chat-input') firing?
   
3. In rendered process listener (App.tsx):
   - window.electron?.ipcRenderer.on('focus-chat-input', ...) registered?
   - chatInputRef.current?.focus() working?
   
4. Rebuild:
   - Kill app completely: Ctrl+Q
   - npm run electron:dev again
```

### **Problem: Stealth mode not working (visible on screen share)**

**Symptoms**: Window appears in Zoom/Teams recording

**Debug**:
```typescript
1. Check if setContentProtection enabled:
   - DevTools Console:
   - Can click through? If yes, stealth is OFF
   - Try: Ctrl+Shift+X to toggle
   
2. Check electron/main.cjs:
   - mainWindow.setContentProtection(true) in window setup?
   - win.setIgnoreMouseEvents(true, { forward: true }) working?
   
3. Verify Electron version:
   - package.json: electron version >= 41.0.0?
   - Feature may not work on older versions
```

### **Problem: TTS audio not playing**

**Symptoms**: Answer generated but no voice heard

**Debug**:
```typescript
1. Check if TTS enabled:
   - Settings → "Enable TTS" toggled?
   
2. Check Gemini API key:
   - Settings → verified GEMINI_API_KEY is correct?
   
3. Check device:
   - Select audio device in Settings
   - Test volume isn't muted
   
4. Browser console:
   - Any audio errors in console?
   - audioRef.current.play() throwing error?
   
5. Server logs:
   - Terminal → see "/api/generate-tts" call?
   - Check response from Google GenAI
```

### **Problem: TypeScript errors after editing**

**Symptoms**: `npm run lint` shows errors

**Solutions**:
```bash
1. Check specific file:
   npm run lint  # Shows all errors

2. Fix common issues:
   - Missing type annotation: add `: Type`
   - Incorrect prop type: check interface vs. usage
   - Unused variable: remove or prefix with `_`
   
3. Regenerate cache:
   npm run clean && npm install
   
4. If still broken:
   rm tsconfig.tsbuildinfo  # Reset cache
   npm run lint
```

---

