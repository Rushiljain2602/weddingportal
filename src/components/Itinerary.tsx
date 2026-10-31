/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ItineraryEvent } from '../types';
import { formatWeddingDate, resolveWeddingMessageDateAndVenue, sortItineraryEvents } from '../utils/formatters';
import { Clock, MapPin, Award, Plus, Edit2, Trash2, X, Calendar, Download, ExternalLink, Sparkles, Star, Check } from 'lucide-react';

export default function Itinerary() {
  const { 
    itinerary, 
    addItineraryEvent, 
    updateItineraryEvent, 
    deleteItineraryEvent, 
    currentWedding, 
    updateSaaSWedding, 
    currentWeddingId 
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);

  // Delete confirm state to bypass iframe native prompt barriers
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [endTime, setEndTime] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [isMainWeddingDate, setIsMainWeddingDate] = useState(false);

  // Calculate the currently resolved message ceremony from itinerary
  const resolvedMessageCeremony = resolveWeddingMessageDateAndVenue(itinerary, currentWedding);

  // Sort events chronologically by date and time
  const sortedItinerary = sortItineraryEvents(itinerary);

  const openFormModal = (evt: ItineraryEvent | null = null) => {
    if (evt) {
      setEditingEvent(evt);
      setTitle(evt.title);
      setDate(evt.date);
      setTime(evt.time);
      setVenue(evt.venue);
      setDressCode(evt.dressCode);
      setEndTime(evt.endTime || '');
      setGoogleMapsUrl(evt.googleMapsUrl || '');
      setIsMainWeddingDate(Boolean(evt.isMainWeddingDate || evt.useForMessaging || evt.id === resolvedMessageCeremony.matchedEventId));
    } else {
      setEditingEvent(null);
      setTitle('');
      const defaultDate = sortedItinerary[0]?.date || currentWedding?.weddingDate?.split('T')[0] || '';
      setDate(defaultDate);
      setTime('');
      setVenue(currentWedding?.resortName || '');
      setDressCode('');
      setEndTime('');
      setGoogleMapsUrl('');
      // If no ceremonies exist yet, default checkbox to true for the first ceremony
      const hasAnyMain = itinerary.some(e => e.isMainWeddingDate || e.useForMessaging);
      setIsMainWeddingDate(!hasAnyMain);
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const trimmedTitle = title.trim();
    const trimmedDate = date.trim();
    const trimmedVenue = venue.trim() || 'TBD';

    if (editingEvent) {
      const updatedEvent: ItineraryEvent = {
        ...editingEvent,
        title: trimmedTitle,
        date: trimmedDate,
        time: time.trim() || 'TBD',
        venue: trimmedVenue,
        dressCode: dressCode.trim() || 'Comfortable / Traditional',
        endTime: endTime.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        isMainWeddingDate: isMainWeddingDate,
        useForMessaging: isMainWeddingDate
      };
      await updateItineraryEvent(updatedEvent);

      if (isMainWeddingDate) {
        // Clear flag from any other events
        itinerary.forEach(other => {
          if (other.id !== editingEvent.id && (other.isMainWeddingDate || other.useForMessaging)) {
            updateItineraryEvent({
              ...other,
              isMainWeddingDate: false,
              useForMessaging: false
            });
          }
        });

        // Synchronize wedding document metadata
        if (currentWeddingId && updateSaaSWedding) {
          updateSaaSWedding(currentWeddingId, {
            weddingDate: trimmedDate,
            resortName: trimmedVenue !== 'TBD' ? trimmedVenue : currentWedding?.resortName
          });
        }
      }
    } else {
      const newEvt: Omit<ItineraryEvent, 'id'> = {
        title: trimmedTitle,
        date: trimmedDate,
        time: time.trim() || 'TBD',
        venue: trimmedVenue,
        dressCode: dressCode.trim() || 'Comfortable / Traditional',
        endTime: endTime.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        isMainWeddingDate: isMainWeddingDate,
        useForMessaging: isMainWeddingDate
      };
      await addItineraryEvent(newEvt);

      if (isMainWeddingDate) {
        // Clear flag from all prior events
        itinerary.forEach(other => {
          if (other.isMainWeddingDate || other.useForMessaging) {
            updateItineraryEvent({
              ...other,
              isMainWeddingDate: false,
              useForMessaging: false
            });
          }
        });

        // Synchronize wedding document metadata
        if (currentWeddingId && updateSaaSWedding) {
          updateSaaSWedding(currentWeddingId, {
            weddingDate: trimmedDate,
            resortName: trimmedVenue !== 'TBD' ? trimmedVenue : currentWedding?.resortName
          });
        }
      }
    }
    setIsModalOpen(false);
  };

  const handleSetAsPrimaryMessageCeremony = (evt: ItineraryEvent) => {
    // Set this event as primary, and remove flag from all others
    itinerary.forEach(other => {
      const shouldBeMain = other.id === evt.id;
      if (other.isMainWeddingDate !== shouldBeMain || other.useForMessaging !== shouldBeMain) {
        updateItineraryEvent({
          ...other,
          isMainWeddingDate: shouldBeMain,
          useForMessaging: shouldBeMain
        });
      }
    });

    if (currentWeddingId && updateSaaSWedding && evt.date) {
      updateSaaSWedding(currentWeddingId, {
        weddingDate: evt.date,
        resortName: evt.venue && evt.venue !== 'TBD' ? evt.venue : currentWedding?.resortName
      });
    }
  };

  const handleExportItineraryReport = () => {
    let csv = "Event Title,Date Scheduled,Start Time,Venue Location,Expected Dress Code\n";
    sortedItinerary.forEach(item => {
      csv += `"${item.title.replace(/"/g, '""')}","${item.date}","${item.time.replace(/"/g, '""')}","${item.venue.replace(/"/g, '""')}","${item.dressCode.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wedding_itinerary_schedule_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="itinerary-tab" className="space-y-6 animate-fade-in">
      
      {/* Title Header with interactive Event creator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-800">Wedding Ceremony Itinerary Planner</h2>
          <p className="text-xs text-stone-500 mt-1 font-sans">
            Design the vertical time milestones. Any edits made here instantly propagate to the public RSVP checklists and dashboards!
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btn-add-ceremony"
            onClick={() => openFormModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald hover:bg-emerald-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-emerald/10 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Ceremony Event</span>
          </button>
        </div>
      </div>

      {/* Official Wedding Message Date & Venue Status Banner */}
      {sortedItinerary.length > 0 && (
        <div className="bg-linear-to-r from-amber-50/90 via-amber-50/50 to-emerald-50/70 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl shrink-0 shadow-xs">
              <Sparkles className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Date &amp; Venue Used In WhatsApp Messages</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Auto-synced with Invitations &amp; RSVP Reminders
                </span>
              </div>
              <p className="text-sm font-semibold text-stone-800 mt-1">
                <span className="text-emerald-950 font-bold">{resolvedMessageCeremony.weddingDate}</span>
                {resolvedMessageCeremony.venue && (
                  <span className="text-stone-600"> • <span className="text-stone-700 font-medium">{resolvedMessageCeremony.venue}</span></span>
                )}
                <span className="text-xs text-amber-800 ml-2 font-normal">
                  ({resolvedMessageCeremony.eventTitle})
                </span>
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                All official invitations and RSVP reminders automatically pick up this marriage ceremony date and venue. Click "Use date in message" on any ceremony below or toggle the checkbox when scheduling a ceremony.
              </p>
            </div>
          </div>
        </div>
      )}

      {sortedItinerary.length === 0 ? (
        <div className="bg-white rounded-2xl py-24 text-center border border-gold/20 shadow-sm text-stone-400">
          <Calendar className="h-8 w-8 mx-auto text-stone-300 mb-3 animate-pulse" />
          <p className="text-sm font-semibold">Welcome to Tectell Wedding Management. No ceremonies scheduled yet.</p>
          <p className="text-xs mt-1">Click "Add Ceremony Event" in the top bar to design your wedding itinerary timeline.</p>
        </div>
      ) : (
        /* Styled Vertical Thread Timeline */
        <div className="relative pl-6 sm:pl-10 max-w-3xl mx-auto space-y-12 py-6">
          
          {/* Vertical gold line trace */}
          <div className="absolute left-[33px] sm:left-[41px] top-0 bottom-0 w-0.5 bg-gold/35 z-0"></div>

          {sortedItinerary.map((evt, idx) => {
            const formattedDateStr = new Date(evt.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            const isPrimaryMessageEvent = evt.id === resolvedMessageCeremony.matchedEventId || Boolean(evt.isMainWeddingDate || evt.useForMessaging);

            return (
              <div key={evt.id} className="relative flex flex-col sm:flex-row gap-6 items-start z-10 group">
                
                {/* Timeline knot indicator */}
                <div className={`absolute left-[2px] sm:left-[1px] top-1 h-6 w-6 rounded-full bg-white border-2 ${isPrimaryMessageEvent ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gold'} flex items-center justify-center shrink-0 z-20 shadow-xs shadow-amber-950/20`}>
                  <div className={`h-2 w-2 rounded-full ${isPrimaryMessageEvent ? 'bg-amber-600' : 'bg-emerald'}`}></div>
                </div>

                {/* Event Card Content */}
                <div id={`itinerary-card-${evt.id}`} className={`bg-white rounded-2xl p-6 shadow-sm border ${isPrimaryMessageEvent ? 'border-amber-300 ring-1 ring-amber-100' : 'border-gold/20'} flex-1 hover:shadow-md transition-shadow relative`}>
                  
                  {/* Edit and delete control row */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openFormModal(evt)}
                      className="p-1 hover:bg-stone-50 hover:text-stone-800 rounded text-stone-400 border border-transparent hover:border-stone-100 transition-all"
                      title="Edit Event"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {confirmDeleteId === evt.id ? (
                      <div className="flex items-center gap-1 font-sans">
                        <button
                          onClick={() => {
                            deleteItineraryEvent(evt.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-1.5 py-0.5 bg-[#c53030] text-white text-[9px] font-bold rounded hover:bg-rose-700 transition"
                          title="Confirm Delete"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-semibold rounded hover:bg-stone-200 transition"
                          title="Cancel"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(evt.id)}
                        className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded text-stone-400 border border-transparent hover:border-rose-100 transition-all text-[#c53030]"
                        title="Delete Event"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 pr-12">
                    
                    {/* Header: Date, Message badge, and Title */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-gold-dark tracking-widest uppercase font-mono">
                          {formattedDateStr}
                        </span>
                        {isPrimaryMessageEvent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100/90 border border-amber-300 text-amber-900 rounded-full text-[10px] font-bold shadow-2xs">
                            <Sparkles className="h-2.5 w-2.5 text-amber-600 fill-amber-500" />
                            <span>Active in WhatsApp Messages</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetAsPrimaryMessageCeremony(evt)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 text-stone-600 hover:text-amber-900 rounded-full text-[10px] font-medium transition-colors"
                            title="Click to use this ceremony date and venue in all wedding invitations & reminders"
                          >
                            <Star className="h-2.5 w-2.5 text-stone-400" />
                            <span>Use date in message</span>
                          </button>
                        )}
                      </div>
                      <h4 className="font-serif font-bold text-stone-800 text-lg sm:text-xl">
                        {evt.title}
                      </h4>
                    </div>

                    {/* Meta info tags */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      {/* Time */}
                      <div className="flex items-center gap-2 text-xs text-stone-600">
                        <Clock className="h-3.5 w-3.5 text-stone-400" />
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase">Auspicious Time</span>
                          <span className="font-semibold">
                            {evt.time}{evt.endTime ? ` - ${evt.endTime}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Venue */}
                      <div className="flex items-start gap-2 text-xs text-stone-600 col-span-1 md:col-span-1">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase">Venue Location</span>
                          <span className="font-semibold">{evt.venue}</span>
                          {evt.googleMapsUrl && (
                            <a
                              href={evt.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-emerald-800 hover:underline flex items-center gap-0.5 mt-0.5 font-semibold"
                            >
                              <span>View on Maps</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Dress code */}
                      <div className="flex items-center gap-2 text-xs text-emerald-800">
                        <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <div>
                          <span className="text-stone-400 block text-[9px] uppercase">Attire / Dress Code</span>
                          <span className="font-semibold text-emerald-900">{evt.dressCode}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Event Ceremony Form Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-stone-100 overflow-hidden relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <form onSubmit={handleFormSubmit} className="space-y-5 p-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-800">
                  {editingEvent ? 'Edit Wedding Ceremony' : 'Schedule Ceremony Event'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Input details for the wedding ceremony sequence.</p>
              </div>

              <div className="space-y-4">
                {/* Event Title */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Ceremony Event Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Sangeet &amp; Beats Night"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                {/* Event Date */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Ceremony Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm font-mono"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                {/* Event Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Start Time</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-xs"
                      placeholder="e.g. 07:00 PM"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">End Time (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-xs"
                      placeholder="e.g. 11:00 PM"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Venue */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Palace Venue Location</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Grand Imperial Ballroom, Palace Palace"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                </div>

                {/* Google Maps GPS URL */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Google Maps GPS URL (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-xs"
                    placeholder="e.g. https://maps.google.com/..."
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  />
                </div>

                {/* Dress Code */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Attire / Suggested Dress Code</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Festive Indian Traditional / Pastel Lehengas"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                  />
                </div>

                {/* Option Checkbox: Use this date in message */}
                <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      id="use-this-date-in-message-checkbox"
                      type="checkbox"
                      checked={isMainWeddingDate}
                      onChange={(e) => setIsMainWeddingDate(e.target.checked)}
                      className="mt-0.5 h-4 w-4 text-emerald-800 focus:ring-emerald-800 rounded border-stone-300 cursor-pointer"
                    />
                    <div className="text-xs text-stone-700">
                      <span className="font-bold text-amber-950 flex items-center gap-1.5 flex-wrap">
                        <span>Use this date &amp; venue in wedding messages</span>
                        {isMainWeddingDate && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 text-amber-900 font-bold rounded">
                            Primary Date
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-stone-600 block mt-1">
                        When checked, all official invitations and RSVP reminder templates ({date ? formatWeddingDate(date) : 'e.g. 17th November 2026'}) will pick up this date and venue in automated WhatsApp dispatches.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  {editingEvent ? 'Save Changes' : 'Confirm Ceremony'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
