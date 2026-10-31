/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ItineraryEvent, Guest, Room, TransportRecord, Task, Expense, AdminUser, SaaSWedding } from '../types';
import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import {
  INITIAL_ITINERARY,
  INITIAL_GUESTS,
  INITIAL_ROOMS,
  INITIAL_ROOM_ASSIGNMENTS,
  INITIAL_TRANSPORT,
  INITIAL_TASKS,
  INITIAL_BUDGET,
  INITIAL_EXPENSES
} from '../data/mockData';
import { sortItineraryEvents } from '../utils/formatters';

export type DBStatus = 'connecting' | 'connected' | 'local';

interface AppContextType {
  // Config state
  itinerary: ItineraryEvent[];
  guests: Guest[];
  rooms: Room[];
  roomAssignments: { [guestId: string]: string }; // guestId -> roomId
  transport: TransportRecord[];
  tasks: Task[];
  expenses: Expense[];
  totalBudget: number;
  weddingTitle: string;
  brideName: string;
  groomName: string;
  dbStatus: DBStatus;
  dbError: string | null;
  admins: AdminUser[];

  // SaaS Multitenancy State
  currentWeddingId: string | null;
  currentWedding: SaaSWedding | null;
  allWeddings: SaaSWedding[];
  superAdminMode: boolean;
  isLoadingWedding: boolean;

  // SaaS commands
  selectWeddingId: (weddingId: string | null) => void;
  createSaaSWedding: (wedding: Omit<SaaSWedding, 'createdAt'>, seedDemoData?: boolean) => Promise<boolean>;
  updateSaaSWedding: (wedding: SaaSWedding) => Promise<boolean>;
  deleteSaaSWedding: (weddingId: string) => Promise<boolean>;
  setSuperAdminMode: (active: boolean) => void;

  // Mutator Actions (Tenant-aware under the hood)
  setWeddingTitle: (title: string) => void;
  setBrideAndGroomNames: (brideStr: string, groomStr: string) => Promise<void>;
  addAdmin: (admin: Omit<AdminUser, 'id'>) => void;
  updateAdmin: (admin: AdminUser) => void;
  deleteAdmin: (id: string) => void;

  addItineraryEvent: (event: Omit<ItineraryEvent, 'id'>) => void;
  updateItineraryEvent: (event: ItineraryEvent) => void;
  deleteItineraryEvent: (id: string) => void;
  syncAllEventsToGuests: () => Promise<void>;

  addGuest: (guest: Omit<Guest, 'id' | 'rsvp'>) => void;
  updateGuest: (guest: Guest) => void;
  deleteGuest: (id: string) => void;
  splitGuest: (
    id: string,
    part1Name: string,
    part1Adults: number,
    part1Children: number,
    part2Name: string,
    part2Adults: number,
    part2Children: number
  ) => Promise<void>;

  addRoom: (room: Omit<Room, 'id'>) => void;
  bulkAddRooms: (roomsToCreate: Omit<Room, 'id'>[]) => Promise<void>;
  updateRoom: (room: Room) => void;
  deleteRoom: (id: string) => void;
  assignRoomToGuest: (guestId: string, roomId: string | null, isManualOverride?: boolean) => void;
  bulkAssignRooms: (assignments: { [guestId: string]: string | null }) => Promise<void>;

  addTransport: (record: Omit<TransportRecord, 'id'>) => void;
  updateTransport: (record: TransportRecord) => void;
  deleteTransport: (id: string) => void;

  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;

  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  setTotalBudget: (amount: number) => void;

