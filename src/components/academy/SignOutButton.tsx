"use client";
export function SignOutButton() {
  return <button onClick={async () => { await fetch("/api/academy/auth/logout", { method: "POST" }); window.location.assign("/academy"); }} className="text-sm font-bold text-[#800020] underline">Sign out</button>;
}
