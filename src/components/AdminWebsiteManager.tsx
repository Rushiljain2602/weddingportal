import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ItineraryEvent, Guest, SaaSWedding } from '../types';
import { 
  Globe, 
  Save, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Check, 
  Loader2, 
  Heart,
  Calendar,
  Sparkles,
  MapPin,
  Lock,
  Unlock,
  Building,
  Hash,
  Share2,
  ExternalLink,
  Camera,
  UploadCloud,
  Download,
  Image as ImageIcon,
  Grid
} from 'lucide-react';

export default function AdminWebsiteManager() {
  const { 
    currentWeddingId, 
    currentWedding, 
    itinerary, 
    guests, 
    rooms,
    roomAssignments,
    dbStatus,
    updateGuest,
    updateSaaSWedding
  } = useApp();

  // Wedding-level states
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [resortName, setResortName] = useState('');
  const [livePhotoWallEnabled, setLivePhotoWallEnabled] = useState(false);
  const [heroIntroText, setHeroIntroText] = useState('');
  const [hostName1, setHostName1] = useState('');
  const [hostPhone1, setHostPhone1] = useState('');
  const [hostName2, setHostName2] = useState('');
  const [hostPhone2, setHostPhone2] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<'idle' | 'success' | 'error'>('idle');



  // Table search & filter state
  const [guestSearch, setGuestSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');

  // Copy link action state
  const [copiedLink, setCopiedLink] = useState(false);

  // Cover photo upload state & functions
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Live Photo Wall state and actions
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploadingWallPhoto, setUploadingWallPhoto] = useState(false);
  const [wallPhotoError, setWallPhotoError] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState<string | null>(null);
  const [placeholderAlertId, setPlaceholderAlertId] = useState<string | null>(null);

  const DEFAULT_GALLERY_PHOTOS = [
    { id: 'def1', url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600", guestName: "Devansh & Helly", uploadedAt: "2026-07-01T12:00:00Z" },
    { id: 'def2', url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600", guestName: "Bridal Team", uploadedAt: "2026-07-01T11:00:00Z" },
    { id: 'def3', url: "https://images.unsplash.com/photo-1519225495810-7517c5a2173d?auto=format&fit=crop&q=80&w=600", guestName: "Ceremony Crew", uploadedAt: "2026-07-01T10:00:00Z" }
  ];

  const displayPhotos = photos.length > 0 ? photos : DEFAULT_GALLERY_PHOTOS;

  useEffect(() => {
    if (!currentWeddingId) return;

    if (dbStatus === 'local') {
      // Local fallbacks
      setPhotos([
        { id: 'def1', url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600", guestName: "Devansh & Helly", uploadedAt: "2026-07-01T12:00:00Z" },
        { id: 'def2', url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600", guestName: "Bridal Team", uploadedAt: "2026-07-01T11:00:00Z" },
        { id: 'def3', url: "https://images.unsplash.com/photo-1519225495810-7517c5a2173d?auto=format&fit=crop&q=80&w=600", guestName: "Ceremony Crew", uploadedAt: "2026-07-01T10:00:00Z" }
      ]);
      return;
    }

    const photosRef = collection(db, 'weddings', currentWeddingId, 'photos');
    const unsubscribe = onSnapshot(photosRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => {
        const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return timeB - timeA;
      });
      setPhotos(list);
    }, (err) => {
      console.warn("Error subscribing to photos in settings:", err);
    });

    return () => unsubscribe();
  }, [currentWeddingId, dbStatus]);

  const uploadWallPhotoFiles = async (files: FileList | File[]) => {
    if (!currentWeddingId) return;
    const fileList = (Array.from(files) as File[]).filter(f => f.type.startsWith('image/'));
    
    if (fileList.length === 0) {
      setWallPhotoError('Please select valid image files.');
      return;
    }

    setUploadingWallPhoto(true);
    setWallPhotoError(null);

    try {
      await Promise.all(fileList.map(async (file) => {
        try {
          const compressedDataUrl = await compressImage(file);
          const nowIso = new Date().toISOString();

          // Save record in Firestore under weddings/{weddingId}/photos
          if (dbStatus !== 'local') {
            const photosRef = collection(db, 'weddings', currentWeddingId, 'photos');
            await addDoc(photosRef, {
              url: compressedDataUrl,
              uploadedAt: nowIso,
              guestName: 'Wedding Admin'
            });
          } else {
            setPhotos(prev => [
              {
                id: 'local_' + Math.random().toString(36).substring(2, 11),
                url: compressedDataUrl,
                uploadedAt: nowIso,
                guestName: 'Wedding Admin'
              },
              ...prev
            ]);
          }

          // Background server cache sync
          fetch('/api/photos/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl: compressedDataUrl,
              weddingId: currentWeddingId,
              guestName: 'Wedding Admin'
            })
          }).catch(() => {});
        } catch (err) {
          console.error("Error uploading single photo:", err);
        }
      }));
    } catch (err: any) {
      console.error("Photo wall upload failed:", err);
      setWallPhotoError('Upload failed. Please try again.');
    } finally {
      setUploadingWallPhoto(false);
    }
  };

  const handleDeleteWallPhoto = async (photoId: string) => {
    if (!currentWeddingId) return;

    try {
      if (dbStatus !== 'local' && !photoId.startsWith('local_')) {
        const photoDocRef = doc(db, 'weddings', currentWeddingId, 'photos', photoId);
        await deleteDoc(photoDocRef);
      } else {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      }
    } catch (err) {
      console.error("Error deleting photo from wall:", err);
      setWallPhotoError("Unable to delete photo. Please try again.");
    }
  };

  const handleDownloadAllPhotos = async () => {
    const listToDownload = displayPhotos;
    if (listToDownload.length === 0) return;
    setDownloadingAll(true);
    try {
      for (let i = 0; i < listToDownload.length; i++) {
        const photo = listToDownload[i];
        try {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `photo-wall-${i + 1}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
          // Tiny delay to prevent browser download restrictions
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.warn("Direct blob download failed, trying standard link download:", err);
          const a = document.createElement('a');
          a.href = photo.url;
          a.target = '_blank';
          a.download = `photo-wall-${i + 1}.jpg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    } catch (err) {
      console.error("Error downloading all photos:", err);
    } finally {
      setDownloadingAll(false);
    }
  };

  const uploadCoverPhotoFile = async (file: File) => {
    if (!currentWeddingId || !currentWedding) return;
    
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('File size is too large. Max 15MB is allowed.');
      return;
    }

    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      // 1. High-speed client-side image compression (<50ms)
      const compressedDataUrl = await compressImage(file);

      // 2. Immediate Firestore update - reflects instantly in the UI (<100ms)
      await updateSaaSWedding({
        ...currentWedding,
        heroImageUrl: compressedDataUrl
      });

      // 3. Background server photo cache backup (non-blocking)
      fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `hero_${currentWeddingId}`,
          dataUrl: compressedDataUrl,
          weddingId: currentWeddingId
        })
      }).catch(() => {});
    } catch (err: any) {
      console.error("Cover photo upload failed:", err);
      setPhotoError('Upload failed. Please check your image format and retry.');
    } finally {
      setUploadingPhoto(false);
    }
  };

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
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadCoverPhotoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadCoverPhotoFile(e.target.files[0]);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentWeddingId || !currentWedding) return;
    setUploadingPhoto(true);
    try {
      await updateSaaSWedding({
        ...currentWedding,
        heroImageUrl: ''
      });
    } catch (err) {
      console.error("Error removing photo:", err);
      setPhotoError('Unable to remove photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Initialize form fields once wedding metadata is loaded
  useEffect(() => {
    if (currentWedding) {
      setBrideName(currentWedding.brideName || '');
      setGroomName(currentWedding.groomName || '');
      setWeddingDate(currentWedding.weddingDate || '2026-12-18T16:00:50');
      setResortName(currentWedding.resortName || '');
      setLivePhotoWallEnabled(!!currentWedding.livePhotoWallEnabled);
      setHeroIntroText(currentWedding.heroIntroText || '');
      setHostName1(currentWedding.hostName1 || '');
      setHostPhone1(currentWedding.hostPhone1 || '');
      setHostName2(currentWedding.hostName2 || '');
      setHostPhone2(currentWedding.hostPhone2 || '');
    }
  }, [currentWedding]);

  // Handle saving general wedding portal configurations
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWeddingId || !currentWedding) return;
    setSavingSettings(true);
    setSettingsStatus('idle');

    try {
      await updateSaaSWedding({
        ...currentWedding,
        brideName: brideName.trim(),
        groomName: groomName.trim(),
        weddingDate: weddingDate,
        resortName: resortName.trim(),
        livePhotoWallEnabled: livePhotoWallEnabled,
        heroIntroText: heroIntroText.trim(),
        hostName1: hostName1.trim(),
        hostPhone1: hostPhone1.trim(),
        hostName2: hostName2.trim(),
        hostPhone2: hostPhone2.trim()
      });
      setSettingsStatus('success');
      setTimeout(() => setSettingsStatus('idle'), 3000);
    } catch (err) {
      console.error("Error saving portal settings:", err);
      setSettingsStatus('error');
    } finally {
      setSavingSettings(false);
    }
  };



  // Guest accommodation table inline inputs
  const handleUpdateGuestAccommodation = async (guest: Guest, field: 'hotelName' | 'roomNumber' | 'isRoomApproved', value: any) => {
    let finalValue = value;
    if (field === 'isRoomApproved') {
      finalValue = value === true;
      try {
        const guestDocRef = doc(db, 'rsvps', guest.id);
        await updateDoc(guestDocRef, {
          isRoomApproved: finalValue
        });
        console.log("Updated Firebase:", guest.id, finalValue);
      } catch (err) {
        console.error("Firebase update error for isRoomApproved:", err);
      }
    }
    const updatedGuest = {
      ...guest,
      [field]: finalValue
    };
    try {
      await updateGuest(updatedGuest);
    } catch (err) {
      console.error("Error updating guest accommodation approval:", err);
    }
  };

  // Copy portal link helper
  const handleCopyPortalLink = () => {
    const portalUrl = `${window.location.origin}/${currentWeddingId}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filters and sorts
  const filteredGuests = guests.filter(g => {
    const matchesSearch = 
      (g.name || '').toLowerCase().includes(guestSearch.toLowerCase()) ||
      (g.familyName || '').toLowerCase().includes(guestSearch.toLowerCase()) ||
      (g.phone || '').includes(guestSearch);
    
    if (approvalFilter === 'approved') {
      return matchesSearch && !!g.isRoomApproved;
    }
    if (approvalFilter === 'pending') {
      return matchesSearch && !g.isRoomApproved;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-8 antialiased font-sans">
      
      {/* Page Title & Floating Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-serif font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Globe className="h-6 w-6 text-emerald-800" />
            <span>Digital Concierge Website Builder</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Configure the guest-facing landing portal, coordinate itinerary agendas, and lock room lookup permissions.
          </p>
        </div>

        {/* Live URL Launcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyPortalLink}
            className="text-xs font-bold bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-xl px-4 py-2.5 transition flex items-center gap-2 shadow-2xs"
          >
            <Share2 className="h-4 w-4 text-emerald-800" />
            <span>{copiedLink ? "COPIED!" : "COPY PORTAL LINK"}</span>
          </button>
          <a
            href={`/${currentWeddingId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold bg-[#064E3B] hover:bg-[#043427] text-white rounded-xl px-4 py-2.5 transition flex items-center gap-2 shadow-sm"
          >
            <ExternalLink className="h-4 w-4 text-amber-300" />
            <span>PREVIEW SITE</span>
          </a>
        </div>
      </div>

      {/* Grid: Config forms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: PORTAL METADATA CONFIG */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-4 mb-6">
              <Heart className="h-5 w-5 text-amber-500 fill-amber-500" />
              <h3 className="font-serif text-base font-bold text-stone-900">Portal Banner Settings</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                    Bride First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={brideName}
                    onChange={(e) => setBrideName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs bg-stone-50/50 font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                    Groom First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={groomName}
                    onChange={(e) => setGroomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs bg-stone-50/50 font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                  Resort/Hotel Name (Location)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Udaipur Palace Resort, Rajasthan"
                  value={resortName}
                  onChange={(e) => setResortName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs bg-stone-50/50 font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                  Wedding Ceremony Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs bg-stone-50/50 font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                  Hero Intro Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. YOU ARE INVITED TO CELEBRATE"
                  value={heroIntroText}
                  onChange={(e) => setHeroIntroText(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs bg-stone-50/50 font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div className="pt-4 border-t border-stone-100">
                <h4 className="text-xs font-bold text-stone-850 mb-1.5">Host Contact Details</h4>
                <p className="text-[10px] text-stone-400 mb-3 leading-normal">
                  Provide names and phone numbers of the main hosts or wedding planners to let guests reach out.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-stone-400 font-bold mb-1">
                      Host Name 1
                    </label>
                    <input
                      type="text"
                      placeholder="Name & role"
                      value={hostName1}
                      onChange={(e) => setHostName1(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs bg-stone-50/50 font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-stone-400 font-bold mb-1">
                      Host Phone 1
                    </label>
                    <input
                      type="text"
                      placeholder="Phone number"
                      value={hostPhone1}
                      onChange={(e) => setHostPhone1(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs bg-stone-50/50 font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-stone-400 font-bold mb-1">
                      Host Name 2
                    </label>
                    <input
                      type="text"
                      placeholder="Name & role"
                      value={hostName2}
                      onChange={(e) => setHostName2(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs bg-stone-50/50 font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase tracking-wider text-stone-400 font-bold mb-1">
                      Host Phone 2
                    </label>
                    <input
                      type="text"
                      placeholder="Phone number"
                      value={hostPhone2}
                      onChange={(e) => setHostPhone2(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs bg-stone-50/50 font-medium text-stone-850 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>
                </div>
              </div>

              {/* PHOTO WALL TOGGLE */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-850">Enable Live Photo Wall</h4>
                  <p className="text-[10px] text-stone-400 mt-0.5 leading-normal">
                    Let guests scan a QR code to directly upload candid pictures to the reception database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLivePhotoWallEnabled(!livePhotoWallEnabled)}
                  className="p-1 cursor-pointer shrink-0"
                >
                  {livePhotoWallEnabled ? (
                    <ToggleRight className="h-9 w-9 text-[#064E3B]" />
                  ) : (
                    <ToggleLeft className="h-9 w-9 text-stone-300" />
                  )}
                </button>
              </div>

              {/* Submit triggers */}
              <div className="pt-4 flex items-center justify-between gap-4">
                <span className="text-[10px] font-mono text-stone-400 font-bold">
                  {dbStatus === 'local' ? "⚠️ OFFLINE SANDBOX SAVING" : "⚡ REAL-TIME CLOUD CONNECTED"}
                </span>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-[#064E3B] hover:bg-[#043427] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ml-auto"
                >
                  {savingSettings ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 text-amber-300" />
                  )}
                  <span>SAVE CHANGES</span>
                </button>
              </div>

              {settingsStatus === 'success' && (
                <p className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-center">
                  ✓ Website configuration synchronized successfully!
                </p>
              )}
              {settingsStatus === 'error' && (
                <p className="text-[10px] text-red-700 font-bold bg-red-50 border border-red-100 p-2.5 rounded-xl text-center">
                  ✕ Sync failed. Please verify firestore rules and schema.
                </p>
              )}
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: COVER PHOTO & PHOTO WALL */}
        <div className="lg:col-span-6 space-y-6">
          {/* COVER PHOTO CARD */}
          <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
              <Camera className="h-5 w-5 text-[#064E3B]" />
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900">Couple's Cover Photo</h3>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-normal">
                  Upload a high-resolution hero image of the couple to display at the top of the Guest Portal.
                </p>
              </div>
            </div>

            {currentWedding?.heroImageUrl ? (
              <div className="space-y-4">
                <div className="relative group rounded-2xl overflow-hidden border border-stone-200/80 max-h-48 flex items-center justify-center bg-stone-100 shadow-inner">
                  <img 
                    src={currentWedding.heroImageUrl || undefined} 
                    alt="Couple's Cover Portrait" 
                    className="w-full h-full object-cover max-h-48 transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-2 bg-white/90 hover:bg-white text-red-600 hover:text-red-700 rounded-xl font-bold text-xs transition shadow flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>REMOVE</span>
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs font-bold text-red-600 hover:text-red-700 transition flex items-center gap-1.5 justify-center mx-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove current photo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center min-h-[140px] relative ${
                    dragActive 
                      ? 'border-emerald-700 bg-emerald-50/20' 
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                  }`}
                >
                  <input 
                    type="file" 
                    id="hero-image-upload" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  
                  {uploadingPhoto ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-[#064E3B] animate-spin" />
                      <p className="text-[11px] font-medium text-stone-500">Processing and uploading image...</p>
                    </div>
                  ) : (
                    <label 
                      htmlFor="hero-image-upload" 
                      className="cursor-pointer flex flex-col items-center justify-center gap-2.5 w-full h-full"
                    >
                      <UploadCloud className="h-8 w-8 text-stone-400" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-stone-700">
                          Drag & drop image, or <span className="text-emerald-800 underline">browse</span>
                        </p>
                        <p className="text-[10px] text-stone-400 font-medium">
                          Supports PNG, JPG, or WEBP up to 5MB
                        </p>
                      </div>
                    </label>
                  )}
                </div>

                {photoError && (
                  <p className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-100 p-2.5 rounded-xl text-center">
                    ✕ {photoError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* WEBSITE PHOTO WALL MANAGER CARD */}
          <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-stone-100 pb-4">
              <div className="space-y-0.5">
                <h3 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                  <Grid className="h-5 w-5 text-[#064E3B]" />
                  <span>Website Photo Wall Manager</span>
                </h3>
                <p className="text-[10px] text-stone-400 leading-normal">
                  Add, delete, or download all candidate photos shared by guests on the landing photo wall in real-time.
                </p>
              </div>

              {/* Download All Trigger */}
              {displayPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadAllPhotos}
                  disabled={downloadingAll}
                  className="text-xs font-bold bg-[#064E3B] hover:bg-[#043427] disabled:opacity-50 text-white rounded-xl px-3.5 py-2 transition flex items-center gap-1.5 shadow-2xs shrink-0 self-start cursor-pointer"
                >
                  {downloadingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-amber-300" />
                  )}
                  <span>DOWNLOAD ALL ({displayPhotos.length})</span>
                </button>
              )}
            </div>

            {/* Quick direct upload for admin */}
            <div className="p-4 bg-stone-50 border border-stone-150 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-stone-850">Upload Photo directly</h4>
                <p className="text-[10px] text-stone-400">Add an image directly to the live wedding gallery wall.</p>
              </div>
              <div>
                <input
                  type="file"
                  id="admin-wall-photo-upload"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      await uploadWallPhotoFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="admin-wall-photo-upload"
                  className="cursor-pointer text-xs font-bold bg-white hover:bg-stone-50 border border-stone-250 rounded-xl px-4 py-2 transition inline-flex items-center gap-2 shadow-3xs hover:shadow-2xs"
                >
                  {uploadingWallPhoto ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#064E3B]" />
                  ) : (
                    <UploadCloud className="h-3.5 w-3.5 text-stone-500" />
                  )}
                  <span>{uploadingWallPhoto ? "Uploading..." : "Browse Photos"}</span>
                </label>
              </div>
            </div>

            {wallPhotoError && (
              <p className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-100 p-2.5 rounded-xl text-center">
                ✕ {wallPhotoError}
              </p>
            )}

            {/* Photos Grid */}
            {displayPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {displayPhotos.map((photo) => {
                  const isConfirming = confirmDeletePhotoId === photo.id;
                  const isAlerting = placeholderAlertId === photo.id;
                  const showOverlay = isConfirming || isAlerting;

                  return (
                    <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-stone-150 bg-stone-50 aspect-square flex items-center justify-center">
                      <img
                        src={photo.url || undefined}
                        alt={`Photo by ${photo.guestName || "Guest"}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Custom Dialog / Hover Layer */}
                      <div className={`absolute inset-0 bg-black/75 p-2.5 flex flex-col justify-between transition-opacity duration-200 ${showOverlay ? 'opacity-100 z-10' : 'opacity-0 group-hover:opacity-100'}`}>
                        {isConfirming ? (
                          <div className="h-full flex flex-col justify-between text-center py-2">
                            <p className="text-[11px] font-bold text-rose-300 leading-tight">
                              Delete this photo from the wall?
                            </p>
                            <div className="flex gap-2 justify-center mt-auto">
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleDeleteWallPhoto(photo.id);
                                  setConfirmDeletePhotoId(null);
                                }}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeletePhotoId(null)}
                                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-medium rounded-lg transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        ) : isAlerting ? (
                          <div className="h-full flex flex-col justify-between text-center py-2">
                            <p className="text-[10px] leading-snug font-medium text-amber-300 font-sans">
                              This is a placeholder photo. To change it, upload any real photo using the direct upload option above.
                            </p>
                            <button
                              type="button"
                              onClick={() => setPlaceholderAlertId(null)}
                              className="mt-auto py-1 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                            >
                              Got it
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-end gap-1.5">
                              {/* Download single photo */}
                              <a
                                href={photo.url}
                                download={`photo-wall-${photo.id}.jpg`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
                                title="View / Download Photo"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                              
                              {/* Delete photo */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (photo.id.startsWith('def')) {
                                    setPlaceholderAlertId(photo.id);
                                  } else {
                                    setConfirmDeletePhotoId(photo.id);
                                  }
                                }}
                                className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition cursor-pointer"
                                title="Delete Photo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="space-y-0.5">
                              <p className="text-[10px] font-extrabold text-white truncate">
                                By {photo.guestName || "Guest"}{photo.id.startsWith('def') && " (Default)"}
                              </p>
                              {photo.uploadedAt && (
                                <p className="text-[8px] font-mono text-stone-300">
                                  {new Date(photo.uploadedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 border-2 border-dashed border-stone-150 rounded-2xl text-center space-y-1.5 bg-stone-50/30">
                <ImageIcon className="h-7 w-7 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-400 font-semibold">No photo wall images yet</p>
                <p className="text-[10px] text-stone-400 max-w-[280px] mx-auto">
                  Photos uploaded by guests or by you will appear here in a real-time responsive grid.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* LOWER FULL WIDTH ROW: ACCOMMODATION APPROVAL TABLE */}
      <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-[#064E3B]" />
            <div>
              <h3 className="font-serif text-base font-bold text-stone-900">Accommodation Approvals Panel</h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Approve guest verification locks to allow room lookup queries in the digital concierge dashboard.
              </p>
            </div>
          </div>

          {/* Quick Filter toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search guests..."
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                className="pl-3 pr-8 py-1.5 border border-stone-200 rounded-xl text-xs focus:outline-none w-44 bg-stone-50/50"
              />
            </div>

            <div className="flex items-center gap-1 border border-stone-150 rounded-xl p-1 bg-stone-50/50">
              {(['all', 'approved', 'pending'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setApprovalFilter(f)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition ${approvalFilter === f ? 'bg-white text-stone-900 shadow-3xs' : 'text-stone-400 hover:text-stone-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Guest approving layout table */}
        <div className="overflow-x-auto rounded-2xl border border-stone-200/50">
          <table className="w-full text-left text-xs divide-y divide-stone-100">
            <thead className="bg-stone-50/80 font-mono text-[9px] text-stone-400 font-black uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Guest Registry</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Auto-Fetched Room Details</th>
                <th className="px-5 py-3 text-center">Web Portal Lock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white font-medium text-stone-700">
              {filteredGuests.length > 0 ? (
                filteredGuests.map(guest => {
                  const assignedRoomId = roomAssignments[guest.id] || guest.roomId;
                  const assignedRoom = rooms.find(r => r.id === assignedRoomId);
                  return (
                    <tr key={guest.id} className="hover:bg-stone-50/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-stone-850">{guest.name} {guest.familyName || ''}</span>
                          <span className="text-[10px] text-stone-400 font-mono mt-0.5">{guest.side} Side Invitation</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-stone-500 font-mono">{guest.phone}</td>
                      
                      {/* Auto-fetched Room Details */}
                      <td className="px-5 py-3.5">
                        {assignedRoom ? (
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 text-stone-800 font-semibold">
                              <Building className="h-3.5 w-3.5 text-emerald-800 shrink-0" />
                              <span>{assignedRoom.hotelName || "Main Resort"}</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-stone-500 text-[11px] font-mono">
                              <Hash className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                              <span>{assignedRoom.name}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-450 italic text-[11px] font-mono bg-stone-100/50 px-2.5 py-1 rounded-lg border border-stone-200/20">
                            Unassigned (No Room Allocated)
                          </span>
                        )}
                      </td>

                      {/* Toggle lock to view room on frontend */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={guest.isRoomApproved === true}
                              onChange={(e) => handleUpdateGuestAccommodation(guest, 'isRoomApproved', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            <span className="ml-2 text-[10px] font-bold text-stone-600 uppercase">
                              {guest.isRoomApproved ? 'Unlocked' : 'Locked'}
                            </span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-stone-400 font-medium">
                    No wedding guest registries found. Manage your invitations in the main guest tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
