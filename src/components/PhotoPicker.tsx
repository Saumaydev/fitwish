"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/client";

async function compressImage(file: File, maxDim: number, quality: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Compression failed");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface UploadResult {
  url: string;
  thumbnailUrl: string | null;
  storagePath: string;
}

export function PhotoPicker({
  value,
  onUploaded,
  scope,
  label = "Add photo",
  onClear,
}: {
  value: string | null;
  onUploaded: (res: UploadResult) => void;
  scope: "profile" | "progress";
  label?: string;
  onClear?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined | null) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const main = await compressImage(file, 1400, 0.78);
      const thumb = await compressImage(file, 360, 0.72);
      const fd = new FormData();
      fd.append("scope", scope);
      fd.append("file", main, "photo.jpg");
      fd.append("thumb", thumb, "thumb.jpg");
      const res = await api<UploadResult>("/api/upload", { formData: fd });
      onUploaded(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-3">
        <img src={value} alt="Selected" className="h-16 w-16 rounded-2xl border border-line object-cover" />
        <div className="flex gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} className="btn btn-secondary btn-sm">
            <Camera size={14} /> Change
          </button>
          {onClear && (
            <button type="button" onClick={onClear} aria-label="Remove photo" className="btn btn-ghost btn-sm btn-icon text-err">
              <Trash2 size={15} />
            </button>
          )}
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={busy} className="btn btn-secondary btn-sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {busy ? "Uploading…" : label}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label="Choose from gallery"
          className="btn btn-secondary btn-sm btn-icon"
        >
          <ImagePlus size={15} />
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
