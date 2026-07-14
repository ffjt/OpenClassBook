import { Settings } from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import type { DashboardSection } from "@/components/dashboard/dashboard-sidebar";
import type { Language } from "@/lib/i18n";

interface DashboardHeaderProps {
  activeSection: DashboardSection;
  language: Language;
  onToggleLanguage: () => void;
}

const sectionTitles: Record<DashboardSection, Record<Language, string>> = {
  Overview: { en: "Overview", zh: "概览" },
  Authors: { en: "Authors", zh: "作者" },
  Articles: { en: "Articles", zh: "文章" },
  Review: { en: "Review", zh: "审核" },
  Template: { en: "Format Settings", zh: "格式设置" },
  Export: { en: "Export", zh: "导出" },
  Settings: { en: "Settings", zh: "设置" },
};

export function DashboardHeader({
  activeSection,
  language,
  onToggleLanguage,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#0e0f12]/90 px-5 backdrop-blur-xl sm:px-7 lg:px-10">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="text-lg">
          📚
        </span>
        <span className="text-sm font-semibold tracking-[-0.015em] text-zinc-100 sm:text-[15px]">
          OpenClassBook
        </span>
        <span className="hidden text-zinc-700 sm:inline">/</span>
        <span className="hidden text-sm text-zinc-500 sm:inline">
          {sectionTitles[activeSection][language]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <LanguageToggle language={language} onToggle={onToggleLanguage} />
        <button
          aria-label={language === "zh" ? "设置" : "Settings"}
          className="hidden size-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex"
          type="button"
        >
          <Settings className="size-[17px]" />
        </button>
        <div className="mx-1 hidden h-5 w-px bg-white/[0.08] sm:block" />
        <button
          aria-label={language === "zh" ? "打开用户菜单" : "Open user menu"}
          className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white shadow-sm ring-2 ring-white/10 focus-visible:outline-none focus-visible:ring-blue-400"
          type="button"
        >
          AC
        </button>
      </div>
    </header>
  );
}
