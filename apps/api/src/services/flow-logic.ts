/**
 * Pure decision logic for the chatbot runtime.
 *
 * Deliberately free of database and network calls so the branching rules can be
 * tested directly; `flow-engine.ts` supplies the I/O around them.
 */

export interface FlowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface InterpolationContext {
  contactName: string | null;
  waId: string;
  variables: Record<string, string>;
}

export interface ChatbotTriggerRow {
  id: string;
  trigger_type: string;
  trigger_config: { keywords?: string[] } | null;
}

/** The node no edge points at; falls back to the first node for cyclic flows. */
export function findStartNode(definition: FlowDefinition): FlowNode | undefined {
  const targets = new Set(definition.edges.map((e) => e.target));
  return definition.nodes.find((n) => !targets.has(n.id)) ?? definition.nodes[0];
}

/**
 * The next node to run. When `handle` is given (a condition's true/false branch)
 * an unlabelled edge acts as the fallback, so a half-wired condition still
 * progresses instead of silently ending the flow.
 */
export function nextNodeId(
  definition: FlowDefinition,
  fromId: string,
  handle?: string,
): string | null {
  const edges = definition.edges.filter((e) => e.source === fromId);
  if (edges.length === 0) return null;

  if (handle) {
    const branch = edges.find((e) => e.sourceHandle === handle);
    if (branch) return branch.target;
    return edges.find((e) => !e.sourceHandle)?.target ?? null;
  }

  return edges[0]?.target ?? null;
}

export function evaluateCondition(
  data: { variable?: string; operator?: string; value?: string },
  variables: Record<string, string>,
): boolean {
  const value = (variables[data.variable ?? ""] ?? "").toLowerCase();
  const expected = (data.value ?? "").toLowerCase();

  switch (data.operator) {
    case "contains":
      return value.includes(expected);
    case "starts_with":
      return value.startsWith(expected);
    case "is_empty":
      return value.trim().length === 0;
    default:
      return value === expected;
  }
}

/** Substitutes {{variable}}, {{contact.name}} and {{contact.phone}}. */
export function interpolate(text: string, ctx: InterpolationContext): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    if (key === "contact.name") return ctx.contactName ?? "there";
    if (key === "contact.phone") return ctx.waId;
    return ctx.variables[key] ?? "";
  });
}

/**
 * Keywords Meta expects us to honour for marketing consent.
 *
 * Matched against the whole trimmed message, never as a substring: "please stop
 * by tomorrow" is an ordinary sentence, not a request to be unsubscribed.
 */
const OPT_OUT_KEYWORDS = new Set([
  "stop",
  "unsubscribe",
  "cancel",
  "end",
  "quit",
  "optout",
  "opt out",
  "opt-out",
]);

const OPT_IN_KEYWORDS = new Set([
  "start",
  "subscribe",
  "unstop",
  "optin",
  "opt in",
  "opt-in",
]);

export type OptInOutcome = "opted_out" | "opted_in" | null;

export function matchOptInKeyword(messageText: string): OptInOutcome {
  const normalized = messageText.trim().toLowerCase().replace(/[.!]+$/, "");
  if (OPT_OUT_KEYWORDS.has(normalized)) return "opted_out";
  if (OPT_IN_KEYWORDS.has(normalized)) return "opted_in";
  return null;
}

/**
 * Chooses which active chatbot should answer.
 *
 * Priority: a specific keyword match, then the welcome bot on a first-ever
 * message, then the away bot outside working hours, then the catch-all.
 */
export function selectTriggeredChatbot<T extends ChatbotTriggerRow>(
  chatbots: T[],
  messageText: string,
  isFirstEverMessage: boolean,
  outsideWorkingHours: boolean,
): T | null {
  if (chatbots.length === 0) return null;

  const text = messageText.toLowerCase().trim();

  const keywordMatch = chatbots.find((bot) => {
    if (bot.trigger_type !== "keyword") return false;
    const keywords = (bot.trigger_config?.keywords ?? []).map((k) => k.toLowerCase().trim());
    return keywords.some((keyword) => keyword.length > 0 && text.includes(keyword));
  });
  if (keywordMatch) return keywordMatch;

  if (isFirstEverMessage) {
    const welcome = chatbots.find((bot) => bot.trigger_type === "welcome");
    if (welcome) return welcome;
  }

  if (outsideWorkingHours) {
    const away = chatbots.find((bot) => bot.trigger_type === "away");
    if (away) return away;
  }

  return chatbots.find((bot) => bot.trigger_type === "catch_all") ?? null;
}

/** Placeholder business hours (09:00–18:00 local) until per-org hours are stored. */
export function isOutsideWorkingHours(now = new Date()): boolean {
  const hour = now.getHours();
  return hour < 9 || hour >= 18;
}
