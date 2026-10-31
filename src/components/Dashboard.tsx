/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Bed, CheckSquare, IndianRupee, Clock, Award, Edit3 } from 'lucide-react';

export default function Dashboard() {
  const { guests, rooms, roomAssignments, tasks, expenses, totalBudget, itinerary, weddingTitle, setWeddingTitle, admins, currentWedding, updateSaaSWedding } = useApp();

  const loggedInAdminId = localStorage.getItem('wedding_logged_in_admin_id') || 'admin_default';
  const currentAdmin = admins?.find(a => a.id === loggedInAdminId) || admins?.[0];

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  // Metrics Calculations
  const totalGuestsCount = guests.length;
  const assignedGuestsCount = Object.keys(roomAssignments).length;
  const pendingTasksCount = tasks.filter(t => t.status !== 'Done').length;
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.paidAmount, 0);

  // Calculate live expected attendance for each itinerary event
  const attendanceData = itinerary.map(evt => {
    const rsvps = guests.filter(g => g.invitedEvents.includes(evt.id));
    const attendingCount = rsvps.filter(g => g.rsvp[evt.id] === 'Attending').length;
    const pendingCount = rsvps.filter(g => g.rsvp[evt.id] === 'Pending').length;
    const declinedCount = rsvps.filter(g => g.rsvp[evt.id] === 'Declined').length;
    
    return {
      eventId: evt.id,
      eventTitle: evt.title,
      attending: attendingCount,
      pending: pendingCount,
      declined: declinedCount,
      maxVal: Math.max(attendingCount + pendingCount, 1)
    };
  });

  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });

  const saveTitle = () => {
    if (tempTitle.trim()) {
      setWeddingTitle(tempTitle.trim());
      setIsEditingTitle(false);
    }
  };

  return (
    <div id="dashboard-tab" className="space-y-8 animate-fade-in">
      
      {/* Wedding Header Banner */}
      <div className="bg-gradient-to-r from-emerald to-emerald-dark rounded-2xl p-8 text-white relative overflow-hidden shadow-lg border border-gold/20">
        <div className="absolute top-0 right-0 w-64 h-full bg-no-repeat bg-right bg-contain opacity-5 transform scale-110 pointer-events-none"></div>
        <div className="relative z-10 space-y-4 max-w-2xl">
          <span className="text-gold font-serif italic text-sm tracking-widest block uppercase">Welcome back to the Admin Hub</span>
          
          {isEditingTitle ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-1 max-w-lg animate-fade-in">
              <input
                id="edit-wedding-title-input"
                type="text"
                className="bg-white/10 text-white font-serif text-2xl border-b-2 border-gold focus:outline-none focus:border-white py-1.5 px-3 rounded-lg w-full shadow-inner tracking-wide"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
              />
              <div className="flex gap-2 shrink-0">
                <button
                  id="btn-save-wedding-title"
                  onClick={saveTitle}
                  className="px-4 py-2 bg-gold hover:bg-yellow-600 text-emerald-dark font-sans text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                  Save Title
                </button>
                <button
                  id="btn-cancel-wedding-title"
                  onClick={() => setIsEditingTitle(false)}
                  className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white font-sans text-xs font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-wide flex items-center gap-3 group">
              <span id="wedding-title-display">{weddingTitle}</span>
              {currentAdmin?.isAdmin && (
                <button
                  id="btn-edit-wedding-title"
                  onClick={() => {
                    setTempTitle(weddingTitle);
                    setIsEditingTitle(true);
                  }}
                  className="p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-110 transition-all text-gold hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-gold/15 cursor-pointer"
                  title="Edit wedding name"
                >
                  <Edit3 className="h-4.5 w-4.5" />
                </button>
              )}
            </h1>
          )}

          <p className="text-stone-200 text-sm max-w-lg leading-relaxed">
            Oversee your big day's details—track dynamic RSVP responses event by event, allocate suites, manage guest transport logs, delegate family duties, and stay within your financial budget.
          </p>

          {currentWedding && (
            <div className="flex items-center gap-2 mt-4 bg-white/10 text-xs text-stone-100 py-1.5 px-3.5 rounded-full border border-white/10 w-fit">
              <span>License Expiry / Due Date: <strong>{currentWedding.expiresAt ? new Date(currentWedding.expiresAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric card 1: Total Guests */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gold/20 hover:border-gold/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Guests Added</span>
            <div className="p-2 rounded-lg bg-emerald/10 text-emerald">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 id="metric-total-guests" className="text-3xl font-bold text-emerald">{totalGuestsCount}</h4>
            <p className="text-xs text-stone-550">
              Bride side ({guests.filter(g => g.side === 'Bride').length}) • Groom side ({guests.filter(g => g.side === 'Groom').length})
            </p>
          </div>
        </div>

        {/* Metric card 2: Total Rooms Assigned */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gold/20 hover:border-gold/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Rooms Occupied</span>
            <div className="p-2 rounded-lg bg-emerald/10 text-emerald">
              <Bed className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 id="metric-rooms-assigned" className="text-3xl font-bold text-emerald">
              {assignedGuestsCount} <span className="text-sm font-medium text-stone-500">guests placed</span>
            </h4>
            <p className="text-xs text-stone-550">
              Across {rooms.length} configured Palace Suites
            </p>
          </div>
        </div>

        {/* Metric card 3: Total Tasks Pending */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gold/20 hover:border-gold/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Pending Squad Tasks</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <CheckSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 id="metric-tasks-pending" className="text-3xl font-bold text-stone-850">{pendingTasksCount}</h4>
            <p className="text-xs text-stone-550">
              Out of {tasks.length} delegated crew duties
            </p>
          </div>
        </div>

        {/* Metric card 4: Total Budget Spent */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gold/20 hover:border-gold/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Spent (Paid)</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 id="metric-budget-spent" className="text-2xl font-bold text-[#1a1a1a]">
              {currencyFormatter.format(totalSpent)}
            </h4>
            <p className="text-xs text-stone-550">
              Budget: {currencyFormatter.format(totalBudget)}
            </p>
          </div>
        </div>

      </div>

      {/* Visual Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Attendance Bar Chart Card */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gold/20 lg:col-span-2 space-y-6">
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-800">Event-Wise Expected Attendance</h3>
            <p className="text-xs text-stone-500 mt-1">
              Counts are compiled directly and in real-time from active guest RSVP submissions.
            </p>
          </div>

          <div className="space-y-6">
            {attendanceData.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-sm">
                Welcome to Tectell Wedding Management. No events currently configured. Add events in the Itinerary tab!
              </div>
            ) : (
              attendanceData.map(data => {
                const totalAnswers = data.attending + data.pending + data.declined;
                const attendPct = totalAnswers > 0 ? (data.attending / totalGuestsCount) * 100 : 0;
                const pendPct = totalAnswers > 0 ? (data.pending / totalGuestsCount) * 100 : 0;
                
                return (
                  <div key={data.eventId} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-xs font-medium">
                      <span className="text-stone-700 font-semibold text-sm">{data.eventTitle}</span>
                      <div className="flex flex-wrap gap-2 sm:gap-4 text-[11px] sm:text-xs font-mono">
                        <span className="text-emerald-700 font-bold">{data.attending} Attending</span>
                        <span className="text-amber-500 font-bold">{data.pending} Pending</span>
                        <span className="text-stone-400">{data.declined} Declined</span>
                      </div>
                    </div>

                    {/* Styled Multi-Segment Progress bar */}
                    <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex shadow-inner relative">
                      {data.attending > 0 && (
                        <div
                          style={{ width: `${Math.max(attendPct, 5)}%` }}
                          className="bg-emerald h-full transition-all duration-500"
                          title={`${data.attending} Attending`}
                        ></div>
                      )}
                      
                      {data.pending > 0 && (
                        <div
                          style={{ width: `${Math.max(pendPct, 5)}%` }}
                          className="bg-gold h-full transition-all duration-500"
                          title={`${data.pending} Pending`}
                        ></div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-6 pt-4 border-t border-stone-50 justify-end text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-800">
              <span className="h-3 w-3 rounded-full bg-emerald-700 block"></span>
              Confirmed Attending
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="h-3 w-3 rounded-full bg-amber-400 block"></span>
              Awaiting RSVP Choice
            </span>
          </div>
        </div>

        {/* Wedding Highlights Recap info */}
        <div className="bg-navy text-white rounded-2xl p-6 border border-gold/20 flex flex-col justify-between space-y-6 shadow-lg">
          <div className="space-y-4">
            <span className="p-2 rounded-xl bg-white/10 text-gold inline-flex">
              <Award className="h-5 w-5" />
            </span>
            <h3 className="font-serif text-lg font-bold text-gold">Wedding Status Summary</h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-stone-300">RSVP Coverage</span>
                <span className="font-mono font-bold text-white">
                  {Math.round(((guests.filter(g => {
                    // check if fully selected (none are left pending)
                    return Object.values(g.rsvp).every(status => status !== 'Pending');
                  }).length) / Math.max(guests.length, 1)) * 100)}% Completed
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-stone-300">Room Allocation rate</span>
                <span className="font-mono font-bold text-white">
                  {Math.round((assignedGuestsCount / Math.max(guests.length, 1)) * 100)}% Assigned
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-stone-300">Budget Progress</span>
                <span className="font-mono font-bold text-white">
                  {Math.round((totalSpent / Math.max(totalBudget, 1)) * 100)}% Paid
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-stone-300">Squad Task Completion</span>
                <span className="font-mono font-bold text-white">
                  {Math.round((tasks.filter(t => t.status === 'Done').length / Math.max(tasks.length, 1)) * 100)}% Finished
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald/20 border border-gold/30 rounded-xl space-y-1.5 text-xs text-stone-200">
            <p className="font-serif italic font-semibold text-white">"May your marriage be built on deep coordination, friendship, and eternal joy!"</p>
            <p className="font-mono text-[10px] text-gold text-right">— Wedding Organizers</p>
          </div>
        </div>

      </div>

    </div>
  );
}
