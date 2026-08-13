import { describe, expect, it } from "vitest";
import {
  evaluateCondition,
  findStartNode,
  interpolate,
  matchOptInKeyword,
  nextNodeId,
  selectTriggeredChatbot,
  type FlowDefinition,
} from "../flow-logic.js";

const linearFlow: FlowDefinition = {
  nodes: [
    { id: "a", type: "send_message", data: { text: "Hello" } },
    { id: "b", type: "ask_question", data: { text: "Name?", variable: "name" } },
    { id: "c", type: "end", data: {} },
  ],
  edges: [
    { id: "e1", source: "a", target: "b" },
    { id: "e2", source: "b", target: "c" },
  ],
};

describe("findStartNode", () => {
  it("picks the node nothing points at", () => {
    expect(findStartNode(linearFlow)?.id).toBe("a");
  });

  it("falls back to the first node when every node is a target (a cycle)", () => {
    const cyclic: FlowDefinition = {
      nodes: [
        { id: "x", type: "send_message", data: {} },
        { id: "y", type: "send_message", data: {} },
      ],
      edges: [
        { id: "e1", source: "x", target: "y" },
        { id: "e2", source: "y", target: "x" },
      ],
    };
    expect(findStartNode(cyclic)?.id).toBe("x");
  });

  it("returns undefined for an empty flow", () => {
    expect(findStartNode({ nodes: [], edges: [] })).toBeUndefined();
  });
});

describe("nextNodeId", () => {
  it("follows the single outgoing edge", () => {
    expect(nextNodeId(linearFlow, "a")).toBe("b");
  });

  it("returns null at the end of the flow", () => {
    expect(nextNodeId(linearFlow, "c")).toBeNull();
  });

  it("takes the branch matching the handle", () => {
    const branching: FlowDefinition = {
      nodes: [
        { id: "cond", type: "condition", data: {} },
        { id: "yes", type: "send_message", data: {} },
        { id: "no", type: "send_message", data: {} },
      ],
      edges: [
        { id: "e1", source: "cond", target: "yes", sourceHandle: "true" },
        { id: "e2", source: "cond", target: "no", sourceHandle: "false" },
      ],
    };

    expect(nextNodeId(branching, "cond", "true")).toBe("yes");
    expect(nextNodeId(branching, "cond", "false")).toBe("no");
  });

  it("uses an unlabelled edge as the fallback when the branch is missing", () => {
    const partial: FlowDefinition = {
      nodes: [
        { id: "cond", type: "condition", data: {} },
        { id: "yes", type: "send_message", data: {} },
        { id: "fallback", type: "send_message", data: {} },
      ],
      edges: [
        { id: "e1", source: "cond", target: "yes", sourceHandle: "true" },
        { id: "e2", source: "cond", target: "fallback" },
      ],
    };

    expect(nextNodeId(partial, "cond", "false")).toBe("fallback");
  });
});

describe("evaluateCondition", () => {
  const variables = { answer: "Yes please", empty: "  " };

  it("compares equality case-insensitively", () => {
    expect(
      evaluateCondition({ variable: "answer", operator: "equals", value: "yes please" }, variables),
    ).toBe(true);
  });

  it("supports contains and starts_with", () => {
    expect(
      evaluateCondition({ variable: "answer", operator: "contains", value: "PLEASE" }, variables),
    ).toBe(true);
    expect(
      evaluateCondition({ variable: "answer", operator: "starts_with", value: "yes" }, variables),
    ).toBe(true);
    expect(
      evaluateCondition({ variable: "answer", operator: "starts_with", value: "no" }, variables),
    ).toBe(false);
  });

  it("treats whitespace as empty", () => {
    expect(evaluateCondition({ variable: "empty", operator: "is_empty" }, variables)).toBe(true);
    expect(evaluateCondition({ variable: "answer", operator: "is_empty" }, variables)).toBe(false);
  });

  it("does not match a missing variable against a non-empty value", () => {
    expect(
      evaluateCondition({ variable: "nope", operator: "equals", value: "x" }, variables),
    ).toBe(false);
  });
});

