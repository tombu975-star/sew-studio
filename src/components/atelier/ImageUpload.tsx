"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadImage } from "@/lib/imageUpload";

/**
 * Direct picture upload (file picker / phone camera) with preview. `value`
 * is the stored public URL; onChange receives the new URL, or "" when
 * removed. Replaces plain "paste an image link" text inputs app-wide.
 */
export function ImageUpload({
  value,
  onChange,
  kind = "general",
  shape = "square",
  label = "Upload picture",
  hint = "JPG, PNG or WebP · up to 5 MB",
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  kind?: "avatar" | "design" | "general";
  shape?: "square" | "wide";
  label?: string;
  hint?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, kind));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={label}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl border border-dashed border-[#D8C2BB] bg-[#FAF2EC] flex items-center justify-center text-stone-400 hover:border-[#9E5A44]/50 hover:text-[#9E5A44] transition-colors",
          shape === "wide" ? "h-28 w-40" : "size-24"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <Camera className="size-6" />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="size-5 animate-spin text-[#9E5A44]" />
          </span>
        )}
      </button>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#EAE6DF] bg-white px-3 py-1.5 text-xs font-medium text-[#1C1A18] hover:border-[#9E5A44]/40 disabled:opacity-50"
          >
            <Upload className="size-3.5" /> {value ? "Change" : label}
          </button>
          {value && !busy && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-stone-500 hover:text-red-600"
            >
              <Trash2 className="size-3.5" /> Remove
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-stone-400">{busy ? "Uploading…" : hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
