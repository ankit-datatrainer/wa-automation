"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { api, ApiClientError } from "@/lib/api-client";
import { Modal } from "../_components/overlay";

export interface SuspendTarget {
  id: string;
  name: string;
  is_suspended: boolean;
}

/** Suspends (with a reason shown to the tenant) or restores an organization. */
export function SuspendDialog({ org, onClose }: { org: SuspendTarget; onClose: () => void }) {
  const queryClient = useQueryClient();
  const suspending = !org.is_suspended;
  const [reason, setReason] = useState("");

  const toggle = useMutation({
    mutationFn: () =>
      api.post(`/platform/organizations/${org.id}/suspend`, {
        suspended: suspending,
        ...(suspending && reason.trim() && { reason: reason.trim() }),
      }),
    onSuccess: () => {
      toast.success(suspending ? "Organization suspended" : "Organization restored");
      void queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not update"),
  });

  return (
    <Modal
      onClose={onClose}
      icon={suspending ? ShieldAlert : ShieldCheck}
      title={suspending ? "Suspend organization" : "Restore organization"}
      description={org.name}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={suspending ? "destructive" : "primary"}
            loading={toggle.isPending}
            onClick={() => toggle.mutate()}
          >
            {suspending ? "Suspend access" : "Restore access"}
          </Button>
        </>
      }
    >
      {suspending ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Every member of <span className="font-semibold text-foreground">{org.name}</span> will
            lose access to the workspace until it is restored. Campaigns and automations stop.
          </p>
          <Field label="Reason" hint="Shown to the tenant. Max 500 characters.">
            {({ id }) => (
              <Textarea
                id={id}
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Payment overdue — please contact support."
                autoFocus
              />
            )}
          </Field>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Members of <span className="font-semibold text-foreground">{org.name}</span> will regain
          access immediately and the suspension reason will be cleared.
        </p>
      )}
    </Modal>
  );
}
