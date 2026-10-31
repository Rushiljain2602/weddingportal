/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ItineraryEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  dressCode: string;
  endTime?: string;
  googleMapsUrl?: string;
  isMainWeddingDate?: boolean; // When true, this event's date and venue are prioritized for WhatsApp invitations & reminders
  useForMessaging?: boolean;   // Alias/flag for message template date integration
}

export interface Guest {
  id: string;
  name: string;
  familyName?: string;
  phone: string;
  side: 'Bride' | 'Groom';
  invitedEvents: string[]; // List of ItineraryEvent IDs
  rsvp: { [eventId: string]: 'Pending' | 'Attending' | 'Declined' };
  totalFamilyMembers?: number;
  totalAdults?: number;
  totalChildren?: number;
  isVIP?: boolean;
  specialRequests?: string;
  memberRooms?: { [memberKey: string]: string }; // individual member index to roomId
  memberNames?: string[]; // individual member customized names
  checkInDate?: string; // Optional manual check-in override
  checkOutDate?: string; // Optional manual check-out override
  inviteSent?: boolean; // True if the customized RSVP invite was sent/dispatched
  hasSubmitted?: boolean; // True if the guest already submitted their RSVP
  weddingId?: string; // Tenant reference
  hotelName?: string;
  roomNumber?: string;
  roomId?: string;
  isRoomApproved?: boolean;
  confirmedAdults?: number;
  confirmedChildren?: number;
  rsvpStatus?: 'Pending' | 'Attending' | 'Declined';
  pollAnswer?: string;
  warningTag?: string;
  isManualOverride?: boolean;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  hotelName?: string;
  isMaintenance?: boolean;
}

export interface TransportRecord {
  id: string;
  guestName: string;
  arrivalDateTime: string;
  travelMode: string;
  assignedCab: string;
}

export interface Task {
  id: string;
  name: string;
  assignedTo: string;
  deadline: string;
  status: 'To-Do' | 'In Progress' | 'Done';
}

export interface Expense {
  id: string;
  category: string;
  vendorName: string;
  estimatedCost: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: 'Admin' | 'Organizer' | 'Coordinator';
  isAdmin?: boolean;
}

export interface SaaSWedding {
  id: string; // unique wedding id (slug)
  title: string; // wedding title e.g. "Devansh ♥ Helly"
  resortName: string; // e.g. "Udaipur Palace Resort Hub"
  colorTheme: 'emerald' | 'rose' | 'indigo' | 'amber' | 'burgundy';
  totalBudget: number;
  status: 'active' | 'locked';
  ownerName: string;
  adminEmail: string;
  adminPassword?: string;
  createdAt: string;
  brideName?: string;
  groomName?: string;
  activeMonths?: number;
  expiresAt?: string;
  livePhotoWallEnabled?: boolean;
  weddingDate?: string;
  heroImageUrl?: string;
  hostName1?: string;
  hostPhone1?: string;
  hostName2?: string;
  hostPhone2?: string;
  heroIntroText?: string;
  invitationTheme?: string;
  customInvitationImage?: string;
  saveTheDateTheme?: string;
  customSaveTheDateImage?: string;
  saveTheDateTemplate?: string;
  officialInvitationTemplate?: string;
  rsvpReminderTemplate?: string;
  whatsappToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  whatsappDefaultCountryCode?: string;
  whatsappSendMode?: 'text' | 'template';
  whatsappTemplateName?: string;
  whatsappSaveDateTemplateName?: string;
  whatsappOfficialTemplateName?: string;
  whatsappReminderTemplateName?: string;
  whatsappTemplateLanguage?: string;
  whatsappTemplateVarCount?: number;
  whatsappIncludeButton?: boolean;
  whatsappParam1?: string;
  whatsappParam2?: string;
  whatsappParam3?: string;
  useUtilitySafeDelivery?: boolean;
}

