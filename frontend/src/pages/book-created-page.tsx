import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Settings2,
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
    nextStep: "Set up the book before inviting authors",
    nextStepDescription:
      "Choose the submission deadline, article limit, permissions, and body template before authors begin.",
    flexible:
      "These choices are not locked. You can change them later in Settings and Template.",
    startSetup: "Start First-time Setup",
    setupLater: "Set Up Later",
    invitationNotice: "Invitation code",
  },
  zh: {
    backHome: "\u8fd4\u56de\u9996\u9875",
    eyebrow: "\u4e66\u7c4d\u521b\u5efa\u6210\u529f",
    title: "\u4e66\u7c4d\u521b\u5efa\u6210\u529f\u3002",
    bookLabel: "\u4e66\u540d",
    ownerLabel: "\u8d1f\u8d23\u4eba",
    nextStep: "\u5148\u5b8c\u6210\u4e66\u7c4d\u914d\u7f6e\uff0c\u518d\u9080\u8bf7\u4f5c\u8005",
    nextStepDescription:
      "\u5148\u8bbe\u7f6e\u6295\u7a3f\u622a\u6b62\u65f6\u95f4\u3001\u6570\u91cf\u3001\u4fee\u6539\u6743\u9650\u548c\u6b63\u6587\u6a21\u677f\uff0c\u518d\u9080\u8bf7\u4f5c\u8005\u6295\u7a3f\u3002",
    flexible:
      "\u8fd9\u4e9b\u914d\u7f6e\u4e0d\u4f1a\u9501\u5b9a\uff0c\u540e\u7eed\u4ecd\u53ef\u5728\u300cSettings\u300d\u548c\u300cTemplate\u300d\u9875\u9762\u4fee\u6539\u3002",
    startSetup: "\u5f00\u59cb\u9996\u6b21\u914d\u7f6e",
    setupLater: "\u7a0d\u540e\u914d\u7f6e",
    invitationNotice: "\u9080\u8bf7\u7801",
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

        <div className="mt-10 w-full overflow-hidden rounded-lg border border-border bg-card/90 text-left shadow-[0_32px_90px_-55px_rgba(15,23,42,0.35)] backdrop-blur dark:shadow-[0_32px_90px_-55px_rgba(0,0,0,0.85)]">
          <div className="p-6 sm:p-9 lg:p-10">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Settings2 className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
                  {copy.nextStep}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  {copy.nextStepDescription}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {copy.flexible}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-border bg-muted/40 p-6 sm:p-8 lg:px-10">
            <Button
              className="group h-12 w-full bg-blue-600 px-8 text-base text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.8)] hover:bg-blue-700"
              onClick={() => onNavigate(`/book/${book.id}/setup/settings`)}
              type="button"
            >
              {copy.startSetup}
              <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              className="h-11 w-full"
              onClick={() => onNavigate(`/book/${book.id}/dashboard`)}
              type="button"
              variant="outline"
            >
              {copy.setupLater}
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
