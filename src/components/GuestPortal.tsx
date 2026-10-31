import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { SaaSWedding, ItineraryEvent, Guest, Room } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { TectellIcon } from './TectellLogo';
import { parseEventDateTime, sortItineraryEvents } from '../utils/formatters';
import { 
  Heart, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Search, 
  Lock, 
  Unlock, 
  Upload, 
  QrCode, 
  ArrowLeft,
  Check,
  Clock,
  Sparkles,
  PartyPopper,
  Building,
  Hash,
  Loader2,
  X,
  Maximize2,
  UploadCloud
} from 'lucide-react';

const getMaskedPhone = (phone: string) => {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (digits.length >= 6) {
    return `${digits.slice(0, 6)}****`;
  }
  return `${digits.padEnd(6, 'X')}****`;
};

export default function GuestPortal() {
  const { coupleName: routeCoupleName } = useParams<{ coupleName: string }>();
  const [searchParams] = useSearchParams();
  const queryCoupleName = searchParams.get('coupleName');
  const coupleName = routeCoupleName || queryCoupleName;
  const navigate = useNavigate();
  
  const [wedding, setWedding] = useState<SaaSWedding | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryEvent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Accommodation search state
  const [searchPhone, setSearchPhone] = useState('');
  const [searchFirstName, setSearchFirstName] = useState('');
  const [verificationInput, setVerificationInput] = useState('');
  const [foundGuests, setFoundGuests] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verifiedGuest, setVerifiedGuest] = useState<Guest | null>(null);
  const guestData = verifiedGuest;

  // Page Navigation tab state
  const [activeTab, setActiveTab] = useState<'itinerary' | 'stay' | 'gallery' | 'contact'>('itinerary');

  // Real database-driven photo wall & lightbox states
  const [uploadedPhotos, setUploadedPhotos] = useState<{ id: string; url: string; guestName?: string; uploadedAt?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default elegant photos fallback
  const DEFAULT_GALLERY_PHOTOS = [
    { id: 'def1', url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600", guestName: "Devansh & Helly", uploadedAt: "2026-07-01T12:00:00Z" },
    { id: 'def2', url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600", guestName: "Bridal Team", uploadedAt: "2026-07-01T11:00:00Z" },
    { id: 'def3', url: "https://images.unsplash.com/photo-1519225495810-7517c5a2173d?auto=format&fit=crop&q=80&w=600", guestName: "Ceremony Crew", uploadedAt: "2026-07-01T10:00:00Z" }
  ];

  // Theme-based class computation
  const getThemeColors = () => {
    if (!wedding) return { primary: 'bg-emerald-900', text: 'text-emerald-900', border: 'border-emerald-200/50', accent: 'text-amber-500', button: 'bg-emerald-800 hover:bg-emerald-900', badge: 'bg-emerald-50 text-emerald-800' };
    const theme = wedding.colorTheme || 'emerald';
    switch (theme) {
      case 'rose':
        return {
          primary: 'bg-pink-900',
          text: 'text-pink-900',
          border: 'border-pink-200/50',
          accent: 'text-amber-500',
          button: 'bg-pink-800 hover:bg-pink-900',
          badge: 'bg-pink-50 text-pink-800'
        };
      case 'indigo':
        return {
          primary: 'bg-indigo-900',
          text: 'text-indigo-900',
          border: 'border-indigo-200/50',
          accent: 'text-amber-500',
          button: 'bg-indigo-800 hover:bg-indigo-900',
          badge: 'bg-indigo-50 text-indigo-800'
        };
      case 'amber':
        return {
          primary: 'bg-amber-950',
          text: 'text-amber-950',
          border: 'border-amber-200/50',
          accent: 'text-amber-600',
          button: 'bg-amber-800 hover:bg-amber-900',
          badge: 'bg-amber-50 text-amber-800'
        };
      case 'burgundy':
        return {
          primary: 'bg-red-950',
          text: 'text-red-950',
          border: 'border-red-200/50',
          accent: 'text-amber-500',
          button: 'bg-red-900 hover:bg-red-950',
          badge: 'bg-red-50 text-red-900'
        };
      default:
        return {
          primary: 'bg-emerald-950',
          text: 'text-[#064E3B]',
          border: 'border-emerald-200/50',
          accent: 'text-amber-500',
          button: 'bg-[#064E3B] hover:bg-[#043427]',
          badge: 'bg-emerald-50 text-emerald-800'
        };
    }
  };

  const themeColors = getThemeColors();

  // Load wedding and itinerary data
  useEffect(() => {
    async function loadPortalData() {
      if (!coupleName) return;
      setLoading(true);
      setError(null);
      try {
        // Try exact match or dash/underscore normalization
        const slug = coupleName.trim().toLowerCase().replace(/-/g, '_');
        const weddingDocRef = doc(db, 'weddings', slug);
        const docSnap = await getDoc(weddingDocRef);
        
        let weddingData: SaaSWedding | null = null;
        if (docSnap.exists()) {
          weddingData = { id: docSnap.id, ...docSnap.data() } as SaaSWedding;
        } else {
          // Fallback check: search all weddings for id or owner match
          const weddingsQuery = query(collection(db, 'weddings'));
          const weddingsSnap = await getDocs(weddingsQuery);
          weddingsSnap.forEach(wDoc => {
            const data = wDoc.data();
            if (wDoc.id === coupleName || data.ownerName?.toLowerCase().includes(coupleName.toLowerCase())) {
              weddingData = { id: wDoc.id, ...data } as SaaSWedding;
            }
          });
        }

        if (!weddingData) {
          setError(`We couldn't find a digital concierge portal for "${coupleName}". Please confirm the spelling or link.`);
          setLoading(false);
          return;
        }

        setWedding(weddingData);

        // Session Restoration for Return Guests
        const wId = (weddingData as SaaSWedding).id;
        const savedGuestId = localStorage.getItem(`last_verified_guest_id_${wId}`);
        if (savedGuestId) {
          try {
            const guestDocRef = doc(db, 'rsvps', savedGuestId);
            const guestSnap = await getDoc(guestDocRef);
            if (guestSnap.exists()) {
              const guestData = guestSnap.data();
              setVerifiedGuest({
                id: guestSnap.id,
                ...guestData,
                isRoomApproved: guestData.isRoomApproved === true
              } as Guest);
            }
          } catch (e) {
            console.warn("Failed to auto-restore guest verification:", e);
          }
        }

        // Fetch itinerary events
        const itineraryRef = collection(db, 'weddings', (weddingData as SaaSWedding).id, 'itinerary');
        const itinerarySnap = await getDocs(itineraryRef);
        const itineraryList: ItineraryEvent[] = [];
        itinerarySnap.forEach(itemDoc => {
          itineraryList.push({ id: itemDoc.id, ...itemDoc.data() } as ItineraryEvent);
        });

        // Sort itinerary by date and time
        const sortedItineraryList = sortItineraryEvents(itineraryList);
        setItinerary(sortedItineraryList);

        // Fetch rooms for resolving assignments
        const roomsRef = collection(db, 'weddings', (weddingData as SaaSWedding).id, 'rooms');
        const unsubscribeRooms = onSnapshot(roomsRef, (roomsSnap) => {
          const roomsList: Room[] = [];
          roomsSnap.forEach(rDoc => {
            roomsList.push({ id: rDoc.id, ...rDoc.data() } as Room);
          });
          setRooms(roomsList);
        });
      } catch (err: any) {
        console.error("Error loading guest portal:", err);
        setError("Something went wrong while compiling the digital concierge page. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadPortalData();
  }, [coupleName]);

  // Real-time guest state synchronization (isRoomApproved and roomId sync)
  useEffect(() => {
    if (!verifiedGuest?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'rsvps', verifiedGuest.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setVerifiedGuest(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ...data,
            isRoomApproved: data.isRoomApproved === true,
            id: snapshot.id
          } as Guest;
        });
      }
    });

    return () => unsubscribe();
  }, [verifiedGuest?.id]);

  // Live countdown logic
  useEffect(() => {
    if (!wedding) return;
    // Determine target wedding date
    let targetDate = new Date('2026-12-18T16:00:00').getTime();
    if (wedding.weddingDate) {
      const parsedWedding = new Date(wedding.weddingDate);
      if (!isNaN(parsedWedding.getTime())) {
        targetDate = parsedWedding.getTime();
      }
    }

    if (itinerary && itinerary.length > 0) {
      const firstEvent = itinerary[0];
      const parsed = parseEventDateTime(firstEvent.date, firstEvent.time);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed.getTime();
      }
    }

    if (isNaN(targetDate)) {
      targetDate = new Date().getTime() + 864000000; // default 10 days out
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [wedding, itinerary]);

  // Search accommodations
  const handleAccommodationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSearchPhone = searchPhone.replace(/[^0-9]/g, '');
    const cleanFirstNameInput = searchFirstName.trim().toLowerCase();
    
    if (!cleanSearchPhone || !cleanFirstNameInput) return;
    
    setSearchExecuted(true);
    setVerificationError('');
    setSelectedGuest(null);
    setVerifiedGuest(null);
    setVerificationInput('');

    try {
      // Fetch guests for this specific wedding
      const rsvpsRef = collection(db, 'rsvps');
      const rsvpsQuery = query(rsvpsRef, where('weddingId', '==', wedding?.id));
      const rsvpsSnap = await getDocs(rsvpsQuery);
      
      const allGuests: Guest[] = [];
      rsvpsSnap.forEach(docSnap => {
        allGuests.push({ id: docSnap.id, ...docSnap.data() } as Guest);
      });

      const matched = allGuests.find(g => {
        const cleanDbPhone = (g.phone || '').replace(/[^0-9]/g, '');
        const dbFirstName = (g.name || '').trim().split(/\s+/)[0].toLowerCase();
        const dbFullName = (g.name || '').trim().toLowerCase();
        
        const isPhoneMatch = cleanDbPhone === cleanSearchPhone || 
          (cleanDbPhone.length > 0 && (cleanDbPhone.endsWith(cleanSearchPhone) || cleanSearchPhone.endsWith(cleanDbPhone)));
        const isNameMatch = dbFirstName === cleanFirstNameInput || dbFullName === cleanFirstNameInput;
        
        return isPhoneMatch && isNameMatch;
      });

      if (matched) {
        // FORCE REAL-TIME SYNC (onSnapshot) to verify/sync the guest
        const guestRef = doc(db, 'rsvps', matched.id);
        onSnapshot(guestRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setVerifiedGuest({
              id: snapshot.id,
              ...data,
              isRoomApproved: data.isRoomApproved === true
            } as Guest);

            // SAVE TO LOCAL STORAGE FOR FUTURE REVISITS
            const wId = wedding?.id || localStorage.getItem('current_wedding_id') || 'devansh_helly';
            localStorage.setItem(`last_verified_guest_id_${wId}`, snapshot.id);
          }
        });
      } else {
        setVerifiedGuest(null);
      }
    } catch (err) {
      console.error("Error searching guest list:", err);
      setError("Unable to search guest registries. Please check your internet connection.");
    }
  };

  // Name selection step: requires verification hint
  const handleSelectGuestForVerification = (guest: Guest) => {
    setSelectedGuest(guest);
    setVerificationInput('');
    setVerificationError('');
  };

  const handleVerifyIdentity = () => {
    if (!selectedGuest) return;
    const cleanInput = verificationInput.trim();
    const phone = selectedGuest.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const last4 = cleanPhone.slice(-4);

    if (cleanInput === last4) {
      // FORCE REAL-TIME SYNC (onSnapshot) to verify/sync the guest
      const guestRef = doc(db, 'rsvps', selectedGuest.id);
      onSnapshot(guestRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setVerifiedGuest({
            id: snapshot.id,
            ...data,
            isRoomApproved: data.isRoomApproved === true
          } as Guest);

          // SAVE TO LOCAL STORAGE FOR FUTURE REVISITS
          const wId = wedding?.id || localStorage.getItem('current_wedding_id') || 'devansh_helly';
          localStorage.setItem(`last_verified_guest_id_${wId}`, snapshot.id);
        }
      });
      setVerificationError('');
    } else {
      setVerificationError('Incorrect. Please double check the last 4 digits of your registered phone.');
    }
  };

  // Real-time photo subscription
  useEffect(() => {
    if (!wedding?.id) return;
    const photosRef = collection(db, 'weddings', wedding.id, 'photos');
    const unsubscribe = onSnapshot(photosRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort client-side by uploadedAt descending
      list.sort((a, b) => {
        const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return timeB - timeA;
      });
      setUploadedPhotos(list);
    }, (error) => {
      console.error("Error subscribing to live photos:", error);
    });
    return () => unsubscribe();
  }, [wedding?.id]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // 3 second safety timeout to prevent hanging on corrupted images
      const timer = setTimeout(() => reject(new Error("Image compression timeout")), 3000);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          clearTimeout(timer);
          const canvas = document.createElement('canvas');
          const MAX_DIM = 960;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
          resolve(dataUrl);
        };
        img.onerror = (err) => {
          clearTimeout(timer);
          reject(err);
        };
      };
      reader.onerror = (err) => {
        clearTimeout(timer);
        reject(err);
      };
    });
  };

  const handleRealPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !wedding?.id) return;
    const fileList = (Array.from(e.target.files) as File[]).filter(f => f.type.startsWith('image/'));

    if (fileList.length === 0) {
      setGalleryError('Please select valid image files.');
      return;
    }

    setUploading(true);
    setGalleryError(null);

    try {
      const guestAuthor = (verifiedGuest?.name || 'Guest').trim();
      const totalCount = fileList.length;
      let completedCount = 0;
      setUploadProgress(totalCount > 1 ? `Uploading 0 of ${totalCount}...` : 'Processing & saving photo...');

      await Promise.all(fileList.map(async (file) => {
        try {
          // 1. Ultra-fast client-side compression (<40ms)
          const compressedDataUrl = await compressImage(file);

          // 2. Optimistic UI update so guest sees photo on screen instantly (<10ms)
          const tempId = 'temp_' + Math.random().toString(36).substring(2, 9);
          const nowIso = new Date().toISOString();
          setUploadedPhotos(prev => [{
            id: tempId,
            url: compressedDataUrl,
            guestName: guestAuthor,
            uploadedAt: nowIso
          }, ...prev]);

          // 3. Direct write to Firestore weddings/{weddingId}/photos subcollection (<100ms)
          const photosRef = collection(db, 'weddings', wedding.id, 'photos');
          await addDoc(photosRef, {
            url: compressedDataUrl,
            uploadedAt: nowIso,
            guestName: guestAuthor
          });

          completedCount++;
          if (totalCount > 1) {
            setUploadProgress(`Uploaded ${completedCount} of ${totalCount}...`);
          }

          // 4. Background server cache sync (non-blocking)
          fetch('/api/photos/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl: compressedDataUrl,
              weddingId: wedding.id,
              guestName: guestAuthor
            })
          }).catch(() => {});
        } catch (err) {
          console.error("Error uploading individual file:", err);
        }
      }));
    } catch (err: any) {
      console.error("Failed to add photo to Firestore:", err);
      setGalleryError('Upload failed. Check your connection or retry.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-stone-700">
        <Heart className="h-10 w-10 text-amber-500 fill-amber-500 animate-pulse mb-3" />
        <h3 className="font-serif text-lg font-semibold text-stone-900 tracking-wide animate-pulse">
          Opening Digital Concierge Suite...
        </h3>
        <p className="text-xs font-mono text-stone-400 mt-1">SaaS Wedding Management Network</p>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center text-stone-700 max-w-md mx-auto">
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-3xl mb-4">
          <p className="text-sm font-semibold">{error || "Wedding Registry Not Found"}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-semibold transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tectell SaaS Hub</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50/20 text-stone-800 antialiased font-sans pb-16">
      
      {/* Dynamic Colored Premium Floating Header bar */}
      <header className={`${themeColors.primary} text-white py-4 px-6 sticky top-0 z-30 shadow-md backdrop-blur-md bg-opacity-95`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span className="font-serif font-bold tracking-wide text-sm">{wedding.title} Concierge</span>
          </div>
          <span className="px-2.5 py-1 rounded bg-white/15 text-[10px] font-mono tracking-widest text-amber-300 border border-white/10 uppercase">
            {wedding.resortName || "Palace Resort"}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-12">
        
        {/* HERO BANNER SECTION WITH COUNTDOWN TIMER */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gold/15 rounded-[2.5rem] overflow-hidden shadow-xl relative min-h-[400px] flex items-center justify-center bg-cover bg-center"
          style={wedding.heroImageUrl ? { backgroundImage: `url(${wedding.heroImageUrl})` } : undefined}
        >
          {wedding.heroImageUrl ? (
            /* High-end Dark Background Overlay */
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/20 z-0"></div>
          ) : (
            /* Elegant default stone-colored gradient placeholder */
            <div className="absolute inset-0 bg-gradient-to-tr from-stone-100 via-amber-50/30 to-stone-200 z-0"></div>
          )}

          <div className="p-8 md:p-12 text-center relative z-10 flex flex-col items-center justify-center w-full">
            {/* Elegant luxury graphic design details */}
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300"></div>
            
            <Heart className={`h-10 w-10 ${wedding.heroImageUrl ? 'text-amber-400 fill-amber-400/20 animate-pulse' : 'text-amber-500 fill-amber-500/20 animate-bounce'} mb-4`} />
            
             <p className={`text-xs uppercase tracking-[0.25em] ${wedding.heroImageUrl ? 'text-amber-300 font-bold' : 'text-amber-600 font-semibold'} font-mono`}>
              {wedding.heroIntroText || "YOU ARE INVITED TO CELEBRATE"}
            </p>
            
            <h1 className={`font-serif text-3xl md:text-5xl font-black ${wedding.heroImageUrl ? 'text-white' : themeColors.text} tracking-tight mt-3 mb-4 drop-shadow-sm`}>
              {wedding.groomName || "Groom"} <span className={`font-serif font-light ${wedding.heroImageUrl ? 'text-stone-300' : 'text-stone-400'} italic`}>and</span> {wedding.brideName || "Bride"}
            </h1>

            <p className={`text-sm font-semibold flex items-center gap-2 max-w-md ${wedding.heroImageUrl ? 'bg-white/10 backdrop-blur-xs border border-white/15 text-white' : 'bg-stone-50 border border-stone-100 text-stone-500'} rounded-full px-5 py-2 mt-2 shadow-xs`}>
              <Calendar className="h-4 w-4 text-amber-500" />
              <span>
                {(() => {
                  let targetDate = new Date('2026-12-18T16:00:00');
                  if (wedding.weddingDate) {
                    const parsedWedding = new Date(wedding.weddingDate);
                    if (!isNaN(parsedWedding.getTime())) {
                      targetDate = parsedWedding;
                    }
                  }
                  if (itinerary && itinerary.length > 0) {
                    const firstEvent = itinerary[0];
                    const parsed = parseEventDateTime(firstEvent.date, firstEvent.time);
                    if (!isNaN(parsed.getTime())) {
                      targetDate = parsed;
                    }
                  }
                  if (isNaN(targetDate.getTime())) {
                    return "Date to be announced";
                  }
                  return targetDate.toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  });
                })()}
              </span>
            </p>

            {/* Countdown Sub-segment */}
            <div className={`mt-8 border-t ${wedding.heroImageUrl ? 'border-white/15' : 'border-stone-100'} pt-8 w-full max-w-xl`}>
              <h4 className={`text-[10px] uppercase tracking-[0.2em] font-mono ${wedding.heroImageUrl ? 'text-stone-300' : 'text-stone-400'} font-black mb-4`}>
                CEREMONY INCEPTION COUNTDOWN
              </h4>
              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                {[
                  { value: timeLeft.days, label: 'DAYS' },
                  { value: timeLeft.hours, label: 'HOURS' },
                  { value: timeLeft.minutes, label: 'MINS' },
                  { value: timeLeft.seconds, label: 'SECS' }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`${wedding.heroImageUrl ? 'bg-black/30 backdrop-blur-md border border-white/10 text-white' : 'bg-amber-50/50 border border-amber-200/40 text-stone-800'} rounded-2xl py-3 px-2 flex flex-col items-center shadow-xs`}
                  >
                    <span className={`font-mono text-2xl sm:text-4xl font-extrabold ${wedding.heroImageUrl ? 'text-amber-300' : themeColors.text}`}>
                      {String(item.value).padStart(2, '0')}
                    </span>
                    <span className={`text-[9px] font-mono ${wedding.heroImageUrl ? 'text-stone-300' : 'text-stone-500'} mt-1 font-bold tracking-wider`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* PREMIUM PORTAL TAB NAVIGATION */}
        <div className="flex items-center justify-center border-b border-stone-200/60 pb-4 mt-6">
          <div className="flex space-x-1.5 bg-stone-100/80 backdrop-blur-xs p-1 rounded-2xl w-full max-w-lg shadow-inner">
            {[
              { id: 'itinerary', label: 'Celebration Timeline', icon: Calendar },
              { id: 'stay', label: 'Resort Stay & Rooms', icon: Building },
              { id: 'gallery', label: 'Photo Wall & Gallery', icon: Sparkles },
              { id: 'contact', label: 'Contact Hosts', icon: Phone }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? `${themeColors.primary} text-white shadow-md transform scale-[1.02]`
                      : 'text-stone-500 hover:text-stone-850 hover:bg-stone-50'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="inline sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DYNAMIC TAB CONTROLLER */}
        <AnimatePresence mode="wait">
          {activeTab === 'itinerary' && (
            <motion.div
              key="itinerary-page"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Timeline Section */}
              <section className="space-y-6">
                <div className="text-center md:text-left">
                  <h2 className={`font-serif text-2xl sm:text-3xl font-extrabold ${themeColors.text} tracking-tight`}>
                    The Celebration Timeline
                  </h2>
                  <p className="text-xs text-stone-500 mt-1 font-sans">
                    All official functions, timelines, and venues. Access precise GPS guides instantly.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {itinerary.length > 0 ? (
                    itinerary.map((event, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={event.id}
                        className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition relative"
                      >
                        <div className="absolute top-6 right-6 p-2 bg-amber-50 rounded-full">
                          <Clock className="h-4 w-4 text-amber-600" />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono uppercase font-black px-2.5 py-1 rounded-full ${themeColors.badge}`}>
                              EVENT {idx + 1}
                            </span>
                            <span className="text-xs text-stone-500 font-mono font-medium">
                              {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <h3 className="font-serif text-lg font-extrabold text-stone-900 leading-tight">
                            {event.title}
                          </h3>

                          <div className="space-y-1.5 text-xs text-stone-600">
                            <p className="flex items-center gap-1.5 font-medium">
                              <Clock className="h-3.5 w-3.5 text-stone-400" />
                              <span>{event.time || "TBA"}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-stone-400" />
                              <span className="truncate">{event.venue || "To Be Announced"}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-stone-400" />
                              <span>Dress Code: <strong className="text-stone-750 font-semibold">{event.dressCode || "Cocktail attire"}</strong></span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-end">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue || wedding.resortName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs font-bold tracking-wider uppercase border border-stone-200 rounded-xl px-4 py-2 hover:bg-stone-50 flex items-center gap-1.5 transition-all text-stone-700`}
                          >
                            <MapPin className="h-3 w-3 text-amber-500" />
                            <span>NAVIGATE</span>
                          </a>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full bg-white border border-dashed border-stone-200 rounded-3xl p-8 text-center text-stone-500">
                      <Calendar className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                      <p className="text-xs font-medium">The planner has not customized the itinerary agenda yet.</p>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'stay' && (
            <motion.div
              key="stay-page"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Accommodation tracker section */}
              <section className="bg-white border border-stone-200/80 rounded-[2.5rem] p-6 md:p-10 shadow-lg relative overflow-hidden space-y-8">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Building className="h-24 w-24 text-stone-900" />
                </div>

                {/* 2. ACCOMMODATION LOOKUP BOX */}
                <div className="space-y-4">
                  <div className="max-w-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
                        <Building className="h-4.5 w-4.5" />
                      </span>
                      <h3 className="font-serif text-md font-bold text-stone-900 tracking-tight">
                        Resort Stay & Room Allocation Lookup
                      </h3>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed pl-10">
                      Look up your assigned resort suites and check-in details by searching below with your first name and registered mobile number.
                    </p>
                  </div>

                  <form onSubmit={handleAccommodationSearch} className="space-y-3 max-w-lg pl-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-stone-400" />
                      </span>
                      <input
                        type="tel"
                        required
                        placeholder="Mobile (numeric only)"
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full pl-10 pr-4 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 bg-stone-50/50 font-medium"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-stone-400" />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="First Name"
                        value={searchFirstName}
                        onChange={(e) => setSearchFirstName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 bg-stone-50/50 font-medium"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className={`w-full py-3 text-xs font-bold uppercase tracking-wider text-white rounded-xl ${themeColors.button} transition flex items-center justify-center gap-1.5`}
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>VERIFY ACCESS</span>
                  </button>
                </form>

                {/* Results Block */}
                <div className="mt-6">
                  <AnimatePresence mode="wait">
                    {/* Phone search direct matched results */}
                    {guestData && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-6 bg-stone-50/80 border border-stone-200/60 rounded-3xl"
                      >
                        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                          <div>
                            <span className="text-[10px] font-mono tracking-widest uppercase font-black text-emerald-855">
                              IDENTITY CONFIRMED
                            </span>
                            <h4 className="font-serif text-lg font-bold text-stone-900 mt-1">
                              Welcome, {guestData.name} {guestData.familyName || ''}
                            </h4>
                          </div>
                          <span className="p-2.5 bg-emerald-100 text-emerald-855 rounded-full">
                            <Unlock className="h-5 w-5" />
                          </span>
                        </div>

                        <div className="pt-4 space-y-4">
                          {(() => {
                            if (guestData.isRoomApproved === true) {
                              const assignedRoom = rooms.find(r => r.id === guestData.roomId);
                              const hotelText = assignedRoom?.hotelName || guestData.hotelName || wedding.resortName || "The Grand Palace Resort";
                              const roomText = assignedRoom?.name || guestData.roomNumber || "Suite 104";
                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="bg-white border border-stone-200/40 p-4 rounded-2xl flex items-start gap-3">
                                    <Building className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-[9px] font-mono text-stone-400 uppercase tracking-widest font-black">
                                        Assigned Resort / Hotel
                                      </p>
                                      <p className="text-sm font-extrabold text-stone-850 mt-1">
                                        {hotelText}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="bg-white border border-stone-200/40 p-4 rounded-2xl flex items-start gap-3">
                                    <Hash className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-[9px] font-mono text-stone-400 uppercase tracking-widest font-black">
                                        Room / Suite Number
                                      </p>
                                      <p className="text-sm font-extrabold text-stone-850 mt-1 font-mono">
                                        {roomText}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="p-4 bg-amber-50 text-amber-850 border border-amber-200/50 rounded-2xl flex items-center gap-3">
                                  <Lock className="h-5 w-5 text-amber-600 shrink-0" />
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wider">Verification Pending</p>
                                    <p className="text-[10px] text-amber-700/90 mt-0.5">Your room assignment has not been finalized or unlocked by the coordinator yet. Please check back shortly.</p>
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </motion.div>
                    )}

                    {/* No match indicator */}
                    {searchExecuted && !verifiedGuest && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-5 bg-stone-50 border border-stone-200 rounded-2xl flex items-center gap-3 text-stone-500"
                      >
                        <Lock className="h-4 w-4 shrink-0 text-stone-400" />
                        <p className="text-xs font-medium">No booking found with these details.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </motion.div>
          )}

          {activeTab === 'gallery' && (
            <motion.div
              key="gallery-page"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* REAL LIVE PHOTO GALLERY */}
              <section className="bg-white border border-stone-200/60 rounded-[2.5rem] p-6 md:p-10 shadow-lg space-y-8">
                
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`font-serif text-2xl sm:text-3xl font-extrabold ${themeColors.text} tracking-tight`}>
                        Live Digital Photo Wall
                      </h2>
                      {wedding.livePhotoWallEnabled ? (
                        <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 font-mono uppercase font-black tracking-widest animate-pulse">
                          Live Broadcast
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] bg-amber-50 border border-amber-100 text-amber-700 font-mono uppercase font-semibold">
                          Memories Album
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                      Broadcast candid snaps to the ballroom screen or save them in the couple's permanent wedding memories gallery.
                    </p>
                  </div>

                  {/* REAL FILE SELECTOR TRIGGER */}
                  <div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleRealPhotoUpload} 
                      accept="image/*" 
                      multiple
                      className="hidden" 
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className={`px-5 py-3 rounded-xl text-xs font-bold text-white uppercase tracking-wider ${themeColors.button} transition flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer`}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{uploadProgress || "Uploading..."}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Upload Candid Photos</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {galleryError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl text-center">
                    ✕ {galleryError}
                  </div>
                )}

                {/* VISIBLE PHOTO GRID */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] font-mono text-stone-400 font-black mb-4">
                    VISUAL CHRONOLOGY ({uploadedPhotos.length > 0 ? uploadedPhotos.length : DEFAULT_GALLERY_PHOTOS.length} PHOTOS)
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {(uploadedPhotos.length > 0 ? uploadedPhotos : DEFAULT_GALLERY_PHOTOS).map((photo, idx) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        key={photo.id || idx}
                        onClick={() => setSelectedPhotoUrl(photo.url)}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/60 shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer"
                      >
                        <img 
                          src={photo.url || undefined} 
                          alt="Wedding snapshot" 
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                          <p className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider">
                            By {photo.guestName || "Guest"}
                          </p>
                          {photo.uploadedAt && (
                            <p className="text-[8px] text-stone-300 mt-0.5">
                              {new Date(photo.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          <div className="absolute top-3 right-3 p-1.5 bg-white/20 rounded-lg text-white backdrop-blur-xs">
                            <Maximize2 className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

              </section>
            </motion.div>
          )}

          {activeTab === 'contact' && (
            <motion.div
              key="contact-page"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <section className="bg-white border border-stone-200/60 rounded-[2.5rem] p-6 md:p-10 shadow-lg space-y-6">
                <div className="max-w-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-50 rounded-xl text-amber-600">
                      <Phone className="h-5 w-5" />
                    </span>
                    <h2 className={`font-serif text-2xl sm:text-3xl font-extrabold ${themeColors.text} tracking-tight`}>
                      Contact Wedding Hosts
                    </h2>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    If you have any questions regarding room allocations, transport timings, or other logistics, please feel free to reach out directly to the wedding crew or hosts.
                  </p>
                </div>

                <div className="space-y-4 max-w-xl">
                  {(() => {
                    const contactsList = [];
                    if (wedding.hostName1 || wedding.hostPhone1) {
                      contactsList.push({
                        name: wedding.hostName1,
                        role: "Event Hospitality Coordinator",
                        phone: wedding.hostPhone1
                      });
                    } else {
                      contactsList.push({
                        name: "Kunal Sen (Planner)",
                        role: "Event Hospitality Coordinator",
                        phone: "+91 98765 43211"
                      });
                    }

                    if (wedding.hostName2 || wedding.hostPhone2) {
                      contactsList.push({
                        name: wedding.hostName2,
                        role: "Airport Shuttle Logistics",
                        phone: wedding.hostPhone2
                      });
                    } else {
                      contactsList.push({
                        name: "Amit Vyas (Transport Hub)",
                        role: "Airport Shuttle Logistics",
                        phone: "+91 98765 43212"
                      });
                    }

                    return contactsList.map((contact, idx) => (
                      <div key={idx} className="p-4 bg-stone-50/50 border border-stone-100 rounded-2xl flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-bold text-stone-900">{contact.name}</h5>
                          <p className="text-[10px] text-stone-400 font-mono uppercase tracking-wider mt-0.5">{contact.role}</p>
                          <p className="text-xs text-stone-600 font-mono mt-1">{contact.phone}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                            className="p-2.5 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-700 transition"
                            title="Call"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 text-emerald-800 transition font-mono text-[10px] font-bold"
                          >
                            CHAT
                          </a>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* GUEST PORTAL FOOTER */}
      <footer className="mt-16 border-t border-stone-200/60 pt-10 pb-6 px-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-xs font-serif text-stone-500">
            <Heart className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
            <span className="font-bold text-stone-700">{wedding.title}</span>
            <span className="text-stone-300">•</span>
            <span className="font-sans text-[11px] text-stone-400 font-medium">Guest Concierge Suite</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-stone-500 font-sans">
            <span className="text-stone-400 text-[11px]">Designed and developed by</span>
            <a
              href="https://tectell.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-stone-800 hover:text-sky-600 transition-colors group"
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
        </div>
      </footer>

      {/* GORGEOUS LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedPhotoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedPhotoUrl(null)}
          >
            <button
              onClick={() => setSelectedPhotoUrl(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer z-50"
            >
              <X className="h-6 w-6" />
            </button>
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhotoUrl || undefined}
                alt="Enlarged gallery photo"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
