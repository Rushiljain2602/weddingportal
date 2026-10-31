import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  CheckCircle2, 
  Heart, 
  Sparkles,
  MapPin,
  Compass,
  Utensils,
  Plane,
  Car,
  Users,
  Gift,
  Calendar,
  Layers,
  X
} from 'lucide-react';
import TectellLogo from './TectellLogo';

export default function MarketingBrochure() {
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handlePrint = () => {
    // Add custom style to head to optimize printing and hide everything except the brochure
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        #printable-brochure-modal, #printable-brochure-modal * {
          visibility: visible !important;
        }
        #printable-brochure-modal {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          box-shadow: none !important;
          border: none !important;
        }
        .no-print {
          display: none !important;
        }
        @page {
          size: A4 portrait;
          margin: 1.5cm;
        }
        .page-break {
          page-break-before: always;
        }
      }
    `;
    document.head.appendChild(styleEl);
    
    // Open print dialog
    window.print();
    
    // Cleanup style after print
    setTimeout(() => {
      document.head.removeChild(styleEl);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Luxurious Promotional Presentation Card */}
      <div id="client-brochure-intro" className="bg-gradient-to-br from-[#1c2e24] to-[#071911] text-[#f7f5f0] rounded-3xl p-6 sm:p-8 border border-amber-300/20 shadow-2xl relative overflow-hidden">
        
        {/* Decorative elements */}
        <div className="absolute right-0 bottom-0 w-[250px] h-[250px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-12 top-0 w-1 h-full bg-gradient-to-b from-amber-400/10 via-transparent to-transparent hidden md:block" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="space-y-3 md:pl-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 rounded-full border border-amber-400/30 text-amber-300 text-[10px] font-mono uppercase tracking-widest font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Flawless Event Harmony</span>
            </div>
            <h3 className="font-serif text-3xl font-black text-white tracking-wide leading-tight">
              The Sovereign Sanctuary of Wedding Logistics
            </h3>
            <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
              Explore how the <strong>Tectell Wedding Suite</strong> orchestrates high-end destination celebrations into unforgettable memories. Introduce your clients, families, and planning partners to a world of absolute comfort, flawless hospitality, and stress-free guest care.
            </p>
          </div>
          
          <button
            onClick={() => setShowPrintPreview(true)}
            className="self-start md:self-center px-6 py-3 bg-[#c9ab7a] hover:bg-[#b89a69] text-[#1c2e24] rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <FileText className="h-4 w-4" />
            <span>Open Marketing Brochure</span>
          </button>
        </div>

        {/* Client Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 border-t border-stone-800 pt-6">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-300">
                <Layers className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-serif font-bold text-white">Elite Room Allocation</h4>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Ensure immediate family and VIPs reside together in luxury palace suites with real-time layout planning.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-300">
                <Car className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-serif font-bold text-white">VIP Shuttle Concierge</h4>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Synchronize flight arrivals with luxury private shuttle dispatches, greeting guests at the terminal.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-300">
                <Compass className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-serif font-bold text-white">Bespoke Guest Journeys</h4>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Curate individual itineraries, record unique culinary requests, and broadcast personalized invites beautifully.
            </p>
          </div>

        </div>
      </div>

      {/* 2. Interactive Digital Brochure Preview */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-stone-950/85 flex items-center justify-center p-4 z-55 overflow-y-auto backdrop-blur-sm">
          
          <div className="bg-stone-50 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 border border-stone-300/60">
            
            {/* Top Toolbar - Non Printable */}
            <div className="bg-[#1c2e24] p-4 flex items-center justify-between border-b border-white/10 no-print">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-300" />
                <span className="font-serif text-white font-bold text-sm">Brochure View &amp; PDF Export</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-5 py-2.5 bg-[#c9ab7a] hover:bg-[#b89a69] text-[#1c2e24] font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print or Export PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* Scrollable Printable Container */}
            <div className="p-4 sm:p-10 md:p-12 overflow-y-auto max-h-[85vh] bg-stone-100 flex justify-center">
              
              {/* THE LUXURY BROCHURE (2 PAGES) */}
              <div 
                id="printable-brochure-modal" 
                className="w-full max-w-[21cm] bg-white text-stone-800 p-8 sm:p-14 border border-stone-300 rounded-lg shadow-sm space-y-12 select-text"
                style={{ fontFamily: '"Inter", sans-serif' }}
              >
                
                {/* ==================== PAGE 1: EXQUISITE CELEBRATION BRIEF ==================== */}
                <div className="space-y-8 relative pb-10 border-b border-dashed border-stone-200">
                  
                  {/* Ornate Header */}
                  <div className="flex items-center justify-between border-b-2 border-[#1c2e24] pb-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono tracking-[0.25em] text-[#c9ab7a] font-bold uppercase">THE EXECUTIVE PORTFOLIO</span>
                        <span className="px-2 py-0.5 rounded text-[8px] bg-stone-100 text-[#1c2e24] font-mono border border-stone-200 uppercase font-bold tracking-wider">Premium Edition</span>
                      </div>
                      <h1 className="font-serif text-3xl font-bold tracking-wide text-[#1c2e24]">
                        Tectell Wedding Suite
                      </h1>
                      <p className="text-[10px] font-mono text-stone-400 uppercase tracking-[0.2em]">
                        Luxury Guest Coordination, Hospitality &amp; Sovereign Logistics
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                      <div className="h-11 w-11 rounded-full bg-[#1c2e24] flex items-center justify-center border border-[#c9ab7a] mb-1.5 shadow-sm">
                        <Heart className="h-5 w-5 text-[#c9ab7a] fill-[#c9ab7a]" />
                      </div>
                      <TectellLogo variant="color" size="sm" showText={true} />
                    </div>
                  </div>

                  {/* Elegant Quote */}
                  <div className="text-center py-4 px-6 bg-[#faf9f5] rounded-2xl border-l-4 border-[#c9ab7a] italic text-stone-700 text-xs font-serif leading-relaxed">
                    "A great marriage is not when the perfect couple comes together. It is when an imperfect couple learns to enjoy their differences—crafted within a weekend of absolute, unhurried serenity."
                  </div>

                  {/* Narrative Pitch */}
                  <div className="space-y-3.5">
                    <h2 className="font-serif text-lg font-bold text-stone-900 tracking-wide">
                      Flawless Hospitality Behind Grand Royal Celebrations
                    </h2>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Destination weddings at palace retreats, oceanfront villas, and historic estates are breathtaking milestones. Yet, managing the intricate logistics behind the magic is notoriously complex. Planning hosts spend hundreds of hours coordinating flights, sorting room assignments, and cataloging special requirements.
                    </p>
                    <p className="text-xs text-[#1c2e24] leading-relaxed font-semibold">
                      The <strong>Tectell Wedding Suite</strong> acts as your sovereign digital concierge, seamlessly organizing guest check-ins, palace roomings, and transit logistics, ensuring both hosts and planners enjoy the celebration in absolute peace.
                    </p>
                  </div>

                  {/* Core Sanctuary Features */}
                  <div className="space-y-4">
                    <h3 className="font-serif text-xs font-bold text-[#1c2e24] border-b border-stone-200 pb-1.5 uppercase tracking-widest">
                      The Logistics Pillars
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                          <CheckCircle2 className="h-4.5 w-4.5 text-[#1c2e24] shrink-0" />
                          <span>The RSVP Sanctuary &amp; Invites</span>
                        </div>
                        <p className="text-[11px] text-stone-500 pl-6.5 leading-relaxed">
                          Collect guest responses through elegant mobile invitation links. Parse dietary profiles, ceremony check-ins, and family structures automatically.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                          <CheckCircle2 className="h-4.5 w-4.5 text-[#1c2e24] shrink-0" />
                          <span>Sovereign Suite Allocations</span>
                        </div>
                        <p className="text-[11px] text-stone-500 pl-6.5 leading-relaxed">
                          Design your room layout and drag-and-drop families into designated palace wings. Enforce custom guest rules and check bed availability in real-time.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                          <CheckCircle2 className="h-4.5 w-4.5 text-[#1c2e24] shrink-0" />
                          <span>Airport Shuttle Concierge</span>
                        </div>
                        <p className="text-[11px] text-stone-500 pl-6.5 leading-relaxed">
                          Track arrival flights, times, and airport transfers. Dynamically dispatch luxury vans or shuttle coaches, welcoming esteemed guests upon arrival.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                          <CheckCircle2 className="h-4.5 w-4.5 text-[#1c2e24] shrink-0" />
                          <span>Budget Harmony &amp; Squad Tasks</span>
                        </div>
                        <p className="text-[11px] text-stone-500 pl-6.5 leading-relaxed">
                          Manage vendor advances, design, floral, and transport ledgers in perfect clarity, and delegate checklist responsibilities to specialist planning teams.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Elegant Footer of Page 1 */}
                  <div className="pt-6 flex justify-between items-center text-[9px] font-mono text-stone-400">
                    <span>Tectell Wedding Suite Concierge Brochure</span>
                    <span>Page 1 of 2</span>
                  </div>

                </div>

                {/* ==================== PAGE 2: ART OF GUEST EXPERIENCE ==================== */}
                <div className="space-y-8 relative pt-4 page-break">
                  
                  {/* Ornate Header Page 2 */}
                  <div className="flex items-center justify-between border-b-2 border-[#1c2e24] pb-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono tracking-widest text-[#c9ab7a] font-bold uppercase">GUEST CARE REDEFINED</span>
                      <h2 className="font-serif text-2xl font-bold text-[#1c2e24] tracking-wide">
                        The Luxury Journey Experience
                      </h2>
                    </div>
                    <TectellLogo variant="color" size="sm" showText={true} />
                  </div>

                  {/* Flow Steps for Guests */}
                  <div className="space-y-4">
                    <p className="text-xs text-stone-600 leading-relaxed">
                      True luxury lies in the details. The Tectell Wedding Suite transforms coordinate chaos into a fluid, customized hospitality journey from the moment the invitation lands to the final farewell breakfast.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className="bg-[#faf9f5] border border-stone-200 rounded-2xl p-4 text-center space-y-2">
                        <div className="mx-auto w-8 h-8 rounded-full bg-[#1c2e24] text-white flex items-center justify-center font-serif text-xs font-bold">I</div>
                        <span className="font-serif text-xs font-extrabold text-[#1c2e24] block uppercase tracking-wider">The Welcome Desk</span>
                        <p className="text-[10.5px] text-stone-500 leading-relaxed">
                          Guests input RSVP preferences via their digital invitations. Their arrival flight data automatically syncs with the transport ledger.
                        </p>
                      </div>

                      <div className="bg-[#faf9f5] border border-stone-200 rounded-2xl p-4 text-center space-y-2">
                        <div className="mx-auto w-8 h-8 rounded-full bg-[#1c2e24] text-white flex items-center justify-center font-serif text-xs font-bold">II</div>
                        <span className="font-serif text-xs font-extrabold text-[#1c2e24] block uppercase tracking-wider">The Private Transit</span>
                        <p className="text-[10.5px] text-stone-500 leading-relaxed">
                          Chauffeurs greet families at the terminal, guided by live logs, boarding them onto luxury private transport sprinters without friction.
                        </p>
                      </div>

                      <div className="bg-[#faf9f5] border border-stone-200 rounded-2xl p-4 text-center space-y-2">
                        <div className="mx-auto w-8 h-8 rounded-full bg-[#1c2e24] text-white flex items-center justify-center font-serif text-xs font-bold">III</div>
                        <span className="font-serif text-xs font-extrabold text-[#1c2e24] block uppercase tracking-wider">The Royal Reception</span>
                        <p className="text-[10.5px] text-stone-500 leading-relaxed">
                          Families arrive to pre-allocated suites in corresponding wings, bypassing complex queues and double-bookings completely.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Hospitality Checklist */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-stone-150 pb-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-[#c9ab7a]" />
                      <h3 className="font-serif text-xs font-extrabold text-[#1c2e24] uppercase tracking-widest">
                        A Blueprint for Perfect Celebrations
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#faf9f5] rounded-xl p-4 border border-stone-200/50 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-stone-800">
                          <Users className="h-4 w-4 text-[#1c2e24] shrink-0" />
                          <span>Keeping Extended Families Together</span>
                        </div>
                        <p className="text-[10.5px] text-stone-500 leading-relaxed">
                          Utilize elegant grouping algorithms to block out contiguous rooms for large clans, keeping elders and kids in comfort.
                        </p>
                      </div>

                      <div className="bg-[#faf9f5] rounded-xl p-4 border border-stone-200/50 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-stone-800">
                          <Utensils className="h-4 w-4 text-[#1c2e24] shrink-0" />
                          <span>Bespoke Culinary &amp; Special Care</span>
                        </div>
                        <p className="text-[10.5px] text-stone-500 leading-relaxed">
                          Ensure planners have full visibility on individual dietary restrictions (allergies, vegan, kosher) across multiple banquets.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Elegant Outro */}
                  <div className="border-t border-stone-200 pt-8 text-center space-y-3.5">
                    <div className="text-xs font-bold font-serif text-stone-800">
                      Crafting Unforgettable Memories with Seamless Execution.
                    </div>
                    <p className="text-[10.5px] text-stone-500 max-w-lg mx-auto leading-relaxed">
                      With its gorgeous, royal aesthetic templates, intuitive controls, and synchronized coordination, the Tectell Wedding Suite represents the pinnacle of modern luxury event management.
                    </p>
                    
                    <div className="pt-2 text-[#1c2e24] font-serif italic text-xs">
                      Empowered by <a href="https://tectell.in/" target="_blank" rel="noopener noreferrer" className="text-[#1c2e24] font-bold hover:underline">tectell.in</a>. Elevating hospitality for generations.
                    </div>
                  </div>

                  {/* Footer of Page 2 */}
                  <div className="pt-6 flex justify-between items-center text-[9px] font-mono text-stone-400">
                    <span>Tectell Wedding Suite Concierge Brochure</span>
                    <span>Page 2 of 2</span>
                  </div>

                </div>

              </div>
              
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
