/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SaaSWedding, Guest, ItineraryEvent } from '../types';

/**
 * Resolves the primary wedding date and palace venue to be used in all wedding
 * correspondence (Official Invite, Save the Date, RSVP Reminders, and WhatsApp templates).
 *
 * Decision Pipeline:
 * 1. An itinerary event explicitly flagged with `isMainWeddingDate: true` or `useForMessaging: true`.
 * 2. An itinerary event whose title matches marriage ceremony keywords (Wedding, Pheras, Varmala, Shaadi, Vivah, Marriage).
 * 3. Primary ceremony event from the uploaded itinerary (sorted chronologically).
 * 4. Fallback to wedding settings (wedding.weddingDate and wedding.resortName).
 */
export function resolveWeddingMessageDateAndVenue(
  itinerary?: ItineraryEvent[] | null,
  wedding?: SaaSWedding | null
): {
  weddingDate: string;        // Formatted human-readable date, e.g. "17th November 2026"
  rawDate: string;            // Raw date, e.g. "2026-11-17"
  venue: string;              // Venue/palace location, e.g. "Royal Palace Lawns"
  eventTitle: string;         // Title of ceremony, e.g. "Pheras & Auspicious Wedding"
  isFromItinerary: boolean;   // True if resolved directly from an itinerary event
  matchedEventId?: string;    // ID of the matched itinerary event
} {
  const fallbackDate = formatWeddingDate(wedding?.weddingDate, '12th December 2026');
  const fallbackVenue = (wedding?.resortName || 'Taj Lake Palace, Udaipur').trim();

  if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
    return {
      weddingDate: fallbackDate,
      rawDate: wedding?.weddingDate || '2026-12-12',
      venue: fallbackVenue,
      eventTitle: 'Wedding Celebration',
      isFromItinerary: false
    };
  }

  // 1. Explicit user checkbox selection: isMainWeddingDate || useForMessaging
  const explicitEvent = itinerary.find(e => e.isMainWeddingDate || e.useForMessaging);
  if (explicitEvent && explicitEvent.date) {
    return {
      weddingDate: formatWeddingDate(explicitEvent.date),
      rawDate: explicitEvent.date,
      venue: (explicitEvent.venue || fallbackVenue).trim(),
      eventTitle: explicitEvent.title || 'Wedding Ceremony',
      isFromItinerary: true,
      matchedEventId: explicitEvent.id
    };
  }

  // 2. Keyword-based matching for main marriage/wedding ceremony (Wedding, Pheras, Shaadi, Vivah, Varmala, Jaimala)
  const marriageRegex = /\b(wedding|pheras?|shaadi|vivah|marriage|varmala|jaimala)\b/i;
  const keywordEvent = itinerary.find(e => marriageRegex.test(e.title || ''));
  if (keywordEvent && keywordEvent.date) {
    return {
      weddingDate: formatWeddingDate(keywordEvent.date),
      rawDate: keywordEvent.date,
      venue: (keywordEvent.venue || fallbackVenue).trim(),
      eventTitle: keywordEvent.title || 'Wedding Ceremony',
      isFromItinerary: true,
      matchedEventId: keywordEvent.id
    };
  }

  // 3. Reception or Ceremony keyword
  const ceremonyRegex = /\b(ceremony|reception|sangeet)\b/i;
  const ceremonyEvent = itinerary.find(e => ceremonyRegex.test(e.title || ''));
  if (ceremonyEvent && ceremonyEvent.date) {
    return {
      weddingDate: formatWeddingDate(ceremonyEvent.date),
      rawDate: ceremonyEvent.date,
      venue: (ceremonyEvent.venue || fallbackVenue).trim(),
      eventTitle: ceremonyEvent.title,
      isFromItinerary: true,
      matchedEventId: ceremonyEvent.id
    };
  }

  // 4. Default to the chronologically sorted primary event
  const sorted = [...itinerary].filter(e => Boolean(e.date)).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const firstEvent = sorted[0];
  if (firstEvent && firstEvent.date) {
    return {
      weddingDate: formatWeddingDate(firstEvent.date),
      rawDate: firstEvent.date,
      venue: (firstEvent.venue || fallbackVenue).trim(),
      eventTitle: firstEvent.title,
      isFromItinerary: true,
      matchedEventId: firstEvent.id
    };
  }

  return {
    weddingDate: fallbackDate,
    rawDate: wedding?.weddingDate || '2026-12-12',
    venue: fallbackVenue,
    eventTitle: 'Wedding Celebration',
    isFromItinerary: false
  };
}

