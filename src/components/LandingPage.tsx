import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react';
import './LandingPage.css';

// ── Interactive Demo Data ──────────────────────────────────────────────────
const DEMO_STEPS = [
  {
    role: 'interviewer' as const,
    text: 'Can you explain how QuickSort works and its time complexity?',
    delay: 0,
  },
  {
    role: 'ai' as const,
    text: '⚡ Detected: Coding / Medium',
    delay: 1200,
    tag: true,
  },
  {
    role: 'ai' as const,
    text: '• QuickSort uses divide-and-conquer with a pivot O(n log n) avg\n• Worst case O(n²) when pivot is always min/max — mitigated by random pivot\n• In-place: O(log n) stack space, cache-friendly\n• Prefer over MergeSort when memory is constrained',
    delay: 2200,
    bullets: true,
  },
  {
    role: 'ai' as const,
    text: '"QuickSort recursively partitions around a pivot, achieving O(n log n) average. I\'d use random pivot selection in production to avoid worst-case."',
    delay: 3600,
    spoken: true,
  },
];

function InteractiveDemo() {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const runDemo = () => {
    if (running) return;
    setRunning(true);
    setVisibleSteps([]);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    DEMO_STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setVisibleSteps(prev => [...prev, i]);
        if (i === DEMO_STEPS.length - 1) {
          setTimeout(() => setRunning(false), 3000);
        }
      }, step.delay);
      timersRef.current.push(t);
    });
  };

  useEffect(() => {
    const t = setTimeout(runDemo, 600);
    return () => {
      clearTimeout(t);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="demo-shell">
      <div className="demo-topbar">
        <span className="demo-dot red" />
        <span className="demo-dot yellow" />
        <span className="demo-dot green" />
        <span className="demo-title">InterviewGuru — Live Session</span>
        <span className={`demo-recording ${running ? 'active' : ''}`}>
          {running ? '● REC' : '● IDLE'}
        </span>
      </div>
      <div className="demo-body">
        {DEMO_STEPS.map((step, i) => {
          const visible = visibleSteps.includes(i);
          return (
            <div
              key={i}
              className={`demo-message ${step.role} ${visible ? 'visible' : ''} ${step.tag ? 'tag' : ''} ${step.bullets ? 'bullets' : ''} ${step.spoken ? 'spoken' : ''}`}
            >
              {step.role === 'interviewer' && (
                <div className="demo-avatar interviewer-avatar">I</div>
              )}
              {step.role === 'ai' && !step.tag && (
                <div className="demo-avatar ai-avatar">AI</div>
              )}
              <div className="demo-bubble">
                {step.tag ? (
                  <span className="demo-tag">{step.text}</span>
                ) : step.bullets ? (
                  <ul className="demo-bullets">
                    {step.text.split('\n').map((b, bi) => (
                      <li key={bi}>{b.replace('• ', '')}</li>
                    ))}
                  </ul>
                ) : step.spoken ? (
                  <p className="demo-spoken">{step.text}</p>
                ) : (
                  <p>{step.text}</p>
                )}
              </div>
            </div>
          );
        })}
        {running && visibleSteps.length > 0 && visibleSteps.length < DEMO_STEPS.length && (
          <div className="demo-typing">
            <span /><span /><span />
          </div>
        )}
      </div>
      <div className="demo-footer">
        <button className="demo-replay" onClick={runDemo} disabled={running}>
          {running ? '▶ Running...' : '↺ Replay Demo'}
        </button>
        <span className="demo-latency">Avg response: &lt;2s</span>
      </div>
    </div>
  );
}

// ── Cursor Glow ─────────────────────────────────────────────────────────────
function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (glowRef.current) {
        glowRef.current.style.left = `${e.clientX}px`;
        glowRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);
  return <div ref={glowRef} className="cursor-glow" />;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (this: HTMLAnchorElement, e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (href) {
          const target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setMobileMenuOpen(false);
      });
    });

    // Scroll reveal
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('revealed');
          }
        });
      },
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      <CursorGlow />

      {/* ── Sticky Top CTA Bar (appears after hero) ─────────────────── */}
      <div className={`sticky-cta-bar ${scrolled ? 'visible' : ''}`}>
        <span className="sticky-cta-text">🚀 Start cracking interviews for free</span>
        <Show when="signed-out">
          <SignUpButton mode="modal" forceRedirectUrl="/">
            <button className="sticky-cta-btn">Get Started Free</button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <button className="sticky-cta-btn" onClick={() => navigate('/app')}>Launch App</button>
        </Show>
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`} style={{ WebkitAppRegion: 'drag' } as any}>
        <nav className="container relative flex justify-between items-center w-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="logo">InterviewGuru</div>

          {/* Desktop Nav */}
          <ul className="nav-links hidden md:flex items-center m-0 p-0">
            <li><a href="#features">Features</a></li>
            <li><a href="#demo">Demo</a></li>
            <li><a href="#modes">Modes</a></li>
            <li><a href="#tech">Tech Stack</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="https://github.com/adityanshinde/Parakeet-AI-Clone" target="_blank" rel="noreferrer">GitHub</a></li>
          </ul>

          <div className="flex items-center gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal" forceRedirectUrl="/">
                <button className="nav-btn-outline cursor-pointer">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/">
                <button className="nav-cta-button cursor-pointer">Get Started Free</button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <button onClick={() => navigate('/app')} className="nav-cta-button cursor-pointer">Launch App →</button>
              <div className="flex items-center ml-1 border border-white/10 rounded-full p-1 bg-black/50">
                <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
              </div>
            </Show>

            {/* Mobile hamburger */}
            <button
              className="md:hidden mobile-menu-btn"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`} />
            </button>
          </div>
        </nav>

        {/* Mobile Drawer */}
        <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#demo" onClick={() => setMobileMenuOpen(false)}>Demo</a>
          <a href="#modes" onClick={() => setMobileMenuOpen(false)}>Modes</a>
          <a href="#tech" onClick={() => setMobileMenuOpen(false)}>Tech Stack</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="https://github.com/adityanshinde/Parakeet-AI-Clone" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="hero" id="hero">
        <div className="hero-inner">
          {/* Left: copy */}
          <div className="hero-text">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              AI-Powered · Stealth · Real-time
            </div>

            <h1>
              Crack Your Next<br />
              <span className="gradient-text">Interview</span> with AI
            </h1>

            <p className="hero-sub">
              InterviewGuru listens to your interview, detects questions instantly, and feeds you
              structured answers — all invisible during screen share.
            </p>

            {/* Trust signals */}
            <div className="trust-strip">
              <div className="trust-item">
                <span className="trust-num">5,000+</span>
                <span className="trust-label">Developers</span>
              </div>
              <div className="trust-sep" />
              <div className="trust-item">
                <span className="trust-num">1,200+</span>
                <span className="trust-label">Interviews cracked</span>
              </div>
              <div className="trust-sep" />
              <div className="trust-item">
                <span className="trust-num">&lt;2s</span>
                <span className="trust-label">Avg response</span>
              </div>
            </div>

            <div className="hero-buttons">
              <Show when="signed-out">
                <SignUpButton mode="modal" forceRedirectUrl="/">
                  <button className="btn btn-primary btn-glow cursor-pointer">
                    🚀 Get Started Free
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <button className="btn btn-primary btn-glow cursor-pointer" onClick={() => navigate('/app')}>
                  🚀 Launch App
                </button>
              </Show>
              <a href="#demo" className="btn btn-secondary">
                ▶ Watch Live Demo
              </a>
            </div>

            <p className="hero-guarantee">
              ✔ No credit card required &nbsp;&nbsp; ✔ Free Groq API included &nbsp;&nbsp; ✔ Cancel anytime
            </p>
          </div>

          {/* Right: product preview */}
          <div className="hero-visual">
            <div className="hero-visual-glow" />
            <InteractiveDemo />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="scroll-hint">
          <div className="scroll-mouse"><div className="scroll-wheel" /></div>
        </div>
      </section>

      {/* ── Interactive Demo Section ─────────────────────────────────── */}
      <section className="demo-section" id="demo">
        <div className="container">
          <div className="section-label reveal">Live Demo</div>
          <h2 className="section-title reveal">
            See It <span className="highlight">In Action</span>
          </h2>
          <p className="section-sub reveal">
            Watch InterviewGuru answer a real coding question in under 2 seconds — exactly how it works in your next interview.
          </p>
          <div className="demo-full-wrap reveal">
            <InteractiveDemo />
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-label reveal">Core Features</div>
          <h2 className="section-title reveal">
            Powerful <span className="highlight">Features</span>
          </h2>
          <p className="section-sub reveal">
            Everything you need to dominate interviews — powered by state-of-the-art AI
          </p>
          <div className="features-grid">
            {[
              { icon: '🎙️', title: 'Voice Mode', tag: 'Real-time', desc: 'Ultra-fast Whisper STT. Smart question detection. STAR-method talking points in under 2 seconds.' },
              { icon: '💬', title: 'Chat Mode', tag: 'Deep Prep', desc: 'Type any question. Get deeply structured answers with prose, key points, and working code.' },
              { icon: '🕵️', title: 'Stealth Mode', tag: 'Invisible', desc: 'Zero visibility on Zoom, Teams, OBS. Click-through cursor. Keyboard-only operation.' },
              { icon: '🧠', title: 'Personalized', tag: 'Context-aware', desc: 'Upload your resume + JD. Every answer is tailored to your specific stack and target role.' },
              { icon: '⚡', title: 'Lightning Fast', tag: '<2s', desc: '~100ms classification. 2-3s structured answers. Vector cache for instant repeat questions.' },
              { icon: '🔒', title: 'Private & Secure', tag: 'Zero-log', desc: 'API keys in localStorage. No audio stored. Resume/JD never persisted on servers.' },
            ].map((f, i) => (
              <div key={i} className="feature-card reveal" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="feature-card-top">
                  <div className="feature-icon-wrap">
                    <span className="feature-icon">{f.icon}</span>
                  </div>
                  <span className="feature-tag">{f.tag}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="feature-card-shine" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modes ────────────────────────────────────────────────────── */}
      <section className="modes" id="modes">
        <div className="modes-container">
          <div className="section-label reveal">Two Modes</div>
          <h2 className="section-title reveal">
            Two Powerful <span className="highlight">Modes</span>
          </h2>
          <p className="section-sub reveal">Pick the right mode for your moment</p>

          <div className="modes-grid">
            {/* Voice Mode */}
            <div className="mode-card reveal">
              <div className="mode-card-header">
                <div className="mode-icon-wrap">🎤</div>
                <div>
                  <h3>Voice Mode</h3>
                  <p className="mode-use-case">Best for live interviews</p>
                </div>
                <span className="mode-badge live">● LIVE</span>
              </div>
              <div className="mode-chips">
                {['Ultra-fast STT', 'Smart Detection', 'STAR Bullets', 'Big-O Aware', 'Spoken Answer', 'Hallucination Filter'].map(chip => (
                  <span key={chip} className="mode-chip">{chip}</span>
                ))}
              </div>
              <div className="mode-features">
                {[
                  { title: 'Ultra-Fast Transcription', desc: 'Groq Whisper-large-v3-turbo with near-zero latency' },
                  { title: 'Smart Question Detection', desc: 'Heuristic pre-filter + LLM confidence scoring' },
                  { title: 'STAR-Method Bullets', desc: 'Situation → Action → Result formatted talking points' },
                  { title: 'Big-O Complexity', desc: 'Technical bullets with algorithm complexity notation' },
                ].map((f, i) => (
                  <div key={i} className="mode-feature">
                    <span className="mode-feature-dot" />
                    <div>
                      <h4>{f.title}</h4>
                      <p>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="modes-divider reveal">
              <div className="divider-line" />
              <span className="divider-or">OR</span>
              <div className="divider-line" />
            </div>

            {/* Chat Mode */}
            <div className="mode-card reveal">
              <div className="mode-card-header">
                <div className="mode-icon-wrap chat">💬</div>
                <div>
                  <h3>Chat Mode</h3>
                  <p className="mode-use-case">Best for preparation & deep learning</p>
                </div>
                <span className="mode-badge prep">PREP</span>
              </div>
              <div className="mode-chips">
                {['4-Step Pipeline', 'Difficulty Classifier', 'Self-Verification', 'Code Blocks', 'Key Takeaways', 'Personas'].map(chip => (
                  <span key={chip} className="mode-chip chat-chip">{chip}</span>
                ))}
              </div>
              <div className="mode-features">
                {[
                  { title: 'Difficulty Classification', desc: 'Auto-routes to optimal prompt style and depth' },
                  { title: 'Structured Section Cards', desc: 'Titled sections, not walls of text — easy to scan' },
                  { title: 'Complete Code Blocks', desc: 'Syntax-highlighted, runnable, with edge cases handled' },
                  { title: 'Self-Verification', desc: 'Second LLM checks hard answers for Big-O errors & facts' },
                ].map((f, i) => (
                  <div key={i} className="mode-feature">
                    <span className="mode-feature-dot chat-dot" />
                    <div>
                      <h4>{f.title}</h4>
                      <p>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tech Stack ───────────────────────────────────────────────── */}
      <section className="tech-stack" id="tech">
        <div className="container">
          <div className="section-label reveal">Under the Hood</div>
          <h2 className="section-title reveal">
            Built with Modern <span className="highlight">Tech</span>
          </h2>
          <p className="section-sub reveal">Production-grade stack, zero compromise</p>

          <div className="tech-grid">
            {[
              { icon: '🧩', category: 'Frontend', name: 'React 19', sub: 'Tailwind v4 · Motion · Lucide' },
              { icon: '⚙️', category: 'Backend', name: 'Node.js + Express', sub: 'TypeScript · Vite 6' },
              { icon: '🖥️', category: 'Desktop', name: 'Electron 41', sub: 'WASAPI Loopback · Content Protection' },
              { icon: '🎙️', category: 'STT', name: 'Groq Whisper', sub: 'whisper-large-v3-turbo' },
              { icon: '🤖', category: 'LLM', name: 'Llama 3.3 70B', sub: 'llama-3.1-8b-instant · 4-step pipeline' },
              { icon: '🔊', category: 'TTS', name: 'Google GenAI', sub: 'gemini-2.5-flash-preview-tts' },
              { icon: '📐', category: 'Embeddings', name: 'all-MiniLM-L6-v2', sub: 'Xenova · Vector cache · <10ms hits' },
              { icon: '🔐', category: 'Auth', name: 'Clerk', sub: 'React · Dark theme · SSO ready' },
            ].map((t, i) => (
              <div key={i} className="tech-item reveal" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="tech-icon">{t.icon}</div>
                <div className="tech-category">{t.category}</div>
                <h4 className="tech-name">{t.name}</h4>
                <p className="tech-sub">{t.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section className="pricing" id="pricing">
        <div className="container">
          <div className="section-label reveal">Pricing</div>
          <h2 className="section-title reveal">
            Simple <span className="highlight">Pricing</span>
          </h2>
          <p className="section-sub reveal">No hidden fees. No credit card to start.</p>

          <div className="pricing-cards">
            {/* Community */}
            <div className="pricing-card reveal">
              <div className="pricing-badge">FREE</div>
              <h3>Community</h3>
              <div className="price">$0<span>/month</span></div>
              <p className="price-label">Perfect for getting started</p>
              <ul className="pricing-features">
                {['Voice & Chat modes', 'Free Groq API access', 'Desktop app (Windows)', 'Basic stealth mode', 'Community support'].map(f => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Show when="signed-out">
                <SignUpButton mode="modal" forceRedirectUrl="/">
                  <button className="btn btn-secondary" style={{ width: '100%' }}>Get Started Free</button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/app')}>Go to App</button>
              </Show>
            </div>

            {/* Professional — Featured */}
            <div className="pricing-card featured reveal">
              <div className="pricing-popular">🔥 Most Popular</div>
              <div className="pricing-badge featured-badge">PRO</div>
              <h3>Professional</h3>
              <div className="price">$9.99<span>/month</span></div>
              <p className="price-label">For serious interview prep</p>
              <ul className="pricing-features">
                {['Everything in Community', 'Priority Groq API quota', 'Advanced personas', 'Session history export', 'Resume/JD optimization', 'Priority support'].map(f => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button className="btn btn-primary" style={{ width: '100%' }}>⚡ Upgrade Now</button>
              <p className="pricing-risk">✔ Cancel anytime &nbsp;·&nbsp; ✔ No lock-in</p>
            </div>

            {/* Enterprise */}
            <div className="pricing-card reveal">
              <div className="pricing-badge">TEAM</div>
              <h3>Enterprise</h3>
              <div className="price">Custom</div>
              <p className="price-label">For organizations</p>
              <ul className="pricing-features">
                {['All Professional features', 'Custom API integration', 'Dedicated support', 'Team management', 'Admin dashboard', 'SLA guarantee'].map(f => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button className="btn btn-secondary" style={{ width: '100%' }}>Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="download" id="download">
        <div className="download-content">
          <div className="section-label reveal" style={{ justifyContent: 'center', display: 'flex' }}>Get Started</div>
          <h2 className="section-title reveal">
            Ready to <span className="highlight">Crack Your Next</span> Interview?
          </h2>
          <p className="section-sub reveal" style={{ marginBottom: '2rem' }}>
            Join thousands of developers already using InterviewGuru to land their dream jobs.
          </p>

          <div className="download-buttons">
            <div className="download-card reveal">
              <div className="download-card-icon">🌐</div>
              <h3>Web Version</h3>
              <p>Use directly in your browser. No install required. Perfect for web-based interviews on Google Meet.</p>
              <Show when="signed-out">
                <SignUpButton mode="modal" forceRedirectUrl="/app">
                  <button className="btn btn-primary btn-glow" style={{ width: '100%' }}>🚀 Launch Web App Free</button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link to="/app" className="btn btn-primary btn-glow" style={{ display: 'block', textAlign: 'center' }}>Launch Web App →</Link>
              </Show>
            </div>
            <div className="download-card reveal">
              <div className="download-card-icon">💻</div>
              <h3>Windows Desktop</h3>
              <p>Standalone .exe for maximum power. Captures system audio from Zoom, Teams, Slack — any app.</p>
              <a
                href="https://github.com/adityanshinde/Interview-Guru/releases/download/v1.0.0/InterviewGuru.exe"
                className="btn btn-secondary"
                style={{ display: 'block', textAlign: 'center' }}
              >
                ⬇ Download .exe
              </a>
            </div>
          </div>

          {/* Final micro trust */}
          <div className="final-trust reveal">
            <span>✔ No credit card required</span>
            <span>✔ Free Groq API access</span>
            <span>✔ Cancel anytime</span>
            <span>✔ Open source core</span>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer id="contact">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo" style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>InterviewGuru</div>
            <p>The stealth AI copilot for developers who refuse to go into interviews unprepared.</p>
          </div>
          <div className="footer-column">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#modes">Modes</a></li>
              <li><a href="#tech">Tech Stack</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Resources</h4>
            <ul>
              <li><Link to="/docs">Documentation</Link></li>
              <li><Link to="/api-reference">API Reference</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Community</h4>
            <ul>
              <li><a href="https://github.com/adityanshinde/Parakeet-AI-Clone" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="https://discord.gg/yourserver" target="_blank" rel="noreferrer">Discord</a></li>
              <li><a href="https://twitter.com/interviewguru" target="_blank" rel="noreferrer">Twitter/X</a></li>
              <li><a href="https://linkedin.com/company/interviewguru" target="_blank" rel="noreferrer">LinkedIn</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/security">Security</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024-2026 InterviewGuru. Built with precision for engineers. All rights reserved.</p>
        </div>
      </footer>

      {/* Mobile sticky bottom CTA */}
      <div className="mobile-sticky-cta">
        <Show when="signed-out">
          <SignUpButton mode="modal" forceRedirectUrl="/app">
            <button className="btn btn-primary btn-glow w-full">🚀 Start Free</button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <button className="btn btn-primary btn-glow w-full" onClick={() => navigate('/app')}>
            🚀 Launch App
          </button>
        </Show>
      </div>
    </div>
  );
}
