import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SaaSWedding } from '../types';
import TectellLogo from './TectellLogo';
import { generateCredentialsPDF } from '../utils/pdfGenerator';
import { 
  Key, 
  Trash2, 
  Lock, 
  Unlock, 
  Plus, 
  Sparkles, 
  LogOut, 
  Calendar,
  Layers,
  Palette,
  Layout,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Edit,
  X,
  Clock,
  Download
} from 'lucide-react';

interface TectellSuperAdminProps {
  onNavigate?: (path: string) => void;
}

export default function TectellSuperAdmin({ onNavigate }: TectellSuperAdminProps) {
  const { 
    allWeddings, 
    createSaaSWedding, 
    updateSaaSWedding, 
    deleteSaaSWedding,
    selectWeddingId,
    setSuperAdminMode
  } = useApp();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // New Wedding Form States
  const [newId, setNewId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newResortName, setNewResortName] = useState('Udaipur Palace Resort Hub');
  const [newOwner, setNewOwner] = useState('');
  const [newEmail, setNewEmail] = useState('admin@wedding.com');
  const [newPassword, setNewPassword] = useState('devanshhelly2026');
  const [newTotalBudget, setNewTotalBudget] = useState(String(8500000));
  const [newColorTheme, setNewColorTheme] = useState<'emerald' | 'rose' | 'indigo' | 'amber' | 'burgundy'>('emerald');
  const [newBrideName, setNewBrideName] = useState('');
  const [newGroomName, setNewGroomName] = useState('');
  const [newActiveMonths, setNewActiveMonths] = useState('12');
  const [seedDemo, setSeedDemo] = useState(true);

  // Edit Tenant Modal States
  const [editingWedding, setEditingWedding] = useState<SaaSWedding | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBrideName, setEditBrideName] = useState('');
  const [editGroomName, setEditGroomName] = useState('');
  const [editResortName, setEditResortName] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editTotalBudget, setEditTotalBudget] = useState('');
  const [editColorTheme, setEditColorTheme] = useState<'emerald' | 'rose' | 'indigo' | 'amber' | 'burgundy'>('emerald');
  const [editActiveMonths, setEditActiveMonths] = useState('12');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extend Validity States
  const [extendingWedding, setExtendingWedding] = useState<SaaSWedding | null>(null);
  const [extensionMonths, setExtensionMonths] = useState<number>(12);
  const [deletingWedding, setDeletingWedding] = useState<SaaSWedding | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'tectellmaster' || passwordInput === 'tectell2026') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Unauthorized Secret Key. Please try again.');
    }
  };

  const handleCreateWedding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const slug = newId.trim().toLowerCase().replace(/\s+/g, '_');
    if (!slug) {
      setFormError('Identifier slug is required.');
      return;
    }

    if (allWeddings.some(w => w.id === slug)) {
      setFormError(`Wedding ID "${slug}" is already registered. Choose a unique url slug.`);
      return;
    }

    if (!newTitle.trim()) {
      setFormError('Wedding Title is required.');
      return;
    }

    setIsSubmitting(true);
    const parts = newTitle.trim().split(/[♥&+]|and/i).map(s => s.trim());
    const bride = newBrideName.trim() || parts[1] || "";
    const groom = newGroomName.trim() || parts[0] || "";

    const newSaaS: Omit<SaaSWedding, 'createdAt'> = {
      id: slug,
      title: newTitle.trim(),
      resortName: newResortName.trim(),
      ownerName: newOwner.trim() || 'Prestige Client',
      adminEmail: newEmail.trim() || 'admin@wedding.com',
      adminPassword: newPassword,
      totalBudget: Number(newTotalBudget) || 1200000,
      colorTheme: newColorTheme,
      status: 'active',
      brideName: bride,
      groomName: groom,
      activeMonths: Number(newActiveMonths) || 12,
      expiresAt: new Date(new Date().setMonth(new Date().getMonth() + (Number(newActiveMonths) || 12))).toISOString()
    };

    const success = await createSaaSWedding(newSaaS, seedDemo);
    setIsSubmitting(false);

    if (success) {
      setFormSuccess(`SaaS Wedding Workspace "${slug}" successfully provisioned on Firestore! Credentials PDF generated and downloaded automatically.`);
      
      // Auto-generate and download credentials PDF
      const createdWedding: SaaSWedding = {
        ...newSaaS,
        createdAt: new Date().toISOString()
      };
      generateCredentialsPDF(createdWedding, window.location.origin);

      // Reset form
      setNewId('');
      setNewTitle('');
      setNewOwner('');
      setNewBrideName('');
      setNewGroomName('');
    } else {
      setFormError('Firestore batch failed. Verify security rules or connection node.');
    }
  };

  const toggleLockStatus = async (wedding: SaaSWedding) => {
    const nextStatus = wedding.status === 'active' ? 'locked' : 'active';
    const updated: SaaSWedding = {
      ...wedding,
      status: nextStatus
    };
    await updateSaaSWedding(updated);
  };

  const handleDeleteWedding = async (id: string) => {
    await deleteSaaSWedding(id);
    setDeletingWedding(null);
  };

  const openEditModal = (w: SaaSWedding) => {
    setEditingWedding(w);
    setEditTitle(w.title);
    setEditBrideName(w.brideName || '');
    setEditGroomName(w.groomName || '');
    setEditResortName(w.resortName);
    setEditOwner(w.ownerName || '');
    setEditEmail(w.adminEmail);
    setEditPassword(w.adminPassword || '');
    setEditTotalBudget(String(w.totalBudget));
    setEditColorTheme(w.colorTheme);
    setEditActiveMonths(String(w.activeMonths || 12));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWedding) return;

    // Calculate expiresAt relative to original creation date or current date
    const baseDate = editingWedding.createdAt ? new Date(editingWedding.createdAt) : new Date();
    const countMonths = Number(editActiveMonths) || 12;
    // Set months
    const targetExpiresDate = new Date(baseDate);
    targetExpiresDate.setMonth(targetExpiresDate.getMonth() + countMonths);
    const nextExpires = targetExpiresDate.toISOString();

    const parts = editTitle.trim().split(/[♥&+]|and/i).map(s => s.trim());
    const bride = editBrideName.trim() || parts[1] || "";
    const groom = editGroomName.trim() || parts[0] || "";

    const updatedSaaS: SaaSWedding = {
      ...editingWedding,
      title: editTitle.trim(),
      brideName: bride,
      groomName: groom,
      resortName: editResortName.trim(),
      ownerName: editOwner.trim() || 'Prestige Client',
      adminEmail: editEmail.trim(),
      adminPassword: editPassword,
      totalBudget: Number(editTotalBudget) || 1200000,
      colorTheme: editColorTheme,
      activeMonths: countMonths,
      expiresAt: nextExpires
    };

    const success = await updateSaaSWedding(updatedSaaS);
    if (success) {
      setEditingWedding(null);
    } else {
      alert("Failed to update on Cloud Firestore.");
    }
  };

  const handleExtendValidity = async (wedding: SaaSWedding, months: number) => {
    const currentExpiry = wedding.expiresAt ? new Date(wedding.expiresAt) : new Date();
    // Use current time if already expired
    const baseDate = currentExpiry.getTime() < Date.now() ? new Date() : currentExpiry;

    const extendedExpiry = new Date(baseDate);
    extendedExpiry.setMonth(extendedExpiry.getMonth() + months);

    const updated: SaaSWedding = {
      ...wedding,
      activeMonths: (wedding.activeMonths || 12) + months,
      expiresAt: extendedExpiry.toISOString()
    };

    const success = await updateSaaSWedding(updated);
    if (success) {
      setExtendingWedding(null);
    } else {
      alert("Failed to extend validity on Cloud Firestore.");
    }
  };

  const handleLaunchWedding = (id: string) => {
    setSuperAdminMode(false);
    selectWeddingId(id);
    if (onNavigate) {
      onNavigate('/dashboard');
    }
  };

  if (!isAuthenticated) {
    return (
      <div id="super-admin-auth-container" className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-500/10 rounded-full blur-3xl -z-10" />

        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center space-y-6">
          <div className="flex flex-col items-center space-y-4 mb-2">
            <TectellLogo variant="light" size="md" showText={true} />
            <div className="h-[1px] w-20 bg-stone-800" />
            <div className="h-10 w-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              <Key className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="font-serif text-lg font-bold text-white tracking-wide">SaaS Admin Controller</h2>
            <p className="text-[10px] text-stone-400 leading-relaxed font-sans">Provide the master passcode to authenticate SaaS licensing tools.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase">Master Access Code</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError('');
                }}
                placeholder="••••••••••••"
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500/50 rounded-xl px-4 py-3 text-sm focus:outline-none text-white placeholder:text-stone-700"
              />
              {authError && (
                <p className="text-[10px] font-semibold text-rose-500 pt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl shadow-md transition uppercase tracking-widest"
            >
              Authenticate System
            </button>
          </form>

          <p className="text-[10px] font-mono text-stone-600 pt-2">
            Default sandbox key is <code className="text-amber-500/70 font-bold">tectellmaster</code> or <code className="text-amber-500/70 font-bold">tectell2026</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="super-admin-layout" className="min-h-screen bg-stone-950 text-stone-100 font-sans p-6 antialiased">
      
      {/* Header Panel */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-800 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <TectellLogo variant="light" size="md" showText={true} />
          <div className="h-8 w-px bg-stone-800 hidden sm:block" />
          <div>
            <h1 className="font-serif font-bold text-base text-stone-300">Wedding SaaS Controller</h1>
            <p className="text-[10px] font-mono text-sky-400/80 tracking-wider font-semibold">GLOBAL DIRECTORY MULTI-TENANCY CONTROL PORTAL</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSuperAdminMode(false);
              selectWeddingId(null);
              // Clear any hash and search parameter and redirect to the root landing page cleanly
              window.history.pushState(null, '', '/');
              window.location.href = '/';
            }}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-850 border border-stone-800 rounded-xl text-xs font-semibold text-stone-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit Admin Center
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Provision Section */}
        <section className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-6 h-fit">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-amber-500" />
            <h3 className="font-serif text-lg font-bold text-white">Provision New Portal</h3>
          </div>

          <form onSubmit={handleCreateWedding} className="space-y-4 font-sans text-xs">
            {formError && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-900 text-rose-300 rounded-xl flex items-start gap-1.5 leading-normal">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-900 text-emerald-300 rounded-xl flex items-start gap-1.5 leading-normal">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Wedding ID Slug</label>
                <input
                  type="text"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value.toLowerCase())}
                  placeholder="royal_jaipur"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 text-white placeholder:text-stone-700"
                  required
                />
                <span className="text-[9px] text-stone-500 font-mono">e.g., weddings/royal_jaipur</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Wedding Couple Name</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ananya ♥ Kabir"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 text-white placeholder:text-stone-700"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Bride / Partner 1 Name</label>
                <input
                  type="text"
                  value={newBrideName}
                  onChange={(e) => setNewBrideName(e.target.value)}
                  placeholder="e.g. Ananya"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 text-white placeholder:text-stone-700"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Groom / Partner 2 Name</label>
                <input
                  type="text"
                  value={newGroomName}
                  onChange={(e) => setNewGroomName(e.target.value)}
                  placeholder="e.g. Kabir"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 text-white placeholder:text-stone-700"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Luxury Resort/Venue</label>
                <input
                  type="text"
                  value={newResortName}
                  onChange={(e) => setNewResortName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Owner/Customer Name</label>
                <input
                  type="text"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="Mrs. Rajkumari Gupta"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Dashboard Email login</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Email Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Luxury Color Theme</label>
                <div className="relative">
                  <select
                    value={newColorTheme}
                    onChange={(e) => setNewColorTheme(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
                  >
                    <option value="emerald">Emerald & Rich Gold (Heritage Palace)</option>
                    <option value="rose">Pastel Rose & Blush Ivory (Romande)</option>
                    <option value="indigo">Navy Indigo & Silver (Majestic Fort)</option>
                    <option value="amber">Jaipur Amber & Orange (Sangeet Sizzler)</option>
                    <option value="burgundy">Velvet Burgundy (Luxury Castle)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">First Activation Stage (Months)</label>
              <input
                type="number"
                min="1"
                required
                value={newActiveMonths}
                onChange={(e) => setNewActiveMonths(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                placeholder="e.g. 12"
              />
              <span className="text-[9px] text-stone-500 font-mono italic block">Determines the portal's initial licensed active timeframe (e.g. 12 months)</span>
            </div>

            <div className="flex items-center gap-2 p-3 bg-stone-950 border border-stone-800 rounded-2xl">
              <input
                type="checkbox"
                id="seed-demo-chk"
                checked={seedDemo}
                onChange={(e) => setSeedDemo(e.target.checked)}
                className="h-4 w-4 bg-stone-900 rounded border-stone-800 text-amber-500 focus:ring-0"
              />
              <label htmlFor="seed-demo-chk" className="text-stone-400 font-semibold cursor-pointer select-none">
                Pre-populate with active demo items (RSVPs, Suites, Log)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl shadow-md transition uppercase tracking-widest disabled:opacity-50"
            >
              {isSubmitting ? 'Provisioning Cloud...' : 'Register Wedding Workspace'}
            </button>
          </form>
        </section>

        {/* Global Weddings Directory Section */}
        <section className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-500" />
              <h3 className="font-serif text-lg font-bold text-white">Cloud Workspace Registry</h3>
            </div>
            <span className="text-xs font-mono font-bold text-stone-400 px-2 py-0.5 bg-stone-950 rounded-lg border border-stone-850">
              Total tenants: {allWeddings.length}
            </span>
          </div>

          {allWeddings.length === 0 ? (
            <p className="text-stone-500 text-xs italic py-12 text-center">No active SaaS registry lists found. Use the panel on the left to provision your first customer ID.</p>
          ) : (
            <div className="divide-y divide-stone-800 border border-stone-800 rounded-2xl bg-stone-950 overflow-hidden font-sans text-xs">
              {allWeddings.map(w => {
                const isLocked = w.status === 'locked';
                let themeBadge = "bg-emerald-950 border border-emerald-800 text-emerald-350";
                if (w.colorTheme === 'rose') themeBadge = "bg-rose-950 border border-rose-800 text-rose-350";
                if (w.colorTheme === 'indigo') themeBadge = "bg-blue-950 border border-blue-800 text-blue-350";
                if (w.colorTheme === 'amber') themeBadge = "bg-amber-950 border border-amber-800 text-amber-450";
                if (w.colorTheme === 'burgundy') themeBadge = "bg-red-950 border border-red-800 text-red-300";

                return (
                  <div key={w.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-900/50 transition">
                    
                    {/* Metatabs */}
                    <div className="space-y-1.5 max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-white">{w.title}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded capitalize ${themeBadge}`}>
                          {w.colorTheme}
                        </span>
                        {isLocked && (
                          <span className="text-[9px] font-mono font-bold bg-rose-950 border border-rose-900 text-rose-400 px-1.5 py-0.2 rounded flex items-center gap-0.5 uppercase">
                            <Lock className="h-2.5 w-2.5" /> Locked
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-stone-400 space-y-0.5">
                        <div><strong className="text-stone-500 font-semibold">Resort:</strong> {w.resortName}</div>
                        <div><strong className="text-stone-500 font-semibold">ID Slug:</strong> <code className="text-amber-500/70 font-bold font-mono">{w.id}</code></div>
                        <div><strong className="text-stone-500 font-semibold">Owner Contact:</strong> {w.ownerName} ({w.adminEmail})</div>
                        <div><strong className="text-stone-500 font-semibold">Admin Login:</strong> <code className="bg-stone-900 px-1 py-0.5 text-[10px] text-stone-300 font-mono select-all rounded">{w.adminEmail}</code></div>
                        <div><strong className="text-stone-500 font-semibold">Admin Password:</strong> <code className="bg-stone-900 px-1 py-0.5 text-[10px] text-stone-300 font-mono select-all rounded font-semibold">{w.adminPassword || 'N/A'}</code></div>
                        <div><strong className="text-stone-500 font-semibold">Allocated Budget:</strong> ${w.totalBudget?.toLocaleString()}</div>
                        <div className="flex items-center gap-1.5 text-amber-400 bg-stone-900/40 p-1.5 rounded-lg border border-stone-800/80 mt-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            Licensing Plan: <strong className="text-white font-mono">{w.activeMonths || 12}</strong> mo 
                            {w.expiresAt ? ` (Expires: ${new Date(w.expiresAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center">
                      
                      {/* Edit Portal Profile Button */}
                      <button
                        onClick={() => openEditModal(w)}
                        className="p-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-amber-400 hover:text-amber-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                        title="Edit Settings or Change Password"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit Settings</span>
                      </button>

                      {/* Extend Validity Button */}
                      <button
                        onClick={() => {
                          setExtendingWedding(w);
                          setExtensionMonths(12);
                        }}
                        className="p-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Extend License Validity"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Extend</span>
                      </button>

                      {/* Subscription Lock Toggle */}
                      <button
                        onClick={() => toggleLockStatus(w)}
                        className={`p-2 rounded-xl transition-all border flex items-center justify-center gap-1 ${
                          isLocked 
                            ? 'bg-rose-950 border-rose-900 text-rose-400 hover:bg-rose-900' 
                            : 'bg-[#1c1917] hover:bg-stone-800 border-stone-850 text-stone-400'
                        }`}
                        title={isLocked ? "Unlock Profile" : "Lock Profile (Plan Over)"}
                      >
                        {isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        <span className="text-[10px] font-bold uppercase">{isLocked ? 'Unlock' : 'Lock'}</span>
                      </button>

                      {/* Download Credentials Button */}
                      <button
                        onClick={() => generateCredentialsPDF(w, window.location.origin)}
                        className="p-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                        title="Download Credentials PDF"
                      >
                        <Download className="h-3.5 w-3.5 text-amber-500" />
                        <span>Credentials</span>
                      </button>

                      {/* Launch Portal button */}
                      <button
                        onClick={() => handleLaunchWedding(w.id)}
                        className="p-2 bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-bold rounded-xl transition flex items-center gap-1"
                        title="Open Destination Dashboard"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Launch</span>
                      </button>

                      {/* Delete Workspace Button */}
                      <button
                        onClick={() => setDeletingWedding(w)}
                        className="p-2 hover:bg-rose-950 hover:text-rose-400 text-stone-500 hover:border-rose-900 rounded-xl transition border border-transparent cursor-pointer"
                        title="Delete Entire Workspace"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Premium Edit Tenant Modal Dialog */}
      {editingWedding && (
        <div id="edit-tenant-modal" className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 my-8 relative text-left">
            <button
              onClick={() => setEditingWedding(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-xl bg-stone-950 hover:bg-stone-800 transition shadow-sm"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Edit Client Workspace Settings</h3>
                <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mt-0.5">WORKSPACE ID: {editingWedding.id}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 font-sans text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Wedding Title / Couple Name</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Bride / Partner 1 Name</label>
                  <input
                    type="text"
                    required
                    value={editBrideName}
                    onChange={(e) => setEditBrideName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Groom / Partner 2 Name</label>
                  <input
                    type="text"
                    required
                    value={editGroomName}
                    onChange={(e) => setEditGroomName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Resort / Venue Destination</label>
                  <input
                    type="text"
                    required
                    value={editResortName}
                    onChange={(e) => setEditResortName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Owner Name</label>
                  <input
                    type="text"
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Admin Email Login</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Admin Password</label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">Luxury Branding Color</label>
                  <select
                    value={editColorTheme}
                    onChange={(e) => setEditColorTheme(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="emerald">Emerald & Rich Gold</option>
                    <option value="rose">Pastel Rose & Blush Ivory</option>
                    <option value="indigo">Navy Indigo & Silver</option>
                    <option value="amber">Jaipur Amber & Orange</option>
                    <option value="burgundy">Velvet Burgundy</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 bg-stone-950 p-3 rounded-2xl border border-stone-850">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block">License Activation Period (Months)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editActiveMonths}
                  onChange={(e) => setEditActiveMonths(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[9px] text-stone-500 mt-1 block leading-normal font-medium">
                  Extending/modifying the activation months dynamically computes the license expiry relative to the initial workspace establishment date.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingWedding(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 hover:bg-stone-800 hover:text-white transition text-stone-400 font-bold tracking-wider text-[10px] uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl font-bold tracking-wider text-[10px] uppercase shadow-md transition text-stone-900"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Validity Modal */}
      {extendingWedding && (
        <div id="extend-validity-modal" className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-6 relative text-left font-sans">
            <button
              onClick={() => setExtendingWedding(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-xl bg-stone-950 hover:bg-stone-800 transition shadow-sm cursor-pointer"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Extend License Validity</h3>
                <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mt-0.5">{extendingWedding.title}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-stone-300">
              <p>
                Current Expiry: <strong className="text-white font-mono">{extendingWedding.expiresAt ? new Date(extendingWedding.expiresAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}</strong>
              </p>

              <div className="space-y-2">
                <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block font-semibold">Extension Duration (Months)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 3, 6, 12, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExtensionMonths(m)}
                      className={`py-2 px-3 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer ${
                        extensionMonths === m
                          ? 'bg-amber-500 text-stone-900 border-amber-500'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850 hover:text-white'
                      }`}
                    >
                      {m} {m === 12 ? 'Yr (12)' : m === 24 ? '2 Yrs (24)' : `Mo (${m})`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setExtensionMonths(0)}
                    className={`py-2 px-3 rounded-xl border text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      ![1, 3, 6, 12, 24].includes(extensionMonths)
                        ? 'bg-amber-500 text-stone-900 border-amber-500'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850 hover:text-white'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {![1, 3, 6, 12, 24].includes(extensionMonths) && (
                <div className="space-y-1">
                  <label className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block font-semibold">Enter Custom Months</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="E.g. 18"
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (val > 0) setExtensionMonths(val);
                    }}
                  />
                </div>
              )}

              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-850 space-y-1">
                <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider block font-semibold">Projected New Due Date</span>
                <span className="text-white font-bold font-mono text-sm block">
                  {(() => {
                    const currentExpiry = extendingWedding.expiresAt ? new Date(extendingWedding.expiresAt) : new Date();
                    const baseDate = currentExpiry.getTime() < Date.now() ? new Date() : currentExpiry;
                    const proj = new Date(baseDate);
                    proj.setMonth(proj.getMonth() + (extensionMonths || 1));
                    return proj.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
                  })()}
                </span>
                <span className="text-[9px] text-stone-500 block leading-normal pt-1 border-t border-stone-900/60 font-medium">
                  Calculated by adding the extension period onto the workspace's remaining license time (or starting today if expired).
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExtendingWedding(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 hover:bg-stone-800 hover:text-white transition text-stone-400 font-bold tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExtendValidity(extendingWedding, extensionMonths || 1)}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl font-bold tracking-wider text-[10px] uppercase shadow-md transition text-stone-900 cursor-pointer"
                >
                  Confirm Extension
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal Dialog */}
      {deletingWedding && (
        <div id="delete-confirmation-modal" className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-6 relative text-left font-sans">
            <button
              onClick={() => setDeletingWedding(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-xl bg-stone-950 hover:bg-stone-800 transition shadow-sm cursor-pointer"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Confirm Workspace Deletion</h3>
                <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest mt-0.5">{deletingWedding.title}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs text-stone-300">
              <p className="leading-relaxed text-stone-300">
                Are you sure you want to permanently delete the wedding workspace <strong className="text-white font-semibold">"{deletingWedding.title}"</strong>?
              </p>
              <p className="text-rose-400 font-semibold leading-relaxed bg-rose-950/40 p-3.5 rounded-2xl border border-rose-900/50">
                CRITICAL WARNING: This action is completely irreversible. All associated guest RSVPs, suite accommodations, itineraries, expenses, transport bookings, and coordinator logs will be permanently erased.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingWedding(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 hover:bg-stone-800 hover:text-white transition text-stone-400 font-bold tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteWedding(deletingWedding.id)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-750 text-white rounded-xl font-bold tracking-wider text-[10px] uppercase shadow-md transition cursor-pointer"
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
