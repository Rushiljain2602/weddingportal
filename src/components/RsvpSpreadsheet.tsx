import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Guest } from '../types';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Users, 
  Sparkles 
} from 'lucide-react';

export default function RsvpSpreadsheet() {
  const { guests, dbStatus } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attending' | 'declined' | 'pending'>('all');

  // Helper to determine attending status
  const getAttendingStatus = (g: Guest): 'Attending' | 'Declined' | 'Pending' => {
    if (!g.hasSubmitted) return 'Pending';
    
    // Check if they are attending any event
    const isAttendingAny = Object.values(g.rsvp || {}).some(v => v === 'Attending');
    return isAttendingAny ? 'Attending' : 'Declined';
  };

  // Filtered guest list
  const filteredGuests = guests.filter(g => {
    const familyName = g.familyName || g.name || '';
    const matchesSearch = familyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = getAttendingStatus(g);
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'attending' && status === 'Attending') ||
                          (statusFilter === 'declined' && status === 'Declined') ||
                          (statusFilter === 'pending' && status === 'Pending');

    return matchesSearch && matchesStatus;
  });

  // Calculate real-time stats
  const stats = guests.reduce((acc, g) => {
    const status = getAttendingStatus(g);
    const allocatedAdults = g.totalAdults !== undefined ? g.totalAdults : 1;
    const allocatedChildren = g.totalChildren !== undefined ? g.totalChildren : 0;
    
    acc.totalAllocatedAdults += allocatedAdults;
    acc.totalAllocatedChildren += allocatedChildren;

    if (g.hasSubmitted) {
      acc.submittedCount += 1;
      const confirmedAdults = g.confirmedAdults !== undefined ? g.confirmedAdults : allocatedAdults;
      const confirmedChildren = g.confirmedChildren !== undefined ? g.confirmedChildren : allocatedChildren;
      
      acc.totalConfirmedAdults += confirmedAdults;
      acc.totalConfirmedChildren += confirmedChildren;

      if (status === 'Attending') {
        acc.attendingCount += 1;
        acc.totalAttendingGuests += (confirmedAdults + confirmedChildren);
      } else {
        acc.declinedCount += 1;
      }

      if (g.pollAnswer && g.pollAnswer.trim().length > 0) {
        acc.pollAnsweredCount += 1;
      }
    } else {
      acc.pendingCount += 1;
    }

    return acc;
  }, {
    totalAllocatedAdults: 0,
    totalAllocatedChildren: 0,
    totalConfirmedAdults: 0,
    totalConfirmedChildren: 0,
    totalAttendingGuests: 0,
    submittedCount: 0,
    attendingCount: 0,
    declinedCount: 0,
    pendingCount: 0,
    pollAnsweredCount: 0
  });

  // Function to trigger full CSV download
  const handleExportCSV = () => {
    if (guests.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Family/Guest Name,Allocated Adults,Allocated Children,Confirmed Adults,Confirmed Children,Attending Status,Custom Poll Answer\n";
    
    guests.forEach(g => {
      const familyName = g.familyName || g.name || '';
      const allocatedAdults = g.totalAdults !== undefined ? g.totalAdults : 1;
      const allocatedChildren = g.totalChildren !== undefined ? g.totalChildren : 0;
      const confirmedAdults = g.hasSubmitted ? (g.confirmedAdults !== undefined ? g.confirmedAdults : allocatedAdults) : 0;
      const confirmedChildren = g.hasSubmitted ? (g.confirmedChildren !== undefined ? g.confirmedChildren : allocatedChildren) : 0;
      
      const status = getAttendingStatus(g);
      const pollAnswer = g.pollAnswer || '';
      
      const row = [
        `"${familyName.replace(/"/g, '""')}"`,
        allocatedAdults,
        allocatedChildren,
        confirmedAdults,
        confirmedChildren,
        `"${status}"`,
        `"${pollAnswer.replace(/"/g, '""')}"`
      ].join(",");
      
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rsvp_spreadsheet_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-stone-200/60 p-6 rounded-3xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-black text-stone-900 tracking-wide">
              RSVP Spreadsheet Management
            </h2>
            <p className="text-[11px] text-stone-400 mt-0.5 leading-normal font-medium">
              Real-time synchronization of guest ceremony attendance counts, invitations limits, and poll answers.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={guests.length === 0}
          className="w-full md:w-auto px-5 py-2.5 bg-emerald-800 hover:bg-[#043427] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95 shrink-0"
        >
          <Download className="h-4 w-4 text-amber-300" />
          <span>EXPORT TO EXCEL / CSV</span>
        </button>
      </div>

      {/* QUICK REAL-TIME SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-stone-400 tracking-wider uppercase">
              Total Attending Guests
            </span>
            <span className="p-1.5 bg-emerald-50 text-emerald rounded-lg text-xs font-bold">
              <Users className="h-4 w-4 text-emerald-800" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-black text-stone-900">
              {stats.totalAttendingGuests}
            </span>
            <span className="text-[10px] text-stone-400 font-medium">
              Confirmed Guests
            </span>
          </div>
          <p className="text-[9px] text-stone-400">
            From {stats.submittedCount} submitted RSVP forms ({stats.attendingCount} attending families)
          </p>
        </div>

        <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-stone-400 tracking-wider uppercase">
              Party Size Allocation
            </span>
            <span className="p-1.5 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold">
              🎟️
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-black text-stone-900">
              {stats.totalAllocatedAdults + stats.totalAllocatedChildren}
            </span>
            <span className="text-[10px] text-stone-400 font-medium">
              Total Invited
            </span>
          </div>
          <p className="text-[9px] text-stone-400 font-mono">
            {stats.totalAllocatedAdults} Adults • {stats.totalAllocatedChildren} Children limits
          </p>
        </div>

        <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-stone-400 tracking-wider uppercase">
              RSVP Submission State
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold">
              📝
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-black text-stone-900">
              {guests.length > 0 ? Math.round((stats.submittedCount / guests.length) * 100) : 0}%
            </span>
            <span className="text-[10px] text-stone-400 font-medium">
              Completion Rate
            </span>
          </div>
          <p className="text-[9px] text-stone-400">
            {stats.submittedCount} Submitted • {stats.pendingCount} Pending response invitations
          </p>
        </div>

        <div className="bg-white border border-stone-200/50 p-5 rounded-2xl shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-stone-400 tracking-wider uppercase">
              Custom Poll Completion
            </span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">
              ❓
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-black text-stone-900">
              {stats.submittedCount > 0 ? Math.round((stats.pollAnsweredCount / stats.submittedCount) * 100) : 0}%
            </span>
            <span className="text-[10px] text-stone-400 font-medium">
              Answer Rate
            </span>
          </div>
          <p className="text-[9px] text-stone-400">
            {stats.pollAnsweredCount} answers from {stats.submittedCount} submitted respondents
          </p>
        </div>

      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3 bg-stone-50 border border-stone-200/60 p-4 rounded-2xl items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by Family/Guest name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-stone-200 pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-800 text-stone-800 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Filter className="h-4 w-4 text-stone-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="flex-1 sm:flex-initial bg-white border border-stone-200 px-3.5 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-800 font-medium font-sans text-stone-700 cursor-pointer"
          >
            <option value="all">All RSVP States</option>
            <option value="attending">Attending</option>
            <option value="declined">Declined</option>
            <option value="pending">Pending Response</option>
          </select>
        </div>
      </div>

      {/* GRID SPREADSHEET */}
      <div className="bg-white border border-stone-200/60 rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto w-full max-h-[500px]">
          <table className="w-full table-auto border-collapse text-left text-xs antialiased">
            <thead className="bg-stone-100 text-stone-500 font-mono tracking-wider uppercase border-b border-stone-200 sticky top-0 z-10 shadow-3xs">
              <tr>
                <th className="px-4 py-3 font-bold">Family Name</th>
                <th className="px-4 py-3 font-bold text-center">Allocated Adults</th>
                <th className="px-4 py-3 font-bold text-center">Allocated Children</th>
                <th className="px-4 py-3 font-bold text-center">Confirmed Adults</th>
                <th className="px-4 py-3 font-bold text-center">Confirmed Children</th>
                <th className="px-4 py-3 font-bold">Attending Status</th>
                <th className="px-4 py-3 font-bold">Custom Poll Answer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-stone-400 italic">
                    No registry rows match your current search and filter constraints.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g, idx) => {
                  const status = getAttendingStatus(g);
                  const allocatedAdults = g.totalAdults !== undefined ? g.totalAdults : 1;
                  const allocatedChildren = g.totalChildren !== undefined ? g.totalChildren : 0;
                  const confirmedAdults = g.hasSubmitted ? (g.confirmedAdults !== undefined ? g.confirmedAdults : allocatedAdults) : 0;
                  const confirmedChildren = g.hasSubmitted ? (g.confirmedChildren !== undefined ? g.confirmedChildren : allocatedChildren) : 0;

                  return (
                    <tr 
                      key={g.id || idx} 
                      className={`hover:bg-amber-500/5 transition-colors even:bg-stone-50/50`}
                    >
                      <td className="px-4 py-3 text-stone-900 font-semibold font-serif">
                        {g.familyName || g.name || "Unnamed Party"}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-stone-500">
                        {allocatedAdults}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-stone-500">
                        {allocatedChildren}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-stone-900 font-bold">
                        {g.hasSubmitted ? confirmedAdults : "-"}
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-stone-900 font-bold">
                        {g.hasSubmitted ? confirmedChildren : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {status === 'Attending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            <CheckCircle className="h-3 w-3 shrink-0" />
                            <span>ATTENDING</span>
                          </span>
                        ) : status === 'Declined' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-850 font-bold text-[10px]">
                            <XCircle className="h-3 w-3 shrink-0" />
                            <span>DECLINED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-500 font-bold text-[10px]">
                            <HelpCircle className="h-3 w-3 shrink-0" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-normal text-stone-600 max-w-xs truncate" title={g.pollAnswer}>
                        {g.pollAnswer ? (
                          <span className="text-stone-900 font-medium">
                            {g.pollAnswer}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">No answer</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-stone-50 p-4 border-t border-stone-150 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-mono text-stone-400 uppercase font-bold">
          <span>
            Showing {filteredGuests.length} rows of {guests.length} total invitees
          </span>
          <span>
            {dbStatus === 'local' ? "⚠️ SANDBOXED LOCAL STORAGE DATA" : "⚡ REAL-TIME CLOUD CONNECTED"}
          </span>
        </div>
      </div>

    </div>
  );
}