/**
 * Formats any raw date string (ISO timestamps, YYYY-MM-DD, raw strings)
 * into a clean, luxury wedding date string like "12th December 2026".
 * Eliminates all machine artifacts like "T1...", "Z", "00:00:00", etc.
 */
export function formatWeddingDate(rawDate?: string, fallback = '12th December 2026'): string {
  if (!rawDate || typeof rawDate !== 'string') {
    return fallback;
  }

  const trimmed = rawDate.trim();
  if (!trimmed) return fallback;

  // If it's already a clean readable string like "12th December 2026" or "12-14 December 2026"
  if (!trimmed.includes('T') && !trimmed.includes('Z') && /^[0-9]{1,2}(st|nd|rd|th)?\s+[A-Za-z]+(\s+[0-9]{4})?$/i.test(trimmed)) {
    return trimmed;
  }

  // Handle ISO string or YYYY-MM-DD format
  try {
    // Strip time portion if it has T (e.g. 2026-12-12T10:00:00.000Z -> 2026-12-12)
    const dateOnly = trimmed.includes('T') ? trimmed.split('T')[0] : trimmed;
    
    // Check if it's YYYY-MM-DD
    const parts = dateOnly.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const d = new Date(year, monthIndex, day);
      if (!isNaN(d.getTime())) {
        const monthName = d.toLocaleString('en-US', { month: 'long' });
        const getOrdinal = (n: number) => {
          const s = ['th', 'st', 'nd', 'rd'];
          const v = n % 100;
          return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        return `${getOrdinal(day)} ${monthName} ${year}`;
      }
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = parsed.getDate();
      const monthName = parsed.toLocaleString('en-US', { month: 'long' });
      const year = parsed.getFullYear();
      const getOrdinal = (n: number) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      return `${getOrdinal(day)} ${monthName} ${year}`;
    }
  } catch (e) {
    console.warn("Error parsing wedding date:", e);
  }

  // Fallback cleanup: remove any ISO 'T...' or 'Z'
  const cleaned = trimmed.replace(/T.*$/, '').replace(/Z$/, '').trim();
  return cleaned || fallback;
}

/**
 * Extracts Groom (Before Heart) and Bride (After Heart) from wedding config or title.
 * In all wedding correspondence:
 * - Groom Name comes FIRST (before ♥ or &)
 * - Bride Name comes SECOND (after ♥ or &)
 */
export function getCoupleNames(wedding?: SaaSWedding | null): {
  groom: string;
  bride: string;
  coupleHeart: string;
  coupleAnd: string;
} {
  let groom = (wedding?.groomName || '').trim();
  let bride = (wedding?.brideName || '').trim();

  // If missing, parse from title (e.g. "Devansh ♥ Helly" or "Devansh & Helly")
  if ((!groom || !bride) && wedding?.title) {
    const splitParts = wedding.title.split(/[\u2665\u2764\uFE0F&|xX\-+]|\band\b/i).map(s => s.trim());
    if (!groom && splitParts[0]) {
      groom = splitParts[0];
    }
    if (!bride && splitParts[1]) {
      bride = splitParts[1];
    }
  }

  // Guaranteed clean defaults
  groom = groom || 'Devansh';
  bride = bride || 'Helly';

  return {
    groom,
    bride,
    coupleHeart: `${groom} ♥ ${bride}`,
    coupleAnd: `${groom} & ${bride}`
  };
}

