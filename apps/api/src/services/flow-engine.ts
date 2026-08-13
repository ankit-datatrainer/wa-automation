import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { decrypt } from "../lib/crypto.js";
import { meta } from "../lib/meta.js";
import {
  evaluateCondition,
  findStartNode,
  interpolate,
  isOutsideWorkingHours,
  nextNodeId,
  selectTriggeredChatbot,
  type FlowDefinition,
  type FlowNode,
} from "./flow-logic.js";

interface RunContext {
  organizationId: string;
  contactId: string;
  waId: string;
  contactName: string | null;
  /** Variables collected so far by ask_question steps. */
  variables: Record<string, string>;
}

/** Guards against a mis-wired flow looping forever within a single turn. */
const MAX_STEPS_PER_TURN = 25;

/**
 * Decides what should happen when a contact sends us a message, and runs it.
 *
 * Resuming an in-flight conversation always wins over starting a new bot, so a
 * customer part-way through a flow is not interrupted by a keyword match.
 */
export async function handleInboundForAutomation(
  organizationId: string,
  contactId: string,
  waId: string,
  contactName: string | null,
  messageText: string,
  isFirstEverMessage: boolean,
): Promise<void> {
  try {
    const resumed = await resumeAwaitingExecution(
      organizationId,
      contactId,
      waId,
      contactName,
      messageText,
    );
    if (resumed) return;

    const chatbot = await findTriggeredChatbot(
      organizationId,
      messageText,
      isFirstEverMessage,
    );
    if (!chatbot) return;

    await startExecution(chatbot, { organizationId, contactId, waId, contactName, variables: {} });
  } catch (err) {
    // Automation must never break message ingestion.
    logger.error({ err, organizationId, contactId }, "Flow automation failed");
  }
}

/** Feeds the reply into a parked ask_question step and continues from there. */
async function resumeAwaitingExecution(
  organizationId: string,
  contactId: string,
  waId: string,
  contactName: string | null,
  messageText: string,
): Promise<boolean> {
  const { data: execution } = await supabaseAdmin
    .from("chatbot_executions")
    .select("id, chatbot_id, current_node, context, chatbots(flow_id)")
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .eq("status", "running")
    .eq("awaiting_input", true)
    .maybeSingle();

  if (!execution) return false;

  const flowId = toOne<{ flow_id: string | null }>(execution.chatbots)?.flow_id;
  if (!flowId) return false;

  const definition = await loadFlow(organizationId, flowId);
  if (!definition) return false;

  const context = (execution.context ?? {}) as { variables?: Record<string, string> };
  const variables = { ...(context.variables ?? {}) };

  // Store the reply under the variable the parked question asked for.
  const parkedNode = definition.nodes.find((n) => n.id === execution.current_node);
  const variableName = (parkedNode?.data.variable as string) || "answer";
  variables[variableName] = messageText;

  const next = nextNodeId(definition, execution.current_node!);

  await supabaseAdmin
    .from("chatbot_executions")
    .update({ awaiting_input: false, context: { variables } })
    .eq("id", execution.id);

  await runFrom(execution.id, definition, next, {
    organizationId,
    contactId,
    waId,
    contactName,
    variables,
  });

  return true;
}

/** Loads the org's active bots and applies the shared selection rules. */
async function findTriggeredChatbot(
  organizationId: string,
  messageText: string,
  isFirstEverMessage: boolean,
) {
  const { data: chatbots } = await supabaseAdmin
    .from("chatbots")
    .select("id, name, trigger_type, trigger_config, flow_id")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  return selectTriggeredChatbot(
    (chatbots ?? []).map((bot) => ({
      ...bot,
      trigger_config: bot.trigger_config as { keywords?: string[] } | null,
    })),
    messageText,
    isFirstEverMessage,
    isOutsideWorkingHours(),
  );
}

async function startExecution(
  chatbot: { id: string; flow_id: string | null },
  ctx: RunContext,
): Promise<void> {
  if (!chatbot.flow_id) return;

  const definition = await loadFlow(ctx.organizationId, chatbot.flow_id);
  if (!definition?.nodes.length) return;

  const startNode = findStartNode(definition);
  if (!startNode) return;

  const { data: execution, error } = await supabaseAdmin
    .from("chatbot_executions")
    .insert({
      organization_id: ctx.organizationId,
      chatbot_id: chatbot.id,
      contact_id: ctx.contactId,
      current_node: startNode.id,
      context: { variables: {} },
      status: "running",
    })
    .select("id")
    .single();

  // 23505 = the partial unique index; another run is already live for this contact.
  if (error?.code === "23505") return;
  if (error || !execution) throw error;

  await runFrom(execution.id, definition, startNode.id, ctx);
}

