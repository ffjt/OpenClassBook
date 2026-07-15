import { Settings, UserRound } from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import type { DashboardSection } from "@/components/dashboard/dashboard-sidebar";
import type { Language } from "@/lib/i18n";

interface DashboardHeaderProps {
  activeSection: DashboardSection;
  language: Language;
  onToggleLanguage: () => void;
  ownerName?: string;
}

const sectionTitles: Record<DashboardSection, Record<Language, string>> = {
  Overview: { en: "Overview", zh: "概览" },
  Authors: { en: "Authors", zh: "作者" },
  Review: { en: "Review", zh: "审核" },
  Template: { en: "Format Settings", zh: "格式设置" },
  Layout: { en: "Book Layout", zh: "书籍排版" },
  Export: { en: "Export", zh: "导出" },
  Settings: { en: "Settings", zh: "设置" },
};

export function DashboardHeader({
  activeSection,
  language,
  onToggleLanguage,
  ownerName,
}: DashboardHeaderProps) {
  const ownerInitials = ownerName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-xl sm:px-7 lg:px-10">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="text-lg">
          📚
        </span>
        <span className="text-sm font-semibold tracking-[-0.015em] text-foreground sm:text-[15px]">
          OpenClassBook
        </span>
        <span className="hidden text-border sm:inline">/</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {sectionTitles[activeSection][language]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <LanguageToggle language={language} onToggle={onToggleLanguage} />
        <ThemeToggle language={language} />
        <button
          aria-label={language === "zh" ? "设置" : "Settings"}
          className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex"
          type="button"
        >
          <Settings className="size-[17px]" />
        </button>
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <button
          aria-label={language === "zh" ? "打开用户菜单" : "Open user menu"}
          className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white shadow-sm ring-2 ring-white/10 focus-visible:outline-none focus-visible:ring-blue-400"
          type="button"
        >
          {ownerInitials || <UserRound className="size-4" />}
        </button>
      </div>
    </header>
  );
}
