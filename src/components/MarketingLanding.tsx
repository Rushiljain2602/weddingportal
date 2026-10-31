import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import TectellLogo from './TectellLogo';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldAlert, 
  Heart, 
  Check, 
  Calendar, 
  Hotel, 
  Car, 
  CheckSquare, 
  DollarSign, 
  X,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function MarketingLanding() {
  const { allWeddings, selectWeddingId } = useApp();
  const navigate = useNavigate();
  const [weddingIdInput, setWeddingIdInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Local "multi-page" tab state to handle the sleek Above-the-Fold presentation
  const [currentTab, setCurrentTab] = useState<'home' | 'features'>('home');
  const [isAccessingWorkspace, setIsAccessingWorkspace] = useState(false);

  const handleEnterWedding = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = weddingIdInput.trim().toLowerCase().replace(/\s+/g, '_');
    
    if (!slug) {
      setErrorMsg('Please enter a valid Wedding Identifier.');
      return;
    }

    const found = allWeddings.find(w => w.id === slug);
    if (!found) {
      setErrorMsg(`Wedding ID "${slug}" was not found. Try the demo wedding below.`);
      return;
    }

    setErrorMsg('');
    selectWeddingId(found.id);
    navigate('/dashboard');
  };

  return (
    <div 
      id="marketing-container" 
      className="min-h-screen w-full relative flex flex-col justify-between overflow-hidden antialiased font-sans select-none"
    >
      {/* Exquisite Indian Palace Wedding Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center -z-10 bg-no-repeat transition-all duration-1000 brightness-[0.88] scale-[1.01]"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=1974&auto=format&fit=crop')` }}
      />
      
      {/* Luxury Cinematic Gradient Vignette Overlay (Brighter, warmer golden glow) */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-950/25 via-stone-900/10 to-stone-950/45 -z-10 pointer-events-none" />

      {/* FIXED HEADER */}
      <header className="w-full z-40 border-b border-stone-200/20 backdrop-blur-md bg-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Logo Placeholder & Text */}
          <div className="flex items-center gap-4">
            <TectellLogo variant="dark" size="sm" showText={true} className="hover:opacity-100" />
            <div className="h-5 w-[1px] bg-stone-900/15 hidden sm:block" />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/25 text-amber-900 text-[9px] font-mono uppercase tracking-[0.15em] shadow-sm font-semibold">
              Wedding Portal
            </span>
          </div>

          {/* Simple navigation and login */}
          <nav className="flex items-center gap-4 sm:gap-8">
            <button
              onClick={() => {
                setCurrentTab('home');
                setIsAccessingWorkspace(false);
              }}
              className={`text-[11px] sm:text-xs uppercase tracking-[0.2em] transition-colors cursor-pointer ${
                currentTab === 'home' && !isAccessingWorkspace
                  ? 'text-amber-800 font-extrabold border-b-2 border-amber-600 pb-0.5'
                  : 'text-stone-800 hover:text-stone-950 pb-0.5 font-semibold'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => {
                setCurrentTab('features');
                setIsAccessingWorkspace(false);
              }}
              className={`text-[11px] sm:text-xs uppercase tracking-[0.2em] transition-colors cursor-pointer ${
                currentTab === 'features'
                  ? 'text-amber-800 font-extrabold border-b-2 border-amber-600 pb-0.5'
                  : 'text-stone-800 hover:text-stone-950 pb-0.5 font-semibold'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => {
                setCurrentTab('home');
                setIsAccessingWorkspace(true);
              }}
              className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] px-4 py-2 bg-stone-900 hover:bg-stone-850 text-white rounded-lg shadow-sm hover:shadow-stone-950/10 transition-all duration-200 active:scale-95 cursor-pointer border border-stone-950"
            >
              Login
            </button>
          </nav>

        </div>
      </header>

      {/* CENTRAL CONTENT AREA (Frosted glass resting beautifully over background image) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 flex items-center justify-center py-4 sm:py-6">
        <AnimatePresence mode="wait">
          {currentTab === 'home' ? (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-2xl bg-white/75 border border-amber-500/15 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(139,115,85,0.12)] relative overflow-hidden"
            >
              {/* Luxury Corner accents */}
              <div className="absolute top-3 left-3 w-5 h-5 border-t border-l border-amber-600/30 rounded-tl-lg" />
              <div className="absolute top-3 right-3 w-5 h-5 border-t border-r border-amber-600/30 rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b border-l border-amber-600/30 rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b border-r border-amber-600/30 rounded-br-lg" />

              <div className="text-center space-y-4">
                
                {/* Subtle top indicator */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/25 text-amber-800 text-[10px] font-mono uppercase tracking-[0.15em] shadow-sm">
                  <Heart className="h-3 w-3 fill-amber-600 text-amber-600 animate-pulse" />
                  <span className="font-semibold">Bespoke Guest Management</span>
                </div>

                <AnimatePresence mode="wait">
                  {!isAccessingWorkspace ? (
                    <motion.div
                      key="welcome-info"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Premium Glowing Tectell Logo Container (Highly compact to prevent scroll) */}
                      <div className="flex justify-center pt-1 pb-1">
                        <div className="relative p-3.5 bg-white/55 border border-amber-500/10 rounded-xl shadow-xs backdrop-blur-md hover:border-amber-400/35 hover:bg-white/70 transition-all duration-300 group max-w-[250px] w-full flex justify-center">
                          {/* Radial Glow effect */}
                          <div className="absolute inset-0 bg-amber-400/5 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <TectellLogo variant="dark" size="md" showText={true} animate={true} className="group-hover:scale-[1.02] transition-transform duration-300" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h1 className="font-serif text-2xl sm:text-3xl md:text-[32px] text-stone-900 font-medium tracking-tight leading-[1.15]">
                          The One-Stop <br />
                          <span className="italic text-amber-800 font-normal">Wedding Management</span> Platform
                        </h1>
                        <p className="text-stone-600 text-[11px] sm:text-xs md:text-[13px] font-normal leading-relaxed max-w-xl mx-auto">
                          The unified workspace for families, planners, and vendors to effortlessly manage guest arrivals, room allocations, and complex multi-day itineraries.
                        </p>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => setIsAccessingWorkspace(true)}
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer inline-flex items-center gap-2 text-xs sm:text-[13px] uppercase tracking-widest border border-amber-400/20"
                        >
                          <span>Access Workspace</span>
                          <ArrowRight className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="access-form"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-serif text-xl sm:text-2xl text-stone-900 font-medium tracking-wide">Secure Event Gateway</h3>
                        <p className="text-stone-600 text-xs leading-relaxed max-w-sm mx-auto">
                          Enter your private wedding identifier to connect and log in to the logistics planner.
                        </p>
                      </div>

                      <form onSubmit={handleEnterWedding} className="space-y-3 max-w-md mx-auto text-left">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono uppercase tracking-[0.15em] text-amber-800/80 font-bold">
                            Private Registry Code
                          </label>
                          <div className="relative rounded-xl overflow-hidden border border-stone-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/15 transition-all bg-white/95 backdrop-blur-md shadow-xs">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-mono select-none font-semibold">
                              registry/
                            </span>
                            <input
                              type="text"
                              value={weddingIdInput}
                              onChange={(e) => {
                                setWeddingIdInput(e.target.value);
                                setErrorMsg('');
                              }}
                              placeholder="wedding_code"
                              className="w-full pl-[74px] pr-4 py-3 bg-transparent text-sm font-semibold text-stone-900 focus:outline-none placeholder:text-stone-300 uppercase tracking-wider"
                              autoFocus
                            />
                          </div>
                          {errorMsg && (
                            <p className="text-xs text-rose-700 mt-1 flex items-center gap-1.5 font-semibold bg-rose-50 border border-rose-200/60 p-2 rounded-xl">
                              <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                              <span>{errorMsg}</span>
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-md border border-amber-400/20 transition-all duration-200 flex items-center justify-center gap-1.5 group uppercase tracking-widest cursor-pointer active:scale-98"
                        >
                          <span>Launch Wedding Portal</span>
                          <ArrowRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                        </button>
                        
                        <div className="pt-1 text-center flex flex-col items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAccessingWorkspace(false)}
                            className="text-stone-500 hover:text-stone-850 text-[10px] uppercase tracking-widest transition-colors font-bold mt-1 flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft className="h-3 w-3" />
                            <span>Back to Welcome Info</span>
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          ) : (
            <motion.div
              key="features-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-4xl bg-white/80 border border-amber-500/15 backdrop-blur-xl rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(139,115,85,0.12)] relative overflow-hidden"
            >
              {/* Luxury Corner accents */}
              <div className="absolute top-3 left-3 w-5 h-5 border-t border-l border-amber-600/30 rounded-tl-lg" />
              <div className="absolute top-3 right-3 w-5 h-5 border-t border-r border-amber-600/30 rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b border-l border-amber-600/30 rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b border-r border-amber-600/30 rounded-br-lg" />

              <div className="text-center space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-800 font-bold">Exclusive Capabilities</span>
                  <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight text-stone-900">
                    Modular Suite for <span className="italic text-amber-800 font-normal">Flawless Planning</span>
                  </h2>
                </div>

                {/* Clean Feature List optimized for Above-The-Fold layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-left pt-1">
                  
                  {/* Feature 1 */}
                  <div className="bg-stone-50/60 border border-stone-200/50 rounded-xl p-3.5 space-y-2 hover:border-amber-500/20 hover:bg-white transition-all shadow-3xs">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 flex items-center justify-center">
                      <Hotel className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900">Palace Suite Allocations</h4>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        Intelligent, constraint-enforced solver maps families to suites while avoiding room overbooking and isolation conflicts.
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="bg-stone-50/60 border border-stone-200/50 rounded-xl p-3.5 space-y-2 hover:border-amber-500/20 hover:bg-white transition-all shadow-3xs">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 flex items-center justify-center">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900">Interactive Ceremony Schedules</h4>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        Configure complex multi-day ritual timelines, specific ceremony venues, and traditional dress codes.
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="bg-stone-50/60 border border-stone-200/50 rounded-xl p-3.5 space-y-2 hover:border-amber-500/20 hover:bg-white transition-all shadow-3xs">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 flex items-center justify-center">
                      <Car className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900">Airport Shuttle Logistics</h4>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        Coordinate guest arrivals and departures, group families into shared shuttle fleet routes, and dispatch drivers.
                      </p>
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="bg-stone-50/60 border border-stone-200/50 rounded-xl p-3.5 space-y-2 hover:border-amber-500/20 hover:bg-white transition-all shadow-3xs">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 flex items-center justify-center">
                      <CheckSquare className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900">Task Squad Checklist</h4>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        Keep coordinators organized with real-time tasks sorted by specialized departments like Decor, Catering, and Invites.
                      </p>
                    </div>
                  </div>

                  {/* Feature 5 */}
                  <div className="bg-stone-50/60 border border-stone-200/50 rounded-xl p-3.5 space-y-2 hover:border-amber-500/20 hover:bg-white transition-all shadow-3xs">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 flex items-center justify-center">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900">Financial Contract Ledger</h4>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        Supervise budget boundaries, advance payments, and outstanding balances to keep vendors in sync.
                      </p>
                    </div>
                  </div>

                  {/* Feature 6 */}
                  <div className="bg-stone-50/60 border border-stone-200/50 rounded-xl p-3.5 space-y-2 hover:border-amber-500/20 hover:bg-white transition-all shadow-3xs">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-800 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900">Personalized RSVP Inviter</h4>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        Construct secure, custom, interactive RSVP links for every guest family, ensuring elegant and rapid data capture.
                      </p>
                    </div>
                  </div>

                </div>

                <div className="pt-2 flex flex-wrap justify-center items-center gap-3">
                  <button
                    onClick={() => {
                      setCurrentTab('home');
                      setIsAccessingWorkspace(true);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-md transition-all text-xs uppercase tracking-widest cursor-pointer border border-amber-400/20 inline-flex items-center gap-1.5"
                  >
                    <span>Launch Portal Gateway</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTab('home');
                      setIsAccessingWorkspace(false);
                    }}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/80 rounded-xl text-xs transition-colors font-bold cursor-pointer"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="w-full z-10 border-t border-stone-200/20 py-3 backdrop-blur-md bg-white/20 text-stone-600 text-center text-[10px] sm:text-xs font-mono tracking-wider">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 justify-center sm:justify-start">
            <Heart className="h-3 w-3 text-rose-600 fill-rose-600 animate-pulse" />
            <span className="font-medium text-stone-700">Designed &amp; engineered by</span>
            <a 
              href="https://tectell.in/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-amber-800 hover:text-amber-950 transition font-bold underline underline-offset-2 decoration-amber-600/30"
            >
              Tectell
            </a>
          </div>
          <div className="flex items-center gap-3 justify-center sm:justify-end text-stone-500 font-medium">
            <span>v5.0 Stable Release</span>
            <span>•</span>
            <span>© 2026 Tectell. All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