/** Walks the flow from `nodeId` until it must wait, or the flow ends. */
async function runFrom(
  executionId: string,
  definition: FlowDefinition,
  nodeId: string | null,
  ctx: RunContext,
): Promise<void> {
  let current = nodeId;
  let steps = 0;

  while (current && steps < MAX_STEPS_PER_TURN) {
    steps++;

    const node = definition.nodes.find((n) => n.id === current);
    if (!node) break;

    await supabaseAdmin
      .from("chatbot_executions")
      .update({ current_node: node.id, context: { variables: ctx.variables } })
      .eq("id", executionId);

    switch (node.type) {
      case "send_message": {
        await sendText(ctx, interpolate((node.data.text as string) ?? "", ctx));
        current = nextNodeId(definition, node.id);
        break;
      }

      case "ask_question": {
        await sendText(ctx, interpolate((node.data.text as string) ?? "", ctx));
        // Park here; the contact's next message resumes the flow.
        await supabaseAdmin
          .from("chatbot_executions")
          .update({ awaiting_input: true, context: { variables: ctx.variables } })
          .eq("id", executionId);
        return;
      }

      case "condition": {
        const passed = evaluateCondition(node.data, ctx.variables);
        current = nextNodeId(definition, node.id, passed ? "true" : "false");
        break;
      }

      case "api_request": {
        await performApiRequest(node, ctx);
        current = nextNodeId(definition, node.id);
        break;
      }

      case "delay": {
        const seconds = Number(node.data.seconds ?? 0);
        if (seconds > 0) {
          // Park with a resume time; the scheduler picks it back up.
          await supabaseAdmin
            .from("chatbot_executions")
            .update({
              resume_at: new Date(Date.now() + seconds * 1000).toISOString(),
              context: { variables: ctx.variables },
            })
            .eq("id", executionId);
          return;
        }
        current = nextNodeId(definition, node.id);
        break;
      }

      case "add_tag": {
        await applyTag(ctx, (node.data.tag as string) ?? "");
        current = nextNodeId(definition, node.id);
        break;
      }

      case "assign_agent": {
        await assignToLeastBusyAgent(ctx);
        current = nextNodeId(definition, node.id);
        break;
      }

      case "end":
        current = null;
        break;

      default:
        logger.warn({ type: node.type }, "Unknown flow node type; ending run");
        current = null;
    }
  }

  await supabaseAdmin
    .from("chatbot_executions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      awaiting_input: false,
      context: { variables: ctx.variables },
    })
    .eq("id", executionId);
}

/** Resumes delay steps whose timer has elapsed. Called on the scheduler tick. */
export async function resumeDelayedExecutions(): Promise<number> {
  const { data: due } = await supabaseAdmin
    .from("chatbot_executions")
    .select("id, organization_id, contact_id, current_node, context, chatbots(flow_id), contacts(wa_id, name)")
    .eq("status", "running")
    .not("resume_at", "is", null)
    .lte("resume_at", new Date().toISOString())
    .limit(50);

  let resumed = 0;

  for (const execution of due ?? []) {
    try {
      const flowId = toOne<{ flow_id: string | null }>(execution.chatbots)?.flow_id;
      const contact = toOne<{ wa_id: string; name: string | null }>(execution.contacts);
      if (!flowId || !contact) continue;

      const definition = await loadFlow(execution.organization_id, flowId);
      if (!definition) continue;

      // Clear the timer first so a slow run cannot be picked up twice.
      await supabaseAdmin
        .from("chatbot_executions")
        .update({ resume_at: null })
        .eq("id", execution.id);

      const variables =
        ((execution.context ?? {}) as { variables?: Record<string, string> }).variables ?? {};

      await runFrom(execution.id, definition, nextNodeId(definition, execution.current_node!), {
        organizationId: execution.organization_id,
        contactId: execution.contact_id,
        waId: contact.wa_id,
        contactName: contact.name,
        variables,
      });
      resumed++;
    } catch (err) {
      logger.error({ err, executionId: execution.id }, "Failed to resume delayed execution");
    }
  }

  return resumed;
}

