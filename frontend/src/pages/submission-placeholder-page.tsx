import { ArrowLeft, FilePenLine } from "lucide-react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";

interface SubmissionPlaceholderPageProps {
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const pageCopy = {
  en: {
    eyebrow: "Contribution",
    title: "The contribution page is coming next.",
    description:
      "This is a temporary destination. The article editor has not been built yet.",
    back: "Back to book",
  },
  zh: {
    eyebrow: "\u6587\u7ae0\u6295\u7a3f",
    title: "\u6295\u7a3f\u9875\u9762\u5373\u5c06\u5f00\u653e\u3002",
    description: "\u8fd9\u91cc\u662f\u4e34\u65f6\u5360\u4f4d\u9875\u9762\uff0c\u5f53\u524d\u5c1a\u672a\u5f00\u53d1\u6295\u7a3f\u7f16\u8f91\u5668\u3002",
    back: "\u8fd4\u56de\u4e66\u7c4d",
  },
};

export function SubmissionPlaceholderPage({
  language,
  onNavigate,
  onToggleLanguage,
}: SubmissionPlaceholderPageProps) {
  const copy = pageCopy[language];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(37,99,235,0.09),transparent_30%)]" />

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

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col items-center justify-center px-6 pb-28 text-center lg:px-10">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          <FilePenLine className="size-8" />
        </span>
        <div className="mt-7 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="size-2 rounded-full bg-blue-600" />
          {copy.eyebrow}
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          {copy.description}
        </p>
        <Button
          className="mt-8"
          onClick={() => onNavigate("/join/success")}
          type="button"
          variant="outline"
        >
          <ArrowLeft className="mr-2 size-4" />
          {copy.back}
        </Button>
      </section>
    </main>
  );
}