  submitGuestRSVP: (
    guestName: string,
    selectedEvents: { [eventId: string]: 'Attending' | 'Declined' | 'Pending' },
    guestId?: string
  ) => Promise<{ success: boolean; guestName: string; isNew: boolean }>;
  allowChildSharing: boolean;
  setAllowChildSharing: (val: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getLocalOrDefault = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn(`Error reading localStorage key "${key}":`, e);
  }
  return defaultValue;
};

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  // Global SaaS Weddings Collection
  const [allWeddings, setAllWeddings] = useState<SaaSWedding[]>(() => {
    return getLocalOrDefault('saas_weddings_list', []);
  });
  const [superAdminMode, setSuperAdminMode] = useState<boolean>(false);
  const [isLoadingWedding, setIsLoadingWedding] = useState<boolean>(false);

  // Active Selected Tenant ID
  const [currentWeddingId, setCurrentWeddingId] = useState<string | null>(() => {
    // 1. URL search parameter verification - priority
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('weddingId') || params.get('id');
    const coupleParam = params.get('coupleName');
    const RESERVED_COUPLE_NAMES = ['dashboard', 'rsvp', 'tectell', 'login', 'admin'];
    if (urlId) {
      localStorage.setItem('current_wedding_id', urlId);
      return urlId;
    }
    if (coupleParam && !RESERVED_COUPLE_NAMES.includes(coupleParam)) {
      localStorage.setItem('current_wedding_id', coupleParam);
      return coupleParam;
    }
    // 2. URL Path parameter check (e.g. /devansh_helly)
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0 && !RESERVED_COUPLE_NAMES.includes(pathParts[0])) {
      localStorage.setItem('current_wedding_id', pathParts[0]);
      return pathParts[0];
    }
    // 3. Local storage recovery
    const cached = localStorage.getItem('current_wedding_id');
    return cached && cached !== 'null' ? cached : null;
  });

  // Current Loaded Wedding Config Metadata
  const [currentWedding, setCurrentWedding] = useState<SaaSWedding | null>(null);

  // Tenant Specific Dashboard lists
  const [itinerary, setItineraryState] = useState<ItineraryEvent[]>([]);
  const [guests, setGuestsState] = useState<Guest[]>([]);
  const [rooms, setRoomsState] = useState<Room[]>([]);
  const [roomAssignments, setRoomAssignmentsState] = useState<{ [guestId: string]: string }>({});
  const [transport, setTransportState] = useState<TransportRecord[]>([]);
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [totalBudget, setTotalBudgetState] = useState<number>(INITIAL_BUDGET.totalBudget);
  const [weddingTitle, setWeddingTitleState] = useState<string>("Udaipur Palace Resort Dashboard");
  const [brideName, setBrideNameState] = useState<string>("");
  const [groomName, setGroomNameState] = useState<string>("");
  const [admins, setAdminsState] = useState<AdminUser[]>([]);
  const [allowChildSharing, setAllowChildSharingState] = useState<boolean>(true);
  const allowChildSharingRef = useRef(true);
  const setAllowChildSharing = (val: boolean) => {
    allowChildSharingRef.current = val;
    setAllowChildSharingState(val);
  };
  const roomsRef = useRef<Room[]>([]);
  const hasCheckedInitRef = useRef(false);

  const [dbStatus, setDbStatus] = useState<DBStatus>('connecting');
  const [dbError, setDbError] = useState<string | null>(null);

  const makeId = () => Math.random().toString(36).substring(2, 11);

  // Dynamically set CSS variables when current wedding theme shifts
  useEffect(() => {
    if (!currentWedding) {
      // Default warm fallback for Root marketing site
      document.documentElement.style.setProperty('--color-emerald', '#1c1917'); // stone-900
      document.documentElement.style.setProperty('--color-emerald-dark', '#0c0a09'); // stone-950
      return;
    }

    const theme = currentWedding.colorTheme || 'emerald';
    let primary = '#064E3B'; // Emerald Green
    let dark = '#043427';

    if (theme === 'rose') {
      primary = '#9D174D'; // Pastelle Romantique Rose
      dark = '#700F34';
    } else if (theme === 'indigo') {
      primary = '#1E3A8A'; // Imperial Navy Indigo
      dark = '#172554';
    } else if (theme === 'amber') {
      primary = '#B45309'; // Warm Jaipur Sunset Amber
      dark = '#78350F';
    } else if (theme === 'burgundy') {
      primary = '#7F1D1D'; // Velvet Royal Burgundy
      dark = '#450A0A';
    }

    document.documentElement.style.setProperty('--color-emerald', primary);
    document.documentElement.style.setProperty('--color-emerald-dark', dark);
  }, [currentWedding?.colorTheme]);

  // Sync current selection helper state
  const selectWeddingId = (id: string | null) => {
    setCurrentWeddingId(id);
    if (id) {
      localStorage.setItem('current_wedding_id', id);
      // Synchronize URL to retain state cleanly
      const url = new URL(window.location.href);
      url.searchParams.set('weddingId', id);
      window.history.pushState({}, '', url.toString());
    } else {
      localStorage.removeItem('current_wedding_id');
      const url = new URL(window.location.href);
      url.searchParams.delete('weddingId');
      url.searchParams.delete('id');
      window.history.pushState({}, '', url.toString());
    }
  };

  // 1. Direct Realtime Subscription listener for SaaSWedding lists which loads immediately
  useEffect(() => {
    const unsubscribeSaaS = onSnapshot(collection(db, 'weddings'), async (snapshot) => {
      const list: SaaSWedding[] = [];
      snapshot.forEach(docSnap => {
        if (docSnap.id !== 'system_config') {
          list.push({ id: docSnap.id, ...docSnap.data() } as SaaSWedding);
        }
      });

      // Bootstrap check using a dedicated system_config collection, which is completely isolated from the weddings list.
      // This ensures that deleting all weddings will NEVER delete the initialization status, preventing any recreate pops!
      const checkAndBootstrap = async () => {
        try {
          const statusDoc = await getDoc(doc(db, 'system_config', 'status'));
          if (!statusDoc.exists() && list.length === 0) {
            console.log("No cloud weddings register found and database uninitialized. Seeding 'devansh_helly' default registry...");
            
            // Mark as initialized immediately to prevent any concurrent races
            await setDoc(doc(db, 'system_config', 'status'), { 
              initializedAt: new Date().toISOString() 
            });
            localStorage.setItem('has_bootstrapped_weddings', 'true');

            const defaultSaaS: SaaSWedding = {
              id: 'devansh_helly',
              title: "Devansh ♥ Helly",
              resortName: "Udaipur Palace Resort Hub",
              colorTheme: 'emerald',
              totalBudget: INITIAL_BUDGET.totalBudget,
              status: 'active',
              ownerName: 'Devansh Shah',
              adminEmail: 'admin@wedding.com',
              adminPassword: 'devanshhelly2026',
              createdAt: new Date().toISOString(),
              brideName: "Helly",
              groomName: "Devansh"
            };

            await setDoc(doc(db, 'weddings', defaultSaaS.id), defaultSaaS);
            await seedDataForId(defaultSaaS.id, defaultSaaS.title, defaultSaaS.totalBudget, defaultSaaS.adminEmail, defaultSaaS.adminPassword, defaultSaaS.brideName, defaultSaaS.groomName);
            console.log("Primary SaaS wedding tenant seeded successfully!");
          }
        } catch (err) {
          console.warn("Could not check or set initialization status:", err);
        }
      };

      if (!hasCheckedInitRef.current) {
        hasCheckedInitRef.current = true;
        checkAndBootstrap();
      }

      setAllWeddings(list);
      localStorage.setItem('saas_weddings_list', JSON.stringify(list));
      setDbStatus('connected');
    }, (err) => {
      console.warn("Global SaaS subscription offline - defaulting to sandbox:", err);
      setDbStatus('local');
      setDbError(err.message);

      const cached = getLocalOrDefault<SaaSWedding[]>('saas_weddings_list', []);
      if (cached.length === 0) {
        const defaultSaaS: SaaSWedding = {
          id: 'devansh_helly',
          title: "Devansh ♥ Helly",
          resortName: "Udaipur Palace Resort Hub",
          colorTheme: 'emerald',
          totalBudget: INITIAL_BUDGET.totalBudget,
          status: 'active',
          ownerName: 'Devansh Shah',
          adminEmail: 'admin@wedding.com',
          adminPassword: 'devanshhelly2026',
          createdAt: new Date().toISOString(),
          brideName: "Helly",
          groomName: "Devansh"
        };
        setAllWeddings([defaultSaaS]);
        localStorage.setItem('saas_weddings_list', JSON.stringify([defaultSaaS]));
      } else {
        setAllWeddings(cached);
      }
    });

    return () => unsubscribeSaaS();
  }, []);

  // Seed Data Helper for any tenant Wedding ID
  const seedDataForId = async (
    wId: string, 
    title: string, 
    budgetAmount: number, 
    adminEmail?: string, 
    adminPassword?: string,
    bName?: string,
    gName?: string
  ) => {
    try {
      const batch = writeBatch(db);

      // Seed itinerary subcollection
      INITIAL_ITINERARY.forEach(item => {
        batch.set(doc(db, 'weddings', wId, 'itinerary', item.id), item);
      });

      // Seed rooms
      INITIAL_ROOMS.forEach(item => {
        batch.set(doc(db, 'weddings', wId, 'rooms', item.id), item);
      });

      // Seed guests
      INITIAL_GUESTS.forEach(item => {
        const rId = INITIAL_ROOM_ASSIGNMENTS[item.id] || "";
        batch.set(doc(db, 'rsvps', item.id), { ...item, roomId: rId, weddingId: wId });
      });

      // Seed transport
      INITIAL_TRANSPORT.forEach(item => {
        batch.set(doc(db, 'weddings', wId, 'transport', item.id), item);
      });

      // Seed tasks
      INITIAL_TASKS.forEach(item => {
        batch.set(doc(db, 'weddings', wId, 'tasks', item.id), item);
      });

      // Seed expenses
      INITIAL_EXPENSES.forEach(item => {
        batch.set(doc(db, 'weddings', wId, 'expenses', item.id), item);
      });

      // Seed initial admin user
      const defaultAdmin: AdminUser = {
        id: 'adm_master',
        email: adminEmail || 'admin@wedding.com',
        name: 'Wedding Coordinator',
        password: adminPassword || 'devanshhelly2026',
        role: 'Admin',
        isAdmin: true
      };
      batch.set(doc(db, 'weddings', wId, 'admins', defaultAdmin.id), defaultAdmin);

      await batch.commit();
      return true;
    } catch (seedErr) {
      console.error(`Error writing sub-tenant data batches for ${wId}:`, seedErr);
      return false;
    }
  };

  // 2. Active Tenant Subscriber: Listens to specific subcollection paths of `/weddings/{weddingId}`
  useEffect(() => {
    if (!currentWeddingId) {
      // Clear specific lists when no wedding is active (showing Marketing/SaaS Hub)
      setCurrentWedding(null);
      setItineraryState([]);
      setGuestsState([]);
      setRoomsState([]);
      setRoomAssignmentsState({});
      setTransportState([]);
      setTasksState([]);
      setExpensesState([]);
      setWeddingTitleState("");
      setAdminsState([]);
      return;
    }

    setIsLoadingWedding(true);

    // Fetch the wedding metadata config from the active weddding ID list
    const foundWedding = allWeddings.find(w => w.id === currentWeddingId);
    if (foundWedding) {
      setCurrentWedding(foundWedding);
      setWeddingTitleState(foundWedding.title);
      setTotalBudgetState(foundWedding.totalBudget);
      setBrideNameState(foundWedding.brideName || "");
      setGroomNameState(foundWedding.groomName || "");
      setIsLoadingWedding(false);
    } else {
      // Don't clear currentWeddingId aggressively during initial load/race-conditions.
      // The onSnapshot listener below will fetch it directly from Firestore.
      setIsLoadingWedding(false);
    }

    if (dbStatus === 'local') {
      // Read isolated local caches
      const prettyName = currentWeddingId === 'devansh_helly' 
        ? "Devansh & Helly Udaipur Hub" 
        : currentWeddingId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + " Celebration";
      
      const fallBride = currentWeddingId === 'devansh_helly' ? "Helly" : "Bride Partner";
      const fallGroom = currentWeddingId === 'devansh_helly' ? "Devansh" : "Groom Partner";
      const defaultPass = currentWeddingId === 'devansh_helly' ? "devanshhelly2026" : "password";

      setItineraryState(getLocalOrDefault(`wedding_${currentWeddingId}_itinerary`, INITIAL_ITINERARY));
      setGuestsState(getLocalOrDefault(`wedding_${currentWeddingId}_guests`, INITIAL_GUESTS));
      const localRooms = getLocalOrDefault(`wedding_${currentWeddingId}_rooms`, INITIAL_ROOMS);
      setRoomsState(localRooms);
      roomsRef.current = localRooms;
      setRoomAssignmentsState(getLocalOrDefault(`wedding_${currentWeddingId}_roomAssignments`, INITIAL_ROOM_ASSIGNMENTS));
      setTransportState(getLocalOrDefault(`wedding_${currentWeddingId}_transport`, INITIAL_TRANSPORT));
      setTasksState(getLocalOrDefault(`wedding_${currentWeddingId}_tasks`, INITIAL_TASKS));
      setExpensesState(getLocalOrDefault(`wedding_${currentWeddingId}_expenses`, INITIAL_EXPENSES));
      setTotalBudgetState(getLocalOrDefault(`wedding_${currentWeddingId}_totalBudget`, INITIAL_BUDGET.totalBudget));
      setWeddingTitleState(getLocalOrDefault(`wedding_${currentWeddingId}_title`, prettyName));
      setBrideNameState(getLocalOrDefault(`wedding_${currentWeddingId}_brideName`, fallBride));
      setGroomNameState(getLocalOrDefault(`wedding_${currentWeddingId}_groomName`, fallGroom));
      setAdminsState(getLocalOrDefault(`wedding_${currentWeddingId}_admins`, [
        { id: 'admin_default', email: 'admin@wedding.com', name: 'Organizer', password: defaultPass, role: 'Admin', isAdmin: true }
      ]));
      setIsLoadingWedding(false);
      return;
    }

    // Set up nested Firebase Real-Time Synchronization Listeners
    // 1. Main Wedding Document listener for budget, title, and status changes
    const unsubscribeWeddingMeta = onSnapshot(doc(db, 'weddings', currentWeddingId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SaaSWedding;
        setCurrentWedding(data);
        setWeddingTitleState(data.title);
        setTotalBudgetState(data.totalBudget);
        setBrideNameState(data.brideName || "");
        setGroomNameState(data.groomName || "");
      }
    });

    // 2. Tenant Itinerary Subscriber
    const unsubscribeItinerary = onSnapshot(collection(db, 'weddings', currentWeddingId, 'itinerary'), (snapshot) => {
      const list: ItineraryEvent[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ItineraryEvent);
      });
      const sortedList = sortItineraryEvents(list);
      setItineraryState(sortedList);
      localStorage.setItem(`wedding_${currentWeddingId}_itinerary`, JSON.stringify(sortedList));
    });

    // 3. Tenant Guests & Assignments Subscriber from rsvps collection with background migration fallback
    const rsvpsQuery = query(collection(db, 'rsvps'), where('weddingId', '==', currentWeddingId));
    let isMigrating = false;
    const unsubscribeGuests = onSnapshot(rsvpsQuery, async (snapshot) => {
      if (snapshot.empty && !isMigrating) {
        isMigrating = true;
        try {
          const oldGuestsCol = collection(db, 'weddings', currentWeddingId, 'guests');
          const oldSnap = await getDocs(oldGuestsCol);
          if (!oldSnap.empty) {
            console.log(`Migrating ${oldSnap.size} guests from old subcollection to root rsvps for wedding: ${currentWeddingId}`);
            const batch = writeBatch(db);
            oldSnap.forEach(oldDoc => {
              batch.set(doc(db, 'rsvps', oldDoc.id), {
                ...oldDoc.data(),
                weddingId: currentWeddingId
              }, { merge: true });
            });
            await batch.commit();
            console.log("Migration completed successfully!");
            isMigrating = false;
            return;
          }
        } catch (err) {
          console.warn("Could not check/migrate old guests subcollection:", err);
        }
        isMigrating = false;
      }

      const list: Guest[] = [];
      const assignments: { [guestId: string]: string } = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const adults = data.totalAdults !== undefined ? Number(data.totalAdults) : (Number(data.totalFamilyMembers) || 1);
        const children = data.totalChildren !== undefined ? Number(data.totalChildren) : 0;
        const totalMembers = data.totalFamilyMembers !== undefined ? Number(data.totalFamilyMembers) : (adults + children);
        
        const guestItem: Guest = {
          ...data,
          id: docSnap.id,
          name: data.name || '',
          familyName: data.familyName || '',
          phone: data.phone || '',
          side: data.side || 'Bride',
          invitedEvents: data.invitedEvents || [],
          rsvp: data.rsvp || {},
          totalFamilyMembers: totalMembers,
          totalAdults: adults,
          totalChildren: children,
          isVIP: !!data.isVIP,
          specialRequests: data.specialRequests || '',
          memberRooms: data.memberRooms || {},
          memberNames: data.memberNames || [],
          checkInDate: data.checkInDate || undefined,
          checkOutDate: data.checkOutDate || undefined,
          inviteSent: data.inviteSent !== undefined ? !!data.inviteSent : false,
          hasSubmitted: !!data.hasSubmitted,
          weddingId: data.weddingId || currentWeddingId,
          rsvpStatus: data.rsvpStatus || undefined,
          confirmedAdults: data.confirmedAdults !== undefined ? Number(data.confirmedAdults) : undefined,
          confirmedChildren: data.confirmedChildren !== undefined ? Number(data.confirmedChildren) : undefined,
          roomId: data.roomId || "",
          warningTag: data.warningTag || undefined,
          isManualOverride: !!data.isManualOverride
        };
        list.push(guestItem);
        if (data.roomId) {
          assignments[docSnap.id] = data.roomId;
        }
      });

      // Real-time Automated Evictions
      const getGuestRsvpStatus = (g: Guest): 'Pending' | 'Attending' | 'Declined' => {
        if (g.rsvpStatus) return g.rsvpStatus;
        if (!g.hasSubmitted) return 'Pending';
        const isAttendingAny = Object.values(g.rsvp || {}).some(v => v === 'Attending');
        return isAttendingAny ? 'Attending' : 'Declined';
      };

      const calculateRoomBeds = (rId: string, allGuests: Guest[], childSharingAllowed: boolean) => {
        let beds = 0;
        allGuests.forEach(g => {
          const parentRoomId = g.roomId || "";
          const numAdults = g.confirmedAdults !== undefined ? g.confirmedAdults : (g.totalAdults !== undefined ? g.totalAdults : (g.totalFamilyMembers || 1));
          const numChildren = g.confirmedChildren !== undefined ? g.confirmedChildren : (g.totalChildren || 0);
          const totalCount = numAdults + numChildren;

          for (let i = 0; i < totalCount; i++) {
            const mRoomId = g.memberRooms?.[`m${i}`] !== undefined 
              ? g.memberRooms[`m${i}`] 
              : parentRoomId;

            if (mRoomId === rId) {
              const isChild = i >= numAdults;
              if (!(isChild && childSharingAllowed)) {
                beds += 1;
              }
            }
          }
        });
        return beds;
      };

      const guestsToEvict: { guestId: string; reason: string }[] = [];

      list.forEach(g => {
        if (g.roomId) {
          // 1. Rule 1: Declined RSVP (only if not manually overridden by admin)
          const rsvpStatus = getGuestRsvpStatus(g);
          if (rsvpStatus === 'Declined' && !g.isManualOverride) {
            guestsToEvict.push({
              guestId: g.id,
              reason: "🚨 Auto-Removed: Not Attending"
            });
            return;
          }

          // 2. Rule 2: Capacity Exceeded (only if not manually overridden by admin)
          if (!g.isManualOverride) {
            const room = roomsRef.current.find(r => r.id === g.roomId);
            if (room) {
              const occupiedBeds = calculateRoomBeds(g.roomId, list, allowChildSharingRef.current);
              if (occupiedBeds > room.capacity) {
                guestsToEvict.push({
                  guestId: g.id,
                  reason: "🚨 Auto-Removed: Updated RSVP Exceeded Room Capacity"
                });
              }
            }
          }
        }
      });

      if (guestsToEvict.length > 0) {
        try {
          const batch = writeBatch(db);
          guestsToEvict.forEach(({ guestId, reason }) => {
            const docRef = doc(db, 'rsvps', guestId);
            batch.update(docRef, {
              roomId: "",
              roomNumber: "",
              memberRooms: {},
              warningTag: reason,
              isManualOverride: false
            });
          });
          await batch.commit();
          console.log(`Successfully performed automated evictions:`, guestsToEvict);
        } catch (err) {
          console.error("Error executing automated evictions in onSnapshot:", err);
        }
        return;
      }

      setGuestsState(list);
      setRoomAssignmentsState(assignments);
      localStorage.setItem(`wedding_${currentWeddingId}_roomAssignments`, JSON.stringify(assignments));
    });

    // 4. Tenant Rooms Subscriber
    const unsubscribeRooms = onSnapshot(collection(db, 'weddings', currentWeddingId, 'rooms'), (snapshot) => {
      const list: Room[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Room);
      });
      setRoomsState(list);
      roomsRef.current = list;
      localStorage.setItem(`wedding_${currentWeddingId}_rooms`, JSON.stringify(list));
    });

    // 5. Tenant Transport Subscriber
    const unsubscribeTransport = onSnapshot(collection(db, 'weddings', currentWeddingId, 'transport'), (snapshot) => {
      const list: TransportRecord[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as TransportRecord);
      });
      setTransportState(list);
      localStorage.setItem(`wedding_${currentWeddingId}_transport`, JSON.stringify(list));
    });

    // 6. Tenant Tasks Subscriber
    const unsubscribeTasks = onSnapshot(collection(db, 'weddings', currentWeddingId, 'tasks'), (snapshot) => {
      const list: Task[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Task);
      });
      setTasksState(list);
      localStorage.setItem(`wedding_${currentWeddingId}_tasks`, JSON.stringify(list));
    });

    // 7. Tenant Expenses Subscriber
    const unsubscribeExpenses = onSnapshot(collection(db, 'weddings', currentWeddingId, 'expenses'), (snapshot) => {
      const list: Expense[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Expense);
      });
      setExpensesState(list);
      localStorage.setItem(`wedding_${currentWeddingId}_expenses`, JSON.stringify(list));
    });

    // 8. Tenant Admins Subscriber
    const unsubscribeAdmins = onSnapshot(collection(db, 'weddings', currentWeddingId, 'admins'), (snapshot) => {
      let list: AdminUser[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as AdminUser;
        const autoIsAdmin = data.isAdmin === true || data.role === 'Admin' || data.role === 'Organizer' || data.email?.toLowerCase() === 'rushiljain08@gmail.com';
        list.push({ id: docSnap.id, ...data, isAdmin: autoIsAdmin });
      });
      if (list.length === 0) {
        // Fallback default admin metadata if doc list is empty
        list.push({
          id: 'adm_default',
          email: currentWedding?.adminEmail || 'admin@wedding.com',
          name: 'Main Admin',
          password: currentWedding?.adminPassword || 'devanshhelly2026',
          role: 'Admin',
          isAdmin: true
        });
      }
      setAdminsState(list);
      localStorage.setItem(`wedding_${currentWeddingId}_admins`, JSON.stringify(list));
    });

    return () => {
      unsubscribeWeddingMeta();
      unsubscribeItinerary();
      unsubscribeGuests();
      unsubscribeRooms();
      unsubscribeTransport();
      unsubscribeTasks();
      unsubscribeExpenses();
      unsubscribeAdmins();
    };
  }, [currentWeddingId, dbStatus]);

  // Automated Evictions for Local Mode
  useEffect(() => {
    if (dbStatus !== 'local' || !currentWeddingId) return;

    const getGuestRsvpStatusLocal = (g: Guest): 'Pending' | 'Attending' | 'Declined' => {
      if (g.rsvpStatus) return g.rsvpStatus;
      if (!g.hasSubmitted) return 'Pending';
      const isAttendingAny = Object.values(g.rsvp || {}).some(v => v === 'Attending');
      return isAttendingAny ? 'Attending' : 'Declined';
    };

    const calculateRoomBedsLocal = (rId: string, allGuests: Guest[], childSharingAllowed: boolean) => {
      let beds = 0;
      allGuests.forEach(g => {
        const parentRoomId = g.roomId || "";
        const numAdults = g.confirmedAdults !== undefined ? g.confirmedAdults : (g.totalAdults !== undefined ? g.totalAdults : (g.totalFamilyMembers || 1));
        const numChildren = g.confirmedChildren !== undefined ? g.confirmedChildren : (g.totalChildren || 0);
        const totalCount = numAdults + numChildren;

        for (let i = 0; i < totalCount; i++) {
          const mRoomId = g.memberRooms?.[`m${i}`] !== undefined 
            ? g.memberRooms[`m${i}`] 
            : parentRoomId;

          if (mRoomId === rId) {
            const isChild = i >= numAdults;
            if (!(isChild && childSharingAllowed)) {
              beds += 1;
            }
          }
        }
      });
      return beds;
    };

    const guestsToEvict: { guestId: string; reason: string }[] = [];

    guests.forEach(g => {
      if (g.roomId) {
        // 1. Rule 1: Declined RSVP (only if not manually overridden by admin)
        const rsvpStatus = getGuestRsvpStatusLocal(g);
        if (rsvpStatus === 'Declined' && !g.isManualOverride) {
          guestsToEvict.push({
            guestId: g.id,
            reason: "🚨 Auto-Removed: Not Attending"
          });
          return;
        }

        // 2. Rule 2: Capacity Exceeded (only if not manually overridden by admin)
        if (!g.isManualOverride) {
          const room = rooms.find(r => r.id === g.roomId);
          if (room) {
            const occupiedBeds = calculateRoomBedsLocal(g.roomId, guests, allowChildSharing);
            if (occupiedBeds > room.capacity) {
              guestsToEvict.push({
                guestId: g.id,
                reason: "🚨 Auto-Removed: Updated RSVP Exceeded Room Capacity"
              });
            }
          }
        }
      }
    });

    if (guestsToEvict.length > 0) {
      console.log("Local Mode: Executing automated evictions:", guestsToEvict);
      setGuestsState(prev => {
        const next = prev.map(g => {
          const evict = guestsToEvict.find(e => e.guestId === g.id);
          if (evict) {
            return {
              ...g,
              roomId: "",
              roomNumber: "",
              memberRooms: {},
              warningTag: evict.reason,
              isManualOverride: false
            };
          }
          return g;
        });
        localStorage.setItem(`wedding_${currentWeddingId}_guests`, JSON.stringify(next));
        return next;
      });

      setRoomAssignmentsState(prev => {
        const next = { ...prev };
        guestsToEvict.forEach(({ guestId }) => {
          delete next[guestId];
        });
        localStorage.setItem(`wedding_${currentWeddingId}_roomAssignments`, JSON.stringify(next));
        return next;
      });
    }
  }, [guests, rooms, allowChildSharing, dbStatus, currentWeddingId]);


  // SaaS API Operations (Create/Update/Delete Customer Wedding Portals)
  const createSaaSWedding = async (newSaaS: Omit<SaaSWedding, 'createdAt'>, seedDemoData = true) => {
    const fullSaaS: SaaSWedding = {
      ...newSaaS,
      createdAt: new Date().toISOString()
    };

    if (dbStatus === 'local') {
      setAllWeddings(prev => {
        const next = [...prev, fullSaaS];
        localStorage.setItem('saas_weddings_list', JSON.stringify(next));
        return next;
      });
      return true;
    }

    try {
      // 1. Write metadata doc
      await setDoc(doc(db, 'weddings', fullSaaS.id), fullSaaS);
      
      // 2. Write seed sub-collections if selected
      if (seedDemoData) {
        await seedDataForId(fullSaaS.id, fullSaaS.title, fullSaaS.totalBudget, fullSaaS.adminEmail, fullSaaS.adminPassword, fullSaaS.brideName, fullSaaS.groomName);
      } else {
        // Just write empty default collections or custom admin account
        const batch = writeBatch(db);
        const defaultAdmin: AdminUser = {
          id: 'adm_master',
          email: fullSaaS.adminEmail,
          name: 'Manager',
          password: fullSaaS.adminPassword || 'password123',
          role: 'Admin',
          isAdmin: true
        };
        batch.set(doc(db, 'weddings', fullSaaS.id, 'admins', defaultAdmin.id), defaultAdmin);
        await batch.commit();
      }
      return true;
    } catch (err) {
      console.error("Firebase error creating SaaS wedding portal:", err);
      return false;
    }
  };

  const updateSaaSWedding = async (updatedSaaS: SaaSWedding) => {
    if (dbStatus === 'local') {
      setAllWeddings(prev => {
        const next = prev.map(w => w.id === updatedSaaS.id ? updatedSaaS : w);
        localStorage.setItem('saas_weddings_list', JSON.stringify(next));
        return next;
      });
      return true;
    }

    try {
      await setDoc(doc(db, 'weddings', updatedSaaS.id), updatedSaaS);
      return true;
    } catch (err) {
      console.error("Firebase error updating SaaS wedding:", err);
      return false;
    }
  };

  const deleteSaaSWedding = async (wId: string) => {
    if (dbStatus === 'local') {
      setAllWeddings(prev => {
        const next = prev.filter(w => w.id !== wId);
        localStorage.setItem('saas_weddings_list', JSON.stringify(next));
        return next;
      });
      return true;
    }

    try {
      await deleteDoc(doc(db, 'weddings', wId));
      return true;
    } catch (err) {
      console.error("Firebase error deleting SaaS wedding document:", err);
      return false;
    }
  };


  // MUTATION ACTIONS (Tenant Scoped Wrapper Methods)

  const setWeddingTitle = async (titleStr: string) => {
    const trimmed = titleStr.trim();
    setWeddingTitleState(trimmed);
    localStorage.setItem(`wedding_${currentWeddingId}_title`, trimmed);

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await updateDoc(doc(db, 'weddings', currentWeddingId), { title: trimmed });
      } catch (err: any) {
        console.warn("Firestore error updating tenant title:", err);
      }
    }
  };

  const setBrideAndGroomNames = async (brideStr: string, groomStr: string) => {
    const trimmedBride = brideStr.trim();
    const trimmedGroom = groomStr.trim();
    setBrideNameState(trimmedBride);
    setGroomNameState(trimmedGroom);
    localStorage.setItem(`wedding_${currentWeddingId}_brideName`, trimmedBride);
    localStorage.setItem(`wedding_${currentWeddingId}_groomName`, trimmedGroom);

    if (currentWeddingId) {
      if (dbStatus !== 'local') {
        try {
          await updateDoc(doc(db, 'weddings', currentWeddingId), { 
            brideName: trimmedBride, 
            groomName: trimmedGroom 
          });
        } catch (err: any) {
          console.warn("Firestore error updating tenant couple names:", err);
        }
      } else {
        setAllWeddings(prev => {
          const next = prev.map(w => w.id === currentWeddingId ? {
            ...w,
            brideName: trimmedBride,
            groomName: trimmedGroom
          } : w);
          localStorage.setItem('saas_weddings_list', JSON.stringify(next));
          return next;
        });
      }
    }
  };

  const addItineraryEvent = async (event: Omit<ItineraryEvent, 'id'>) => {
    const id = 'evt_' + makeId();
    const newEvent: ItineraryEvent = { ...event, id };

    setItineraryState(prev => {
      const next = sortItineraryEvents([...prev, newEvent]);
      localStorage.setItem(`wedding_${currentWeddingId}_itinerary`, JSON.stringify(next));
      return next;
    });

    // Auto-invite all existing guests to this newly created ceremony
    setGuestsState(prev => {
      const next = prev.map(g => {
        if (!g.invitedEvents || !g.invitedEvents.includes(id)) {
          const updatedInvited = [...(g.invitedEvents || []), id];
          const updatedRsvp = { ...(g.rsvp || {}), [id]: (g.rsvp && g.rsvp[id]) || 'Pending' };
          return { ...g, invitedEvents: updatedInvited, rsvp: updatedRsvp };
        }
        return g;
      });
      localStorage.setItem(`wedding_${currentWeddingId}_guests`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'itinerary', id), newEvent);

        // Update all guests in Firestore in a batch so they can immediately RSVP to the new event
        const batch = writeBatch(db);
        guests.forEach(g => {
          if (!g.invitedEvents || !g.invitedEvents.includes(id)) {
            const updatedInvited = [...(g.invitedEvents || []), id];
            const updatedRsvp = { ...(g.rsvp || {}), [id]: (g.rsvp && g.rsvp[id]) || 'Pending' };
            batch.update(doc(db, 'rsvps', g.id), {
              invitedEvents: updatedInvited,
              rsvp: updatedRsvp
            });
          }
        });
        await batch.commit();
      } catch (err: any) {
        console.warn("Firestore error writing event or syncing guests:", err);
      }
    }
  };

  const updateItineraryEvent = async (updated: ItineraryEvent) => {
    setItineraryState(prev => {
      const next = sortItineraryEvents(prev.map(e => e.id === updated.id ? updated : e));
      localStorage.setItem(`wedding_${currentWeddingId}_itinerary`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'itinerary', updated.id), updated);
      } catch (err: any) {
        console.warn("Firestore error updating event:", err);
      }
    }
  };

  const syncAllEventsToGuests = async () => {
    if (!currentWeddingId || itinerary.length === 0) return;
    const allEventIds = itinerary.map(e => e.id);

    setGuestsState(prev => {
      const next = prev.map(g => {
        const mergedEvents = Array.from(new Set([...(g.invitedEvents || []), ...allEventIds]));
        const nextRsvp = { ...(g.rsvp || {}) };
        allEventIds.forEach(eId => {
          if (!nextRsvp[eId]) nextRsvp[eId] = 'Pending';
        });
        return {
          ...g,
          invitedEvents: mergedEvents,
          rsvp: nextRsvp
        };
      });
      localStorage.setItem(`wedding_${currentWeddingId}_guests`, JSON.stringify(next));
      return next;
    });

    if (dbStatus !== 'local') {
      try {
        const batch = writeBatch(db);
        guests.forEach(g => {
          const mergedEvents = Array.from(new Set([...(g.invitedEvents || []), ...allEventIds]));
          const nextRsvp = { ...(g.rsvp || {}) };
          allEventIds.forEach(eId => {
            if (!nextRsvp[eId]) nextRsvp[eId] = 'Pending';
          });
          batch.update(doc(db, 'rsvps', g.id), {
            invitedEvents: mergedEvents,
            rsvp: nextRsvp
          });
        });
        await batch.commit();
      } catch (err) {
        console.warn("Error synchronizing all events to guests in Firestore:", err);
      }
    }
  };

  const deleteItineraryEvent = async (id: string) => {
    setItineraryState(prev => {
      const next = prev.filter(e => e.id !== id);
      localStorage.setItem(`wedding_${currentWeddingId}_itinerary`, JSON.stringify(next));
      return next;
    });

    // Remove event from guests invited lists
    setGuestsState(prev => {
      const next = prev.map(g => {
        if (g.invitedEvents.includes(id)) {
          const nextInvited = g.invitedEvents.filter(eId => eId !== id);
          const nextRsvp = { ...g.rsvp };
          delete nextRsvp[id];
          return { ...g, invitedEvents: nextInvited, rsvp: nextRsvp };
        }
        return g;
      });
      localStorage.setItem(`wedding_${currentWeddingId}_guests`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await deleteDoc(doc(db, 'weddings', currentWeddingId, 'itinerary', id));
        const batch = writeBatch(db);
        guests.forEach(g => {
          if (g.invitedEvents.includes(id)) {
            const nextInvited = g.invitedEvents.filter(eId => eId !== id);
            const nextRsvp = { ...g.rsvp };
            delete nextRsvp[id];
            batch.update(doc(db, 'rsvps', g.id), {
              invitedEvents: nextInvited,
              rsvp: nextRsvp
            });
          }
        });
        await batch.commit();
      } catch (err: any) {
        console.warn("Firestore error deleting event:", err);
      }
    }
  };

  const cleanForFirestore = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    const cleaned: any = Array.isArray(obj) ? [] : {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Date) && !Array.isArray(obj[key])) {
          cleaned[key] = cleanForFirestore(obj[key]);
        } else {
          cleaned[key] = obj[key];
        }
      }
    });
    return cleaned;
  };

  const addGuest = async (guest: Omit<Guest, 'id' | 'rsvp'>) => {
    const defaultRsvp: { [eventId: string]: 'Pending' | 'Attending' | 'Declined' } = {};
    guest.invitedEvents.forEach(eId => {
      defaultRsvp[eId] = 'Pending';
    });
    const id = 'g_' + makeId();
    const newGuest: Guest = { 
      ...guest, 
      id, 
      rsvp: defaultRsvp,
      totalFamilyMembers: guest.totalFamilyMembers || 1,
      weddingId: currentWeddingId,
      inviteSent: !!guest.inviteSent
    };

    setGuestsState(prev => {
      const next = [...prev, newGuest];
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        const payload = cleanForFirestore({
          ...newGuest,
          roomId: ""
        });
        await setDoc(doc(db, 'rsvps', id), payload);
      } catch (err: any) {
        console.warn("Firestore error writing guest:", err);
      }
    }
  };

  const updateGuest = async (updated: Guest) => {
    const existingRoomId = roomAssignments[updated.id] || "";

    setGuestsState(prev => {
      const next = prev.map(g => g.id === updated.id ? updated : g);
      localStorage.setItem(`wedding_${currentWeddingId}_guests`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        const payload = cleanForFirestore({
          ...updated,
          weddingId: currentWeddingId,
          roomId: existingRoomId,
          inviteSent: !!updated.inviteSent
        });
        await setDoc(doc(db, 'rsvps', updated.id), payload, { merge: true });
      } catch (err: any) {
        console.warn("Firestore error updating guest:", err);
      }
    }
  };

  const deleteGuest = async (id: string) => {
    setGuestsState(prev => {
      const next = prev.filter(g => g.id !== id);
      return next;
    });

    setRoomAssignmentsState(prev => {
      const next = { ...prev };
      delete next[id];
      localStorage.setItem(`wedding_${currentWeddingId}_roomAssignments`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await deleteDoc(doc(db, 'rsvps', id));
      } catch (err: any) {
        console.warn("Firestore error deleting guest:", err);
      }
    }
  };

  const splitGuest = async (
    id: string,
    part1Name: string,
    part1Adults: number,
    part1Children: number,
    part2Name: string,
    part2Adults: number,
    part2Children: number
  ) => {
    const original = guests.find(g => g.id === id);
    if (!original) return;

    const id1 = 'g_' + makeId();
    const id2 = 'g_' + makeId();

    const origNames = original.memberNames || [];
    const part1Total = part1Adults + part1Children;
    const part1Names = origNames.slice(0, part1Total);
    const part2Names = origNames.slice(part1Total);

    const part1: Guest = {
      ...original,
      id: id1,
      name: part1Name,
      totalFamilyMembers: part1Total,
      totalAdults: part1Adults,
      totalChildren: part1Children,
      confirmedAdults: original.confirmedAdults !== undefined ? part1Adults : undefined,
      confirmedChildren: original.confirmedChildren !== undefined ? part1Children : undefined,
      memberNames: part1Names,
      memberRooms: {},
      roomId: "",
      isRoomApproved: false,
      isManualOverride: false,
      warningTag: ""
    };

    const part2: Guest = {
      ...original,
      id: id2,
      name: part2Name,
      totalFamilyMembers: part2Adults + part2Children,
      totalAdults: part2Adults,
      totalChildren: part2Children,
      confirmedAdults: original.confirmedAdults !== undefined ? part2Adults : undefined,
      confirmedChildren: original.confirmedChildren !== undefined ? part2Children : undefined,
      memberNames: part2Names,
      memberRooms: {},
      roomId: "",
      isRoomApproved: false,
      isManualOverride: false,
      warningTag: ""
    };

    setGuestsState(prev => {
      const filtered = prev.filter(g => g.id !== id);
      const next = [...filtered, part1, part2];
      localStorage.setItem(`wedding_${currentWeddingId}_guests`, JSON.stringify(next));
      return next;
    });

    setRoomAssignmentsState(prev => {
      const next = { ...prev };
      delete next[id];
      localStorage.setItem(`wedding_${currentWeddingId}_roomAssignments`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'rsvps', id));
        batch.set(doc(db, 'rsvps', id1), { ...part1, roomId: "" });
        batch.set(doc(db, 'rsvps', id2), { ...part2, roomId: "" });
        await batch.commit();
      } catch (err: any) {
        console.warn("Firestore error splitting guest:", err);
      }
    }
  };

  const addRoom = async (room: Omit<Room, 'id'>) => {
    const id = 'r_' + makeId();
    const newRoom: Room = { ...room, id };

    setRoomsState(prev => {
      const next = [...prev, newRoom];
      localStorage.setItem(`wedding_${currentWeddingId}_rooms`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'rooms', id), newRoom);
      } catch (err: any) {
        console.warn("Firestore error writing suite:", err);
      }
    }
  };

  const bulkAddRooms = async (roomsToCreate: Omit<Room, 'id'>[]) => {
    if (roomsToCreate.length === 0) return;
    
    const newRoomsWithIds: Room[] = roomsToCreate.map(r => ({
      ...r,
      id: 'r_' + makeId()
    }));

    setRoomsState(prev => {
      const next = [...prev, ...newRoomsWithIds];
      localStorage.setItem(`wedding_${currentWeddingId}_rooms`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        const batch = writeBatch(db);
        newRoomsWithIds.forEach(newRoom => {
          const rRef = doc(db, 'weddings', currentWeddingId, 'rooms', newRoom.id);
          batch.set(rRef, newRoom);
        });
        await batch.commit();
      } catch (err: any) {
        console.warn("Firestore error bulk writing rooms:", err);
      }
    }
  };

  const updateRoom = async (updated: Room) => {
    setRoomsState(prev => {
      const next = prev.map(r => r.id === updated.id ? updated : r);
      localStorage.setItem(`wedding_${currentWeddingId}_rooms`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'rooms', updated.id), updated);
      } catch (err: any) {
        console.warn("Firestore error updating suite:", err);
      }
    }
  };

  const deleteRoom = async (id: string) => {
    setRoomsState(prev => {
      const next = prev.filter(r => r.id !== id);
      localStorage.setItem(`wedding_${currentWeddingId}_rooms`, JSON.stringify(next));
      return next;
    });

    setRoomAssignmentsState(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(guestId => {
        if (next[guestId] === id) {
          delete next[guestId];
        }
      });
      localStorage.setItem(`wedding_${currentWeddingId}_roomAssignments`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await deleteDoc(doc(db, 'weddings', currentWeddingId, 'rooms', id));
        const batch = writeBatch(db);
        guests.forEach(g => {
          if (roomAssignments[g.id] === id) {
            batch.update(doc(db, 'rsvps', g.id), { roomId: "" });
          }
        });
        await batch.commit();
      } catch (err: any) {
        console.warn("Firestore error deleting suite:", err);
      }
    }
  };

  const assignRoomToGuest = async (guestId: string, roomId: string | null, isManualOverride: boolean = false) => {
    setRoomAssignmentsState(prev => {
      const next = { ...prev };
      if (roomId) {
        next[guestId] = roomId;
      } else {
        delete next[guestId];
      }
      localStorage.setItem(`wedding_${currentWeddingId}_roomAssignments`, JSON.stringify(next));
      return next;
    });

    setGuestsState(prev => {
      const next = prev.map(g => {
        if (g.id === guestId) {
          return {
            ...g,
            roomId: roomId || "",
            warningTag: "",
            isManualOverride: isManualOverride
          };
        }
        return g;
      });
      localStorage.setItem(`wedding_${currentWeddingId}_guests`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await updateDoc(doc(db, 'rsvps', guestId), { 
          roomId: roomId || "",
          warningTag: "", // Clear warningTag on new assignment
          isManualOverride: isManualOverride
        });
      } catch (err: any) {
        console.warn("Firestore error assigning room suite:", err);
      }
    }
  };

  const bulkAssignRooms = async (assignments: { [guestId: string]: string | null }) => {
    setRoomAssignmentsState(prev => {
      const next = { ...prev };
      Object.entries(assignments).forEach(([guestId, roomId]) => {
        if (roomId) {
          next[guestId] = roomId;
        } else {
          delete next[guestId];
        }
      });
      localStorage.setItem(`wedding_${currentWeddingId}_roomAssignments`, JSON.stringify(next));
      return next;
    });

    setGuestsState(prev => {
      const next = prev.map(g => {
        if (assignments[g.id] !== undefined) {
          return {
            ...g,
            roomId: assignments[g.id] || "",
            warningTag: ""
          };
        }
        return g;
      });
      localStorage.setItem(`wedding_${currentWeddingId}_guests`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        const batch = writeBatch(db);
        Object.entries(assignments).forEach(([guestId, roomId]) => {
          const docRef = doc(db, 'rsvps', guestId);
          batch.update(docRef, { roomId: roomId || "" });
        });
        await batch.commit();
      } catch (err: any) {
        console.warn("Firestore error bulk assigning room suites:", err);
      }
    }
  };

  const addTransport = async (record: Omit<TransportRecord, 'id'>) => {
    const id = 't_' + makeId();
    const newRecord: TransportRecord = { ...record, id };

    setTransportState(prev => {
      const next = [...prev, newRecord];
      localStorage.setItem(`wedding_${currentWeddingId}_transport`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'transport', id), newRecord);
      } catch (err: any) {
        console.warn("Firestore error adding transport logistics:", err);
      }
    }
  };

  const updateTransport = async (updated: TransportRecord) => {
    setTransportState(prev => {
      const next = prev.map(t => t.id === updated.id ? updated : t);
      localStorage.setItem(`wedding_${currentWeddingId}_transport`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'transport', updated.id), updated);
      } catch (err: any) {
        console.warn("Firestore error updating transport:", err);
      }
    }
  };

  const deleteTransport = async (id: string) => {
    setTransportState(prev => {
      const next = prev.filter(t => t.id !== id);
      localStorage.setItem(`wedding_${currentWeddingId}_transport`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await deleteDoc(doc(db, 'weddings', currentWeddingId, 'transport', id));
      } catch (err: any) {
        console.warn("Firestore error deleting transport records:", err);
      }
    }
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    const id = 'tk_' + makeId();
    const newTask: Task = { ...task, id };

    setTasksState(prev => {
      const next = [...prev, newTask];
      localStorage.setItem(`wedding_${currentWeddingId}_tasks`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'tasks', id), newTask);
      } catch (err: any) {
        console.warn("Firestore error adding squad task:", err);
      }
    }
  };

  const updateTask = async (updated: Task) => {
    setTasksState(prev => {
      const next = prev.map(t => t.id === updated.id ? updated : t);
      localStorage.setItem(`wedding_${currentWeddingId}_tasks`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'tasks', updated.id), updated);
      } catch (err: any) {
        console.warn("Firestore error updating squad task:", err);
      }
    }
  };

  const deleteTask = async (id: string) => {
    setTasksState(prev => {
      const next = prev.filter(t => t.id !== id);
      localStorage.setItem(`wedding_${currentWeddingId}_tasks`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await deleteDoc(doc(db, 'weddings', currentWeddingId, 'tasks', id));
      } catch (err: any) {
        console.warn("Firestore error deleting squad duty task:", err);
      }
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    const id = 'e_' + makeId();
    const newExpense: Expense = { ...expense, id };

    setExpensesState(prev => {
      const next = [...prev, newExpense];
      localStorage.setItem(`wedding_${currentWeddingId}_expenses`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'expenses', id), newExpense);
      } catch (err: any) {
        console.warn("Firestore error adding ledger expense:", err);
      }
    }
  };

  const updateExpense = async (updated: Expense) => {
    setExpensesState(prev => {
      const next = prev.map(e => e.id === updated.id ? updated : e);
      localStorage.setItem(`wedding_${currentWeddingId}_expenses`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'expenses', updated.id), updated);
      } catch (err: any) {
        console.warn("Firestore error updating expense records:", err);
      }
    }
  };

  const deleteExpense = async (id: string) => {
    setExpensesState(prev => {
      const next = prev.filter(e => e.id !== id);
      localStorage.setItem(`wedding_${currentWeddingId}_expenses`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await deleteDoc(doc(db, 'weddings', currentWeddingId, 'expenses', id));
      } catch (err: any) {
        console.warn("Firestore error deleting financial ledger row:", err);
      }
    }
  };

  const setTotalBudget = async (amount: number) => {
    const val = Number(amount);
    setTotalBudgetState(val);
    localStorage.setItem(`wedding_${currentWeddingId}_totalBudget`, String(val));

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await updateDoc(doc(db, 'weddings', currentWeddingId), { totalBudget: val });
      } catch (err: any) {
        console.warn("Firestore error updating budget total:", err);
      }
    }
  };

  const addAdmin = async (admin: Omit<AdminUser, 'id'>) => {
    const id = 'adm_' + makeId();
    const newAdmin: AdminUser = { ...admin, id };

    setAdminsState(prev => {
      const next = [...prev, newAdmin];
      localStorage.setItem(`wedding_${currentWeddingId}_admins`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'admins', id), newAdmin);
      } catch (err: any) {
        console.warn("Firestore error registering admin credentials:", err);
      }
    }
  };

  const updateAdmin = async (updated: AdminUser) => {
    setAdminsState(prev => {
      const next = prev.map(a => a.id === updated.id ? updated : a);
      localStorage.setItem(`wedding_${currentWeddingId}_admins`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await setDoc(doc(db, 'weddings', currentWeddingId, 'admins', updated.id), updated);
      } catch (err: any) {
        console.warn("Firestore error editing coordinator:", err);
      }
    }
  };

  const deleteAdmin = async (id: string) => {
    if (admins.length <= 1) {
      alert("Cannot delete the only remaining administrator!");
      return;
    }

    setAdminsState(prev => {
      const next = prev.filter(a => a.id !== id);
      localStorage.setItem(`wedding_${currentWeddingId}_admins`, JSON.stringify(next));
      return next;
    });

    if (currentWeddingId && dbStatus !== 'local') {
      try {
        await deleteDoc(doc(db, 'weddings', currentWeddingId, 'admins', id));
      } catch (err: any) {
        console.warn("Firestore error deleting coordinator:", err);
      }
    }
  };

  const submitGuestRSVP = async (
    guestName: string,
    selectedEvents: { [eventId: string]: 'Attending' | 'Declined' | 'Pending' },
    guestId?: string
  ): Promise<{ success: boolean; guestName: string; isNew: boolean }> => {
    const nameLower = guestName.trim().toLowerCase();
    
    // Precise ID lookup has maximum priority, but only if the name matches (case insensitive) or if no guest with that ID exists
    const existingGuest = guestId ? guests.find(g => g.id === guestId) : null;
    const finalExistingGuest = (existingGuest && existingGuest.name.trim().toLowerCase() === nameLower)
      ? existingGuest
      : guests.find(g => g.name.trim().toLowerCase() === nameLower);

    if (finalExistingGuest) {
      const nextRsvp: { [eventId: string]: 'Attending' | 'Declined' | 'Pending' } = {};
      
      // We should allow RSVP-ing to any event in the itinerary, or at least any event in finalExistingGuest.invitedEvents.
      // If finalExistingGuest.invitedEvents is empty or undefined, use all itinerary events.
      const allowedEvents = (finalExistingGuest.invitedEvents && finalExistingGuest.invitedEvents.length > 0)
        ? finalExistingGuest.invitedEvents
        : itinerary.map(e => e.id);

      allowedEvents.forEach(eId => {
        if (selectedEvents[eId] !== undefined) {
          nextRsvp[eId] = selectedEvents[eId];
        } else if (finalExistingGuest.rsvp?.[eId] !== undefined) {
          nextRsvp[eId] = finalExistingGuest.rsvp[eId];
        } else {
          nextRsvp[eId] = 'Pending';
        }
      });

      // Copy any other existing RSVPs to make sure they are not lost
      if (finalExistingGuest.rsvp) {
        Object.entries(finalExistingGuest.rsvp).forEach(([key, val]) => {
          if (nextRsvp[key] === undefined) {
            nextRsvp[key] = val as 'Attending' | 'Declined' | 'Pending';
          }
        });
      }

      // Also ensure that if they are adding new events, we add those to invitedEvents if they were previously not invited but are now RSVP-ing
      const nextInvitedEvents = [...(finalExistingGuest.invitedEvents || [])];
      Object.keys(selectedEvents).forEach(eId => {
        if (selectedEvents[eId] === 'Attending' && !nextInvitedEvents.includes(eId)) {
          nextInvitedEvents.push(eId);
        }
      });

      const isAttendingAny = Object.values(nextRsvp).some(v => v === 'Attending');
      const computedStatus = isAttendingAny ? 'Attending' : 'Declined';

      const updatedGuest: Guest = {
        ...finalExistingGuest,
        invitedEvents: nextInvitedEvents.length > 0 ? nextInvitedEvents : itinerary.map(e => e.id),
        rsvp: nextRsvp,
        hasSubmitted: true,
        rsvpStatus: computedStatus
      };

      // CRITICAL: DO NOT add uninvited events to updatedGuest.invitedEvents unless RSVP'd!
      await updateGuest(updatedGuest);
      return { success: true, guestName: finalExistingGuest.name, isNew: false };
    } else {
      // For new guests registering on the fly, we only include the events they actively set to 'Attending'
      const attendingEventIds = Object.entries(selectedEvents)
        .filter(([_, status]) => status === 'Attending')
        .map(([eId]) => eId);

      const nextRsvp: { [eventId: string]: 'Attending' | 'Declined' | 'Pending' } = {};
      attendingEventIds.forEach(eId => {
        nextRsvp[eId] = 'Attending';
      });

      const id = 'g_' + makeId();
      const isAttendingAny = Object.values(nextRsvp).some(v => v === 'Attending');
      const computedStatus = isAttendingAny ? 'Attending' : 'Declined';

      const newGuest: Guest = {
        id,
        name: guestName.trim(),
        phone: 'Not provided',
        side: 'Bride',
        invitedEvents: attendingEventIds, // Only events they RSVP'd as attending to
        rsvp: nextRsvp,
        totalFamilyMembers: 1,
        inviteSent: false,
        hasSubmitted: true,
        rsvpStatus: computedStatus,
        weddingId: currentWeddingId
      };

      setGuestsState(prev => {
        const next = [...prev, newGuest];
        return next;
      });

      if (currentWeddingId && dbStatus !== 'local') {
        try {
          await setDoc(doc(db, 'rsvps', id), { ...newGuest, roomId: "" });
        } catch (err) {
          console.warn("Firestore error adding rsvp guest:", err);
        }
      }

      return { success: true, guestName: guestName.trim(), isNew: true };
    }
  };

  return (
    <AppContext.Provider
      value={{
        itinerary,
        guests,
        rooms,
        roomAssignments,
        transport,
        tasks,
        expenses,
        totalBudget,
        weddingTitle,
        brideName,
        groomName,
        dbStatus,
        dbError,
        admins,

        // SaaS Multi-tenancy State
        currentWeddingId,
        currentWedding,
        allWeddings,
        superAdminMode,
        isLoadingWedding,

        // SaaS multi-tenant methods
        selectWeddingId,
        createSaaSWedding,
        updateSaaSWedding,
        deleteSaaSWedding,
        setSuperAdminMode,

        // Scoped methods
        setWeddingTitle,
        setBrideAndGroomNames,
        addAdmin,
        updateAdmin,
        deleteAdmin,

        addItineraryEvent,
        updateItineraryEvent,
        deleteItineraryEvent,
        syncAllEventsToGuests,

        addGuest,
        updateGuest,
        deleteGuest,
        splitGuest,

        addRoom,
        bulkAddRooms,
        updateRoom,
        deleteRoom,
        assignRoomToGuest,
        bulkAssignRooms,

        addTransport,
        updateTransport,
        deleteTransport,

        addTask,
        updateTask,
        deleteTask,

        addExpense,
        updateExpense,
        deleteExpense,
        setTotalBudget,

        submitGuestRSVP,
        allowChildSharing,
        setAllowChildSharing
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
}