// ---------------------------------------------------------------- node actions

async function sendText(ctx: RunContext, text: string): Promise<void> {
  if (!text.trim()) return;

  const { data: waba } = await supabaseAdmin
    .from("waba_accounts")
    .select("phone_number_id, access_token_encrypted")
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();

  if (!waba) return;

  const result = await meta.sendText(
    waba.phone_number_id,
    decrypt(waba.access_token_encrypted),
    ctx.waId,
    text,
  );

  const { data: conversation } = await supabaseAdmin
    .from("conversations")
    .upsert(
      { organization_id: ctx.organizationId, contact_id: ctx.contactId, status: "open" },
      { onConflict: "organization_id,contact_id" },
    )
    .select("id")
    .single();

  if (!conversation) return;

  await supabaseAdmin.from("messages").insert({
    organization_id: ctx.organizationId,
    conversation_id: conversation.id,
    direction: "outbound",
    type: "text",
    content: { text, viaChatbot: true },
    wamid: result.messages?.[0]?.id ?? null,
    status: "sent",
  });
}

async function performApiRequest(node: FlowNode, ctx: RunContext): Promise<void> {
  const url = interpolate((node.data.url as string) ?? "", ctx);
  if (!url) return;

  const method = ((node.data.method as string) ?? "GET").toUpperCase();

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(method === "POST" && {
        body: JSON.stringify({ contact: ctx.waId, variables: ctx.variables }),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    // Flatten scalar response fields into variables so later steps can use them.
    if (payload && typeof payload === "object") {
      for (const [key, value] of Object.entries(payload)) {
        if (typeof value === "string" || typeof value === "number") {
          ctx.variables[key] = String(value);
        }
      }
    }
  } catch (err) {
    logger.warn({ err, url }, "Flow API request failed");
  }
}

async function applyTag(ctx: RunContext, tagName: string): Promise<void> {
  if (!tagName.trim()) return;

  const { data: tag } = await supabaseAdmin
    .from("tags")
    .upsert(
      { organization_id: ctx.organizationId, name: tagName.trim() },
      { onConflict: "organization_id,name" },
    )
    .select("id")
    .single();

  if (!tag) return;

  await supabaseAdmin
    .from("contact_tags")
    .upsert({ contact_id: ctx.contactId, tag_id: tag.id }, { onConflict: "contact_id,tag_id" });
}

/** Round-robin by current load: the online agent holding the fewest open chats. */
async function assignToLeastBusyAgent(ctx: RunContext): Promise<void> {
  const { data: members } = await supabaseAdmin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", ctx.organizationId)
    .eq("is_online", true)
    .in("role", ["agent", "manager"]);

  if (!members?.length) return;

  const userIds = members.map((m) => m.user_id);

  const { data: openChats } = await supabaseAdmin
    .from("conversations")
    .select("assigned_to")
    .eq("organization_id", ctx.organizationId)
    .eq("status", "open")
    .in("assigned_to", userIds);

  const load = new Map<string, number>(userIds.map((id) => [id, 0]));
  for (const chat of openChats ?? []) {
    if (chat.assigned_to) load.set(chat.assigned_to, (load.get(chat.assigned_to) ?? 0) + 1);
  }

  const [leastBusy] = [...load.entries()].sort((a, b) => a[1] - b[1]);
  if (!leastBusy) return;

  await supabaseAdmin
    .from("conversations")
    .update({ assigned_to: leastBusy[0], status: "pending" })
    .eq("organization_id", ctx.organizationId)
    .eq("contact_id", ctx.contactId);
}

// ---------------------------------------------------------------- helpers

async function loadFlow(
  organizationId: string,
  flowId: string,
): Promise<FlowDefinition | null> {
  const { data } = await supabaseAdmin
    .from("flows")
    .select("definition")
    .eq("organization_id", organizationId)
    .eq("id", flowId)
    .maybeSingle();

  const definition = data?.definition as FlowDefinition | undefined;
  if (!definition?.nodes) return null;
  return { nodes: definition.nodes, edges: definition.edges ?? [] };
}

function toOne<T>(relation: unknown): T | null {
  if (!relation) return null;
  return (Array.isArray(relation) ? (relation[0] ?? null) : relation) as T | null;
}