describe("interpolate", () => {
  const ctx = { contactName: "Ankit", waId: "919266806659", variables: { order: "A-1001" } };

  it("substitutes collected variables", () => {
    expect(interpolate("Your order {{order}} shipped", ctx)).toBe("Your order A-1001 shipped");
  });

  it("substitutes contact fields", () => {
    expect(interpolate("Hi {{contact.name}}", ctx)).toBe("Hi Ankit");
    expect(interpolate("{{contact.phone}}", ctx)).toBe("919266806659");
  });

  it("falls back to a friendly greeting when the name is unknown", () => {
    expect(interpolate("Hi {{contact.name}}", { ...ctx, contactName: null })).toBe("Hi there");
  });

  it("replaces unknown placeholders with an empty string rather than leaving braces", () => {
    expect(interpolate("A{{missing}}B", ctx)).toBe("AB");
  });

  it("tolerates internal whitespace in the placeholder", () => {
    expect(interpolate("{{ order }}", ctx)).toBe("A-1001");
  });
});

describe("matchOptInKeyword", () => {
  it("recognises opt-out keywords regardless of case or padding", () => {
    expect(matchOptInKeyword("STOP")).toBe("opted_out");
    expect(matchOptInKeyword("  stop  ")).toBe("opted_out");
    expect(matchOptInKeyword("Unsubscribe")).toBe("opted_out");
    expect(matchOptInKeyword("stop.")).toBe("opted_out");
  });

  it("recognises opt-in keywords", () => {
    expect(matchOptInKeyword("START")).toBe("opted_in");
    expect(matchOptInKeyword("subscribe")).toBe("opted_in");
  });

  it("ignores keywords embedded in a sentence", () => {
    // The classic false positive: this is a normal message, not a withdrawal.
    expect(matchOptInKeyword("Please stop by the shop tomorrow")).toBeNull();
    expect(matchOptInKeyword("when does the sale start")).toBeNull();
  });

  it("returns null for ordinary messages", () => {
    expect(matchOptInKeyword("Hi, I need help with my order")).toBeNull();
    expect(matchOptInKeyword("")).toBeNull();
  });
});

describe("selectTriggeredChatbot", () => {
  const keywordBot = {
    id: "kw",
    trigger_type: "keyword",
    trigger_config: { keywords: ["order", "track"] },
  };
  const welcomeBot = { id: "welcome", trigger_type: "welcome", trigger_config: {} };
  const catchAllBot = { id: "catch", trigger_type: "catch_all", trigger_config: {} };

  it("prefers a keyword match over the catch-all", () => {
    const bot = selectTriggeredChatbot([catchAllBot, keywordBot], "where is my order", false, false);
    expect(bot?.id).toBe("kw");
  });

  it("falls back to the catch-all when nothing matches", () => {
    const bot = selectTriggeredChatbot([catchAllBot, keywordBot], "hello there", false, false);
    expect(bot?.id).toBe("catch");
  });

  it("uses the welcome bot only on the first ever message", () => {
    expect(selectTriggeredChatbot([welcomeBot], "hello", true, false)?.id).toBe("welcome");
    expect(selectTriggeredChatbot([welcomeBot], "hello", false, false)).toBeNull();
  });

  it("prefers a keyword match over the welcome bot even on a first message", () => {
    const bot = selectTriggeredChatbot([welcomeBot, keywordBot], "track my parcel", true, false);
    expect(bot?.id).toBe("kw");
  });

  it("uses the away bot only outside working hours", () => {
    const awayBot = { id: "away", trigger_type: "away", trigger_config: {} };
    expect(selectTriggeredChatbot([awayBot], "hi", false, true)?.id).toBe("away");
    expect(selectTriggeredChatbot([awayBot], "hi", false, false)).toBeNull();
  });

  it("returns null when there are no bots at all", () => {
    expect(selectTriggeredChatbot([], "anything", true, true)).toBeNull();
  });

  it("ignores empty keyword strings so a blank config cannot match everything", () => {
    const emptyKeywords = {
      id: "blank",
      trigger_type: "keyword",
      trigger_config: { keywords: ["", "  "] },
    };
    expect(selectTriggeredChatbot([emptyKeywords], "hello", false, false)).toBeNull();
  });
});
