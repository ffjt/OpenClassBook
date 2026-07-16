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
  bookTitle?: string;
  children: ReactNode;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
  ownerName?: string;
}

export function DashboardLayout({
  activeSection,
  basePath,
  bookTitle,
  children,
  language,
  onNavigate,
  onToggleLanguage,
  ownerName,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <DashboardSidebar
        activeSection={activeSection}
        basePath={basePath}
        bookTitle={bookTitle}
        language={language}
        onNavigate={onNavigate}
      />
      <div className="min-h-screen pl-[72px] lg:pl-60">
        <DashboardHeader
          activeSection={activeSection}
          language={language}
          onToggleLanguage={onToggleLanguage}
          ownerName={ownerName}
        />
        <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
