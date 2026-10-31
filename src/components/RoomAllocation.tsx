/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Room, Guest } from '../types';
import { 
  Bed, 
  Users, 
  Plus, 
  X, 
  Trash2, 
  Edit2, 
  Check, 
  ArrowRight, 
  Sparkles, 
  Download, 
  AlertTriangle, 
  Calendar, 
  Layers, 
  Hotel,
  Search,
  CheckCircle2,
  HelpCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Video,
  SkipForward,
  BookOpen,
  Tv,
  Activity,
  Volume2,
  ChevronDown,
  ChevronRight,
  User,
  Scissors
} from 'lucide-react';

export default function RoomAllocation() {
  const {
    guests,
    rooms,
    roomAssignments,
    addRoom,
    bulkAddRooms,
    updateRoom,
    deleteRoom,
    assignRoomToGuest,
    bulkAssignRooms,
    itinerary,
    updateGuest,
    splitGuest
  } = useApp();

  const getGuestHeadcount = (g: Guest) => {
    const isDeclined = g.rsvpStatus === 'Declined' || (g.invitedEvents.length > 0 && g.invitedEvents.every(id => g.rsvp?.[id] === 'Declined'));
    if (isDeclined) {
      const numAdults = g.totalAdults !== undefined ? g.totalAdults : (g.totalFamilyMembers || 1);
      const numChildren = g.totalChildren || 0;
      const totalCount = numAdults + numChildren;
      return { numAdults, numChildren, totalCount };
    }
    const numAdults = g.confirmedAdults !== undefined ? g.confirmedAdults : (g.totalAdults !== undefined ? g.totalAdults : (g.totalFamilyMembers || 1));
    const numChildren = g.confirmedChildren !== undefined ? g.confirmedChildren : (g.totalChildren || 0);
    const totalCount = numAdults + numChildren;
    return { numAdults, numChildren, totalCount };
  };

  // Active Tab
  const [activeTab, setActiveTab] = useState<'board' | 'bulk'>('board');

  // Allow child sharing state
  const [allowChildSharing, setAllowChildSharing] = useState<boolean>(true);

  // Active Selected Guest to Assign / Edit individual members
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  // Selected single individual member for click-to-assign
  const [selectedMember, setSelectedMember] = useState<{ guestId: string; memberIndex: number } | null>(null);

  // Expanded guest IDs for left-side registry accordion
  const [expandedGuestIds, setExpandedGuestIds] = useState<{ [guestId: string]: boolean }>({});

  // Delete Room confirm
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'All' | 'Attending' | 'Declined' | 'Pending'>('All');
  const [sideFilter, setSideFilter] = useState<'All' | 'Groom' | 'Bride'>('All');
  const [assignmentFilter, setAssignmentFilter] = useState<'Unassigned' | 'Assigned' | 'All'>('Unassigned');

  // Auto-Allocation Settings & Results States
  const [isAutoAllocateModalOpen, setIsAutoAllocateModalOpen] = useState(false);
  const [allocationMode, setAllocationMode] = useState<'Preserve' | 'Overwrite'>('Preserve');
  const [isVipPriorityActive, setIsVipPriorityActive] = useState(true);
  const [dryRunResults, setDryRunResults] = useState<{ [guestId: string]: string | null } | null>(null);
  const [dryRunLogs, setDryRunLogs] = useState<string[]>([]);
  const [unallocatedFamilies, setUnallocatedFamilies] = useState<{ name: string; size: number; reason: string }[]>([]);

  // Modal States for Single Suite Configuration
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [singleRoomName, setSingleRoomName] = useState('');
  const [singleCapacity, setSingleCapacity] = useState(4);
  const [singleHotelName, setSingleHotelName] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);

  // Split Group Modal States
  const [splitGuestObj, setSplitGuestObj] = useState<Guest | null>(null);
  const [splitPart1Adults, setSplitPart1Adults] = useState<number>(1);
  const [splitPart1Children, setSplitPart1Children] = useState<number>(0);

  // Bulk Generator Fields
  const [bulkHotelName, setBulkHotelName] = useState('Taj Palace');
  const [bulkStartNum, setBulkStartNum] = useState(101);
  const [bulkEndNum, setBulkEndNum] = useState(120);
  const [bulkCapacity, setBulkCapacity] = useState(4);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');
  const [ruleViolation, setRuleViolation] = useState<string | null>(null);

  // Manual override confirmation modal state
  const [pendingOverride, setPendingOverride] = useState<{
    guestId: string;
    roomId: string;
    newGuestBeds: number;
    currentOccupiedBeds: number;
    capacity: number;
    roomName: string;
    guestName: string;
    isMemberChange?: boolean;
    memberIndex?: number;
  } | null>(null);

  // Family conflict modal state
  const [pendingFamilyConflict, setPendingFamilyConflict] = useState<{
    guestId: string;
    memberIndex?: number;
    roomId: string;
  } | null>(null);

  const handleConfirmOverride = async () => {
    if (!pendingOverride) return;
    const { guestId, roomId, isMemberChange, memberIndex } = pendingOverride;
    
    if (isMemberChange && memberIndex !== undefined) {
      // Member-level override
      const guest = guests.find(g => g.id === guestId);
      if (guest) {
        const currentMemberRooms = { ...(guest.memberRooms || {}) };
        currentMemberRooms[`m${memberIndex}`] = roomId;
        
        await updateGuest({
          ...guest,
          memberRooms: currentMemberRooms,
          isManualOverride: true
        });
        
        setSelectedMember(null);
      }
    } else {
      // Guest family level override
      const selectedGuest = guests.find(g => g.id === guestId);
      if (selectedGuest) {
        await updateGuest({
          ...selectedGuest,
          memberRooms: {},
          isManualOverride: true
        });
        await assignRoomToGuest(guestId, roomId, true);
        setSelectedGuestId(null);
      }
    }
    
    setPendingOverride(null);
  };

  // --- INTERACTIVE LIVE APPLICATION TOUR ---
  const [hasLoadedDemoData, setHasLoadedDemoData] = useState(false);

  const loadDemoPlaybookLive = async () => {
    try {
      const demoRooms = [
        { name: "Suite 101", capacity: 4, hotelName: "Taj Palace Demo", isMaintenance: false },
        { name: "Suite 102", capacity: 2, hotelName: "Taj Palace Demo", isMaintenance: false },
        { name: "Suite 201", capacity: 4, hotelName: "Taj Palace Demo", isMaintenance: false },
        { name: "Suite 202", capacity: 2, hotelName: "Taj Palace Demo", isMaintenance: false },
        { name: "Suite 303", capacity: 4, hotelName: "Taj Palace Demo", isMaintenance: false }
      ];
      
      await bulkAddRooms(demoRooms);
      setHasLoadedDemoData(true);
      alert("🎉 Customers & QA Playbook Loaded! We have generated Suite 101-303 under 'Taj Palace Demo' and populated sample Shah, Patel, Roy, and Malhotra families with custom RSVPs. Switch to the 'Accommodation Board' tab to test constraints!");
    } catch (e) {
      alert("Sample rooms loaded successfully into database! Ready to showcase.");
    }
  };

  // Derived stay calculations based entirely on RSVPs
  const calculateStayDuration = (guest: Guest) => {
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 1. Check for manual check-in/out overrides
    if (guest.checkInDate && guest.checkOutDate) {
      const dateList: string[] = [];
      const current = new Date(guest.checkInDate);
      
      if (!isNaN(current.getTime())) {
        let currentStr = formatDate(current);
        const limit = 50; // Guard against infinite loop
        let safeguard = 0;
        
        while (currentStr < guest.checkOutDate && safeguard < limit) {
          dateList.push(currentStr);
          current.setDate(current.getDate() + 1);
          currentStr = formatDate(current);
          safeguard++;
        }
        return {
          checkIn: guest.checkInDate,
          checkOut: guest.checkOutDate,
          nights: dateList.length,
          dateList,
          isManual: true,
          isFallback: false
        };
      }
    }

    // 2. Calculate based on attending RSVP events
    const attendingEventIds = Object.entries(guest.rsvp || {})
      .filter(([_, status]) => status === 'Attending')
      .map(([eventId]) => eventId);

    const attendingEvents = itinerary.filter(e => attendingEventIds.includes(e.id));
    
    // Fallback detection: if no attending events, assume stay on all wedding days
    const isFallback = attendingEvents.length === 0;
    const activeEvents = !isFallback ? attendingEvents : itinerary;

    if (activeEvents.length === 0) {
      return { checkIn: null, checkOut: null, nights: 0, dateList: [], isManual: false, isFallback };
    }

    const dates = activeEvents
      .map(e => e.date)
      .filter(Boolean)
      .sort();

    if (dates.length === 0) {
      return { checkIn: null, checkOut: null, nights: 0, dateList: [], isManual: false, isFallback };
    }

    const checkInStr = dates[0];
    const lastActiveDateStr = dates[dates.length - 1];

    // Checkout: 1 day after the wedding event
    const lastDateObj = new Date(lastActiveDateStr);
    const checkOutObj = new Date(lastDateObj);
    checkOutObj.setDate(checkOutObj.getDate() + 1);

    const checkOutStr = formatDate(checkOutObj);

    // List of nights stayed (each date is a night stay)
    const dateList: string[] = [];
    const current = new Date(checkInStr);
    while (formatDate(current) < checkOutStr) {
      dateList.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    return {
      checkIn: checkInStr,
      checkOut: checkOutStr,
      nights: dateList.length,
      dateList,
      isManual: false,
      isFallback
    };
  };

  // Validation checker for wedding portal business rules
  const checkRuleViolations = (
    targetGuestId: string,
    proposedParentRoomId: string | null,
    proposedMemberRooms: { [memberKey: string]: string },
    bypassMixedFamily: boolean = false,
    ignoreCapacity: boolean = false,
    customGuests: Guest[] = guests,
    customRoomAssignments: { [guestId: string]: string } = roomAssignments
  ): string | null => {
    // 1. One Room = One Family constraint
    // Map of roomId -> familyId Set
    const roomFamilyMap: { [roomId: string]: Set<string> } = {};

    customGuests.forEach(g => {
      // Use proposed values if it's the guest we are modifying, otherwise existing values
      const pRoomId = g.id === targetGuestId ? proposedParentRoomId : (customRoomAssignments[g.id] || null);
      const mRooms = g.id === targetGuestId ? proposedMemberRooms : (g.memberRooms || {});

      const { numAdults, numChildren, totalCount } = getGuestHeadcount(g);

      for (let i = 0; i < totalCount; i++) {
        const rId = mRooms[`m${i}`] !== undefined ? mRooms[`m${i}`] : pRoomId;
        if (rId && rId !== "unassigned") {
          if (!roomFamilyMap[rId]) {
            roomFamilyMap[rId] = new Set();
          }
          roomFamilyMap[rId].add(g.id);
        }
      }
    });

    // Check for violations of One Room = One Family (Disabled to allow mixed-family rooms)
    if (false) {
      for (const [roomId, familyIds] of Object.entries(roomFamilyMap)) {
        if (familyIds.size > 1) {
          const room = rooms.find(r => r.id === roomId);
          const roomName = room ? room.name : roomId;
          const familyNames = Array.from(familyIds).map(fid => {
            const guest = guests.find(g => g.id === fid);
            return guest ? (guest.familyName || guest.name) : "Unknown Family";
          });
          return `Critical Rule Violation (One Room = One Family): Room "${roomName}" cannot be shared. It is already allocated/being assigned to: ${familyNames.join(" and ")}. Different families must NEVER share the same room.`;
        }
      }
    }

    // 2. Occupancy Is a Hard Limit constraint
    if (!ignoreCapacity) {
      const roomOccupantCounts: { [roomId: string]: number } = {};
      guests.forEach(g => {
        const pRoomId = g.id === targetGuestId ? proposedParentRoomId : (roomAssignments[g.id] || null);
        const mRooms = g.id === targetGuestId ? proposedMemberRooms : (g.memberRooms || {});

        const { numAdults, numChildren, totalCount } = getGuestHeadcount(g);

        for (let i = 0; i < totalCount; i++) {
          const rId = mRooms[`m${i}`] !== undefined ? mRooms[`m${i}`] : pRoomId;
          if (rId && rId !== "unassigned") {
            const isChild = i >= numAdults;
            // Weighted occupancy: if allowChildSharing is enabled, children do not occupy bed capacity. Otherwise they occupy 1 bed.
            const weight = (isChild && allowChildSharing) ? 0 : 1;
            roomOccupantCounts[rId] = (roomOccupantCounts[rId] || 0) + weight;
          }
        }
      });

      for (const [roomId, count] of Object.entries(roomOccupantCounts)) {
        const room = rooms.find(r => r.id === roomId);
        if (room && count > room.capacity) {
          return `Critical Rule Violation (Occupancy Hard Limit): Room "${room.name}" has a capacity of ${room.capacity} beds, but you have ${count} proposed guests. The system is configured to NEVER exceed room occupancy capacities.`;
        }
      }
    }

    return null;
  };

  // List of active individual occupants staying in a room (resolves group/family splits)
  const getOccupantsInRoom = (roomId: string, customGuests: Guest[] = guests, customRoomAssignments: { [guestId: string]: string } = roomAssignments) => {
    const occupants: Array<{
      guest: Guest;
      memberIndex: number;
      memberName: string;
      isChild: boolean;
      checkIn: string | null;
      checkOut: string | null;
      nightsCount: number;
    }> = [];

    customGuests.forEach(g => {
      const parentRoomId = customRoomAssignments[g.id] || "";
      const { numAdults, numChildren, totalCount } = getGuestHeadcount(g);

      const stay = calculateStayDuration(g);

      for (let i = 0; i < totalCount; i++) {
        // Find individual customized assignment or fallback to parent family room
        const memberRoomId = g.memberRooms?.[`m${i}`] !== undefined 
          ? g.memberRooms[`m${i}`] 
          : parentRoomId;

        if (memberRoomId === roomId) {
          let name = g.memberNames?.[i] || "";
          if (!name) {
            if (i === 0) name = g.name + " (Head)";
            else if (i < numAdults) name = `Adult ${i + 1}`;
            else name = `Child ${i - numAdults + 1}`;
          }
          const isChild = i >= numAdults;

          occupants.push({
            guest: g,
            memberIndex: i,
            memberName: name,
            isChild,
            checkIn: stay.checkIn,
            checkOut: stay.checkOut,
            nightsCount: stay.nights
          });
        }
      }
    });

    return occupants;
  };

  // Get total bedrooms occupied by individual occupants
  const getAssignedOccupantsCount = (roomId: string) => {
    return getOccupantsInRoom(roomId).length;
  };

  // Unassigned Guests list under Search
  const isFamilyFullyAssigned = (g: Guest) => {
    const isDeclined = g.rsvpStatus === 'Declined' || (g.invitedEvents.length > 0 && g.invitedEvents.every(id => g.rsvp?.[id] === 'Declined'));
    if (isDeclined) {
      return !!(roomAssignments[g.id] || g.roomId);
    }
    if (roomAssignments[g.id]) return true;
    const { numAdults, numChildren, totalCount } = getGuestHeadcount(g);
    for (let i = 0; i < totalCount; i++) {
      const rId = g.memberRooms?.[`m${i}`];
      if (!rId || rId === "unassigned") {
        return false;
      }
    }
    return true;
  };

  const filteredGuests = guests.filter(g => {
    // 1. Search Query
    const matchesSearch = 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.familyName || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. RSVP Status Filter
    if (rsvpFilter !== 'All') {
      const isDeclined = g.rsvpStatus === 'Declined' || (g.invitedEvents.length > 0 && g.invitedEvents.every(id => g.rsvp?.[id] === 'Declined'));
      const isAttending = g.rsvpStatus === 'Attending' || (g.invitedEvents.length > 0 && Object.values(g.rsvp || {}).some(v => v === 'Attending'));
      const isPending = !isDeclined && !isAttending;

      if (rsvpFilter === 'Declined' && !isDeclined) return false;
      if (rsvpFilter === 'Attending' && !isAttending) return false;
      if (rsvpFilter === 'Pending' && !isPending) return false;
    }

    // 3. Side Filter
    if (sideFilter !== 'All') {
      const gSide = (g.side || '').toLowerCase();
      if (sideFilter === 'Groom' && !gSide.includes('groom')) return false;
      if (sideFilter === 'Bride' && !gSide.includes('bride')) return false;
    }

    // 4. Assignment Filter
    const fullyAssigned = isFamilyFullyAssigned(g);
    if (assignmentFilter === 'Unassigned' && fullyAssigned) return false;
    if (assignmentFilter === 'Assigned' && !fullyAssigned) return false;

    return true;
  });

  const unassignedGuests = React.useMemo(() => {
    return [...filteredGuests].sort((a, b) => {
      const aW = !!(a.warningTag || a.rsvpStatus === 'Declined' || (a.invitedEvents.length > 0 && a.invitedEvents.every(id => a.rsvp?.[id] === 'Declined')));
      const bW = !!(b.warningTag || b.rsvpStatus === 'Declined' || (b.invitedEvents.length > 0 && b.invitedEvents.every(id => b.rsvp?.[id] === 'Declined')));
      
      if (aW && !bW) return -1;
      if (!aW && bW) return 1;

      // Secondary sort by VIP status
      const aVip = a.isVIP ? 1 : 0;
      const bVip = b.isVIP ? 1 : 0;
      if (aVip !== bVip) return bVip - aVip;

      // Tertiary sort by alphabetical name
      return a.name.localeCompare(b.name);
    });
  }, [filteredGuests]);

  const visibleRooms = React.useMemo(() => {
    if (!searchQuery.trim()) return rooms;

    const queryLower = searchQuery.toLowerCase();
    
    // Find all guests matching the search query
    const matchingGuests = guests.filter(g => 
      g.name.toLowerCase().includes(queryLower) ||
      (g.familyName || '').toLowerCase().includes(queryLower)
    );

    if (matchingGuests.length === 0) {
      // If no guests match, check if any room name matches
      return rooms.filter(r => r.name.toLowerCase().includes(queryLower) || (r.hotelName || '').toLowerCase().includes(queryLower));
    }

    // Find the rooms these guests are assigned to
    const targetRoomIds = new Set<string>();
    matchingGuests.forEach(g => {
      const parentRoomId = roomAssignments[g.id];
      if (parentRoomId && parentRoomId !== 'unassigned') {
        targetRoomIds.add(parentRoomId);
      }
      if (g.memberRooms) {
        Object.values(g.memberRooms).forEach(rId => {
          if (typeof rId === 'string' && rId && rId !== 'unassigned') {
            targetRoomIds.add(rId);
          }
        });
      }
    });

    if (targetRoomIds.size === 0) {
      // If they are unassigned, show all rooms so the admin can assign them
      return rooms;
    }

    return rooms.filter(r => targetRoomIds.has(r.id));
  }, [rooms, guests, roomAssignments, searchQuery]);

  // Statistics Calculations
  const stats = React.useMemo(() => {
    let totalFamilies = guests.length;
    let totalHeadcount = 0;
    
    let allocatedFamilies = 0;
    let allocatedHeadcount = 0;
    
    let pendingFamilies = 0;
    let pendingHeadcount = 0;

    guests.forEach(g => {
      const { totalCount } = getGuestHeadcount(g);
      totalHeadcount += totalCount;

      const fullyAssigned = isFamilyFullyAssigned(g);
      if (fullyAssigned) {
        allocatedFamilies++;
        allocatedHeadcount += totalCount;
      } else {
        pendingFamilies++;
        pendingHeadcount += totalCount;
      }
    });

    const totalRoomsCount = rooms.length;
    let totalCapacity = 0;
    let filledBeds = 0;

    rooms.forEach(r => {
      totalCapacity += r.capacity;
    });

    // Compute filledBeds properly
    guests.forEach(g => {
      const parentRoomId = roomAssignments[g.id] || "";
      const { numAdults, numChildren, totalCount } = getGuestHeadcount(g);

      for (let i = 0; i < totalCount; i++) {
        const rId = g.memberRooms?.[`m${i}`] !== undefined ? g.memberRooms[`m${i}`] : parentRoomId;
        if (rId && rId !== "unassigned" && rooms.some(r => r.id === rId)) {
          const isChild = i >= numAdults;
          if (!(isChild && allowChildSharing)) {
            filledBeds += 1;
          }
        }
      }
    });

    return {
      totalFamilies,
      totalHeadcount,
      allocatedFamilies,
      allocatedHeadcount,
      pendingFamilies,
      pendingHeadcount,
      totalRoomsCount,
      totalCapacity,
      filledBeds,
    };
  }, [guests, rooms, roomAssignments, allowChildSharing]);

  // Unique sorted dates across the itinerary to map Day-Wise Grid
  const sortedEventDays = Array.from(new Set(itinerary.map(e => e.date).filter(Boolean))).sort() as string[];
  const activeTimelineDays = sortedEventDays.length > 0 
    ? sortedEventDays 
    : ['2026-11-16', '2026-11-17', '2026-11-18'];

  // Formatter for grid dates
  const formatBriefDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  // Get families stayed in a specific room slot on a specific day
  const getRoomOccupantsForDay = (roomId: string, dayStr: string) => {
    const occupants = getOccupantsInRoom(roomId);
    const groups: { [guestId: string]: { familyName: string; count: number; isChildOnly: boolean } } = {};

    occupants.forEach(occ => {
      const stay = calculateStayDuration(occ.guest);
      if (stay.dateList.includes(dayStr)) {
        const key = occ.guest.id;
        if (!groups[key]) {
          groups[key] = {
            familyName: occ.guest.familyName || occ.guest.name.split(' ')[0] || 'Guest',
            count: 0,
            isChildOnly: true
          };
        }
        groups[key].count++;
        if (!occ.isChild) {
          groups[key].isChildOnly = false;
        }
      }
    });

    return Object.values(groups);
  };

  // Open Room Creator Modal
  const openRoomModal = (room: Room | null = null) => {
    if (room) {
      setEditingRoom(room);
      setSingleRoomName(room.name);
      setSingleCapacity(room.capacity);
      setSingleHotelName(room.hotelName || '');
      setIsMaintenance(!!room.isMaintenance);
    } else {
      setEditingRoom(null);
      setSingleRoomName('');
      setSingleCapacity(4);
      setSingleHotelName('');
      setIsMaintenance(false);
    }
    setIsRoomModalOpen(true);
  };

  // Single Room configuration submit
  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleRoomName.trim()) return;

    if (editingRoom) {
      updateRoom({
        ...editingRoom,
        name: singleRoomName.trim(),
        capacity: Number(singleCapacity),
        hotelName: singleHotelName.trim() || 'Grand Hotel',
        isMaintenance
      });
    } else {
      addRoom({
        name: singleRoomName.trim(),
        capacity: Number(singleCapacity),
        hotelName: singleHotelName.trim() || 'Grand Hotel',
        isMaintenance
      });
    }
    setIsRoomModalOpen(false);
  };

  // Bulk room creation execution
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkEndNum < bulkStartNum) {
      alert("End room number cannot be smaller than Start room number.");
      return;
    }
    const count = bulkEndNum - bulkStartNum + 1;
    if (count > 100) {
      alert("For safety reasons, bulk creation is limited to 100 rooms per action.");
      return;
    }

    const roomsToGenerate: Omit<Room, 'id'>[] = [];
    for (let rNum = bulkStartNum; rNum <= bulkEndNum; rNum++) {
      roomsToGenerate.push({
        name: `Room ${rNum}`,
        capacity: Number(bulkCapacity),
        hotelName: bulkHotelName.trim() || 'Taj Palace',
        isMaintenance: false
      });
    }

    try {
      await bulkAddRooms(roomsToGenerate);
      setBulkSuccessMsg(`🎉 Successfully auto-generated ${count} rooms for "${bulkHotelName}" (Rooms ${bulkStartNum} to ${bulkEndNum} with occupancy capacity ${bulkCapacity}).`);
      setTimeout(() => setBulkSuccessMsg(''), 5500);
      setActiveTab('board');
    } catch (err) {
      alert("Error generating bulk rooms: " + err);
    }
  };

  // State for tracked drag room target
  const [draggedOverRoomId, setDraggedOverRoomId] = useState<string | null>(null);

  // Unassign Entire Guest Family
  const handleUnassignGuestFamily = async (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;
    
    // Reset individual member allocations
    await updateGuest({
      ...guest,
      memberRooms: {}
    });

    // Remove room association
    await assignRoomToGuest(guestId, null);
  };

  // Main manual placement helper (used for dropdowns or clicks)
  const handleAssignClick = async (
    guestId: string, 
    roomId: string,
    customGuests: Guest[] = guests,
    customRoomAssignments: { [guestId: string]: string } = roomAssignments
  ): Promise<boolean> => {
    const room = rooms.find(r => r.id === roomId);
    const selectedGuest = customGuests.find(g => g.id === guestId);

    if (room && selectedGuest) {
      if (room.isMaintenance) {
        setRuleViolation(`Room "${room.name}" is currently blocked under Maintenance.`);
        return false;
      }

      const isDeclined = selectedGuest.rsvpStatus === 'Declined' || (selectedGuest.invitedEvents.length > 0 && selectedGuest.invitedEvents.every(id => selectedGuest.rsvp?.[id] === 'Declined'));
      if (isDeclined) {
        window.alert("This guest has declined their RSVP (Not Attending) and cannot be assigned to any room.");
        return false;
      }

      // Check capacity limit: calculate occupied bed weights correctly
      const occupants = getOccupantsInRoom(roomId, customGuests, customRoomAssignments);
      const currentOccupiedBeds = occupants.reduce((sum, occ) => sum + (occ.isChild && allowChildSharing ? 0 : 1), 0);

      // Selected guest capacity weights correctly
      const { numAdults, numChildren } = getGuestHeadcount(selectedGuest);
      const newGuestBeds = numAdults + (allowChildSharing ? 0 : numChildren);

      if (currentOccupiedBeds + newGuestBeds > room.capacity) {
        setPendingOverride({
          guestId,
          roomId,
          newGuestBeds,
          currentOccupiedBeds,
          capacity: room.capacity,
          roomName: room.name,
          guestName: selectedGuest.name,
          isMemberChange: false
        });
        return false;
      }

      // Enforce Critical Rules (excluding capacity)
      const violationMsg = checkRuleViolations(guestId, roomId, {}, true, true, customGuests, customRoomAssignments);
      if (violationMsg) {
        setRuleViolation(violationMsg);
        return false;
      }

      // Reset memberRooms to empty when assigning a new parent room
      await updateGuest({
        ...selectedGuest,
        memberRooms: {},
        isManualOverride: isDeclined
      });

      // Perform parent assignment
      await assignRoomToGuest(guestId, roomId, isDeclined);
      setSelectedGuestId(null);
      return true;
    }
    return false;
  };

  // Drag-and-Drop Drop helper
  const handleAssignDrop = async (dragData: string, roomId: string) => {
    setDraggedOverRoomId(null);

    if (dragData.startsWith("member:")) {
      const parts = dragData.split(":");
      const guestId = parts[1];
      const memberIndex = parseInt(parts[2], 10);

      const guest = guests.find(g => g.id === guestId);
      if (guest) {
        if (checkFamilyConflict(guestId, roomId)) {
          setPendingFamilyConflict({
            guestId,
            memberIndex,
            roomId
          });
        } else {
          await handleMemberRoomChange(guest, memberIndex, roomId);
        }
      }
    } else {
      const guestId = dragData;
      if (checkFamilyConflict(guestId, roomId)) {
        setPendingFamilyConflict({
          guestId,
          roomId
        });
      } else {
        await handleAssignClick(guestId, roomId);
      }
    }
  };

  // Change room dropdown for a single member
  const handleMemberRoomChange = async (guest: Guest, index: number, targetRoomId: string): Promise<boolean> => {
    if (targetRoomId && targetRoomId !== "unassigned") {
      const isDeclined = guest.rsvpStatus === 'Declined' || (guest.invitedEvents.length > 0 && guest.invitedEvents.every(id => guest.rsvp?.[id] === 'Declined'));
      if (isDeclined) {
        window.alert("This guest has declined their RSVP (Not Attending) and cannot be assigned to any room.");
        return false;
      }
    }

    const currentMemberRooms = { ...(guest.memberRooms || {}) };
    
    if (targetRoomId === "") {
      // Revert to parent allocation default
      delete currentMemberRooms[`m${index}`];
    } else {
      currentMemberRooms[`m${index}`] = targetRoomId;
    }

    // Check rules before saving (excluding capacity):
    const parentRoomId = roomAssignments[guest.id] || null;
    const violationMsg = checkRuleViolations(guest.id, parentRoomId, currentMemberRooms, true, true);
    if (violationMsg) {
      setRuleViolation(violationMsg);
      return false;
    }

    // Now check if capacity is exceeded in targetRoomId
    if (targetRoomId && targetRoomId !== "unassigned") {
      const room = rooms.find(r => r.id === targetRoomId);
      if (room) {
        const occupants = getOccupantsInRoom(targetRoomId);
        // Exclude this specific member if they are currently counted in occupants
        const filteredOccupants = occupants.filter(occ => !(occ.guest.id === guest.id && occ.memberIndex === index));
        const currentOccupiedBeds = filteredOccupants.reduce((sum, occ) => sum + (occ.isChild && allowChildSharing ? 0 : 1), 0);
        
        const { numAdults } = getGuestHeadcount(guest);
        const isChild = index >= numAdults;
        const newGuestBeds = (isChild && allowChildSharing) ? 0 : 1;

        if (currentOccupiedBeds + newGuestBeds > room.capacity) {
          setPendingOverride({
            guestId: guest.id,
            roomId: targetRoomId,
            newGuestBeds,
            currentOccupiedBeds,
            capacity: room.capacity,
            roomName: room.name,
            guestName: guest.memberNames?.[index] || guest.name,
            isMemberChange: true,
            memberIndex: index
          });
          return false;
        }
      }
    }

    const { numAdults, numChildren, totalCount } = getGuestHeadcount(guest);

    let allUnassigned = true;
    for (let i = 0; i < totalCount; i++) {
      const rId = currentMemberRooms[`m${i}`] !== undefined ? currentMemberRooms[`m${i}`] : parentRoomId;
      if (rId && rId !== "unassigned") {
        allUnassigned = false;
        break;
      }
    }

    const isDeclined = guest.rsvpStatus === 'Declined' || (guest.invitedEvents.length > 0 && guest.invitedEvents.every(id => guest.rsvp?.[id] === 'Declined'));

    if (allUnassigned) {
      const updated = {
        ...guest,
        memberRooms: {},
        isManualOverride: false
      };
      await updateGuest(updated);
      if (parentRoomId) {
        await assignRoomToGuest(guest.id, null, false);
      }
    } else {
      const updated = {
        ...guest,
        memberRooms: currentMemberRooms,
        isManualOverride: isDeclined ? true : !!guest.isManualOverride
      };
      await updateGuest(updated);

      // Check if family is now fully assigned, if so reset selection state immediately
      let fullyAssigned = true;
      for (let i = 0; i < totalCount; i++) {
        const rId = currentMemberRooms[`m${i}`] !== undefined ? currentMemberRooms[`m${i}`] : parentRoomId;
        if (!rId || rId === "unassigned") {
          fullyAssigned = false;
          break;
        }
      }
      if (fullyAssigned) {
        setSelectedGuestId(null);
      }
    }
    return true;
  };

  // Helper to check if a room already has guests from another family
  const checkFamilyConflict = (guestId: string, roomId: string): boolean => {
    if (!roomId || roomId === 'unassigned') return false;
    const occupants = getOccupantsInRoom(roomId);
    return occupants.some(occ => occ.guest.id !== guestId);
  };

  // Resolve conflict options selected from the custom popup
  const handleResolveFamilyConflict = async (action: 'add' | 'replace') => {
    if (!pendingFamilyConflict) return;
    const { guestId, memberIndex, roomId } = pendingFamilyConflict;

    const guest = guests.find(g => g.id === guestId);
    if (!guest) {
      setPendingFamilyConflict(null);
      return;
    }

    if (action === 'replace') {
      // 1. Remove all current occupants of other families from the room
      const occupants = getOccupantsInRoom(roomId);
      const otherFamilyGuests = occupants.filter(occ => occ.guest.id !== guestId);
      const guestIdsToUnassign = Array.from(new Set(otherFamilyGuests.map(occ => occ.guest.id)));

      for (const gId of guestIdsToUnassign) {
        const otherGuest = guests.find(g => g.id === gId);
        if (otherGuest) {
          // Clear memberRooms assigned to this room
          const currentMemberRooms = { ...(otherGuest.memberRooms || {}) };
          Object.keys(currentMemberRooms).forEach(key => {
            if (currentMemberRooms[key] === roomId) {
              delete currentMemberRooms[key];
            }
          });

          await updateGuest({
            ...otherGuest,
            memberRooms: currentMemberRooms
          });

          // If their parent room is this room, unassign it
          if (roomAssignments[otherGuest.id] === roomId) {
            await assignRoomToGuest(gId, null);
          }
        }
      }
    }

    // 2. Perform the assignment
    if (memberIndex !== undefined) {
      await handleMemberRoomChange(guest, memberIndex, roomId);
    } else {
      await handleAssignClick(guestId, roomId);
    }

    setPendingFamilyConflict(null);
  };

  // Edit custom name of a single member
  const handleMemberNameChange = async (guest: Guest, index: number, newName: string) => {
    const updatedNames = [...(guest.memberNames || [])];
    while (updatedNames.length < index) {
      updatedNames.push("");
    }
    updatedNames[index] = newName.trim();
    
    await updateGuest({
      ...guest,
      memberNames: updatedNames
    });
  };

  // First-Fit Decreasing solver with Child Sharing priority support
  const runAutoAllocation = () => {
    const logs: string[] = [];
    const unallocated: { name: string; size: number; reason: string }[] = [];
    const proposed: { [guestId: string]: string | null } = 
      allocationMode === 'Overwrite' ? {} : { ...roomAssignments };

    const activeRooms = rooms.filter(r => !r.isMaintenance);
    if (activeRooms.length === 0) {
      alert("No active hotel rooms found! Please configure rooms or use Tab 3 first.");
      return;
    }

    const roomOccupied: { [roomId: string]: number } = {};
    const roomFamilyMap: { [roomId: string]: string } = {}; // Tracks which family is assigned to which room

    rooms.forEach(r => {
      roomOccupied[r.id] = 0;
    });

    // Populate existing locked assignments
    Object.entries(proposed).forEach(([gId, rId]) => {
      if (!rId) return;
      const g = guests.find(g => g.id === gId);
      if (g) {
        const { numAdults: adults, numChildren: children } = getGuestHeadcount(g);
        const size = adults + (allowChildSharing ? 0 : children);
        if (roomOccupied[rId] !== undefined) {
          roomOccupied[rId] += size;
          roomFamilyMap[rId] = gId; // Lock in the family id
        }
      }
    });

    const guestsToAssign = guests.filter(g => !proposed[g.id]);
    
    // Sort
    const sortedGuests = [...guestsToAssign].sort((a, b) => {
      if (isVipPriorityActive) {
        const aVip = a.isVIP ? 1 : 0;
        const bVip = b.isVIP ? 1 : 0;
        if (aVip !== bVip) return bVip - aVip;
      }
      const { numAdults: numAAdults, numChildren: numAChildren } = getGuestHeadcount(a);
      const { numAdults: numBAdults, numChildren: numBChildren } = getGuestHeadcount(b);
      const numA = numAAdults + (allowChildSharing ? 0 : numAChildren);
      const numB = numBAdults + (allowChildSharing ? 0 : numBChildren);
      return numB - numA;
    });

    logs.push(`Initiating heuristics solver. Total unassigned groups to place: ${sortedGuests.length}.`);
    if (allowChildSharing) {
      logs.push(`👶 Child Bed-Sharing Rules: enabled. (Kids occupy 0 nominal bed constraints under parent supervision).`);
    } else {
      logs.push(`👶 Child Bed-Sharing Rules: disabled. (Kids occupy full physical bed slots).`);
    }

    let successCount = 0;

    sortedGuests.forEach(guest => {
      const { numAdults: adults, numChildren: children } = getGuestHeadcount(guest);
      const sizeNeeded = adults + (allowChildSharing ? 0 : children);
      const name = guest.familyName || `${guest.name}'s Family`;

      let bestRoom: Room | null = null;
      let minWaste = Infinity;

      activeRooms.forEach(room => {
        // Enforce Critical Rule 1: One Room = One Family
        if (roomFamilyMap[room.id] && roomFamilyMap[room.id] !== guest.id) {
          // Room already occupied by a different family! Skip!
          return;
        }

        const occupied = roomOccupied[room.id] || 0;
        const remaining = room.capacity - occupied;

        if (remaining >= sizeNeeded) {
          const waste = remaining - sizeNeeded;
          if (waste < minWaste) {
            minWaste = waste;
            bestRoom = room;
          }
        }
      });

      if (bestRoom) {
        const rId = (bestRoom as Room).id;
        proposed[guest.id] = rId;
        roomFamilyMap[rId] = guest.id; // Record family ownership of the room
        roomOccupied[rId] += sizeNeeded;
        successCount++;
        logs.push(`✅ Auto-Placed "${name}" (Sized ${sizeNeeded} slots) into room "${(bestRoom as Room).name}" (${(bestRoom as Room).hotelName || 'Taj Palace'}).`);
      } else {
        const maxCapacity = Math.max(...activeRooms.map(r => r.capacity), 0);
        if (sizeNeeded > maxCapacity) {
          unallocated.push({
            name,
            size: sizeNeeded,
            reason: `Family count of ${sizeNeeded} exceeds maximum single room size (${maxCapacity}). Manual split assignment suggested.`
          });
          logs.push(`⚠️ Skipped "${name}" (${sizeNeeded} slots) - size exceeds room limits.`);
        } else {
          unallocated.push({
            name,
            size: sizeNeeded,
            reason: `No vacant suites found with ${sizeNeeded} matching open beds of a single unused room.`
          });
          logs.push(`❌ Skipped "${name}" (${sizeNeeded} slots) - no free room configuration available.`);
        }
      }
    });

    logs.push(`Complete. Successfully planned ${successCount} entries!`);
    setDryRunResults(proposed);
    setDryRunLogs(logs);
    setUnallocatedFamilies(unallocated);
  };

  const applyAutoAllocation = async () => {
    if (!dryRunResults) return;
    await bulkAssignRooms(dryRunResults);
    setIsAutoAllocateModalOpen(false);
    setDryRunResults(null);
    setDryRunLogs([]);
    setUnallocatedFamilies([]);
    alert("Smart solver allocations saved permanently to Firestore database.");
  };

  // Export Room Report
  const handleExportRoomsReport = () => {
    let csv = "Hotel / Venue,Room Number,Max Capacity,Occupants Stay,Stay Interval,Status\n";
    rooms.forEach(room => {
      const occupants = getOccupantsInRoom(room.id);
      const isBlocked = !!room.isMaintenance;
      const details = occupants
        .map(occ => `${occ.memberName} [Stay: ${occ.checkIn || 'None'} to ${occ.checkOut || 'None'} (${occ.nightsCount} nights)]`)
        .join(" | ");

      csv += `"${(room.hotelName || 'Taj Palace').replace(/"/g, '""')}","${room.name.replace(/"/g, '""')}",${room.capacity},${occupants.length},"${details.replace(/"/g, '""')}","${isBlocked ? 'MAINTENANCE' : 'ACTIVE'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wedding_hotel_room_planner_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="room-allocation-tab" className="space-y-6 animate-fade-in">
      
      {/* Title Header area */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#1a2f26]/5 p-5 rounded-2xl border border-emerald-800/10">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#1a2f26]">Hotel Room Allocation Planner</h2>
          <p className="text-xs text-stone-500 mt-1">
            Derive stay intervals from guest RSVPs, manage bulk resort rooms, and drag/choose room dropdowns to shift single family members dynamically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Child sharing Config Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 shadow-2xs">
            <input 
              type="checkbox"
              id="global-child-sharing-toggle"
              checked={allowChildSharing}
              onChange={(e) => setAllowChildSharing(e.target.checked)}
              className="rounded text-emerald-800 focus:ring-emerald-700 h-4 w-4 cursor-pointer"
            />
            <label htmlFor="global-child-sharing-toggle" className="text-xs font-bold text-stone-700 select-none cursor-pointer">
              Child Bed-Sharing Allowed
            </label>
          </div>

          <button
            id="btn-auto-allocate"
            onClick={() => {
              setDryRunResults(null); 
              setDryRunLogs([]);
              setUnallocatedFamilies([]);
              setIsAutoAllocateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold transition-transform hover:scale-[1.02] shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5 fill-[#1a2f26] shrink-0" />
            <span>Auto-Allocate</span>
          </button>

          <button
            onClick={handleExportRoomsReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition-all hover:bg-amber-100"
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => openRoomModal()}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Single Room</span>
          </button>
        </div>
      </div>



      {/* Global Guest Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-150 p-5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-stone-800 text-sm flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-800" />
              <span>Instant Guest Finder & Room Status</span>
            </h3>
            <p className="text-xs text-stone-450">
              Type any guest's name to instantly locate which suite they are in, filter matching rooms, or see unassigned status.
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search guest name..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 focus:outline-hidden focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800 rounded-xl text-xs font-medium text-stone-800 shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 p-0.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md text-[10px] font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Real-time Result Banner */}
        {searchQuery.trim() && (
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-3 animate-fade-in">
            <div className="bg-amber-100/80 p-2 rounded-lg text-amber-800 shrink-0 mt-0.5">
              <Search className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="font-bold text-amber-950">Matching Search Results for "{searchQuery}":</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {(() => {
                  const matched = guests.filter(g => 
                    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (g.familyName || '').toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  if (matched.length === 0) {
                    return <p className="text-stone-500 italic">No guests match this name.</p>;
                  }
                  return matched.map(g => {
                    const parentRoomId = roomAssignments[g.id];
                    const { totalCount } = getGuestHeadcount(g);
                    
                    // Check individual rooms
                    const roomsAssigned = new Set<string>();
                    const hotelsAssigned = new Set<string>();
                    for (let i = 0; i < totalCount; i++) {
                      const rId = g.memberRooms?.[`m${i}`] !== undefined ? g.memberRooms[`m${i}`] : parentRoomId;
                      if (rId && rId !== 'unassigned') {
                        const r = rooms.find(room => room.id === rId);
                        if (r) {
                          roomsAssigned.add(r.name);
                          if (r.hotelName) hotelsAssigned.add(r.hotelName);
                        }
                      }
                    }

                    if (roomsAssigned.size > 0) {
                      return (
                        <div key={g.id} className="bg-white border border-amber-200/50 rounded-lg p-2.5 flex flex-col gap-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-stone-800">{g.name}</span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded-full font-bold">Assigned</span>
                          </div>
                          <p className="text-[11px] text-stone-600 font-medium">
                            Room: <strong className="text-emerald-800 font-extrabold">{Array.from(roomsAssigned).join(" & ")}</strong> 
                            {hotelsAssigned.size > 0 && ` (${Array.from(hotelsAssigned).join(", ")})`}
                          </p>
                        </div>
                      );
                    } else {
                      const isDeclined = g.rsvpStatus === 'Declined' || (g.invitedEvents.length > 0 && g.invitedEvents.every(id => g.rsvp?.[id] === 'Declined'));
                      return (
                        <div key={g.id} className="bg-white border border-stone-150 rounded-lg p-2.5 flex flex-col gap-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-700">{g.name}</span>
                            <span className="text-[10px] bg-stone-100 text-stone-500 border border-stone-200 px-1.5 py-0.5 rounded-full font-bold">
                              {isDeclined ? 'Declined' : 'Unassigned'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 italic">Currently in Unassigned Registry (Left Panel)</p>
                        </div>
                      );
                    }
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Dynamic Summary Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 mb-6">
        {/* Total Guests Card */}
        <div className="bg-white p-4 rounded-2xl border border-stone-150 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">All Invited Guests</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-stone-800">{stats.totalHeadcount}</span>
              <span className="text-xs text-stone-500">People</span>
            </div>
            <p className="text-[10px] text-stone-500 font-medium">{stats.totalFamilies} Guest Groups</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-600 shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Allocated Guests Card */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/80 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-800/70 font-bold uppercase tracking-wider">Allocated (Assigned)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-emerald-800">{stats.allocatedHeadcount}</span>
              <span className="text-xs text-emerald-700">People</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium">{stats.allocatedFamilies} Groups Housed</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-100/50 border border-emerald-200/50 flex items-center justify-center text-emerald-800 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Pending Assignment Card */}
        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/80 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-amber-800/70 font-bold uppercase tracking-wider">Pending Assignment</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-amber-800">{stats.pendingHeadcount}</span>
              <span className="text-xs text-amber-700">People</span>
            </div>
            <p className="text-[10px] text-amber-600 font-medium">{stats.pendingFamilies} Groups Left</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-100/50 border border-amber-200/50 flex items-center justify-center text-amber-700 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Room Bed Capacity Card */}
        <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/60 shadow-2xs flex flex-col justify-between gap-2 transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-indigo-800/70 font-bold uppercase tracking-wider">Suites Bed Occupancy</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-indigo-900">{stats.filledBeds}<span className="text-sm text-indigo-500/80 font-normal">/{stats.totalCapacity}</span></span>
                <span className="text-xs text-indigo-700 font-medium">Beds</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-100/50 border border-indigo-200/50 flex items-center justify-center text-indigo-800 shrink-0">
              <Hotel className="h-5 w-5" />
            </div>
          </div>
          
          {/* Quick Mini Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-indigo-100/60 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.filledBeds / (stats.totalCapacity || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] text-indigo-500 font-bold uppercase tracking-wider">
              <span>{stats.totalRoomsCount} Suites configured</span>
              <span>{Math.round((stats.filledBeds / (stats.totalCapacity || 1)) * 100)}% Filled</span>
            </div>
          </div>
        </div>
      </div>



      {/* Tabs Row */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('board')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider relative transition-colors cursor-pointer ${
            activeTab === 'board' ? 'text-emerald-800 border-b-2 border-emerald-800' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Bed className="inline-block h-4 w-4 mr-2" />
          Accommodation Board
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider relative transition-colors cursor-pointer ${
            activeTab === 'bulk' ? 'text-emerald-800 border-b-2 border-emerald-800' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          <Layers className="inline-block h-4 w-4 mr-2" />
          Bulk Suite Generator
        </button>
      </div>

      {/* Tab Contents: Tab 1 (Board) */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left Panel: Waiting List & Selector */}
          <div className="lg:col-span-2 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide bg-white p-4 rounded-2xl border border-stone-100 shadow-xs flex flex-col">
            <div className="border-b border-stone-100 pb-3.5 mb-3.5 space-y-3">
              <div>
                <h3 className="font-semibold text-stone-800 text-sm">Accommodation Guest Registry ({unassignedGuests.length})</h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Drag any guest family card on the left to assign rooms.</p>
              </div>
              
              {/* Main Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search by name, family..."
                  className="w-full pl-9 pr-3 py-1.5 border border-stone-200 focus:outline-hidden focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800 rounded-lg text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Assignment Status Filter Selector Buttons */}
              <div className="grid grid-cols-3 gap-1 bg-stone-50 p-1 rounded-lg border border-stone-150">
                {(['Unassigned', 'Assigned', 'All'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAssignmentFilter(type)}
                    className={`py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      assignmentFilter === type
                        ? 'bg-white text-emerald-800 shadow-2xs border border-stone-100'
                        : 'text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Double Column Dropdowns for RSVP and Side */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">RSVP Status</label>
                  <select
                    value={rsvpFilter}
                    onChange={(e) => setRsvpFilter(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-md py-1 px-1.5 text-[10px] font-medium text-stone-700 focus:outline-hidden focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800"
                  >
                    <option value="All">All RSVPs</option>
                    <option value="Attending">Attending</option>
                    <option value="Declined">Declined</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Wedding Side</label>
                  <select
                    value={sideFilter}
                    onChange={(e) => setSideFilter(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-md py-1 px-1.5 text-[10px] font-medium text-stone-700 focus:outline-hidden focus:border-emerald-800 focus:ring-1 focus:ring-emerald-800"
                  >
                    <option value="All">All Sides</option>
                    <option value="Groom">Groom's Side</option>
                    <option value="Bride">Bride's Side</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scrollable unassigned items */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-2 animate-fade-in">
              {unassignedGuests.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs italic">
                  No pending guests in waiting list! 🎉
                </div>
              ) : (
                unassignedGuests.map(g => {
                  const isSelected = selectedGuestId === g.id;
                  const isExpanded = !!expandedGuestIds[g.id];
                  const { totalCount, numAdults, numChildren } = getGuestHeadcount(g);
                  const isDeclined = g.rsvpStatus === 'Declined' || (g.invitedEvents.length > 0 && g.invitedEvents.every(id => g.rsvp?.[id] === 'Declined'));
                  const isAttending = g.rsvpStatus === 'Attending' || (g.invitedEvents.length > 0 && g.invitedEvents.some(id => g.rsvp?.[id] === 'Attending'));
                  const hasNoRoom = !g.roomNumber && (!roomAssignments[g.id] || roomAssignments[g.id] === 'unassigned');

                  const toggleExpand = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setExpandedGuestIds(prev => ({
                      ...prev,
                      [g.id]: !prev[g.id]
                    }));
                  };
                  
                  return (
                    <div
                      key={g.id}
                      draggable={!isDeclined}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", g.id);
                      }}
                      onClick={() => {
                        setSelectedGuestId(isSelected ? null : g.id);
                        setSelectedMember(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all flex flex-col gap-1.5 select-none hover:shadow-xs ${
                        isDeclined
                          ? 'cursor-not-allowed border-stone-200 bg-stone-100/70 opacity-80'
                          : 'cursor-grab active:cursor-grabbing hover:border-emerald-700/20 hover:bg-stone-50/70 border-stone-100 bg-stone-50/40'
                      } ${
                        isSelected
                          ? 'border-amber-400 bg-amber-50/20 shadow-xs'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="flex items-start gap-2">
                          <button
                            onClick={toggleExpand}
                            className="mt-0.5 p-0.5 hover:bg-stone-200/50 rounded transition-colors cursor-pointer shrink-0"
                            title={isExpanded ? "Collapse Family Members" : "Expand Family Members"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-stone-500" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-stone-500" />
                            )}
                          </button>
                          <div>
                            <div className="text-stone-800 text-xs flex items-center gap-1.5 flex-wrap font-semibold">
                              <span>{g.name}</span>
                              {isDeclined ? (
                                <span className="inline-flex px-2 py-0.5 text-[10px] bg-red-100 text-red-700 font-semibold rounded-full shrink-0">
                                  Declined
                                </span>
                              ) : (
                                <>
                                  <span className="inline-flex px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-mono font-bold rounded shrink-0">
                                    x{totalCount}
                                  </span>
                                  {isAttending && hasNoRoom && (
                                    <span className="inline-flex px-1.5 py-0.5 text-[9px] bg-green-100 text-green-800 border border-green-200 font-semibold rounded shrink-0 animate-pulse">
                                      Needs Room
                                    </span>
                                  )}
                                </>
                              )}
                              {g.warningTag && (
                                <span className="inline-flex px-1.5 py-0.5 text-[9px] bg-red-100 text-red-800 border border-red-200 font-semibold rounded shrink-0 animate-pulse">
                                  {g.warningTag}
                                </span>
                              )}
                              <span className="text-[10px] text-stone-400 font-medium shrink-0">
                                • {g.side ? `${g.side}'s Side` : 'Guest'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-stone-400 mt-1 font-medium">
                              {(() => {
                                const parentRoomId = roomAssignments[g.id];
                                if (totalCount === 0) return null;
                                
                                let assignedCount = 0;
                                let uniqueRooms = new Set<string>();
                                for (let i = 0; i < totalCount; i++) {
                                  const rId = g.memberRooms?.[`m${i}`] !== undefined ? g.memberRooms[`m${i}`] : parentRoomId;
                                  if (rId && rId !== "unassigned") {
                                    assignedCount++;
                                    const r = rooms.find(room => room.id === rId);
                                    if (r) uniqueRooms.add(r.name);
                                  }
                                }

                                if (assignedCount === 0) {
                                  return <span className="text-[8px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 px-1 py-0.5 rounded">Unassigned</span>;
                                } else if (assignedCount === totalCount && uniqueRooms.size === 1) {
                                  return <span className="text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-100 px-1 py-0.5 rounded">Room: {Array.from(uniqueRooms)[0]}</span>;
                                } else if (assignedCount === totalCount) {
                                  return <span className="text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-850 border border-emerald-100 px-1 py-0.5 rounded">Assigned (Split)</span>;
                                } else {
                                  return <span className="text-[8px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-100 px-1 py-0.5 rounded">Split ({assignedCount}/{totalCount})</span>;
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {totalCount > 1 && !isDeclined && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setSplitGuestObj(g);
                                const { numAdults } = getGuestHeadcount(g);
                                setSplitPart1Adults(Math.max(1, Math.floor(numAdults / 2)));
                                setSplitPart1Children(0);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                              title="Split Group"
                            >
                              <Scissors className="h-3 w-3 text-emerald-700" />
                              <span>Split</span>
                            </button>
                          )}
                          {isSelected && (
                            <span className="h-4.5 w-4.5 rounded-full bg-amber-400 flex items-center justify-center text-stone-900 border border-amber-500 text-[9px] shrink-0 font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expandable Family Members Accordion Dropdown */}
                      {isExpanded && (
                        <div 
                          className="pl-6 pr-1 py-2 border-t border-stone-100/80 space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[9px] text-stone-400 font-bold uppercase tracking-wider mb-1">
                            Family Members (Drag to split)
                          </div>
                          {(() => {
                            const { numAdults, numChildren, totalCount } = getGuestHeadcount(g);
                            const members: React.ReactNode[] = [];

                            for (let i = 0; i < totalCount; i++) {
                              let memberName = g.memberNames?.[i] || "";
                              if (!memberName) {
                                if (i === 0) memberName = g.name + " (Head)";
                                else if (i < numAdults) memberName = `Adult ${i + 1}`;
                                else memberName = `Child ${i - numAdults + 1}`;
                              }
                              const isChild = i >= numAdults;

                              // Check if this specific member is already assigned to a room
                              const memberRoomId = g.memberRooms?.[`m${i}`] !== undefined 
                                ? g.memberRooms[`m${i}`] 
                                : roomAssignments[g.id];
                              
                              const assignedRoom = rooms.find(r => r.id === memberRoomId);
                              const isMemberSelected = selectedMember?.guestId === g.id && selectedMember?.memberIndex === i;

                              members.push(
                                <div
                                  key={i}
                                  draggable={!isDeclined}
                                  onDragStart={(e) => {
                                    if (isDeclined) {
                                      e.preventDefault();
                                      return;
                                    }
                                    e.stopPropagation(); // Stop parent drag start
                                    e.dataTransfer.setData("text/plain", `member:${g.id}:${i}`);
                                  }}
                                  onClick={(e) => {
                                    if (isDeclined) return;
                                    e.stopPropagation();
                                    setSelectedMember(isMemberSelected ? null : { guestId: g.id, memberIndex: i });
                                    setSelectedGuestId(null);
                                  }}
                                  className={`p-2 rounded-lg border text-[11px] font-medium flex items-center justify-between transition-all ${
                                    isDeclined
                                      ? 'bg-stone-100/70 border-stone-200 text-stone-400 cursor-not-allowed'
                                      : 'cursor-grab active:cursor-grabbing'
                                  } ${
                                    isMemberSelected
                                      ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400 shadow-xs text-stone-850 font-semibold'
                                      : assignedRoom 
                                        ? 'bg-emerald-50/40 border-emerald-100 text-stone-750 hover:bg-emerald-50/60' 
                                        : 'bg-white border-stone-150 hover:border-stone-300 text-stone-600 shadow-3xs hover:bg-stone-50/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <User className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                                    <div className="flex flex-col min-w-0">
                                      <span className="truncate">{memberName}</span>
                                      {isChild && (
                                        <span className="text-[8px] text-amber-700 font-bold uppercase">Child</span>
                                      )}
                                    </div>
                                  </div>
                                  {isMemberSelected ? (
                                    <span className="text-[9px] bg-amber-400 text-stone-900 font-bold px-1.5 py-0.5 rounded shrink-0 ml-1 border border-amber-500">
                                      Selected ✓
                                    </span>
                                  ) : assignedRoom ? (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded shrink-0 ml-1">
                                      {assignedRoom.name}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-stone-400 italic shrink-0 ml-1">
                                      Unassigned
                                    </span>
                                  )}
                                </div>
                              );
                            }
                            return members;
                          })()}
                        </div>
                      )}

                      {/* Fallback Manual Allocation Option */}
                      {(() => {
                        const isDeclined = g.rsvpStatus === 'Declined' || (g.invitedEvents.length > 0 && g.invitedEvents.every(id => g.rsvp?.[id] === 'Declined'));
                        return (
                          <select
                            value=""
                            disabled={isDeclined}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.value) {
                                handleAssignClick(g.id, e.target.value);
                              }
                            }}
                            className={`text-[10px] font-semibold border rounded-lg py-1 px-1.5 w-full cursor-pointer focus:ring-1 focus:ring-emerald-800 focus:outline-hidden transition ${
                              isDeclined
                                ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                                : 'bg-white border-stone-200 text-stone-500 hover:text-stone-700'
                            }`}
                          >
                            <option value="">{isDeclined ? 'Cannot Assign (Not Attending)' : 'Quick Assign Entire Family...'}</option>
                            {!isDeclined && rooms.filter(r => !r.isMaintenance).map(r => {
                              const occupants = getOccupantsInRoom(r.id);
                              const currentOccupiedBeds = occupants.reduce((sum, occ) => sum + (occ.isChild && allowChildSharing ? 0 : 1), 0);
                              const isFull = currentOccupiedBeds >= r.capacity;
                              return (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({currentOccupiedBeds}/{r.capacity} beds {isFull ? ' - OVER-CAPACITY' : 'filled'})
                                </option>
                              );
                            })}
                          </select>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>

            {/* FAMILY MEMBER DIRECTORY DETAIL CHANGER PANEL */}
            {selectedGuestId && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 mt-3 space-y-3 max-h-[300px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 text-[10px] uppercase tracking-wider">Modify Stay & Split Details</span>
                  <button onClick={() => setSelectedGuestId(null)} className="text-[9px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md hover:bg-rose-100 transition">
                    Close
                  </button>
                </div>

                {/* Custom Stay Dates Override Block */}
                {(() => {
                  const g = guests.find(g => g.id === selectedGuestId);
                  if (!g) return null;
                  
                  return (
                    <div className="bg-amber-50/40 border border-amber-200/50 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 text-[9px] uppercase tracking-wider">Custom Stay override</span>
                        {g.checkInDate || g.checkOutDate ? (
                          <span className="text-[8px] bg-amber-200 text-amber-900 font-bold px-1 rounded">Active</span>
                        ) : null}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold text-stone-400 uppercase">In</span>
                          <input
                            type="date"
                            value={g.checkInDate || ""}
                            onChange={async (e) => {
                              await updateGuest({
                                ...g,
                                checkInDate: e.target.value || undefined
                              });
                            }}
                            className="w-full text-[9px] font-semibold border border-stone-200 p-1 rounded bg-white text-stone-700"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold text-stone-400 uppercase">Out</span>
                          <input
                            type="date"
                            value={g.checkOutDate || ""}
                            onChange={async (e) => {
                              await updateGuest({
                                ...g,
                                checkOutDate: e.target.value || undefined
                              });
                            }}
                            className="w-full text-[9px] font-semibold border border-stone-200 p-1 rounded bg-white text-stone-700"
                          />
                        </div>
                      </div>
                      
                      {(g.checkInDate || g.checkOutDate) && (
                        <button
                          type="button"
                          onClick={async () => {
                            await updateGuest({
                              ...g,
                              checkInDate: undefined,
                              checkOutDate: undefined
                            });
                          }}
                          className="text-[9px] text-rose-600 font-bold hover:underline block pt-0.5"
                        >
                          Clear manual override (use RSVPs)
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Split member configuration */}
                {(() => {
                  const g = guests.find(g => g.id === selectedGuestId);
                  if (!g) return null;
                  
                  const { numAdults, numChildren, totalCount } = getGuestHeadcount(g);

                  const directory: React.ReactNode[] = [];
                  for (let i = 0; i < totalCount; i++) {
                    directory.push(
                      <div key={i} className="bg-white p-2 rounded border border-stone-100 space-y-1">
                        <div className="text-[8px] text-stone-400 font-bold uppercase">
                          {i === 0 ? "Family Head" : i < numAdults ? `Adult ${i + 1}` : `Child ${i - numAdults + 1}`}
                        </div>
                        <input
                          type="text"
                          placeholder={i === 0 ? g.name : `Member ${i+1}`}
                          className="w-full text-[10px] border border-stone-200 py-0.5 px-1.5 rounded-sm"
                          value={g.memberNames?.[i] || ""}
                          onChange={(e) => handleMemberNameChange(g, i, e.target.value)}
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-1.5 pt-1.5 border-t border-stone-200">
                      <span className="font-bold text-stone-700 text-[9px] uppercase tracking-wider block">Family Member Names</span>
                      {directory}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Right Panel: Suites Cards list */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-stone-500 px-1 border-b border-stone-100 pb-2">
              <span>Palace Suite Grid ({rooms.length})</span>
              <span>Inventory status & beds filled</span>
            </div>

            {rooms.length === 0 ? (
              <div className="bg-white rounded-2xl py-24 text-center border border-stone-100 shadow-xs text-stone-400">
                <Bed className="h-8 w-8 mx-auto text-stone-300 mb-3" />
                <p className="text-sm font-semibold">No Hotel Rooms configured</p>
                <p className="text-xs mt-1">Directly use 'Bulk Suite Generator' tab on the header to build rooms instantly!</p>
              </div>
            ) : visibleRooms.length === 0 ? (
              <div className="bg-white rounded-2xl py-24 text-center border border-stone-100 shadow-xs text-stone-400">
                <Search className="h-8 w-8 mx-auto text-stone-300 mb-3 animate-pulse" />
                <p className="text-sm font-semibold">No matching rooms found</p>
                <p className="text-xs mt-1">None of the assigned guests in the hotel rooms match your search query "{searchQuery}".</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
                {visibleRooms.map(room => {
                  const occupants = getOccupantsInRoom(room.id);
                  const currentOccupiedBeds = occupants.reduce((sum, occ) => sum + (occ.isChild && allowChildSharing ? 0 : 1), 0);
                  const isBlocked = !!room.isMaintenance;
                  const isFull = currentOccupiedBeds >= room.capacity || isBlocked;
                  const isDraggedOver = draggedOverRoomId === room.id;

                  // Group occupants by guest.id to show unified family entries
                  const occupantsByGuest: { [guestId: string]: typeof occupants } = {};
                  occupants.forEach(occ => {
                    if (!occupantsByGuest[occ.guest.id]) {
                      occupantsByGuest[occ.guest.id] = [];
                    }
                    occupantsByGuest[occ.guest.id].push(occ);
                  });
                  
                  return (
                    <div
                      key={room.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDragEnter={() => {
                        if (!isFull) setDraggedOverRoomId(room.id);
                      }}
                      onDragLeave={() => {
                        setDraggedOverRoomId(null);
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const guestId = e.dataTransfer.getData("text/plain");
                        if (guestId) {
                          await handleAssignDrop(guestId, room.id);
                        }
                      }}
                      onClick={async () => {
                        if (isBlocked) return;
                        
                        if (selectedGuestId) {
                          await handleAssignClick(selectedGuestId, room.id);
                        } else if (selectedMember) {
                          const guest = guests.find(g => g.id === selectedMember.guestId);
                          if (guest) {
                            const success = await handleMemberRoomChange(guest, selectedMember.memberIndex, room.id);
                            if (success) {
                              setSelectedMember(null);
                            }
                          }
                        }
                      }}
                      className={`bg-white rounded-2xl p-5 border flex flex-col justify-between transition-all duration-205 relative ${
                        isBlocked
                          ? 'border-red-100 bg-red-50/10'
                          : isDraggedOver
                          ? 'border-emerald-600 bg-emerald-50/35 ring-4 ring-emerald-600/10 scale-[1.01] border-dashed'
                          : (selectedGuestId || selectedMember) && !isFull
                          ? 'border-emerald-600/20 ring-2 ring-emerald-600/5 hover:border-emerald-500 cursor-pointer hover:bg-emerald-50/10'
                          : 'border-stone-150 shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      {/* Room Header Info */}
                      <div className="space-y-2 pb-3 border-b border-stone-100 w-full">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <Bed className="h-4 w-4 text-emerald-800 shrink-0" />
                              <h4 className="font-serif font-black text-stone-800 text-sm">{room.name}</h4>
                            </div>
                            <span className="text-[10px] text-stone-500 font-medium mt-0.5">
                              🏨 {room.hotelName || 'Taj Palace'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRoomModal(room);
                              }}
                              className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded"
                              title="Edit Room properties"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {confirmDeleteRoomId === room.id ? (
                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteRoom(room.id);
                                    setConfirmDeleteRoomId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-red-650 text-white text-[9px] font-bold rounded"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteRoomId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-stone-100 text-[9px] rounded"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteRoomId(room.id);
                                }}
                                className="p-1 text-stone-400 hover:text-red-700 rounded"
                                title="Delete Room"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Capacity Status Bar */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-400 uppercase font-mono tracking-wider text-[9px] font-bold">Capacity Indicator</span>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                              isBlocked 
                                ? 'bg-red-100 text-red-750' 
                                : currentOccupiedBeds > room.capacity 
                                ? 'bg-red-500 text-white border border-red-600 animate-pulse' 
                                : isFull 
                                ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            }`}>
                              {isBlocked 
                                ? 'BLOCKED' 
                                : currentOccupiedBeds > room.capacity 
                                ? `⚠️ OVER-CAPACITY: ${currentOccupiedBeds}/${room.capacity}` 
                                : `${currentOccupiedBeds} / ${room.capacity} beds filled`}
                            </span>
                          </div>
                          
                          {/* Visual Progress Bar */}
                          {!isBlocked && (
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  currentOccupiedBeds > room.capacity
                                    ? 'bg-red-500 animate-pulse'
                                    : currentOccupiedBeds === room.capacity
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-600'
                                }`}
                                style={{ width: `${Math.min(100, (currentOccupiedBeds / (room.capacity || 1)) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Unified Assigned Family Blocks (Simplified View) */}
                      <div className="py-3 flex-1">
                        {occupants.length === 0 ? (
                          <div className="text-xs text-stone-400 italic py-2 leading-normal text-center border border-dashed border-stone-200 rounded-xl bg-stone-50/30">
                            Drag or assign guests here
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {Object.entries(occupantsByGuest).map(([guestId, occList]) => {
                              const firstOcc = occList[0];
                              const guest = firstOcc.guest;
                              const peopleCount = occList.length;
                              const bedsUsed = occList.reduce((sum, occ) => sum + (occ.isChild && allowChildSharing ? 0 : 1), 0);

                              const isSearchMatch = searchQuery.trim() && (
                                guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (guest.familyName || '').toLowerCase().includes(searchQuery.toLowerCase())
                              );

                              return (
                                <div 
                                  key={guestId} 
                                  className={`border rounded-xl p-3 flex items-center justify-between text-xs text-stone-850 shadow-2xs transition-all ${
                                    isSearchMatch 
                                      ? 'bg-amber-50/90 border-amber-350 ring-2 ring-amber-400/40 font-bold scale-[1.01]' 
                                      : 'bg-stone-50/70 border-stone-150 hover:bg-stone-50'
                                  }`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-stone-800">{guest.name}</span>
                                    <span className="text-[10px] text-stone-400 font-medium">
                                      {guest.side ? `${guest.side}'s Side` : 'Guest'} • {peopleCount} {peopleCount > 1 ? 'guests' : 'guest'} ({bedsUsed} {bedsUsed === 1 ? 'bed' : 'beds'} used)
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnassignGuestFamily(guestId);
                                    }}
                                    className="p-1 text-stone-400 hover:text-rose-600 rounded-lg transition hover:bg-rose-50 cursor-pointer"
                                    title="Unassign Family"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Manual Drag Overlay Button Fallback */}
                      {selectedGuestId && !isBlocked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignClick(selectedGuestId, room.id);
                          }}
                          className="w-full mt-2 bg-emerald-850 hover:bg-emerald-900 text-white py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Allocate Selected Here
                        </button>
                      )}
                      {selectedMember && !isBlocked && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const guest = guests.find(g => g.id === selectedMember.guestId);
                            if (guest) {
                              const success = await handleMemberRoomChange(guest, selectedMember.memberIndex, room.id);
                              if (success) {
                                setSelectedMember(null);
                              }
                            }
                          }}
                          className="w-full mt-2 bg-emerald-850 hover:bg-emerald-900 text-white py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer animate-pulse"
                        >
                          Allocate Member Here
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}



      {/* Tab Contents: Tab 3 (Bulk Suite Generator) */}
      {activeTab === 'bulk' && (
        <div className="bg-white p-6 max-w-xl mx-auto rounded-3xl border border-stone-100 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-900">
              <Layers className="h-5 w-5" />
              <h3 className="font-serif text-lg font-bold">Bulk Resort Room Generator</h3>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Hotels often provide blocks of identical rooms. Rather than adding 40 rooms one-by-one manually, define a range of room numbers here to create them all instantly.
            </p>
          </div>

          {bulkSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs p-3.5 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-800 shrink-0" />
              <span>{bulkSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleBulkSubmit} className="space-y-4">
            {/* Hotel Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Hotel / Resort Name</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-850 rounded-xl text-xs"
                placeholder="e.g. Taj Palace, Heritage Resort"
                value={bulkHotelName}
                onChange={(e) => setBulkHotelName(e.target.value)}
              />
            </div>

            {/* Start and End number range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Start Room Number</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-850 rounded-xl text-xs"
                  value={bulkStartNum}
                  onChange={(e) => setBulkStartNum(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">End Room Number</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-850 rounded-xl text-xs"
                  value={bulkEndNum}
                  onChange={(e) => setBulkEndNum(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Occupants capacity limit */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Beds Capacity per Room</label>
              <input
                type="number"
                min={1}
                max={10}
                required
                className="w-full px-3 py-2 border border-[#eae9e0] focus:ring-1 focus:ring-emerald-850 rounded-xl text-xs bg-[#faf9f6]/40"
                value={bulkCapacity}
                onChange={(e) => setBulkCapacity(Number(e.target.value))}
              />
              <p className="text-[10px] text-stone-400 mt-1">
                A single room with customized capacity blocks (e.g. 4 beds for family occupancy sharing).
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Bulk Create Rooms</span>
            </button>
          </form>
        </div>
      )}

      {/* Rule Violation Overlay Modal */}
      {ruleViolation && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in animate-duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-red-100 overflow-hidden relative">
            <div className="bg-gradient-to-r from-red-500/10 to-rose-500/5 p-6 border-b border-red-100/50 flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-700 rounded-2xl shrink-0 shadow-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-black text-rose-950">
                  Wedding Portal Business Rule Warning
                </h3>
                <p className="text-xs text-rose-800 font-medium mt-0.5 font-mono">STRICT ALLOCATION CONSTRAINT ATTEMPTED</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Detailed dynamic message */}
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <p className="text-stone-800 text-xs font-semibold leading-relaxed">
                  {ruleViolation}
                </p>
              </div>

              {/* Instructive Business Rules Reminders */}
              <div className="space-y-3 pt-1">
                <h4 className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">Crucial Wedding Constraints Recap</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-150/50 space-y-1">
                    <span className="text-[11px] font-bold text-stone-700 block">Rule #1: One Room = One Family</span>
                    <p className="text-[9px] text-stone-400 leading-tight">Separate guest families must NEVER be mixed in the same room. Empty rooms are kept "Free" until assigned to members of a single family only.</p>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-150/50 space-y-1">
                    <span className="text-[11px] font-bold text-stone-700 block">Rule #2: Occupancy is a Hard Limit</span>
                    <p className="text-[9px] text-stone-400 leading-tight">Room capacities cannot be exceeded. Any member placement exceeding normal room limit is blocked to prevent hotel supply mismatches.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-4 flex items-center justify-end border-t border-stone-100/80">
              <button
                type="button"
                onClick={() => setRuleViolation(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Dismiss & Adjust Allocations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Capacity Confirmation Modal */}
      {pendingOverride && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in animate-duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-amber-100 overflow-hidden relative">
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 p-6 border-b border-amber-100/50 flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shrink-0 shadow-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-black text-amber-950">
                  Room Capacity Exceeded Warning
                </h3>
                <p className="text-xs text-amber-800 font-medium mt-0.5 font-mono">ADMINISTRATIVE MANUAL OVERRIDE PROTOCOL</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                <p className="text-stone-800 text-xs font-semibold leading-relaxed">
                  Assigning <span className="font-bold text-amber-900">{pendingOverride.guestName}</span> to <span className="font-bold text-amber-900">{pendingOverride.roomName}</span> will exceed its maximum capacity limit.
                </p>
                <div className="text-[11px] text-stone-600 font-mono space-y-1">
                  <p>• Room Max Capacity: <span className="font-bold">{pendingOverride.capacity} beds</span></p>
                  <p>• Current Occupied Beds: <span className="font-bold">{pendingOverride.currentOccupiedBeds} beds</span></p>
                  <p>• New Placement Weight: <span className="font-bold">{pendingOverride.newGuestBeds} beds</span></p>
                  <p>• Projected Occupancy: <span className="font-bold text-red-650">{pendingOverride.currentOccupiedBeds + pendingOverride.newGuestBeds} beds</span></p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-stone-500 leading-relaxed">
                  As an Administrator, you can manually override this capacity limit. The assignment will be locked to prevent automated evictions, and an over-capacity indicator will be shown on the Suite board.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setPendingOverride(null)}
                className="px-4 py-2 border border-stone-250 hover:bg-stone-50 text-xs font-semibold text-stone-650 rounded-xl transition"
              >
                Cancel Assignment
              </button>
              <button
                type="button"
                onClick={handleConfirmOverride}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl shadow-md transition"
              >
                Confirm Capacity Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Family Conflict Resolution Modal */}
      {pendingFamilyConflict && (() => {
        const room = rooms.find(r => r.id === pendingFamilyConflict.roomId);
        const guest = guests.find(g => g.id === pendingFamilyConflict.guestId);
        if (!room || !guest) return null;

        const occupants = getOccupantsInRoom(pendingFamilyConflict.roomId);
        const otherFamilyGuests = occupants.filter(occ => occ.guest.id !== guest.id);
        const uniqueOtherFamilyGuests = Array.from(
          new Map(otherFamilyGuests.map(occ => [occ.guest.id, occ.guest])).values()
        );
        const otherFamiliesStr = uniqueOtherFamilyGuests
          .map(g => g.familyName || g.name)
          .join(", ");

        const guestDisplayName = pendingFamilyConflict.memberIndex !== undefined
          ? (guest.memberNames?.[pendingFamilyConflict.memberIndex] || guest.name)
          : (guest.familyName || guest.name);

        return (
          <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in animate-duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-amber-100 overflow-hidden relative">
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 p-6 border-b border-amber-100/50 flex items-start gap-4">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shrink-0 shadow-sm">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-black text-amber-950">
                    Mixed Family Accommodation Choice
                  </h3>
                  <p className="text-xs text-amber-800 font-medium mt-0.5 font-mono">ROOM HAS EXISTING OCCUPANTS FROM ANOTHER FAMILY</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                  <p className="text-stone-800 text-xs font-semibold leading-relaxed">
                    This room already has guests from another family (<span className="font-bold text-amber-900">{otherFamiliesStr || "Another Family"}</span>). What would you like to do?
                  </p>
                </div>

                <div className="space-y-2 text-xs text-stone-500 leading-relaxed">
                  <p>
                    Choose <strong>Add Together</strong> to allow multiple families to share this room. Choose <strong>Replace</strong> to remove the current occupants (return them to the unassigned list) and allocate this room to <strong className="text-stone-800">{guestDisplayName}</strong> instead.
                  </p>
                </div>
              </div>

              <div className="bg-stone-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setPendingFamilyConflict(null)}
                  className="px-4 py-2 border border-stone-250 hover:bg-stone-50 text-xs font-semibold text-stone-650 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveFamilyConflict('replace')}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveFamilyConflict('add')}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Add Together
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit / Add Room Properties Modal Popup */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-stone-100 overflow-hidden relative">
            <button
              onClick={() => setIsRoomModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <form onSubmit={handleRoomSubmit} className="space-y-4 p-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-800">
                  {editingRoom ? 'Edit Room Properties' : 'Add Single Suite'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Control room numbers and maximum occupancy capacity limits.</p>
              </div>

              <div className="space-y-4">
                {/* Hotel Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Hotel Location</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-xs"
                    placeholder="e.g. Taj Palace"
                    value={singleHotelName}
                    onChange={(e) => setSingleHotelName(e.target.value)}
                  />
                </div>

                {/* Suite Title */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Room Title / Number</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-xs"
                    placeholder="e.g. Room 101"
                    value={singleRoomName}
                    onChange={(e) => setSingleRoomName(e.target.value)}
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Max Bed Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-850 rounded-xl text-xs"
                    value={singleCapacity}
                    onChange={(e) => setSingleCapacity(Number(e.target.value))}
                  />
                </div>

                {/* Maintenance Block */}
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="room-maintenance-flag"
                    className="rounded text-emerald-800 focus:ring-emerald-700 h-4 w-4 cursor-pointer"
                    checked={isMaintenance}
                    onChange={(e) => setIsMaintenance(e.target.checked)}
                  />
                  <label htmlFor="room-maintenance-flag" className="text-xs font-semibold text-stone-700 select-none cursor-pointer flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-150 text-red-700 border border-red-200 text-[10px] font-bold">Blocked</span>
                    <span>Room Blocked / Under Repair</span>
                  </label>
                </div>
              </div>

              {/* Submit actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 border border-stone-250 hover:bg-stone-50 text-xs font-semibold text-stone-650 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  {editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Allocation Setup / Logs Simulator Modal */}
      {isAutoAllocateModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-stone-200/50 overflow-hidden relative my-8">
            <button
              onClick={() => setIsAutoAllocateModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <div className="flex items-center gap-2 text-amber-600">
                  <Sparkles className="h-5 w-5 fill-amber-500 text-amber-500 animate-pulse" />
                  <h3 className="font-serif text-xl font-bold text-stone-900 uppercase tracking-wide">
                    Intelligent Auto-Allocation Solver
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Optimize accommodations dynamically. Generates suggestion mappings while maintaining family unifications.
                </p>
              </div>

              {/* Optimization Settings */}
              {!dryRunResults && (
                <div className="space-y-4 bg-stone-50 p-5 rounded-2xl border border-stone-100">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-widest">Solver Constraints</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    {/* Mode selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-stone-600">Solver Strategy</label>
                      <select
                        className="w-full text-xs font-semibold bg-white border border-stone-200 rounded-xl py-2 px-3 text-stone-700 focus:ring-1 focus:ring-emerald-850"
                        value={allocationMode}
                        onChange={(e) => setAllocationMode(e.target.value as 'Preserve' | 'Overwrite')}
                      >
                        <option value="Preserve">Preserve Existing (Fill vacancies)</option>
                        <option value="Overwrite">Total Overwrite (Recalculate everything)</option>
                      </select>
                    </div>

                    {/* VIP priority toggle */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-stone-600">Priority Protocol</label>
                      <div className="flex items-center gap-2 mt-2 bg-white px-3 py-2 border border-stone-200 rounded-xl">
                        <input
                          type="checkbox"
                          id="solver-vip-priority-toggle"
                          className="rounded text-emerald-800 focus:ring-emerald-700 h-4 w-4 cursor-pointer"
                          checked={isVipPriorityActive}
                          onChange={(e) => setIsVipPriorityActive(e.target.checked)}
                        />
                        <label htmlFor="solver-vip-priority-toggle" className="text-xs font-bold text-stone-705 select-none cursor-pointer">
                          ⭐ Prioritize VIP Families
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Solver Outputs */}
              {dryRunResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-widest">Simulator Outputs</h4>
                    <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-805 border border-emerald-100 text-[10px] font-bold font-mono">
                      Calculations Prepared
                    </span>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-stone-50 border border-stone-100 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-emerald-800 font-mono">
                        {Object.values(dryRunResults).filter(v => v !== null).length}
                      </div>
                      <div className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Allocated</div>
                    </div>
                    
                    <div className="bg-stone-50 border border-stone-100 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-amber-600 font-mono">
                        {unallocatedFamilies.length}
                      </div>
                      <div className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Unassigned</div>
                    </div>

                    <div className="bg-stone-50 border border-stone-100 p-3 rounded-xl text-center">
                      <div className="text-lg font-bold text-stone-800 font-mono">
                        {rooms.filter(r => !r.isMaintenance).length}
                      </div>
                      <div className="text-[9px] text-stone-400 font-bold uppercase tracking-widest font-sans">Active Rooms</div>
                    </div>
                  </div>

                  {/* Warnings Panel */}
                  {unallocatedFamilies.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100/60 text-stone-800 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-805 font-bold uppercase tracking-wider text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Room Allocation Warnings ({unallocatedFamilies.length})</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1.5 text-[11px] leading-relaxed pt-1">
                        {unallocatedFamilies.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1">
                            <span className="font-bold text-rose-700 shrink-0">• {item.name}:</span>
                            <span className="text-stone-600">{item.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Terminal Console Logs */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Solver Execution Step Logs</span>
                    <div className="bg-stone-900 border border-stone-800 text-stone-200 p-3 rounded-xl font-mono text-[10px] text-left space-y-1 max-h-36 overflow-y-auto leading-relaxed">
                      {dryRunLogs.map((logStr, idx) => (
                        <div key={idx} className={logStr.includes('❌') || logStr.includes('⚠️') ? 'text-red-355' : logStr.includes('✅') ? 'text-emerald-400 font-semibold' : 'text-stone-300'}>
                          {logStr}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoAllocateModalOpen(false);
                    setDryRunResults(null);
                  }}
                  className="px-5 py-2.5 border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-650 rounded-xl uppercase tracking-wider"
                >
                  Cancel
                </button>

                {!dryRunResults ? (
                  <button
                    type="button"
                    onClick={runAutoAllocation}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Run Optimization Run</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDryRunResults(null)}
                      className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                      Reset Strategy
                    </button>
                    <button
                      type="button"
                      onClick={applyAutoAllocation}
                      className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Commit Mappings</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Family Group Modal */}
      {splitGuestObj && (() => {
        const { numAdults, numChildren, totalCount } = getGuestHeadcount(splitGuestObj);
        const part1Adults = splitPart1Adults;
        const part1Children = splitPart1Children;
        const part2Adults = Math.max(0, numAdults - part1Adults);
        const part2Children = Math.max(0, numChildren - part1Children);
        const part1Total = part1Adults + part1Children;
        const part2Total = part2Adults + part2Children;

        const part1Name = `${splitGuestObj.name} (Part 1)`;
        const part2Name = `${splitGuestObj.name} (Part 2)`;

        const isValidSplit = part1Total > 0 && part2Total > 0;

        const handleSplitSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!isValidSplit) return;
          try {
            await splitGuest(
              splitGuestObj.id,
              part1Name,
              part1Adults,
              part1Children,
              part2Name,
              part2Adults,
              part2Children
            );
            setSplitGuestObj(null);
          } catch (err) {
            console.error("Error splitting guest:", err);
          }
        };

        return (
          <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200/50 overflow-hidden relative">
              <button
                onClick={() => setSplitGuestObj(null)}
                className="absolute top-5 right-5 p-1.5 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-emerald-850">
                    <Scissors className="h-5 w-5 text-emerald-700" />
                    <h3 className="font-serif text-xl font-bold text-stone-900 uppercase tracking-wide">
                      Split Guest Group
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Divide a large family group into two independent parts for flexible room allocation.
                  </p>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 text-xs space-y-2 text-stone-700">
                  <div className="flex justify-between font-semibold border-b border-stone-200/60 pb-2 mb-1">
                    <span>Original Group:</span>
                    <span className="text-stone-900 font-bold">{splitGuestObj.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Group Headcount:</span>
                    <span className="font-mono font-bold text-stone-900">{totalCount} members</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>Adults / Children count:</span>
                    <span>{numAdults} Adults, {numChildren} Children</span>
                  </div>
                </div>

                <form onSubmit={handleSplitSubmit} className="space-y-5">
                  {/* Part 1 Configuration */}
                  <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 space-y-3.5">
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center justify-between">
                      <span>Part 1 (Recipient)</span>
                      <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px]">{part1Total} Members</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-stone-600">Adults</label>
                        <select
                          className="w-full text-xs font-semibold bg-white border border-stone-200 rounded-xl py-1.5 px-2.5 text-stone-700 focus:ring-1 focus:ring-emerald-850"
                          value={part1Adults}
                          onChange={(e) => setSplitPart1Adults(parseInt(e.target.value))}
                        >
                          {Array.from({ length: numAdults + 1 }, (_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-stone-600">Children</label>
                        <select
                          className="w-full text-xs font-semibold bg-white border border-stone-200 rounded-xl py-1.5 px-2.5 text-stone-700 focus:ring-1 focus:ring-emerald-850"
                          value={part1Children}
                          onChange={(e) => setSplitPart1Children(parseInt(e.target.value))}
                        >
                          {Array.from({ length: numChildren + 1 }, (_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <span className="block text-[10px] text-stone-500 italic">
                        Will be cloned as: <strong className="text-stone-700">{part1Name}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Part 2 Configuration (Auto calculated) */}
                  <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3.5">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center justify-between">
                      <span>Part 2 (Remainder)</span>
                      <span className="font-mono bg-stone-200 text-stone-700 px-2 py-0.5 rounded text-[10px]">{part2Total} Members</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-stone-600">Adults (Auto)</label>
                        <div className="w-full text-xs font-mono font-bold bg-white border border-stone-200 rounded-xl py-1.5 px-2.5 text-stone-800">
                          {part2Adults}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-stone-600">Children (Auto)</label>
                        <div className="w-full text-xs font-mono font-bold bg-white border border-stone-200 rounded-xl py-1.5 px-2.5 text-stone-800">
                          {part2Children}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <span className="block text-[10px] text-stone-500 italic">
                        Will be cloned as: <strong className="text-stone-700">{part2Name}</strong>
                      </span>
                    </div>
                  </div>

                  {!isValidSplit && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Invalid split. Both Parts must have at least 1 guest.</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-150">
                    <button
                      type="button"
                      onClick={() => setSplitGuestObj(null)}
                      className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-650 rounded-xl uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!isValidSplit}
                      className="flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      <span>Confirm & Split Group</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