/**
 * Generates personalized message text with 100% exact variable replacements.
 */
export function formatPersonalizedMessage(
  template: string,
  guest: Partial<Guest>,
  wedding?: SaaSWedding | null,
  appBaseUrl?: string,
  itinerary?: ItineraryEvent[] | null
): string {
  const { groom, bride, coupleHeart, coupleAnd } = getCoupleNames(wedding);
  const resolved = resolveWeddingMessageDateAndVenue(itinerary, wedding);
  const resortName = resolved.venue;
  const weddingDate = resolved.weddingDate;
  const gName = (guest?.name || guest?.familyName || 'Valued Guest').trim();
  
  const origin = appBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://tectell.wedding');
  const wId = wedding?.id || '';
  const rsvpLink = `${origin}/${wId}?guestId=${guest?.id || ''}`;
  const websiteLink = `${origin}/${wId}`;

  return template
    .replace(/\{name\}/g, gName)
    .replace(/\{guest_name\}/g, gName)
    .replace(/\{couple\}/g, coupleAnd)
    .replace(/\{couple_heart\}/g, coupleHeart)
    .replace(/\{groom\}/g, groom)
    .replace(/\{bride\}/g, bride)
    .replace(/\{wedding_date\}/g, weddingDate)
    .replace(/\{date\}/g, weddingDate)
    .replace(/\{resort\}/g, resortName)
    .replace(/\{venue\}/g, resortName)
    .replace(/\{rsvp_link\}/g, rsvpLink)
    .replace(/\{website_url\}/g, websiteLink)
    .replace(/\{main_website_url\}/g, websiteLink)
    .replace(/\{wedding_website_url\}/g, websiteLink)
    .replace(/\{wedding_url\}/g, rsvpLink);
}

export interface DynamicMetaParameter {
  type: 'text';
  text: string;
}

/**
 * Builds dynamic body parameters for Meta WhatsApp Cloud API templates.
 * Enforces 100% correct variable placement for all Meta approved templates:
 *
 * 1. Save The Date (rsvp_wedding) - 4 params:
 *    {{1}}: Guest Name ("Akshat")
 *    {{2}}: Groom Name ("Devansh")
 *    {{3}}: Bride Name ("Helly")
 *    {{4}}: Personalized RSVP Portal Link ("https://.../dh_1?guestId=g_sample")
 *
 * 2. Official Wedding Invitation (wedding_official) - 5 params:
 *    {{1}}: Guest Name ("Rahul")
 *    {{2}}: Formatted Wedding Date ("12th December 2026")
 *    {{3}}: Palace Resort / Venue ("Taj Lake Palace, Udaipur")
 *    {{4}}: Couple Names ("Devansh & Helly")
 *    {{5}}: Main Wedding Website Link ("https://.../dh_1" - NOT rsvp portal link)
 *
 * 3. RSVP Reminder (rsvp_reminder) - 5 params:
 *    {{1}}: Guest Name ("Rushil")
 *    {{2}}: Formatted Wedding Date ("12th December 2026")
 *    {{3}}: Palace Resort / Venue ("Taj Lake Palace, Udaipur")
 *    {{4}}: Couple Names ("Devansh & Helly")
 *    {{5}}: Personalized RSVP Portal Link ("https://.../dh_1?guestId=g_sample")
 */
