import { useState } from "react";
import { BookOpen, FilePenLine } from "lucide-react";

import { ArticleEditorForm } from "@/components/author-editor/article-editor-form";
import { LiveArticlePreview } from "@/components/author-editor/live-article-preview";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Language } from "@/lib/i18n";
import { defaultArticle } from "@/mock/article";

const pageCopy = {
  en: {
    eyebrow: "Template-driven contribution",
    title: "Author Editor",
    description: "Write and preview your article in the book's publishing layout.",
  },
  zh: {
    eyebrow: "\u6a21\u677f\u9a71\u52a8\u6295\u7a3f",
    title: "\u4f5c\u8005\u7f16\u8f91\u5668",
    description: "\u5728\u4e66\u7c4d\u51fa\u7248\u7248\u5f0f\u4e2d\u4e66\u5199\u5e76\u9884\u89c8\u4f60\u7684\u6587\u7ae0\u3002",
  },
} as const;

interface AuthorEditorPageProps {
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

export function AuthorEditorPage({
  language,
  onNavigate,
  onToggleLanguage,
}: AuthorEditorPageProps) {
  const [article, setArticle] = useState(() => ({
    ...defaultArticle,
    imagePosition: { ...defaultArticle.imagePosition },
  }));
  const copy = pageCopy[language];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-xl sm:px-7 lg:px-10">
        <a
          className="flex items-center gap-3"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate("/");
          }}
        >
          <span className="flex size-9 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-400">
            <BookOpen className="size-[18px]" />
          </span>
          <span className="text-sm font-semibold tracking-[-0.02em] text-foreground">
            OpenClassBook
          </span>
        </a>
        <div className="flex items-center gap-2">
          <LanguageToggle language={language} onToggle={onToggleLanguage} />
          <ThemeToggle language={language} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
        <header className="border-b border-border pb-7">
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">
            <FilePenLine className="size-3.5" />
            {copy.eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {copy.description}
          </p>
        </header>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(320px,0.54fr)_minmax(0,1fr)]">
          <ArticleEditorForm
            article={article}
            language={language}
            onBodyChange={(body) =>
              setArticle((current) => ({ ...current, body }))
            }
            onImageWrapChange={(imageWrap) =>
              setArticle((current) => ({ ...current, imageWrap }))
            }
            onTitleChange={(title) =>
              setArticle((current) => ({ ...current, title }))
            }
          />

          <div className="xl:sticky xl:top-24">
            <LiveArticlePreview
              article={article}
              language={language}
              onImagePositionChange={(imagePosition) =>
                setArticle((current) => ({ ...current, imagePosition }))
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
