import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, X, Sparkles, Activity, History, Download,
  EyeOff, Keyboard, MessageSquare, Send, AlertTriangle, CheckCircle,
  Trash2, Loader2, Copy, Volume2, RefreshCw, ChevronRight,
  Zap, Brain, ThumbsUp, ThumbsDown, User
} from 'lucide-react';
import { useTabAudioCapture } from '../hooks/useTabAudioCapture';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Electron IPC
let ipc: any = null;
if (typeof window !== 'undefined') {
  const win = window as any;
  if (win.require) {
    try { ipc = win.require('electron').ipcRenderer; } catch (e) { console.warn('IPC not found', e); }
  }
  if (!ipc && win.electron?.ipcRenderer) ipc = win.electron.ipcRenderer;
  if (!ipc && win.ipcRenderer) ipc = win.ipcRenderer;
}

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Section { title: string; content: string; points?: string[]; }
interface HistoryItem {
  id: string; question: string; answer: string[];
  sections?: Section[]; explanation?: string;
  code?: string; codeLanguage?: string; timestamp: number;
  confidence?: number; type?: string; difficulty?: string;
}

// ── Live Status Ticker ────────────────────────────────────
const STATUS_STEPS = [
  { icon: '🎙', label: 'Listening for speech...', color: '#00FFB3' },
  { icon: '🧠', label: 'Detecting question...', color: '#00C2FF' },
  { icon: '⚡', label: 'Generating answer...', color: '#7A5CFF' },
];

function LiveStatusTicker({ isListening, isProcessing }: { isListening: boolean; isProcessing: boolean }) {
  const [step, setStep] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  const targetStep = isProcessing ? 2 : 0;

  React.useEffect(() => {
    if (step === targetStep) return;
    setVisible(false);
    const t = setTimeout(() => { setStep(targetStep); setVisible(true); }, 260);
    return () => clearTimeout(t);
  }, [targetStep, step]);

  if (!isListening && !isProcessing) return null;
  const s = STATUS_STEPS[step];
  return (
    <div className={cn('live-status-ticker', visible ? 'ticker-visible' : 'ticker-hidden')} style={{ '--status-color': s.color } as any}>
      <span className="status-icon">{s.icon}</span>
      <span className="status-text">{s.label}</span>
      <span className="status-dots"><span /><span /><span /></span>
    </div>
  );
}

// ── Animated Mic ──────────────────────────────────────────
function MicCenterCTA({ isListening, isProcessing, onClick }: {
  isListening: boolean; isProcessing: boolean; onClick: () => void;
}) {
  return (
    <div className="mic-cta-wrap" onClick={onClick}>
      {!isListening && !isProcessing && <div className="mic-idle-ring" />}
      {isListening && (
        <>
          <div className="mic-ring ring-1" />
          <div className="mic-ring ring-2" />
          <div className="mic-ring ring-3" />
        </>
      )}
      {isProcessing && <div className="mic-process-ring" />}
      <button
        className={cn('mic-center-btn', isListening && 'listening', isProcessing && 'processing')}
        title={isListening ? 'Stop listening (Space)' : 'Start listening (Space)'}
      >
        {isProcessing
          ? <Brain size={28} className="animate-pulse" />
          : isListening
            ? <MicOff size={28} />
            : <Mic size={28} />}
      </button>
    </div>
  );
}

