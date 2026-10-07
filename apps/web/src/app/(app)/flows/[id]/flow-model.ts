import {
  Clock,
  GitBranch,
  MessageCircleQuestion,
  Send,
  Square,
  Tag,
  UserPlus,
  Webhook,
  type LucideIcon,
} from "lucide-react";

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface Flow {
  id: string;
  name: string;
  status: string;
  meta_flow_id?: string | null;
  definition: { nodes: FlowNode[]; edges: FlowEdge[] } | null;
}

/** Sentinel stored in a condition's `falseTarget` meaning "end the flow". */
export const END_TARGET = "__end__";

export const NODE_TYPES: {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}[] = [
  {
    type: "send_message",
    label: "Send message",
    description: "Reply with a text message",
    icon: Send,
    accent: "from-brand-600 to-brand-magenta",
  },
  {
    type: "ask_question",
    label: "Ask a question",
    description: "Wait for a reply and save it",
    icon: MessageCircleQuestion,
    accent: "from-brand-magenta to-brand-pink",
  },
  {
    type: "condition",
    label: "Condition",
    description: "Branch on a saved answer",
    icon: GitBranch,
    accent: "from-brand-pink to-brand-orange",
  },
  {
    type: "api_request",
    label: "API request",
    description: "Call your own backend",
    icon: Webhook,
    accent: "from-brand-500 to-brand-700",
  },
  {
    type: "delay",
    label: "Wait",
    description: "Pause before the next step",
    icon: Clock,
    accent: "from-brand-orange to-brand-pink",
  },
  {
    type: "add_tag",
    label: "Add tag",
    description: "Label the contact",
    icon: Tag,
    accent: "from-brand-500 to-brand-pink",
  },
  {
    type: "assign_agent",
    label: "Assign to agent",
    description: "Hand over to a human",
    icon: UserPlus,
    accent: "from-brand-700 to-brand-magenta",
  },
  {
    type: "end",
    label: "End",
    description: "Finish the conversation",
    icon: Square,
    accent: "from-slate-500 to-slate-700",
  },
];

export function nodeMeta(type: string) {
  return NODE_TYPES.find((n) => n.type === type) ?? NODE_TYPES[0]!;
}

export const str = (value: unknown) => (typeof value === "string" ? value : "");

/** Problems that would make a step do nothing at runtime. */
export function nodeIssue(node: FlowNode): string | null {
  switch (node.type) {
    case "send_message":
      return str(node.data.text).trim() ? null : "Write the message to send.";
    case "ask_question":
      return str(node.data.text).trim() ? null : "Write the question to ask.";
    case "condition":
      return str(node.data.variable).trim() ? null : "Choose which saved answer to check.";
    case "api_request":
      return str(node.data.url).trim() ? null : "Add the URL to call.";
    case "delay":
      return Number(node.data.seconds) > 0 ? null : "Set how long to wait.";
    case "add_tag":
      return str(node.data.tag).trim() ? null : "Name the tag to add.";
    default:
      return null;
  }
}

/** Variables collected by ask_question steps before `index`. */
export function variablesBefore(nodes: FlowNode[], index: number): string[] {
  const names = nodes
    .slice(0, index)
    .filter((n) => n.type === "ask_question")
    .map((n) => str(n.data.variable).trim() || "answer");
  return [...new Set(names)];
}

/**
 * Steps run top to bottom, so each node points at the next one. A condition
 * with a `falseTarget` gets a labelled "true" edge to the next step and either
 * a "false" edge to the chosen step or none at all (the runtime then ends the
 * flow, since there is no unlabelled fallback edge).
 */
export function buildEdges(nodes: FlowNode[]): FlowEdge[] {
  const edges: FlowEdge[] = [];
  nodes.forEach((node, index) => {
    const next = nodes[index + 1];
    const falseTarget = node.type === "condition" ? str(node.data.falseTarget) : "";

    if (falseTarget) {
      if (next) {
        edges.push({
          id: `${node.id}->${next.id}:true`,
          source: node.id,
          target: next.id,
          sourceHandle: "true",
          label: "true",
        });
      }
      if (falseTarget !== END_TARGET && nodes.some((n) => n.id === falseTarget && n.id !== node.id)) {
        edges.push({
          id: `${node.id}->${falseTarget}:false`,
          source: node.id,
          target: falseTarget,
          sourceHandle: "false",
          label: "false",
        });
      }
      return;
    }

    if (next) {
      edges.push({ id: `${node.id}->${next.id}`, source: node.id, target: next.id });
    }
  });
  return edges;
}

/** Reads branch settings back out of stored edges for flows saved elsewhere. */
export function hydrateNodes(definition: Flow["definition"]): FlowNode[] {
  const nodes = definition?.nodes ?? [];
  const edges = definition?.edges ?? [];
  return nodes.map((node) => {
    if (node.type !== "condition" || str(node.data?.falseTarget)) {
      return { ...node, data: node.data ?? {} };
    }
    const outgoing = edges.filter((e) => e.source === node.id);
    const falseEdge = outgoing.find((e) => e.sourceHandle === "false");
    const hasFallback = outgoing.some((e) => !e.sourceHandle);
    const hasTrue = outgoing.some((e) => e.sourceHandle === "true");
    const falseTarget = falseEdge ? falseEdge.target : hasTrue && !hasFallback ? END_TARGET : "";
    return { ...node, data: { ...(node.data ?? {}), ...(falseTarget && { falseTarget }) } };
  });
}

export function newNodeId(existing: number) {
  return `node_${Date.now().toString(36)}_${existing}_${Math.random().toString(36).slice(2, 6)}`;
}
