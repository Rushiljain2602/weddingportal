/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Guest } from '../types';
import { formatWeddingDate, getCoupleNames, buildDynamicParameters, resolveWeddingMessageDateAndVenue } from '../utils/formatters';
import { 
  Send, 
  Sparkles, 
  Smartphone, 
  Copy, 
  RefreshCw, 
  Eye, 
  Check, 
  Settings, 
  ShieldCheck, 
  Zap, 
  Info,
  Terminal,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Search,
  ExternalLink,
  Key,
  HelpCircle,
  CheckCircle
} from 'lucide-react';
import {
  formatToCleanE164,
  sanitizeParamText,
  isSandboxTestPhone,
  sendWhatsAppMessage,
  buildWhatsAppPayload,
  getMetaActionableAdvice,
  META_SANDBOX_PHONE_IDS
} from '../services/whatsappCloudApi';

type SubTabId = 'templates' | 'sender';
type CampaignType = 'save_the_date' | 'official_invite' | 'rsvp_reminder';

interface MetaDiscoveredTemplate {
  name: string;
  status: string;
  language: string;
  category?: string;
  bodyParamsCount: number;
  headerType: 'text' | 'image' | 'none';
  hasUrlButton?: boolean;
  urlButtonIndex?: string;
  urlButtonBase?: string;
  rawText?: string;
}

