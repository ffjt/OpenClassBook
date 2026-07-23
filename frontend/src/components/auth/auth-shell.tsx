import type { ReactNode } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Language } from "@/lib/i18n";

interface AuthShellProps {
  children: ReactNode;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    back: "Back to OpenClassBook",
    eyebrow: "A publishing workspace",
    title: "Make the book happen.",
    description:
      "One account gives book owners, reviewers, and administrators a calm place to shape a publication.",
    contributorTitle: "Contributing an article?",
    contributorDescription:
      "You do not need an account. Join your book directly with its invitation code.",
    join: "Join with an invitation",
  },
  zh: {
    back: "返回 OpenClassBook",
    eyebrow: "出版工作空间",
    title: "让一本书真正发生。",
    description:
      "一个账号，为书籍创建者、审核者和管理员提供从容的出版工作台。",
    contributorTitle: "只是投稿文章？",
    contributorDescription: "不需要注册账号，使用邀请码即可直接加入书籍。",
    join: "使用邀请码加入",
  },
} as const;

export function AuthShell({
  children,
  language,
  onNavigate,
  onToggleLanguage,
}: AuthShellProps) {
  const pageCopy = copy[language];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <button
          className="flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-foreground transition-colors hover:text-blue-600"
          onClick={() => onNavigate("/")}
          type="button"
        >
          <BookOpen className="size-[18px] text-blue-600" />
          OpenClassBook
        </button>
        <div className="flex items-center gap-2">
          <LanguageToggle language={language} onToggle={onToggleLanguage} />
          <ThemeToggle language={language} />
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-6 pb-16 pt-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:py-12">
        <aside className="hidden max-w-lg lg:block">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-600">
            {pageCopy.eyebrow}
          </p>
          <h1 className="mt-6 text-5xl font-semibold tracking-[-0.055em] text-foreground">
            {pageCopy.title}
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted-foreground">
            {pageCopy.description}
          </p>
          <div className="mt-12 border-l-2 border-blue-500/50 pl-5">
            <h2 className="text-sm font-semibold text-foreground">
              {pageCopy.contributorTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {pageCopy.contributorDescription}
            </p>
            <button
              className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              onClick={() => onNavigate("/join")}
              type="button"
            >
              {pageCopy.join}
            </button>
          </div>
        </aside>

        <div className="mx-auto w-full max-w-[460px]">
          <button
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            onClick={() => onNavigate("/")}
            type="button"
          >
            <ArrowLeft className="size-4" />
            {pageCopy.back}
          </button>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] sm:p-9">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
