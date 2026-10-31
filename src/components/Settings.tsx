/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AdminUser } from '../types';
import { formatWeddingDate } from '../utils/formatters';
import MarketingBrochure from './MarketingBrochure';
import { 
  Key, 
  Mail, 
  User, 
  Shield, 
  Trash2, 
  Edit, 
  Settings as SettingsIcon, 
  X, 
  Check, 
  Heart,
  DollarSign,
  Calendar,
  MapPin
} from 'lucide-react';

export default function Settings() {
  const { 
    admins, 
    updateAdmin, 
    deleteAdmin,
    weddingTitle,
    setWeddingTitle,
    totalBudget,
    setTotalBudget,
    brideName,
    groomName,
    setBrideAndGroomNames,
    currentWedding,
    updateSaaSWedding
  } = useApp();

  // Find currently logged in admin user
  const loggedInAdminId = localStorage.getItem('wedding_logged_in_admin_id') || 'admin_default';
  const currentAdmin = admins.find(a => a.id === loggedInAdminId) || admins[0] || {
    id: 'admin_default',
    name: 'Main Admin',
    email: 'admin@wedding.com',
    role: 'Admin',
    password: 'devanshhelly2026'
  };

  // State for updating current admin credentials
  const [profileName, setProfileName] = useState(currentAdmin.name);
  const [profileEmail, setProfileEmail] = useState(currentAdmin.email);
  const [profilePassword, setProfilePassword] = useState(currentAdmin.password || '');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // State for editing wedding general info
  const [editTitle, setEditTitle] = useState(weddingTitle);
  const [editBudget, setEditBudget] = useState(totalBudget);
  const [editGroomName, setEditGroomName] = useState(groomName || 'Devansh');
  const [editBrideName, setEditBrideName] = useState(brideName || 'Helly');
  const [editWeddingDate, setEditWeddingDate] = useState(currentWedding?.weddingDate || '12th December 2026');
  const [editResortName, setEditResortName] = useState(currentWedding?.resortName || 'Taj Lake Palace, Udaipur');
  const [configSuccessMsg, setConfigSuccessMsg] = useState('');

  // Sync state if loading takes longer
  React.useEffect(() => {
    setEditTitle(weddingTitle);
  }, [weddingTitle]);

  React.useEffect(() => {
    if (groomName) setEditGroomName(groomName);
  }, [groomName]);

  React.useEffect(() => {
    if (brideName) setEditBrideName(brideName);
  }, [brideName]);

  React.useEffect(() => {
    if (currentWedding?.weddingDate) setEditWeddingDate(currentWedding.weddingDate);
    if (currentWedding?.resortName) setEditResortName(currentWedding.resortName);
  }, [currentWedding?.weddingDate, currentWedding?.resortName]);

  // Deletion Confirmation Modal State (To bypass iframe native alert/confirm issues!)
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);

  // Submit trigger for basic setting info (Wedding Title / Budget / Couple / Date / Venue)
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    setWeddingTitle(editTitle.trim());
    setTotalBudget(Number(editBudget));
    await setBrideAndGroomNames(editBrideName.trim(), editGroomName.trim());
    if (currentWedding) {
      await updateSaaSWedding({
        ...currentWedding,
        title: editTitle.trim(),
        groomName: editGroomName.trim(),
        brideName: editBrideName.trim(),
        weddingDate: formatWeddingDate(editWeddingDate.trim()),
        resortName: editResortName.trim(),
        totalBudget: Number(editBudget)
      });
    }
    setConfigSuccessMsg('Wedding parameters synchronized successfully!');
    setTimeout(() => setConfigSuccessMsg(''), 4000);
  };

  // Submit trigger to change logged-in admin's own credentials
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim() || !profilePassword.trim()) return;

    updateAdmin({
      ...currentAdmin,
      name: profileName.trim(),
      email: profileEmail.trim(),
      password: profilePassword.trim()
    });

    setProfileSuccessMsg('Credentials successfully updated! Use your new details next time you login.');
    setTimeout(() => setProfileSuccessMsg(''), 5000);
  };

  // Safe delete handler without using native browser confirm()!
  const triggerDeleteAdmin = (admin: AdminUser) => {
    if (admin.id === loggedInAdminId) {
      alert("Safety Lock: You cannot delete the account that is currently logged in!");
      return;
    }
    setAdminToDelete(admin);
  };

  const confirmDeleteAdmin = () => {
    if (adminToDelete) {
      deleteAdmin(adminToDelete.id);
      setAdminToDelete(null);
    }
  };

  return (
    <div id="settings-view-panel" className="space-y-8 animate-fade-in pb-12">
      
      {/* Title Header */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-800 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-emerald shrink-0" />
          <span>Users &amp; Safety Settings</span>
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          Manage administrator users, change passwords, and configure core wedding credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Manage Credentials (Username & Password) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gold/25 p-6 shadow-sm space-y-5">
            <h3 className="font-serif font-bold text-base text-stone-800 flex items-center gap-2 border-b border-stone-100 pb-3">
              <Key className="h-4.5 w-4.5 text-amber-500" />
              <span>My Account Settings</span>
            </h3>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-150 animate-fade-in text-center font-medium">
                {profileSuccessMsg}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    className="block w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald text-xs"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Login Email (Username)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    className="block w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald text-xs"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text" // Shown clearly for easiest password checks
                    required
                    className="block w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald text-xs font-mono font-medium"
                    placeholder="Enter password..."
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-[#1a2f26] border border-transparent hover:bg-emerald text-white rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"
                >
                  Save My Credentials
                </button>
              </div>
            </form>
          </div>

          {/* WEDDING GLOBAL CONFIG PARAMETERS CARD */}
          <div className="bg-white rounded-2xl border border-gold/25 p-6 shadow-sm space-y-5">
            <h3 className="font-serif font-bold text-base text-stone-800 flex items-center gap-2 border-b border-stone-100 pb-3">
              <Heart className="h-4.5 w-4.5 text-rose-500 fill-rose-100" />
              <span>Wedding Configuration</span>
            </h3>

            {configSuccessMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-150 text-center font-medium">
                {configSuccessMsg}
              </div>
            )}

            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Wedding Event Name/Title
                </label>
                <input
                  type="text"
                  required
                  className="block w-full px-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald text-xs font-serif"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Groom's Name (First Partner)
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full px-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald text-xs"
                    value={editGroomName}
                    onChange={(e) => setEditGroomName(e.target.value)}
                    placeholder="e.g. Devansh"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                    Bride's Name (Second Partner)
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full px-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald text-xs"
                    value={editBrideName}
                    onChange={(e) => setEditBrideName(e.target.value)}
                    placeholder="e.g. Helly"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    <span>Wedding Date</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full px-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald text-xs"
                    value={editWeddingDate}
                    onChange={(e) => setEditWeddingDate(e.target.value)}
                    placeholder="e.g. 12th December 2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-stone-400" />
                    <span>Venue / Destination</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full px-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald text-xs"
                    value={editResortName}
                    onChange={(e) => setEditResortName(e.target.value)}
                    placeholder="e.g. Taj Lake Palace, Udaipur"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1">
                  Total Budget Limit (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 text-xs font-semibold">₹</span>
                  <input
                    type="number"
                    required
                    className="block w-full pl-7 pr-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald text-xs"
                    value={editBudget}
                    onChange={(e) => setEditBudget(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald hover:bg-emerald-dark text-white rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm"
                >
                  Save Wedding Configuration
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Admin Users & Coordinators Directory */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gold/25 p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-800 flex items-center gap-2">
                  <Shield className="h-4.5 w-4.5 text-emerald" />
                  <span>Authorized Administrators</span>
                </h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Wedding team members who are authorized to log in and update the resort registry.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#faf9f6] text-stone-500 font-semibold border-b border-stone-100">
                    <th className="py-3 px-4">Authorized User Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Passcode Settings</th>
                    <th className="py-3 px-4">Permission Role</th>
                    {currentAdmin.isAdmin && <th className="py-3 px-4 text-right">Delete</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {admins.map(admin => {
                    const isSelf = admin.id === loggedInAdminId;
                    return (
                      <tr key={admin.id} className="hover:bg-[#faf9f6]/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-stone-800">
                          <div className="flex items-center gap-1.5">
                            <span>{admin.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 font-mono">{admin.email}</td>
                        <td className="py-3.5 px-4 text-stone-500 font-mono font-medium">
                          {admin.password ? `"${admin.password}"` : '••••••••'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                            admin.role === 'Admin'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100/60'
                              : admin.role === 'Organizer'
                              ? 'bg-purple-50 text-purple-700 border border-purple-100/60'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-100/60'
                          }`}>
                            {admin.role}
                          </span>
                          {admin.isAdmin && (
                            <span className="ml-1 inline-flex px-1.5 py-0.5 rounded-full text-[8px] font-extrabold bg-blue-50 text-blue-700 border border-blue-150 uppercase tracking-widest">
                              Super-Admin
                            </span>
                          )}
                        </td>
                        {currentAdmin.isAdmin && (
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => triggerDeleteAdmin(admin)}
                              className={`p-1.5 rounded-lg border border-transparent transition-colors ${
                                isSelf
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'hover:bg-rose-50 hover:border-rose-100 text-[#c53030]'
                              }`}
                              title={isSelf ? 'Cannot delete your own session account' : 'Revoke authorization'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-500/5 border border-amber-200/50 rounded-xl p-4 flex gap-3 text-stone-600">
              <Shield className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <p className="font-semibold text-stone-800">Wedding Access &amp; Sync Shield</p>
                <p className="mt-1">
                  Any administrator created here will be synchronized across our dual cloud storage system instantaneously. Coordinators can sign in to the panel of <strong>{weddingTitle || "the hosts'"}</strong> website anywhere around the globe with real-time replication.
                </p>
              </div>
            </div>
          </div>
          
          <MarketingBrochure />
        </div>

      </div>



      {/* SECURE DELETION SAFETY MODAL (In-App iframe safe replacement for window.confirm!) */}
      {adminToDelete && (
        <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center p-4 z-55 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-stone-200 p-6 space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-[#c53030] border border-rose-100 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="font-serif text-lg font-bold text-stone-800">Revoke User Access?</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Are you sure you want to permanently delete administrative credentials for <strong>{adminToDelete.name}</strong> ({adminToDelete.email})? They will lose all access instantly.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                className="flex-1 py-2 border border-stone-200 text-stone-600 text-xs font-semibold rounded-xl hover:bg-stone-50 transition"
              >
                Back (Keep User)
              </button>
              <button
                type="button"
                onClick={confirmDeleteAdmin}
                className="flex-1 py-2 bg-[#c53030] text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition"
              >
                Delete Access
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
