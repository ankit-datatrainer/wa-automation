"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";

interface MediaFile {
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export default function MediaUploadsPage() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const media = useQuery({
    queryKey: ["media"],
    queryFn: () => api.get<{ data: MediaFile[] }>("/settings/media"),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["media"] });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/media/${id}`),
    onSuccess: () => {
      toast.success("File deleted");
      void invalidate();
    },
    onError: (error) =>
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed"),
  });

  /** Uploads straight to Supabase Storage, then records the row via the API. */
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
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

      toast.success("File uploaded");
      void invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const rows = media.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Media Uploads"
        description="Images, videos and documents you can attach to templates and messages."
      />

      <Card className="mb-4 p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors hover:bg-muted/40">
          {uploading ? (
            <>
              <Upload size={32} className="animate-pulse text-muted-foreground" />
              <span className="text-sm font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <FileUp size={32} className="text-muted-foreground" />
              <span className="text-sm font-medium">Choose a file to upload</span>
              <span className="text-xs text-muted-foreground">
                Images, video, audio or PDF. WhatsApp caps media at 16 MB for most types.
              </span>
            </>
          )}
          <input
            type="file"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </label>
      </Card>

      <Card>
        {media.isError ? (
          <ErrorState message="Could not load your media." onRetry={() => void media.refetch()} />
        ) : media.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileUp}
            title="No media yet"
            description="Upload files here to reuse them across templates and campaigns."
          />
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
              {rows.map((file) => (
                <TR key={file.id}>
                  <TD className="font-medium">{file.file_name}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">{file.mime_type}</TD>
                  <TD>{formatBytes(file.size_bytes)}</TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(file.created_at).toLocaleString()}
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${file.file_name}`}
                        onClick={() => remove.mutate(file.id)}
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
