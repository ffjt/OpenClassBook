import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Sparkles,
  UserRound,
} from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import type { Book } from "@/repositories/bookRepository";

interface BookCreatedPageProps {
  book: Book;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const pageCopy = {
  en: {
    backHome: "Back to home",
    eyebrow: "Book created",
    title: "Your book has been created.",
    bookLabel: "Book",
    ownerLabel: "Book owner",
    nextStep: "Next step",
    nextStepDescription:
      "Go to My Books to find this book and open its dashboard.",
    dashboardCapabilities: "In the dashboard, you can:",
    capabilities: [
      "Configure the publishing template",
      "Set the article format",
      "Set numbering rules",
      "Manage authors",
      "Review submissions",
      "Export PDF (coming later)",
    ],
    viewMyBooks: "View My Books",
    invitationNotice:
      "Invitation code",
  },
  zh: {
    backHome: "\u8fd4\u56de\u9996\u9875",
    eyebrow: "\u4e66\u7c4d\u521b\u5efa\u6210\u529f",
    title: "\u4e66\u7c4d\u521b\u5efa\u6210\u529f\u3002",
    bookLabel: "\u4e66\u540d",
    ownerLabel: "\u8d1f\u8d23\u4eba",
    nextStep: "\u4e0b\u4e00\u6b65",
    nextStepDescription:
      "\u8bf7\u524d\u5f80\u6211\u7684\u4e66\u7c4d\uff0c\u627e\u5230\u8fd9\u672c\u4e66\u5e76\u6253\u5f00\u5b83\u7684 Dashboard\u3002",
    dashboardCapabilities: "\u5728\u4eea\u8868\u76d8\u4e2d\uff0c\u4f60\u53ef\u4ee5\uff1a",
    capabilities: [
      "\u914d\u7f6e\u51fa\u7248\u6a21\u677f",
      "\u8bbe\u7f6e\u6587\u7ae0\u683c\u5f0f",
      "\u8bbe\u7f6e\u7f16\u53f7\u89c4\u5219",
      "\u7ba1\u7406\u4f5c\u8005",
      "\u67e5\u770b\u6295\u7a3f",
      "\u5bfc\u51fa PDF\uff08\u540e\u7eed\uff09",
    ],
    viewMyBooks: "\u67e5\u770b\u6211\u7684\u4e66\u7c4d",
    invitationNotice:
      "\u9080\u8bf7\u7801",
  },
};

export function BookCreatedPage({
  book,
  language,
  onNavigate,
  onToggleLanguage,
}: BookCreatedPageProps) {
  const copy = pageCopy[language];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(37,99,235,0.09),transparent_30%),radial-gradient(circle_at_88%_76%,rgba(37,99,235,0.05),transparent_24%)]" />

      <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a
          className="text-[15px] font-semibold tracking-[-0.02em]"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/");
          }}
        >
          OpenClassBook
        </a>
        <div className="flex items-center gap-2 sm:gap-5">
          <LanguageToggle language={language} onToggle={onToggleLanguage} />
          <ThemeToggle language={language} />
          <a
            aria-label={copy.backHome}
            className="group flex size-9 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-auto sm:w-auto sm:justify-start sm:rounded-none"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/");
            }}
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:ml-2 sm:inline">{copy.backHome}</span>
          </a>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pb-20 pt-10 text-center sm:pt-16 lg:px-10">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_18px_50px_-18px_rgba(37,99,235,0.65)]">
          <CheckCircle2 className="size-8" strokeWidth={2.2} />
        </span>
        <div className="mt-7 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="size-2 rounded-full bg-blue-600" />
          {copy.eyebrow}
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          {copy.title}
        </h1>
        <div className="mt-4 flex max-w-xl items-center gap-2 text-base text-muted-foreground sm:text-lg">
          <BookOpen className="size-5 shrink-0 text-blue-600" />
          <span>{copy.bookLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate font-medium text-foreground">{book.title}</span>
        </div>
        <div className="mt-2 flex max-w-xl items-center gap-2 text-sm text-muted-foreground sm:text-base">
          <UserRound className="size-4 shrink-0 text-blue-600" />
          <span>{copy.ownerLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate font-medium text-foreground">
            {book.owner_name}
          </span>
        </div>

        <div className="mt-10 w-full overflow-hidden rounded-[2rem] border border-border bg-card/90 text-left shadow-[0_32px_90px_-55px_rgba(15,23,42,0.35)] backdrop-blur dark:shadow-[0_32px_90px_-55px_rgba(0,0,0,0.85)]">
          <div className="p-6 sm:p-9 lg:p-10">
            <div className="flex items-start gap-4 border-b border-border pb-7">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Sparkles className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                  {copy.nextStep}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  {copy.nextStepDescription}
                </p>
              </div>
            </div>

            <div className="pt-7">
              <p className="font-semibold tracking-[-0.015em]">
                {copy.dashboardCapabilities}
              </p>
              <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {copy.capabilities.map((capability) => (
                  <li
                    className="flex items-center gap-3 text-sm text-muted-foreground sm:text-base"
                    key={capability}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                    {capability}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-end border-t border-border bg-muted/40 p-6 sm:p-8 lg:px-10">
            <Button
              className="group h-12 w-full bg-blue-600 px-8 text-base text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.8)] hover:bg-blue-700 sm:w-auto"
              onClick={() => onNavigate(`/book?created=${book.id}`)}
              type="button"
            >
              {copy.viewMyBooks}
              <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {copy.invitationNotice}: {book.invite_code}
        </p>
      </section>
    </main>
  );
}