export default function Invitations() {
  const { 
    guests, 
    updateGuest, 
    currentWedding, 
    updateSaaSWedding,
    currentWeddingId,
    itinerary
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('templates');
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<CampaignType>('save_the_date');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Auto-scroll ref for terminal logs
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Derive Wedding Metadata from uploaded itinerary events (or fallback to wedding settings)
  const { groom, bride, coupleHeart, coupleAnd } = getCoupleNames(currentWedding);
  const resolvedItinerary = resolveWeddingMessageDateAndVenue(itinerary, currentWedding);
  const weddingDate = resolvedItinerary.weddingDate;
  const resortName = resolvedItinerary.venue;

  const weddingUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tectell.wedding';
    if (currentWeddingId) {
      return `${origin}/${currentWeddingId}`;
    }
    return `${origin}/demo`;
  }, [currentWeddingId]);

  // Standardized, high-conversion WhatsApp message texts (Read-only reference matching approved Meta templates)
  const templateDefinitions: Record<CampaignType, {
    title: string;
    icon: string;
    templateCode: string;
    description: string;
    paramSummary: string;
    text: string;
  }> = {
    save_the_date: {
      title: 'Save the Date Announcement',
      icon: '💌',
      templateCode: 'rsvp_wedding',
      description: 'Sent early to guests to request them to reserve their calendar for the celebration.',
      paramSummary: `Approved 4 Parameters: 1. Guest Name ({{1}}), 2. Groom (${groom}), 3. Bride (${bride}), 4. Personalized RSVP Portal Link ({{4}}) • Pure Text (No Header & No Footer)`,
      text: `Hi {guest_name}! 🌟 We are thrilled to invite you to the wedding of {groom} ♥ {bride}. Please check your personalized itinerary & submit your RSVP details here: {wedding_url}.\n We look forward to celebrating with you!`
    },
    official_invite: {
      title: 'Official Wedding Invitation',
      icon: '👑',
      templateCode: 'wedding_official',
      description: 'Formal celebration invite containing full itinerary, hotel accommodations, and event schedule.',
      paramSummary: `Approved 5 Parameters: 1. Guest Name, 2. Wedding Date (${weddingDate}), 3. Palace Venue (${resortName}), 4. Couple Names (${groom} & ${bride}), 5. Main Wedding Website Link`,
      text: `Dearest {guest_name},\n\nWith immense joy and the divine blessings of our families, we cordially invite you to grace the grand celebration of the wedding of ${groom} & ${bride}.\n\n✨ *CELEBRATION DETAILS* ✨\n📅 *Wedding Date:* ${weddingDate}\n🏰 *Venue:* ${resortName}\n\nYour personalized itinerary, hotel accommodations, and event schedule are available on your private guest portal:\n🔗 *Guest Portal:* {wedding_website_url}\n\nWe eagerly look forward to celebrating this special milestone with you!\n\nWarmest regards,\nfooter - Tectell Wedding Management`
    },
    rsvp_reminder: {
      title: 'RSVP Follow-up Reminder',
      icon: '⏳',
      templateCode: 'rsvp_reminder',
      description: 'Gentle follow-up sent to guests with pending attendance status before finalizing headcount.',
      paramSummary: `Approved 5 Parameters: 1. Guest Name, 2. Wedding Date (${weddingDate}), 3. Palace Venue (${resortName}), 4. Couple Names (${groom} & ${bride}), 5. Personalized RSVP Portal Link`,
      text: `⏳ *RSVP REMINDER* ⏳\n\nDear {guest_name},\n\nWe are eagerly counting down the days to the wedding of ${groom} & ${bride}!\n\n📅 *Date:* ${weddingDate}\n🏰 *Venue:* ${resortName}\n\nAs we put the finishing touches on our celebration, please take a moment to RSVP on our wedding website.\n🔗 {wedding_url}\n\nYour prompt response helps us host you seamlessly.\n\nWarm regards,\nfooter - Tectell Wedding Management`
    }
  };

  // API Settings State
  const DEFAULT_WA_TOKEN = '';
  const DEFAULT_WA_PHONE_ID = '1173958792477522';
  const DEFAULT_WA_WABA_ID = '2416787895513714';

  const [whatsappToken, setWhatsappToken] = useState(DEFAULT_WA_TOKEN);
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState(DEFAULT_WA_PHONE_ID);
  const [whatsappBusinessAccountId, setWhatsappBusinessAccountId] = useState<string>(DEFAULT_WA_WABA_ID);
  const [whatsappDefaultCountryCode, setWhatsappDefaultCountryCode] = useState<string>('91');
  const [whatsappSaveDateTemplateName, setWhatsappSaveDateTemplateName] = useState('rsvp_wedding');
  const [whatsappOfficialTemplateName, setWhatsappOfficialTemplateName] = useState('wedding_official');
  const [whatsappReminderTemplateName, setWhatsappReminderTemplateName] = useState('rsvp_reminder');
  const [whatsappTemplateLanguage, setWhatsappTemplateLanguage] = useState('en');

  // Smart Utility Fallback Mode:
  // When enabled, sends the selected template (rsvp_wedding or wedding_official) first,
  // and only falls back to rsvp_reminder if Meta rejects the marketing template.
  // When disabled (default), sends the selected template directly without fallback.
  const [useUtilitySafeDelivery, setUseUtilitySafeDelivery] = useState<boolean>(
    currentWedding?.useUtilitySafeDelivery === true
  );

  // Discovered Meta Templates from Account
  const [discoveredTemplates, setDiscoveredTemplates] = useState<MetaDiscoveredTemplate[]>([]);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);

  // Helper to fetch live approved message templates from Meta WABA
  const fetchLiveMetaTemplates = async (
    token?: string,
    phoneId?: string,
    wabaId?: string
  ): Promise<MetaDiscoveredTemplate[]> => {
    const cleanToken = (token ?? whatsappToken).trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
    const cleanPhoneId = (phoneId ?? whatsappPhoneNumberId).trim().replace(/[^0-9]/g, '');
    const cleanWabaId = (wabaId ?? whatsappBusinessAccountId).trim().replace(/[^0-9]/g, '') || DEFAULT_WA_WABA_ID;

    if (!cleanToken || !cleanPhoneId) return [];

    const effectiveWabaId = cleanWabaId || '2416787895513714';

    try {
      const tplRes = await fetch(
        `https://graph.facebook.com/v18.0/${effectiveWabaId}/message_templates?fields=name,status,language,components,category&limit=100&access_token=${cleanToken}`
      );
      const tplData = await tplRes.json();
      if (tplRes.ok && Array.isArray(tplData.data)) {
        const templatesFound: MetaDiscoveredTemplate[] = tplData.data.map((item: any) => {
          const bodyComp = item.components?.find((c: any) => c.type === 'BODY');
          const headerComp = item.components?.find((c: any) => c.type === 'HEADER');
          const buttonsComp = item.components?.find((c: any) => c.type === 'BUTTONS');
          const bodyText = bodyComp?.text || '';

          const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
          const maxIndex = matches.reduce((max: number, m: string) => {
            const num = parseInt(m.replace(/\D/g, ''), 10);
            return num > max ? num : max;
          }, matches.length);

          let headerType: 'text' | 'image' | 'none' = 'none';
          if (headerComp?.format === 'TEXT' && (headerComp.text?.includes('{{1}}') || headerComp.example)) {
            headerType = 'text';
          } else if (headerComp?.format === 'IMAGE') {
            headerType = 'image';
          }

          let hasUrlButton = false;
          let urlButtonIndex = '0';
          let urlButtonBase = '';

          if (buttonsComp?.buttons && Array.isArray(buttonsComp.buttons)) {
            const btnIdx = buttonsComp.buttons.findIndex((b: any) => 
              b.type === 'URL' && (b.url?.includes('{{1}}') || b.url?.includes('{{') || b.example)
            );
            if (btnIdx !== -1) {
              hasUrlButton = true;
              urlButtonIndex = String(btnIdx);
              urlButtonBase = buttonsComp.buttons[btnIdx].url || '';
            }
          }

          return {
            name: item.name,
            status: item.status,
            language: item.language,
            category: item.category,
            bodyParamsCount: maxIndex,
            headerType,
            hasUrlButton,
            urlButtonIndex,
            urlButtonBase,
            rawText: bodyText
          };
        });

        setDiscoveredTemplates(templatesFound);
        return templatesFound;
      }
    } catch (tplErr) {
      console.warn('Could not query message_templates:', tplErr);
    }
    return [];
  };

  // Real-time Meta Token & Connection Health Status
  const [tokenStatus, setTokenStatus] = useState<{
    checking: boolean;
    valid: boolean;
    errorCode?: number;
    errorMessage?: string;
    phoneDisplay?: string;
  }>({ checking: false, valid: false });

  const checkTokenHealth = async (tok?: string, phone?: string) => {
    const cleanToken = (tok ?? whatsappToken).trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
    const cleanPhoneId = (phone ?? whatsappPhoneNumberId).trim().replace(/[^0-9]/g, '');

    if (!cleanToken || !cleanPhoneId) {
      setTokenStatus({
        checking: false,
        valid: false,
        errorMessage: 'Missing Meta Access Token or Phone Number ID.'
      });
      return;
    }

    setTokenStatus(prev => ({ ...prev, checking: true }));

    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${cleanPhoneId}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${cleanToken}`);
      const data = await res.json();

      if (res.ok && data.id) {
        setTokenStatus({
          checking: false,
          valid: true,
          phoneDisplay: data.display_phone_number || data.verified_name || cleanPhoneId
        });
        // Auto-discover live templates in background
        fetchLiveMetaTemplates(cleanToken, cleanPhoneId, whatsappBusinessAccountId);
      } else {
        const errCode = data?.error?.code;
        const errMsg = data?.error?.message || 'Meta Authentication error';
        setTokenStatus({
          checking: false,
          valid: false,
          errorCode: errCode,
          errorMessage: errMsg
        });
      }
    } catch (e: any) {
      setTokenStatus({
        checking: false,
        valid: false,
        errorMessage: e?.message || 'Network error verifying token'
      });
    }
  };

  // Bulk Broadcaster State
  const [senderTemplateType, setSenderTemplateType] = useState<CampaignType>('save_the_date');
  const [targetFilter, setTargetFilter] = useState<'all' | 'pending' | 'attending' | 'declined' | 'bride' | 'groom' | 'vip'>('all');
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([
    `[Terminal Ready] Select a campaign and target segment above, then click "Broadcast to Guests" to launch.`
  ]);

  // Testing & Connection Verification State
  const [testCredsLoading, setTestCredsLoading] = useState(false);
  const [testCredsResult, setTestCredsResult] = useState<{
    success: boolean;
    isTestNumber?: boolean;
    phoneDisplay?: string;
    verifiedName?: string;
    wabaId?: string;
    templatesCount?: number;
    message: string;
  } | null>(null);

  // Sync state from wedding document
  useEffect(() => {
    if (currentWedding) {
      const initialToken = currentWedding.whatsappToken ? currentWedding.whatsappToken.trim().replace(/^["']|["']$/g, '') : '';
      const initialPhoneId = currentWedding.whatsappPhoneNumberId ? currentWedding.whatsappPhoneNumberId.trim().replace(/[^\d]/g, '') : DEFAULT_WA_PHONE_ID;
      
      setWhatsappToken(initialToken);
      setWhatsappPhoneNumberId(initialPhoneId);
      setWhatsappBusinessAccountId(currentWedding.whatsappBusinessAccountId ? currentWedding.whatsappBusinessAccountId.trim().replace(/[^\d]/g, '') : '');
      setWhatsappDefaultCountryCode(currentWedding.whatsappDefaultCountryCode ? currentWedding.whatsappDefaultCountryCode.trim().replace(/[^\d]/g, '') : '91');
      
      const rawSaveDate = currentWedding.whatsappSaveDateTemplateName ? currentWedding.whatsappSaveDateTemplateName.trim() : '';
      const rawOfficial = currentWedding.whatsappOfficialTemplateName ? currentWedding.whatsappOfficialTemplateName.trim() : '';
      const rawReminder = currentWedding.whatsappReminderTemplateName ? currentWedding.whatsappReminderTemplateName.trim() : '';

      setWhatsappSaveDateTemplateName(rawSaveDate && rawSaveDate !== 'save_the_date' ? rawSaveDate : 'rsvp_wedding');
      setWhatsappOfficialTemplateName(rawOfficial && rawOfficial !== 'official_invite' ? rawOfficial : 'wedding_official');
      setWhatsappReminderTemplateName(rawReminder || 'rsvp_reminder');
      setWhatsappTemplateLanguage((currentWedding.whatsappTemplateLanguage || 'en').trim());
      setUseUtilitySafeDelivery(currentWedding.useUtilitySafeDelivery === true);

      if (initialToken && initialPhoneId) {
        checkTokenHealth(initialToken, initialPhoneId);
      }
    }
  }, [currentWedding]);

  const handleToggleUtilitySafeDelivery = async (nextVal: boolean) => {
    setUseUtilitySafeDelivery(nextVal);
    if (currentWedding && updateSaaSWedding) {
      await updateSaaSWedding({
        ...currentWedding,
        useUtilitySafeDelivery: nextVal
      });
      setSimulationLogs(prev => [
        ...prev,
        nextVal
          ? `⚡ [Delivery Route Updated] Smart Utility Fallback ENABLED: Broadcaster will send your selected template directly, and only use 'rsvp_reminder' as a safety net if Meta rejects marketing templates.`
          : `📢 [Delivery Route Updated] Direct Meta Template Route ENABLED: Messages strictly send directly using their native template names (Save the Date: rsvp_wedding, Official Invite: wedding_official, Reminder: rsvp_reminder).`
      ]);
    }
  };

  // Auto-scroll logs to bottom whenever logs change
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simulationLogs]);

  // Save updated Meta settings to database
  const handleSaveSettings = async () => {
    if (!currentWedding || !updateSaaSWedding) return;
    setSaveLoading(true);
    try {
      const cleanToken = whatsappToken.trim().replace(/^["']|["']$/g, '');
      const cleanPhoneId = whatsappPhoneNumberId.trim().replace(/[^\d]/g, '');
      const cleanWabaId = whatsappBusinessAccountId.trim().replace(/[^\d]/g, '');
      const cleanCountryCode = whatsappDefaultCountryCode.trim().replace(/[^\d]/g, '');
      const cleanTemplateLang = whatsappTemplateLanguage.trim();
      const cleanSaveDateTpl = whatsappSaveDateTemplateName.trim();
      const cleanOfficialTpl = whatsappOfficialTemplateName.trim();
      const cleanReminderTpl = whatsappReminderTemplateName.trim();

      setWhatsappToken(cleanToken);
      setWhatsappPhoneNumberId(cleanPhoneId);
      setWhatsappBusinessAccountId(cleanWabaId);
      setWhatsappDefaultCountryCode(cleanCountryCode);
      setWhatsappTemplateLanguage(cleanTemplateLang);
      setWhatsappSaveDateTemplateName(cleanSaveDateTpl);
      setWhatsappOfficialTemplateName(cleanOfficialTpl);
      setWhatsappReminderTemplateName(cleanReminderTpl);

      await updateSaaSWedding({
        ...currentWedding,
        whatsappToken: cleanToken,
        whatsappPhoneNumberId: cleanPhoneId,
        whatsappBusinessAccountId: cleanWabaId,
        whatsappDefaultCountryCode: cleanCountryCode,
        whatsappTemplateLanguage: cleanTemplateLang,
        whatsappSaveDateTemplateName: cleanSaveDateTpl,
        whatsappOfficialTemplateName: cleanOfficialTpl,
        whatsappReminderTemplateName: cleanReminderTpl,
        useUtilitySafeDelivery
      });

      await checkTokenHealth(cleanToken, cleanPhoneId);

      setSimulationLogs(prev => [
        ...prev,
        `✓ [Settings Saved] Meta API credentials successfully updated & connection checked.`
      ]);
      setShowSettingsDrawer(false);
    } catch (e: any) {
      setSimulationLogs(prev => [
        ...prev,
        `❌ [Settings Error] Failed to update settings: ${e?.message || e}`
      ]);
    } finally {
      setSaveLoading(false);
    }
  };

  // Test Meta API Connection and inspect live registered templates safely
  const handleTestMetaCredentials = async () => {
    const cleanToken = whatsappToken.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
    const cleanPhoneId = whatsappPhoneNumberId.trim().replace(/[^0-9]/g, '');
    const cleanWabaId = whatsappBusinessAccountId.trim().replace(/[^0-9]/g, '');

    if (cleanToken !== whatsappToken) setWhatsappToken(cleanToken);
    if (cleanPhoneId !== whatsappPhoneNumberId) setWhatsappPhoneNumberId(cleanPhoneId);

    if (!cleanToken || !cleanPhoneId) {
      setTestCredsResult({
        success: false,
        message: 'Please enter both Meta Access Token and Phone Number ID.'
      });
      return;
    }

    setTestCredsLoading(true);
    setFetchingTemplates(true);
    setTestCredsResult(null);

    try {
      // Valid Meta Phone Number node fields (standard Graph API)
      const res = await fetch(`https://graph.facebook.com/v18.0/${cleanPhoneId}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${cleanToken}`);
      const data = await res.json();

      if (res.ok && data.id) {
        const isTestNumber = cleanPhoneId === '1176823055522728' || (data.display_phone_number && data.display_phone_number.includes('555-025-3483'));
        const phoneDisplay = data.display_phone_number || data.verified_name || cleanPhoneId;
        const verifiedName = data.verified_name || 'Meta Connected Phone';
        
        let templatesFound: MetaDiscoveredTemplate[] = [];

        const effectiveWabaId = cleanWabaId || '2416787895513714';
        if (!cleanWabaId && effectiveWabaId) {
          setWhatsappBusinessAccountId(effectiveWabaId);
        }

        // Query message templates from WABA
        if (effectiveWabaId) {
          try {
            const tplRes = await fetch(`https://graph.facebook.com/v18.0/${effectiveWabaId}/message_templates?limit=100&access_token=${cleanToken}`);
            const tplData = await tplRes.json();
            if (tplRes.ok && Array.isArray(tplData.data)) {
              templatesFound = tplData.data.map((item: any) => {
                const bodyComp = item.components?.find((c: any) => c.type === 'BODY');
                const headerComp = item.components?.find((c: any) => c.type === 'HEADER');
                const bodyText = bodyComp?.text || '';
                
                const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
                const maxIndex = matches.reduce((max: number, m: string) => {
                  const num = parseInt(m.replace(/\D/g, ''), 10);
                  return num > max ? num : max;
                }, matches.length);

                let headerType: 'text' | 'none' = 'none';
                if (headerComp?.format === 'TEXT' && (headerComp.text?.includes('{{1}}') || headerComp.example)) {
                  headerType = 'text';
                }

                return {
                  name: item.name,
                  status: item.status,
                  language: item.language,
                  category: item.category,
                  bodyParamsCount: maxIndex,
                  headerType,
                  rawText: bodyText
                };
              });
              setDiscoveredTemplates(templatesFound);
            }
          } catch (tplErr) {
            console.warn('Could not query message_templates:', tplErr);
          }
        }

        const templateSummary = templatesFound.length > 0
          ? ` (${templatesFound.length} approved templates discovered in Meta account)`
          : '';

        if (isTestNumber) {
          setTestCredsResult({
            success: true,
            isTestNumber: true,
            phoneDisplay,
            verifiedName,
            wabaId: effectiveWabaId,
            templatesCount: templatesFound.length,
            message: `⚠️ Verified: Meta Sandbox Test Phone (+${phoneDisplay})${templateSummary}. Sandbox numbers only deliver to recipient numbers whitelisted in your Meta Developer Console.`
          });
        } else {
          setTestCredsResult({
            success: true,
            isTestNumber: false,
            phoneDisplay,
            verifiedName,
            wabaId: effectiveWabaId,
            templatesCount: templatesFound.length,
            message: `🎉 Verified: Live Meta WhatsApp Phone (+${phoneDisplay}) [${verifiedName}]${templateSummary}. Connected & ready for instant broadcast!`
          });
        }
      } else {
        const errCode = data?.error?.code;
        const errMsg = data?.error?.message || 'Failed to authenticate with Meta Graph API';
        setTestCredsResult({
          success: false,
          message: `🚨 Meta API Error (${errCode || 'Failed'}): ${errMsg}`
        });
      }
    } catch (err: any) {
      setTestCredsResult({
        success: false,
        message: `❌ Network error: ${err?.message || 'Could not reach graph.facebook.com'}`
      });
    } finally {
      setTestCredsLoading(false);
      setFetchingTemplates(false);
    }
  };

  // Quick map a discovered template to an active campaign
  const handleAssignDiscoveredTemplate = (tpl: MetaDiscoveredTemplate, campaign: CampaignType) => {
    if (campaign === 'save_the_date') setWhatsappSaveDateTemplateName(tpl.name);
    if (campaign === 'official_invite') setWhatsappOfficialTemplateName(tpl.name);
    if (campaign === 'rsvp_reminder') setWhatsappReminderTemplateName(tpl.name);
    if (tpl.language) setWhatsappTemplateLanguage(tpl.language);
    
    setSimulationLogs(prev => [
      ...prev,
      `✓ [Template Mapped] Selected '${tpl.name}' (${tpl.bodyParamsCount} params, ${tpl.language}) for ${templateDefinitions[campaign].title}. Click 'Save API Settings' to persist.`
    ]);
  };

  // Filter Target Guest Segment
  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      if (targetFilter === 'all') return true;
      if (targetFilter === 'pending') return g.rsvpStatus === 'Pending' || !g.rsvpStatus;
      if (targetFilter === 'attending') return g.rsvpStatus === 'Attending';
      if (targetFilter === 'declined') return g.rsvpStatus === 'Declined';
      if (targetFilter === 'bride') return g.side === 'Bride';
      if (targetFilter === 'groom') return g.side === 'Groom';
      if (targetFilter === 'vip') return g.isVIP;
      return true;
    });
  }, [guests, targetFilter]);

  // Replace Template Placeholders for preview
  const getRenderedTemplateText = (tplType: CampaignType, sampleGuest?: Partial<Guest>) => {
    const raw = templateDefinitions[tplType].text;
    const gName = sampleGuest?.name || 'Rahul';
    const personalizedLink = `${weddingUrl}?guestId=${sampleGuest?.id || 'sample-guest-1'}`;
    const mainWebsiteLink = weddingUrl;
    const guestLink = tplType === 'official_invite' ? mainWebsiteLink : personalizedLink;
    const coupleNames = tplType === 'save_the_date' ? `${groom} ♥ ${bride}` : `${groom} & ${bride}`;

    return raw
      .replace(/\{guest_name\}/g, gName)
      .replace(/\{name\}/g, gName)
      .replace(/\{couple\}/g, coupleNames)
      .replace(/\{groom\}/g, groom)
      .replace(/\{bride\}/g, bride)
      .replace(/\{wedding_date\}/g, weddingDate)
      .replace(/\{date\}/g, weddingDate)
      .replace(/\{resort\}/g, resortName)
      .replace(/\{venue\}/g, resortName)
      .replace(/\{main_website_url\}/g, mainWebsiteLink)
      .replace(/\{wedding_website_url\}/g, mainWebsiteLink)
      .replace(/\{wedding_url\}/g, guestLink)
      .replace(/\{rsvp_link\}/g, personalizedLink);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // =========================================================================
  // BULK DISPATCH ENGINE WITH EXHAUSTIVE AUTO-REPAIR FOR (#132000 / #132001)
  // =========================================================================
  const handleStartBulkBroadcast = async () => {
    if (simulationActive) return;

    const timeStr = new Date().toLocaleTimeString();
    const campaignMeta = templateDefinitions[senderTemplateType];

    if (filteredGuests.length === 0) {
      setSimulationLogs(prev => [
        ...prev,
        `[${timeStr}] ⚠️ [Warning] No guests found in the '${targetFilter.toUpperCase()}' segment. Please select a segment with guests.`
      ]);
      return;
    }

    const cleanToken = whatsappToken.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
    const cleanPhoneId = whatsappPhoneNumberId.trim().replace(/[^0-9]/g, '');
    const defaultCode = (whatsappDefaultCountryCode || '91').replace(/[^\d]/g, '');
    const hasRealCredentials = Boolean(cleanToken && cleanPhoneId);

    const payloadArchNote = '100% Pure Text-Only Meta Template (No Header Image)';

    setSimulationActive(true);
    setSimulationProgress(0);
    setSimulationLogs([
      `[${timeStr}] 🚀 [Broadcast Started] Launching ${campaignMeta.title} to ${filteredGuests.length} recipient(s)...`,
      `[${timeStr}] 🎯 [Target Segment] ${targetFilter.toUpperCase()} (${filteredGuests.length} guests)`,
      hasRealCredentials
        ? `[${timeStr}] 📡 [API Gateway] Meta Cloud API Live Mode (Phone ID: ${cleanPhoneId})`
        : `[${timeStr}] 📡 [API Gateway] Sandbox Simulation Mode (Configure Meta credentials for live dispatch)`,
      `[${timeStr}] 💬 [Payload Architecture] ${payloadArchNote}`,
      useUtilitySafeDelivery
        ? `[${timeStr}] ⚡ [Smart Utility Fallback Enabled] Disagreeing marketing delivery will fallback to 'rsvp_reminder'. Primary template: '${senderTemplateType === 'save_the_date' ? 'rsvp_wedding' : senderTemplateType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}'`
        : `[${timeStr}] 📢 [Direct Meta Template] Sending '${senderTemplateType === 'save_the_date' ? 'rsvp_wedding' : senderTemplateType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}' directly.`
    ]);

    // Pre-flight check token validity with Meta
    if (hasRealCredentials) {
      setSimulationLogs(prev => [
        ...prev,
        `[${timeStr}] 🔍 [Auth Check] Validating Meta Access Token with Graph API...`
      ]);
      try {
        const preCheckRes = await fetch(`https://graph.facebook.com/v18.0/${cleanPhoneId}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${cleanToken}`);
        const preCheckData = await preCheckRes.json();
        if (!preCheckRes.ok || !preCheckData.id) {
          const errCode = preCheckData?.error?.code;
          const errMsg = preCheckData?.error?.message || 'Meta Authentication Error';
          setTokenStatus({
            checking: false,
            valid: false,
            errorCode: errCode,
            errorMessage: errMsg
          });
          setSimulationActive(false);
          setSimulationLogs(prev => [
            ...prev,
            `🚨 [BROADCAST HALTED - TOKEN ERROR ${errCode || 190}] Meta rejected your Access Token: "${errMsg}".`,
            `🛑 No messages were delivered to phones.`,
            `👉 Paste your fresh Meta Access Token in the banner above and click "Save & Connect Token".`
          ]);
          return;
        } else {
          setTokenStatus({
            checking: false,
            valid: true,
            phoneDisplay: preCheckData.display_phone_number || preCheckData.verified_name || cleanPhoneId
          });
          setSimulationLogs(prev => [
            ...prev,
            `✓ [Auth Verified] Connected to Meta Phone: +${preCheckData.display_phone_number || cleanPhoneId}`
          ]);

          // If no templates discovered yet, discover live from Meta right now
          if (discoveredTemplates.length === 0) {
            try {
              const liveTpls = await fetchLiveMetaTemplates(cleanToken, cleanPhoneId, whatsappBusinessAccountId);
              if (liveTpls.length > 0) {
                setSimulationLogs(prev => [
                  ...prev,
                  `✓ [Live Templates Loaded] Found ${liveTpls.length} approved template(s) in your Meta Business Account.`
                ]);
              }
            } catch (tplLoadErr) {}
          }
        }
      } catch (authErr: any) {
        // Continue if network glitch
      }
    }

    try {
      // Build candidate list with primary user-configured name first, then discovered names, then standard aliases
      const candidateTemplateNames: string[] = (() => {
        let configuredName = '';
        if (senderTemplateType === 'save_the_date') configuredName = (whatsappSaveDateTemplateName || '').trim();
        if (senderTemplateType === 'official_invite') configuredName = (whatsappOfficialTemplateName || '').trim();
        if (senderTemplateType === 'rsvp_reminder') configuredName = (whatsappReminderTemplateName || '').trim();

        const approvedMetaTemplates = (discoveredTemplates.length > 0 ? discoveredTemplates : [])
          .filter(t => t.status === 'APPROVED');

        if (senderTemplateType === 'save_the_date') {
          // Meta registered template name for Save the Date is rsvp_wedding
          const candidates = [
            configuredName || 'rsvp_wedding',
            'rsvp_wedding',
            'save_the_date',
            'savethedate',
            'wedding_rsvp',
            'wedding_save_the_date',
            'save_date',
            ...approvedMetaTemplates.filter(t => t.name === 'rsvp_wedding' || t.name.includes('rsvp') || t.name.includes('save')).map(t => t.name)
          ];
          // If smart utility fallback is enabled, append rsvp_reminder at the very end only as an emergency backup
          if (useUtilitySafeDelivery) {
            candidates.push('rsvp_reminder');
          }
          return Array.from(new Set(candidates.filter(Boolean) as string[]));
        }

        if (senderTemplateType === 'official_invite') {
          // Meta registered template name for Official Invite is wedding_official
          const candidates = [
            configuredName || 'wedding_official',
            'wedding_official',
            'official_invite',
            'wedding_invite',
            'wedding_invitation',
            'official_wedding',
            'wedding_official_invite',
            'official_wedding_invite',
            'invitation',
            'invite',
            ...approvedMetaTemplates.filter(t => t.name === 'wedding_official' || t.name.includes('official') || t.name.includes('invite')).map(t => t.name)
          ];
          // If smart utility fallback is enabled, append rsvp_reminder at the very end only as an emergency backup
          if (useUtilitySafeDelivery) {
            candidates.push('rsvp_reminder');
          }
          return Array.from(new Set(candidates.filter(Boolean) as string[]));
        }

        // rsvp_reminder
        const discoveredReminders = approvedMetaTemplates
          .filter(t => t.name.includes('remind'))
          .map(t => t.name);

        return Array.from(new Set([
          ...discoveredReminders,
          configuredName && configuredName !== 'rsvp_reminder' ? configuredName : null,
          'rsvp_reminder',
          'wedding_reminder',
          'reminder_rsvp',
          'reminder',
          'followup_reminder'
        ].filter(Boolean) as string[]));
      })();

      const primaryTemplateName = candidateTemplateNames[0] || (senderTemplateType === 'official_invite' ? 'wedding_official' : senderTemplateType === 'rsvp_reminder' ? 'rsvp_reminder' : 'rsvp_wedding');

      // Check if this primary template was discovered from Meta account
      const matchedDiscovered = discoveredTemplates.find(t => t.name === primaryTemplateName);

      // Default header type: Strictly 'none' (Pure Text-Only - approved in Meta without header image)
      const defaultHeaderType: 'none' = 'none';

      // Discovered winning format for this specific campaign in this session
      let winningFormat: { 
        templateName: string; 
        paramCount: number; 
        headerType: 'text' | 'none'; 
        lang: string;
        hasUrlButton?: boolean;
      } | null = null;

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < filteredGuests.length; i++) {
        const guest = filteredGuests[i];
        const stepTime = new Date().toLocaleTimeString();

        // Strict E.164 phone formatting
        const cleanPhone = formatToCleanE164(guest.phone || '', defaultCode);

        // Official invite link: Main wedding website link (without ?guestId=)
        // Save the date & RSVP reminder link: Personalized RSVP portal link (with ?guestId=)
        const personalizedRsvpUrl = `${weddingUrl}?guestId=${guest.id}`;
        const mainWebsiteUrl = weddingUrl;
        const targetUrl = senderTemplateType === 'official_invite' ? mainWebsiteUrl : personalizedRsvpUrl;
        const gName = (guest.name || guest.familyName || 'Valued Guest').trim();
        const wDate = weddingDate;
        const rVenue = resortName;
        const cNames = `${groom} & ${bride}`;
        const tLink = targetUrl;

        if ((!cleanPhone || cleanPhone.length < 10) && hasRealCredentials) {
          setSimulationLogs(prev => [
            ...prev,
            `[${stepTime}] ⚠️ [Skipped] ${gName}: Invalid E.164 phone '${guest.phone || 'empty'}'. Minimum 10 digits required.`
          ]);
          failCount++;
        } else if (hasRealCredentials) {
          try {
            const effectiveCampaign = senderTemplateType;

            // 1. FAST PATH: If winning format already discovered for this campaign, use it directly
            if (winningFormat) {
              const bodyParams = buildDynamicParameters(
                winningFormat.paramCount,
                gName,
                wDate,
                rVenue,
                cNames,
                tLink,
                groom,
                bride,
                effectiveCampaign
              );

              const fastRes = await sendWhatsAppMessage({
                phoneNumberId: cleanPhoneId,
                accessToken: cleanToken,
                to: cleanPhone,
                defaultCountryCode: defaultCode,
                templateName: winningFormat.templateName,
                languageCode: winningFormat.lang,
                bodyParameters: bodyParams.map(p => p.text),
                header: (senderTemplateType === 'save_the_date' || winningFormat.headerType === 'none') 
                  ? undefined 
                  : (winningFormat.headerType === 'text' ? { type: 'text', text: gName } : undefined),
                button: (senderTemplateType === 'save_the_date' || !winningFormat.hasUrlButton) ? undefined : {
                  subType: 'url',
                  index: '0',
                  variableValue: guest.id
                }
              });

              if (fastRes.success && fastRes.messageId) {
                successCount++;
                await updateGuest({ ...guest, inviteSent: true });
                const sandboxTag = fastRes.isSandboxTestNumber
                  ? ` ⚠️ [Sandbox Test Number: recipient must be whitelisted in Meta console]`
                  : '';
                const fallbackTag = winningFormat.templateName === 'rsvp_reminder' && senderTemplateType !== 'rsvp_reminder'
                  ? ' ⚡[Utility Fallback: rsvp_reminder]'
                  : '';
                setSimulationLogs(prev => [
                  ...prev,
                  `[${stepTime}] ✓ [Meta Ingress Accepted] Sent '${winningFormat?.templateName}' to ${gName} (+${cleanPhone}) — Msg ID: ${fastRes.messageId}${fallbackTag}${sandboxTag}`
                ]);
                setSimulationProgress(Math.round(((i + 1) / filteredGuests.length) * 100));
                continue;
              }
            }

            // 2. DISCOVERY PATH: Test primary candidate template
            const initialLang = matchedDiscovered?.language || (whatsappTemplateLanguage || currentWedding?.whatsappTemplateLanguage || 'en').trim();
            const preferredParamCount = matchedDiscovered
              ? matchedDiscovered.bodyParamsCount
              : senderTemplateType === 'save_the_date' ? 4 : 5;
            const hasInitialButton = senderTemplateType === 'save_the_date' ? false : (matchedDiscovered?.hasUrlButton || false);

            const primaryBodyParams = buildDynamicParameters(
              preferredParamCount,
              gName,
              wDate,
              rVenue,
              cNames,
              tLink,
              groom,
              bride,
              effectiveCampaign
            );

            const primaryRes = await sendWhatsAppMessage({
              phoneNumberId: cleanPhoneId,
              accessToken: cleanToken,
              to: cleanPhone,
              defaultCountryCode: defaultCode,
              templateName: primaryTemplateName,
              languageCode: initialLang,
              bodyParameters: primaryBodyParams.map(p => p.text),
              header: undefined, // Save the Date strictly has NO header
              button: hasInitialButton ? {
                subType: 'url',
                index: matchedDiscovered?.urlButtonIndex || '0',
                variableValue: guest.id
              } : undefined
            });

            if (primaryRes.success && primaryRes.messageId) {
              successCount++;
              await updateGuest({ ...guest, inviteSent: true });
              winningFormat = {
                templateName: primaryTemplateName,
                paramCount: preferredParamCount,
                headerType: defaultHeaderType,
                lang: initialLang,
                hasUrlButton: hasInitialButton
              };

              const testWarn = primaryRes.isSandboxTestNumber
                ? ` ⚠️ (Sandbox test number: recipient must be in Meta Console allowed list)`
                : '';
              const modeTag = primaryTemplateName === 'rsvp_reminder' && senderTemplateType !== 'rsvp_reminder'
                ? ' ⚡[Utility Fallback: rsvp_reminder]'
                : '';

              setSimulationLogs(prev => [
                ...prev,
                `[${stepTime}] ✓ [Meta Ingress Accepted] Sent '${primaryTemplateName}' to ${gName} (+${cleanPhone}) — Msg ID: ${primaryRes.messageId}${modeTag}${testWarn}`
              ]);
              setSimulationProgress(Math.round(((i + 1) / filteredGuests.length) * 100));
              continue;
            }

            // 3. EXHAUSTIVE FAST-DIAGNOSIS AUTO-REPAIR ENGINE
            const initialErrCode = primaryRes.error?.code;
            const initialErrMsg = primaryRes.error?.message || primaryRes.error?.details || 'API request rejected';

            const isAuthError = initialErrCode === 190 ||
              initialErrMsg.toLowerCase().includes('token') ||
              initialErrMsg.toLowerCase().includes('session') ||
              initialErrMsg.toLowerCase().includes('invalidated') ||
              initialErrMsg.toLowerCase().includes('authentication error');

            if (isAuthError) {
              failCount++;
              setTokenStatus({
                checking: false,
                valid: false,
                errorCode: 190,
                errorMessage: initialErrMsg
              });
              setSimulationLogs(prev => [
                ...prev,
                `🚨 [Meta API Auth Error 190] ${initialErrMsg}`,
                `🛑 HALTING BROADCAST: Meta Access Token session is invalidated. No messages were delivered to phones.`,
                `👉 Paste your fresh Meta Access Token in the banner above and click "Save & Connect Token".`
              ]);
              break;
            }

            setSimulationLogs(prev => [
              ...prev,
              `[${stepTime}] ℹ️ [Auto-Resolving Meta Signature] '${primaryTemplateName}' returned (${initialErrMsg}). Auto-detecting registered template name & parameters...`
            ]);

            const priorityCounts = senderTemplateType === 'save_the_date'
              ? [4, 5, 3, 2, 1, 6, 0]
              : [5, 4, 3, 6, 2, 1, 0];

            const primaryLangs = Array.from(new Set([initialLang, 'en', 'en_US', 'en_GB'])).filter(Boolean);

            let resolvedWithRepair = false;

            for (const candName of candidateTemplateNames) {
              let templateConfirmedInMeta = false;
              let workingLang = initialLang;

              // Step A: Probe candName with primary languages to see if this template exists in Meta
              for (const lng of primaryLangs) {
                try {
                  const probeParams = buildDynamicParameters(preferredParamCount, gName, wDate, rVenue, cNames, tLink, groom, bride, senderTemplateType);
                  const probeComponents: any[] = [];
                  if (probeParams.length > 0) {
                    probeComponents.push({ type: 'body', parameters: probeParams });
                  }

                  const probePayload = {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone,
                    type: 'template',
                    template: {
                      name: candName,
                      language: { code: lng },
                      components: probeComponents
                    }
                  };

                  const probeRes = await fetch(`https://graph.facebook.com/v18.0/${cleanPhoneId}/messages`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${cleanToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(probePayload)
                  });
                  const probeData = await probeRes.json();

                  if (probeRes.ok && probeData.messages?.[0]?.id) {
                    winningFormat = {
                      templateName: candName,
                      paramCount: preferredParamCount,
                      headerType: 'none',
                      lang: lng,
                      hasUrlButton: false
                    };
                    successCount++;
                    await updateGuest({ ...guest, inviteSent: true });
                    setSimulationLogs(prev => [
                      ...prev,
                      `🎯 [Verified Signature Discovered] Template '${candName}' (${preferredParamCount} params, ${lng}) verified & delivered! Msg ID: ${probeData.messages[0].id}`
                    ]);
                    resolvedWithRepair = true;
                    break;
                  }

                  const pCode = probeData?.error?.code;
                  const pMsg = (probeData?.error?.message || '').toLowerCase();

                  if (pCode === 132000 || pMsg.includes('number of parameters') || pMsg.includes('param')) {
                    // This template NAME exists in Meta! Only parameter count needs matching.
                    templateConfirmedInMeta = true;
                    workingLang = lng;
                    break;
                  }
                } catch (probeErr) {}
              }

              if (resolvedWithRepair) break;

              // If candName does not exist in Meta (code 132001 template does not exist), move to next candidate template name immediately
              if (!templateConfirmedInMeta) {
                continue;
              }

              // Step B: Now iterate parameter counts and URL button variations on this confirmed template
              for (const cnt of priorityCounts) {
                if (cnt === preferredParamCount) continue; // Already tested in probe
                const buttonVariations = senderTemplateType === 'save_the_date' ? [false] : [false, true];
                for (const withBtn of buttonVariations) {
                  try {
                    const varComponents: any[] = [];
                    const varBodyParams = buildDynamicParameters(cnt, gName, wDate, rVenue, cNames, tLink, groom, bride, senderTemplateType);
                    if (varBodyParams.length > 0) {
                      varComponents.push({
                        type: 'body',
                        parameters: varBodyParams
                      });
                    }

                    if (withBtn) {
                      varComponents.push({
                        type: 'button',
                        sub_type: 'url',
                        index: '0',
                        parameters: [{ type: 'text', text: targetUrl }]
                      });
                    }

                    const fbPayload = {
                      messaging_product: 'whatsapp',
                      recipient_type: 'individual',
                      to: cleanPhone,
                      type: 'template',
                      template: {
                        name: candName,
                        language: { code: workingLang },
                        components: varComponents
                      }
                    };

                    const fbRes = await fetch(`https://graph.facebook.com/v18.0/${cleanPhoneId}/messages`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${cleanToken}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(fbPayload)
                    });
                    const fbData = await fbRes.json();

                    if (fbRes.ok && fbData.messages?.[0]?.id) {
                      winningFormat = {
                        templateName: candName,
                        paramCount: cnt,
                        headerType: 'none',
                        lang: workingLang,
                        hasUrlButton: withBtn
                      };
                      successCount++;
                      await updateGuest({ ...guest, inviteSent: true });

                      setSimulationLogs(prev => [
                        ...prev,
                        `🎯 [Verified Signature Discovered] Template '${candName}' (${cnt} params, ${workingLang}${withBtn ? ' + URL Button' : ''}) verified & delivered! Msg ID: ${fbData.messages[0].id}`
                      ]);
                      resolvedWithRepair = true;
                      break;
                    }
                  } catch (innerErr) {}
                }
                if (resolvedWithRepair) break;
              }

              if (resolvedWithRepair) break;
            }

            if (!resolvedWithRepair) {
              failCount++;
              setSimulationLogs(prev => [
                ...prev,
                `❌ [Meta Delivery Failed] ${gName} (+${cleanPhone}): Meta rejected templates [${candidateTemplateNames.slice(0, 3).join(', ')}] (${initialErrMsg}).`,
                `💡 HINT: Open Settings (⚙️) above to inspect live approved templates in your Meta Business Manager.`
              ]);
            }
          } catch (e: any) {
            failCount++;
            setSimulationLogs(prev => [
              ...prev,
              `❌ [Network Error] ${gName}: ${e?.message || 'Connection failed'}`
            ]);
          }
        } else {
          // Simulation preview mode (No live Meta credentials configured)
          await new Promise(resolve => setTimeout(resolve, 150));
          setSimulationLogs(prev => [
            ...prev,
            `[${stepTime}] ℹ️ [Preview Mode Only] Simulated '${primaryTemplateName}' for ${gName} (Preview only - connect Meta Token to send live messages)`
          ]);
        }

        setSimulationProgress(Math.round(((i + 1) / filteredGuests.length) * 100));
      }

      const finishTime = new Date().toLocaleTimeString();
      if (successCount === 0 && failCount > 0) {
        setSimulationLogs(prev => [
          ...prev,
          `[${finishTime}] 🛑 [Broadcast Halted with Errors] 0 delivered, ${failCount} failed. Please resolve Meta Access Token error above.`
        ]);
      } else if (successCount === 0 && !hasRealCredentials) {
        setSimulationLogs(prev => [
          ...prev,
          `[${finishTime}] ℹ️ [Simulation Preview Finished] 0 live messages sent (No valid Meta credentials configured).`
        ]);
      } else {
        setSimulationLogs(prev => [
          ...prev,
          `[${finishTime}] 🎉 [Broadcast Finished] Completed with ${successCount} successful delivery and ${failCount} failed.`
        ]);
      }
    } catch (globalErr: any) {
      setSimulationLogs(prev => [
        ...prev,
        `🚨 [Broadcast Exception] Error executing dispatch loop: ${globalErr?.message || globalErr}`
      ]);
    } finally {
      setSimulationActive(false);
    }
  };

  const sampleGuest: Partial<Guest> = filteredGuests[0] || {
    id: 'sample-1',
    name: 'Ramesh Kumar & Family',
    phone: '919876543210',
    side: 'Bride',
    rsvpStatus: 'Pending',
    totalFamilyMembers: 3
  };

  return (
    <div className="space-y-6 pb-16">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider">
                Direct WhatsApp Dispatch
              </span>
              <span className="text-stone-400 text-xs font-mono">100% Pure Text-Only Mode</span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-stone-900">
              Invitations & WhatsApp Broadcasts
            </h1>
            <p className="text-xs md:text-sm text-stone-500 max-w-2xl">
              View standardized Meta-approved wedding templates and broadcast personalized WhatsApp messages in bulk to your guest list.
            </p>
          </div>

          {/* Tab Switcher & Settings Trigger */}
          <div className="flex items-center gap-2">
            <div className="bg-stone-100 p-1.5 rounded-2xl flex items-center gap-1 border border-stone-200">
              <button
                type="button"
                onClick={() => setActiveSubTab('templates')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'templates'
                    ? 'bg-white text-stone-950 shadow-xs border border-stone-200/80'
                    : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                <Eye className="h-4 w-4 text-emerald-600" />
                <span>1. View Templates</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('sender')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'sender'
                    ? 'bg-emerald-950 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                <Send className="h-4 w-4 text-emerald-400" />
                <span>2. Bulk Broadcast</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-2xl text-stone-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="WhatsApp Meta API Configuration & Template Inspector"
            >
              <Settings className="h-4 w-4 text-emerald-700" />
              <span className="hidden sm:inline">API & Templates</span>
            </button>
          </div>
        </div>

        {/* Real-time Meta Connection & Token Status Bar */}
        {!tokenStatus.checking && tokenStatus.valid && (
          <div className="mt-5 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5 font-sans">
                <span className="font-bold text-emerald-900">Meta Cloud API Connected:</span>
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800">
                  +{tokenStatus.phoneDisplay}
                </span>
                <span className="text-emerald-700 font-medium hidden md:inline">• Pure text templates verified</span>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg self-start sm:self-auto">
              ✓ Ready to Broadcast
            </span>
          </div>
        )}

        {/* High-Visibility Token Expired / Auth Error Banner (Error 190) */}
        {!tokenStatus.checking && (tokenStatus.errorCode === 190 || (!tokenStatus.valid && !whatsappToken)) && (
          <div className="mt-5 p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-3.5 shadow-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-200 text-rose-800 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-sm text-rose-950">
                    {tokenStatus.errorCode === 190
                      ? 'Meta WhatsApp Access Token Expired or Session Invalidated (Error 190)'
                      : 'Meta WhatsApp Access Token Required for Live Sending'}
                  </h4>
                  <span className="px-2 py-0.5 bg-rose-200 text-rose-900 text-[10px] font-mono font-bold rounded-full uppercase">
                    Action Required
                  </span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  {tokenStatus.errorMessage ? (
                    <>Meta Graph API returned: <strong className="font-mono font-semibold">"{tokenStatus.errorMessage}"</strong>. </>
                  ) : null}
                  Meta temporary access tokens expire every 24 hours. Paste your fresh Temporary Token or Permanent System User Token below to enable live phone delivery.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="Paste fresh Meta Access Token (starts with EAA...)"
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 bg-white text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-inner"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saveLoading || !whatsappToken.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-xs"
              >
                <Key className="h-3.5 w-3.5" />
                <span>{saveLoading ? 'Connecting...' : 'Save & Connect Token'}</span>
              </button>
            </div>

            <div className="text-[11px] text-rose-800 flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2 border-t border-rose-200/80">
              <span className="font-bold">💡 How to grab a fresh token in 30 seconds:</span>
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noreferrer"
                className="font-bold underline hover:text-rose-950 flex items-center gap-1"
              >
                <span>Meta Developer Console</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <span>→ WhatsApp → API Setup → Copy <strong>"Temporary access token"</strong> → Paste above & click Save.</span>
            </div>
          </div>
        )}

        {/* Collapsible WhatsApp API Settings & Live Template Inspector Drawer */}
        {showSettingsDrawer && (
          <div className="mt-6 pt-6 border-t border-stone-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold font-mono text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Meta WhatsApp Cloud API Settings & Live Template Inspector</span>
                </h3>
                <p className="text-[11px] text-stone-500">
                  Inspect approved templates directly from your Meta WhatsApp Business Manager or configure credentials.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestMetaCredentials}
                  disabled={testCredsLoading}
                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {testCredsLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  <span>Inspect Live Meta Templates</span>
                </button>
              </div>
            </div>

            {/* Credential Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-bold mb-1">
                  Meta Phone Number ID
                </label>
                <input
                  type="text"
                  value={whatsappPhoneNumberId}
                  onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                  placeholder="e.g. 1176823055522728"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-bold mb-1">
                  WABA ID (Optional)
                </label>
                <input
                  type="text"
                  value={whatsappBusinessAccountId}
                  onChange={(e) => setWhatsappBusinessAccountId(e.target.value)}
                  placeholder="e.g. 1029384756..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-bold mb-1">
                  Default Country Code
                </label>
                <input
                  type="text"
                  value={whatsappDefaultCountryCode}
                  onChange={(e) => setWhatsappDefaultCountryCode(e.target.value)}
                  placeholder="e.g. 91"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-bold mb-1">
                  Template Language
                </label>
                <input
                  type="text"
                  value={whatsappTemplateLanguage}
                  onChange={(e) => setWhatsappTemplateLanguage(e.target.value)}
                  placeholder="en (or en_US)"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-bold mb-1">
                  Meta Access Token
                </label>
                <input
                  type="password"
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  placeholder="Bearer token..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Template Names Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-bold mb-1">
                  Save the Date Template Name
                </label>
                <input
                  type="text"
                  value={whatsappSaveDateTemplateName}
                  onChange={(e) => setWhatsappSaveDateTemplateName(e.target.value)}
                  placeholder="rsvp_wedding"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-bold mb-1">
                  Official Invite Template Name
                </label>
                <input
                  type="text"
                  value={whatsappOfficialTemplateName}
                  onChange={(e) => setWhatsappOfficialTemplateName(e.target.value)}
                  placeholder="wedding_official"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-bold mb-1">
                  RSVP Reminder Template Name
                </label>
                <input
                  type="text"
                  value={whatsappReminderTemplateName}
                  onChange={(e) => setWhatsappReminderTemplateName(e.target.value)}
                  placeholder="rsvp_reminder"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Text-Only Template Architecture Notice */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-900 block font-mono text-[11px] uppercase tracking-wider">
                  Pure Text Meta Templates (No Header Image)
                </span>
                <span className="text-[11px] text-stone-600 leading-relaxed block mt-0.5">
                  Save the Date, Official Invite, and RSVP Reminders dispatch strictly as pure text templates without image headers to match your Meta-approved template specifications.
                </span>
              </div>
            </div>

            {/* Smart Utility Fallback Setting */}
            <div className={`p-4 rounded-2xl border transition-all ${
              useUtilitySafeDelivery
                ? 'bg-amber-500/10 border-amber-400/40 text-stone-800'
                : 'bg-stone-50 border-stone-200 text-stone-700'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${useUtilitySafeDelivery ? 'bg-amber-400 text-stone-950 font-black' : 'bg-stone-200 text-stone-600'}`}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold font-mono uppercase tracking-wider text-stone-900">
                        ⚡ Smart Utility Fallback
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        useUtilitySafeDelivery ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-stone-200 text-stone-600'
                      }`}>
                        {useUtilitySafeDelivery ? 'FALLBACK ACTIVE' : 'DIRECT DISPATCH (DEFAULT)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                      Your chosen campaign template (<code>rsvp_wedding</code> for Save the Date, <code>wedding_official</code> for Official Invite, <code>rsvp_reminder</code> for Reminder) is always sent directly. When Fallback is ON, if Meta throws a marketing rate-limit error, it will automatically attempt your approved <strong>UTILITY</strong> template (<code>rsvp_reminder</code>) as a backup safety net.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUseUtilitySafeDelivery(!useUtilitySafeDelivery)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                    useUtilitySafeDelivery
                      ? 'bg-amber-400 text-stone-950 border-amber-500'
                      : 'bg-stone-200 hover:bg-stone-300 text-stone-800 border-stone-300'
                  }`}
                >
                  {useUtilitySafeDelivery ? '✓ Fallback Enabled' : 'Enable Fallback'}
                </button>
              </div>
            </div>

            {/* Live Discovered Templates from Account */}
            {discoveredTemplates.length > 0 && (
              <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 space-y-3 border border-stone-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Discovered Approved Templates in Your Meta Account ({discoveredTemplates.length})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Click to assign to any campaign</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {discoveredTemplates.map((tpl, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-stone-850 border border-stone-700/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-300 truncate">{tpl.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {tpl.status}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-stone-400">
                        Lang: <span className="text-white font-bold">{tpl.language}</span> • Params: <span className="text-white font-bold">{tpl.bodyParamsCount}</span> • Header: <span className={tpl.headerType === 'text' ? 'text-blue-400 font-bold' : 'text-stone-300'}>{tpl.headerType.toUpperCase()}</span>
                      </p>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAssignDiscoveredTemplate(tpl, 'save_the_date')}
                          className="px-2 py-1 bg-stone-750 hover:bg-stone-700 rounded text-[9px] font-mono text-stone-200 transition cursor-pointer"
                        >
                          Use Save Date
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssignDiscoveredTemplate(tpl, 'official_invite')}
                          className="px-2 py-1 bg-stone-750 hover:bg-stone-700 rounded text-[9px] font-mono text-stone-200 transition cursor-pointer"
                        >
                          Use Official
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssignDiscoveredTemplate(tpl, 'rsvp_reminder')}
                          className="px-2 py-1 bg-stone-750 hover:bg-stone-700 rounded text-[9px] font-mono text-stone-200 transition cursor-pointer"
                        >
                          Use Reminder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-stone-500 font-mono">
                Auto-Repair actively tests candidate templates and parameter counts (0 to 7) during dispatch.
              </span>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saveLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{saveLoading ? 'Saving...' : 'Save API Settings'}</span>
              </button>
            </div>

            {testCredsResult && (
              <div className={`p-3.5 rounded-xl text-xs border ${
                testCredsResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testCredsResult.message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SUBTAB 1: VIEW MESSAGE TEMPLATES (READ-ONLY) */}
      {/* ======================================================== */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6">
          {/* Dynamic Itinerary Date & Venue Source Banner */}
          <div className="bg-linear-to-r from-amber-50 to-emerald-50/50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-900 rounded-xl shrink-0">
                <Sparkles className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-900">Itinerary Date &amp; Venue Sync</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active in Official Invite &amp; RSVP Reminder
                  </span>
                </div>
                <p className="text-xs text-stone-700 mt-0.5">
                  Wedding messages automatically inject wedding date <strong className="text-emerald-950 font-bold">{weddingDate}</strong> and palace venue <strong className="text-stone-900 font-semibold">{resortName}</strong> from ceremony <span className="font-semibold text-amber-900">"{resolvedItinerary.eventTitle}"</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Smart Delivery Route Banner */}
          <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs transition-all ${
            useUtilitySafeDelivery
              ? 'bg-linear-to-r from-amber-50 to-emerald-50/60 border-amber-300/90 text-stone-900'
              : 'bg-stone-50 border-stone-200 text-stone-700'
          }`}>
            <div className="flex items-start sm:items-center gap-3">
              <div className={`p-2 rounded-xl shrink-0 ${
                useUtilitySafeDelivery ? 'bg-amber-400 text-stone-950 font-bold' : 'bg-stone-200 text-stone-600'
              }`}>
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-stone-950 font-mono uppercase tracking-wider">
                    {useUtilitySafeDelivery ? '⚡ Smart Utility Fallback: ON' : 'Direct Meta Template Route (ACTIVE)'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    useUtilitySafeDelivery
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {useUtilitySafeDelivery ? 'Auto-Fallback Enabled' : 'Strict Template Dispatch'}
                  </span>
                </div>
                <p className="text-xs text-stone-700 mt-0.5 leading-relaxed">
                  {useUtilitySafeDelivery
                    ? <>Whichever template you select (Save the Date: <code>rsvp_wedding</code>, Official Invite: <code>wedding_official</code>, Reminder: <code>rsvp_reminder</code>) is dispatched directly. If Meta returns a marketing limitation error, it automatically falls back to <code>rsvp_reminder</code>.</>
                    : <>Each campaign dispatches directly with its selected template: Save the Date sends <code>rsvp_wedding</code>, Official Invite sends <code>wedding_official</code>, and Reminder sends <code>rsvp_reminder</code>.</>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleUtilitySafeDelivery(!useUtilitySafeDelivery)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
                useUtilitySafeDelivery
                  ? 'bg-amber-400 hover:bg-amber-500 text-stone-950 border-amber-500'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-800 border-stone-300'
              }`}
            >
              {useUtilitySafeDelivery ? '✓ Fallback Enabled' : 'Enable Fallback'}
            </button>
          </div>

          {/* Template Selection Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['save_the_date', 'official_invite', 'rsvp_reminder'] as CampaignType[]).map((type) => {
              const def = templateDefinitions[type];
              const isSelected = selectedTemplateTab === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedTemplateTab(type)}
                  className={`p-5 rounded-3xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white text-stone-800 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{def.icon}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                      isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {def.templateCode}
                    </span>
                  </div>
                  <h3 className={`font-serif text-base font-bold mb-1 ${isSelected ? 'text-amber-300' : 'text-stone-900'}`}>
                    {def.title}
                  </h3>
                  <p className={`text-xs line-clamp-2 leading-relaxed ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                    {def.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Template Detail & Interactive Phone View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Template Details Card */}
            <div className="lg:col-span-6 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-emerald-700 uppercase font-bold tracking-wider">
                    Meta Verified Structure
                  </span>
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    {templateDefinitions[selectedTemplateTab].title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(getRenderedTemplateText(selectedTemplateTab, sampleGuest), 'template-text')}
                  className="px-3 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedIndex === 'template-text' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedIndex === 'template-text' ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              {/* Dynamic Variables Badge List */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <p className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      Meta Parameters ({selectedTemplateTab === 'save_the_date' ? '4 Sequential Body Variables' : '5 Body Variables'}):
                    </span>
                  </p>
                  {selectedTemplateTab === 'save_the_date' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold border border-emerald-200">
                      Strictly Pure Body • No Header • No Footer
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplateTab === 'save_the_date' ? (
                    <>
                      <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-mono font-bold text-stone-700">
                        {'{{1}}'} {'{guest_name}'}
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-mono font-bold text-stone-700">
                        {'{{2}}'} {'{groom}'}
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-mono font-bold text-stone-700">
                        {'{{3}}'} {'{bride}'}
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-mono font-bold text-stone-700">
                        {'{{4}}'} {'{personalized_rsvp_url}'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-mono font-bold text-stone-700">
                        {'{{1}}'} {'{guest_name}'}
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-mono font-bold text-stone-700">
                        {'{{2}}'} {'{wedding_date}'}
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-mono font-bold text-stone-700">
                        {'{{3}}'} {'{venue}'}
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-mono font-bold text-stone-700">
                        {'{{4}}'} {'{couple_names}'}
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-stone-200 rounded-md text-[10px] font-mono font-bold text-stone-700">
                        {'{{5}}'} {selectedTemplateTab === 'official_invite' ? '{main_website_url}' : '{personalized_rsvp_url}'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Formatted Text Box (Read-Only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-stone-400 uppercase tracking-widest block font-bold">
                  Formatted WhatsApp Message Output
                </label>
                <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto border border-stone-800 selection:bg-emerald-500">
                  {getRenderedTemplateText(selectedTemplateTab, sampleGuest)}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-stone-500 text-xs">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Standardized for guaranteed Meta Cloud delivery</span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setSenderTemplateType(selectedTemplateTab);
                    setActiveSubTab('sender');
                  }}
                  className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Launch this campaign</span>
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Right Column: WhatsApp Phone Mockup View */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <span className="text-[10px] font-mono text-stone-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                <span>Live Guest WhatsApp Phone Simulation</span>
              </span>

              {/* WhatsApp Smartphone Frame */}
              <div className="w-full max-w-sm rounded-[36px] border-[8px] border-stone-850 overflow-hidden shadow-2xl bg-[#efeae2] flex flex-col min-h-[520px]">
                {/* WhatsApp Status Bar */}
                <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-800 border border-emerald-400/40 flex items-center justify-center font-bold text-xs">
                    {groom[0]}{bride[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs leading-tight truncate">{groom} & {bride}</p>
                    <p className="text-[9px] text-emerald-100 font-mono">Wedding Office • online</p>
                  </div>
                </div>

                {/* WhatsApp Chat Body */}
                <div className="p-3 flex-1 space-y-3 font-sans text-xs flex flex-col justify-start">
                  {/* Encrypted Notice Pill */}
                  <div className="self-center bg-[#ffeecd] text-stone-700 text-[8px] px-2.5 py-1 rounded-md text-center max-w-[85%] shadow-2xs">
                    🔒 Messages are end-to-end encrypted with Meta WhatsApp Cloud.
                  </div>

                  {/* Message Bubble */}
                  <div className="bg-white rounded-2xl rounded-tl-none overflow-hidden shadow-xs space-y-2 text-stone-800 relative max-w-[92%] border border-stone-200/50">
                    <div className="px-3.5 pt-2.5 pb-0.5 flex items-center justify-between text-[9px] font-mono text-stone-500 border-b border-stone-100">
                      <span className="text-emerald-700 font-bold">📝 Meta WhatsApp Template</span>
                      <span className="text-stone-400">Meta Verified</span>
                    </div>

                    <div className="p-3.5 pt-2 space-y-2">
                      <div className="whitespace-pre-wrap text-[11px] leading-relaxed">
                        {getRenderedTemplateText(selectedTemplateTab, sampleGuest)}
                      </div>

                      <div className="text-[9px] text-stone-400 text-right font-mono flex items-center justify-end gap-1">
                        <span>10:30 AM</span>
                        <span className="text-emerald-600 font-bold">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: BULK BROADCAST DISPATCHER */}
      {/* ======================================================== */}
      {activeSubTab === 'sender' && (
        <div className="space-y-6">
          {/* Safe Utility Delivery Route Status in Broadcast Tab */}
          <div className={`border rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs transition-all ${
            useUtilitySafeDelivery
              ? 'bg-linear-to-r from-emerald-950 to-stone-900 border-amber-400/40 text-stone-100'
              : 'bg-stone-900 border-stone-800 text-stone-300'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                useUtilitySafeDelivery ? 'bg-amber-400 text-stone-950 font-black' : 'bg-stone-800 text-stone-400'
              }`}>
                <Zap className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wider">
                    {useUtilitySafeDelivery ? '⚡ Smart Utility Fallback: ACTIVE' : 'Direct Meta Template Mode (ACTIVE)'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    useUtilitySafeDelivery
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  }`}>
                    {useUtilitySafeDelivery ? 'Sends Selected Template (Auto-Fallback if Error)' : 'Sends Selected Template Directly'}
                  </span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {useUtilitySafeDelivery
                    ? <>Dispatches your selected template (<code>{senderTemplateType === 'save_the_date' ? 'rsvp_wedding' : senderTemplateType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}</code>). If Meta returns a marketing limitation error, it automatically falls back to <code>rsvp_reminder</code>.</>
                    : <>Dispatches directly as <code>{senderTemplateType === 'save_the_date' ? 'rsvp_wedding' : senderTemplateType === 'official_invite' ? 'wedding_official' : 'rsvp_reminder'}</code>. Each template sends its genuine text and formatting to recipients.</>}
                </p>
              </div>
            </div>
            <div className="shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => handleToggleUtilitySafeDelivery(!useUtilitySafeDelivery)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  useUtilitySafeDelivery
                    ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-600'
                    : 'bg-amber-400 hover:bg-amber-300 text-stone-950 border border-amber-300'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{useUtilitySafeDelivery ? 'Turn OFF Fallback' : '⚡ Enable Fallback'}</span>
              </button>
            </div>
          </div>

          {/* Active Campaign Selection Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-stone-400 uppercase tracking-widest block font-bold">
                1. Select Campaign to Broadcast
              </label>

              {discoveredTemplates.length > 0 && (
                <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{discoveredTemplates.length} Meta Templates Connected</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['save_the_date', 'official_invite', 'rsvp_reminder'] as CampaignType[]).map((type) => {
                const def = templateDefinitions[type];
                const isSelected = senderTemplateType === type;
                const activeConfiguredName = 
                  type === 'save_the_date' ? whatsappSaveDateTemplateName :
                  type === 'official_invite' ? whatsappOfficialTemplateName :
                  whatsappReminderTemplateName;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSenderTemplateType(type)}
                    className={`p-5 rounded-3xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white text-stone-800 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{def.icon}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                        isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {activeConfiguredName || def.templateCode}
                      </span>
                    </div>
                    <h3 className={`font-serif text-base font-bold mb-1 ${isSelected ? 'text-amber-300' : 'text-stone-900'}`}>
                      {def.title}
                    </h3>
                    <p className={`text-xs leading-relaxed ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                      {def.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Guest Segment & Dispatch Trigger Panel */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-stone-400 uppercase tracking-widest block font-bold">
                2. Choose Target Guest Segment
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { id: 'all', label: 'All Guests', count: guests.length },
                  { id: 'pending', label: 'Pending RSVP', count: guests.filter(g => g.rsvpStatus === 'Pending' || !g.rsvpStatus).length },
                  { id: 'attending', label: 'Attending', count: guests.filter(g => g.rsvpStatus === 'Attending').length },
                  { id: 'declined', label: 'Declined', count: guests.filter(g => g.rsvpStatus === 'Declined').length },
                  { id: 'bride', label: "Bride's Side", count: guests.filter(g => g.side === 'Bride').length },
                  { id: 'groom', label: "Groom's Side", count: guests.filter(g => g.side === 'Groom').length },
                  { id: 'vip', label: 'VIP Guests', count: guests.filter(g => g.isVIP).length }
                ].map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setTargetFilter(seg.id as any)}
                    className={`p-3 rounded-2xl text-center border transition cursor-pointer ${
                      targetFilter === seg.id
                        ? 'bg-emerald-900 text-white border-emerald-800 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <p className="text-[10px] font-mono uppercase tracking-wider font-bold truncate">{seg.label}</p>
                    <p className="text-base font-bold mt-0.5">{seg.count}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Campaign Summary & Trigger Action */}
            <div className="p-6 rounded-3xl bg-emerald-950 text-white border border-emerald-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold rounded-full uppercase">
                    Ready for Broadcast
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    Template: <code className="text-amber-300 font-bold">
                      {senderTemplateType === 'save_the_date' ? whatsappSaveDateTemplateName :
                       senderTemplateType === 'official_invite' ? whatsappOfficialTemplateName :
                       whatsappReminderTemplateName}
                    </code>
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-amber-300">
                  {templateDefinitions[senderTemplateType].title}
                </h3>
                <p className="text-xs text-stone-300 max-w-xl leading-relaxed">
                  Will dispatch personalized text messages to <strong className="text-white font-bold">{filteredGuests.length}</strong> guest(s) in the <strong className="text-white font-bold">{targetFilter.toUpperCase()}</strong> segment.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartBulkBroadcast}
                disabled={simulationActive || filteredGuests.length === 0}
                className={`w-full md:w-auto px-8 py-4 font-bold rounded-2xl transition shadow-lg flex items-center justify-center gap-3 cursor-pointer text-sm active:scale-95 ${
                  simulationActive
                    ? 'bg-amber-500 text-stone-950 cursor-wait'
                    : filteredGuests.length === 0
                    ? 'bg-stone-700 text-stone-400 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                }`}
              >
                {simulationActive ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                <span>{simulationActive ? 'Broadcasting Queue...' : `Broadcast to ${filteredGuests.length} Guests`}</span>
              </button>
            </div>

            {/* Live Progress Bar */}
            {simulationActive && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-stone-600 font-bold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    Dispatch Progress
                  </span>
                  <span className="text-emerald-700 font-bold">{simulationProgress}%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-3.5 overflow-hidden border border-stone-200">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${simulationProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Broadcast Console Logs */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest block font-bold flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Live Broadcast Terminal & Delivery Receipts</span>
                </label>

                {simulationLogs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSimulationLogs([`[Terminal Ready] Logs cleared. Ready for next broadcast.`])}
                    className="text-[11px] text-stone-400 hover:text-stone-600 flex items-center gap-1 font-mono transition cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear Terminal</span>
                  </button>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-stone-950 text-stone-200 font-mono text-xs max-h-72 min-h-[160px] overflow-y-auto space-y-1.5 border border-stone-800 shadow-inner">
                {simulationLogs.map((log, idx) => {
                  const isSuccess = log.includes('✓') || log.includes('🎯') || log.includes('🎉');
                  const isFail = log.includes('❌') || log.includes('🚨');
                  const isWarn = log.includes('⚠️');
                  const isInfo = log.includes('ℹ️') || log.includes('🚀') || log.includes('📡');

                  return (
                    <div 
                      key={idx} 
                      className={`leading-relaxed ${
                        isSuccess
                          ? 'text-emerald-400 font-medium' 
                          : isFail 
                          ? 'text-rose-400 font-medium' 
                          : isWarn 
                          ? 'text-amber-400 font-medium'
                          : isInfo
                          ? 'text-cyan-300'
                          : 'text-stone-400'
                      }`}
                    >
                      {log}
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
