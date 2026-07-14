import {
  BookOpen,
  FileCheck2,
  FileOutput,
  FileText,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Language } from "@/lib/i18n";

export type DashboardSection =
  | "Overview"
  | "Authors"
  | "Articles"
  | "Review"
  | "Template"
  | "Export"
  | "Settings";

interface NavigationItem {
  label: DashboardSection;
  title: Record<Language, string>;
  icon: LucideIcon;
  path: string;
}

const navigationItems: NavigationItem[] = [
  { label: "Overview", title: { en: "Overview", zh: "概览" }, icon: LayoutDashboard, path: "" },
  { label: "Authors", title: { en: "Authors", zh: "作者" }, icon: Users, path: "/authors" },
  { label: "Articles", title: { en: "Articles", zh: "文章" }, icon: FileText, path: "/articles" },
  { label: "Review", title: { en: "Review", zh: "审核" }, icon: FileCheck2, path: "/review" },
  { label: "Template", title: { en: "Format Settings", zh: "格式设置" }, icon: SlidersHorizontal, path: "/template" },
  { label: "Export", title: { en: "Export", zh: "导出" }, icon: FileOutput, path: "/export" },
  { label: "Settings", title: { en: "Settings", zh: "设置" }, icon: Settings, path: "/settings" },
];

interface DashboardSidebarProps {
  activeSection: DashboardSection;
  basePath: string;
  language: Language;
  onNavigate: (path: string) => void;
}

export function DashboardSidebar({
  activeSection,
  basePath,
  language,
  onNavigate,
}: DashboardSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[72px] flex-col border-r border-white/[0.07] bg-[#0b0c0f] lg:w-60">
      <div className="flex h-16 items-center border-b border-white/[0.07] px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-400">
            <BookOpen className="size-[18px]" />
          </span>
          <span className="hidden truncate text-sm font-semibold tracking-[-0.02em] text-zinc-100 lg:block">
            OpenClassBook
          </span>
        </div>
      </div>

      <nav
        aria-label={language === "zh" ? "工作台导航" : "Dashboard navigation"}
        className="flex-1 px-3 py-5"
      >
        <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600 lg:block">
          {language === "zh" ? "工作区" : "Workspace"}
        </p>
        <ul className="space-y-1">
          {navigationItems.map(({ icon: Icon, label, path, title }) => {
            const isActive = activeSection === label;

            return (
              <li key={label}>
                <a
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex h-10 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors lg:justify-start",
                    isActive
                      ? "bg-white/[0.08] text-white"
                      : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
                  )}
                  href={`${basePath}${path}`}
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }

                    event.preventDefault();
                    onNavigate(`${basePath}${path}`);
                  }}
                  title={title[language]}
                >
                  <Icon
                    className={cn(
                      "size-[17px] shrink-0",
                      isActive
                        ? "text-blue-400"
                        : "text-zinc-500 group-hover:text-zinc-300",
                    )}
                  />
                  <span className="hidden lg:block">{title[language]}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/[0.07] p-3 lg:p-4">
        <div className="hidden rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-3 lg:block">
          <p className="truncate text-xs font-medium text-zinc-300">
            {language === "zh" ? "我们的班级故事" : "Our Class Stories"}
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            {language === "zh" ? "书籍工作台" : "Book workspace"}
          </p>
        </div>
        <span className="mx-auto block size-2 rounded-full bg-emerald-500 lg:hidden" />
      </div>
    </aside>
  );
}