// ── Wave Bars (listening indicator) ───────────────────────
function WaveBars({ active }: { active: boolean }) {
  return (
    <div className={cn('wave-bars', active && 'active')}>
      {[...Array(14)].map((_, i) => (
        <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.07}s` }} />
      ))}
    </div>
  );
}

// ── Confidence badge ───────────────────────────────────────
// ── Section icon map ─────────────────────────────────────
const SECTION_ICONS: Record<string, string> = {
  overview: '🧠', summary: '🧠', introduction: '🧠',
  'key points': '📌', points: '📌', highlights: '📌',
  'how it works': '⚙', mechanism: '⚙', process: '⚙', flow: '⚙',
  example: '💻', examples: '💻', 'code example': '💻', demo: '💻',
  explanation: '📖', detail: '📖', details: '📖',
  'trade-offs': '⚖', tradeoffs: '⚖', comparison: '⚖',
  performance: '⚡', complexity: '⚡', 'time complexity': '⚡',
  answer: '💬', conclusion: '🎯', 'best practices': '✅',
};
function sectionIcon(title: string): string {
  const key = title.toLowerCase();
  for (const k of Object.keys(SECTION_ICONS)) if (key.includes(k)) return SECTION_ICONS[k];
  return '▸';
}

// ── Code block ────────────────────────────────────────────
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang">{lang || 'code'}</span>
        <button className="code-copy-btn" onClick={copy}>
          {copied ? <><CheckCircle size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre className="code-pre"><code>{code}</code></pre>
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────
function SectionBlock({ section, isLatest, si }: { section: Section; isLatest: boolean; si: number }) {
  const [open, setOpen] = useState(false);
  const icon = sectionIcon(section.title);
  const hasContent = !!(section.content || (section.points && section.points.length > 0));
  return (
    <div className={cn('msg-section', isLatest ? 'msg-section-latest' : 'msg-section-older')}>
      <button className="msg-section-header" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="msg-section-icon">{icon}</span>
        <span className="msg-section-title">{section.title}</span>
        {hasContent && (
          <span className={cn('msg-section-chevron', open && 'open')}>
            <ChevronRight size={11} />
          </span>
        )}
      </button>
      {/* Conditionally mount — never renders content when closed, no overflow tricks needed */}
      {open && hasContent && (
        <div className="msg-section-body-inner">
          {section.content && <p className="msg-section-content">{section.content}</p>}
          {section.points && section.points.length > 0 && (
            <ul className="msg-section-points">
              {section.points.map((pt, pi) => (
                <li key={pi}><span className="msg-point-dot" /><span>{pt}</span></li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


// ── Typing effect hook ────────────────────────────────────
function useTypingEffect(text: string, speed = 18, active = true) {
  const [displayed, setDisplayed] = useState(active ? '' : text);
  const [done, setDone] = useState(!active);
  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, active]);
  return { displayed, done };
}

// ── ChatMessage (conversational bubble pair) ───────────────
function ChatMessage({
  item, index, onCopy, onRefine, animatedIds, onAnimationDone,
}: {
  item: HistoryItem;
  index: number;
  onCopy: (text: string) => void;
  onRefine?: (type: 'shorter' | 'examples') => void | Promise<void>;
  animatedIds: React.MutableRefObject<Set<string>>;
  onAnimationDone: (id: string) => void;
}) {
  const isLatest = index === 0;
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const sections: Section[] = (item.sections && item.sections.length > 0)
    ? item.sections
    : item.explanation
      ? [{ title: 'Answer', content: item.explanation, points: item.answer }]
      : item.answer?.length > 0
        ? [{ title: 'Answer', content: '', points: item.answer }]
        : [];

  const fullText = sections.map(s =>
    `## ${s.title}\n${s.content}${s.points?.length ? '\n' + s.points.map(p => `• ${p}`).join('\n') : ''}`
  ).join('\n\n') + (item.code ? `\n\n\`\`\`${item.codeLanguage}\n${item.code}\n\`\`\`` : '');

  // Animate only if: this is the newest message AND it has never been animated before.
  // Once done, mark permanently in the shared Set — persists across tab switches.
  const alreadyAnimated = animatedIds.current.has(item.id);
  const shouldAnimate = isLatest && !alreadyAnimated;

  const summaryText = sections[0]?.content || '';
  const { displayed: typedSummary, done: typingDone } = useTypingEffect(
    summaryText, 1, shouldAnimate && summaryText.length > 0
  );

  // When typing finishes on this message, register it permanently
  useEffect(() => {
    if (typingDone && shouldAnimate) {
      onAnimationDone(item.id);
    }
  }, [typingDone, shouldAnimate, item.id, onAnimationDone]);

  const showFull = typingDone || !shouldAnimate; // sections/code visible immediately for old messages
  const pct = item.confidence ? Math.round(item.confidence * 100) : null;

  return (
    <div className="chat-message-pair">
      {/* ── User bubble ── */}
      <div className="user-message">
        <div className="user-bubble">
          <p>{item.question}</p>
        </div>
        <div className="user-avatar"><User size={13} /></div>
      </div>

      {/* ── AI response ── */}
      <div className="ai-message">
        <div className="ai-avatar-wrap">
          <Brain size={13} />
        </div>
        <div className="ai-response-wrap">
          {/* AI header */}
          <div className="ai-response-header">
            <span className="ai-persona-label">🤖 Interview Coach</span>
            <div className="ai-meta-chips">
              {item.type && <span className="ai-chip type">{item.type}</span>}
              {item.difficulty && <span className={cn('ai-chip diff', item.difficulty)}>{item.difficulty}</span>}
              {pct !== null && (
                <span className="ai-chip conf">
                  <Zap size={9} />{pct}%
                </span>
              )}
            </div>
          </div>

          {/* Summary line — typed on first render, static thereafter */}
          {summaryText && (
            <p className="ai-summary">
              {shouldAnimate ? typedSummary : summaryText}
              {shouldAnimate && !typingDone && <span className="typing-cursor">|</span>}
            </p>
          )}

          {/* Sections — appear after typing is done (or immediately for old messages) */}
          {showFull && sections.map((sec, si) =>
            sec.content === summaryText && si === 0 ? null : (
              <SectionBlock key={si} section={sec} isLatest={isLatest} si={si} />
            )
          )}

          {/* Code block */}
          {showFull && item.code && (
            <CodeBlock code={item.code} lang={item.codeLanguage} />
          )}

          {/* Response toolbar */}
          <div className="ai-toolbar">
            <button className="toolbar-btn" onClick={() => onCopy(fullText)} title="Copy">
              <Copy size={11} /> Copy
            </button>
            {onRefine && (
              <>
                <button className="toolbar-btn" onClick={() => onRefine('shorter')} title="Shorter">
                  <RefreshCw size={11} /> Shorter
                </button>
                <button className="toolbar-btn" onClick={() => onRefine('examples')} title="Add examples">
                  <Sparkles size={11} /> Examples
                </button>
              </>
            )}
            <div className="toolbar-sep" />
            <button
              className={cn('toolbar-btn feedback', feedback === 'up' && 'active-up')}
              onClick={() => setFeedback(f => f === 'up' ? null : 'up')}
              title="Good answer"
            >
              <ThumbsUp size={11} />
            </button>
            <button
              className={cn('toolbar-btn feedback', feedback === 'down' && 'active-down')}
              onClick={() => setFeedback(f => f === 'down' ? null : 'down')}
              title="Poor answer"
            >
              <ThumbsDown size={11} />
            </button>
            <span className="ai-timestamp">
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────
export default function OverlayWidget() {
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isTaskbarHidden, setIsTaskbarHidden] = useState(true);
  const [isAntiCaptureOn, setIsAntiCaptureOn] = useState(true);
  const [opacity, setOpacity] = useState(90);
  const [persona, setPersona] = useState('Technical Interviewer');
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hotkeys, setHotkeys] = useState({ toggleHide: 'CommandOrControl+Shift+H', toggleClickThrough: 'CommandOrControl+Shift+X' });
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('');
  const [enableTTS, setEnableTTS] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [voiceModel, setVoiceModel] = useState('whisper-large-v3-turbo');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [activeTab, setActiveTab] = useState<'voice' | 'chat'>('voice');
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ status: string; isError?: boolean } | null>(null);
  const [appAlert, setAppAlert] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [copiedAlert, setCopiedAlert] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const answersEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedQuestionRef = useRef<string | null>(null);
  // Tracks which message IDs have already played their typing animation.
  // Stored in a ref (not state) so it never triggers re-renders,
  // and persists across tab switches since refs outlive conditional DOM.
  const animatedIds = useRef<Set<string>>(new Set());
  const handleAnimationDone = useCallback((id: string) => {
    animatedIds.current.add(id);
  }, []);

  const showAlert = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setAppAlert({ message, type });
    setTimeout(() => setAppAlert(null), 4000);
  }, []);

  const handleResizeDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!ipc) return;
    const startX = e.screenX, startY = e.screenY;
    const initialWidth = window.outerWidth, initialHeight = window.outerHeight;
    const onMove = (ev: MouseEvent) => ipc.send('resize-window', initialWidth + (ev.screenX - startX), initialHeight + (ev.screenY - startY));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const onError = useCallback((msg: string) => showAlert(msg, 'error'), [showAlert]);
  const { detectedQuestion, answer, isProcessing, processTranscript, askQuestion, resetAssistant } = useAIAssistant(undefined, onError);
  const { isListening, isRateLimited, transcript, startListening, stopListening, clearTranscript } = useTabAudioCapture(
    processTranscript,  // stable ref — wires STT text directly into AI question detection
    onError
  );

  const handleChatSubmit = async () => {
    const q = chatInput.trim();
    if (!q || isProcessing) return;
    setChatInput('');
    ipc?.send('chat-input-blurred');
    chatInputRef.current?.blur();
    await askQuestion(q);
  };

  // Hoist toggleListen before useEffects that reference it
  const toggleListen = useCallback(async () => {
    if (isListening) {
      stopListening(); setSessionStartTime(null); ipc?.send('chat-input-blurred');
    } else {
      ipc?.send('chat-input-focused');
      try { await startListening(); setSessionStartTime(Date.now()); } catch (e) { console.error(e); }
      ipc?.send('chat-input-blurred');
    }
  }, [isListening, startListening, stopListening]);

  // Focus chat via IPC
  useEffect(() => {
    if (!ipc) return;
    const handler = () => {
      setActiveTab('chat');
      setTimeout(() => chatInputRef.current?.focus(), 60);
    };
    ipc.on('focus-chat-input', handler);
    return () => ipc.removeListener('focus-chat-input', handler);
  }, []);

  // Space bar shortcut for mic
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        if (activeTab === 'voice') { e.preventDefault(); toggleListen(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsHidden(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, isListening, toggleListen]);

  
  // Push to history + auto-scroll
  useEffect(() => {
    if (detectedQuestion && answer) {
      const questionKey = `${detectedQuestion.question}_${answer.bullets.join('|')}_${answer.explanation?.slice(0, 30)}`;
      if (lastProcessedQuestionRef.current === questionKey) return;
      lastProcessedQuestionRef.current = questionKey;

      const newItem: HistoryItem = {
        id: Math.random().toString(36).substr(2, 9),
        question: detectedQuestion.question,
        answer: answer.bullets,
        sections: (answer as any).sections || [],
        explanation: answer.explanation,
        code: answer.code,
        codeLanguage: answer.codeLanguage,
        timestamp: Date.now(),
        confidence: detectedQuestion.confidence,
        type: detectedQuestion.type,
        difficulty: (answer as any).difficulty,
      };

      setHistory(prev => {
        if (prev.length > 0 && prev[0].question === newItem.question) return prev;
        return [newItem, ...prev].slice(0, 50);
      });
      clearTranscript();
      // Scroll to top of feed (newest item)
      setTimeout(() => answersEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [detectedQuestion, answer, clearTranscript]);

  // Load settings
  useEffect(() => {
    const load = (k: string) => localStorage.getItem(k);
    if (load('groq_api_key')) setApiKey(load('groq_api_key')!);
    if (load('groq_voice_model')) setVoiceModel(load('groq_voice_model')!);
    if (load('groq_model')) setModel(load('groq_model')!);
    if (load('groq_persona')) setPersona(load('groq_persona')!);
    if (load('groq_resume')) setResume(load('groq_resume')!);
    if (load('groq_jd')) setJd(load('groq_jd')!);
    if (load('aura_opacity')) setOpacity(parseInt(load('aura_opacity')!, 10));
    if (load('aura_hotkeys')) setHotkeys(JSON.parse(load('aura_hotkeys')!));
    if (load('aura_output_device')) setSelectedOutputDevice(load('aura_output_device')!);
    setEnableTTS(load('aura_enable_tts') === 'true');

    const savedTaskbar = load('aura_stealth_taskbar');
    const savedAntiCapture = load('aura_stealth_capture');
    if (savedTaskbar !== null) { const v = savedTaskbar === 'true'; setIsTaskbarHidden(v); if (ipc) ipc.send('set-skip-taskbar', v); }
    else if (ipc) ipc.send('set-skip-taskbar', true);
    if (savedAntiCapture !== null) { const v = savedAntiCapture === 'true'; setIsAntiCaptureOn(v); if (ipc) ipc.send('set-stealth-mode', v); }
    else if (ipc) ipc.send('set-stealth-mode', true);
  }, []);

  // Enumerate devices for TTS
  useEffect(() => {
    if (showSettings) navigator.mediaDevices.enumerateDevices().then(d => setAudioDevices(d.filter(x => x.kind === 'audiooutput')));
  }, [showSettings]);

  // Timer
  useEffect(() => {
    if (!sessionStartTime || !isListening) return;
    const iv = setInterval(() => {
      const diff = Math.floor((Date.now() - sessionStartTime) / 1000);
      setElapsedTime(`${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [sessionStartTime, isListening]);

  const saveSettings = () => {
    localStorage.setItem('groq_api_key', apiKey);
    localStorage.setItem('groq_voice_model', voiceModel);
    localStorage.setItem('groq_model', model);
    localStorage.setItem('groq_persona', persona);
    localStorage.setItem('groq_resume', resume);
    localStorage.setItem('groq_jd', jd);
    localStorage.setItem('aura_opacity', opacity.toString());
    localStorage.setItem('aura_hotkeys', JSON.stringify(hotkeys));
    localStorage.setItem('aura_output_device', selectedOutputDevice);
    localStorage.setItem('aura_enable_tts', enableTTS.toString());
    if (ipc) ipc.send('update-hotkeys', hotkeys);
    setShowSettings(false);
    showAlert('Settings saved!', 'success');
  };

  const handleClear = () => { clearTranscript(); resetAssistant(); setHistory([]); };

  const generateCache = async () => {
    if (!jd || jd.length < 50) return showAlert('Please enter a sufficiently long Job Description first.', 'error');
    setIsGenerating(true); setGenerateResult(null);
    try {
      const res = await fetch('/api/generate-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ jd, resume })
      });
      const data = await res.json();
      setGenerateResult({ status: data.status, isError: !res.ok });
    } catch (e) {
      setGenerateResult({ status: 'Failed to start generation pipeline.', isError: true });
    } finally { setIsGenerating(false); }
  };

  const handleAIHelp = async () => {
    if (!transcript.trim() || isProcessing) return;
    await askQuestion(transcript);
  };

  const toggleTaskbarHidden = () => { const v = !isTaskbarHidden; setIsTaskbarHidden(v); localStorage.setItem('aura_stealth_taskbar', v.toString()); if (ipc) ipc.send('set-skip-taskbar', v); };
  const toggleAntiCapture = () => { const v = !isAntiCaptureOn; setIsAntiCaptureOn(v); localStorage.setItem('aura_stealth_capture', v.toString()); if (ipc) ipc.send('set-stealth-mode', v); };

  const exportHistory = () => {
    const text = history.map(item => `Q: ${item.question}\nA: ${item.answer.join('\n')}\n[${new Date(item.timestamp).toLocaleTimeString()}]\n${'─'.repeat(30)}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `InterviewGuru_Session_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAlert(true);
    setTimeout(() => setCopiedAlert(false), 2000);
  };

  const handleRefine = async (type: 'shorter' | 'examples') => {
    if (!history[0] || isProcessing) return;
    const refinedQ = type === 'shorter'
      ? `Give a much shorter, concise answer to: ${history[0].question}`
      : `Give the same answer but with more concrete code examples for: ${history[0].question}`;
    await askQuestion(refinedQ);
  };

  // ── RENDER ─────────────────────────────────────────────
  if (isHidden) {
    return (
      <button
        onClick={() => setIsHidden(false)}
        className="w-12 h-12 rounded-full bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,179,0.3)] hover:scale-110 transition-transform"
        title="Show InterviewGuru"
      >
        <img src="/icon.png" alt="InterviewGuru" className="w-8 h-8 object-contain" />
      </button>
    );
  }

  return (
    <div
      className="ig-root flex flex-col font-sans relative pointer-events-auto h-full w-full overflow-hidden"
      style={{ opacity: opacity / 100 }}
    >
      {/* ── Toast ──────────────────────────────────────── */}
      {appAlert && (
        <div className="toast-wrap">
          <div className={cn('toast', appAlert.type)}>
            {appAlert.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
            <span>{appAlert.message}</span>
            <button onClick={() => setAppAlert(null)}><X size={12} /></button>
          </div>
        </div>
      )}

      {/* Copied flash */}
      {copiedAlert && (
        <div className="toast-wrap">
          <div className="toast success"><CheckCircle size={14} /> Copied to clipboard</div>
        </div>
      )}

      {/* ── Top Bar ────────────────────────────────────── */}
      <div className="ig-topbar" style={{ WebkitAppRegion: 'drag' } as any}>
        {/* Brand */}
        <div className="ig-brand no-drag">
          <div className="ig-logo-wrap">
            <img src="/icon.png" alt="IG" className="w-full h-full object-contain" />
          </div>
          <div className="ig-brand-text">
            <span className="ig-brand-name">InterviewGuru</span>
            <span className={cn('ig-mode-pill', activeTab === 'voice' ? 'voice' : 'chat', isListening && activeTab === 'voice' && 'live')}>
              {activeTab === 'voice'
                ? <><span className={cn('mode-dot', isListening && 'live')} />{isListening ? 'Recording Live' : 'Voice Mode'}</>
                : <><MessageSquare size={8} />Chat · {persona.split(' ')[0]}</>}
            </span>
          </div>
        </div>

        {/* Center controls */}
        <div className="ig-controls no-drag">
          <button
            onClick={handleAIHelp}
            disabled={!isListening || isProcessing}
            className={cn('ctrl-btn ai-help', isProcessing && 'processing', isListening && !isProcessing && 'ready')}
            title="Analyze current transcript (Voice mode must be active)"
          >
            <Sparkles size={12} className={isProcessing ? 'animate-spin' : ''} />
            <span>AI Help</span>
          </button>

          <div className="tab-switcher">
            <button
              onClick={() => setActiveTab('voice')}
              className={cn('tab-btn', activeTab === 'voice' && 'active-tab')}
            >
              <Mic size={11} /> Voice
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={cn('tab-btn', activeTab === 'chat' && 'active-tab')}
            >
              <MessageSquare size={11} /> Chat
            </button>
          </div>
        </div>

        {/* Right controls */}
        <div className="ig-right-controls no-drag">
          {isListening && (
            <div className="session-timer">
              <span className="timer-dot" />
              <span className="timer-text">{elapsedTime}</span>
            </div>
          )}

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn('icon-btn', showHistory && 'active')}
            title="Session History"
          >
            <History size={13} />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn('icon-btn', showSettings && 'active')}
            title="Settings"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Mic toggle */}
          <button
            onClick={toggleListen}
            className={cn('mic-toggle-btn', isListening ? 'mic-on' : 'mic-off')}
            title={isListening ? 'Stop Capturing' : 'Start Capturing'}
          >
            {isListening ? <MicOff size={13} /> : <Mic size={13} />}
          </button>

          {ipc && (
            <button
              onClick={() => { if (ipc) { ipc.send('QUIT_NOW'); ipc.send('close-app'); } window.close(); }}
              className="icon-btn close-btn"
              title="Close"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* ── Content area ───────────────────────────────── */}
      <div className="ig-content">

        {/* ── History Overlay ── */}
        {showHistory && (
          <div className="overlay-panel">
            <div className="overlay-header">
              <h2 className="overlay-title"><History size={14} /> Session History</h2>
              <div className="flex gap-2">
                <button onClick={() => setHistory([])} className="danger-sm">Clear All</button>
                <button onClick={exportHistory} className="icon-btn"><Download size={13} /></button>
                <button onClick={() => setShowHistory(false)} className="icon-btn"><X size={13} /></button>
              </div>
            </div>
            <div className="overlay-body">
              {history.length === 0 ? (
                <div className="empty-center">
                  <History size={28} className="mb-2 text-white/20" />
                  <p>No history yet</p>
                </div>
              ) : (
                <div className="history-list">
                  {history.map((item, i) => (
                    <div key={item.id} className="history-item">
                      <div className="history-time">{new Date(item.timestamp).toLocaleTimeString()}</div>
                      <div className="history-q">{item.question}</div>
                      <div className="history-bullets">
                        {item.answer.slice(0, 3).map((b, bi) => <div key={bi}>• {b}</div>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Settings Overlay ── */}
        {showSettings && (
          <div className="overlay-panel">
            <div className="overlay-header">
              <h2 className="overlay-title">⚙ Configuration</h2>
              <button onClick={() => setShowSettings(false)} className="icon-btn"><X size={13} /></button>
            </div>
            <div className="overlay-body settings-body">
              <div className="setting-group">
                <label className="setting-label">Groq API Key</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="gsk_..." className="setting-input" />
              </div>

              <div className="setting-group">
                <label className="setting-label">Meeting Persona</label>
                <select value={persona} onChange={e => setPersona(e.target.value)} className="setting-input">
                  <option>Technical Interviewer</option>
                  <option>Executive Assistant</option>
                  <option>Language Translator</option>
                </select>
              </div>

              <div className="setting-group">
                <label className="setting-label">Your Resume (Context)</label>
                <textarea value={resume} onChange={e => setResume(e.target.value)} placeholder="Paste your resume text here..." className="setting-input textarea-sm" />
              </div>

              <div className="setting-group">
                <label className="setting-label">Job Description (JD)</label>
                <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the job description..." className="setting-input textarea-sm" />
                <div className="flex justify-end mt-1">
                  <button onClick={generateCache} disabled={isGenerating || !jd || jd.length < 50} className={cn('cache-btn', isGenerating && 'disabled')}>
                    {isGenerating
                      ? <><Loader2 size={11} className="animate-spin" /> Generating Cache...</>
                      : <>⚡ Generate Interview Cache</>}
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <div className="flex justify-between items-center">
                  <label className="setting-label">Opacity</label>
                  <span className="text-[10px] text-cyan-400 font-mono">{opacity}%</span>
                </div>
                <input type="range" min="10" max="100" value={opacity} onChange={e => setOpacity(parseInt(e.target.value))} className="range-input" />
              </div>

              <div className="stealth-group">
                <label className="setting-label"><EyeOff size={12} /> Stealth Controls</label>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-white">Hide from Taskbar</span>
                  <button onClick={toggleTaskbarHidden} className={cn('toggle-switch', isTaskbarHidden && 'on')}><div className="toggle-thumb" /></button>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-white">Anti-Screenshare Shield</span>
                  <button onClick={toggleAntiCapture} className={cn('toggle-switch', isAntiCaptureOn && 'on')}><div className="toggle-thumb" /></button>
                </div>
              </div>

              <div className="setting-group">
                <label className="setting-label">Intelligence Model</label>
                <select value={model} onChange={e => setModel(e.target.value)} className="setting-input">
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Recommended)</option>
                  <option value="llama-3.1-8b-instant">Llama 3.1 8B (Super Fast)</option>
                  <option value="deepseek-r1-distill-llama-70b">DeepSeek R1 Distill 70B</option>
                </select>
              </div>

              <div className="setting-group">
                <label className="setting-label">Voice Model (STT)</label>
                <select value={voiceModel} onChange={e => setVoiceModel(e.target.value)} className="setting-input">
                  <option value="whisper-large-v3-turbo">Whisper Large V3 Turbo (Recommended)</option>
                  <option value="whisper-large-v3">Whisper Large V3</option>
                  <option value="distil-whisper-large-v3-en">Distil Whisper V3 (English Only)</option>
                </select>
              </div>

              <div className="setting-group">
                <div className="flex justify-between items-center">
                  <label className="setting-label">TTS Audio Output</label>
                  <button onClick={() => setEnableTTS(!enableTTS)} className={cn('toggle-switch', enableTTS && 'on')}><div className="toggle-thumb" /></button>
                </div>
                {enableTTS && (
                  <select value={selectedOutputDevice} onChange={e => setSelectedOutputDevice(e.target.value)} className="setting-input mt-2">
                    <option value="">Default Output</option>
                    {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Device ${d.deviceId.slice(0, 6)}`}</option>)}
                  </select>
                )}
              </div>

              <button onClick={saveSettings} className="save-btn">Save Changes</button>

              {/* Cache loading overlay */}
              {isGenerating && (
                <div className="cache-overlay">
                  <div className="cache-spinner" />
                  <h3>Generating Interview Cache</h3>
                  <p>Preparing 35 likely questions from your JD...</p>
                </div>
              )}
              {generateResult && !isGenerating && (
                <div className="cache-overlay">
                  <div className={cn('cache-result-icon', generateResult.isError ? 'error' : 'success')}>
                    {generateResult.isError ? <X size={22} /> : <Sparkles size={22} />}
                  </div>
                  <h3>{generateResult.isError ? 'Cache Failed' : 'Cache Ready ⚡'}</h3>
                  <p>{generateResult.status}</p>
                  <button onClick={() => setGenerateResult(null)} className="save-btn mt-4">Continue</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VOICE TAB ──────────────────────────────── */}
        {!showSettings && !showHistory && activeTab === 'voice' && (
          <div className="voice-tab">
            {/* Transcript panel */}
            <div className="transcript-panel">
              <div className="transcript-header">
                <div className="flex items-center gap-2">
                  {isListening
                    ? <><span className="live-dot" /> <span className="transcript-label live">Recording</span></>
                    : <><Activity size={11} className="text-white/20" /> <span className="transcript-label">Transcript</span></>}
                  {isRateLimited && <span className="rate-limit-badge">⚠ Rate limited</span>}
                </div>
                <button onClick={handleClear} className="clear-btn"><Trash2 size={11} /> Clear</button>
              </div>
              <div className="transcript-body">
                {transcript
                  ? (
                    <div className="transcript-with-label">
                      <span className="transcript-speaker">Interviewer:</span>
                      <span className="transcript-text">“{transcript}”</span>
                    </div>
                  )
                  : (
                    <div className="transcript-placeholder">
                      <Activity size={13} className={cn(isListening && 'text-cyan-400/70 animate-pulse')} />
                      <span>{isListening ? 'Audio captured — waiting for a question...' : 'Transcript appears here once mic is active'}</span>
                    </div>
                  )}
              </div>
            </div>

            {/* Main voice area */}
            <div className="voice-main">
              {!isListening && history.length === 0 && !isProcessing && (
                <div className="voice-empty-state">
                  <MicCenterCTA isListening={isListening} isProcessing={isProcessing} onClick={toggleListen} />
                  <h3 className="empty-heading">Start Your Interview Assistant</h3>
                  <p className="empty-sub">Click the mic or press <kbd>Space</kbd> — questions are detected automatically</p>

                  <div className="demo-hint-chip">
                    <span className="demo-hint-dot" />
                    <span>Try saying: <em>“Explain the difference between REST and GraphQL”</em></span>
                  </div>

                  <div className="empty-hints">
                    <div className="hint-row"><Mic size={12} className="text-cyan-400" /> Captures system audio from Zoom / Teams / Meet</div>
                    <div className="hint-row"><Brain size={12} className="text-purple-400" /> Auto-detects questions — no manual trigger needed</div>
                    <div className="hint-row"><Sparkles size={12} className="text-emerald-400" /> Structured answers in &lt;2 seconds</div>
                  </div>

                  <div className="output-preview">
                    <div className="output-preview-header">
                      <Brain size={11} className="text-cyan-400" />
                      <span>Example AI Output</span>
                    </div>
                    <div className="output-preview-body">
                      <div className="output-preview-row section">📌 Key Points</div>
                      <div className="output-preview-row">• Concept explained clearly with context</div>
                      <div className="output-preview-row">• Real-world trade-offs and use cases</div>
                      <div className="output-preview-row code">{'{ '} Working code snippet {'}'}</div>
                    </div>
                  </div>

                  <div className="kb-hint">
                    <Keyboard size={11} /> <kbd>Space</kbd> start/stop  ·  <kbd>Ctrl+Shift+Space</kbd> chat
                  </div>
                </div>
              )}

              {/* Listening idle (no answer yet) */}
              {isListening && history.length === 0 && !isProcessing && (
                <div className="listening-state">
                  <MicCenterCTA isListening={isListening} isProcessing={isProcessing} onClick={toggleListen} />
                  <LiveStatusTicker isListening={isListening} isProcessing={isProcessing} />
                  <WaveBars active={isListening} />
                  <p className="listening-label">Listening Mode Active</p>
                  <p className="listening-sub">Ask a technical question — I’ll detect and answer automatically</p>
                  <div className="listening-tips">
                    <span>Try: “How does async/await work?”</span>
                    <span>·</span>
                    <span>“Design a rate limiter”</span>
                  </div>
                </div>
              )}

              {/* Processing state */}
              {isProcessing && history.length === 0 && (
                <div className="processing-state">
                  <div className="thinking-orb">
                    <Brain size={32} className="animate-pulse text-cyan-400" />
                    <div className="thinking-ring" />
                    <div className="thinking-ring ring-2" />
                  </div>
                  <LiveStatusTicker isListening={isListening} isProcessing={isProcessing} />
                  <p className="thinking-label">Generating Answer</p>
                  <p className="thinking-sub">Running 4-step AI pipeline · Self-verifying for accuracy</p>
                </div>
              )}

              {/* Answers */}
              {history.length > 0 && (
                <div className="answers-feed">
                  {/* Inline processing on top */}
                  {isProcessing && (
                    <div className="ai-typing-indicator">
                      <div className="ai-avatar-wrap"><Brain size={13} /></div>
                      <div className="typing-bubble">
                        <span className="ai-persona-label">🤖 Interview Coach</span>
                        <div className="typing-dots"><span /><span /><span /></div>
                      </div>
                    </div>
                  )}
                  {[...history].reverse().map((item, i) => (
                    <ChatMessage
                      key={item.id}
                      item={item}
                      index={history.length - 1 - i}
                      onCopy={copyText}
                      onRefine={history.length - 1 - i === 0 ? handleRefine : undefined}
                      animatedIds={animatedIds}
                      onAnimationDone={handleAnimationDone}
                    />
                  ))}
                  <div ref={answersEndRef} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CHAT TAB ───────────────────────────────── */}
        {!showSettings && !showHistory && activeTab === 'chat' && (
          <div className="chat-tab">
            {/* Message feed */}
            <div className="chat-feed">
              {/* AI typing indicator */}
              {isProcessing && (
                <div className="ai-typing-indicator">
                  <div className="ai-avatar-wrap"><Brain size={13} /></div>
                  <div className="typing-bubble">
                    <span className="ai-persona-label">🤖 Interview Coach</span>
                    <div className="typing-dots"><span /><span /><span /></div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {history.length === 0 && !isProcessing && (
                <div className="chat-empty-state">
                  <div className="chat-empty-icon">
                    <Brain size={32} className="text-cyan-400/30" />
                  </div>
                  <h3 className="empty-heading">Interview Coach</h3>
                  <p className="empty-sub">Ask any interview question and get a structured, expert answer with examples and code.</p>
                  <div className="chat-suggestion-chips">
                    {['Explain virtual DOM', 'What is Big-O notation?', 'Design a URL shortener', 'Tell me about yourself'].map(q => (
                      <button key={q} className="suggestion-chip" onClick={() => { setChatInput(q); chatInputRef.current?.focus(); }}>
                        {q}
                      </button>
                    ))}
                  </div>
                  <div className="kb-hint"><Keyboard size={11} /> <kbd>Enter</kbd> to send</div>
                </div>
              )}

              {/* Message pairs */}
              {[...history].reverse().map((item, i) => (
                <ChatMessage
                  key={item.id}
                  item={item}
                  index={history.length - 1 - i}
                  onCopy={copyText}
                  onRefine={history.length - 1 - i === 0 ? handleRefine : undefined}
                  animatedIds={animatedIds}
                  onAnimationDone={handleAnimationDone}
                />
              ))}
              <div ref={answersEndRef} />
            </div>

            {/* Chat input — sticky elevated bar */}
            <div className="chat-input-wrap">
              {/* Quick actions */}
              <div className="quick-actions">
                {[['⚡ Short', 'shorter'], ['💡 Example', 'examples'], ['🎯 Simpler', 'simpler']].map(([label, type]) => (
                  <button
                    key={type}
                    className="quick-action-btn"
                    onClick={() => {
                      if (!history[0] || isProcessing) return;
                      const q = type === 'simpler'
                        ? `Explain this more simply: ${history[0].question}`
                        : null;
                      if (q) askQuestion(q);
                      else handleRefine(type as 'shorter' | 'examples');
                    }}
                    disabled={history.length === 0 || isProcessing}
                    title={`Request ${label} version`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="chat-input-box">
                <textarea
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onFocus={() => ipc?.send('chat-input-focused')}
                  onBlur={() => ipc?.send('chat-input-blurred')}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); }
                    if (e.key === 'Escape') { ipc?.send('chat-input-blurred'); chatInputRef.current?.blur(); }
                  }}
                  placeholder="💬 Ask any interview question..."
                  rows={1}
                  className="chat-textarea"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isProcessing}
                  className={cn('send-btn', chatInput.trim() && !isProcessing && 'ready')}
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <div className="chat-meta-row">
                <span className="chat-persona-tag">🎭 {persona}</span>
                <span className="chat-kb-hint"><Keyboard size={9} /> Enter = Send · Shift+Enter = Newline</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Resize handle (Electron only) ─────────────────── */}
      {ipc && (
        <div onMouseDown={handleResizeDrag} className="resize-handle" title="Drag to resize">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15L15 21M21 8L8 21" />
          </svg>
        </div>
      )}
    </div>
  );
}
