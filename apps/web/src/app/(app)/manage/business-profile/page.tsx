"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  Globe,
  Info,
  Mail,
  MapPin,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, Skeleton } from "@/components/ui/states";
import { AnimatePresence, ease, motion } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { initials } from "@/lib/utils";
import { CharCount, SettingsSection, StickySaveBar } from "../_components/settings-kit";

interface BusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
  profile_picture_url?: string;
}

const VERTICALS = [
  "UNDEFINED",
  "OTHER",
  "AUTO",
  "BEAUTY",
  "APPAREL",
  "EDU",
  "ENTERTAIN",
  "EVENT_PLAN",
  "FINANCE",
  "GROCERY",
  "GOVT",
  "HOTEL",
  "HEALTH",
  "NONPROFIT",
  "PROF_SERVICES",
  "RETAIL",
  "TRAVEL",
  "RESTAURANT",
];

const VERTICAL_LABELS: Record<string, string> = {
  UNDEFINED: "Not set",
  OTHER: "Other",
  AUTO: "Automotive",
  BEAUTY: "Beauty, spa & salon",
  APPAREL: "Clothing & apparel",
  EDU: "Education",
  ENTERTAIN: "Entertainment",
  EVENT_PLAN: "Event planning",
  FINANCE: "Finance & banking",
  GROCERY: "Food & grocery",
  GOVT: "Public service",
  HOTEL: "Hotel & lodging",
  HEALTH: "Medical & health",
  NONPROFIT: "Non-profit",
  PROF_SERVICES: "Professional services",
  RETAIL: "Shopping & retail",
  TRAVEL: "Travel & transportation",
  RESTAURANT: "Restaurant",
};

const FORM_ID = "business-profile-form";

/** Only the fields we edit, normalised so dirty-checking is stable. */
function pick(p: BusinessProfile) {
  return {
    about: p.about ?? "",
    address: p.address ?? "",
    description: p.description ?? "",
    email: p.email ?? "",
    websites: (p.websites ?? []).slice(0, 2),
    vertical: p.vertical ?? "UNDEFINED",
  };
}

type FormState = ReturnType<typeof pick>;

