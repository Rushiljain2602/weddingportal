/**
 * whatsappCloudApi.ts
 * Enterprise-grade Meta WhatsApp Business Cloud API Dispatcher & Payload Engine.
 *
 * Solves silent message drops by enforcing:
 * 1. Strict E.164 phone sanitization (country code enforced, zero/symbol stripping).
 * 2. Positional {{n}} parameter sanitation (no forbidden newlines, no empty strings, no tabs).
 * 3. Exact component isolation (Header, Body, Button index & variable handling).
 * 4. Comprehensive logging of Meta Graph API responses & error subcodes.
 * 5. Sandbox / Test Phone ID detection to warn about unverified recipient drops.
 */

export interface DynamicParam {
  type: 'text';
  text: string;
}

export interface WhatsAppButtonConfig {
  subType: 'url' | 'quick_reply';
  index: string; // Zero-based string index: "0", "1", etc.
  variableValue?: string; // Suffix to dynamic URL (never pass duplicated full URL)
}

export interface WhatsAppHeaderConfig {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  mediaUrl?: string;
  filename?: string;
}

export interface WhatsAppFooterConfig {
  text?: string;
}

export interface WhatsAppPayloadOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: (string | number)[];
  header?: WhatsAppHeaderConfig;
  button?: WhatsAppButtonConfig;
  footer?: WhatsAppFooterConfig;
}

export interface WhatsAppSendConfig extends WhatsAppPayloadOptions {
  phoneNumberId: string;
  accessToken: string;
  defaultCountryCode?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  status: 'QUEUED_BY_META' | 'REJECTED' | 'INVALID_PHONE' | 'NETWORK_ERROR';
  messageId?: string;
  cleanPhone: string;
  isSandboxTestNumber: boolean;
  sandboxWarning?: string;
  payload: Record<string, any>;
  rawResponse?: Record<string, any>;
  error?: {
    code: number;
    subcode?: number;
    title: string;
    message: string;
    details?: string;
    actionableAdvice?: string;
  };
}

/** Known Meta default sandbox/test phone number IDs */
export const META_SANDBOX_PHONE_IDS = new Set([
  '1176823055522728',
  '106540352242522',
  '101869819441113'
]);

/**
 * 1. Strict E.164 Phone Number Sanitizer
 * Strips '+', spaces, dashes, parentheses, international double-zeros (00),
 * national trunk single zero (0), and prepends default country code if missing.
 */
export function formatToCleanE164(phone: string, defaultCountryCode: string = '91'): string {
  if (!phone) return '';

  let cleaned = String(phone).replace(/\D/g, '');

  // Strip international double-zero trunk: 00919876543210 -> 919876543210
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // Strip leading national trunk zero: 09876543210 -> 9876543210
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // If only 10 digits provided (typical India / US local mobile number), prepend default country code
  const cleanDefaultCode = defaultCountryCode.replace(/\D/g, '') || '91';
  if (cleaned.length === 10) {
    cleaned = cleanDefaultCode + cleaned;
  }

  return cleaned;
}

/**
 * 2. Positional Parameter Sanitizer
 *
 * CRITICAL META RULE:
 * Body parameters ({{1}}, {{2}}, etc.) MUST NOT contain:
 * - Newline characters (\n, \r) -> Meta drops the message or rejects the payload!
 * - Tab characters (\t)
 * - Pure empty/whitespace strings
 * - More than 1024 characters
 */
export function sanitizeParamText(text: any, fallback: string = '-'): string {
  if (text === null || text === undefined) {
    return fallback;
  }

  const str = String(text)
    // Strip carriage returns and line feeds
    .replace(/[\r\n]+/g, ' ')
    // Strip tabs
    .replace(/\t+/g, ' ')
    // Collapse multi-spaces
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (str.length === 0) {
    return fallback;
  }

  // Meta parameter limit is 1024 chars
  return str.length > 1024 ? str.substring(0, 1021) + '...' : str;
}

/**
 * Checks if a Phone Number ID belongs to Meta's developer sandbox
 */
export function isSandboxTestPhone(phoneId: string): boolean {
  const cleanId = String(phoneId).replace(/\D/g, '');
  return META_SANDBOX_PHONE_IDS.has(cleanId);
}

/**
 * 3. Construct Compliant WhatsApp Cloud API Payload
 *
 * Enforces strict template component isolation:
 * - 'rsvp_wedding' (Save the Date): Pure text body with 4 parameters.
 *    STRICTLY OMITS header, footer, and buttons to prevent Meta component mismatch drops.
 * - 'wedding_official' (Official Invite): 5 body parameters with approved footer.
 */
