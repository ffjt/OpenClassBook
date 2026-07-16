import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Hash,
  RefreshCw,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { ApiError } from "@/repositories/apiClient";
import type { AuthorDetail } from "@/repositories/authorRepository";
import { joinRepository } from "@/repositories/joinRepository";

interface JoinSuccessPageProps {
  authorId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    eyebrow: "Joined successfully",
    title: "Welcome to the book.",
    description: (name: string) => `${name}, you are now one of this book's authors.`,
    noDescription: "No description provided.",
    owner: "Book owner",
    authors: "Authors",
    numbering: "Numbering mode",
    modes: { none: "No numbers", automatic: "Automatic at layout", existing: "Existing numbers" },
    ready: "Everything is ready",
    readyDescription: "You can now enter the author editor and begin your contribution.",
    start: "Enter Author Editor",
    missingTitle: "Unable to find this author.",
    missingDescription: "The author record may have been removed.",
    errorTitle: "Unable to connect to the server.",
    errorDescription: "Please confirm FastAPI is running.",
    retry: "Retry",
    loading: "Loading welcome page",
  },
  zh: {
    eyebrow: "加入成功",
    title: "欢迎加入这本书。",
    description: (name: string) => `${name}，你现在已经是这本书的作者。`,
    noDescription: "暂无简介。",
    owner: "负责人",
    authors: "作者人数",
    numbering: "编号模式",
    modes: { none: "我不需要编号", automatic: "排版时自动生成", existing: "我已经有编号" },
    ready: "一切准备就绪",
    readyDescription: "现在可以进入作者编辑器，开始你的投稿。",
    start: "进入作者编辑器",
    missingTitle: "无法找到该作者。",
    missingDescription: "该作者记录可能已被删除。",
    errorTitle: "无法连接服务器。",
    errorDescription: "请确认 FastAPI 正在运行。",
    retry: "重试",
    loading: "正在加载欢迎页",
  },
} as const;

export function JoinSuccessPage({
  authorId,
  language,
  onNavigate,
  onToggleLanguage,
}: JoinSuccessPageProps) {
  const pageCopy = copy[language];
  const [author, setAuthor] = useState<AuthorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"missing" | "server" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    setAuthor(null);

    joinRepository
      .getAuthor(authorId)
      .then((data) => {
        if (active) setAuthor(data);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof ApiError && requestError.status === 404 ? "missing" : "server");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authorId, reloadKey]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(37,99,235,0.1),transparent_30%),radial-gradient(circle_at_10%_82%,rgba(37,99,235,0.05),transparent_24%)]" />
      <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <a className="text-[15px] font-semibold tracking-[-0.02em]" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}>OpenClassBook</a>
        <div className="flex items-center gap-2"><LanguageToggle language={language} onToggle={onToggleLanguage} /><ThemeToggle language={language} /></div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-20 pt-8 sm:pt-14 lg:px-10">
        {isLoading ? (
          <div aria-label={pageCopy.loading} className="mt-16 w-full max-w-3xl animate-pulse" role="status">
            <div className="mx-auto size-16 rounded-2xl bg-muted" />
            <div className="mx-auto mt-7 h-8 w-72 rounded bg-muted" />
            <div className="mx-auto mt-4 h-4 w-96 max-w-full rounded bg-muted/70" />
            <div className="mt-10 h-96 rounded-[2rem] border border-border bg-muted/30" />
          </div>
        ) : error || !author ? (
          <div className="mt-20 flex max-w-lg flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-400"><AlertCircle className="size-6" /></span>
            <h1 className="mt-6 text-2xl font-semibold">{error === "missing" ? pageCopy.missingTitle : pageCopy.errorTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{error === "missing" ? pageCopy.missingDescription : pageCopy.errorDescription}</p>
            {error === "server" ? <Button className="mt-6" onClick={() => setReloadKey((value) => value + 1)} type="button"><RefreshCw className="mr-2 size-4" />{pageCopy.retry}</Button> : null}
          </div>
        ) : (
          <>
            <span className="flex size-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_18px_50px_-18px_rgba(37,99,235,0.65)]"><CheckCircle2 className="size-8" strokeWidth={2.2} /></span>
            <div className="mt-7 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"><span className="size-2 rounded-full bg-blue-600" />{pageCopy.eyebrow}</div>
            <h1 className="mt-5 text-center text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{pageCopy.title}</h1>
            <p className="mt-4 max-w-2xl text-center text-base leading-7 text-muted-foreground sm:text-lg">{pageCopy.description(author.name)}</p>

            <div className="mt-10 w-full overflow-hidden rounded-[2rem] border border-border bg-card/90 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.35)] backdrop-blur dark:shadow-[0_32px_90px_-55px_rgba(0,0,0,0.85)]">
              <div className="p-6 sm:p-9 lg:p-10">
                <div className="flex items-start gap-4 border-b border-border pb-7">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"><BookOpen className="size-5" /></span>
                  <div className="min-w-0"><h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{author.book.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{author.book.description || pageCopy.noDescription}</p></div>
                </div>
                <dl className="mt-7 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-muted/40 p-5"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><UserRound className="size-4 text-blue-600" />{pageCopy.owner}</dt><dd className="mt-3 text-lg font-semibold">{author.book.owner_name}</dd></div>
                  <div className="rounded-2xl border border-border bg-muted/40 p-5"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><UsersRound className="size-4 text-blue-600" />{pageCopy.authors}</dt><dd className="mt-3 text-lg font-semibold">{author.book.author_count}</dd></div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/55 p-5 dark:border-blue-900 dark:bg-blue-950/25"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Hash className="size-4 text-blue-600" />{pageCopy.numbering}</dt><dd className="mt-3 text-lg font-semibold text-blue-700 dark:text-blue-300">{pageCopy.modes[author.book.number_mode]}</dd></div>
                </dl>
              </div>
              <div className="flex flex-col gap-5 border-t border-border bg-muted/40 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:px-10">
                <div><p className="font-semibold">{pageCopy.ready}</p><p className="mt-1 text-sm text-muted-foreground">{pageCopy.readyDescription}</p></div>
                <Button className="group h-12 shrink-0 bg-blue-600 px-8 text-base text-white hover:bg-blue-700" onClick={() => onNavigate(`/author/${author.id}/editor`)} type="button">{pageCopy.start}<ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-0.5" /></Button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
