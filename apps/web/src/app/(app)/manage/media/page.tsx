"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CloudUpload,
  ExternalLink,
  File,
  FileText,
  Film,
  HardDrive,
  ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  Music,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { AnimatePresence, ease, motion, SegmentedTabs } from "@/components/motion";
import { api, ApiClientError } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  ConfirmDialog,
  formatBytes,
  formatDateTime,
  StatTile,
  timeAgo,
} from "../_components/settings-kit";

interface MediaFile {
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

type Kind = "image" | "video" | "audio" | "document";
type Filter = "all" | Kind;

interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

/** Hard ceiling — WhatsApp documents top out at 100 MB. */
const MAX_BYTES = 100 * 1024 * 1024;

function kindOf(mime: string): Kind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

const KIND_META: Record<Kind, { icon: typeof File; label: string; tint: string }> = {
  image: { icon: ImageIcon, label: "Image", tint: "from-brand-500 to-brand-pink" },
  video: { icon: Film, label: "Video", tint: "from-brand-700 to-brand-magenta" },
  audio: { icon: Music, label: "Audio", tint: "from-brand-magenta to-brand-orange" },
  document: { icon: FileText, label: "Document", tint: "from-brand-600 to-brand-400" },
};

export default function MediaUploadsPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<MediaFile | null>(null);

  const media = useQuery({
    queryKey: ["media"],
    queryFn: () => api.get<{ data: MediaFile[] }>("/settings/media"),
  });

  const rows = useMemo(() => media.data?.data ?? [], [media.data]);