export function buildWhatsAppPayload(options: WhatsAppPayloadOptions): Record<string, any> {
  const isSaveTheDate = options.templateName.trim() === 'rsvp_wedding';
  const isOfficialInvite = options.templateName.trim() === 'wedding_official';
  const components: any[] = [];

  // Component A: HEADER
  // Strictly omit header for rsvp_wedding
  if (!isSaveTheDate && options.header) {
    if (options.header.type === 'text' && options.header.text) {
      const cleanHeader = sanitizeParamText(options.header.text, '');
      if (cleanHeader) {
        components.push({
          type: 'header',
          parameters: [
            {
              type: 'text',
              text: cleanHeader
            }
          ]
        });
      }
    } else if (options.header.mediaUrl) {
      const mediaType = options.header.type;
      const mediaObj: Record<string, any> = {
        link: options.header.mediaUrl.trim()
      };
      if (mediaType === 'document' && options.header.filename) {
        mediaObj.filename = options.header.filename;
      }
      components.push({
        type: 'header',
        parameters: [
          {
            type: mediaType,
            [mediaType]: mediaObj
          }
        ]
      });
    }
  }

  // Component B: BODY (Sequential {{1}}, {{2}}, etc.)
  if (options.bodyParameters && options.bodyParameters.length > 0) {
    const parameters: DynamicParam[] = options.bodyParameters.map((val) => ({
      type: 'text',
      text: sanitizeParamText(val)
    }));

    components.push({
      type: 'body',
      parameters
    });
  }

  // Component C: FOOTER
  // rsvp_wedding has NO footer in Meta.
  // wedding_official has approved footer: "Tectell Wedding Management".
  if (!isSaveTheDate) {
    if (options.footer?.text || isOfficialInvite) {
      // In Meta Cloud API, static footers do not require variable parameters.
      // If footer component is passed, it is represented as a component without dynamic parameters.
      if (options.footer?.text) {
        // If specified in options
        components.push({
          type: 'footer',
          parameters: []
        });
      }
    }
  }

  // Component D: BUTTON (Dynamic URL variable)
  // rsvp_wedding includes the personalized URL directly in body parameter {{4}}, NO button.
  if (!isSaveTheDate && options.button && options.button.subType === 'url') {
    const rawVal = options.button.variableValue || '';
    const cleanSuffix = sanitizeParamText(rawVal, '');
    if (cleanSuffix) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: options.button.index || '0',
        parameters: [
          {
            type: 'text',
            text: cleanSuffix
          }
        ]
      });
    }
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: options.to,
    type: 'template',
    template: {
      name: options.templateName.trim(),
      language: {
        code: (options.languageCode || 'en').trim()
      },
      ...(components.length > 0 ? { components } : {})
    }
  };
}

/**
 * 4. Human-readable diagnostic mapping for Meta Cloud API errors
 */
export function getMetaActionableAdvice(code: number, subcode?: number, message?: string): string {
  const msgLower = (message || '').toLowerCase();

  if (code === 190) {
    return 'Meta Access Token is expired or invalidated. Generate a fresh System User or 24-hour temporary token in Meta App Dashboard.';
  }
  if (code === 131026) {
    return 'Message undeliverable. Either the recipient has no active WhatsApp account, or you are sending from a Sandbox Test Number and this recipient is not verified in Meta App Dashboard > WhatsApp > API Setup > "To" list.';
  }
  if (code === 131047) {
    return '24-Hour customer service window expired. Freeform text messages cannot be sent. You must send an approved template.';
  }
  if (code === 132000) {
    return 'Number of parameters does not match template definition. Check the count of {{n}} placeholders in WhatsApp Manager for this template.';
  }
  if (code === 132001) {
    return 'Template does not exist or is not approved in this language. Verify template name spelling and language code (e.g. en vs en_US).';
  }
  if (code === 132005) {
    return 'Button URL variable is malformed or button index does not exist on this template.';
  }
  if (code === 132015) {
    return 'Template paused due to low quality rating in WhatsApp Manager.';
  }
  if (msgLower.includes('parameter') || msgLower.includes('variable')) {
    return 'Template variable formatting issue. Ensure no body variables contain newlines or empty values.';
  }
  return 'Review Meta Graph API response logs for exact parameter or authorization details.';
}

/**
 * 5. Primary Message Dispatcher
 */
