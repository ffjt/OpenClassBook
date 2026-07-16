import { ArrowLeft, BookOpen } from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";

const copy = {
  en: {
    code: "Page not found · 404",
    title: "This page is not in the book.",
    description: "The link may be outdated, or the page may have moved.",
    home: "Back to home",
    books: "View My Books",
  },
  zh: {
    code: "页面不存在 · 404",
    title: "这页不在书里。",
    description: "链接可能已失效，或页面已经移动。",
    home: "返回首页",
    books: "查看我的书籍",
  },
} as const;

interface NotFoundPageProps {
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

export function NotFoundPage({
  language,
  onNavigate,
  onToggleLanguage,
}: NotFoundPageProps) {
  const text = copy[language];

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="ambient-glow pointer-events-none absolute left-1/2 top-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      <header className="relative z-10 mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 lg:px-10">
        <a className="flex items-center gap-2 text-sm font-semibold" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>
          <BookOpen className="size-4 text-blue-500" />
          OpenClassBook
        </a>
        <div className="flex items-center gap-2">
          <LanguageToggle language={language} onToggle={onToggleLanguage} />
          <ThemeToggle language={language} />
        </div>
      </header>
      <section className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">{text.code}</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{text.title}</h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">{text.description}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => onNavigate("/")} size="lg">
            <ArrowLeft className="mr-2 size-4" />
            {text.home}
          </Button>
          <Button onClick={() => onNavigate("/book")} size="lg" variant="outline">{text.books}</Button>
        </div>
      </section>
    </main>
  );
}
