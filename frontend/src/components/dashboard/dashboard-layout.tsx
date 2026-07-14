import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  DashboardSidebar,
  type DashboardSection,
} from "@/components/dashboard/dashboard-sidebar";
import type { Language } from "@/lib/i18n";

interface DashboardLayoutProps {
  activeSection: DashboardSection;
  basePath: string;
  children: ReactNode;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

export function DashboardLayout({
  activeSection,
  basePath,
  children,
  language,
  onNavigate,
  onToggleLanguage,
}: DashboardLayoutProps) {
  return (
    <div className="dark min-h-screen bg-[#0e0f12] text-foreground">
      <DashboardSidebar
        activeSection={activeSection}
        basePath={basePath}
        language={language}
        onNavigate={onNavigate}
      />
      <div className="min-h-screen pl-[72px] lg:pl-60">
        <DashboardHeader
          activeSection={activeSection}
          language={language}
          onToggleLanguage={onToggleLanguage}
        />
        <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
