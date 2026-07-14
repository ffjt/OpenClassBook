import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Hash,
  UserRound,
  UsersRound,
} from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";

interface JoinSuccessPageProps {
  bookOwner: string;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const fakeBook = {
  title: "\u5411\u5149\u751f\u957f\uff1a\u4e03\u5e74\u7ea7\u6587\u96c6",
  description:
    "\u6536\u5f55\u4e03\u5e74\u7ea7\u540c\u5b66\u8fd9\u4e00\u5b66\u5e74\u7684\u89c2\u5bdf\u3001\u60f3\u8c61\u4e0e\u6210\u957f\u6545\u4e8b\u3002\u613f\u6bcf\u4e00\u7bc7\u6587\u5b57\u90fd\u6210\u4e3a\u9752\u6625\u91cc\u6e05\u6670\u800c\u6e29\u6696\u7684\u4e00\u9875\u3002",
  contributorCount: 28,
  articleNumberingEnabled: true,
};

const pageCopy = {
  en: {
    eyebrow: "Joined successfully",
    title: "Welcome to the book.",
    description:
      "You are now one of its authors. Review the book details, then begin your contribution.",
    bookDescription: "About this book",
    bookOwner: "Book owner",
    contributors: "Contributors",
    contributorUnit: "authors",
    numbering: "Article numbering",
    enabled: "Enabled",
    disabled: "Not enabled",
    ready: "Everything is ready",
    readyDescription:
      "Your contribution will be collected with the other authors and prepared for publication.",
    start: "Start contributing",
  },
  zh: {
    eyebrow: "\u52a0\u5165\u6210\u529f",
    title: "\u6b22\u8fce\u52a0\u5165\u8fd9\u672c\u4e66\u3002",
    description: "\u4f60\u5df2\u7ecf\u6210\u4e3a\u672c\u4e66\u7684\u4f5c\u8005\u3002\u786e\u8ba4\u4e66\u7c4d\u4fe1\u606f\u540e\uff0c\u5c31\u53ef\u4ee5\u5f00\u59cb\u6295\u7a3f\u4e86\u3002",
    bookDescription: "\u4e66\u7c4d\u7b80\u4ecb",
    bookOwner: "\u8d1f\u8d23\u4eba",
    contributors: "\u5f53\u524d\u6295\u7a3f\u4eba\u6570",
    contributorUnit: "\u4eba",
    numbering: "\u6587\u7ae0\u7f16\u53f7",
    enabled: "\u5df2\u542f\u7528",
    disabled: "\u672a\u542f\u7528",
    ready: "\u4e00\u5207\u51c6\u5907\u5c31\u7eea",
    readyDescription: "\u4f60\u7684\u6587\u7ae0\u5c06\u4e0e\u5176\u4ed6\u4f5c\u8005\u7684\u4f5c\u54c1\u4e00\u8d77\u6536\u96c6\uff0c\u5e76\u6700\u7ec8\u6574\u7406\u51fa\u7248\u3002",
    start: "\u5f00\u59cb\u6295\u7a3f",
  },
};

export function JoinSuccessPage({
  bookOwner,
  language,
  onNavigate,
  onToggleLanguage,
}: JoinSuccessPageProps) {
  const copy = pageCopy[language];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(37,99,235,0.1),transparent_30%),radial-gradient(circle_at_10%_82%,rgba(37,99,235,0.05),transparent_24%)]" />

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
        <div className="flex items-center gap-2">
          <LanguageToggle language={language} onToggle={onToggleLanguage} />
          <ThemeToggle language={language} />
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-8 sm:pt-14 lg:px-10">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_18px_50px_-18px_rgba(37,99,235,0.65)]">
          <CheckCircle2 className="size-8" strokeWidth={2.2} />
        </span>
        <div className="mt-7 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="size-2 rounded-full bg-blue-600" />
          {copy.eyebrow}
        </div>
        <h1 className="mt-5 text-center text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-2xl text-center text-base leading-7 text-muted-foreground sm:text-lg">
          {copy.description}
        </p>

        <div className="mt-10 w-full overflow-hidden rounded-[2rem] border border-border bg-card/90 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.35)] backdrop-blur dark:shadow-[0_32px_90px_-55px_rgba(0,0,0,0.85)]">
          <div className="p-6 sm:p-9 lg:p-10">
            <div className="flex items-start gap-4 border-b border-border pb-7">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <BookOpen className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  {fakeBook.title}
                </h2>
                <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {copy.bookDescription}
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  {fakeBook.description}
                </p>
              </div>
            </div>

            <dl className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted/40 p-5">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserRound className="size-4 text-blue-600" />
                  {copy.bookOwner}
                </dt>
                <dd className="mt-3 text-lg font-semibold tracking-[-0.02em]">
                  {bookOwner}
                </dd>
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-5">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UsersRound className="size-4 text-blue-600" />
                  {copy.contributors}
                </dt>
                <dd className="mt-3 text-lg font-semibold tracking-[-0.02em]">
                  {fakeBook.contributorCount} {copy.contributorUnit}
                </dd>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/55 p-5 dark:border-blue-900 dark:bg-blue-950/25">
                <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="size-4 text-blue-600" />
                  {copy.numbering}
                </dt>
                <dd className="mt-3 flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-blue-700 dark:text-blue-300">
                  {fakeBook.articleNumberingEnabled ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : null}
                  {fakeBook.articleNumberingEnabled
                    ? copy.enabled
                    : copy.disabled}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-5 border-t border-border bg-muted/40 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:px-10">
            <div>
              <p className="font-semibold tracking-[-0.015em]">{copy.ready}</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                {copy.readyDescription}
              </p>
            </div>
            <Button
              className="group h-12 shrink-0 bg-blue-600 px-8 text-base text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.8)] hover:bg-blue-700"
              onClick={() => onNavigate("/submit/new")}
              type="button"
            >
              {copy.start}
              <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