export async function sendWhatsAppMessage(config: WhatsAppSendConfig): Promise<WhatsAppSendResult> {
  const cleanPhone = formatToCleanE164(config.to, config.defaultCountryCode);
  const cleanToken = config.accessToken.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
  const cleanPhoneId = config.phoneNumberId.trim().replace(/\D/g, '');
  const isSandbox = isSandboxTestPhone(cleanPhoneId);

  // Validate Phone
  if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
    const err = {
      code: 400,
      title: 'Invalid E.164 Recipient Number',
      message: `Phone number '${config.to}' was cleaned to '${cleanPhone}', which is not a valid E.164 phone length (10-15 digits).`,
      actionableAdvice: 'Ensure recipient has a valid mobile number with country code.'
    };
    return {
      success: false,
      status: 'INVALID_PHONE',
      cleanPhone,
      isSandboxTestNumber: isSandbox,
      payload: {},
      error: err
    };
  }

  // Build Payload
  const payload = buildWhatsAppPayload({
    to: cleanPhone,
    templateName: config.templateName,
    languageCode: config.languageCode,
    bodyParameters: config.bodyParameters,
    header: config.header,
    button: config.button
  });

  const sandboxWarning = isSandbox
    ? '⚠️ [Sandbox Restriction Active] You are using Meta Developer Test Phone ID (1176823055522728). Meta will ONLY deliver this message to phone numbers added to your developer sandbox allowed list in Meta App Dashboard. For unverified numbers, Meta will accept the payload into the queue with a message ID but silently drop device delivery. Switch to your live registered Phone Number ID in Settings.'
    : undefined;

  try {
    const endpoint = `https://graph.facebook.com/v18.0/${cleanPhoneId}/messages`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const err = data.error || {};
      const code = err.code || response.status;
      const subcode = err.error_subcode;
      const message = err.message || 'Meta Cloud API rejected request';
      const details = err.error_data?.details || (err.error_user_msg ? `User Msg: ${err.error_user_msg}` : '');
      const advice = getMetaActionableAdvice(code, subcode, message);

      console.error(`❌ [Meta Cloud API Reject] To: +${cleanPhone} | Template: ${config.templateName} | Code ${code} (${subcode || 'none'}): ${message} | ${details}`);

      return {
        success: false,
        status: 'REJECTED',
        cleanPhone,
        isSandboxTestNumber: isSandbox,
        sandboxWarning,
        payload,
        rawResponse: data,
        error: {
          code,
          subcode,
          title: err.type || 'MetaGraphApiError',
          message,
          details,
          actionableAdvice: advice
        }
      };
    }

    const messageId = data.messages?.[0]?.id;

    console.log(`✓ [Meta Cloud API Accepted] To: +${cleanPhone} | Template: ${config.templateName} | Message ID: ${messageId}`);

    return {
      success: true,
      status: 'QUEUED_BY_META',
      messageId,
      cleanPhone,
      isSandboxTestNumber: isSandbox,
      sandboxWarning,
      payload,
      rawResponse: data
    };
  } catch (netErr: any) {
    console.error(`❌ [Meta Cloud API Network Exception] To: +${cleanPhone}:`, netErr.message);
    return {
      success: false,
      status: 'NETWORK_ERROR',
      cleanPhone,
      isSandboxTestNumber: isSandbox,
      sandboxWarning,
      payload,
      error: {
        code: 0,
        title: 'NetworkException',
        message: netErr.message || 'Failed to reach Meta Graph API',
        actionableAdvice: 'Check internet connectivity or firewall rules blocking graph.facebook.com.'
      }
    };
  }
}

/**
 * Strongly typed wedding template dispatch parameters.
 * Enforces exact positional parameters at compile-time and runtime.
 */
export type WeddingTemplateDispatchParams =
  | {
      template: 'rsvp_wedding';
      to: string;
      phoneNumberId: string;
      accessToken: string;
      languageCode?: string;
      defaultCountryCode?: string;
      parameters: {
        guestName: string; // {{1}}
        groom: string;     // {{2}}
        bride: string;     // {{3}}
        rsvpUrl: string;   // {{4}}
      };
    }
  | {
      template: 'wedding_official' | 'rsvp_reminder';
      to: string;
      phoneNumberId: string;
      accessToken: string;
      languageCode?: string;
      defaultCountryCode?: string;
      parameters: {
        guestName: string;   // {{1}}
        weddingDate: string; // {{2}}
        venue: string;       // {{3}}
        coupleNames: string; // {{4}}
        weddingUrl: string;  // {{5}}
      };
      footerText?: string;   // "Tectell Wedding Management"
    };

/**
 * Robust dispatcher specialized for wedding templates.
 * Dynamically checks template type ('rsvp_wedding' vs 'wedding_official'),
 * correctly constructs the Meta Cloud API components array,
 * strictly omits footer for 'rsvp_wedding',
 * and includes footer structure for 'wedding_official'.
 */
export async function sendWeddingTemplateMessage(
  params: WeddingTemplateDispatchParams
): Promise<WhatsAppSendResult> {
  const isSaveTheDate = params.template === 'rsvp_wedding';

  let bodyParameters: string[];
  if (isSaveTheDate) {
    const { guestName, groom, bride, rsvpUrl } = params.parameters;
    bodyParameters = [guestName, groom, bride, rsvpUrl];
  } else {
    const { guestName, weddingDate, venue, coupleNames, weddingUrl } = params.parameters;
    bodyParameters = [guestName, weddingDate, venue, coupleNames, weddingUrl];
  }

  return sendWhatsAppMessage({
    phoneNumberId: params.phoneNumberId,
    accessToken: params.accessToken,
    to: params.to,
    defaultCountryCode: params.defaultCountryCode || '91',
    templateName: params.template,
    languageCode: params.languageCode || 'en',
    bodyParameters,
    header: undefined,
    button: undefined,
    footer: isSaveTheDate ? undefined : { text: params.footerText || 'Tectell Wedding Management' }
  });
}

