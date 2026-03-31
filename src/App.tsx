/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import OverlayWidget from './components/OverlayWidget';
import LandingPage from './components/LandingPage';
import { Documentation, ApiReference, Blog, FAQ, PrivacyPolicy, TermsOfService, Security, ContactPage } from './components/FooterPages';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { Show, SignInButton, SignUpButton, UserButton, SignIn } from '@clerk/react';

import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Force the active window to resize via HMR, since the user didn't restart the desktop app
    const isElectronEnv = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);
    if (isElectronEnv) {
      try {
        const win = window as any;
        const ipc = win.electron?.ipcRenderer || (win.require ? win.require('electron').ipcRenderer : null);
        if (ipc) {
          ipc.send('resize-window', 1400, 900);
        }
      } catch (e) {
        console.log("Not running in Electron, or ipc blocked.");
      }
    }
  }, []);

  return (
    <BrowserRouter>


      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<Documentation />} />
        <Route path="/api-reference" element={<ApiReference />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/security" element={<Security />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/app" element={
          <>
            <Show when="signed-in">
              <div className="landing-page h-screen w-screen overflow-hidden flex flex-col bg-transparent">
                <header className="relative shrink-0 border-b border-white/10 bg-[#0a0e27]/80 backdrop-blur-xl z-50 shadow-lg" style={{ webkitAppRegion: "drag" } as any}>
                    <nav className="max-w-[1800px] w-full mx-auto flex justify-between items-center px-6 py-3">
                        <div className="logo cursor-pointer text-2xl font-black bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight" onClick={() => window.location.href='/'} style={{ webkitAppRegion: "no-drag" } as any}>InterviewGuru</div>
                        
                        <div className="flex items-center gap-4" style={{ webkitAppRegion: "no-drag" } as any}>
                            <div className="flex items-center border border-white/10 rounded-full p-1 bg-black/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all">
                              <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
                            </div>

                            {/* Windows Native Close Button directly in the beautiful Web Navbar! */}
                            {(typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)) && (
                              <div className="flex items-center gap-2">
                                {/* Maximize fallback button */}
                                <button
                                  onClick={() => {
                                    try {
                                      const win = window as any;
                                      const ipc = win.electron?.ipcRenderer || (win.require && win.require('electron').ipcRenderer);
                                      if (ipc) ipc.send('resize-window', 1400, 900);
                                    } catch (e) { console.log(e); }
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-cyan-500 rounded-md transition-colors border border-transparent hover:border-cyan-500/50"
                                  title="Force Desktop Size"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                </button>
                                
                                <button
                                  onClick={() => {
                                    try {
                                      const win = window as any;
                                      const ipc = win.electron?.ipcRenderer || (win.require ? win.require('electron').ipcRenderer : null);
                                      if (ipc) { ipc.send('QUIT_NOW'); ipc.send('close-app'); }
                                      window.close();
                                    } catch (e) { console.log(e); }
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-red-600 rounded-md transition-colors border border-transparent hover:border-red-500/50"
                                  title="Close App"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                              </div>
                            )}
                        </div>
                    </nav>
                </header>
                
                <main className="flex-1 w-full max-w-[1800px] mx-auto p-4 lg:p-6 flex justify-center items-center overflow-hidden z-10 relative">
                   <div className="w-full h-full border border-white/10 bg-black/40 backdrop-blur-3xl rounded-[20px] shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col relative pointer-events-auto ring-1 ring-white/5">
                     <OverlayWidget />
                   </div>
                </main>
              </div>
            </Show>

            <Show when="signed-out">
              <Navigate to="/" replace />
            </Show>
          </>
        } />
      </Routes>
    </BrowserRouter>
  );
}