export function buildDynamicParameters(
  count: number,
  gName: string,
  wDate: string,
  rVenue: string,
  cNames: string,
  tLink: string,
  groomStr: string,
  brideStr: string,
  tplType?: string
): DynamicMetaParameter[] {
  if (count <= 0) return [];
  
  // Meta Cloud API strictly forbids newlines (\r, \n), tabs, or empty values in body parameters
  const cleanParam = (val: string, fallback: string) => {
    const s = String(val || fallback).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return s.length > 0 ? s : fallback;
  };

  const safeGName = cleanParam(gName, 'Valued Guest');
  const safeWDate = cleanParam(wDate, '12th December 2026');
  const safeVenue = cleanParam(rVenue, 'Taj Lake Palace, Udaipur');
  const safeCouple = cleanParam(cNames || `${groomStr || 'Devansh'} & ${brideStr || 'Helly'}`, 'Devansh & Helly');
  const safeGroom = cleanParam(groomStr, 'Devansh');
  const safeBride = cleanParam(brideStr, 'Helly');
  const safeLink = cleanParam(tLink, 'https://tectell.wedding');

  if (count === 1) {
    return [{ type: 'text', text: safeGName }];
  }
  if (count === 2) {
    return [
      { type: 'text', text: safeGName },
      { type: 'text', text: safeLink }
    ];
  }

  const isSaveDate = tplType === 'save_the_date' || (tplType && (tplType.includes('save') || tplType.includes('rsvp_wedding')));
  const isOfficial = tplType === 'official_invite' || (tplType && (tplType.includes('official') || tplType.includes('invite')));
  const isReminder = tplType === 'rsvp_reminder' || (tplType && tplType.includes('remind'));

  // Ensure Official Invite uses the clean main website link (no ?guestId= query string)
  const resolvedLink = isOfficial ? safeLink.split('?guestId=')[0] : safeLink;

  if (isSaveDate) {
    if (count === 3) {
      // 3 params: Guest, Couple (Groom ♥ Bride), Link
      return [
        { type: 'text', text: safeGName },
        { type: 'text', text: `${safeGroom} ♥ ${safeBride}` },
        { type: 'text', text: safeLink }
      ];
    }
    if (count === 4) {
      // 4 params (Standard approved format for save_the_date):
      // {{1}}: Guest ("Rahul"), {{2}}: Groom ("Devansh"), {{3}}: Bride ("Helly"), {{4}}: Personalized RSVP Link
      return [
        { type: 'text', text: safeGName },
        { type: 'text', text: safeGroom },
        { type: 'text', text: safeBride },
        { type: 'text', text: safeLink }
      ];
    }
    if (count === 5) {
      // 5 params: Can be either standard wedding matrix (Guest, Date, Venue, Couple, Link) or (Guest, Groom, Bride, Date, Link)
      return [
        { type: 'text', text: safeGName },
        { type: 'text', text: safeWDate },
        { type: 'text', text: safeVenue },
        { type: 'text', text: safeCouple },
        { type: 'text', text: safeLink }
      ];
    }
    if (count >= 6) {
      return [
        { type: 'text', text: safeGName },
        { type: 'text', text: safeWDate },
        { type: 'text', text: safeVenue },
        { type: 'text', text: safeCouple },
        { type: 'text', text: safeLink },
        { type: 'text', text: safeGroom }
      ];
    }
  }

  if (isOfficial || isReminder) {
    if (count === 3) {
      return [
        { type: 'text', text: safeGName },
        { type: 'text', text: safeCouple },
        { type: 'text', text: resolvedLink }
      ];
    }
    if (count === 4) {
      // 4 params: Guest, Date, Venue, Link
      return [
        { type: 'text', text: safeGName },
        { type: 'text', text: safeWDate },
        { type: 'text', text: safeVenue },
        { type: 'text', text: resolvedLink }
      ];
    }
    if (count === 5) {
      // Exact Meta Approved format for official_invite & rsvp_reminder:
      // {{1}}: Guest Name ("Rahul" / "Rushil")
      // {{2}}: Wedding Date ("12th December 2026")
      // {{3}}: Venue ("Taj Lake Palace, Udaipur")
      // {{4}}: Couple Names ("Devansh & Helly")
      // {{5}}: Link (Main Website Link for official_invite, Personalized RSVP Portal Link for rsvp_reminder)
      return [
        { type: 'text', text: safeGName },
        { type: 'text', text: safeWDate },
        { type: 'text', text: safeVenue },
        { type: 'text', text: safeCouple },
        { type: 'text', text: resolvedLink }
      ];
    }
    if (count >= 6) {
      return [
        { type: 'text', text: safeGName },
        { type: 'text', text: safeWDate },
        { type: 'text', text: safeVenue },
        { type: 'text', text: safeCouple },
        { type: 'text', text: resolvedLink },
        { type: 'text', text: safeGroom }
      ];
    }
  }

  // General fallback for unspecified or custom templates
  if (count === 3) {
    return [
      { type: 'text', text: safeGName },
      { type: 'text', text: safeCouple },
      { type: 'text', text: safeLink }
    ];
  }
  if (count === 4) {
    return [
      { type: 'text', text: safeGName },
      { type: 'text', text: safeGroom },
      { type: 'text', text: safeBride },
      { type: 'text', text: safeLink }
    ];
  }
  if (count === 5) {
    return [
      { type: 'text', text: safeGName },
      { type: 'text', text: safeWDate },
      { type: 'text', text: safeVenue },
      { type: 'text', text: safeCouple },
      { type: 'text', text: safeLink }
    ];
  }
  const fallbackParams: DynamicMetaParameter[] = [
    { type: 'text', text: safeGName },
    { type: 'text', text: safeWDate },
    { type: 'text', text: safeVenue },
    { type: 'text', text: safeCouple },
    { type: 'text', text: safeLink },
    { type: 'text', text: safeGroom }
  ];
  return fallbackParams.slice(0, count);
}

