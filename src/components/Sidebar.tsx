/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import TectellLogo from './TectellLogo';
import {
  LayoutDashboard,
  Users,
  Bed,
  Car,
  CheckSquare,
  DollarSign,
  Calendar,
  LogOut,
  ExternalLink,
  Heart,
  Settings,
  X,
  Globe,
  FileSpreadsheet,
  Sliders,
  MessageSquare
} from 'lucide-react';

export type TabId =
  | 'dashboard'
  | 'guest-list'
  | 'invitations'
  | 'room-allocation'
  | 'transport'
  | 'squad-tasks'
  | 'budget'
  | 'itinerary'
  | 'settings'
  | 'website-manager'
  | 'rsvp-spreadsheet'
  | 'rsvp-settings';

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onLogout: () => void;
  onViewRSVP: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, onLogout, onViewRSVP, isOpen, onClose }: SidebarProps) {
  const { weddingTitle } = useApp();
  const menuItems = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'guest-list' as TabId, label: 'Event-Wise Guest List', icon: Users },
    { id: 'invitations' as TabId, label: 'Invitations & Reminders', icon: MessageSquare },
    { id: 'room-allocation' as TabId, label: 'Room Allocation', icon: Bed },
    { id: 'transport' as TabId, label: 'Transport', icon: Car },
    { id: 'squad-tasks' as TabId, label: 'Squad Tasks', icon: CheckSquare },
    { id: 'budget' as TabId, label: 'Budget & Vendors', icon: DollarSign },
    { id: 'itinerary' as TabId, label: 'Itinerary / Events', icon: Calendar },
    { id: 'website-manager' as TabId, label: 'Website Manager', icon: Globe },
    { id: 'rsvp-spreadsheet' as TabId, label: 'RSVP Spreadsheet', icon: FileSpreadsheet },
    { id: 'rsvp-settings' as TabId, label: 'RSVP Settings', icon: Sliders },
    { id: 'settings' as TabId, label: 'Users & Settings', icon: Settings },
  ];

  return (
    <aside 
      id="sidebar-container" 
      className={`fixed top-0 left-0 h-screen w-64 bg-emerald text-stone-100 flex flex-col border-r border-[#043427] z-40 shadow-xl transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Sidebar Header with Couple Name */}
      <div className="p-6 border-b border-white/10 flex flex-col items-center text-center relative">
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-1 text-stone-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer"
            title="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <Heart className="h-5 w-5 text-gold fill-gold mb-2 animate-pulse" />
        <h2 className="font-serif text-lg font-semibold tracking-wide text-white">
          {weddingTitle}
        </h2>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gold mt-1">
          Wedding Portal
        </p>
      </div>

      {/* Main Navigation Tab Buttons */}
      <nav className="flex-1 mt-4 px-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-btn-${item.id}`}
              onClick={() => {
                setActiveTab(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 text-white border-l-4 border-gold rounded-r-lg rounded-l-none font-semibold pl-3 shadow-sm'
                  : 'text-stone-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? 'text-gold' : 'text-stone-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions and Logout area */}
      <div className="p-4 border-t border-white/10 space-y-2">
        {/* View RSVP Live URL */}
        <button
          id="btn-view-rsvp-public"
          onClick={onViewRSVP}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-dark text-stone-100 hover:bg-[#032a1f] border border-gold/20 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-gold" />
            <span>Public RSVP Page</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-dark/80 border border-gold/45 text-gold font-mono uppercase font-semibold">Live</span>
        </button>

        {/* Logout */}
        <button
          id="btn-logout"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-950/20 hover:text-rose-200 transition-colors mb-2"
        >
          <LogOut className="h-3.5 w-3.5 text-rose-400" />
          <span>Sign Out</span>
        </button>

        <div className="pt-3 border-t border-white/5 text-center flex justify-center">
          <TectellLogo variant="light" size="sm" showText={true} className="opacity-40 hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </aside>
  );
}
