"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  Clock,
  GitBranch,
  MessageSquare,
  Plus,
  Save,
  Send,
  Tag,
  Trash2,
  UserPlus,
  Webhook,
  Square,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

interface Flow {
  id: string;
  name: string;
  status: string;
  definition: { nodes: FlowNode[]; edges: FlowEdge[] };
}

const NODE_TYPES = [
  { type: "send_message", label: "Send message", icon: Send },
  { type: "ask_question", label: "Ask a question", icon: MessageSquare },
  { type: "condition", label: "Condition", icon: GitBranch },
  { type: "api_request", label: "API request", icon: Webhook },
  { type: "delay", label: "Wait", icon: Clock },
  { type: "add_tag", label: "Add tag", icon: Tag },
  { type: "assign_agent", label: "Assign to agent", icon: UserPlus },
  { type: "end", label: "End", icon: Square },
] as const;

/**
 * Linear flow editor: steps run top to bottom, with edges kept in step with the
 * ordering. A free-form canvas can replace this without changing the stored
 * definition shape.
 */
export default function FlowEditorPage() {
  const params = useParams<{ id: string }>();
  const flowId = params.id;

  const [name, setName] = useState("");
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [dirty, setDirty] = useState(false);

  const flow = useQuery({
    queryKey: ["flow", flowId],
    queryFn: () => api.get<Flow>(`/flows/${flowId}`),
  });

  useEffect(() => {
    if (!flow.data) return;
    setName(flow.data.name);
    setNodes(flow.data.definition?.nodes ?? []);
    setDirty(false);
  }, [flow.data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/flows/${flowId}`, {
        name,
        definition: { nodes, edges: buildEdges(nodes) },
      }),
    onSuccess: () => {
      toast.success("Flow saved");
      setDirty(false);
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save the flow"),
  });

  const publish = useMutation({
    mutationFn: () => api.patch(`/flows/${flowId}`, { status: "published" }),
    onSuccess: () => {
      toast.success("Flow published");
      void flow.refetch();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not publish"),
  });

  const addNode = (type: string) => {
    setNodes((current) => [
      ...current,
      {
        id: `node_${Date.now()}_${current.length}`,
        type,
        position: { x: 0, y: current.length * 160 },
        data: {},
      },
    ]);
    setDirty(true);
  };

  const updateNode = (id: string, data: Record<string, unknown>) => {
    setNodes((current) =>
      current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node)),
    );
    setDirty(true);
  };

  const removeNode = (id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id));
    setDirty(true);
  };

  if (flow.isLoading) {
    return (
      <div className="grid h-96 place-items-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <Badge tone={flow.data?.status === "published" ? "success" : "neutral"}>
              {flow.data?.status ?? "draft"}
            </Badge>
            <Button variant="outline" loading={save.isPending} onClick={() => save.mutate()}>
              {!save.isPending && <Save size={16} />}
              Save
            </Button>
            <Button
              loading={publish.isPending}
              disabled={dirty || nodes.length === 0}
              onClick={() => publish.mutate()}
            >
              Publish
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card className="p-5">
            <label className="text-sm font-medium">Flow name</label>
            <Input
              className="mt-1.5"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
            />
          </Card>

          {nodes.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-sm text-muted-foreground">
                This flow is empty. Add your first step from the panel on the right.
              </p>
            </Card>
          ) : (
            <ol className="space-y-2">
              {nodes.map((node, index) => (
                <li key={node.id}>
                  <NodeCard
                    node={node}
                    index={index}
                    onChange={(data) => updateNode(node.id, data)}
                    onRemove={() => removeNode(node.id)}
                  />
                  {index < nodes.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowDown size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        <Card className="h-fit p-4 lg:sticky lg:top-0">
          <p className="mb-3 text-sm font-semibold">Add a step</p>
          <div className="space-y-1.5">
            {NODE_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => addNode(type)}
                className="flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted"
              >
                <Icon size={16} className="text-muted-foreground" />
                {label}
                <Plus size={14} className="ml-auto text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function NodeCard({
  node,
  index,
  onChange,
  onRemove,
}: {
  node: FlowNode;
  index: number;
  onChange: (data: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const meta = NODE_TYPES.find((n) => n.type === node.type);
  const Icon = meta?.icon ?? MessageSquare;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon size={16} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {index + 1}. {meta?.label ?? node.type}
          </p>
        </div>
        <Button size="sm" variant="ghost" aria-label="Remove step" onClick={onRemove}>
          <Trash2 size={14} className="text-destructive" />
        </Button>
      </div>

      {(node.type === "send_message" || node.type === "ask_question") && (
        <Textarea
          rows={2}
          placeholder="What should the bot say?"
          value={(node.data.text as string) ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      )}

      {node.type === "ask_question" && (
        <Input
          className="mt-2"
          placeholder="Save the answer as (e.g. order_id)"
          value={(node.data.variable as string) ?? ""}
          onChange={(e) => onChange({ variable: e.target.value })}
        />
      )}

      {node.type === "condition" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            placeholder="Variable"
            value={(node.data.variable as string) ?? ""}
            onChange={(e) => onChange({ variable: e.target.value })}
          />
          <Select
            value={(node.data.operator as string) ?? "equals"}
            onChange={(e) => onChange({ operator: e.target.value })}
          >
            <option value="equals">equals</option>
            <option value="contains">contains</option>
            <option value="starts_with">starts with</option>
            <option value="is_empty">is empty</option>
          </Select>
          <Input
            placeholder="Value"
            value={(node.data.value as string) ?? ""}
            onChange={(e) => onChange({ value: e.target.value })}
          />
        </div>
      )}

      {node.type === "api_request" && (
        <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
          <Select
            value={(node.data.method as string) ?? "GET"}
            onChange={(e) => onChange({ method: e.target.value })}
          >
            <option>GET</option>
            <option>POST</option>
          </Select>
          <Input
            type="url"
            placeholder="https://api.example.com/orders"
            value={(node.data.url as string) ?? ""}
            onChange={(e) => onChange({ url: e.target.value })}
          />
        </div>
      )}

      {node.type === "delay" && (
        <Input
          type="number"
          min={1}
          placeholder="Seconds to wait"
          value={(node.data.seconds as number) ?? ""}
          onChange={(e) => onChange({ seconds: Number(e.target.value) })}
        />
      )}

      {node.type === "add_tag" && (
        <Input
          placeholder="Tag name"
          value={(node.data.tag as string) ?? ""}
          onChange={(e) => onChange({ tag: e.target.value })}
        />
      )}

      {node.type === "assign_agent" && (
        <p className="text-sm text-muted-foreground">
          Hands the conversation to the least-busy available agent.
        </p>
      )}

      {node.type === "end" && (
        <p className="text-sm text-muted-foreground">Ends the flow for this contact.</p>
      )}
    </Card>
  );
}

/** Steps are linear, so each node simply points at the next one. */
function buildEdges(nodes: FlowNode[]): FlowEdge[] {
  return nodes.slice(0, -1).map((node, index) => ({
    id: `${node.id}->${nodes[index + 1]!.id}`,
    source: node.id,
    target: nodes[index + 1]!.id,
  }));
}