/**
 * Parses event date and time strings accurately into a Date object for reliable sorting and countdown calculation.
 * Handles diverse time formats: "11:00 A.M.", "08:00 P.M.", "4:00PM", "16:00", "7:00 PM", "TBA", etc.
 */
export function parseEventDateTime(dateStr?: string, timeStr?: string): Date {
  if (!dateStr) return new Date('2026-12-18T16:00:00');

  let hours = 12; // Default to noon if no time is specified
  let minutes = 0;

  if (timeStr && typeof timeStr === 'string') {
    // Strip periods from A.M./P.M. to normalize: "11:00 A.M." -> "11:00 AM"
    const normalizedTime = timeStr.replace(/\./g, '').trim();

    // 24-hour format: "16:00", "09:30"
    const match24 = normalizedTime.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      hours = parseInt(match24[1], 10);
      minutes = parseInt(match24[2], 10);
    } else {
      // 12-hour format with minutes: "11:00 AM", "08:00 PM", "4:00PM"
      const match12 = normalizedTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      if (match12) {
        hours = parseInt(match12[1], 10);
        minutes = parseInt(match12[2], 10);
        const ampm = match12[3];
        if (ampm) {
          if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
      } else {
        // Hour only with AM/PM: "4PM", "11 AM"
        const singleHourMatch = normalizedTime.match(/(\d{1,2})\s*(am|pm)/i);
        if (singleHourMatch) {
          hours = parseInt(singleHourMatch[1], 10);
          minutes = 0;
          const ampm = singleHourMatch[2];
          if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        }
      }
    }
  }

  // Extract date components
  const cleanDateStr = dateStr.split('T')[0].trim();
  const parts = cleanDateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day, hours, minutes, 0, 0);
    if (!isNaN(dateObj.getTime())) {
      return dateObj;
    }
  }

  const fallback = new Date(dateStr);
  if (!isNaN(fallback.getTime())) {
    fallback.setHours(hours, minutes, 0, 0);
    return fallback;
  }
  return new Date('2026-12-18T16:00:00');
}

/**
 * Robustly sorts itinerary events in ascending chronological order by date and time.
 */
export function sortItineraryEvents(events: ItineraryEvent[]): ItineraryEvent[] {
  if (!events || !Array.isArray(events)) return [];
  return [...events].sort((a, b) => {
    const timeA = parseEventDateTime(a.date, a.time).getTime();
    const timeB = parseEventDateTime(b.date, b.time).getTime();
    return timeA - timeB;
  });
}
