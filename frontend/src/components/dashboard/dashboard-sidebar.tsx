import {
  BookOpen,
  FileCheck2,
  FileOutput,
  LibraryBig,
  LayoutDashboard,
  SlidersHorizontal,
  ListTree,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Language } from "@/lib/i18n";

export type DashboardSection =
  | "Overview"
  | "Authors"
  | "Review"
  | "Template"
  | "Layout"
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
  { label: "Review", title: { en: "Review", zh: "审核" }, icon: FileCheck2, path: "/review" },
  { label: "Template", title: { en: "Format Settings", zh: "格式设置" }, icon: SlidersHorizontal, path: "/template" },
  { label: "Layout", title: { en: "Book Layout", zh: "书籍排版" }, icon: ListTree, path: "/layout" },
  { label: "Export", title: { en: "Export", zh: "导出" }, icon: FileOutput, path: "/export" },
  { label: "Settings", title: { en: "Book Settings", zh: "书籍设置" }, icon: Settings, path: "/settings" },
];

interface DashboardSidebarProps {
  activeSection: DashboardSection;
  basePath: string;
  bookTitle?: string;
  language: Language;
  onNavigate: (path: string) => void;
}

export function DashboardSidebar({
  activeSection,
  basePath,
  bookTitle,
  language,
  onNavigate,
}: DashboardSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[72px] flex-col border-r border-border bg-card lg:w-60">
      <div className="flex h-16 items-center border-b border-border px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-400">
            <BookOpen className="size-[18px]" />
          </span>
          <span className="hidden truncate text-sm font-semibold tracking-[-0.02em] text-foreground lg:block">
            OpenClassBook
          </span>
        </div>
      </div>

      <nav
        aria-label={language === "zh" ? "工作台导航" : "Dashboard navigation"}
        className="flex-1 px-3 py-5"
      >
        <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:block">
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
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="hidden lg:block">{title[language]}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3 lg:p-4">
        <a
          aria-label={language === "zh" ? "我的书籍" : "My Books"}
          className="group mb-3 flex h-10 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:justify-start"
          href="/book"
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
            onNavigate("/book");
          }}
          title={language === "zh" ? "我的书籍" : "My Books"}
        >
          <LibraryBig className="size-[17px] shrink-0 text-muted-foreground group-hover:text-foreground" />
          <span className="hidden lg:block">
            {language === "zh" ? "我的书籍" : "My Books"}
          </span>
        </a>
        <div className="hidden rounded-lg border border-border bg-muted/30 px-3 py-3 lg:block">
          {bookTitle ? (
            <p className="truncate text-xs font-medium text-foreground">
              {bookTitle}
            </p>
          ) : null}
          <p className={bookTitle ? "mt-1 text-[11px] text-muted-foreground" : "text-[11px] text-muted-foreground"}>
            {language === "zh" ? "书籍工作台" : "Book workspace"}
          </p>
        </div>
        <span className="mx-auto block size-2 rounded-full bg-emerald-500 lg:hidden" />
      </div>
    </aside>
  );
}