  // Short-lived signed URLs for thumbnails / open. If the bucket policy doesn't
  // allow it we simply fall back to file-type icons.
  const signed = useQuery({
    queryKey: ["media", "signed-urls", rows.map((r) => r.file_path)],
    enabled: rows.length > 0,
    staleTime: 50 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("media")
        .createSignedUrls(
          rows.map((r) => r.file_path),
          60 * 60,
        );
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl && !item.error) map[item.path] = item.signedUrl;
      }
      return map;
    },
  });
  const urls = signed.data ?? {};

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["media"] });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/media/${id}`),
    onSuccess: () => {
      toast.success("File deleted");
      setPendingDelete(null);
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  const patchUpload = (id: string, patch: Partial<UploadItem>) =>
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  /** Uploads straight to Supabase Storage, then records the row via the API. */
  const uploadOne = async (file: File, itemId: string) => {
    try {
      if (file.size > MAX_BYTES) throw new Error("File is larger than 100 MB");
      const supabase = createClient();
      const path = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;

      const { error } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;

      await api.post("/settings/media", {
        filePath: path,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      patchUpload(itemId, { status: "done" });
      return true;
    } catch (error) {
      patchUpload(itemId, {
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
      return false;
    }
  };

  const handleFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;

    const items: UploadItem[] = list.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      name: file.name,
      size: file.size,
      status: "uploading",
    }));
    setUploads((current) => [...items, ...current].slice(0, 12));

    let ok = 0;
    // Sequential keeps storage paths unique and avoids hammering the API.
    for (const [i, file] of list.entries()) {
      if (await uploadOne(file, items[i]!.id)) ok += 1;
    }

    if (ok) {
      toast.success(ok === 1 ? "File uploaded" : `${ok} files uploaded`);
      void invalidate();
    }
    if (ok < list.length) toast.error(`${list.length - ok} upload${list.length - ok > 1 ? "s" : ""} failed`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploading = uploads.some((u) => u.status === "uploading");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (f) =>
        (filter === "all" || kindOf(f.mime_type) === filter) &&
        (!q || f.file_name.toLowerCase().includes(q)),
    );
  }, [rows, filter, search]);

  const totalBytes = rows.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0);
  const imageCount = rows.filter((f) => kindOf(f.mime_type) === "image").length;

  return (
    <>
      <PageHeader
        title="Media Uploads"
        description="Images, videos and documents you can attach to templates and messages."
        actions={
          <Button onClick={() => inputRef.current?.click()} loading={uploading}>
            {!uploading && <CloudUpload size={16} />}
            Upload files
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={HardDrive} label="Files" value={media.isSuccess ? rows.length : null} />
        <StatTile
          icon={CloudUpload}
          label="Storage used"
          tone="soft"
          value={media.isSuccess ? totalBytes : null}
          format={(n) => formatBytes(Math.round(n))}
        />
        <StatTile icon={ImageIcon} label="Images" tone="soft" value={media.isSuccess ? imageCount : null} />
      </div>

      {/* ------------------------------------------------------------ dropzone */}
      <motion.label
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative mb-5 flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed bg-white/80 p-8 text-center transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/40 sm:p-12",
          dragging
            ? "scale-[1.01] border-primary bg-brand-50 shadow-glow"
            : "border-brand-200 hover:border-brand-300 hover:bg-brand-50/50",
          uploading && "pointer-events-none opacity-80",
        )}
      >
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
        <motion.span
          animate={dragging ? { y: -6, scale: 1.08 } : { y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="relative grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
        >
          {uploading ? <Loader2 size={28} className="animate-spin" /> : <CloudUpload size={28} />}
        </motion.span>
        <div className="relative space-y-1">
          <p className="font-display text-lg font-semibold">
            {uploading ? "Uploading…" : dragging ? "Drop to upload" : "Drag & drop files here"}
          </p>
          <p className="text-sm text-muted-foreground">
            or <span className="font-semibold text-primary">browse your computer</span> · images, video,
            audio or PDF up to 100 MB
          </p>
          <p className="text-xs text-muted-foreground/80">
            WhatsApp limits: images 5 MB · video &amp; audio 16 MB · documents 100 MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          disabled={uploading}
          aria-label="Choose files to upload"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </motion.label>

      {/* ------------------------------------------------------ upload queue */}
      <AnimatePresence initial={false}>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="mb-5 overflow-hidden"
          >
            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Recent uploads</p>
                {!uploading && (
                  <Button variant="ghost" size="sm" onClick={() => setUploads([])}>
                    Clear
                  </Button>
                )}
              </div>
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {uploads.map((u) => (
                    <motion.li
                      key={u.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="relative flex items-center gap-3 overflow-hidden rounded-xl border bg-white px-3 py-2 text-sm"
                    >
                      {u.status === "uploading" && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-y-0 left-0 bg-brand-50"
                          initial={{ width: "5%" }}
                          animate={{ width: "90%" }}
                          transition={{ duration: 4, ease: "easeOut" }}
                        />
                      )}
                      <span className="relative shrink-0">
                        {u.status === "uploading" ? (
                          <Loader2 size={16} className="animate-spin text-primary" />
                        ) : u.status === "done" ? (
                          <CheckCircle2 size={16} className="text-emerald-600" />
                        ) : (
                          <XCircle size={16} className="text-destructive" />
                        )}
                      </span>
                      <span className="relative min-w-0 flex-1 truncate font-medium">{u.name}</span>
                      <span className="relative shrink-0 text-xs text-muted-foreground">
                        {u.status === "error" ? (
                          <span className="text-destructive">{u.error}</span>
                        ) : (
                          formatBytes(u.size)
                        )}
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --------------------------------------------------------- library */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
            <SegmentedTabs
              layoutId="media-filter"
              value={filter}
              onChange={setFilter}
              tabs={[
                { value: "all", label: "All" },
                { value: "image", label: "Images" },
                { value: "video", label: "Video" },
                { value: "audio", label: "Audio" },
                { value: "document", label: "Docs" },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search files"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search files…"
                className="h-10 pl-9"
              />
            </div>
            <SegmentedTabs
              layoutId="media-view"
              value={view}
              onChange={setView}
              tabs={[
                { value: "grid", label: <LayoutGrid size={15} aria-label="Grid view" /> },
                { value: "list", label: <List size={15} aria-label="List view" /> },
              ]}
            />
          </div>
        </div>

        {media.isError ? (
          <div className="p-5">
            <ErrorState message="Could not load your media." onRetry={() => void media.refetch()} />
          </div>
        ) : media.isLoading ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CloudUpload}
            title="No media yet"
            description="Upload files here to reuse them across templates and campaigns."
            action={<Button onClick={() => inputRef.current?.click()}>Upload your first file</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title="No matching files" description="Try another filter or search term." />
        ) : view === "grid" ? (
          <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            <AnimatePresence>
              {filtered.map((file, i) => {
                const kind = kindOf(file.mime_type);
                const meta = KIND_META[kind];
                const url = urls[file.file_path];
                return (
                  <motion.li
                    key={file.id}
                    layout
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1, transition: { duration: 0.35, ease, delay: Math.min(i, 18) * 0.03 } }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    whileHover={{ y: -4 }}
                    className="group overflow-hidden rounded-2xl border bg-white shadow-soft transition-shadow hover:border-brand-200 hover:shadow-lift"
                  >
                    <div className="relative aspect-square overflow-hidden bg-brand-50/50">
                      {kind === "image" && url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt={file.file_name}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center">
                          <span
                            className={cn(
                              "grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-glow",
                              meta.tint,
                            )}
                          >
                            <meta.icon size={24} />
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-2 top-2 flex justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${file.file_name}`}
                            className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-foreground shadow-soft backdrop-blur transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          aria-label={`Delete ${file.file_name}`}
                          onClick={() => setPendingDelete(file)}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-destructive shadow-soft backdrop-blur transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-0.5 p-3">
                      <p className="truncate text-sm font-semibold" title={file.file_name}>
                        {file.file_name}
                      </p>
                      <p className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>{formatBytes(file.size_bytes)}</span>
                        <span className="truncate">{timeAgo(file.created_at, "")}</span>
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>File</TH>
                <TH>Type</TH>
                <TH>Size</TH>
                <TH>Uploaded</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((file) => {
                const meta = KIND_META[kindOf(file.mime_type)];
                const url = urls[file.file_path];
                return (
                  <TR key={file.id}>
                    <TD>
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white",
                            meta.tint,
                          )}
                        >
                          <meta.icon size={16} />
                        </span>
                        <span className="max-w-[280px] truncate font-medium">{file.file_name}</span>
                      </div>
                    </TD>
                    <TD className="font-mono text-xs text-muted-foreground">{file.mime_type}</TD>
                    <TD className="whitespace-nowrap">{formatBytes(file.size_bytes)}</TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(file.created_at)}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${file.file_name}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-primary"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          aria-label={`Delete ${file.file_name}`}
                          onClick={() => setPendingDelete(file)}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
        loading={remove.isPending}
        title="Delete this file?"
        description={
          pendingDelete ? (
            <>
              <b className="break-all">{pendingDelete.file_name}</b> will be removed from storage. Templates
              that link to it may stop showing the media.
            </>
          ) : undefined
        }
      />
    </>
  );
}
