/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Guest, ItineraryEvent } from '../types';
import { generateLuxuryWeddingCardDataUrl } from '../utils/cardGenerator';
import { formatWeddingDate, getCoupleNames, buildDynamicParameters, resolveWeddingMessageDateAndVenue, sortItineraryEvents, parseEventDateTime } from '../utils/formatters';
import { Plus, Search, MessageCircle, Edit2, Trash2, X, Users, Filter, Download, Link, Check, Sparkles, Send, MessageSquare, Play, SkipForward, RotateCcw, FileSpreadsheet, Settings2, AlertCircle, Zap, RefreshCw } from 'lucide-react';

export default function GuestList() {
  const { guests, itinerary, addGuest, updateGuest, deleteGuest, currentWedding, updateSaaSWedding, syncAllEventsToGuests } = useApp();

  const sortedItinerary = sortItineraryEvents(itinerary);
  const [isSyncingEvents, setIsSyncingEvents] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState(false);

  const handleSyncAllEvents = async () => {
    setIsSyncingEvents(true);
    try {
      await syncAllEventsToGuests();
      setSyncSuccessMessage(true);
      setTimeout(() => setSyncSuccessMessage(false), 3000);
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncingEvents(false);
    }
  };

  // Smart Utility Fallback Mode (only triggers rsvp_reminder if marketing template rejected)
  const [useUtilitySafeDelivery, setUseUtilitySafeDelivery] = useState<boolean>(
    currentWedding?.useUtilitySafeDelivery === true
  );

  useEffect(() => {
    if (currentWedding?.useUtilitySafeDelivery !== undefined) {
      setUseUtilitySafeDelivery(currentWedding.useUtilitySafeDelivery === true);
    }
  }, [currentWedding?.useUtilitySafeDelivery]);

  const handleToggleUtilitySafeDelivery = async (nextVal: boolean) => {
    setUseUtilitySafeDelivery(nextVal);
    if (currentWedding && updateSaaSWedding) {
      try {
        await updateSaaSWedding({
          ...currentWedding,
          useUtilitySafeDelivery: nextVal
        });
      } catch (err) {
        console.error('Failed to persist useUtilitySafeDelivery:', err);
      }
    }
  };

  // Resolve wedding date and venue dynamically from uploaded itinerary (prioritizing the main ceremony)
  const resolvedItinerary = resolveWeddingMessageDateAndVenue(itinerary, currentWedding);
  const weddingDate = resolvedItinerary.weddingDate;
  const resortName = resolvedItinerary.venue;

  // Attempt to parse couple names dynamically
  const couple = (() => {
    if (!currentWedding) return { bride: 'Bride', groom: 'Groom' };
    const title = currentWedding.title || '';
    const parts = title.split(/[♥&+]|and/i).map(s => s.trim());
    if (parts.length >= 2) {
      return { bride: parts[1] || 'Bride', groom: parts[0] || 'Groom' };
    }
    return { bride: 'Bride', groom: 'Groom' };
  })();

  // Delete safety state (prevents iframe confirm blockages)
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);

  // Personal RSVP copy indicator
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [sideFilter, setSideFilter] = useState<'All' | 'Bride' | 'Groom'>('All');
  const [eventFilter, setEventFilter] = useState<string>('All');

  // Bulk Broadcaster State
  const [isBroadcasterOpen, setIsBroadcasterOpen] = useState(false);
  const [isAutoSendModalOpen, setIsAutoSendModalOpen] = useState(false);
  const [autoSendIndex, setAutoSendIndex] = useState(0);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState(() => {
    const defaultTemplate = `Hi {name}! 🌟 We are thrilled to invite you to the wedding of {couple}. Please check your personalized itinerary & submit your RSVP details here: {rsvp_link}`;
    try {
      const wId = localStorage.getItem('current_wedding_id');
      const cachedKey = wId ? `rsvp_msg_template_${wId}` : 'rsvp_msg_template_default';
      const saved = localStorage.getItem(cachedKey);
      return saved || defaultTemplate;
    } catch (e) {
      return defaultTemplate;
    }
  });
  // Broadcaster Filter State
  const [broadcasterFilter, setBroadcasterFilter] = useState<'pending' | 'all'>('pending');
  const [broadcastCampaignType, setBroadcastCampaignType] = useState<'save_the_date' | 'official_invite' | 'rsvp_reminder'>('save_the_date');
  const [activeQueueIndex, setActiveQueueIndex] = useState(0);

  // Automated Meta WhatsApp Cloud API Bulk Send Simulation State
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const [appBaseUrl, setAppBaseUrl] = useState<string>(() => {
    const override = localStorage.getItem('app_base_url_override');
    if (override) return override;
    
    const origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  });

  // Bulk Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedRows, setImportedRows] = useState<{
    name: string;
    familyName: string;
    phone: string;
    side: 'Bride' | 'Groom';
    totalAdults: number;
    totalChildren: number;
    isVIP: boolean;
    specialRequests?: string;
    rawEventsText?: string;
    matchedEventIds: string[];
    memberNames?: string[];
    isValid: boolean;
    errorReason?: string;
  }[]>([]);
  const [defaultSelectedEventIds, setDefaultSelectedEventIds] = useState<string[]>([]);

  // Initialize/reset default event IDs when the modal is opened
  useEffect(() => {
    if (isImportModalOpen && sortedItinerary) {
      setDefaultSelectedEventIds(sortedItinerary.map(e => e.id));
    }
  }, [isImportModalOpen, sortedItinerary]);

  // Synchronize template state whenever active wedding changes
  useEffect(() => {
    const wId = currentWedding?.id;
    const cachedKey = wId ? `rsvp_msg_template_${wId}` : 'rsvp_msg_template_default';
    try {
      const saved = localStorage.getItem(cachedKey);
      if (saved) {
        setMessageTemplate(saved);
      } else {
        setMessageTemplate(`Hi {name}! 🌟 We are thrilled to invite you to the wedding of {couple}. Please check your personalized itinerary & submit your RSVP details here: {rsvp_link}`);
      }
    } catch (e) {
      // ignore
    }
  }, [currentWedding?.id]);

  // Save template state to localStorage whenever it changes
  useEffect(() => {
    const wId = currentWedding?.id;
    const cachedKey = wId ? `rsvp_msg_template_${wId}` : 'rsvp_msg_template_default';
    try {
      localStorage.setItem(cachedKey, messageTemplate);
    } catch (e) {
      // ignore
    }
  }, [messageTemplate, currentWedding?.id]);

  // CSV template downloader
  const handleDownloadTemplate = () => {
    // Generate headers with individual event names as dedicated columns
    const baseHeaders = ["Name", "Family ID or Primary Guest Name", "Phone", "Side", "Adults", "Children", "VIP", "Special Requests"];
    const eventTitles = itinerary.map(e => e.title.replace(/,/g, ''));
    const headers = [...baseHeaders, ...eventTitles].join(",");
    
    // Sample rows showing both standard single guests and grouped family members
    const sampleRow1 = [
      "Devansh Shah",
      "Shah Family",
      "+919876543210",
      "Groom",
      "1",
      "0",
      "Yes",
      "Jain food requested",
      ...itinerary.map((_, i) => i < 2 ? "Yes" : "No")
    ].join(",");

    const sampleRow2 = [
      "Helly Shah",
      "Shah Family", // Shared family name/ID to group Devansh and Helly together!
      "+919876543210",
      "Groom",
      "1",
      "0",
      "Yes",
      "Jain food requested",
      ...itinerary.map((_, i) => i < 2 ? "Yes" : "No")
    ].join(",");

    const sampleRow3 = [
      "Rima Patel",
      "Rima Patel", // Single guest using own name as Family ID
      "+919999999999",
      "Bride",
      "1",
      "0",
      "No",
      "First floor room preferred",
      ...itinerary.map((_, i) => i === 0 ? "Yes" : "No")
    ].join(",");

    const csvContent = "data:text/csv;charset=utf-8," + [headers, sampleRow1, sampleRow2, sampleRow3].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tectell_guest_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parser helper
  const handleParseImportText = (text: string) => {
    setImportText(text);
    if (!text.trim()) {
      setImportedRows([]);
      setImportError(null);
      return;
    }

    try {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        setImportedRows([]);
        return;
      }

      const firstLine = lines[0];
      // Auto detect separator: can be comma or tab
      const separator = firstLine.includes('\t') ? '\t' : ',';
      
      // Basic CSV field parser to support double quoted strings with commas
      const parseCSVLine = (lineStr: string, sep: string) => {
        const result: string[] = [];
        let curVal = '';
        let inQuotes = false;
        for (let i = 0; i < lineStr.length; i++) {
          const char = lineStr[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === sep && !inQuotes) {
            result.push(curVal.trim());
            curVal = '';
          } else {
            curVal += char;
          }
        }
        result.push(curVal.trim());
        return result;
      };

      const firstLineParts = parseCSVLine(firstLine, separator).map(p => p.toLowerCase().trim());

      let hasHeader = false;
      let nameIdx = 0;
      let familyNameIdx = 1;
      let phoneIdx = 2;
      let sideIdx = 3;
      let adultsIdx = 4;
      let childrenIdx = 5;
      let vipIdx = 6;
      let requestsIdx = 7;
      let eventsIdx = -1;

      const isHeader = firstLineParts.some(p => 
        p.includes('name') || 
        p.includes('phone') || 
        p.includes('side') || 
        p.includes('adult') || 
        p.includes('child') || 
        p.includes('vip') || 
        p.includes('request') ||
        p.includes('family') ||
        p.includes('event') ||
        p.includes('invite') ||
        p.includes('primary')
      );

      if (isHeader) {
        hasHeader = true;
        firstLineParts.forEach((part, i) => {
          if (part.includes('family') || part.includes('primary')) {
            familyNameIdx = i;
          } else if (part.includes('name') || part.includes('head') || part.includes('guest') || part.includes('passenger')) {
            nameIdx = i;
          } else if (part.includes('phone') || part.includes('number') || part.includes('whatsapp') || part.includes('contact')) {
            phoneIdx = i;
          } else if (part.includes('side')) {
            sideIdx = i;
          } else if (part.includes('adult')) {
            adultsIdx = i;
          } else if (part.includes('child') || part.includes('kid')) {
            childrenIdx = i;
          } else if (part.includes('vip')) {
            vipIdx = i;
          } else if (part.includes('request') || part.includes('note') || part.includes('diet')) {
            requestsIdx = i;
          } else if (part.includes('event') || part.includes('invite') || part.includes('ceremon') || part.includes('program')) {
            eventsIdx = i;
          }
        });
      }

      // Map dedicated dynamic event columns based on itinerary event titles
      const eventColumnIndexMap: { [eventId: string]: number } = {};
      itinerary.forEach(event => {
        const titleLower = event.title.trim().toLowerCase();
        const foundIndex = firstLineParts.findIndex(part => {
          const partTrimmed = part.trim().toLowerCase();
          return partTrimmed === titleLower || partTrimmed.includes(titleLower) || titleLower.includes(partTrimmed);
        });
        if (foundIndex !== -1) {
          eventColumnIndexMap[event.id] = foundIndex;
        }
      });

      const rowsToProcess = hasHeader ? lines.slice(1) : lines;
      
      // Parse individual rows with trimming & empty cell handling
      const individualParsedRows = rowsToProcess.map((line) => {
        const parts = parseCSVLine(line, separator);
        const valAt = (index: number, defaultVal: string = '') => {
          if (index < 0 || index >= parts.length) return defaultVal;
          return (parts[index] || '').trim();
        };

        const name = valAt(nameIdx);
        const familyName = valAt(familyNameIdx);
        const phone = valAt(phoneIdx);
        const rawSide = valAt(sideIdx);
        const rawAdults = valAt(adultsIdx);
        const rawChildren = valAt(childrenIdx);
        const rawVip = valAt(vipIdx);
        const specialRequests = valAt(requestsIdx);

        let side: 'Bride' | 'Groom' = 'Bride';
        if (rawSide && rawSide.toLowerCase().includes('groom')) {
          side = 'Groom';
        }

        const totalAdults = parseInt(rawAdults, 10) || 1;
        const totalChildren = parseInt(rawChildren, 10) || 0;
        
        let isVIP = false;
        const lowVip = rawVip.toLowerCase();
        if (lowVip === 'true' || lowVip === 'yes' || lowVip === '1' || lowVip === 'vip' || lowVip === 'y') {
          isVIP = true;
        }

        // Match ceremonies from either new dynamic boolean columns or fallback events column
        const matchedEventIds: string[] = [];
        itinerary.forEach(event => {
          const colIdx = eventColumnIndexMap[event.id];
          if (colIdx !== undefined && colIdx < parts.length) {
            const cellVal = (parts[colIdx] || '').trim().toLowerCase();
            if (cellVal === 'yes' || cellVal === '1' || cellVal === 'true' || cellVal === 'y') {
              matchedEventIds.push(event.id);
            }
          }
        });

        // Fallback to old format single events column if no events matched yet
        if (matchedEventIds.length === 0 && eventsIdx !== -1 && eventsIdx < parts.length) {
          const rawEvents = parts[eventsIdx] || '';
          if (rawEvents.trim()) {
            const names = rawEvents.split(/[,;|]+/).map(n => n.trim().toLowerCase()).filter(Boolean);
            names.forEach(namePart => {
              const match = itinerary.find(ev => 
                ev.title.toLowerCase().includes(namePart) || 
                namePart.includes(ev.title.toLowerCase())
              );
              if (match && !matchedEventIds.includes(match.id)) {
                matchedEventIds.push(match.id);
              }
            });
          }
        }

        return {
          name,
          familyName,
          phone,
          side,
          totalAdults,
          totalChildren,
          isVIP,
          specialRequests,
          matchedEventIds
        };
      });

      // Group family members based on Family ID or Primary Guest Name
      const groups: { [key: string]: typeof individualParsedRows } = {};
      individualParsedRows.forEach(row => {
        const key = row.familyName || row.name;
        if (!key) return; // Skip completely empty rows
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(row);
      });

      // Map group aggregates back to rows for display and import execution
      const parsed = Object.entries(groups).map(([groupKey, groupRows]) => {
        const headRow = groupRows[0]; // First member is treated as primary guest/family head
        
        const name = headRow.name;
        const familyName = groupKey;
        
        // Find first non-empty phone in the group, fallback to empty string
        const firstPhone = groupRows.find(r => r.phone)?.phone || headRow.phone || '';
        
        // Find first non-empty side, fallback to Bride
        const side = groupRows.find(r => r.side)?.side || headRow.side || 'Bride';
        
        // Merge VIP status: true if ANY member in the family group is marked VIP
        const isVIP = groupRows.some(r => r.isVIP);
        
        // Combine special requests from all family members, ignoring empty ones
        const specialRequests = groupRows
          .map(r => r.specialRequests)
          .filter(Boolean)
          .join('; ');

        // Aggregate event lists: union of all events across group members
        const matchedEventIds = Array.from(new Set(groupRows.flatMap(r => r.matchedEventIds)));

        // Adults and Children aggregation:
        let totalAdults = 0;
        let totalChildren = 0;
        if (groupRows.length > 1) {
          groupRows.forEach(r => {
            totalAdults += r.totalAdults;
            totalChildren += r.totalChildren;
          });
        } else {
          totalAdults = headRow.totalAdults;
          totalChildren = headRow.totalChildren;
        }

        // Collect member names (all distinct names inside the family group)
        const memberNames = groupRows.map(r => r.name).filter(Boolean);

        // Run validation rules
        let isValid = true;
        let errorReason = '';

        if (!name) {
          isValid = false;
          errorReason = 'Missing Primary Guest Name';
        } else if (!firstPhone) {
          isValid = false;
          errorReason = 'Missing Phone Number';
        } else {
          const phoneClean = firstPhone.replace(/[^0-9+]/g, '');
          if (phoneClean.length < 8) {
            isValid = false;
            errorReason = 'Invalid phone format (too short)';
          }
        }

        return {
          name,
          familyName,
          phone: firstPhone,
          side,
          totalAdults,
          totalChildren,
          isVIP,
          specialRequests,
          matchedEventIds,
          memberNames,
          isValid,
          errorReason
        };
      });

      setImportedRows(parsed);
      setImportError(null);
    } catch (e: any) {
      console.error(e);
      setImportError('Failed to parse input data. Please ensure it matches the template format.');
      setImportedRows([]);
    }
  };

  // CSV file select handler
  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleParseImportText(text);
    };
    reader.readAsText(file);
  };

  // Execute bulk import sequentially
  const executeBulkImport = async () => {
    const validRows = importedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const row of validRows) {
        // Fallback to selected default checkboxes if the row does not specify any specific matched ceremonies
        const eventsToInvite = row.matchedEventIds.length > 0 ? row.matchedEventIds : defaultSelectedEventIds;

        await addGuest({
          name: row.name,
          familyName: row.familyName || `${row.name}'s Family`,
          phone: row.phone,
          side: row.side,
          invitedEvents: eventsToInvite,
          totalAdults: row.totalAdults,
          totalChildren: row.totalChildren,
          totalFamilyMembers: row.totalAdults + row.totalChildren,
          isVIP: row.isVIP,
          specialRequests: row.specialRequests || '',
          memberNames: row.memberNames || [],
          inviteSent: false
        });
        successCount++;
      }
      setImportSuccessCount(successCount);
      setImportText('');
      setImportedRows([]);
    } catch (err) {
      console.error("Bulk import failed:", err);
      setImportError('An error occurred while importing guests. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Form Fields State
  const [guestName, setGuestName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [phone, setPhone] = useState('');
  const [totalAdults, setTotalAdults] = useState<number>(1);
  const [totalChildren, setTotalChildren] = useState<number>(0);
  const [totalFamilyMembers, setTotalFamilyMembers] = useState<number>(1);
  const [side, setSide] = useState<'Bride' | 'Groom'>('Bride');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isVIP, setIsVIP] = useState<boolean>(false);
  const [specialRequests, setSpecialRequests] = useState('');
  const [formInviteSent, setFormInviteSent] = useState<boolean>(false);

  // Form Validation State
  const [guestNameError, setGuestNameError] = useState('');
  const [familyNameError, setFamilyNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [eventsError, setEventsError] = useState('');

  // Opens Add/Edit Modal
  const openModal = (guest: Guest | null = null) => {
    setGuestNameError('');
    setFamilyNameError('');
    setPhoneError('');
    setEventsError('');

    if (guest) {
      setEditingGuest(guest);
      setGuestName(guest.name);
      setFamilyName(guest.familyName || '');
      setPhone(guest.phone);
      setTotalAdults(guest.totalAdults !== undefined ? guest.totalAdults : (guest.totalFamilyMembers || 1));
      setTotalChildren(guest.totalChildren || 0);
      setTotalFamilyMembers(guest.totalFamilyMembers || 1);
      setSide(guest.side);
      setSelectedEvents(guest.invitedEvents);
      setIsVIP(!!guest.isVIP);
      setSpecialRequests(guest.specialRequests || '');
      setFormInviteSent(!!guest.inviteSent);
    } else {
      setEditingGuest(null);
      setGuestName('');
      setFamilyName('');
      setPhone('');
      setTotalAdults(1);
      setTotalChildren(0);
      setTotalFamilyMembers(1);
      setSide('Bride');
      setIsVIP(false);
      setSpecialRequests('');
      setFormInviteSent(false);
      // pre-select all events by default for handiness
      setSelectedEvents(itinerary.map(e => e.id));
    }
    setIsModalOpen(true);
  };

  // Closes Add/Edit Modal
  const closeModal = () => {
    setGuestNameError('');
    setFamilyNameError('');
    setPhoneError('');
    setEventsError('');
    setIsModalOpen(false);
    setEditingGuest(null);
  };

  // Submit Guest form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasErr = false;

    if (!familyName.trim()) {
      setFamilyNameError('Family / Group Name is required.');
      hasErr = true;
    } else {
      setFamilyNameError('');
    }

    if (!guestName.trim()) {
      setGuestNameError('Family Head / Lead Passenger Name is required.');
      hasErr = true;
    } else {
      setGuestNameError('');
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setPhoneError('WhatsApp Phone Number is required.');
      hasErr = true;
    } else {
      const phoneRegex = /^[+]?[0-9\s\-()]{8,20}$/;
      if (!phoneRegex.test(cleanPhone)) {
        setPhoneError('Please enter a valid phone number format (e.g. +919876543210).');
        hasErr = true;
      } else {
        setPhoneError('');
      }
    }

    if (selectedEvents.length === 0) {
      setEventsError('Please select at least one ceremony event.');
      hasErr = true;
    } else {
      setEventsError('');
    }

    if (hasErr) return;

    const calculatedTotal = Number(totalAdults) + Number(totalChildren);

    if (editingGuest) {
      // Setup default RSVP for newly checked events if any are added
      const nextRsvp = { ...editingGuest.rsvp };
      selectedEvents.forEach(eId => {
        if (!nextRsvp[eId]) {
          nextRsvp[eId] = 'Pending';
        }
      });
      // Delete RSVPs for unchecked events
      Object.keys(nextRsvp).forEach(eId => {
        if (!selectedEvents.includes(eId)) {
          delete nextRsvp[eId];
        }
      });

      updateGuest({
        ...editingGuest,
        name: guestName.trim(),
        familyName: familyName.trim() || `${guestName.trim()}'s Family`,
        phone: phone.trim() || 'Not specified',
        side,
        invitedEvents: selectedEvents,
        rsvp: nextRsvp,
        totalFamilyMembers: calculatedTotal || 1,
        totalAdults: Number(totalAdults) || 1,
        totalChildren: Number(totalChildren) || 0,
        isVIP,
        specialRequests: specialRequests.trim(),
        inviteSent: formInviteSent
      });
    } else {
      addGuest({
        name: guestName.trim(),
        familyName: familyName.trim() || `${guestName.trim()}'s Family`,
        phone: phone.trim() || 'Not specified',
        side,
        invitedEvents: selectedEvents,
        totalFamilyMembers: calculatedTotal || 1,
        totalAdults: Number(totalAdults) || 1,
        totalChildren: Number(totalChildren) || 0,
        isVIP,
        specialRequests: specialRequests.trim(),
        inviteSent: formInviteSent
      });
    }
    closeModal();
  };

  // Toggle checks in form
  const handleEventToggle = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  // Send Whatsapp Quick Invite with Private RSVP URL using Custom Message Template
  const handleSendWhatsAppInvite = (guest: Guest) => {
    // Strip everything except numbers from phone
    const cleanPhone = guest.phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) return;
    const message = getPersonalizedMessage(guest);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');

    // Automatically mark as sent when dispatched
    updateGuest({
      ...guest,
      inviteSent: true
    });
  };

  const handleCopyRSVPLink = (guest: Guest) => {
    const rsvpLink = `${appBaseUrl}/${currentWedding?.id || ''}?guestId=${guest.id}`;
    navigator.clipboard.writeText(rsvpLink);
    setCopiedGuestId(guest.id);
    setTimeout(() => setCopiedGuestId(null), 2000);
  };

  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'rsvpStatus' | null>('rsvpStatus');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const getGuestRsvpStatus = (g: Guest): 'Pending' | 'Attending' | 'Declined' => {
    if (g.rsvpStatus) return g.rsvpStatus;
    if (!g.hasSubmitted) return 'Pending';
    const isAttendingAny = Object.values(g.rsvp || {}).some(v => v === 'Attending');
    return isAttendingAny ? 'Attending' : 'Declined';
  };

  const handleSort = (field: 'name' | 'rsvpStatus') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtering Logic
  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          guest.phone.includes(searchTerm);
    const matchesSide = sideFilter === 'All' ? true : guest.side === sideFilter;
    const matchesEvent = eventFilter === 'All' ? true : guest.invitedEvents.includes(eventFilter);
    return matchesSearch && matchesSide && matchesEvent;
  });

  // Sorted Logic
  const sortedGuests = [...filteredGuests].sort((a, b) => {
    if (!sortField) return 0;
    if (sortField === 'rsvpStatus') {
      const statusA = getGuestRsvpStatus(a);
      const statusB = getGuestRsvpStatus(b);
      return sortDirection === 'asc' 
        ? statusA.localeCompare(statusB) 
        : statusB.localeCompare(statusA);
    }
    if (sortField === 'name') {
      return sortDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    return 0;
  });

  const getPersonalizedMessage = (guest: Guest) => {
    const groom = currentWedding?.groomName || 'Devansh';
    const bride = currentWedding?.brideName || 'Helly';
    const coupleNames = currentWedding?.title || `${groom} & ${bride}`;
    const gName = (guest.name || guest.familyName || 'Guest').trim();
    const rsvpLink = `${appBaseUrl}/${currentWedding?.id || ''}?guestId=${guest.id}`;

    return messageTemplate
      .replace(/\{name\}/g, gName)
      .replace(/\{guest_name\}/g, gName)
      .replace(/\{couple\}/g, coupleNames)
      .replace(/\{groom\}/g, groom)
      .replace(/\{bride\}/g, bride)
      .replace(/\{wedding_date\}/g, weddingDate)
      .replace(/\{date\}/g, weddingDate)
      .replace(/\{resort\}/g, resortName)
      .replace(/\{venue\}/g, resortName)
      .replace(/\{rsvp_link\}/g, rsvpLink)
      .replace(/\{wedding_url\}/g, rsvpLink);
  };

  const handleExportBulkLinksCSV = () => {
    let csv = "Guest Name,Phone Number,Side Affiliation,Family Members,Personal RSVP Link,Pre-filled WhatsApp Web Link\n";
    guests.forEach(g => {
      const cleanPhone = g.phone.replace(/[^0-9+]/g, '');
      const rsvpLink = `${appBaseUrl}/${currentWedding?.id || ''}?guestId=${g.id}`;
      const msg = getPersonalizedMessage(g);
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
      csv += `"${g.name.replace(/"/g, '""')}","${g.phone.replace(/"/g, '""')}","${g.side}",${g.totalFamilyMembers || 1},"${rsvpLink}","${waLink.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wedding_bulk_rsvp_whatsapp_links.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportGuestsReport = () => {
    let csv = "Family/Group Name,Head of Family,Phone Number,Side Affiliation,Total Adults,Total Kids,VIP Status,Special Requirements,Invited Events\n";
    guests.forEach(g => {
      const invitedEventsTitles = g.invitedEvents.map(evtId => {
        const matching = itinerary.find(i => i.id === evtId);
        return matching ? matching.title : evtId;
      }).join(" | ");
      csv += `"${(g.familyName || '').replace(/"/g, '""')}","${g.name.replace(/"/g, '""')}","${g.phone.replace(/"/g, '""')}","${g.side}",${g.totalAdults || g.totalFamilyMembers || 1},${g.totalChildren || 0},"${g.isVIP ? 'VIP' : 'Normal'}","${(g.specialRequests || '').replace(/"/g, '""')}","${invitedEventsTitles.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wedding_guests_manifest_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeBulkWhatsAppSend = async (
    targetGuests: Guest[],
    templateText: string,
    targetCampaign?: 'save_the_date' | 'official_invite' | 'rsvp_reminder'
  ) => {
    if (targetGuests.length === 0) {
      setSimulationLogs(prev => [
        ...prev,
        `⚠️ [Warning] No target guests found for this broadcast request.`
      ]);
      return;
    }

    const rawPhoneId = currentWedding?.whatsappPhoneNumberId || '';
    const rawToken = currentWedding?.whatsappToken || '';

    const phoneId = rawPhoneId.trim().replace(/[^\d]/g, '') || '1176823055522728';
    const token = rawToken
      .trim()
      .replace(/^Bearer\s+/i, '')
      .replace(/^["']|["']$/g, '')
      .trim();
    const sendMode = currentWedding?.whatsappSendMode || 'template';

    const campaignType: 'save_the_date' | 'official_invite' | 'rsvp_reminder' =
      targetCampaign || broadcastCampaignType || 'save_the_date';

    const targetTemplateName = (
      campaignType === 'save_the_date'
        ? (currentWedding?.whatsappSaveDateTemplateName || 'rsvp_wedding')
        : campaignType === 'rsvp_reminder'
        ? (currentWedding?.whatsappReminderTemplateName || 'rsvp_reminder')
        : (currentWedding?.whatsappOfficialTemplateName || 'wedding_official')
    ).trim();

    const templateLang = (currentWedding?.whatsappTemplateLanguage || 'en').trim();

    const hasRealCredentials = Boolean(phoneId && token);
    const isTemplateMode = sendMode === 'template' && Boolean(targetTemplateName);

    setSimulationActive(true);
    setSimulationProgress(0);
    setSimulationLogs([
      `[WhatsApp Broadcaster] Initializing ${campaignType.toUpperCase()} bulk campaign queue for ${targetGuests.length} guest(s)...`,
      hasRealCredentials
        ? `[Mode] Meta WhatsApp Cloud API Live Mode (Phone ID: ${phoneId})`
        : `[Mode] Sandbox Preview Mode (Add Meta Credentials in Settings for direct delivery)`,
      phoneId === '1176823055522728'
        ? `⚠️ [TEST NUMBER NOTICE] Using Meta Sandbox Test Number (1176823055522728). Messages will ONLY deliver to recipient numbers whitelisted in Meta Console!`
        : `[Live Number] Connected to Phone Number ID: ${phoneId}`,
      isTemplateMode
        ? useUtilitySafeDelivery
          ? `⚡ [Safe Utility Route Active] Routing via approved UTILITY template 'rsvp_reminder' (5 dynamic parameters) to bypass Meta Marketing rate limits and guarantee phone delivery!`
          : `[Payload] Sending Meta Approved Template: '${targetTemplateName}' (Lang: ${templateLang})`
        : `[Payload] Sending Freeform Text (Requires guest to have messaged your WhatsApp within 24h)`
    ]);

    // Pre-flight check token validity with Meta
    if (hasRealCredentials) {
      try {
        const checkRes = await fetch(`https://graph.facebook.com/v18.0/${phoneId}?fields=id,display_phone_number,verified_name&access_token=${token}`);
        const checkData = await checkRes.json();
        if (!checkRes.ok || !checkData.id) {
          const errCode = checkData?.error?.code;
          const errMsg = checkData?.error?.message || 'Authentication error';
          setSimulationActive(false);
          setSimulationLogs(prev => [
            ...prev,
            `🚨 [BROADCAST HALTED - META AUTH ERROR ${errCode || 190}] ${errMsg}`,
            `❌ Meta rejected your Access Token. It is expired or invalidated.`,
            `👉 Please update your Meta Access Token in Invitations & WhatsApp to enable live delivery.`
          ]);
          return;
        }
      } catch (e: any) {
        // network issue
      }
    }

    let successCount = 0;
    let failCount = 0;

    const currentWeddingId = currentWedding?.id || 'dh_1';
    const resolvedOrigin = (appBaseUrl || window.location.origin).replace(/\/$/, '');

    const { groom, bride, coupleHeart, coupleAnd } = getCoupleNames(currentWedding);
    // Uses resolved wedding date & venue directly from the uploaded itinerary
    const wDate = weddingDate;
    const rVenue = resortName;

    // Discovered winning formats per template during session execution
    const winningFormats: Record<string, { templateName: string; incHeader: boolean; paramCount: number; lang: string }> = {};

    const defaultCode = (currentWedding?.whatsappDefaultCountryCode || '91').replace(/[^\d]/g, '');

    for (let i = 0; i < targetGuests.length; i++) {
      const guest = targetGuests[i];
      let rawPhone = (guest.phone || '').replace(/[^\d]/g, '');
      rawPhone = rawPhone.replace(/^0+/, '');
      if (rawPhone.length === 10 && defaultCode) {
        rawPhone = defaultCode + rawPhone;
      }
      const cleanPhone = rawPhone;
      // Official invite: Main wedding website link (without ?guestId=)
      // Save the date & RSVP reminder: Personalized RSVP portal link (with ?guestId=)
      const personalizedRsvpUrl = `${resolvedOrigin}/${currentWeddingId}?guestId=${guest.id}`;
      const mainWebsiteUrl = `${resolvedOrigin}/${currentWeddingId}`;
      const targetUrl = campaignType === 'official_invite' ? mainWebsiteUrl : personalizedRsvpUrl;

      // Candidate templates by campaign type
      const candidateTemplateNames: string[] = (() => {
        if (campaignType === 'rsvp_reminder') {
          return Array.from(new Set([
            (currentWedding?.whatsappReminderTemplateName || '').trim() || 'rsvp_reminder',
            'rsvp_reminder',
            'wedding_reminder',
            'reminder_rsvp'
          ].filter(Boolean)));
        }
        if (campaignType === 'official_invite') {
          const list = [
            (currentWedding?.whatsappOfficialTemplateName || '').trim() || 'wedding_official',
            'wedding_official',
            'wedding_invite',
            'official_wedding',
            'wedding_invitation'
          ];
          if (useUtilitySafeDelivery) list.push('rsvp_reminder');
          return Array.from(new Set(list.filter(Boolean)));
        }
        // Save the date / RSVP general
        const list = [
          (currentWedding?.whatsappSaveDateTemplateName || '').trim() || 'rsvp_wedding',
          'rsvp_wedding',
          'save_the_date',
          'savethedate'
        ];
        if (useUtilitySafeDelivery) list.push('rsvp_reminder');
        return Array.from(new Set(list.filter(Boolean)));
      })();

      const effectiveCampaign = campaignType;
      const gName = (guest.name || guest.familyName || 'Valued Guest').trim();
      const cNames = `${groom} & ${bride}`;
      const tLink = targetUrl;

      if (!cleanPhone && hasRealCredentials) {
        setSimulationLogs(prev => [
          ...prev,
          `⚠️ [Skipped] ${guest.name}: Missing valid phone number.`
        ]);
        failCount++;
      } else if (hasRealCredentials) {
        try {
          if (winningFormats[targetTemplateName]) {
            const cached = winningFormats[targetTemplateName];
            const candName = cached.templateName;
            const primaryLang = cached.lang;
            const primaryComponents: any[] = [];

            const currentParams = buildDynamicParameters(cached.paramCount, gName, wDate, rVenue, cNames, tLink, groom, bride, effectiveCampaign);
            if (currentParams.length > 0) {
              primaryComponents.push({
                type: 'body',
                parameters: currentParams
              });
            }

            const payload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone,
              type: 'template',
              template: {
                name: candName,
                language: { code: primaryLang },
                components: primaryComponents
              }
            };

            const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            const resData = await response.json();

            if (response.ok && resData.messages?.[0]?.id) {
              successCount++;
              await updateGuest({ ...guest, inviteSent: true });

              const isTestPhone = phoneId === '1176823055522728';
              const testWarn = isTestPhone ? ` ⚠️ (Note: Meta Sandbox Test Number ID only delivers to numbers whitelisted in Meta Console!)` : '';
              const modeTag = candName === 'rsvp_reminder' && campaignType !== 'rsvp_reminder' ? ' ⚡[Utility Fallback: rsvp_reminder]' : '';

              setSimulationLogs(prev => [
                ...prev,
                `✓ [Meta Delivered] Sent '${candName}' to ${gName} (+${cleanPhone}) — Msg ID: ${resData.messages[0].id}${modeTag}${testWarn}`
              ]);
              continue;
            }
          }

          let primaryComponents: any[] = [];
          let primaryLang = (templateLang || currentWedding?.whatsappTemplateLanguage || 'en').trim();
          const defaultParamCount = (targetTemplateName === 'wedding_official' || targetTemplateName === 'rsvp_reminder' || campaignType === 'official_invite' || campaignType === 'rsvp_reminder') ? 5 : 4;

          const initialParams = buildDynamicParameters(defaultParamCount, gName, wDate, rVenue, cNames, tLink, groom, bride, effectiveCampaign);
          if (initialParams.length > 0) {
            primaryComponents.push({
              type: 'body',
              parameters: initialParams
            });
          }

          const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'template',
            template: {
              name: candidateTemplateNames[0] || targetTemplateName,
              language: { code: primaryLang },
              components: primaryComponents
            }
          };

          const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const resData = await response.json();

          if (response.ok && resData.messages?.[0]?.id) {
            successCount++;
            await updateGuest({ ...guest, inviteSent: true });

            winningFormats[targetTemplateName] = {
              templateName: candidateTemplateNames[0] || targetTemplateName,
              incHeader: false,
              paramCount: (primaryComponents.find(c => c.type === 'body')?.parameters || []).length,
              lang: primaryLang
            };

            const isTestPhone = phoneId === '1176823055522728';
            const testWarn = isTestPhone ? ` ⚠️ (Note: Meta Sandbox Test Number ID only delivers to numbers whitelisted in Meta Console!)` : '';
            const sentTpl = candidateTemplateNames[0] || targetTemplateName;
            const modeTag = sentTpl === 'rsvp_reminder' && campaignType !== 'rsvp_reminder' ? ' ⚡[Utility Fallback: rsvp_reminder]' : '';

            setSimulationLogs(prev => [
              ...prev,
              `✓ [Meta Delivered] Sent '${sentTpl}' to ${guest.name} (+${cleanPhone}) — Msg ID: ${resData.messages[0].id}${modeTag}${testWarn}`
            ]);
          } else {
            const initialErrCode = resData?.error?.code;
            const initialErrMsg = resData?.error?.message || resData?.error?.error_data?.details || 'API request rejected';

            const isTokenErr = initialErrCode === 190 || 
              initialErrMsg.toLowerCase().includes('token') || 
              initialErrMsg.toLowerCase().includes('expired') || 
              initialErrMsg.toLowerCase().includes('invalidated');

            if (isTokenErr) {
              failCount++;
              setSimulationLogs(prev => [
                ...prev,
                `🚨 [Meta API Token Error] ${guest.name} (+${cleanPhone}): ${initialErrMsg}`,
                `🔑 FIX: Your Meta Access Token has EXPIRED or been INVALIDATED. Go to Settings -> Meta WhatsApp API Setup and paste a fresh System User Permanent Token (or new Temporary Token from Meta Console).`
              ]);
              break;
            }

            setSimulationLogs(prev => [
              ...prev,
              `ℹ️ [Auto-Repair Initiated] Template '${targetTemplateName}' received error from Meta (${initialErrMsg}). Auto-detecting approved parameter signature for this campaign...`
            ]);

            const priorityCounts = campaignType === 'save_the_date' ? [4, 3, 5, 2, 1, 6, 0] : [5, 4, 6, 3, 2, 1, 0];
            const repairLangs = Array.from(new Set([primaryLang, 'en', 'en_US', 'en_GB'])).filter(Boolean);

            const autoRepairVariations: Array<{ label: string; incHeader: boolean; params: any[]; lang: string }> = [];
            for (const lng of repairLangs) {
              for (const cnt of priorityCounts) {
                autoRepairVariations.push({
                  label: `${cnt} Variables (${lng})`,
                  incHeader: false,
                  params: buildDynamicParameters(cnt, gName, wDate, rVenue, cNames, tLink, groom, bride, campaignType),
                  lang: lng
                });
              }
            }

            let resolvedWithRepair = false;
            let lastRepairErrMsg = '';

            for (const candName of candidateTemplateNames) {
              for (const fb of autoRepairVariations) {
                try {
                  const fbComp: any[] = [];
                  if (fb.incHeader) {
                    fbComp.push({
                      type: 'header',
                      parameters: [{ type: 'text', text: gName }]
                    });
                  }
                  if (fb.params.length > 0) {
                    fbComp.push({
                      type: 'body',
                      parameters: fb.params
                    });
                  }

                  const fbPayload = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone,
                    type: 'template',
                    template: {
                      name: candName,
                      language: { code: fb.lang },
                      components: fbComp
                    }
                  };

                  const fbResp = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(fbPayload)
                  });

                  const fbData = await fbResp.json();
                  if (fbResp.ok && fbData.messages?.[0]?.id) {
                    successCount++;
                    resolvedWithRepair = true;
                    await updateGuest({ ...guest, inviteSent: true });

                    winningFormats[targetTemplateName] = {
                      templateName: candName,
                      incHeader: false,
                      paramCount: fb.params.length,
                      lang: fb.lang
                    };

                    const isTestPhone = phoneId === '1176823055522728';
                    const testWarn = isTestPhone ? ` ⚠️ (Note: Meta Sandbox Test Number ID only delivers to numbers whitelisted in Meta Console!)` : '';

                    setSimulationLogs(prev => [
                      ...prev,
                      `✓ [Auto-Repair Success] Discovered Meta Approved Template '${candName}' (Lang: ${fb.lang}) using '${fb.label}'! Delivered to ${guest.name} (+${cleanPhone}) — Msg ID: ${fbData.messages[0].id}${testWarn}`
                    ]);
                    break;
                  } else {
                    const errCode = fbData?.error?.code;
                    const errMsg = fbData?.error?.message || fbData?.error?.error_data?.details || '';
                    lastRepairErrMsg = errMsg;
                  }
                } catch (e) {
                  // try next
                }
              }
              if (resolvedWithRepair) break;
            }

            if (!resolvedWithRepair) {
              failCount++;
              let hint = '';
              if (initialErrCode === 131030 || initialErrMsg.includes('131030') || initialErrMsg.includes('allowed list')) {
                hint = ` 💡 HINT: You are using Meta's Test Phone Number ID. Test numbers can ONLY send to numbers added in Meta Console 'To' phone list!`;
              } else if (initialErrCode === 132001 || initialErrMsg.includes('132001') || lastRepairErrMsg.includes('132001')) {
                hint = ` 💡 HINT: Template name '${targetTemplateName}' was not found in Meta Developer Portal under Phone Number ID ${phoneId}. Verify template name in Meta Manager or choose a registered template name!`;
              }

              setSimulationLogs(prev => [
                ...prev,
                `❌ [Meta API Delivery Failed] ${guest.name} (+${cleanPhone}): ${initialErrMsg}${hint}`
              ]);
            }
          }
        } catch (err: any) {
          failCount++;
          setSimulationLogs(prev => [
            ...prev,
            `❌ [Network Error] ${guest.name}: ${err?.message || 'Connection failed'}`
          ]);
        }
      } else {
        // Sandbox Preview Mode
        setSimulationLogs(prev => [
          ...prev,
          `ℹ️ [Preview Mode] Simulated '${targetTemplateName}' for ${guest.name} (${guest.phone || 'No phone'}). Add Meta Token to deliver live WhatsApp messages.`
        ]);
      }

      setSimulationProgress(Math.round(((i + 1) / targetGuests.length) * 100));

      if (i < targetGuests.length - 1) {
        await new Promise(res => setTimeout(res, 600));
      }
    }

    setSimulationActive(false);
    setSimulationProgress(100);
    if (successCount === 0 && failCount > 0) {
      setSimulationLogs(prev => [
        ...prev,
        `🛑 [Broadcast Stopped with Errors] 0 delivered, ${failCount} failed. Please resolve Meta Access Token error in Invitations & WhatsApp.`
      ]);
    } else if (successCount === 0 && !hasRealCredentials) {
      setSimulationLogs(prev => [
        ...prev,
        `ℹ️ [Preview Finished] 0 live messages sent. Configure Meta Access Token in Invitations & WhatsApp to deliver live messages.`
      ]);
    } else {
      setSimulationLogs(prev => [
        ...prev,
        `🎉 [Finished] RSVP bulk broadcast completed. ${successCount} successful, ${failCount} failed/skipped.`
      ]);
    }
  };

  const broadcasterGuests = guests.filter(g => {
    const hasPhone = g.phone && g.phone.trim() !== '' && g.phone !== 'Not specified';
    if (!hasPhone) return false;
    if (broadcasterFilter === 'pending') {
      return !g.inviteSent;
    }
    return true;
  });

  const currentQueueGuest = broadcasterGuests[activeQueueIndex] || null;

  React.useEffect(() => {
    if (activeQueueIndex >= broadcasterGuests.length && broadcasterGuests.length > 0) {
      setActiveQueueIndex(broadcasterGuests.length - 1);
    }
  }, [broadcasterGuests.length, activeQueueIndex]);

  const handleMarkAsSent = (guest: Guest) => {
    updateGuest({
      ...guest,
      inviteSent: true
    });
  };

  const handleMarkAsUnsent = (guest: Guest) => {
    updateGuest({
      ...guest,
      inviteSent: false
    });
  };

  const handleLaunchWhatsApp = (guest: Guest) => {
    const cleanPhone = guest.phone.replace(/[^0-9+]/g, '');
    const msg = getPersonalizedMessage(guest);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    
    // Automatically mark as sent when opened
    updateGuest({
      ...guest,
      inviteSent: true
    });
  };

  return (
    <div id="guest-list-tab" className="space-y-6 animate-fade-in">
      
      {/* Title Header with Add actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-800">Event-Wise Guest List</h2>
          <p className="text-xs text-stone-500 mt-1">
            Track invitations, edit details, and send custom RSVP reminder invites on WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncAllEvents}
            disabled={isSyncingEvents || itinerary.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Synchronize and invite all guests to all scheduled ceremonies"
          >
            {isSyncingEvents ? (
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-800" />
            ) : syncSuccessMessage ? (
              <Check className="h-4 w-4 text-emerald-800" />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-500" />
            )}
            <span>
              {syncSuccessMessage
                ? '✓ All Guests Synced!'
                : isSyncingEvents
                ? 'Syncing...'
                : `Invite All to All ${itinerary.length} Events`}
            </span>
          </button>
          <button
            onClick={() => setIsAutoSendModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1a2f26] text-white hover:bg-[#233d31] rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-md hover:scale-102"
            title="Bulk send custom WhatsApp notifications to guests sequentially"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-amber-400" />
            <span>BULK Notification</span>
          </button>
          <button
            onClick={() => {
              setImportSuccessCount(null);
              setImportError(null);
              setImportText('');
              setImportedRows([]);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md"
            title="Bulk import guests from Excel or CSV"
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-stone-950" />
            <span>Bulk Import</span>
          </button>
          <button
            id="btn-add-guest"
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald hover:bg-emerald-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-emerald/10 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Guest</span>
          </button>
        </div>
      </div>

      {/* ⚡ Bulk RSVP Broadcaster Panel */}
      {isBroadcasterOpen && (
        <div className="bg-stone-900 text-stone-100 p-6 rounded-2xl border-2 border-amber-400 shadow-xl space-y-6 animate-fade-in antialiased">
          <div className="flex items-center justify-between border-b border-stone-850 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 rounded-xl">
                <Send className="h-5 w-5 shrink-0" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-black text-amber-400 tracking-wide">⚡ WhatsApp RSVP Bulk Broadcaster</h3>
                <p className="text-xs text-stone-400 font-sans">
                  Craft a beautiful invitation text and launch personalized private links in a rapid sequence.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsBroadcasterOpen(false)}
              className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800 transition-colors font-mono text-sm"
              title="Close Broadcaster"
            >
              ✕
            </button>
          </div>

          {/* 🌐 Base URL Configuration section */}
          <div className="bg-emerald-400/10 border border-emerald-400/30 p-4.5 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="p-1.5 bg-emerald-500 text-stone-950 rounded-lg text-xs font-bold font-mono">⚡ AUTO-RESOLVE</span>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-400 font-serif">403 Forbidden Prevention Active</h4>
                <p className="text-[11px] text-stone-300 leading-normal font-sans">
                  The private development browser origin (<code className="text-stone-200 bg-stone-950 px-1 py-0.5 rounded text-[10px]">{window.location.origin}</code>) triggers a <strong>403 Forbidden error</strong> on mobile devices or WhatsApp.
                </p>
                <p className="text-[11px] text-emerald-300 font-semibold leading-normal font-sans">
                  ✨ <strong>Zero-Config Fix Enabled:</strong> We have automatically detected the development URL and swapped it with your public <strong>Shared App URL</strong> below! All copied or WhatsApp-shared RSVP links are now fully public and will work instantly for any real guests.
                </p>
              </div>
            </div>
            
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <label htmlFor="app-base-url-input" className="text-xs font-mono font-bold text-stone-300 shrink-0 uppercase tracking-wide">
                🔗 App Base URL:
              </label>
              <div className="relative flex-1 w-full">
                <input
                  id="app-base-url-input"
                  type="text"
                  value={appBaseUrl}
                  onChange={(e) => {
                    setAppBaseUrl(e.target.value);
                    localStorage.setItem('app_base_url_override', e.target.value);
                  }}
                  placeholder="https://ais-pre-...run.app"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-3 pr-10 py-2 text-xs font-sans text-stone-100 focus:outline-none focus:border-emerald-400 transition"
                />
                <button
                  type="button"
                  onClick={() => {
                    const origin = window.location.origin;
                    const resolved = origin.includes('ais-dev-') ? origin.replace('ais-dev-', 'ais-pre-') : origin;
                    setAppBaseUrl(resolved);
                    localStorage.removeItem('app_base_url_override');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-stone-500 hover:text-emerald-400 transition"
                  title="Reset to current resolved origin"
                >
                  RESET
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Message Template Composer */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5 text-amber-400" />
                  <span>💬 Step 1: Customize Invitation Template</span>
                </label>
                <p className="text-[10px] text-stone-400 leading-normal">
                  Insert dynamic placeholders: <strong className="text-amber-300 font-mono">{`{name}`}</strong> for guest's name, <strong className="text-amber-300 font-mono">{`{couple}`}</strong> for couples' names, <strong className="text-amber-300 font-mono">{`{rsvp_link}`}</strong> for personalized Private RSVP URL.
                </p>
              </div>

              <textarea
                value={messageTemplate}
                onChange={(e) => {
                  setMessageTemplate(e.target.value);
                  setActiveQueueIndex(0);
                }}
                rows={5}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs font-sans text-stone-100 focus:outline-none focus:border-amber-400 transition"
                placeholder="Enter message template..."
              />

              <div className="bg-stone-950 p-4 rounded-xl border border-stone-850 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-stone-400 font-bold tracking-wider">📱 Live WhatsApp Preview Mockup</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div className="bg-[#e5ddd5] text-stone-900 p-3 rounded-lg font-sans text-xs space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#128c7e]"></div>
                  <div className="bg-white p-2.5 rounded-lg shadow-sm max-w-[90%] relative">
                    <p className="whitespace-pre-wrap text-[11px] leading-relaxed break-words text-stone-800">
                      {currentQueueGuest ? getPersonalizedMessage(currentQueueGuest) : "Select a guest to preview message..."}
                    </p>
                    <span className="text-[9px] text-stone-400 text-right block mt-1">10:45 AM ✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sequential Queue Runner */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-850 pb-2.5">
                <div className="space-y-0.5">
                  <label className="text-xs font-mono font-bold uppercase text-amber-500 tracking-wider">
                    ⚡ Step 2: Interactive Dispatcher Queue
                  </label>
                  <p className="text-[10px] text-stone-400">
                    Process guests sequentially. Clicking "Launch WhatsApp" opens WhatsApp Web pre-loaded with the custom message.
                  </p>
                </div>
                
                {/* Pending vs All Filter */}
                <div className="flex bg-stone-950 p-0.5 rounded-lg border border-stone-800 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => { setBroadcasterFilter('pending'); setActiveQueueIndex(0); }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${broadcasterFilter === 'pending' ? 'bg-amber-400 text-stone-950' : 'text-stone-400 hover:text-stone-200'}`}
                  >
                    Pending Only
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBroadcasterFilter('all'); setActiveQueueIndex(0); }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${broadcasterFilter === 'all' ? 'bg-amber-400 text-stone-950' : 'text-stone-400 hover:text-stone-200'}`}
                  >
                    All with Phone ({guests.filter(g => g.phone && g.phone.trim() !== '' && g.phone !== 'Not specified').length})
                  </button>
                </div>
              </div>

              {/* Automated Bulk API Trigger Button */}
              <div className="bg-stone-950 p-4 rounded-xl border border-amber-400/30 space-y-3">
                {/* Campaign Template Selector Bar */}
                <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                      🎯 Select Approved Meta Campaign
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Active: <strong className="text-emerald-400">{broadcastCampaignType === 'save_the_date' ? 'rsvp_wedding' : broadcastCampaignType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastCampaignType('save_the_date');
                        setMessageTemplate(`Hi {name}! 🌟 We are thrilled to invite you to the wedding of {couple}. Please check your personalized itinerary & submit your RSVP details here: {rsvp_link}.\n We look forward to celebrating with you!`);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
                        broadcastCampaignType === 'save_the_date'
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-sans">
                        <span>💌</span>
                        <span>Save the Date</span>
                      </div>
                      <div className="text-[9px] font-mono text-stone-400 mt-0.5">rsvp_wedding (4 params)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastCampaignType('official_invite');
                        setMessageTemplate(`Dearest {name},\n\nWith immense joy and the divine blessings of our families, we cordially invite you to grace the grand celebration of the wedding of {couple}.\n\n✨ *CELEBRATION DETAILS* ✨\n📅 *Wedding Date:* ${weddingDate}\n🏰 *Venue:* ${resortName}\n\nYour personalized itinerary, hotel accommodations, and event schedule are available on your private guest portal:\n🔗 *Guest Portal:* {wedding_website_url}\n\nWe eagerly look forward to celebrating this special milestone with you!\n\nWarmest regards,\nfooter - Tectell Wedding Management`);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
                        broadcastCampaignType === 'official_invite'
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-sans">
                        <span>👑</span>
                        <span>Official Invitation</span>
                      </div>
                      <div className="text-[9px] font-mono text-stone-400 mt-0.5">wedding_official (5 params)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBroadcastCampaignType('rsvp_reminder');
                        setMessageTemplate(`⏳ *RSVP REMINDER* ⏳\n\nDear {name},\n\nWe are eagerly counting down the days to the wedding of {couple}!\n\n📅 *Date:* ${weddingDate}\n🏰 *Venue:* ${resortName}\n\nAs we put the finishing touches on our celebration, please take a moment to RSVP:\n🔗 {rsvp_link}`);
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
                        broadcastCampaignType === 'rsvp_reminder'
                          ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-sans">
                        <span>⏳</span>
                        <span>RSVP Reminder</span>
                      </div>
                      <div className="text-[9px] font-mono text-stone-400 mt-0.5">rsvp_reminder (5 params)</div>
                    </button>
                  </div>
                </div>

                {/* Smart Utility Fallback Banner & Switch */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  useUtilitySafeDelivery
                    ? 'bg-amber-950/40 border-amber-400/50 text-amber-200'
                    : 'bg-stone-900/60 border-stone-800 text-stone-300'
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        useUtilitySafeDelivery ? 'bg-amber-400 text-stone-950 font-black' : 'bg-stone-800 text-stone-400'
                      }`}>
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold font-mono uppercase tracking-wider text-amber-300">
                            {useUtilitySafeDelivery ? '⚡ Smart Utility Fallback: ON' : 'Direct Meta Template Route (ACTIVE)'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            useUtilitySafeDelivery
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {useUtilitySafeDelivery ? 'Auto-Fallback Enabled' : 'Strict Template Dispatch'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
                          {useUtilitySafeDelivery
                            ? `Dispatches '${broadcastCampaignType === 'save_the_date' ? 'rsvp_wedding' : broadcastCampaignType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}' directly. If Meta rejects marketing templates, it automatically falls back to 'rsvp_reminder'.`
                            : `Dispatches '${broadcastCampaignType === 'save_the_date' ? 'rsvp_wedding' : broadcastCampaignType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}' directly as its own template.`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleUtilitySafeDelivery(!useUtilitySafeDelivery)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                        useUtilitySafeDelivery
                          ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-xs'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600'
                      }`}
                    >
                      {useUtilitySafeDelivery ? '✓ Fallback ON' : 'Enable Fallback'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-amber-400">⚡ Automated Direct WhatsApp Cloud API Broadcaster</h4>
                    <p className="text-[10px] text-stone-400">Automatically dispatches approved Meta template ({broadcastCampaignType === 'save_the_date' ? 'rsvp_wedding' : broadcastCampaignType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}) via Cloud API.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeBulkWhatsAppSend(broadcasterGuests, messageTemplate, broadcastCampaignType)}
                    disabled={simulationActive || broadcasterGuests.length === 0}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-stone-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
                  >
                    <Send className="h-4 w-4 shrink-0 text-stone-950" />
                    <span>🚀 Launch Meta Bulk API ({broadcasterGuests.length})</span>
                  </button>
                </div>

                {/* Simulation Console Log Box */}
                {(simulationActive || simulationLogs.length > 0) && (
                  <div className="border border-stone-800 rounded-xl p-3.5 bg-stone-900 text-stone-200 space-y-2 font-mono text-xs antialiased shadow-inner mt-2">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${simulationActive ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
                        <span className="font-bold text-amber-300">Meta WhatsApp API Live Execution Log</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-bold">{simulationProgress}%</span>
                    </div>

                    <div className="h-1.5 w-full bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 transition-all duration-300"
                        style={{ width: `${simulationProgress}%` }}
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono leading-relaxed pr-1 text-stone-300">
                      {simulationLogs.map((log, idx) => (
                        <div key={idx} className={log.includes('✓') ? 'text-emerald-400' : log.includes('❌') ? 'text-rose-400' : log.includes('⚠️') ? 'text-amber-300' : 'text-stone-300'}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Indicator */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-stone-400">
                  <span>Dispatch Progress:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {guests.filter(g => g.inviteSent && g.phone && g.phone !== 'Not specified').length} / {guests.filter(g => g.phone && g.phone !== 'Not specified').length} Sent
                  </span>
                </div>
                <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-300"
                    style={{ 
                      width: `${guests.filter(g => g.phone && g.phone !== 'Not specified').length > 0 
                        ? (guests.filter(g => g.inviteSent && g.phone && g.phone !== 'Not specified').length / guests.filter(g => g.phone && g.phone !== 'Not specified').length) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>

              {/* Active Queue Card */}
              {broadcasterGuests.length === 0 ? (
                <div className="bg-stone-950 border border-stone-850 rounded-xl p-8 text-center space-y-2">
                  <span className="text-3xl">🎉</span>
                  <h4 className="text-xs font-bold text-stone-200">All Checked Guests Dispatched!</h4>
                  <p className="text-[10px] text-stone-500 max-w-sm mx-auto">
                    Excellent work! All guests with specified phone numbers have already been marked as dispatched under the active filter.
                  </p>
                </div>
              ) : currentQueueGuest ? (
                <div className="bg-stone-950 border-2 border-stone-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] uppercase font-bold ${currentQueueGuest.inviteSent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {currentQueueGuest.inviteSent ? '● Already Dispatched' : '● Pending Dispatch'}
                      </span>
                      <h4 className="font-serif text-base font-black text-white">{currentQueueGuest.name}</h4>
                      <p className="text-[10px] text-stone-400 font-mono">
                        Phone: {currentQueueGuest.phone} • {currentQueueGuest.side}'s Guest
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-stone-500 font-mono space-y-0.5">
                      <p>QUEUE POSITION</p>
                      <p className="text-xs font-bold text-amber-400">{activeQueueIndex + 1} of {broadcasterGuests.length}</p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleLaunchWhatsApp(currentQueueGuest)}
                      className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-stone-950 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
                    >
                      <MessageSquare className="h-4 w-4 text-stone-950 animate-pulse" />
                      <span>LAUNCH WHATSAPP & MARK SENT</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {currentQueueGuest.inviteSent ? (
                        <button
                          type="button"
                          onClick={() => handleMarkAsUnsent(currentQueueGuest)}
                          className="px-3 py-3 bg-stone-850 hover:bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold transition"
                          title="Mark as Unsent"
                        >
                          Mark Unsent
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkAsSent(currentQueueGuest)}
                          className="px-3 py-3 bg-stone-850 hover:bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold transition"
                          title="Mark as Sent directly without launching WhatsApp Web"
                        >
                          Mark Sent (Skip WA)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (activeQueueIndex < broadcasterGuests.length - 1) {
                            setActiveQueueIndex(prev => prev + 1);
                          } else {
                            setActiveQueueIndex(0); // loop
                          }
                        }}
                        className="p-3 bg-stone-850 hover:bg-stone-800 text-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        title="Skip to next guest"
                      >
                        <span>Skip</span>
                        <SkipForward className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Queue Pagination */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-900 text-[10px] text-stone-400 font-mono">
                    <button
                      type="button"
                      disabled={activeQueueIndex === 0}
                      onClick={() => setActiveQueueIndex(prev => prev - 1)}
                      className="hover:text-stone-200 disabled:opacity-30 disabled:hover:text-stone-400"
                    >
                      ← Previous Guest
                    </button>
                    <span>
                      Index: {activeQueueIndex + 1} / {broadcasterGuests.length}
                    </span>
                    <button
                      type="button"
                      disabled={activeQueueIndex === broadcasterGuests.length - 1}
                      onClick={() => setActiveQueueIndex(prev => prev + 1)}
                      className="hover:text-stone-200 disabled:opacity-30 disabled:hover:text-stone-400"
                    >
                      Next Guest →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-stone-950 border border-stone-850 rounded-xl p-8 text-center text-xs text-stone-500">
                  Select a valid filter or add guests with valid phone numbers to begin bulk broadcasting.
                </div>
              )}

              {/* Advanced Link Bulk Export Block */}
              <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-850/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-center sm:text-left">
                  <h5 className="text-xs font-serif font-black text-stone-200 flex items-center justify-center sm:justify-start gap-1">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                    <span>📥 Advanced Bulk Export Options</span>
                  </h5>
                  <p className="text-[10px] text-stone-450 leading-relaxed">
                    Download a comprehensive CSV file containing each guest's name, phone, Private RSVP link, and exact pre-filled WhatsApp click link to use with third-party extensions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBulkLinksCSV}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md active:scale-95"
                >
                  <Download className="h-3.5 w-3.5 text-stone-950" />
                  <span>Download Bulk RSVP CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice Alert */}
      <div className="bg-emerald/5 border border-emerald/20 p-4 rounded-xl flex items-start gap-3">
        <div className="p-2 bg-emerald/10 text-emerald rounded-lg shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-[#1a2f26] uppercase tracking-wide">🔒 Private RSVP Mode Active</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            Guests now receive dedicated, private RSVP URLs so they only see and manage their own invitations. Direct name suggestions on the public search have been disabled to secure your guest list privacy. Click the <strong className="text-emerald font-semibold">WhatsApp</strong> icon or copy their <strong className="text-emerald font-semibold">Personal RSVP Link</strong> below to share!
          </p>
        </div>
      </div>

      {/* Search & Filter bar design */}
      <div className="bg-white p-4 rounded-xl border border-gold/20 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="guest-search"
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-stone-200 rounded-xl focus:ring-1 focus:ring-emerald focus:border-emerald text-sm bg-ivory/30"
            placeholder="Search guests by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Side Filter Toggle buttons */}
          <div className="flex items-center gap-1 bg-[#faf9f6] p-1 border border-gold/20 rounded-lg">
            {(['All', 'Bride', 'Groom'] as const).map(sideOption => (
              <button
                key={sideOption}
                onClick={() => setSideFilter(sideOption)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  sideFilter === sideOption
                    ? 'bg-emerald text-white'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {sideOption === 'All' ? 'All Sides' : `${sideOption}'s Side`}
              </button>
            ))}
          </div>

          {/* Event Filter dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <select
              id="event-filter"
              className="text-xs font-semibold bg-white border border-stone-200 rounded-lg py-1.5 px-3 text-stone-600 focus:ring-1 focus:ring-emerald"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="All">All Events ({sortedItinerary.length})</option>
              {sortedItinerary.map(evt => (
                <option key={evt.id} value={evt.id}>{evt.title} ({evt.date})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white rounded-xl border border-gold/20 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#faf9f6] border-b border-gold/10 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <th className="py-4 px-6 cursor-pointer hover:bg-stone-100/50 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    <span>Guest Info</span>
                    {sortField === 'name' && (
                      <span className="text-[10px]">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-4 px-6">Side</th>
                <th className="py-4 px-6 cursor-pointer hover:bg-stone-100/50 transition-colors" onClick={() => handleSort('rsvpStatus')}>
                  <div className="flex items-center gap-1">
                    <span>RSVP Status</span>
                    {sortField === 'rsvpStatus' && (
                      <span className="text-[10px]">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-4 px-6">Headcount</th>
                <th className="py-4 px-6 text-center">Invited Events &amp; RSVPs</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {sortedGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">
                    Welcome to Tectell Wedding Management. No guests matched the filter configuration.
                  </td>
                </tr>
              ) : (
                sortedGuests.map(guest => (
                  <tr key={guest.id} className="hover:bg-amber-50/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-[#1a2f26] flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold">{guest.familyName || `${guest.name}'s Family`}</span>
                          {guest.isVIP && (
                            <span className="inline-flex items-center px-1.5 py-0 rounded bg-amber-50 text-amber-805 border border-amber-200 text-[9px] font-extrabold leading-none">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-600 flex items-center gap-1 mt-0.5">
                          <span className="font-medium text-[11px] text-stone-400 uppercase tracking-wider">Head:</span>
                          <span className="font-semibold text-stone-700">{guest.name}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-semibold leading-none">
                            <Users className="h-2.5 w-2.5 shrink-0" />
                            <span>{guest.totalAdults || guest.totalFamilyMembers || 1} Adults</span>
                          </span>
                          {!!guest.totalChildren && guest.totalChildren > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-850 border border-orange-100 text-[10px] font-semibold leading-none">
                              <span>{guest.totalChildren} Kids</span>
                            </span>
                          )}
                        </div>
                        {guest.specialRequests && (
                          <div className="text-[11px] text-amber-850 bg-amber-50/40 px-2 py-1 rounded-lg border border-amber-100/50 mt-1.5 max-w-xs italic" title={guest.specialRequests}>
                            Req: {guest.specialRequests}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-stone-400 font-mono">{guest.phone}</span>
                          {guest.phone && guest.phone !== 'Not specified' && (
                            <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                              guest.inviteSent 
                                ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-200' 
                                : 'bg-stone-100 text-stone-400 border border-stone-200/50'
                            }`}>
                              {guest.inviteSent ? '✓ Sent' : 'Pending'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        guest.side === 'Bride'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      }`}>
                        {guest.side === 'Bride' ? 'Bride' : 'Groom'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {(() => {
                        const status = getGuestRsvpStatus(guest);
                        if (status === 'Attending') {
                          return (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse"></span>
                              Attending
                            </span>
                          );
                        } else if (status === 'Declined') {
                          return (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 text-xs font-bold shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                              Declined
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-xs font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-stone-400 mr-1.5"></span>
                              Pending
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="py-4 px-6">
                      {(() => {
                        const status = getGuestRsvpStatus(guest);
                        const invitedCount = (guest.totalAdults || 1) + (guest.totalChildren || 0);
                        const confirmedAdults = guest.confirmedAdults !== undefined ? guest.confirmedAdults : (guest.totalAdults || 1);
                        const confirmedChildren = guest.confirmedChildren !== undefined ? guest.confirmedChildren : (guest.totalChildren || 0);
                        const totalAttending = confirmedAdults + confirmedChildren;

                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-stone-400 font-medium w-12 text-right">Invited:</span>
                              <span className="font-bold text-stone-700 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-md text-[11px]">
                                {invitedCount} guests
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-stone-400 font-medium w-12 text-right">RSVP'd:</span>
                              {status === 'Pending' ? (
                                <span className="font-semibold text-stone-400 italic text-[11px]">Pending RSVP</span>
                              ) : status === 'Declined' ? (
                                <span className="font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md text-[11px]">
                                  0 attending
                                </span>
                              ) : (
                                <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                                  {totalAttending} attending ({confirmedAdults} A, {confirmedChildren} K)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5 justify-center max-w-lg mx-auto">
                        {(() => {
                          const guestEventIds = (guest.invitedEvents && guest.invitedEvents.length > 0)
                            ? guest.invitedEvents
                            : sortedItinerary.map(e => e.id);

                          const sortedGuestEvents = guestEventIds
                            .map(eId => sortedItinerary.find(e => e.id === eId))
                            .filter((e): e is ItineraryEvent => Boolean(e));

                          if (sortedGuestEvents.length === 0) {
                            return <span className="text-xs text-stone-400 italic">None invited</span>;
                          }

                          return sortedGuestEvents.map(evt => {
                            const rsvpStatus = (guest.rsvp && guest.rsvp[evt.id]) || 'Pending';
                            let badgeStyle = 'bg-stone-50 text-stone-500 border-stone-100';
                            if (rsvpStatus === 'Attending') badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                            if (rsvpStatus === 'Declined') badgeStyle = 'bg-rose-50 text-stone-400 border-rose-100 line-through';
                            if (rsvpStatus === 'Pending') badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';

                            return (
                              <div
                                key={evt.id}
                                className={`text-[10px] font-semibold border px-2 py-0.5 rounded-md flex items-center gap-1 ${badgeStyle}`}
                                title={`${evt.title} (${evt.date} ${evt.time}): ${rsvpStatus}`}
                              >
                                <span>{evt.title}</span>
                                <span className="text-[9px] opacity-75">({rsvpStatus})</span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 text-stone-600">
                        {/* Copy Personal RSVP Link */}
                        <button
                          onClick={() => handleCopyRSVPLink(guest)}
                          className={`p-1.5 rounded-lg transition-colors border border-transparent hover:border-amber-150 text-amber-800 ${
                            copiedGuestId === guest.id ? 'bg-amber-100' : 'hover:bg-amber-50'
                          }`}
                          title={copiedGuestId === guest.id ? "RSVP Link Copied!" : "Copy Personal RSVP Link"}
                        >
                          {copiedGuestId === guest.id ? (
                            <Check className="h-4 w-4 text-emerald-700 animate-scale-up" />
                          ) : (
                            <Link className="h-4 w-4" />
                          )}
                        </button>
                        {/* WhatsApp Invite */}
                        <button
                          onClick={() => handleSendWhatsAppInvite(guest)}
                          className="p-1.5 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg transition-colors border border-transparent hover:border-emerald-100 text-emerald-600"
                          title="Send WhatsApp Invite Link"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        {/* Edit btn */}
                        <button
                          onClick={() => openModal(guest)}
                          className="p-1.5 hover:bg-stone-50 hover:text-stone-800 rounded-lg transition-colors border border-transparent hover:border-stone-100"
                          title="Edit Details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {/* Delete btn */}
                        <button
                          onClick={() => setGuestToDelete(guest)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100 text-[#c53030]"
                          title="Delete Guest"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-stone-100 max-h-[90vh] flex flex-col relative overflow-hidden">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-lg z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <form onSubmit={handleFormSubmit} className="flex flex-col max-h-full overflow-hidden">
              <div className="p-6 border-b border-stone-100 shrink-0">
                <h3 className="font-serif text-lg font-bold text-stone-800">
                  {editingGuest ? 'Edit Guest Invitation' : 'Add New Wedding Guest'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Specify guest side and which wedding ceremonies they are invited to.</p>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Family / Group Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Family / Group Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Shah Family / Bride's Friends"
                    value={familyName}
                    onChange={(e) => {
                      setFamilyName(e.target.value);
                      if (e.target.value.trim()) setFamilyNameError('');
                    }}
                  />
                  {familyNameError && (
                    <p className="text-red-500 text-[10px] mt-1 font-bold">{familyNameError}</p>
                  )}
                </div>

                {/* Family Head / Lead Name */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Family Head / Lead Passenger Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm"
                    placeholder="e.g. Amitbhai Shah"
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      if (e.target.value.trim()) setGuestNameError('');
                    }}
                  />
                  {guestNameError && (
                    <p className="text-red-500 text-[10px] mt-1 font-bold">{guestNameError}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">WhatsApp Phone Number</label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm font-mono"
                    placeholder="e.g. +919876543210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (e.target.value.trim()) setPhoneError('');
                    }}
                  />
                  {phoneError && (
                    <p className="text-red-500 text-[10px] mt-1 font-bold">{phoneError}</p>
                  )}
                </div>

                {/* Total Adults and Children Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Total Adults</label>
                    <input
                      type="number"
                      min={1}
                      required
                      className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm font-mono"
                      value={totalAdults}
                      onChange={(e) => setTotalAdults(Math.max(1, Number(e.target.value)))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Children (Under 18)</label>
                    <input
                      type="number"
                      min={0}
                      required
                      className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-sm font-mono"
                      value={totalChildren}
                      onChange={(e) => setTotalChildren(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                </div>

                {/* Total Computed State Info Block */}
                <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-150/40 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-850">Computed Total Group Occupancy:</span>
                  <span className="text-[#1a2f26] font-mono font-bold text-xs bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                    {Number(totalAdults) + Number(totalChildren)} Guests
                  </span>
                </div>

                {/* VIP Flag Priority */}
                <div className="flex items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    id="guest-vip-flag"
                    className="rounded text-emerald-800 focus:ring-emerald-700 h-4 w-4 cursor-pointer"
                    checked={isVIP}
                    onChange={(e) => setIsVIP(e.target.checked)}
                  />
                  <label htmlFor="guest-vip-flag" className="text-xs font-semibold text-stone-700 select-none cursor-pointer flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-805 border border-amber-200 text-[10px] font-bold">VIP Group</span>
                    <span>Classified as High Priority Accommodation</span>
                  </label>
                </div>

                {/* Invite Sent Status Toggle */}
                <div className="flex items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    id="guest-invite-sent-flag"
                    className="rounded text-emerald-800 focus:ring-emerald-700 h-4 w-4 cursor-pointer"
                    checked={formInviteSent}
                    onChange={(e) => setFormInviteSent(e.target.checked)}
                  />
                  <label htmlFor="guest-invite-sent-flag" className="text-xs font-semibold text-stone-700 select-none cursor-pointer flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-850 border border-emerald-200 text-[10px] font-bold">Invite Sent</span>
                    <span>Mark this guest's invitation as already dispatched</span>
                  </label>
                </div>

                {/* Special Requirements */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Special Requirements & Notes</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 border border-stone-200 focus:ring-1 focus:ring-emerald-800 rounded-xl text-xs"
                    placeholder="e.g. Low floor requested, wheelchair access, adjacent rooms..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  />
                </div>

                {/* Side */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1">Family Side Affiliation</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSide('Bride')}
                      className={`text-xs font-semibold py-2 rounded-xl border text-center transition-all ${
                        side === 'Bride'
                          ? 'border-rose-300 bg-rose-50 text-rose-800 shadow-sm'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                      }`}
                    >
                      Bride's Side ({couple.bride})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSide('Groom')}
                      className={`text-xs font-semibold py-2 rounded-xl border text-center transition-all ${
                        side === 'Groom'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                      }`}
                    >
                      Groom's Side ({couple.groom})
                    </button>
                  </div>
                </div>

                {/* Invited Event Checkboxes */}
                <div>
                  <label className="block text-xs font-semibold text-stone-600 uppercase mb-1.5">Select Invited Events</label>
                  <div className="space-y-2 border border-stone-100 p-3 rounded-xl bg-[#faf9f6]/30 max-h-40 overflow-y-auto">
                    {sortedItinerary.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">No wedding events available. Add events in the Itinerary tab first.</p>
                    ) : (
                      sortedItinerary.map(evt => (
                        <label key={evt.id} className="flex items-center gap-2.5 text-xs text-stone-700 font-medium cursor-pointer py-1 select-none">
                          <input
                            type="checkbox"
                            className="rounded text-emerald-800 focus:ring-emerald-700 h-4 w-4"
                            checked={selectedEvents.includes(evt.id)}
                            onChange={() => {
                              handleEventToggle(evt.id);
                              setEventsError('');
                            }}
                          />
                          <div>
                            <span>{evt.title}</span>
                            <span className="text-[10px] text-stone-400 font-normal block">{evt.date} • {evt.time}</span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  {eventsError && (
                    <p className="text-red-500 text-[10px] mt-1 font-bold">{eventsError}</p>
                  )}
                </div>
              </div>

              {/* Submit panel */}
              <div className="flex items-center justify-end gap-2 p-6 border-t border-stone-100 bg-[#faf9f6]/50 shrink-0">
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
                  {editingGuest ? 'Save Changes' : 'Confirm Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Delete Confirm Modal */}
      {guestToDelete && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-55 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-stone-200 p-6 space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-rose-50 flex items-center justify-center text-[#c53030] border border-rose-100 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="font-serif text-lg font-bold text-stone-800">Remove Wedding Guest?</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Are you sure you want to delete <strong>{guestToDelete.name}</strong> from the Udaipur Palace Resort registry? This clears their invitation status and RSVP choices.
              </p>
            </div>

            <div className="flex gap-3 pt-2 font-sans">
              <button
                type="button"
                onClick={() => setGuestToDelete(null)}
                className="flex-1 py-2 border border-stone-200 text-stone-600 text-xs font-semibold rounded-xl hover:bg-stone-50 transition"
              >
                Keep Guest
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteGuest(guestToDelete.id);
                  setGuestToDelete(null);
                }}
                className="flex-1 py-2 bg-[#c53030] text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition font-medium"
              >
                Delete Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ Auto-Send Notification Wizard Modal */}
      {isAutoSendModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-stone-100 max-h-[90vh] flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="p-6 border-b border-stone-100 bg-[#1a2f26] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-400 text-stone-950 rounded-xl">
                  <Send className="h-4.5 w-4.5 shrink-0" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold tracking-wide">Auto-Send Invites Wizard</h3>
                  <p className="text-[10px] text-stone-300">Iterates through your guest list to trigger personalized invitations via WhatsApp or Email.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAutoSendModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#faf9f6]/30">
              {guests.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <span className="text-4xl">📭</span>
                  <p className="text-sm font-semibold text-stone-600">Welcome to Tectell Wedding Management. No data available yet.</p>
                  <p className="text-xs text-stone-400">Add some guests first to use the auto-send notification launcher.</p>
                </div>
              ) : (
                (() => {
                  const currentGuest = guests[autoSendIndex];
                  if (!currentGuest) return null;

                  const rsvpLink = `${appBaseUrl}/${currentWedding?.id || ''}?guestId=${currentGuest.id}`;
                  const coupleNames = currentWedding ? currentWedding.title : "the hosts";
                  const customMsg = messageTemplate
                    .replace(/{name}/g, currentGuest.name)
                    .replace(/{couple}/g, coupleNames)
                    .replace(/{rsvp_link}/g, rsvpLink);

                  const phoneClean = currentGuest.phone ? currentGuest.phone.replace(/[^0-9+]/g, '') : '';
                  const hasPhone = currentGuest.phone && currentGuest.phone.trim() !== '' && currentGuest.phone !== 'Not specified' && currentGuest.phone !== 'Not provided';

                  // Generate whatsapp and mailto links
                  const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(customMsg)}`;
                  const mailtoUrl = `mailto:?subject=${encodeURIComponent("Wedding Invitation - " + (currentWedding?.title || "Royal Wedding"))}&body=${encodeURIComponent(customMsg)}`;

                  const handleTriggerSend = (type: 'whatsapp' | 'email') => {
                    window.open(type === 'whatsapp' ? waUrl : mailtoUrl, '_blank');
                    updateGuest({
                      ...currentGuest,
                      inviteSent: true
                    });
                    if (autoSendIndex < guests.length - 1) {
                      setAutoSendIndex(prev => prev + 1);
                    }
                  };

                  const handleSkip = () => {
                    if (autoSendIndex < guests.length - 1) {
                      setAutoSendIndex(prev => prev + 1);
                    } else {
                      setAutoSendIndex(0); // loop back
                    }
                  };

                  const handleMarkSentOnly = () => {
                    updateGuest({
                      ...currentGuest,
                      inviteSent: true
                    });
                    if (autoSendIndex < guests.length - 1) {
                      setAutoSendIndex(prev => prev + 1);
                    }
                  };

                  return (
                    <div className="space-y-6">
                      {/* Automated Meta WhatsApp API Bulk Send Mode */}
                      <div className="bg-[#1a2f26] text-white border border-amber-400/40 p-4 rounded-2xl space-y-3 shadow-md">
                        {/* Campaign Template Selector Bar */}
                        <div className="bg-stone-900/90 border border-stone-800 p-2.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                              🎯 Select Approved Meta Campaign
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              Active: <strong className="text-emerald-400">{broadcastCampaignType === 'save_the_date' ? 'rsvp_wedding' : broadcastCampaignType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}</strong>
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setBroadcastCampaignType('save_the_date');
                                setMessageTemplate(`Hi {name}! 🌟 We are thrilled to invite you to the wedding of {couple}. Please check your personalized itinerary & submit your RSVP details here: {rsvp_link}.\n We look forward to celebrating with you!`);
                              }}
                              className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
                                broadcastCampaignType === 'save_the_date'
                                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-sans">
                                <span>💌</span>
                                <span>Save the Date</span>
                              </div>
                              <div className="text-[9px] font-mono text-stone-400 mt-0.5">rsvp_wedding (4 params)</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBroadcastCampaignType('official_invite');
                                setMessageTemplate(`Dearest {name},\n\nWith immense joy and the divine blessings of our families, we cordially invite you to grace the grand celebration of the wedding of {couple}.\n\n✨ *CELEBRATION DETAILS* ✨\n📅 *Wedding Date:* ${weddingDate}\n🏰 *Venue:* ${resortName}\n\nYour personalized itinerary, hotel accommodations, and event schedule are available on your private guest portal:\n🔗 *Guest Portal:* {wedding_website_url}\n\nWe eagerly look forward to celebrating this special milestone with you!\n\nWarmest regards,\nfooter - Tectell Wedding Management`);
                              }}
                              className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
                                broadcastCampaignType === 'official_invite'
                                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-sans">
                                <span>👑</span>
                                <span>Official Invitation</span>
                              </div>
                              <div className="text-[9px] font-mono text-stone-400 mt-0.5">wedding_official (5 params)</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBroadcastCampaignType('rsvp_reminder');
                                setMessageTemplate(`⏳ *RSVP REMINDER* ⏳\n\nDear {name},\n\nWe are eagerly counting down the days to the wedding of {couple}!\n\n📅 *Date:* ${weddingDate}\n🏰 *Venue:* ${resortName}\n\nAs we put the finishing touches on our celebration, please take a moment to RSVP:\n🔗 {rsvp_link}`);
                              }}
                              className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer ${
                                broadcastCampaignType === 'rsvp_reminder'
                                  ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-sans">
                                <span>⏳</span>
                                <span>RSVP Reminder</span>
                              </div>
                              <div className="text-[9px] font-mono text-stone-400 mt-0.5">rsvp_reminder (5 params)</div>
                            </button>
                          </div>
                        </div>

                        {/* Smart Utility Fallback Banner & Switch */}
                        <div className={`p-3.5 rounded-xl border transition-all ${
                          useUtilitySafeDelivery
                            ? 'bg-amber-950/40 border-amber-400/50 text-amber-200'
                            : 'bg-stone-900/60 border-stone-800 text-stone-300'
                        }`}>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <div className={`p-1.5 rounded-lg shrink-0 ${
                                useUtilitySafeDelivery ? 'bg-amber-400 text-stone-950 font-black' : 'bg-stone-800 text-stone-400'
                              }`}>
                                <Zap className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-amber-300">
                                    {useUtilitySafeDelivery ? '⚡ Smart Utility Fallback: ON' : 'Direct Meta Template Route (ACTIVE)'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    useUtilitySafeDelivery
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    {useUtilitySafeDelivery ? 'Auto-Fallback Enabled' : 'Strict Template Dispatch'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
                                  {useUtilitySafeDelivery
                                    ? `Dispatches '${broadcastCampaignType === 'save_the_date' ? 'rsvp_wedding' : broadcastCampaignType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}' directly. If Meta rejects marketing templates, it automatically attempts 'rsvp_reminder'.`
                                    : `Sending with '${broadcastCampaignType === 'save_the_date' ? 'rsvp_wedding' : broadcastCampaignType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}' template directly.`}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleUtilitySafeDelivery(!useUtilitySafeDelivery)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                                useUtilitySafeDelivery
                                  ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-xs'
                                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600'
                              }`}
                            >
                              {useUtilitySafeDelivery ? '✓ Fallback ON' : 'Enable Fallback'}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-serif font-bold text-amber-400 flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-amber-400" />
                              <span>Meta WhatsApp Cloud API Automated Bulk Send</span>
                            </h4>
                            <p className="text-[11px] text-stone-300">
                              Send {broadcastCampaignType === 'save_the_date' ? 'Save the Date (rsvp_wedding)' : broadcastCampaignType === 'official_invite' ? 'Official Invitation (wedding_official)' : 'RSVP Reminder (rsvp_reminder)'} to all {guests.length} guest(s) automatically via Meta API.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => executeBulkWhatsAppSend(guests, messageTemplate, broadcastCampaignType)}
                            disabled={simulationActive || guests.length === 0}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
                          >
                            <Send className="h-4 w-4 text-stone-950" />
                            <span>🚀 Bulk API Send ({guests.length})</span>
                          </button>
                        </div>

                        {/* Live Terminal Log */}
                        {(simulationActive || simulationLogs.length > 0) && (
                          <div className="border border-stone-800 rounded-xl p-3.5 bg-stone-950 text-stone-200 space-y-2 font-mono text-xs antialiased shadow-inner mt-2">
                            <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${simulationActive ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
                                <span className="font-bold text-amber-300">Meta WhatsApp Cloud API Live Log</span>
                              </div>
                              <span className="text-[10px] text-stone-400 font-bold">{simulationProgress}%</span>
                            </div>

                            <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 transition-all duration-300"
                                style={{ width: `${simulationProgress}%` }}
                              />
                            </div>

                            <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono leading-relaxed pr-1 text-stone-300">
                              {simulationLogs.map((log, idx) => (
                                <div key={idx} className={log.includes('✓') ? 'text-emerald-400' : log.includes('❌') ? 'text-rose-400' : log.includes('⚠️') ? 'text-amber-300' : 'text-stone-300'}>
                                  {log}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Guest card status */}
                      <div className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
                              currentGuest.inviteSent 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-805 border border-amber-200'
                            }`}>
                              {currentGuest.inviteSent ? '✓ Sent / Dispatched' : 'Pending Send'}
                            </span>
                            <h4 className="font-serif text-lg font-bold text-stone-800">{currentGuest.name}</h4>
                            <p className="text-xs text-stone-500 font-mono">
                              Group: {currentGuest.familyName || "Independent"} • Side: {currentGuest.side}
                            </p>
                          </div>
                          <div className="text-right text-[10px] text-stone-400 font-mono uppercase">
                            <p>Queue Position</p>
                            <p className="text-sm font-bold text-emerald-850">{autoSendIndex + 1} of {guests.length}</p>
                          </div>
                        </div>

                        {/* Missing phone warning & fallback options */}
                        {!hasPhone ? (
                          <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-2 text-rose-950">
                            <div className="flex items-center gap-2 font-semibold text-xs text-[#c53030]">
                              <AlertCircle className="h-4 w-4 text-[#c53030] shrink-0" />
                              <span>⚠️ Missing WhatsApp Phone Number</span>
                            </div>
                            <p className="text-[11px] text-rose-800 leading-relaxed font-sans">
                              This guest does not have a valid phone number. You can fall back to launching a personalized <strong>Email (mailto) notification</strong> instead, or simply mark them as sent/completed.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-emerald-50/50 border border-emerald-150/40 p-4 rounded-xl flex items-center gap-2 text-emerald-950 text-xs font-mono">
                            <Check className="h-4 w-4 text-emerald-700 shrink-0" />
                            <span>WhatsApp Destination: <strong className="font-bold text-emerald-800">{currentGuest.phone}</strong></span>
                          </div>
                        )}

                        {/* Interactive Message Mockup */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-stone-400 uppercase font-bold">Personalized Message Preview:</span>
                          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/50 text-xs font-sans text-stone-700 whitespace-pre-wrap leading-relaxed font-sans">
                            {customMsg}
                          </div>
                        </div>
                      </div>

                      {/* Control Panel Actions */}
                      <div className="flex flex-wrap items-center gap-3 font-sans">
                        {hasPhone ? (
                          <button
                            type="button"
                            onClick={() => handleTriggerSend('whatsapp')}
                            className="flex-1 min-w-[200px] py-3 px-4 bg-[#1a2f26] hover:bg-[#233d31] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                          >
                            <MessageCircle className="h-4 w-4 text-white fill-white animate-bounce" />
                            <span>LAUNCH WHATSAPP & MARK SENT</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTriggerSend('email')}
                            className="flex-1 min-w-[200px] py-3 px-4 bg-[#1a2f26] hover:bg-[#233d31] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                          >
                            <Send className="h-4 w-4 text-amber-400" />
                            <span>LAUNCH EMAIL & MARK SENT</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleMarkSentOnly}
                          className="px-4 py-3 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Mark Sent (Skip)
                        </button>

                        <button
                          type="button"
                          onClick={handleSkip}
                          className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>Skip Guest</span>
                          <SkipForward className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Guest Quick-Select Grid */}
                      <div className="space-y-2 pt-4 border-t border-stone-100">
                        <label className="block text-[10px] font-mono uppercase text-stone-400 font-bold">Jump directly to guest in Registry ({guests.length}):</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1">
                          {guests.map((g, idx) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setAutoSendIndex(idx)}
                              className={`p-2 rounded-xl text-[11px] font-medium border text-left truncate transition cursor-pointer ${
                                autoSendIndex === idx
                                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                                  : 'bg-white border-stone-200/50 text-stone-600 hover:bg-stone-50'
                              }`}
                            >
                              <div className="truncate">{g.name}</div>
                              <div className="text-[9px] text-stone-450 font-mono mt-0.5">{g.inviteSent ? '✓ Sent' : 'Pending'}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Footer Pagination */}
            {guests.length > 0 && (
              <div className="p-4 border-t border-stone-100 bg-[#faf9f6]/50 flex items-center justify-between shrink-0 font-mono text-[11px] text-stone-500">
                <button
                  type="button"
                  disabled={autoSendIndex === 0}
                  onClick={() => setAutoSendIndex(prev => prev - 1)}
                  className="px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  ← Previous
                </button>
                <span>Guest {autoSendIndex + 1} of {guests.length}</span>
                <button
                  type="button"
                  disabled={autoSendIndex === guests.length - 1}
                  onClick={() => setAutoSendIndex(prev => prev + 1)}
                  className="px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📥 Bulk Import Guests Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border-4 border-double border-[#d8cdb8] max-h-[90vh] flex flex-col overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-stone-100 bg-[#1a2f26] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-400 text-stone-950 rounded-xl shadow-md">
                  <FileSpreadsheet className="h-5 w-5 shrink-0" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-black tracking-widest text-amber-300 uppercase">Bulk Import Guests</h3>
                  <p className="text-[10px] text-stone-300 font-sans mt-0.5 font-medium">Import hundreds of guests directly from Excel, Google Sheets, or CSV file.</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#faf9f6]/30">
              
              {importSuccessCount !== null ? (
                /* Success Screen */
                <div className="text-center py-16 space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                    <Check className="h-8 w-8 animate-bounce" />
                  </div>
                  <h4 className="font-serif text-xl font-bold text-stone-800">Guests Imported Successfully!</h4>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    We have successfully imported and registered <strong className="text-emerald font-bold">{importSuccessCount}</strong> guests into the wedding registry database. They are now available for hotel room allocations, transportation tracking, and WhatsApp invite dispatch!
                  </p>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportSuccessCount(null);
                      }}
                      className="w-full py-3 px-4 bg-[#1a2f26] hover:bg-[#233d31] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Awesome, Return to Guest List
                    </button>
                  </div>
                </div>
              ) : (
                /* Main Importer Flow */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Formats and Inputs */}
                  <div className="lg:col-span-5 space-y-5">
                    
                    {/* File Drop & select area */}
                    <div className="bg-white p-4.5 rounded-2xl border border-gold/20 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono font-bold uppercase text-stone-400 tracking-wider">📁 Option 1: Upload CSV file</label>
                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          <span>Get Excel Template</span>
                        </button>
                      </div>
                      
                      <div className="border-2 border-dashed border-stone-200/80 rounded-xl p-4 text-center hover:border-amber-400 transition cursor-pointer relative bg-[#faf9f6]/40">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCSVFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <FileSpreadsheet className="h-6 w-6 text-stone-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-stone-700">Click to browse or drop CSV file</p>
                        <p className="text-[9px] text-stone-400 mt-1">Accepts standard .csv file formats</p>
                      </div>
                    </div>

                    {/* Copy Paste Text area */}
                    <div className="bg-white p-4.5 rounded-2xl border border-gold/20 shadow-xs space-y-3">
                      <label htmlFor="import-textarea" className="block text-[11px] font-mono font-bold uppercase text-stone-400 tracking-wider">📋 Option 2: Copy-Paste columns from Excel</label>
                      <p className="text-[10px] text-stone-500 leading-normal">
                        Select rows in Excel or Google Sheets and paste them below. The system automatically detects column headers!
                      </p>
                      <textarea
                        id="import-textarea"
                        value={importText}
                        onChange={(e) => handleParseImportText(e.target.value)}
                        placeholder="Name,Family ID or Primary Guest Name,Phone,Side,Adults,Children,VIP,Special Requests&#10;Abhijit Shah,Shah Family,+919876543210,Groom,2,0,Yes,VIP Suite near couple&#10;Rima Patel,Rima Patel,+919999999999,Bride,1,0,No,Needs wheelchair access"
                        rows={6}
                        className="w-full bg-[#faf9f6] border border-stone-250 rounded-xl px-3 py-2.5 text-xs font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
                      />
                    </div>

                    {/* Fallback event selector when Events column is empty */}
                    <div className="bg-white p-4.5 rounded-2xl border border-gold/20 shadow-xs space-y-3">
                      <label className="block text-[11px] font-mono font-bold uppercase text-stone-400 tracking-wider">🎯 Fallback Ceremony Invitations</label>
                      <p className="text-[10px] text-stone-500 leading-normal">
                        If a guest row doesn't specify any events in the column, they will be invited to the ceremonies checked below:
                      </p>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto border border-stone-100 rounded-xl p-3 bg-[#faf9f6]/40">
                        {itinerary.length === 0 ? (
                          <p className="text-[10px] italic text-stone-400">No wedding ceremonies configured yet.</p>
                        ) : (
                          itinerary.map(event => {
                            const isChecked = defaultSelectedEventIds.includes(event.id);
                            return (
                              <label key={event.id} className="flex items-center gap-2 text-xs font-medium text-stone-700 cursor-pointer hover:bg-stone-50 p-1.5 rounded-lg transition">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setDefaultSelectedEventIds(defaultSelectedEventIds.filter(id => id !== event.id));
                                    } else {
                                      setDefaultSelectedEventIds([...defaultSelectedEventIds, event.id]);
                                    }
                                  }}
                                  className="h-3.5 w-3.5 rounded border-stone-300 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                                />
                                <span>{event.title}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Formatting Guide Info */}
                    <div className="bg-[#faf9f6] p-4 rounded-xl border border-stone-200/40 text-[11px] text-stone-600 space-y-2">
                      <h5 className="font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1">
                        <Settings2 className="h-3.5 w-3.5 text-stone-500" />
                        <span>💡 Template Column Mapping</span>
                      </h5>
                      <ul className="list-disc pl-4 space-y-1 text-stone-550 leading-relaxed font-sans">
                        <li><strong>Name</strong>: Lead passenger or family head <strong className="text-stone-700 font-semibold">(Required)</strong></li>
                        <li><strong>Family ID or Primary Guest Name</strong>: Shared family key to automatically group members into a single family.</li>
                        <li><strong>Phone</strong>: WhatsApp format starting with country code <strong className="text-stone-700 font-semibold">(Required)</strong></li>
                        <li><strong>Side</strong>: <code className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-mono text-[9px]">Bride</code> or <code className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-mono text-[9px]">Groom</code></li>
                        <li><strong>Adults / Children</strong>: Member numbers (default 1 adult, 0 children)</li>
                        <li><strong>VIP</strong>: Mark <code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded font-mono text-[9px]">Yes</code> or <code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded font-mono text-[9px]">True</code></li>
                        <li><strong>Special Requests</strong>: Any custom instructions or food preferences</li>
                        <li><strong>Ceremony Columns (e.g. Haldi, Wedding)</strong>: Dedicated column for each event. Enter <code className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-mono text-[9px]">Yes</code>, <code className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-mono text-[9px]">No</code>, <code className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-mono text-[9px]">1</code>, or <code className="text-amber-800 bg-amber-50 px-1 py-0.5 rounded font-mono text-[9px]">0</code>.</li>
                      </ul>
                    </div>

                  </div>

                  {/* Right Column: Parsed Preview Grid */}
                  <div className="lg:col-span-7 space-y-4 font-sans">
                    <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                      <h4 className="text-xs font-mono font-bold uppercase text-stone-400 tracking-wider">🎯 Live Parsed Preview</h4>
                      {importedRows.length > 0 && (
                        <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                          {importedRows.filter(r => r.isValid).length} of {importedRows.length} rows valid
                        </span>
                      )}
                    </div>

                    {importError && (
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>{importError}</span>
                      </div>
                    )}

                    {importedRows.length === 0 ? (
                      <div className="bg-white border border-stone-200/40 rounded-2xl py-24 text-center text-stone-400 space-y-2">
                        <FileSpreadsheet className="h-8 w-8 text-stone-300 mx-auto animate-pulse" />
                        <p className="text-xs font-semibold text-stone-600">No guests parsed yet.</p>
                        <p className="text-[10px] text-stone-450 max-w-xs mx-auto">Upload a CSV or copy-paste your spreadsheets cells on the left to preview parsed rows.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border border-stone-200/60 rounded-xl overflow-hidden bg-white max-h-[350px] overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-[#faf9f6] sticky top-0 border-b border-stone-200/60 font-mono text-[10px] uppercase text-stone-450 font-bold">
                              <tr>
                                <th className="px-3 py-2.5">Guest & Family</th>
                                <th className="px-3 py-2.5">WhatsApp</th>
                                <th className="px-3 py-2.5">Details & Events</th>
                                <th className="px-3 py-2.5 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                              {importedRows.map((row, idx) => (
                                <tr key={idx} className={row.isValid ? "hover:bg-stone-50/50" : "bg-rose-50/30 hover:bg-rose-50/50"}>
                                  <td className="px-3 py-2.5">
                                    <div className="font-semibold text-stone-800">{row.name || <span className="text-rose-600 italic">No name provided</span>}</div>
                                    <div className="text-[10px] text-stone-400">{row.familyName}</div>
                                  </td>
                                  <td className="px-3 py-2.5 font-mono text-[11px] text-stone-600">
                                    {row.phone || <span className="text-rose-600 italic">No phone</span>}
                                  </td>
                                  <td className="px-3 py-2.5 space-y-1">
                                    <div className="text-[10px] text-stone-500 font-medium">
                                      {row.side}'s Side • {row.totalAdults}A, {row.totalChildren}C
                                    </div>
                                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                                      {row.isVIP && (
                                        <span className="inline-block px-1.5 py-0.2 bg-rose-50 text-rose-800 border border-rose-200 text-[8px] uppercase font-bold rounded">
                                          VIP
                                        </span>
                                      )}
                                      {row.matchedEventIds.length > 0 ? (
                                        row.matchedEventIds.map(id => {
                                          const ev = itinerary.find(e => e.id === id);
                                          return ev ? (
                                            <span key={id} className="inline-block px-1.5 py-0.2 bg-amber-50 text-amber-900 border border-amber-200/60 text-[8px] font-medium rounded">
                                              ✨ {ev.title}
                                            </span>
                                          ) : null;
                                        })
                                      ) : (
                                        <span className="inline-block px-1.5 py-0.2 bg-stone-50 text-stone-500 border border-stone-200 text-[8px] font-medium rounded italic">
                                          Fallback: {defaultSelectedEventIds.length} events
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    {row.isValid ? (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-bold font-mono">
                                        <Check className="h-3 w-3" />
                                        <span>Ready</span>
                                      </span>
                                    ) : (
                                      <div className="space-y-0.5 text-right">
                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-700 font-bold font-mono">
                                          ✕ Error
                                        </span>
                                        <div className="text-[9px] text-rose-500 leading-none">{row.errorReason}</div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Event selection warning/note */}
                        <div className="bg-amber-50/30 border border-amber-200/30 p-3.5 rounded-xl text-[11px] text-stone-600 leading-relaxed">
                          ✨ <strong>Ceremony Mapping:</strong> Row-specific events are parsed directly from your spreadsheet cells. Rows with no event names or matches default to the <strong className="text-stone-800 font-semibold">{defaultSelectedEventIds.length} checked fallback events</strong>. You can adjust individual guest invites anytime later!
                        </div>

                        {/* Action buttons footer */}
                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setImportedRows([]);
                              setImportText('');
                            }}
                            className="px-4 py-2 text-stone-500 hover:text-stone-800 text-xs font-bold transition"
                          >
                            Reset Data
                          </button>
                          
                          <button
                            type="button"
                            disabled={isImporting || importedRows.filter(r => r.isValid).length === 0}
                            onClick={executeBulkImport}
                            className="px-5 py-3 bg-[#1a2f26] hover:bg-[#233d31] disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
                          >
                            {isImporting ? (
                              <>
                                <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Importing Guests...</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 text-amber-300" />
                                <span>Import {importedRows.filter(r => r.isValid).length} Valid Guests</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 bg-[#faf9f6]/50 flex items-center justify-between shrink-0 font-mono text-[10px] text-stone-400">
              <span>Wedding Management Suite by Tectell</span>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-600 transition cursor-pointer"
              >
                Close Importer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ✉️ WhatsApp RSVP Message Template Editor Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl border border-stone-100 flex flex-col overflow-hidden relative">
            <button
              onClick={() => setIsTemplateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-lg z-10 cursor-pointer animate-scale-up"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 border-b border-stone-100 bg-[#1a2f26] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-amber-400 text-stone-950 rounded-xl shadow-sm">
                  <MessageSquare className="h-4.5 w-4.5 shrink-0 text-stone-950" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold tracking-wide">Edit WhatsApp RSVP Message</h3>
                  <p className="text-[10px] text-stone-350">Customize the invitation message that guests receive when you send their RSVP link.</p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[#faf9f6]/30">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase text-stone-450 tracking-wider">
                  Invitation Text Template
                </label>
                <p className="text-xs text-stone-600 leading-relaxed font-sans">
                  Customize your wording here. The system automatically substitutes these dynamic placeholders for each guest:
                </p>
                <div className="grid grid-cols-3 gap-2 py-1">
                  <div className="bg-white px-2 py-1.5 rounded-xl border border-stone-200 text-center shadow-xs">
                    <span className="text-[11px] text-amber-800 font-mono font-bold block">{`{name}`}</span>
                    <span className="text-[9px] text-stone-400 font-medium">Guest's Name</span>
                  </div>
                  <div className="bg-white px-2 py-1.5 rounded-xl border border-stone-200 text-center shadow-xs">
                    <span className="text-[11px] text-amber-800 font-mono font-bold block">{`{couple}`}</span>
                    <span className="text-[9px] text-stone-400 font-medium">Couples' Names</span>
                  </div>
                  <div className="bg-white px-2 py-1.5 rounded-xl border border-stone-200 text-center shadow-xs">
                    <span className="text-[11px] text-amber-800 font-mono font-bold block">{`{rsvp_link}`}</span>
                    <span className="text-[9px] text-stone-400 font-medium">RSVP Link</span>
                  </div>
                </div>
              </div>

              <textarea
                value={messageTemplate}
                onChange={(e) => {
                  setMessageTemplate(e.target.value);
                  setActiveQueueIndex(0);
                }}
                rows={6}
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-3 text-xs font-sans text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-850 focus:border-emerald-850 transition-colors shadow-xs"
                placeholder="Enter customized message template..."
              />

              {/* Dynamic Sample Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-stone-450 font-bold tracking-wider">
                    📱 Live WhatsApp Preview Mockup
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMessageTemplate(`Hi {name}! 🌟 We are thrilled to invite you to the wedding of {couple}. Please check your personalized itinerary & submit your RSVP details here: {rsvp_link}`);
                      setActiveQueueIndex(0);
                    }}
                    className="text-[10px] font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3 text-amber-850" />
                    <span>Reset to Default</span>
                  </button>
                </div>
                <div className="bg-[#e5ddd5] text-stone-900 p-4 rounded-xl font-sans text-xs space-y-2 relative overflow-hidden border border-stone-200/50 shadow-inner">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#128c7e]"></div>
                  <div className="bg-white p-3 rounded-lg shadow-sm max-w-[90%] relative">
                    <p className="whitespace-pre-wrap text-[11px] leading-relaxed break-words text-stone-850 font-sans">
                      {getPersonalizedMessage(guests[0] || { id: 'g_sample', name: 'Amitbhai Shah', phone: '+919876543210', side: 'Bride', invitedEvents: [], rsvp: {} })}
                    </p>
                    <span className="text-[9px] text-stone-400 text-right block mt-1.5">10:45 AM ✓✓</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-6 border-t border-stone-100 bg-[#faf9f6]/50 shrink-0">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-5 py-2.5 bg-[#1a2f26] hover:bg-[#233d31] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Save &amp; Close Editor
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
