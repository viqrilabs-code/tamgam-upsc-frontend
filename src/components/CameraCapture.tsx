"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X } from "lucide-react";
import { Button, Modal } from "./ui";

/**
 * Take a photo of a handwritten answer page.
 * Phones/tablets: the native camera opens directly (file input with capture="environment").
 * Laptops/desktops: a live preview via getUserMedia, then "Capture" → JPEG.
 */
export default function CameraCapture({ onPhoto, disabled, label = "Take photo" }:
  { onPhoto: (file: File) => void; disabled?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string>();
  const [shot, setShot] = useState<string>();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const nativeInput = useRef<HTMLInputElement>(null);

  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" },
          width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        if (!alive) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        if (video.current) { video.current.srcObject = s; await video.current.play(); }
      } catch {
        setErr("Couldn't open the camera. Allow camera access in your browser, or use “Upload image” instead.");
      }
    })();
    return () => { alive = false; stop(); };
  }, [open]);

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setShot(c.toDataURL("image/jpeg", 0.85));
  }

  async function use() {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    onPhoto(new File([blob], `page-${Date.now()}.jpg`, { type: "image/jpeg" }));
    close();
  }

  function close() { stop(); setShot(undefined); setErr(undefined); setOpen(false); }

  return (
    <>
      <button type="button" disabled={disabled}
        onClick={() => (touch || !navigator.mediaDevices?.getUserMedia ? nativeInput.current?.click() : setOpen(true))}
        className="inline-flex items-center gap-2 rounded-2xl border-2 border-line px-3 py-1.5 font-semibold hover:border-ink disabled:opacity-50">
        <Camera size={16} /> {label}
      </button>
      <input ref={nativeInput} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }} />
      <Modal open={open} onClose={close} title="Photograph your answer page">
        {err ? <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{err}</p> : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {shot ? <img src={shot} alt="Captured page" className="max-h-[60vh] w-full object-contain" />
                : <video ref={video} playsInline muted className="max-h-[60vh] w-full object-contain" />}
            </div>
            <p className="text-xs text-muted">Hold the page flat, fill the frame, and avoid shadows. One page per photo.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}><X size={16} /> Cancel</Button>
              {shot ? <>
                <Button variant="outline" onClick={() => setShot(undefined)}><RotateCcw size={16} /> Retake</Button>
                <Button onClick={use}>Use this photo</Button>
              </> : <Button onClick={capture}><Camera size={16} /> Capture</Button>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
