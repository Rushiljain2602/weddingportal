/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TransportRecord } from '../types';
import { Car, Search, Plus, X, Trash2, Edit2, CalendarClock, Plane, Download } from 'lucide-react';

export default function Transport() {
  const { transport, addTransport, updateTransport, deleteTransport, guests, itinerary, currentWedding } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TransportRecord | null>(null);

  const sortedItineraryDates = [...itinerary]
    .map(e => e.date)
    .filter(Boolean)
    .sort();
  const defaultDateOnly = sortedItineraryDates[0] || currentWedding?.weddingDate?.split('T')[0] || '2026-12-18';
  const firstFunctionDateTime = `${defaultDateOnly}T12:00`;

  // Delete confirm state to bypass iframe native prompt barriers
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form Fields State
  const [guestName, setGuestName] = useState('');
  const [arrivalDateTime, setArrivalDateTime] = useState('');
  const [travelMode, setTravelMode] = useState('');
  const [assignedCab, setAssignedCab] = useState('');

  const openModal = (record: TransportRecord | null = null) => {
    if (record) {
      setEditingRecord(record);
      setGuestName(record.guestName);
      setArrivalDateTime(record.arrivalDateTime);
      setTravelMode(record.travelMode);
      setAssignedCab(record.assignedCab);
    } else {
      setEditingRecord(null);
      setGuestName('');
      setArrivalDateTime(firstFunctionDateTime);
      setTravelMode('');
      setAssignedCab('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    if (editingRecord) {
      updateTransport({
        ...editingRecord,
        guestName: guestName.trim(),
        arrivalDateTime,
        travelMode: travelMode.trim() || 'Not provided',
        assignedCab: assignedCab.trim() || 'Awaiting Cab Allocation'
      });
    } else {
      addTransport({
        guestName: guestName.trim(),
        arrivalDateTime,
        travelMode: travelMode.trim() || 'Not provided',
        assignedCab: assignedCab.trim() || 'Awaiting Cab Allocation'
      });
    }
    closeModal();
  };

  const filteredRecords = transport.filter(rec =>
    rec.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.assignedCab.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.travelMode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportTransportReport = () => {
    let csv = "Guest/Group Name,Arrival Date & Time,Travel Mode / Flight Info,Assigned Driver/Cab Info\n";
    transport.forEach(rec => {
      csv += `"${rec.guestName.replace(/"/g, '""')}","${rec.arrivalDateTime}","${rec.travelMode.replace(/"/g, '""')}","${rec.assignedCab.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wedding_transport_and_arrivals_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="transport-tab" className="space-y-6 animate-fade-in">
      
      {/* Title Header with Pick action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-800">Transport &amp; Travel Logistics</h2>
          <p className="text-xs text-stone-500 mt-1">
            Coordinate guest arrivals and assign drivers or cabs to pick them up from airports or railway stations.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btn-add-pickup"
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-emerald-800/10 animate"
          >
            <Plus className="h-4 w-4" />
            <span>Assign New Airport Pickup</span>
          </button>
        </div>
      </div>

      {/* Filtering Search row */}
      <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="transport-search"
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 text-sm bg-stone-50/20"
            placeholder="Search transport files by guest, vehicle, flight number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Transport Table */}
      <div className="bg-white rounded-xl border border-stone-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto border border-stone-50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-stone-100 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-4 px-6">Guest Name</th>
                <th className="py-4 px-6">Arrival Date &amp; Time</th>
                <th className="py-4 px-6">Travel Mode / Ticket No.</th>
                <th className="py-4 px-6">Cab &amp; Chauffeur Details</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400">
                    Welcome to Tectell Wedding Management. No travel logs matching currently. Click "Assign New Airport Pickup" to add logging details.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-amber-500/5 transition-colors">
                    <td className="py-4 px-6 font-semibold text-stone-800">{rec.guestName}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-stone-700">
                        <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-medium text-xs">
                          {rec.arrivalDateTime ? new Date(rec.arrivalDateTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Awaiting details'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <Plane className="h-3.5 w-3.5 text-indigo-700 font-medium" />
                        <span className="font-mono text-xs uppercase">{rec.travelMode}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-600 block shadow-inner shrink-0"></span>
                        <span className="text-stone-800 text-xs font-semibold">{rec.assignedCab}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(rec)}
                          className="p-1.5 hover:bg-stone-50 hover:text-stone-800 rounded-lg border border-transparent hover:border-stone-100 transition-colors"
                          title="Edit Dispatch Log"
                        >
                          <Edit2 className="h-4 w-4 text-stone-600" />
                        </button>
                        {confirmDeleteId === rec.id ? (
                          <div className="flex items-center gap-1 font-sans">
                            <button
                              onClick={() => {
                                deleteTransport(rec.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 bg-[#c53030] text-white text-[9px] font-bold rounded hover:bg-rose-700"
                              title="Confirm Delete"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-semibold rounded hover:bg-stone-200"
                              title="Cancel"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(rec.id)}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg border border-transparent hover:border-rose-100 transition-colors"
                            title="Delete Transport Log"
                          >
                            <Trash2 className="h-4 w-4 text-[#c53030]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch form modal screen */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-stone-100 overflow-hidden relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <form onSubmit={handleFormSubmit} className="space-y-5 p-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-800">
                  {editingRecord ? 'Edit Assignment Log' : 'Create Pickup Logistics'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Define arrivals dates, flight or rail tickets and designate a car/driver.</p>
              </div>

              <div className="space-y-4">
                {/* Guest Selector, can be input or search from guests */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Select / Type Guest Name</label>
                  <input
                    type="text"
                    required
                    list="guests-list-options"
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Ketan Mehta Chacha"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                  <datalist id="guests-list-options">
                    {guests.map(g => (
                      <option key={g.id} value={g.name} />
                    ))}
                  </datalist>
                </div>

                {/* Date and Time */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Arrival Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm font-mono"
                    value={arrivalDateTime}
                    onChange={(e) => setArrivalDateTime(e.target.value)}
                  />
                </div>

                {/* Ticket/Travel Mode */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Travel Mode (Flight / Train Number)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-[#eae8e3] focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm uppercase"
                    placeholder="e.g. INDIGO 6E-2401 or SHATABDI EXPRESS"
                    value={travelMode}
                    onChange={(e) => setTravelMode(e.target.value)}
                  />
                </div>

                {/* Cab Assigned */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Assigned Driver / Cab details</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Innova Gold - Mukesh Sharma (+9198754120)"
                    value={assignedCab}
                    onChange={(e) => setAssignedCab(e.target.value)}
                  />
                </div>
              </div>

              {/* Submit actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-600 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  {editingRecord ? 'Save Changes' : 'Confirm Pickup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
