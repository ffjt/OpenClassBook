import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileText,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import {
  authorRepository,
  type Author,
  type AuthorPreview,
} from "@/repositories/authorRepository";
import { joinRepository } from "@/repositories/joinRepository";

interface AuthorSelectPageProps {
  inviteCode: string;
  name: string;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

interface Candidate {
  author: Author;
  preview: AuthorPreview;
}

const copy = {
  en: {
    eyebrow: "Identity recovery",
    title: "Authors with the same name detected",
    description: (name: string) =>
      `More than one “${name}” has contributed to this book. Choose your own submissions to continue.`,
    articles: (count: number) => `${count} ${count === 1 ? "article" : "articles"}`,
    latest: "Most recent article",
    noArticles: "No submissions yet",
    continue: "Continue editing",
    updated: "Updated",
    statuses: { draft: "Draft", pending: "Submitted", approved: "Approved", rejected: "Needs revision" },
    error: "Unable to load matching authors.",
    retry: "Retry",
    back: "Back to join",
    loading: "Loading matching authors",
  },
  zh: {
    eyebrow: "身份恢复",
    title: "检测到同名作者",
    description: (name: string) =>
      `这本书中有多位名为“${name}”的作者，请根据投稿预览选择你自己的记录。`,
    articles: (count: number) => `${count} 篇文章`,
    latest: "最近一篇文章",
    noArticles: "暂无投稿",
    continue: "继续编辑",
    updated: "最近更新",
    statuses: { draft: "草稿", pending: "已提交", approved: "已通过", rejected: "需修改" },
    error: "无法加载同名作者。",
    retry: "重试",
    back: "返回加入页面",
    loading: "正在加载同名作者",
  },
} as const;

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AuthorSelectPage({
  inviteCode,
  name,
  language,
  onNavigate,
  onToggleLanguage,
}: AuthorSelectPageProps) {
  const pageCopy = copy[language];
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [bookId, setBookId] = useState<number>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    async function loadCandidates() {
      try {
        const invitation = await joinRepository.get(inviteCode);
        const authors = await authorRepository.search(invitation.book.id, name);
        const previews = await Promise.all(
          authors.map((author) => authorRepository.preview(author.id)),
        );
        if (!active) return;
        setBookId(invitation.book.id);
        setCandidates(
          authors.map((author, index) => ({ author, preview: previews[index] })),
        );
      } catch {
        if (active) setHasError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadCandidates();
    return () => {
      active = false;
    };
  }, [inviteCode, name, reloadKey]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 lg:px-10">
        <a className="text-[15px] font-semibold" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>OpenClassBook</a>
        <div className="flex items-center gap-2"><LanguageToggle language={language} onToggle={onToggleLanguage} /><ThemeToggle language={language} /></div>
      </header>
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-10 lg:px-10">
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => onNavigate(`/join/${encodeURIComponent(inviteCode)}`)} type="button"><ArrowLeft className="size-4" />{pageCopy.back}</button>
        <div className="mt-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">{pageCopy.eyebrow}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{pageCopy.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{pageCopy.description(name)}</p>
        </div>

        {isLoading ? (
          <div aria-label={pageCopy.loading} className="mt-14 flex justify-center" role="status"><LoaderCircle className="size-7 animate-spin text-blue-500" /></div>
        ) : hasError || !bookId || candidates.length < 2 ? (
          <div className="mx-auto mt-14 flex max-w-lg flex-col items-center rounded-2xl border border-border bg-card p-10 text-center">
            <AlertCircle className="size-7 text-rose-400" /><p className="mt-4 text-sm text-muted-foreground">{pageCopy.error}</p><Button className="mt-5" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw className="mr-2 size-4" />{pageCopy.retry}</Button>
          </div>
        ) : (
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {candidates.map(({ author, preview }) => {
              const latest = preview.latest_article;
              const updatedAt = latest?.updated_at ?? author.updated_at;
              return (
                <article className="flex flex-col rounded-2xl border border-border bg-card p-6" key={author.id}>
                  <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{author.name}</h2><p className="mt-1 text-xs text-muted-foreground">{pageCopy.updated} {formatDate(updatedAt, language)}</p></div><Badge className="border border-border bg-transparent text-foreground">{pageCopy.articles(preview.article_count)}</Badge></div>
                  <div className="mt-6 min-h-40 rounded-xl bg-muted/40 p-4">
                    {latest ? <><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{pageCopy.latest}</p><Badge className="border border-border bg-transparent text-foreground">{pageCopy.statuses[latest.status]}</Badge></div><h3 className="mt-3 font-semibold">{latest.title}</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{latest.excerpt}{latest.excerpt.length >= 120 ? "……" : ""}</p></> : <div className="flex min-h-32 flex-col items-center justify-center text-sm text-muted-foreground"><FileText className="mb-3 size-5" />{pageCopy.noArticles}</div>}
                  </div>
                  <Button className="mt-6 bg-blue-600 text-white hover:bg-blue-700" onClick={() => onNavigate(`/author/${author.id}/editor`)}>{pageCopy.continue}<ArrowRight className="ml-2 size-4" /></Button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
