"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Captions, Maximize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";

type Props = {
  src: string; title: string; captionsSrc?: string | null; startAt?: number;
  /** For live premieres: the furthest point viewers may seek to (seconds). */
  maxTime?: () => number;
  onTick?: (time: number, duration: number) => void;
  onPause?: (time: number) => void;
  onEnded?: () => void;
};

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(sec).padStart(2, "0")}`;
};
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const btn = "grid size-10 place-items-center rounded-full text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-[#f2c14e]";

/** An accessible video player: keyboard shortcuts, captions, speed, resume, and Range streaming from this site. */
export function VideoPlayer({ src, title, captionsSrc, startAt = 0, maxTime, onTick, onPause, onEnded }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [error, setError] = useState(false);

  const limit = useCallback((t: number) => (maxTime ? Math.min(t, maxTime()) : t), [maxTime]);
  const seek = useCallback((t: number) => { const v = video.current; if (v) v.currentTime = Math.max(0, limit(Math.min(t, v.duration || t))); }, [limit]);
  const toggle = useCallback(() => { const v = video.current; if (!v) return; wrap.current?.focus({ preventScroll: true }); /* keep keyboard shortcuts alive when the big play button disappears */ if (v.paused) void v.play().catch(() => undefined); else v.pause(); }, []);
  const fullscreen = useCallback(() => { const el = wrap.current; if (!el) return; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.(); }, []);
  const toggleCaptions = useCallback(() => setCaptionsOn((c) => !c), []);

  useEffect(() => {
    const track = video.current?.textTracks[0];
    if (track) track.mode = captionsOn ? "showing" : "hidden";
  }, [captionsOn, captionsSrc]);

  function onKey(e: React.KeyboardEvent) {
    const v = video.current; if (!v || (e.target as HTMLElement).tagName === "SELECT") return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") { if ((e.target as HTMLElement).tagName === "BUTTON" && k === " ") return; e.preventDefault(); toggle(); }
    else if (k === "j" || k === "arrowleft") { e.preventDefault(); seek(v.currentTime - 10); }
    else if (k === "l" || k === "arrowright") { e.preventDefault(); seek(v.currentTime + 10); }
    else if (k === "m") { v.muted = !v.muted; }
    else if (k === "f") { e.preventDefault(); fullscreen(); }
    else if (k === "c" && captionsSrc) toggleCaptions();
  }

  const top = maxTime ? Math.min(duration || Infinity, maxTime()) : duration;

  return (
    <div ref={wrap} onKeyDown={onKey} tabIndex={0} className="group relative overflow-hidden rounded-2xl bg-black shadow-[0_25px_70px_rgba(38,5,15,.35)] outline-none focus-visible:ring-4 focus-visible:ring-[#f2c14e]" role="group" aria-label={`Video: ${title}`}>
      <video
        ref={video} src={src} preload="metadata" playsInline crossOrigin="anonymous" className="aspect-video w-full bg-black" onClick={toggle}
        onLoadedMetadata={(e) => { const v = e.currentTarget; setDuration(v.duration); if (startAt > 5 && startAt < v.duration - 5) v.currentTime = limit(startAt); }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget; setTime(v.currentTime);
          if (maxTime && v.currentTime > maxTime() + 1.5) v.currentTime = maxTime();
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
          onTick?.(v.currentTime, v.duration);
        }}
        onProgress={(e) => { const v = e.currentTarget; if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1)); }}
        onPlay={() => setPlaying(true)} onPause={(e) => { setPlaying(false); onPause?.(e.currentTarget.currentTime); }}
        onEnded={() => { setPlaying(false); onEnded?.(); }} onError={() => setError(true)}
      >
        {captionsSrc && <track kind="captions" src={captionsSrc} srcLang="en" label="English" />}
      </video>
      {error && <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center text-sm text-white">This video could not be loaded. Check your connection and refresh the page.</div>}
      {!playing && !error && (
        <button type="button" onClick={toggle} aria-label="Play video" className="absolute inset-0 grid place-items-center bg-black/25 transition hover:bg-black/35">
          <span className="grid size-20 place-items-center rounded-full bg-[#f2c14e] text-[#3b0a18] shadow-2xl"><Play className="ml-1 size-8" fill="currentColor" /></span>
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-10 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <div className="relative h-5">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/25"><div className="h-full rounded-full bg-white/35" style={{ width: duration ? `${(buffered / duration) * 100}%` : 0 }} /><div className="absolute inset-y-0 left-0 rounded-full bg-[#f2c14e]" style={{ width: duration ? `${(time / duration) * 100}%` : 0 }} /></div>
          <input type="range" min={0} max={Math.max(1, Math.floor(top || 1))} step={1} value={Math.min(Math.floor(time), Math.floor(top || 1))} onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek" aria-valuetext={`${fmt(time)} of ${fmt(duration)}`} className="absolute inset-0 h-5 w-full cursor-pointer opacity-0" />
        </div>
        <div className="mt-1 flex items-center gap-1 text-white">
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className={btn}>{playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5" fill="currentColor" />}</button>
          <button type="button" onClick={() => seek(time - 10)} aria-label="Back 10 seconds" className={btn}><RotateCcw className="size-4" /></button>
          <button type="button" onClick={() => seek(time + 10)} aria-label="Forward 10 seconds" className={btn}><RotateCw className="size-4" /></button>
          <span className="ml-1 text-xs tabular-nums text-white/90">{fmt(time)} / {fmt(duration)}</span>
          <span className="ml-auto flex items-center gap-1">
            <select aria-label="Playback speed" value={speed} onChange={(e) => { const s = Number(e.target.value); setSpeed(s); if (video.current) video.current.playbackRate = s; }}
              className="h-8 rounded-md bg-white/10 px-1.5 text-xs text-white outline-none focus-visible:outline-2 focus-visible:outline-[#f2c14e] [&>option]:text-black">
              {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
            </select>
            {captionsSrc && <button type="button" onClick={toggleCaptions} aria-pressed={captionsOn} aria-label="Captions" className={`${btn} ${captionsOn ? "bg-white/25" : ""}`}><Captions className="size-5" /></button>}
            <button type="button" onClick={() => { const v = video.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } }} aria-label={muted ? "Unmute" : "Mute"} className={btn}>{muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button>
            <button type="button" onClick={fullscreen} aria-label="Full screen" className={btn}><Maximize className="size-4" /></button>
          </span>
        </div>
      </div>
    </div>
  );
}
