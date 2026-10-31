/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ItineraryEvent, Guest, Room, TransportRecord, Task, Expense } from '../types';

export const INITIAL_ITINERARY: ItineraryEvent[] = [
  {
    id: 'haldi',
    title: 'Haldi Ceremony',
    date: '2026-11-16',
    time: '11:00 AM',
    venue: 'Mango Orchard Poolside, Royal Palace resort',
    dressCode: 'Bright Sunny Yellow & Traditional Florals'
  },
  {
    id: 'sangeet',
    title: 'Sangeet & Beats Night',
    date: '2026-11-16',
    time: '07:00 PM',
    venue: 'Grand Imperial Ball Room',
    dressCode: 'Festive Pastel Lehenga / Nehru Jacket'
  },
  {
    id: 'wedding',
    title: 'Pheras & Auspicious Wedding',
    date: '2026-11-17',
    time: '04:30 PM',
    venue: 'Royal Palace Lawns',
    dressCode: 'Royal Indian Traditional / Sherwani / Heavy Sarees'
  },
  {
    id: 'reception',
    title: 'Grand Wedding Reception',
    date: '2026-11-18',
    time: '08:00 PM',
    venue: 'The Palace Lakefront Gardens',
    dressCode: 'Formal Tuxedo / Black-Tie / Regal Evening Gowns'
  }
];

export const INITIAL_GUESTS: Guest[] = [
  {
    id: 'g1',
    name: 'Rajendra Prasad',
    phone: '+919876543210',
    side: 'Bride',
    invitedEvents: ['haldi', 'sangeet', 'wedding', 'reception'],
    rsvp: {
      'haldi': 'Attending',
      'sangeet': 'Attending',
      'wedding': 'Attending',
      'reception': 'Attending'
    }
  },
  {
    id: 'g2',
    name: 'Anjali Shah',
    phone: '+919912345678',
    side: 'Bride',
    invitedEvents: ['sangeet', 'wedding', 'reception'],
    rsvp: {
      'sangeet': 'Attending',
      'wedding': 'Attending',
      'reception': 'Pending'
    }
  },
  {
    id: 'g3',
    name: 'Ketan Mehta',
    phone: '+919822233344',
    side: 'Groom',
    invitedEvents: ['haldi', 'sangeet', 'wedding', 'reception'],
    rsvp: {
      'haldi': 'Attending',
      'sangeet': 'Attending',
      'wedding': 'Attending',
      'reception': 'Attending'
    }
  },
  {
    id: 'g4',
    name: 'Rohan Deshmukh',
    phone: '+918877665544',
    side: 'Groom',
    invitedEvents: ['sangeet', 'wedding', 'reception'],
    rsvp: {
      'sangeet': 'Attending',
      'wedding': 'Pending',
      'reception': 'Declined'
    }
  },
  {
    id: 'g5',
    name: 'Suhana Patel',
    phone: '+917766554433',
    side: 'Bride',
    invitedEvents: ['haldi', 'sangeet', 'wedding'],
    rsvp: {
      'haldi': 'Pending',
      'sangeet': 'Attending',
      'wedding': 'Attending'
    }
  },
  {
    id: 'g6',
    name: 'Aaditya Singhania',
    phone: '+919445566778',
    side: 'Groom',
    invitedEvents: ['wedding', 'reception'],
    rsvp: {
      'wedding': 'Pending',
      'reception': 'Pending'
    }
  },
  {
    id: 'g7',
    name: 'Dr. Ramesh Kothari',
    phone: '+919001122334',
    side: 'Groom',
    invitedEvents: ['wedding', 'reception'],
    rsvp: {
      'wedding': 'Attending',
      'reception': 'Attending'
    }
  }
];

export const INITIAL_ROOMS: Room[] = [
  { id: 'r1', name: 'Chandra Mahal Suite (Room 101)', capacity: 3 },
  { id: 'r2', name: 'Surya Mahal Suite (Room 102)', capacity: 3 },
  { id: 'r3', name: 'Mayur Villa Cottage (Room 103)', capacity: 4 },
  { id: 'r4', name: 'Sheesh Mahal Room (Room 201)', capacity: 2 },
  { id: 'r5', name: 'Kamal Mahal Room (Room 202)', capacity: 2 }
];

