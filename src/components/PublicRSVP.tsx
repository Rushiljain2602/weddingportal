/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ItineraryEvent } from '../types';
import { Heart, Clock, MapPin, CheckCircle, Search, AlertCircle, Sparkles } from 'lucide-react';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TectellIcon } from './TectellLogo';
import { sortItineraryEvents } from '../utils/formatters';

export default function PublicRSVP() {
  const { itinerary: contextItinerary, guests: contextGuests, submitGuestRSVP, currentWedding: contextWedding, brideName, groomName } = useApp();

  const { coupleName } = useParams<{ coupleName: string }>();
  const [wedding, setWedding] = useState<any>(null);
  const [localItinerary, setLocalItinerary] = useState<ItineraryEvent[]>([]);
  const [localGuests, setLocalGuests] = useState<any[]>([]);
  const [isWeddingLoading, setIsWeddingLoading] = useState(true);
  const [weddingError, setWeddingError] = useState<string | null>(null);

  useEffect(() => {
    const loadWeddingData = async () => {
      if (!coupleName) {
        setIsWeddingLoading(false);
        return;
      }
      setIsWeddingLoading(true);
      setWeddingError(null);
      try {
        const slug = coupleName.trim().toLowerCase().replace(/-/g, '_');
        const docRef = doc(db, 'weddings', slug);
        const docSnap = await getDoc(docRef);
        let activeWId = slug;
        let weddingData = null;
        
        if (docSnap.exists()) {
          weddingData = { id: docSnap.id, ...docSnap.data() };
        } else {
          // Fallback search
          const weddingsSnap = await getDocs(collection(db, 'weddings'));
          let found = false;
          weddingsSnap.forEach(wDoc => {
            const data = wDoc.data();
            if (wDoc.id === coupleName || data.ownerName?.toLowerCase().includes(coupleName.toLowerCase())) {
              weddingData = { id: wDoc.id, ...data };
              activeWId = wDoc.id;
              found = true;
            }
          });
          if (!found) {
            setWeddingError(`Wedding registry for "${coupleName}" was not found.`);
            setIsWeddingLoading(false);
            return;
          }
        }
        
        setWedding(weddingData);

        // Fetch itinerary events for this wedding
        const itineraryRef = collection(db, 'weddings', activeWId, 'itinerary');
        const itinerarySnap = await getDocs(itineraryRef);
        const itineraryList: ItineraryEvent[] = [];
        itinerarySnap.forEach(itemDoc => {
          itineraryList.push({ id: itemDoc.id, ...itemDoc.data() } as ItineraryEvent);
        });
        
        // Sort itinerary by date and time
        const sortedEvents = sortItineraryEvents(itineraryList);
        setLocalItinerary(sortedEvents);

        // Fetch guests list for this wedding
        const rsvpsRef = collection(db, 'rsvps');
        const rsvpsQuery = query(rsvpsRef, where('weddingId', '==', activeWId));
        const rsvpsSnap = await getDocs(rsvpsQuery);
        const guestsList: any[] = [];
        rsvpsSnap.forEach(gSnap => {
          guestsList.push({ id: gSnap.id, ...gSnap.data() });
        });
        setLocalGuests(guestsList);

      } catch (err: any) {
        console.error("Error loading wedding in PublicRSVP:", err);
        setWeddingError("Failed to fetch wedding details.");
      } finally {
        setIsWeddingLoading(false);
      }
    };
    loadWeddingData();
  }, [coupleName]);

  const currentWedding = wedding || contextWedding;
  const itinerary = coupleName ? localItinerary : contextItinerary;
  const guests = coupleName ? localGuests : contextGuests;

  // Attempt to parse couple names dynamically or use explicit settings
  const couple = (() => {
    if (brideName && groomName) {
      return { bride: brideName, groom: groomName };
    }
    if (!currentWedding) return { bride: 'Bride', groom: 'Groom' };
    if (currentWedding.brideName && currentWedding.groomName) {
      return { bride: currentWedding.brideName, groom: currentWedding.groomName };
    }
    const title = currentWedding.title || '';
    const parts = title.split(/[♥&+]|and/i).map(s => s.trim());
    if (parts.length >= 2) {
      return { bride: parts[1] || 'Bride', groom: parts[0] || 'Groom' };
    }
    return { bride: 'Bride', groom: 'Groom' };
  })();

  // Form states
  const [guestName, setGuestName] = useState('');
  const [nameError, setNameError] = useState('');
  const [rsvpValues, setRsvpValues] = useState<{ [eventId: string]: 'Attending' | 'Declined' }>({});
  
  // Checking results
  const [matchingGuest, setMatchingGuest] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLockedByLink, setIsLockedByLink] = useState(false);

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [fetchingGuest, setFetchingGuest] = useState(false);

  // Auto-detect guestId from URL query params
  const hasAutoLoaded = useRef(false);
  useEffect(() => {
    const fetchGuest = async () => {
      if (hasAutoLoaded.current) return;
      const params = new URLSearchParams(window.location.search);
      const urlGuestId = params.get('guestId') || params.get('g');
      if (!urlGuestId) return;

      setFetchingGuest(true);
      try {
        const guestDocRef = doc(db, 'rsvps', urlGuestId);
        const docSnap = await getDoc(guestDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          hasAutoLoaded.current = true;
          setIsLockedByLink(true);
          setGuestName(data.name || '');
          const foundGuest = {
            id: docSnap.id,
            ...data,
            rsvp: data.rsvp || {}
          };
          setMatchingGuest(foundGuest);
          setHasSearched(true);

          if (data.hasSubmitted) {
            setAlreadySubmitted(true);
          }
        }
      } catch (err) {
        console.warn("Error fetching guest rsvp:", err);
      } finally {
        setFetchingGuest(false);
      }
    };

    fetchGuest();
  }, []);

  // Session Restoration for Return Guests
  useEffect(() => {
    // If we already loaded a guest from the URL link, do not override
    if (isLockedByLink || hasAutoLoaded.current) return;

    const wId = currentWedding?.id || localStorage.getItem('current_wedding_id') || 'devansh_helly';
    const savedGuestId = localStorage.getItem(`last_submitted_guest_id_${wId}`);
    const savedGuestName = localStorage.getItem(`last_submitted_guest_name_${wId}`);

    if (savedGuestId || savedGuestName) {
      const loadPreviousRsvp = async () => {
        setFetchingGuest(true);
        try {
          let foundDoc: any = null;
          if (savedGuestId) {
            const guestDocRef = doc(db, 'rsvps', savedGuestId);
            const docSnap = await getDoc(guestDocRef);
            if (docSnap.exists()) {
              foundDoc = { id: docSnap.id, ...docSnap.data() };
            }
          }
          
          if (!foundDoc && savedGuestName) {
            const nameLower = savedGuestName.trim().toLowerCase();
            const found = guests.find(g => g.name.trim().toLowerCase() === nameLower);
            if (found) {
              foundDoc = found;
            }
          }

          if (foundDoc) {
            setGuestName(foundDoc.name || '');
            setMatchingGuest(foundDoc);
            setHasSearched(true);
            if (foundDoc.hasSubmitted) {
              setAlreadySubmitted(true);
            }
          }
        } catch (e) {
          console.warn("Error restoring previous RSVP session:", e);
        } finally {
          setFetchingGuest(false);
        }
      };
      
      // Delay slightly to ensure firebase/guests collection is initialized
      const timer = setTimeout(loadPreviousRsvp, 800);
      return () => clearTimeout(timer);
    }
  }, [guests, currentWedding?.id, isLockedByLink]);

  // Handle asynchronous initialization of RSVP values once both matchingGuest and itinerary are loaded
  const lastInitializedGuestIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (matchingGuest && itinerary.length > 0) {
      if (lastInitializedGuestIdRef.current !== matchingGuest.id) {
        lastInitializedGuestIdRef.current = matchingGuest.id;
        const initialVals: { [eventId: string]: 'Attending' | 'Declined' } = {};
        itinerary.forEach(e => {
          const currentRsvp = matchingGuest.rsvp?.[e.id] || 'Pending';
          initialVals[e.id] = currentRsvp === 'Attending' ? 'Attending' : 'Declined';
        });
        setRsvpValues(initialVals);
      }
    } else if (!matchingGuest) {
      lastInitializedGuestIdRef.current = null;
    }
  }, [matchingGuest, itinerary]);

  // Auto-complete Suggestions Helper
  const selectSuggestion = (guest: any) => {
    setGuestName(guest.name);
    setMatchingGuest(guest);
    
    const initialVals: { [eventId: string]: 'Attending' | 'Declined' } = {};
    itinerary.forEach(e => {
      const currentRsvp = guest.rsvp?.[e.id] || 'Pending';
      initialVals[e.id] = currentRsvp === 'Attending' ? 'Attending' : 'Declined';
    });
    setRsvpValues(initialVals);
    setHasSearched(true);
  };

  // Suggestions dropdown disabled to guarantee guest-list privacy and prevent name leakage
  const suggestions: any[] = [];
  
  // Submit state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{ guestName: string; isNew: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Custom headcount and poll states
  const [confirmedAdults, setConfirmedAdults] = useState<number>(1);
  const [confirmedChildren, setConfirmedChildren] = useState<number>(0);
  const [pollAnswer, setPollAnswer] = useState('');
  const [headcountError, setHeadcountError] = useState('');

  // Fetch invited headcount limits from matchingGuest
  const invitedAdults = matchingGuest ? (matchingGuest.totalAdults !== undefined ? Number(matchingGuest.totalAdults) : 1) : 1;
  const invitedChildren = matchingGuest ? (matchingGuest.totalChildren !== undefined ? Number(matchingGuest.totalChildren) : 0) : 0;

  // Initialize confirmed headcounts and poll answer when matchingGuest updates
  useEffect(() => {
    if (matchingGuest) {
      const isAdults = matchingGuest.totalAdults !== undefined ? Number(matchingGuest.totalAdults) : 1;
      const isChildren = matchingGuest.totalChildren !== undefined ? Number(matchingGuest.totalChildren) : 0;
      setConfirmedAdults(matchingGuest.confirmedAdults !== undefined ? Number(matchingGuest.confirmedAdults) : isAdults);
      setConfirmedChildren(matchingGuest.confirmedChildren !== undefined ? Number(matchingGuest.confirmedChildren) : isChildren);
      setPollAnswer(matchingGuest.pollAnswer || '');
    } else {
      setConfirmedAdults(1);
      setConfirmedChildren(0);
      setPollAnswer('');
    }
  }, [matchingGuest]);

  // Soft-search matching guest from list
  const handleNameSearch = () => {
    if (!guestName.trim()) {
      setNameError('Name field is required and cannot be empty.');
      return;
    }
    setNameError('');
    
    const nameLower = guestName.trim().toLowerCase();
    const found = guests.find(g => g.name.trim().toLowerCase() === nameLower);

    if (found) {
      setMatchingGuest(found);
      
      // Pre-populate checkboxes matching their current reservation choices
      const initialVals: { [eventId: string]: 'Attending' | 'Declined' } = {};
      itinerary.forEach(e => {
        const currentRsvp = found.rsvp[e.id] || 'Pending';
        // If they already said attending, select it
        initialVals[e.id] = currentRsvp === 'Attending' ? 'Attending' : 'Declined';
      });
      setRsvpValues(initialVals);
      setHasSearched(true);

      if (found.hasSubmitted) {
        setAlreadySubmitted(true);
        return;
      }
    } else {
      setMatchingGuest(null);
      // New registration - pre-select all events as declined first, let them opt-in to attend
      const initialVals: { [eventId: string]: 'Attending' | 'Declined' } = {};
      itinerary.forEach(e => {
        initialVals[e.id] = 'Declined';
      });
      setRsvpValues(initialVals);
    }
    setHasSearched(true);
  };

  const handleRsvpToggle = (eventId: string) => {
    setRsvpValues(prev => ({
      ...prev,
      [eventId]: prev[eventId] === 'Attending' ? 'Declined' : 'Attending'
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setNameError('Name field is required and cannot be empty.');
      return;
    }
    setNameError('');
    setIsSaving(true);
    setHeadcountError('');

    try {
      // If they edited the name input field without clicking "Verify Name",
      // the matchingGuest state might be stale (e.g. from a previous search or URL param).
      // We must invalidate matchingGuest if the current input name doesn't match matchingGuest.name.
      let activeMatchingGuest = matchingGuest;
      if (matchingGuest && matchingGuest.name.trim().toLowerCase() !== guestName.trim().toLowerCase()) {
        activeMatchingGuest = null;
      }

      // Read active invitation limits
      const isLimitAdults = activeMatchingGuest ? (activeMatchingGuest.totalAdults !== undefined ? Number(activeMatchingGuest.totalAdults) : 1) : 1;
      const isLimitChildren = activeMatchingGuest ? (activeMatchingGuest.totalChildren !== undefined ? Number(activeMatchingGuest.totalChildren) : 0) : 0;

      // Validate headcounts
      if (confirmedAdults > isLimitAdults) {
        setHeadcountError(`Number of attending adults cannot exceed your allocated limit of ${isLimitAdults}.`);
        setIsSaving(false);
        return;
      }
      if (confirmedChildren > isLimitChildren) {
        setHeadcountError(`Number of attending children cannot exceed your allocated limit of ${isLimitChildren}.`);
        setIsSaving(false);
        return;
      }
      if (confirmedAdults === 0 && confirmedChildren === 0) {
        setHeadcountError(`At least 1 guest must attend.`);
        setIsSaving(false);
        return;
      }

      // Convert values into the expected format based on what events are visible/allowed to them
      const selectedEvents: { [eventId: string]: 'Attending' | 'Declined' | 'Pending' } = {};
      const visibleIds = visibleItineraryEvents.map(e => e.id);

      itinerary.forEach(evt => {
        if (visibleIds.includes(evt.id)) {
          selectedEvents[evt.id] = rsvpValues[evt.id] || 'Declined';
        } else if (activeMatchingGuest) {
          selectedEvents[evt.id] = activeMatchingGuest.rsvp?.[evt.id] || 'Pending';
        } else {
          selectedEvents[evt.id] = 'Pending';
        }
      });

      // Write directly to Firestore using setDoc with { merge: true } targeting their specific guestId
      const guestIdToSubmit = activeMatchingGuest?.id || ('g_' + Math.random().toString(36).substring(2, 11));
      
      const isAttendingAny = Object.values(selectedEvents).some(v => v === 'Attending');
      const computedRsvpStatus = isAttendingAny ? 'Attending' : 'Declined';

      const submitData: any = {
        id: guestIdToSubmit,
        name: guestName.trim(),
        rsvp: selectedEvents,
        hasSubmitted: true,
        confirmedAdults: Number(confirmedAdults),
        confirmedChildren: Number(confirmedChildren),
        pollAnswer: pollAnswer.trim(),
        rsvpStatus: computedRsvpStatus,
        weddingId: currentWedding?.id || localStorage.getItem('current_wedding_id') || 'devansh_helly'
      };

      if (!activeMatchingGuest) {
        submitData.phone = 'Not provided';
        submitData.side = 'Bride';
        submitData.totalFamilyMembers = 1;
        submitData.invitedEvents = Object.keys(selectedEvents).filter(eId => selectedEvents[eId] === 'Attending');
      }

      await setDoc(doc(db, 'rsvps', guestIdToSubmit), submitData, { merge: true });

      // Save for session persistence upon page revisit
      const wId = currentWedding?.id || localStorage.getItem('current_wedding_id') || 'devansh_helly';
      localStorage.setItem(`last_submitted_guest_id_${wId}`, guestIdToSubmit);
      localStorage.setItem(`last_submitted_guest_name_${wId}`, guestName.trim());

      setSubmissionFeedback({
        guestName: guestName.trim(),
        isNew: !activeMatchingGuest
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting RSVP:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForm = () => {
    setNameError('');
    if (isLockedByLink && matchingGuest) {
      // Keep locked state, just reset submission screen for editing
      const initialVals: { [eventId: string]: 'Attending' | 'Declined' } = {};
      itinerary.forEach(e => {
        const currentRsvp = matchingGuest.rsvp?.[e.id] || 'Pending';
        initialVals[e.id] = currentRsvp === 'Attending' ? 'Attending' : 'Declined';
      });
      setRsvpValues(initialVals);
      setIsSubmitted(false);
      setSubmissionFeedback(null);
    } else {
      setGuestName('');
      setRsvpValues({});
      setMatchingGuest(null);
      setHasSearched(false);
      setIsSubmitted(false);
      setSubmissionFeedback(null);
    }
  };

  const handleUnlockAndReset = () => {
    // Clear URL parameters to unlock the secure personal link
    const url = new URL(window.location.href);
    url.searchParams.delete('guestId');
    url.searchParams.delete('g');
    window.history.pushState({}, '', url.toString());

    setIsLockedByLink(false);
    setGuestName('');
    setNameError('');
    setRsvpValues({});
    setMatchingGuest(null);
    setHasSearched(false);
    setIsSubmitted(false);
    setSubmissionFeedback(null);
  };

  // Sort timeline events chronologically by date and time
  const sortedItinerary = sortItineraryEvents(itinerary);

  // Filter itinerary dynamically based on invitation specifications (fallback to all events if none explicitly restricted)
  const visibleItineraryEvents = (matchingGuest && matchingGuest.invitedEvents && matchingGuest.invitedEvents.length > 0)
    ? sortedItinerary.filter(evt => matchingGuest.invitedEvents.includes(evt.id))
    : sortedItinerary;

  if (coupleName && isWeddingLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-stone-700">
        <Heart className="h-10 w-10 text-amber-500 fill-amber-500 animate-pulse mb-3" />
        <h3 className="font-serif text-lg font-semibold text-stone-900 tracking-wide animate-pulse">
          Opening Digital RSVP Portal...
        </h3>
        <p className="text-xs font-mono text-stone-400 mt-1">SaaS Wedding Management Network</p>
      </div>
    );
  }

  if (coupleName && (weddingError || !currentWedding)) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center text-stone-700 max-w-md mx-auto">
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-3xl mb-4">
          <p className="text-sm font-semibold">{weddingError || "Wedding Registry Not Found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div id="rsvp-page-container" className="min-h-screen bg-[#faf9f6] text-stone-800 pb-16 relative overflow-hidden font-sans">
      
      {/* Premium Top Navigation Bar */}
      <header className="border-b border-stone-200/40 backdrop-blur-md sticky top-0 bg-white/70 z-40 mb-6">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-4.5 w-4.5 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="font-serif font-black text-sm tracking-widest text-[#1a2f26] uppercase">
              Wedding Management by <span className="text-amber-600 font-sans font-bold">Tectell</span>
            </span>
          </div>
        </div>
      </header>

      {/* Decorative floral blurs */}
      <div className="absolute top-[80px] right-[-80px] w-52 h-52 rounded-full bg-amber-500/5 blur-3xl"></div>
      <div className="absolute bottom-[-80px] left-[-80px] w-52 h-52 rounded-full bg-emerald-600/5 blur-3xl"></div>



      <div className="max-w-xl mx-auto px-4 mt-8 space-y-8">
        
        {/* Beautiful Welcome Card Header */}
        <div className="text-center space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-amber-100/75 shadow-lg relative">
          <div className="px-3 py-1 inline-flex bg-amber-50 border border-amber-100 rounded-full text-amber-800 font-serif italic text-xs tracking-wider items-center gap-1.5 justify-center mb-1 animate-pulse mx-auto">
            <Sparkles className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span>You Are Invited!</span>
          </div>

          <div className="space-y-1">
            <h1 className="font-serif text-3xl font-bold tracking-wide text-[#1a2f26]">
              {couple.groom && couple.bride ? `${couple.groom} ♥ ${couple.bride}` : (currentWedding?.title || "Wedding Celebration")}
            </h1>
            <p className="font-serif italic text-base text-emerald-800 tracking-widest uppercase">Wedding RSVP Gateway</p>
          </div>

          <div className="h-[1px] w-32 bg-amber-200 mx-auto my-3"></div>

          <p className="text-xs text-stone-500 font-mono tracking-wider">
            {currentWedding?.resortName || "Royal Palace Resort, Udaipur"}
          </p>

          <p className="text-stone-600 text-xs leading-relaxed max-w-md mx-auto">
            "With great joy and anticipation, we invite you to share in our laughter, dance, and holy union. Kindly specify which wedding events you will join us for."
          </p>
        </div>

        {/* Dynamic Timeline Section */}
        <div className="bg-white rounded-2xl p-6 border border-[#ece9e2] shadow-md space-y-6">
          <h2 className="font-serif text-lg font-bold text-[#1a2f26] border-b border-stone-50 pb-3 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-amber-500 fill-amber-400" />
            <span>Wedding Celebration Itinerary</span>
          </h2>

          {sortedItinerary.length === 0 ? (
            <p className="text-stone-400 text-xs italic text-center py-6">Itinerary timeline is undergoing scheduling. Check back soon!</p>
          ) : (
            <div className="space-y-6 relative pl-3.5 border-l border-amber-200/60 ml-1">
              {sortedItinerary.map(evt => {
                const formattedDate = new Date(evt.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div key={evt.id} className="relative group">
                    {/* Ring dot */}
                    <div className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-[#faf9f6]"></div>
                    
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h4 className="font-semibold text-stone-800 text-xs uppercase tracking-wide">{evt.title}</h4>
                        <span className="text-[10px] text-amber-700 font-semibold font-mono">{formattedDate}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-stone-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{evt.time}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{evt.venue}</span>
                        </span>
                      </div>

                      <div className="text-[10px] bg-amber-50/40 text-amber-800 border border-amber-100/45 px-2 py-0.5 rounded-md inline-block">
                        Dress Code: <strong>{evt.dressCode}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom Welcome Message Prominent Display */}
        {currentWedding?.rsvpWelcomeMessage && (
          <div className="bg-amber-500/10 border-2 border-amber-500/20 text-[#1a2f26] p-5 rounded-2xl text-center font-serif text-sm font-semibold tracking-wide shadow-xs animate-pulse">
            ✨ {currentWedding.rsvpWelcomeMessage}
          </div>
        )}

        {/* Dynamic RSVP Form Card */}
        <div className="bg-white rounded-2xl border border-[#ece9e2] shadow-md overflow-hidden">
          
          <div className="bg-[#1a2f26] p-5 text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Heart className="h-5 w-5 text-amber-400 fill-amber-400" />
              <h3 className="font-serif font-bold text-sm tracking-wider uppercase">Submit Your RSVP Online</h3>
            </div>
          </div>

          {fetchingGuest ? (
            <div className="p-8 text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2f26] mx-auto"></div>
              <p className="text-xs text-stone-550 font-medium">Verifying your personal invitation details...</p>
            </div>
          ) : alreadySubmitted ? (
            /* Already Submitted Screen with Edit Option */
            <div className="p-8 text-center space-y-6 animate-fade-in">
              <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-800 border border-[#ece9e2] shadow-md animate-scale-in">
                <CheckCircle className="h-8 w-8 text-emerald-800" />
              </div>

              <div className="space-y-2">
                <h4 className="font-serif text-2xl font-bold text-[#1a2f26]">RSVP Already Lodged</h4>
                <p className="text-xs text-emerald-800 font-semibold">
                  Hi {guestName || 'there'}!
                </p>
                <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
                  Your wedding ceremony RSVP preferences have been registered. Thank you so much!
                </p>
              </div>

              <div className="h-[1px] w-24 bg-stone-100 mx-auto"></div>

              <div className="space-y-3 text-xs font-sans text-left max-w-sm mx-auto bg-stone-50 p-4 rounded-xl border border-stone-200/50">
                <h5 className="text-[10px] font-mono font-extrabold uppercase text-stone-400 tracking-wider">Your Registered Attendance:</h5>
                <div className="space-y-1.5">
                  {visibleItineraryEvents.length === 0 ? (
                    <p className="text-[11px] text-stone-400 italic">No events specified.</p>
                  ) : (
                    visibleItineraryEvents.map(evt => {
                      const isAttending = rsvpValues[evt.id] === 'Attending';
                      return (
                        <div key={evt.id} className="flex justify-between items-center text-xs">
                          <span className="text-stone-600 font-medium">{evt.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isAttending
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-stone-100 text-stone-500'
                          }`}>
                            {isAttending ? '✨ Attending' : 'Declined'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAlreadySubmitted(false);
                    setHasSearched(true);
                  }}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-xl transition shadow-sm cursor-pointer active:scale-95"
                >
                  Modify / Edit RSVP Choices
                </button>
                {!isLockedByLink && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Submit for Another Guest
                  </button>
                )}
              </div>
            </div>
          ) : isSubmitted ? (
            /* Submission Success Screen */
            <div className="p-8 text-center space-y-5 animate-fade-in">
              <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-800 border border-emerald-100 shadow-md">
                <Heart className="h-8 w-8 fill-emerald-800 text-emerald-800" />
              </div>

              <div className="space-y-2">
                <h4 className="font-serif text-2xl font-bold text-[#1a2f26]">Thank You, {submissionFeedback?.guestName}!</h4>
                <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
                  {submissionFeedback?.isNew
                    ? 'Your preferences have been logged and added to our wedding guest directory. We look forward to celebrating together!'
                    : `Your RSVP choices have been successfully synchronized. ${couple.groom} and ${couple.bride} have been notified of your updated choices!`}
                </p>
              </div>

              <div className="h-[1px] w-24 bg-stone-100 mx-auto"></div>

              <div className="space-y-2 text-xs font-mono">
                <div className="text-stone-400">Current Choices Lodged:</div>
                <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                  {visibleItineraryEvents.map(evt => {
                    const attending = rsvpValues[evt.id] === 'Attending';
                    return (
                      <span key={evt.id} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        attending
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                          : 'bg-stone-50 text-stone-450 border-stone-100 line-through'
                      }`}>
                        {evt.title}: {attending ? 'Attending' : 'Not Attending'}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                <button
                  onClick={handleResetForm}
                  className="px-5 py-2.5 bg-[#1a2f26] hover:bg-[#233d31] text-white font-semibold text-xs rounded-xl transition shadow-sm"
                >
                  Edit My RSVP Again
                </button>
              </div>
            </div>
          ) : (
            /* Submitting block step 1: Name verification / opt-in */
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
              
              <div className="space-y-4">
                {isLockedByLink ? (
                  <div className="bg-emerald-500/5 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                    <span className="p-2 bg-emerald-500/10 text-emerald rounded-full">
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-800" />
                    </span>
                    <div>
                      <h4 className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">🔒 SECURE PERSONAL RSVP CONNECTION</h4>
                      <p className="text-xs text-[#1a2f26] font-semibold mt-0.5">
                        Welcome, {guestName}!
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        Your personalized invitation details are loaded securely. Adjust your choices below.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Guest Name searcher */
                  <div className="relative">
                    <label htmlFor="rsvp-name" className="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1.5">
                      Your Full Name (As written on the invitation)
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="rsvp-name"
                        type="text"
                        className="block flex-1 rounded-xl border border-stone-200 px-3.5 py-2 text-sm focus:ring-1 focus:ring-emerald-800"
                        placeholder="e.g. Rajendra Prasad"
                        value={guestName}
                        onChange={(e) => {
                          setGuestName(e.target.value);
                          setHasSearched(false);
                          if (e.target.value.trim()) {
                            setNameError('');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleNameSearch}
                        className="px-4 py-2 bg-[#1a2f26] text-white hover:bg-[#233d31] rounded-xl text-xs font-bold shrink-0 shadow-sm flex items-center gap-1.5 active:scale-95 transition"
                      >
                        <Search className="h-3.5 w-3.5 text-stone-200" />
                        <span>Verify Name</span>
                      </button>
                    </div>
                    {nameError && (
                      <p className="text-red-500 text-[11px] font-semibold mt-1.5">{nameError}</p>
                    )}
                    <p className="text-[10px] text-stone-450 mt-2 leading-normal">
                      🔒 <strong className="font-semibold text-stone-600">Privacy Mode Active:</strong> Please enter your exact name as printed on your invitation card. Autocomplete dropdown suggestions have been completely disabled to prevent unauthorized list scraping.
                    </p>
                  </div>
                )}

                {/* Verification response panel feedback */}
                {hasSearched && (
                  <div className={`p-4 rounded-xl border flex items-start gap-2.5 animate-fade-in ${
                    matchingGuest
                      ? 'bg-emerald-500/5 border-emerald-100 text-emerald-900'
                      : 'bg-amber-500/5 border-amber-100 text-amber-900'
                  }`}>
                    {matchingGuest ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-emerald-800 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-[#1a2f26]">Found your reservation invitation!</p>
                          <p className="text-stone-550">We found you as active on the <strong>{matchingGuest.side}'s Side</strong>. Toggle attendance checkmarks below to lock your selection.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-amber-900">Name not found in pre-invitations</p>
                          <p className="text-stone-650 leading-relaxed">No worries! We will register your RSVP as a guest right away. Specify your event attendance below, and we will update our wedding guest directory!</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Family Headcount Allocation Banner */}
                {hasSearched && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 text-center text-[#1a2f26] space-y-1.5 animate-fade-in">
                    <span className="text-[9px] font-mono tracking-wider uppercase font-extrabold text-amber-800">
                      🎟️ YOUR FAMILY INVITATION ALLOCATION
                    </span>
                    <h4 className="font-serif text-sm font-bold text-stone-900">
                      Your Invitation: <strong className="font-bold text-emerald-850">{invitedAdults} {invitedAdults === 1 ? 'Adult' : 'Adults'}</strong> &amp; <strong className="font-bold text-emerald-850">{invitedChildren} {invitedChildren === 1 ? 'Child' : 'Children'}</strong>
                    </h4>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      Please enter the number of guests in your party who will be attending.
                    </p>
                  </div>
                )}

                {/* Confirmed Headcounts Selection */}
                {hasSearched && (
                  <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-[#1a2f26] uppercase tracking-wide">
                      Select Party Attendance counts:
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                          Attending Adults
                        </label>
                        <select
                          value={confirmedAdults}
                          onChange={(e) => setConfirmedAdults(Number(e.target.value))}
                          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-800 bg-white"
                        >
                          {Array.from({ length: invitedAdults + 1 }, (_, i) => (
                            <option key={i} value={i}>{i} {i === 1 ? 'Adult' : 'Adults'}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                          Attending Children
                        </label>
                        <select
                          value={confirmedChildren}
                          onChange={(e) => setConfirmedChildren(Number(e.target.value))}
                          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-800 bg-white"
                        >
                          {Array.from({ length: invitedChildren + 1 }, (_, i) => (
                            <option key={i} value={i}>{i} {i === 1 ? 'Child' : 'Children'}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {headcountError && (
                      <p className="text-[11px] text-red-600 font-bold bg-red-50 border border-red-100 p-2.5 rounded-xl text-center">
                        ✕ {headcountError}
                      </p>
                    )}
                  </div>
                )}

                {/* Event-Wise Checkboxes */}
                {hasSearched && (
                  <div className="space-y-4 pt-2">
                    <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">
                      Check ceremonies you are attending:
                    </label>

                    {visibleItineraryEvents.length === 0 ? (
                      <p className="text-xs text-stone-400 italic">No invited events match your invitation configuration.</p>
                    ) : (
                      <div className="divide-y divide-stone-100 border border-stone-150 rounded-xl overflow-hidden bg-white">
                        {visibleItineraryEvents.map(evt => {
                          const isAttending = rsvpValues[evt.id] === 'Attending';
                          return (
                            <button
                              key={evt.id}
                              type="button"
                              onClick={() => handleRsvpToggle(evt.id)}
                              className={`w-full text-left p-4 flex items-center justify-between gap-4 select-none hover:bg-stone-50 transition-colors ${
                                isAttending ? 'bg-emerald-500/5' : ''
                              }`}
                            >
                              <div className="space-y-1">
                                <span className={`text-xs font-semibold block ${isAttending ? 'text-emerald-900' : 'text-stone-700'}`}>
                                  {evt.title}
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono font-medium block">
                                  {evt.date} • {evt.time}
                                </span>
                              </div>

                              <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                                isAttending
                                  ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs'
                                  : 'border-stone-300 bg-white'
                              }`}>
                                {isAttending && <Heart className="h-3.5 w-3.5 text-white fill-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Poll/Question */}
                {hasSearched && currentWedding?.rsvpPollEnabled && (
                  <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl space-y-3 animate-fade-in">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                      ❓ {currentWedding.rsvpPollQuestion || "Custom Question"}
                    </label>
                    {currentWedding.rsvpPollType === 'choice' ? (
                      <select
                        value={pollAnswer}
                        onChange={(e) => setPollAnswer(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-emerald-800 bg-white font-sans font-medium text-stone-700"
                      >
                        <option value="">-- Please select an option --</option>
                        {(currentWedding.rsvpPollOptions || []).map((opt: string, i: number) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        value={pollAnswer}
                        onChange={(e) => setPollAnswer(e.target.value)}
                        rows={3}
                        placeholder="Type your response here..."
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-emerald-800 bg-white text-stone-750 font-medium"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Submit triggers */}
              {hasSearched && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving RSVP...' : 'Submit RSVP Response'}
                </button>
              )}
            </form>
          )}

        </div>

      </div>

      {/* Wedding Footer with TecTell Branding */}
      <footer className="mt-16 border-t border-stone-200/50 py-10 text-center text-stone-400 text-xs font-sans max-w-xl mx-auto px-4 space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs text-stone-500 font-sans">
          <span className="text-stone-400 text-[11px]">Designed and developed by</span>
          <a
            href="https://tectell.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-stone-700 hover:text-sky-600 transition-colors group"
            title="Visit TecTell (Ideas Made Digital)"
          >
            <TectellIcon size="xs" variant="color" className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
            <span className="font-sans font-black text-xs tracking-wider text-[#021128] group-hover:text-sky-600 transition-colors">
              TecTell
            </span>
          </a>
        </div>
        <p className="text-[10px] text-stone-400 font-sans">
          © {new Date().getFullYear()} TecTell. All rights reserved.
        </p>
      </footer>

    </div>
  );
}
