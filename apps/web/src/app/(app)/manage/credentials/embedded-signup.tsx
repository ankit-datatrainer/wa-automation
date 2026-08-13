"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/api-client";

interface EmbeddedSignupConfig {
  available: boolean;
  appId: string | null;
  configId: string | null;
  graphApiVersion: string;
}

/** The subset of the Facebook JS SDK this component actually calls. */
interface FacebookSdk {
  init(options: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }): void;
  login(
    callback: (response: {
      authResponse?: { code?: string };
      status?: string;
    }) => void,
    options: Record<string, unknown>,
  ): void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

const SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";

/** Loads the Facebook SDK once and resolves when window.FB is ready. */
function loadFacebookSdk(appId: string, version: string): Promise<FacebookSdk> {
  return new Promise((resolve, reject) => {
    if (window.FB) return resolve(window.FB);

    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve(window.FB!);
    };

    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => reject(new Error("Could not load the Facebook SDK"));
    document.body.appendChild(script);
  });
}

/** Fields the Embedded Signup popup reports via postMessage once it finishes. */
interface EmbeddedSignupData {
  waba_id: string;
  phone_number_id: string;
}

export function EmbeddedSignup() {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  // Populated by the popup's postMessage before the SDK login callback fires.
  const signupData = useRef<EmbeddedSignupData | null>(null);

  const config = useQuery({
    queryKey: ["waba", "embedded-signup-config"],
    queryFn: () => api.get<EmbeddedSignupConfig>("/waba/embedded-signup/config"),
  });

  const complete = useMutation({
    mutationFn: (code: string) => {
      if (!signupData.current) {
        throw new Error("WhatsApp did not report a business account. Please try again.");
      }
      return api.post("/waba/embedded-signup", {
        code,
        wabaId: signupData.current.waba_id,
        phoneNumberId: signupData.current.phone_number_id,
      });
    },
    onSuccess: () => {
      toast.success("WhatsApp connected via Meta");
      void queryClient.invalidateQueries({ queryKey: ["waba"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiClientError ? error.message : (error.message ?? "Connection failed"),
      ),
    onSettled: () => setConnecting(false),
  });

  // The popup posts the WABA/phone ids as a message on window; the SDK login
  // callback separately returns the auth code. Both are needed to finish, so
  // this listener just captures the ids for the callback to pick up.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") {
        return;
      }
      try {
        const payload = JSON.parse(event.data as string) as {
          type?: string;
          event?: string;
          data?: EmbeddedSignupData;
        };
        if (payload.type === "WA_EMBEDDED_SIGNUP" && payload.event === "FINISH" && payload.data) {
          signupData.current = payload.data;
        }
      } catch {
        // Not every message on the window is ours to parse; ignore the rest.
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const startSignup = async () => {
    if (!config.data?.appId || !config.data.configId) return;

    setConnecting(true);
    signupData.current = null;

    try {
      const fb = await loadFacebookSdk(config.data.appId, `v${config.data.graphApiVersion.replace(/^v/, "")}`);

      fb.login(
        (response) => {
          const code = response.authResponse?.code;
          if (!code) {
            setConnecting(false);
            if (response.status !== "unknown") {
              toast.error("WhatsApp connection was cancelled");
            }
            return;
          }
          complete.mutate(code);
        },
        {
          config_id: config.data.configId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
        },
      );
    } catch (err) {
      setConnecting(false);
      toast.error(err instanceof Error ? err.message : "Could not start WhatsApp signup");
    }
  };

  if (config.isLoading) return null;

  if (!config.data?.available) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        One-click Meta signup isn&apos;t configured on this server yet. Set{" "}
        <code>META_APP_ID</code>, <code>META_APP_SECRET</code> and <code>META_CONFIG_ID</code> to
        enable it — until then, connect using the manual credentials below.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-accent p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <MessageCircle size={20} />
        </span>
        <div className="flex-1">
          <p className="font-bold">Connect with Meta</p>
          <p className="text-sm text-muted-foreground">
            Sign in with Facebook, pick or create a WhatsApp Business Account, and we handle the
            rest — no manual tokens.
          </p>
        </div>
      </div>

      <Button
        className="mt-4 w-full"
        loading={connecting}
        onClick={startSignup}
      >
        {!connecting && <CheckCircle2 size={16} />}
        Connect WhatsApp with Meta
      </Button>
    </div>
  );
}
