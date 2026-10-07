"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Info, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { ease, motion } from "@/components/motion";
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

  if (config.isLoading) return <Skeleton className="h-52" />;

  if (!config.data?.available) {
    return (
      <div className="flex gap-3 rounded-2xl border border-dashed border-brand-200 bg-white/70 p-4 text-sm text-muted-foreground">
        <Info size={18} className="mt-0.5 shrink-0 text-primary" />
        <p>
          One-click Meta signup isn&apos;t configured on this server yet. Set{" "}
          <code className="rounded bg-brand-50 px-1 text-xs text-brand-800">META_APP_ID</code>,{" "}
          <code className="rounded bg-brand-50 px-1 text-xs text-brand-800">META_APP_SECRET</code> and{" "}
          <code className="rounded bg-brand-50 px-1 text-xs text-brand-800">META_CONFIG_ID</code> to enable
          it — until then, connect using the manual credentials below.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="relative overflow-hidden rounded-2xl border border-brand-200 bg-white p-6 shadow-soft"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" />
      <div aria-hidden className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-pink/15 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <MessageCircle size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold">Connect with Meta</p>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              Recommended
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with Facebook, pick or create a WhatsApp Business Account, and we handle the
            rest — no manual tokens.
          </p>
        </div>
      </div>

      <ul className="relative mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        {["No token copy-paste", "Webhooks auto-subscribed", "Takes about 2 minutes"].map((item) => (
          <li key={item} className="flex items-center gap-1.5 text-foreground/80">
            <CheckCircle2 size={14} className="shrink-0 text-primary" />
            {item}
          </li>
        ))}
      </ul>

      <Button className="relative mt-5 w-full" size="lg" loading={connecting} onClick={startSignup}>
        {!connecting && <CheckCircle2 size={17} />}
        Connect WhatsApp with Meta
      </Button>
    </motion.div>
  );
}
