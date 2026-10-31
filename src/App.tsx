/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { AppContextProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import Sidebar, { TabId } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GuestList from './components/GuestList';
import RoomAllocation from './components/RoomAllocation';
import Transport from './components/Transport';
import SquadTasks from './components/SquadTasks';
import Budget from './components/Budget';
import Itinerary from './components/Itinerary';
import PublicRSVP from './components/PublicRSVP';
import Settings from './components/Settings';
import GuestPortal from './components/GuestPortal';
import AdminWebsiteManager from './components/AdminWebsiteManager';
import RsvpSpreadsheet from './components/RsvpSpreadsheet';
import RsvpSettings from './components/RsvpSettings';
import Invitations from './components/Invitations';
import MarketingLanding from './components/MarketingLanding';
import TectellSuperAdmin from './components/TectellSuperAdmin';
import TectellLogo, { TectellPageLoader } from './components/TectellLogo';
import { ShieldAlert, HelpCircle, ArrowLeft, Lock, Download, ChevronDown, Bed, Clock, Car, CircleDollarSign, Users, Sparkles, Tv, Award, Heart, Menu, X } from 'lucide-react';

function SubscriptionLocked({ onBackToSaaS }: { onBackToSaaS: () => void }) {
  const { currentWedding } = useApp();
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6 text-stone-200">
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -z-10" />
      
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />
        
        <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <Lock className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#c5a880] uppercase">
            SaaS Contract Suspended
          </span>
          <h2 className="font-serif text-2xl font-bold text-white tracking-wide">
            {currentWedding?.title || "Exclusive Portal"} Locked
          </h2>
          <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto">
            This resort hospitality planner account for <strong>{currentWedding?.resortName || "Udaipur resort properties"}</strong> has concluded its active billing trial period.
          </p>
        </div>

        <div className="bg-stone-950 border border-stone-850 p-4 rounded-2xl text-left space-y-2">
          <div className="text-[10px] font-mono text-stone-500 font-bold uppercase tracking-wider">
            SaaS Troubleshooting Info
          </div>
          <p className="text-[11px] text-stone-400">
            Support reference slug: <code className="text-amber-400 font-bold">{currentWedding?.id}</code>
          </p>
          <p className="text-[11px] text-stone-400">
            System status: <span className="font-semibold text-rose-400">Subscription Locked</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={onBackToSaaS}
            className="py-2.5 bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Switch Wedding ID
          </button>
          
          <div className="pt-2 text-center flex justify-center">
            <TectellLogo variant="light" size="sm" showText={true} className="opacity-60 hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavigationWrapper() {
  const { 
    currentWeddingId, 
    currentWedding, 
    superAdminMode, 
    setSuperAdminMode, 
    selectWeddingId, 
    dbStatus, 
    dbError, 
    weddingTitle,
    guests,
    rooms,
    roomAssignments,
    itinerary,
    transport,
    expenses,
    totalBudget,
    isLoadingWedding
  } = useApp();

  const location = useLocation();
  const currentPath = location.pathname;
  const navigate = useNavigate();

  // Toggle export dropdown state
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Keep admin login credentials status session-persistent on a per-wedding basis
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem(`wedding_${currentWeddingId}_is_logged_in`) === 'true';
  });

  // Track is-logged-in updates when currentWeddingId switches
  useEffect(() => {
    setIsLoggedIn(localStorage.getItem(`wedding_${currentWeddingId}_is_logged_in`) === 'true');
  }, [currentWeddingId]);

  // Active admin panel tab
  const [activeTab, setActiveTabState] = useState<TabId>(() => {
    return (localStorage.getItem('wedding_active_tab') as TabId) || 'dashboard';
  });

  // Helper to change URL pathname and state smoothly without refresh
  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Sync tab selection to localStorage
  const setActiveTab = (tab: TabId) => {
    localStorage.setItem('wedding_active_tab', tab);
    setActiveTabState(tab);
  };

  // Global Interactive Tour State
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Mobile navigation state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const GLOBAL_TOUR_STEPS = [
    {
      tab: 'dashboard' as TabId,
      title: "🌟 Dashboard: Wedding Summary",
      description: "Your wedding overview! See RSVP responses, room occupancy, pending planning checklist tasks, and budget spending in one clean snapshot.",
      actionId: "btn-edit-wedding-title",
      actionLabel: "Edit Wedding Title"
    },
    {
      tab: 'guest-list' as TabId,
      title: "👥 Guest List & RSVPs",
      description: "Keep track of who is attending. View RSVP responses, add guest families, and automatically manage check-in/checkout details.",
      actionId: "btn-add-guest",
      actionLabel: "Add New Guest"
    },
    {
      tab: 'room-allocation' as TabId,
      title: "🛌 Room Allocations",
      description: "Assign guests to hotel or resort rooms. Ensure families stay together and monitor available suites and bed limits.",
      actionId: "btn-auto-allocate",
      actionLabel: "Auto-Allocate Rooms"
    },
    {
      tab: 'transport' as TabId,
      title: "🚖 Cabs & Guest Transport",
      description: "Manage pickups and transfers for arriving guests. Group families into shared cabs, assign driver details, and log arrival times.",
      actionId: "btn-add-pickup",
      actionLabel: "Add Cab Pickup"
    },
    {
      tab: 'squad-tasks' as TabId,
      title: "📋 Checklist Tasks",
      description: "Organize your wedding to-do list. Assign tasks to your squad or planners and track progress by department.",
      actionId: "btn-add-task",
      actionLabel: "Create Task"
    },
    {
      tab: 'budget' as TabId,
      title: "💰 Expenses & Budgets",
      description: "Track wedding spending, vendor contracts, and unpaid balances to ensure you stay within your budget.",
      actionId: "btn-add-expense",
      actionLabel: "Add Expense"
    },
    {
      tab: 'itinerary' as TabId,
      title: "📅 Wedding Agenda Events",
      description: "Set up the dates, start and end times, dress codes, and GPS map locations for all ceremonies.",
      actionId: "btn-add-ceremony",
      actionLabel: "Add Event"
    },
    {
      tab: 'settings' as TabId,
      title: "⚙️ Settings & Password",
      description: "Change your portal access passcode, edit core wedding metadata, and secure your admin dashboard.",
      actionId: "settings-view-panel",
      actionLabel: "View Settings"
    }
  ];

  const handleNextStep = () => {
    if (tourStep < GLOBAL_TOUR_STEPS.length - 1) {
      const nextStep = tourStep + 1;
      setTourStep(nextStep);
      setActiveTab(GLOBAL_TOUR_STEPS[nextStep].tab);
    } else {
      setIsTourActive(false);
    }
  };

  const handlePrevStep = () => {
    if (tourStep > 0) {
      const prevStep = tourStep - 1;
      setTourStep(prevStep);
      setActiveTab(GLOBAL_TOUR_STEPS[prevStep].tab);
    }
  };

  const triggerShowMe = () => {
    const step = GLOBAL_TOUR_STEPS[tourStep];
    if (step.actionId) {
      setTimeout(() => {
        const el = document.getElementById(step.actionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2', 'animate-pulse');
          el.click();
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2', 'animate-pulse');
          }, 2500);
        } else {
          console.log("Tour action element targeted:", step.actionId);
        }
      }, 100);
    }
  };

  // Universal Export Helpers
  const downloadCSV = (rows: any[][], filename: string) => {
    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `${filename}_${dStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportGuestsCSV = () => {
    const headers = ["Guest Name", "Side Affiliation", "Family Size", "Phone", "Assigned Room", "Invited Events", "Attending", "Declined", "Pending"];
    const rows = guests.map(g => {
      const suite = rooms.find(r => roomAssignments[g.id] === r.id);
      const invitedEventsTitles = g.invitedEvents.map(id => itinerary.find(e => e.id === id)?.title || id).join(' | ');
      const attending = Object.keys(g.rsvp).filter(id => g.rsvp[id] === 'Attending').map(id => itinerary.find(e => e.id === id)?.title || id).join(' | ');
      const declined = Object.keys(g.rsvp).filter(id => g.rsvp[id] === 'Declined').map(id => itinerary.find(e => e.id === id)?.title || id).join(' | ');
      const pending = Object.keys(g.rsvp).filter(id => g.rsvp[id] === 'Pending').map(id => itinerary.find(e => e.id === id)?.title || id).join(' | ');

      return [
        `"${g.name.replace(/"/g, '""')}"`,
        `"${g.side}"`,
        g.totalFamilyMembers || 1,
        `"${g.phone}"`,
        `"${suite ? suite.name.replace(/"/g, '""') : 'Not Assigned'}"`,
        `"${invitedEventsTitles.replace(/"/g, '""')}"`,
        `"${attending.replace(/"/g, '""')}"`,
        `"${declined.replace(/"/g, '""')}"`,
        `"${pending.replace(/"/g, '""')}"`
      ];
    });
    
    downloadCSV([headers, ...rows], 'Wedding_Guests_Report');
  };

  const exportSuitesCSV = () => {
    const headers = ["Suite Name", "Beds/Capacity", "Current Occupancy", "Percent Filled", "Assigned Guests (Family Size)"];
    const rows = rooms.map(room => {
      const assignedGuests = guests.filter(g => roomAssignments[g.id] === room.id);
      const occupied = assignedGuests.reduce((sum, g) => sum + (g.totalFamilyMembers || 1), 0);
      const guestNames = assignedGuests.map(g => `${g.name} (x${g.totalFamilyMembers || 1})`).join(' | ');
      const percent = room.capacity > 0 ? Math.round((occupied / room.capacity) * 100) : 0;

      return [
        `"${room.name.replace(/"/g, '""')}"`,
        room.capacity,
        occupied,
        `${percent}%`,
        `"${guestNames.replace(/"/g, '""')}"`
      ];
    });

    downloadCSV([headers, ...rows], 'Resort_Palace_Suites_Report');
  };

  const exportItineraryCSV = () => {
    const headers = ["Event Title", "Date", "Time", "Venue", "Dress Code", "Guests Invited Count", "Attending Count", "Declined Count"];
    const rows = itinerary.map(evt => {
      const invitedGuests = guests.filter(g => g.invitedEvents.includes(evt.id));
      const invitedCount = invitedGuests.length;
      const attendingCount = invitedGuests.filter(g => g.rsvp[evt.id] === 'Attending').reduce((sum, g) => sum + (g.totalFamilyMembers || 1), 0);
      const declinedCount = invitedGuests.filter(g => g.rsvp[evt.id] === 'Declined').reduce((sum, g) => sum + (g.totalFamilyMembers || 1), 0);

      return [
        `"${evt.title.replace(/"/g, '""')}"`,
        `"${evt.date}"`,
        `"${evt.time}"`,
        `"${evt.location.replace(/"/g, '""')}"`,
        `"${evt.dressCode.replace(/"/g, '""')}"`,
        invitedCount,
        attendingCount,
        declinedCount
      ];
    });

    downloadCSV([headers, ...rows], 'Wedding_Itinerary_Report');
  };

  const exportTransportCSV = () => {
    const headers = ["Guest Name", "Guests Count", "Phone", "Arrival/Departure Date & Time", "Mode/Flight", "Status/Cab Details"];
    const rows = transport.map(tr => {
      const foundGuest = guests.find(g => g.id === tr.guestId || g.name === tr.guestName);
      return [
        `"${tr.guestName.replace(/"/g, '""')}"`,
        tr.passengersCount || foundGuest?.totalFamilyMembers || 1,
        `"${tr.phone || foundGuest?.phone || 'Not specified'}"`,
        `"${tr.dateTime}"`,
        `"${tr.mode.replace(/"/g, '""')}"`,
        `"${tr.cabDetails ? tr.cabDetails.replace(/"/g, '""') : 'Pending Cab assignment'}"`
      ];
    });

    downloadCSV([headers, ...rows], 'Guest_Transport_Schedule');
  };

  const exportBudgetCSV = () => {
    const headers = ["Category/Asset", "Vendor Contract", "Estimated/Agreed Cost", "Paid Amount", "Pending Balance", "Status"];
    const rows = expenses.map(expense => {
      const pending = expense.amount - expense.amountPaid;
      return [
        `"${expense.category.replace(/"/g, '""')}"`,
        `"${expense.vendor.replace(/"/g, '""')}"`,
        expense.amount,
        expense.amountPaid,
        pending,
        `"${expense.status}"`
      ];
    });

    const totalEst = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = expenses.reduce((sum, e) => sum + e.amountPaid, 0);
    const totalRem = totalEst - totalPaid;
    rows.push([
      `"TOTAL EXPENDITURE"`,
      `"Ledger Summary"`,
      totalEst,
      totalPaid,
      totalRem,
      `"Total Budget: ${totalBudget}"`
    ]);

    downloadCSV([headers, ...rows], 'Budget_Ledger_Balance');
  };

  // Update session storage when login state shifts
  const handleLoginSuccess = () => {
    localStorage.setItem(`wedding_${currentWeddingId}_is_logged_in`, 'true');
    setIsLoggedIn(true);
    navigateTo('/dashboard');
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem(`wedding_${currentWeddingId}_is_logged_in`);
    setIsLoggedIn(false);
    navigateTo('/');
  };

  // 0. LOADER FOR ACTIVE LOADING STATES
  if (isLoadingWedding) {
    return <TectellPageLoader message="Establishing secure connection to Tectell Cloud Nodes..." />;
  }

  // 0. GUEST PATH ROUTE DETECTOR: Is it a dynamic couple name route? (e.g. /devansh_helly or /devansh_helly/rsvp)
  const RESERVED_COUPLE_NAMES = ['dashboard', 'rsvp', 'tectell', 'login', 'admin'];
  const pathParts = currentPath.split('/').filter(Boolean);
  const isGuestRoute = pathParts.length > 0 && !RESERVED_COUPLE_NAMES.includes(pathParts[0]);

  if (isGuestRoute) {
    if (pathParts[1] === 'rsvp') {
      return <PublicRSVP />;
    }
    return <GuestPortal />;
  }

  // 1. SUPER ADMIN DETECTOR (/tectell or query param/hash)
  const isSuperAdminRoute = 
    currentPath === '/tectell' || 
    window.location.hash === '#tectell' || 
    window.location.search.includes('admin=tectell') || 
    superAdminMode;

  if (isSuperAdminRoute) {
    return <TectellSuperAdmin onNavigate={navigateTo} />;
  }

  // 2. GUEST PATH ROUTE DETECTOR: Is it an rsvp route?
  const rsvpParams = new URLSearchParams(window.location.search);
  const isRsvpRoute = 
    currentPath === '/rsvp' || 
    currentPath.startsWith('/rsvp') || 
    rsvpParams.get('page') === 'rsvp' || 
    rsvpParams.has('guestId') || 
    rsvpParams.has('g');

  if (isRsvpRoute) {
    return (
      <PublicRSVP />
    );
  }

  // 3. ROOT MARKETING / SAAS GATEWAY DETECTOR
  if (!currentWeddingId || (currentPath === '/' && !isLoggedIn)) {
    return <MarketingLanding />;
  }

  // 4. LOCK STATUS MONITOR
  const isLocked = currentWedding?.status === 'locked';
  if (isLocked) {
    return (
      <SubscriptionLocked 
        onBackToSaaS={() => {
          selectWeddingId(null);
          navigateTo('/');
        }} 
      />
    );
  }

  // 5. WEDDING ADMIN ACCESS ENFORCER
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // RENDER ADMIN PORTAL FRAME (Sidebar + Content View)
  return (
    <div id="full-tenant-app-shell" className="flex bg-ivory min-h-screen relative font-sans">
      
      {/* Persistent Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onViewRSVP={() => navigateTo(`/?page=rsvp&weddingId=${currentWeddingId || ''}`)}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/60 z-30 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Panel Area */}
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col w-full overflow-x-hidden">
        
        {/* Elite Header section inside Dashboard */}
        <header className="bg-white border-b border-gold/20 px-4 md:px-8 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-0 z-25 shadow-xs">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-stone-750 hover:bg-stone-550 rounded-xl cursor-pointer shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5 text-stone-700" />
            </button>
            <span className="px-3 py-1.5 text-[10px] sm:text-xs font-serif font-black uppercase tracking-widest rounded bg-[#1a2f26] text-amber-300 border border-amber-400/50 flex items-center gap-2 shadow-sm shrink-0">
              <Heart className="h-3.5 w-3.5 fill-amber-300 text-amber-300 animate-pulse" />
              <span className="flex items-center gap-1.5">
                Wedding Management by <TectellLogo variant="light" size="sm" showText={true} className="inline-flex align-middle" />
              </span>
            </span>
            <div className="hidden sm:block h-4 w-[1px] bg-[#D4AF37]/20"></div>
            <span className="text-stone-500 text-[10px] sm:text-xs font-semibold font-mono flex items-center gap-1.5">
              {dbStatus === 'connecting' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>Connecting...</span>
                </>
              )}
              {dbStatus === 'connected' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span className="text-emerald-700 font-medium">Tenant Cloud Node Online</span>
                </>
              )}
              {dbStatus === 'local' && (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse"></span>
                  <span className="text-stone-850 font-medium">Offline Box Mode</span>
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs w-full md:w-auto justify-start md:justify-end">
            {/* Premium App Tour Button */}
            <button
              onClick={() => {
                setIsTourActive(true);
                setTourStep(0);
                setActiveTab('dashboard');
              }}
              className="text-[10px] font-mono font-extrabold tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 rounded-lg px-3 py-1.5 transition-all shadow-md active:scale-95 flex items-center gap-1.5 border border-amber-400 shrink-0"
              title="Quick interactive tour to learn how the app works"
            >
              <Sparkles className="h-3 w-3 text-stone-950 animate-pulse" />
              <span>LIVE TOUR</span>
            </button>

            {/* Real CSV Export Toolbar Option (Rendered on all workspace pages/tabs) */}
            <div className="relative shrink-0">
              <button
                id="btn-global-export"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="text-[10px] font-mono font-bold tracking-wider text-emerald hover:bg-emerald/5 border border-gold/40 rounded-lg px-3 py-1.5 transition bg-white flex items-center gap-1.5 shadow-2xs select-none active:scale-95"
                title="Export Live Hub Reports"
              >
                <Download className="h-3 w-3 text-gold" />
                <span>EXPORT REPORTS</span>
                <ChevronDown className="h-3 w-3 text-emerald" />
              </button>

              {isExportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExportOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-stone-200/90 rounded-2xl shadow-xl z-50 divide-y divide-stone-100 font-sans p-1.5 antialiased">
                    <div className="px-3 py-2 text-[10px] font-mono font-bold text-stone-400 uppercase tracking-widest">
                      Live Database Sheets
                    </div>
                    <div className="py-1 space-y-0.5">
                      <button
                        onClick={() => { exportGuestsCSV(); setIsExportOpen(false); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-2.5 transition-colors"
                      >
                        <Users className="h-3.5 w-3.5 text-emerald-800" />
                        <span>Guests List & RSVP Status</span>
                      </button>
                      <button
                        onClick={() => { exportSuitesCSV(); setIsExportOpen(false); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-2.5 transition-colors"
                      >
                        <Bed className="h-3.5 w-3.5 text-emerald-800" />
                        <span>Palace Suites Occupancy</span>
                      </button>
                      <button
                        onClick={() => { exportItineraryCSV(); setIsExportOpen(false); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-2.5 transition-colors"
                      >
                        <Clock className="h-3.5 w-3.5 text-emerald-800" />
                        <span>Wedding Itinerary Agenda</span>
                      </button>
                      <button
                        onClick={() => { exportTransportCSV(); setIsExportOpen(false); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-2.5 transition-colors"
                      >
                        <Car className="h-3.5 w-3.5 text-emerald-800" />
                        <span>Pickups & Cab Schedule</span>
                      </button>
                      <button
                        onClick={() => { exportBudgetCSV(); setIsExportOpen(false); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-2.5 transition-colors"
                      >
                        <CircleDollarSign className="h-3.5 w-3.5 text-emerald-800" />
                        <span>Financial Budget Ledger</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => selectWeddingId(null)}
              className="text-[10px] font-mono font-bold tracking-wider text-stone-400 hover:text-stone-900 border border-stone-200/60 rounded-lg px-2.5 py-1 transition bg-stone-50 shrink-0"
            >
              ← SAAS HOME
            </button>
            <span id="header-wedding-title" className="font-semibold text-emerald bg-white font-serif italic px-3 py-1.5 rounded-lg border border-gold/45 shadow-2xs shrink-0 max-w-[150px] truncate">
              {weddingTitle}
            </span>
            {dbStatus === 'connected' ? (
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shadow-sm block animate-pulse shrink-0" title="Cloud Database Live"></span>
            ) : dbStatus === 'connecting' ? (
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse block shrink-0" title="Cloud Database Connecting"></span>
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 block shrink-0" title="Local-First Sandboxed Safe Mode"></span>
            )}
          </div>
        </header>

        {/* Dynamic Nested Content panel with custom spacer */}
        <div className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'guest-list' && <GuestList />}
          {activeTab === 'invitations' && <Invitations />}
          {activeTab === 'room-allocation' && <RoomAllocation />}
          {activeTab === 'transport' && <Transport />}
          {activeTab === 'squad-tasks' && <SquadTasks />}
          {activeTab === 'budget' && <Budget />}
          {activeTab === 'itinerary' && <Itinerary />}
          {activeTab === 'website-manager' && <AdminWebsiteManager />}
          {activeTab === 'rsvp-spreadsheet' && <RsvpSpreadsheet />}
          {activeTab === 'rsvp-settings' && <RsvpSettings />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>

      {/* 🚀 Persistent Global Interactive App Tour Portal */}
      {isTourActive && (
        <div className="fixed bottom-6 right-6 z-50 max-w-lg w-[calc(100vw-3rem)] md:w-128 bg-stone-900 border-2 border-amber-400 p-5 rounded-3xl shadow-2xl flex flex-col gap-4 text-stone-100 animate-fade-in antialiased">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-stone-950 rounded-lg">
                <Tv className="h-4 w-4 shrink-0" />
              </span>
              <div>
                <h4 className="font-serif text-sm font-black text-amber-400 tracking-wide">
                  Application Tour Walkthrough
                </h4>
                <p className="text-[10px] text-stone-400 font-mono">
                  STEP {tourStep + 1} OF {GLOBAL_TOUR_STEPS.length}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsTourActive(false)}
              className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors font-mono text-xs"
              title="Close Tour"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <h5 className="font-serif text-sm font-bold text-white tracking-wide">
              {GLOBAL_TOUR_STEPS[tourStep].title}
            </h5>
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              {GLOBAL_TOUR_STEPS[tourStep].description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-800">
            {GLOBAL_TOUR_STEPS[tourStep].actionId && (
              <button
                onClick={triggerShowMe}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-stone-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-stone-950 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Show Me: {GLOBAL_TOUR_STEPS[tourStep].actionLabel}</span>
              </button>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handlePrevStep}
                disabled={tourStep === 0}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 disabled:opacity-40 disabled:hover:bg-stone-800 text-stone-300 rounded-lg text-xs font-semibold transition"
              >
                Back
              </button>
              <button
                onClick={handleNextStep}
                className="px-4 py-1.5 bg-white hover:bg-stone-100 text-stone-950 rounded-lg text-xs font-bold transition"
              >
                {tourStep === GLOBAL_TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuestPortalRouteWrapper({ reservedNames }: { reservedNames: string[] }) {
  const { coupleName } = useParams<{ coupleName: string }>();
  const [searchParams] = useSearchParams();
  
  if (coupleName && reservedNames.includes(coupleName)) {
    return <NavigationWrapper />;
  }
  
  const isRsvpQuery = searchParams.has('guestId') || searchParams.has('g') || searchParams.get('page') === 'rsvp';
  if (isRsvpQuery) {
    return <PublicRSVP />;
  }
  
  return <GuestPortal />;
}

function PublicRSVPRouteWrapper({ reservedNames }: { reservedNames: string[] }) {
  const { coupleName } = useParams<{ coupleName: string }>();
  if (coupleName && reservedNames.includes(coupleName)) {
    return <NavigationWrapper />;
  }
  return <PublicRSVP />;
}

function AppRoutes() {
  const [searchParams] = useSearchParams();
  const coupleNameParam = searchParams.get('coupleName');

  const RESERVED_COUPLE_NAMES = ['dashboard', 'rsvp', 'tectell', 'login', 'admin'];

  if (coupleNameParam && !RESERVED_COUPLE_NAMES.includes(coupleNameParam)) {
    const isRsvpQuery = searchParams.has('guestId') || searchParams.has('g') || searchParams.get('page') === 'rsvp';
    if (isRsvpQuery) {
      return <PublicRSVP />;
    }
    return <GuestPortal />;
  }

  return (
    <Routes>
      {/* Explicit Administrative & System Routes */}
      <Route path="/dashboard" element={<NavigationWrapper />} />
      <Route path="/rsvp" element={<NavigationWrapper />} />
      <Route path="/tectell" element={<NavigationWrapper />} />
      <Route path="/login" element={<NavigationWrapper />} />
      
      {/* Dynamic Couple Name Route */}
      <Route 
        path="/:coupleName" 
        element={<GuestPortalRouteWrapper reservedNames={RESERVED_COUPLE_NAMES} />} 
      />
      <Route 
        path="/:coupleName/rsvp" 
        element={<PublicRSVPRouteWrapper reservedNames={RESERVED_COUPLE_NAMES} />} 
      />
      
      {/* Main App Switcher */}
      <Route path="/*" element={<NavigationWrapper />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContextProvider>
        <AppRoutes />
      </AppContextProvider>
    </BrowserRouter>
  );
}
