"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/** Phone menu that closes after you tap a link, press Escape or tap outside (a bare <details> stays open). */
export function MobileMenu({ items, signInHref, signInLabel }: { items: { label: string; href: string }[]; signInHref?: string; signInLabel?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [open]);

  const cls = "block rounded-xl px-4 py-3 text-sm font-semibold text-[#5b3e46] hover:bg-[#f8edf0] hover:text-[#800020]";
  return (
    <div ref={box} className="relative xl:hidden">
      <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-lg border border-[#eadde0] bg-white text-[#800020]">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-64 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-[#eadde0] bg-[#fffdfa] p-2 shadow-2xl">
          {items.map((item) => /^https?:\/\//i.test(item.href)
            ? <a key={`${item.href}-${item.label}`} href={item.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={() => setOpen(false)}>{item.label}</a>
            : <Link key={`${item.href}-${item.label}`} href={item.href} className={cls} onClick={() => setOpen(false)}>{item.label}</Link>)}
          {signInHref && <div className="mt-2 border-t border-[#eadde0] pt-2"><a href={signInHref} onClick={()=>setOpen(false)} className="block rounded-lg bg-[#800020] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#650019]">{signInLabel || "Sign in"}</a></div>}
        </div>
      )}
    </div>
  );
}