export const INITIAL_ROOM_ASSIGNMENTS: { [guestId: string]: string } = {
  'g1': 'r1',
  'g3': 'r2'
};

export const INITIAL_TRANSPORT: TransportRecord[] = [
  {
    id: 't1',
    guestName: 'Rajendra Prasad Helly-Uncle',
    arrivalDateTime: '2026-11-15T10:30',
    travelMode: 'Indigo 6E-2401 Flight',
    assignedCab: 'Innova Gold (Driver: Mukesh - +919100011223)'
  },
  {
    id: 't2',
    guestName: 'Anjali Shah',
    arrivalDateTime: '2026-11-15T15:45',
    travelMode: 'Shatabdi Express C4/Seat 32',
    assignedCab: 'Etios White (Driver: Satinder - +919222333444)'
  },
  {
    id: 't3',
    guestName: 'Ketan Mehta Devansh-Chacha',
    arrivalDateTime: '2026-11-15T18:00',
    travelMode: 'Air India AI-807 Flight',
    assignedCab: 'Innova Gold (Driver: Mukesh - +919100011223)'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'tk1',
    name: 'Arrange Rose Petal showers for Phere entrance',
    assignedTo: 'Vikram Mehta (Lead Cousin)',
    deadline: '2026-11-17',
    status: 'In Progress'
  },
  {
    id: 'tk2',
    name: 'Verify DJ and Sound setup in Sangeet Hall',
    assignedTo: 'Nisha Shah (Bride Sister)',
    deadline: '2026-11-16',
    status: 'To-Do'
  },
  {
    id: 'tk3',
    name: 'Coordinate Airport/Station pickups for VIP relatives',
    assignedTo: 'Siddharth Dave (Groom Friend)',
    deadline: '2026-11-15',
    status: 'Done'
  },
  {
    id: 'tk4',
    name: 'Distribute Welcome Hampers in all assigned Guest Rooms',
    assignedTo: 'Ruhi Patel (Cousin Crew)',
    deadline: '2026-11-15',
    status: 'In Progress'
  }
];

export const INITIAL_BUDGET = {
  totalBudget: 4500000 // INR 45 Lakhs (or currency-blind 4.5M)
};

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'e1',
    category: 'Palace Venue Booking & Rooms',
    vendorName: 'Royal Palace Resort & Spa',
    estimatedCost: 1800000,
    paidAmount: 1200000,
    pendingAmount: 600000,
    status: 'Partial'
  },
  {
    id: 'e2',
    category: 'Catering Fees (All events)',
    vendorName: 'Gourmet Legends Catering Group',
    estimatedCost: 1200000,
    paidAmount: 400000,
    pendingAmount: 800000,
    status: 'Partial'
  },
  {
    id: 'e3',
    category: 'Exquisite Decor & Mandap Setup',
    vendorName: 'Marigold & Whimsy Planners',
    estimatedCost: 800000,
    paidAmount: 800000,
    pendingAmount: 0,
    status: 'Paid'
  },
  {
    id: 'e4',
    category: 'Wedding Photography & Cinematic Films',
    vendorName: 'The Royal Canvas Films',
    estimatedCost: 400000,
    paidAmount: 150000,
    pendingAmount: 250000,
    status: 'Partial'
  },
  {
    id: 'e5',
    category: 'High-Energy DJ & Sangeet Entertainments',
    vendorName: 'DJ Rahul & Bollywood Brass Band',
    estimatedCost: 200000,
    paidAmount: 0,
    pendingAmount: 200000,
    status: 'Unpaid'
  },
  {
    id: 'e6',
    category: 'Handcrafted Invites & Sweet Hampers',
    vendorName: 'Crafted Expressions Premium Invites',
    estimatedCost: 100000,
    paidAmount: 100000,
    pendingAmount: 0,
    status: 'Paid'
  }
];
