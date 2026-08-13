import { env } from "../config/env.js";
import { upstreamError } from "./errors.js";
import { logger } from "./logger.js";

const GRAPH_BASE = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}`;

interface MetaErrorBody {
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_data?: { details?: string };
    fbtrace_id?: string;
  };
}

async function graphRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}/${path}`, {
    ...init,
    headers: {
      // The OAuth code/token-exchange calls authenticate via query params, not
      // a bearer token, so an empty accessToken omits the header entirely
      // rather than sending a meaningless "Bearer ".
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as T & MetaErrorBody;

  if (!response.ok || body.error) {
    const metaError = body.error;
    logger.warn({ path, metaError }, "Meta Graph API error");
    throw upstreamError(metaError?.message ?? "WhatsApp API request failed", {
      code: metaError?.code,
      subcode: metaError?.error_subcode,
      details: metaError?.error_data?.details,
      traceId: metaError?.fbtrace_id,
    });
  }

  return body as T;
}

export interface TemplateComponentPayload {
  type: string;
  format?: string;
  text?: string;
  example?: Record<string, unknown>;
  buttons?: Record<string, unknown>[];
}

export const meta = {
  /** Sends a free-form message. Only valid inside the 24-hour session window. */
  sendMessage(
    phoneNumberId: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ) {
    return graphRequest<{ messages: { id: string }[] }>(
      `${phoneNumberId}/messages`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      },
    );
  },

  sendText(phoneNumberId: string, accessToken: string, to: string, text: string) {
    return this.sendMessage(phoneNumberId, accessToken, {
      to,
      type: "text",
      text: { body: text, preview_url: true },
    });
  },

  /** Sends an approved template. Valid at any time, including outside the window. */
  sendTemplate(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    templateName: string,
    language: string,
    components: Record<string, unknown>[],
  ) {
    return this.sendMessage(phoneNumberId, accessToken, {
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: language },
        ...(components.length > 0 && { components }),
      },
    });
  },

  markAsRead(phoneNumberId: string, accessToken: string, wamid: string) {
    return this.sendMessage(phoneNumberId, accessToken, {
      status: "read",
      message_id: wamid,
    });
  },

  createTemplate(
    wabaId: string,
    accessToken: string,
    template: {
      name: string;
      language: string;
      category: string;
      components: TemplateComponentPayload[];
    },
  ) {
    return graphRequest<{ id: string; status: string; category: string }>(
      `${wabaId}/message_templates`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          name: template.name,
          language: template.language,
          category: template.category.toUpperCase(),
          components: template.components,
        }),
      },
    );
  },

  deleteTemplate(wabaId: string, accessToken: string, name: string) {
    return graphRequest<{ success: boolean }>(
      `${wabaId}/message_templates?name=${encodeURIComponent(name)}`,
      accessToken,
      { method: "DELETE" },
    );
  },

  listTemplates(wabaId: string, accessToken: string) {
    return graphRequest<{
      data: {
        id: string;
        name: string;
        status: string;
        category: string;
        language: string;
        rejected_reason?: string;
      }[];
    }>(`${wabaId}/message_templates?limit=250`, accessToken);
  },

  /** Quality rating and messaging tier for the "Live" pill and dashboard cards. */
  getPhoneNumber(phoneNumberId: string, accessToken: string) {
    return graphRequest<{
      id: string;
      display_phone_number: string;
      verified_name: string;
      quality_rating: string;
      messaging_limit_tier?: string;
      code_verification_status?: string;
    }>(
      `${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status`,
      accessToken,
    );
  },

  getBusinessProfile(phoneNumberId: string, accessToken: string) {
    return graphRequest<{
      data: {
        about?: string;
        address?: string;
        description?: string;
        email?: string;
        websites?: string[];
        vertical?: string;
        profile_picture_url?: string;
      }[];
    }>(
      `${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,websites,vertical,profile_picture_url`,
      accessToken,
    );
  },

  updateBusinessProfile(
    phoneNumberId: string,
    accessToken: string,
    profile: Record<string, unknown>,
  ) {
    return graphRequest<{ success: boolean }>(
      `${phoneNumberId}/whatsapp_business_profile`,
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({ messaging_product: "whatsapp", ...profile }),
      },
    );
  },

  /** Resolves a media id to a short-lived download URL. */
  getMediaUrl(mediaId: string, accessToken: string) {
    return graphRequest<{ url: string; mime_type: string; sha256: string; file_size: number }>(
      mediaId,
      accessToken,
    );
  },

  // ---------------------------------------------------------------- Embedded Signup

  /**
   * Exchanges the authorization code the Embedded Signup JS SDK returns for a
   * user access token. No redirect_uri is needed here — that's only required
   * for the classic server-side OAuth redirect flow, not the JS SDK popup.
   */
  exchangeCodeForToken(code: string, appId: string, appSecret: string) {
    const params = new URLSearchParams({ client_id: appId, client_secret: appSecret, code });
    return graphRequest<{ access_token: string; token_type: string }>(
      `oauth/access_token?${params}`,
      "", // The app id/secret in the query string authenticate this call, not a bearer token.
    );
  },

  /** Trades a short-lived token for one valid ~60 days. */
  exchangeForLongLivedToken(shortLivedToken: string, appId: string, appSecret: string) {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });
    return graphRequest<{ access_token: string; token_type: string; expires_in?: number }>(
      `oauth/access_token?${params}`,
      "",
    );
  },

  /**
   * Completes registration of a phone number added through Embedded Signup.
   * A number that was already registered (e.g. re-running the flow) returns a
   * specific error code that callers should treat as success, not a failure.
   */
  registerPhoneNumber(phoneNumberId: string, accessToken: string, pin: string) {
    return graphRequest<{ success: boolean }>(`${phoneNumberId}/register`, accessToken, {
      method: "POST",
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    });
  },

  /** Subscribes our app to this WABA's webhooks — required for shared/business-owned WABAs. */
  subscribeAppToWaba(wabaId: string, accessToken: string) {
    return graphRequest<{ success: boolean }>(`${wabaId}/subscribed_apps`, accessToken, {
      method: "POST",
    });
  },
};

/** Meta's quality strings are uppercase; ours are lowercase enum values. */
export function normalizeQualityRating(
  rating: string | undefined,
): "high" | "medium" | "low" | "unknown" {
  switch (rating?.toUpperCase()) {
    case "GREEN":
    case "HIGH":
      return "high";
    case "YELLOW":
    case "MEDIUM":
      return "medium";
    case "RED":
    case "LOW":
      return "low";
    default:
      return "unknown";
  }
}
