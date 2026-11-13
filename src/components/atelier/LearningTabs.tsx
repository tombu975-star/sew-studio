"use client";

import { Award, BookOpen, GraduationCap, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNav, type ViewKey } from "@/stores/nav";
import { useRole } from "@/stores/role";
import { useMenuSettings } from "@/stores/menu-settings";
import type { MenuKey } from "@/lib/menu-config";

/**
 * One consistent way to move between the four Learning pages, the way a
 * course site keeps Course / Progress / Work / Certificate in one bar.
 */
export function LearningTabs({ current }: { current: ViewKey }) {
  const go = useNav((s) => s.go);
  const role = useRole();
  const enabled = useMenuSettings((s) => s.enabled);

  type Tab = { view: ViewKey; label: string; icon: typeof BookOpen };
  const all: Tab[] = [
    { view: "curriculum", label: role.isTrainee() ? "My course" : "Curriculum", icon: BookOpen },
    {
      view: "progress",
      label: role.isTrainee() ? "My progress" : role.isTrainer() ? "Trainee progress" : "Progress",
      icon: GraduationCap,
    },
    { view: "portfolio", label: "Portfolio", icon: ImageIcon },
    ...(role.isTrainer() ? [] : [{ view: "certificate" as ViewKey, label: "Certificates", icon: Award }]),
  ];
  const tabs = all.filter((t) => enabled?.[t.view as MenuKey] !== false);

  if (tabs.length < 2) return null;

  return (
    <nav aria-label="Learning" className="-mx-5 mb-5 overflow-x-auto px-5 md:mx-0 md:px-0">
      <ul className="flex w-full gap-2 border-b border-[#E6D4D8] sm:min-w-max sm:gap-1">
        {tabs.map((t) => {
          const active = t.view === current;
          return (
            <li key={t.view} className="min-w-0 flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => go(t.view)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-11 w-full items-center justify-center gap-2 border-b-2 px-1 text-[13px] font-medium transition-colors sm:w-auto sm:px-3.5 sm:text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/40 focus-visible:ring-offset-1",
                  active
                    ? "border-[#800020] text-[#3B0010]"
                    : "border-transparent text-slate-500 hover:text-[#3B0010]"
                )}
              >
                <t.icon className="hidden size-4 sm:block" aria-hidden="true" />
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
