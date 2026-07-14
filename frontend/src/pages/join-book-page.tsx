import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound } from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Language } from "@/lib/i18n";

interface JoinBookPageProps {
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

interface JoinedBook {
  title: string;
  inviteCode: string;
}

const fakeBookTitle = {
  en: "Our Class Stories 2026",
  zh: "\u6211\u4eec\u7684\u73ed\u7ea7\u6545\u4e8b 2026",
};

const joinBookCopy = {
  en: {
    backHome: "Back to home",
    eyebrow: "Author invitation",
    pageTitle: "Join a book.",
    pageIntro: "Use an invitation code to join an existing book.",
    formTitle: "Enter your invitation code",
    formIntro: "Your teacher or editor will share this code with you.",
    inviteCode: "Invitation code",
    placeholder: "e.g. OCB-7K2M9Q",
    codeError: "Enter an invitation code to continue.",
    privacy: "This preview stays in your browser. No data is sent.",
    join: "Join",
    joined: "Book joined",
    joinedTitle: "You're in.",
    joinedIntro: "You have joined this book and are ready for the next step.",
    book: "Book",
    preview: "Preview data stored only for this session.",
  },
  zh: {
    backHome: "\u8fd4\u56de\u9996\u9875",
    eyebrow: "\u4f5c\u8005\u9080\u8bf7",
    pageTitle: "\u52a0\u5165\u4e00\u672c\u4e66\u3002",
    pageIntro: "\u4f7f\u7528\u9080\u8bf7\u7801\u52a0\u5165\u4e00\u672c\u5df2\u6709\u7684\u4e66\u3002",
    formTitle: "\u8f93\u5165\u4f60\u7684\u9080\u8bf7\u7801",
    formIntro: "\u8001\u5e08\u6216\u7f16\u8f91\u4f1a\u628a\u8fd9\u4e2a\u9080\u8bf7\u7801\u5206\u4eab\u7ed9\u4f60\u3002",
    inviteCode: "\u9080\u8bf7\u7801",
    placeholder: "\u4f8b\u5982\uff1aOCB-7K2M9Q",
    codeError: "\u8bf7\u8f93\u5165\u9080\u8bf7\u7801\u540e\u7ee7\u7eed\u3002",
    privacy: "\u5f53\u524d\u4e3a\u524d\u7aef\u9884\u89c8\uff0c\u9080\u8bf7\u7801\u53ea\u4fdd\u5b58\u5728\u6d4f\u89c8\u5668\u4e2d\uff0c\u4e0d\u4f1a\u53d1\u9001\u4efb\u4f55\u6570\u636e\u3002",
    join: "\u52a0\u5165",
    joined: "\u5df2\u52a0\u5165\u4e66\u7c4d",
    joinedTitle: "\u52a0\u5165\u6210\u529f\u3002",
    joinedIntro: "\u4f60\u5df2\u7ecf\u52a0\u5165\u8fd9\u672c\u4e66\uff0c\u53ef\u4ee5\u8fdb\u5165\u4e0b\u4e00\u6b65\u4e86\u3002",
    book: "\u4e66\u540d",
    preview: "\u8fd9\u91cc\u4f7f\u7528\u7684\u662f\u4ec5\u4fdd\u5b58\u5728\u672c\u6b21\u4f1a\u8bdd\u4e2d\u7684\u5047\u6570\u636e\u3002",
  },
};
export function JoinBookPage({
  language,
  onNavigate,
  onToggleLanguage,
}: JoinBookPageProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [showCodeError, setShowCodeError] = useState(false);
  const [joinedBook, setJoinedBook] = useState<JoinedBook | null>(null);
  const copy = joinBookCopy[language];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = inviteCode.trim().toUpperCase();

    if (!normalizedCode) {
      setShowCodeError(true);
      document.getElementById("invite-code")?.focus();
      return;
    }

    setShowCodeError(false);
    setJoinedBook({
      title: fakeBookTitle[language],
      inviteCode: normalizedCode,
    });
    onNavigate("/join/success");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_26%,rgba(37,99,235,0.08),transparent_26%),radial-gradient(circle_at_84%_78%,rgba(37,99,235,0.05),transparent_25%)]" />

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

      <section className="relative z-10 mx-auto grid max-w-7xl items-start gap-10 px-6 pb-20 pt-10 lg:grid-cols-[0.7fr_1fr] lg:gap-20 lg:px-10 lg:pt-20">
        <div className="max-w-lg">
          <div className="mb-7 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-2 rounded-full bg-blue-600" />
            {copy.eyebrow}
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            {copy.pageTitle}
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
            {copy.pageIntro}
          </p>
        </div>

        {joinedBook ? (
          <div className="rounded-[2rem] border border-border bg-card/90 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.35)] backdrop-blur dark:shadow-[0_32px_90px_-55px_rgba(0,0,0,0.85)] sm:p-9 lg:p-11">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.65)]">
              <CheckCircle2 className="size-6" />
            </span>
            <p className="mt-7 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {copy.joined}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              {copy.joinedTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {copy.joinedIntro}
            </p>

            <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/45 p-5 dark:border-blue-900 dark:bg-blue-950/25 sm:p-6">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {copy.book}
              </p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.025em]">
                {joinedBook.title}
              </p>
              <div className="mt-5 flex items-center justify-between gap-4 border-t border-blue-200 pt-5 dark:border-blue-900">
                <span className="text-sm text-muted-foreground">{copy.inviteCode}</span>
                <span className="font-mono text-sm font-semibold tracking-[0.1em] text-blue-700 dark:text-blue-300">
                  {joinedBook.inviteCode}
                </span>
              </div>
            </div>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              {copy.preview}
            </p>
          </div>
        ) : (
          <form
            className="rounded-[2rem] border border-border bg-card/90 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.35)] backdrop-blur dark:shadow-[0_32px_90px_-55px_rgba(0,0,0,0.85)] sm:p-9 lg:p-11"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <KeyRound className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.025em]">
                  {copy.formTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {copy.formIntro}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <Label htmlFor="invite-code">
                {copy.inviteCode} <span className="text-blue-600">*</span>
              </Label>
              <Input
                aria-describedby={showCodeError ? "invite-code-error" : "invite-code-note"}
                aria-invalid={showCodeError}
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
                className="font-mono uppercase tracking-[0.08em]"
                id="invite-code"
                maxLength={32}
                onChange={(event) => {
                  setInviteCode(event.target.value);
                  setShowCodeError(false);
                }}
                placeholder={copy.placeholder}
                spellCheck={false}
                value={inviteCode}
              />
              {showCodeError ? (
                <p className="text-sm text-red-600" id="invite-code-error" role="alert">
                  {copy.codeError}
                </p>
              ) : null}
              <p className="text-xs leading-5 text-muted-foreground" id="invite-code-note">
                {copy.privacy}
              </p>
            </div>

            <div className="mt-8 flex justify-end border-t border-border pt-7">
              <Button
                className="group w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                size="lg"
                type="submit"
              >
                {copy.join}
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