export default function BusinessProfilePage() {
  const [form, setForm] = useState<FormState>(pick({}));

  const profile = useQuery({
    queryKey: ["business-profile"],
    queryFn: () => api.get<BusinessProfile>("/waba/business-profile"),
    retry: false,
  });

  const initial = useMemo(() => pick(profile.data ?? {}), [profile.data]);

  useEffect(() => {
    if (profile.data) setForm(pick(profile.data));
  }, [profile.data]);

  const comparable = (f: FormState) => JSON.stringify({ ...f, websites: f.websites.filter(Boolean) });
  const dirty = profile.isSuccess && comparable(form) !== comparable(initial);

  // Verified name + number for the preview header (shared cache with Credentials).
  const waba = useQuery({
    queryKey: ["waba"],
    queryFn: () =>
      api.get<{ data: { display_phone: string; verified_name: string | null } | null }>("/waba"),
  });

  const save = useMutation({
    mutationFn: () =>
      api.patch("/waba/business-profile", {
        about: form.about,
        address: form.address,
        description: form.description,
        email: form.email.trim(),
        websites: form.websites.map((w) => w.trim()).filter(Boolean),
        vertical: form.vertical,
      }),
    onSuccess: () => {
      toast.success("Business profile updated on WhatsApp");
      void profile.refetch();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Could not save"),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const setWebsite = (index: number, value: string) =>
    setForm((current) => {
      const websites = [...current.websites];
      websites[index] = value;
      return { ...current, websites };
    });

  const notConnected =
    profile.isError && profile.error instanceof ApiClientError && profile.error.status === 404;

  return (
    <>
      <PageHeader
        title="Business Profile"
        description="How your business appears to customers inside WhatsApp."
      />

      {profile.isError ? (
        <Card>
          <EmptyState
            icon={Building2}
            title={notConnected ? "Connect WhatsApp first" : "Couldn't load your profile"}
            description={
              notConnected
                ? "Your business profile lives on Meta. Connect a WhatsApp number under Manage Credentials to edit it."
                : profile.error instanceof ApiClientError
                  ? profile.error.message
                  : "Meta didn't respond. Check your connection and try again."
            }
            action={
              notConnected ? (
                <Link href="/manage/credentials" className={buttonVariants()}>
                  Go to Manage Credentials
                </Link>
              ) : (
                <Button variant="outline" onClick={() => void profile.refetch()}>
                  Try again
                </Button>
              )
            }
          />
        </Card>
      ) : profile.isLoading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-[520px]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form
            id={FORM_ID}
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="min-w-0 space-y-5"
          >
            <SettingsSection
              icon={Store}
              title="Profile details"
              description="Stored by Meta and shown on your business profile card."
            >
              <div className="space-y-5">
                <Field label="About" hint="Shown under your business name.">
                  {({ id }) => (
                    <div className="space-y-1">
                      <Input
                        id={id}
                        maxLength={139}
                        value={form.about}
                        onChange={(e) => set("about", e.target.value)}
                        placeholder="Automating WhatsApp for growing businesses"
                      />
                      <div className="flex justify-end">
                        <CharCount value={form.about} max={139} />
                      </div>
                    </div>
                  )}
                </Field>

                <Field label="Description">
                  {({ id }) => (
                    <div className="space-y-1">
                      <Textarea
                        id={id}
                        rows={4}
                        maxLength={512}
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="Tell customers what you do, when you're open and how you can help."
                      />
                      <div className="flex justify-end">
                        <CharCount value={form.description} max={512} />
                      </div>
                    </div>
                  )}
                </Field>

                <Field label="Industry">
                  {({ id }) => (
                    <Select id={id} value={form.vertical} onChange={(e) => set("vertical", e.target.value)}>
                      {VERTICALS.map((vertical) => (
                        <option key={vertical} value={vertical}>
                          {VERTICAL_LABELS[vertical] ?? vertical.replace(/_/g, " ")}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
            </SettingsSection>

            <SettingsSection
              icon={Mail}
              title="Contact & location"
              description="Let customers find and reach you outside WhatsApp."
              delay={0.08}
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Contact email">
                  {({ id }) => (
                    <Input
                      id={id}
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="hello@yourbusiness.com"
                    />
                  )}
                </Field>

                <Field label="Address">
                  {({ id }) => (
                    <Input
                      id={id}
                      maxLength={256}
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="Street, city, country"
                    />
                  )}
                </Field>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground/90">Websites</p>
                  <span className="text-xs text-muted-foreground">WhatsApp allows up to two.</span>
                </div>
                <AnimatePresence initial={false}>
                  {(form.websites.length ? form.websites : [""]).map((site, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease }}
                      className="flex gap-2"
                    >
                      <Input
                        type="url"
                        aria-label={`Website ${i + 1}`}
                        value={site}
                        onChange={(e) => setWebsite(i, e.target.value)}
                        placeholder="https://example.com"
                      />
                      {form.websites.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 shrink-0"
                          aria-label={`Remove website ${i + 1}`}
                          onClick={() =>
                            set(
                              "websites",
                              form.websites.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {form.websites.length < 2 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0"
                    onClick={() =>
                      set("websites", form.websites.length ? [...form.websites, ""] : ["", ""])
                    }
                  >
                    <Plus size={14} />
                    Add another website
                  </Button>
                )}
              </div>
            </SettingsSection>

            {!dirty && (
              <div className="flex justify-end">
                <Button type="submit" loading={save.isPending}>
                  Save to WhatsApp
                </Button>
              </div>
            )}

            <StickySaveBar
              visible={dirty}
              saving={save.isPending}
              formId={FORM_ID}
              saveLabel="Save to WhatsApp"
              onDiscard={() => setForm(initial)}
            />
          </form>

          <ProfilePreview
            form={form}
            pictureUrl={profile.data?.profile_picture_url}
            businessName={waba.data?.data?.verified_name ?? null}
            phone={waba.data?.data?.display_phone ?? null}
          />
        </div>
      )}
    </>
  );
}

function ProfilePreview({
  form,
  pictureUrl,
  businessName,
  phone,
}: {
  form: FormState;
  pictureUrl?: string;
  businessName: string | null;
  phone: string | null;
}) {
  const websites = form.websites.filter(Boolean);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease, delay: 0.1 }}
      className="lg:sticky lg:top-4"
      aria-label="Live preview"
    >
      <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-pink" />
        Live preview
      </p>
      <div className="mx-auto w-full max-w-[320px] rounded-[2.2rem] border-[6px] border-brand-900/90 bg-white shadow-lift">
        <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-brand-900/15" />
        <div className="overflow-hidden rounded-b-[1.8rem]">
          <div className="relative bg-brand-gradient px-5 pb-12 pt-6 text-center text-white">
            <p className="text-xs font-semibold opacity-80">Business info</p>
          </div>
          <div className="-mt-10 flex flex-col items-center px-5">
            {pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pictureUrl}
                alt="Business profile"
                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-soft"
              />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-brand-100 font-display text-2xl font-bold text-primary shadow-soft">
                {initials(businessName, "B")}
              </span>
            )}
            <p className="mt-2 flex items-center gap-1 font-display text-base font-semibold">
              <span className="max-w-[220px] truncate">{businessName ?? "Your business"}</span>
              <BadgeCheck size={15} className="shrink-0 text-primary" />
            </p>
            <p className="text-xs text-muted-foreground">{phone ?? "Business account"}</p>
          </div>

          <div className="mt-4 space-y-3 px-5 pb-6 text-sm">
            <PreviewRow icon={Info} empty="Add an about line">
              {form.about}
            </PreviewRow>
            {form.description && (
              <p className="rounded-xl bg-brand-50/60 p-3 text-xs leading-relaxed text-foreground/80">
                {form.description}
              </p>
            )}
            <PreviewRow icon={Store} empty="Industry not set">
              {form.vertical !== "UNDEFINED" ? VERTICAL_LABELS[form.vertical] : ""}
            </PreviewRow>
            <PreviewRow icon={MapPin} empty="No address">
              {form.address}
            </PreviewRow>
            <PreviewRow icon={Mail} empty="No email">
              {form.email}
            </PreviewRow>
            <PreviewRow icon={Globe} empty="No website">
              {websites.length ? websites.join("\n") : ""}
            </PreviewRow>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

function PreviewRow({
  icon: Icon,
  children,
  empty,
}: {
  icon: typeof Info;
  children: string;
  empty: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-primary" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={children ? "v" : "e"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={
            children
              ? "min-w-0 whitespace-pre-line break-words text-xs text-foreground/90"
              : "text-xs italic text-muted-foreground/70"
          }
        >
          {children || empty}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
