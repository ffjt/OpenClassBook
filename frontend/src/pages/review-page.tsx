import {
  AlertCircle,
  Check,
  FileCheck2,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { LiveArticlePreview } from "@/components/author-editor/live-article-preview";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Language } from "@/lib/i18n";
import {
  articleRepository,
  type Article,
  type ArticleStatus,
} from "@/repositories/articleRepository";
import {
  authorRepository,
  type Author,
} from "@/repositories/authorRepository";
import type { PreviewArticle } from "@/types/article";

type ReviewStatus = Exclude<ArticleStatus, "draft">;

const reviewStatuses: ReviewStatus[] = ["pending", "approved", "rejected"];

const copy = {
  en: {
    eyebrow: "Editorial desk",
    title: "Review submissions",
    description: "Read, preview, and review every submitted article.",
    search: "Search articles",
    searchLabel: "Search articles",
    filterLabel: "Filter by review status",
    allStatuses: "All statuses",
    statuses: {
      draft: "Draft",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
    },
    articles: "articles",
    submitted: "Submitted",
    noMatches: "No articles match this view.",
    noArticles: "No submissions yet.",
    noArticlesDescription: "Waiting for authors to submit articles.",
    article: "Article",
    by: "By",
    unknownAuthor: "Unknown author",
    approve: "Approve",
    approving: "Approving...",
    reject: "Reject",
    rejecting: "Returning...",
    approved: "Article approved",
    returned: "Article returned for revision",
    selectArticle: "Select an article to begin.",
    errorTitle: "Unable to load submissions",
    errorDescription:
      "Unable to connect to the backend. Please confirm FastAPI is running.",
    retry: "Retry",
    loading: "Loading submissions",
  },
  zh: {
    eyebrow: "编辑工作台",
    title: "审核投稿",
    description: "阅读、预览并审核所有投稿文章。",
    search: "搜索文章",
    searchLabel: "搜索文章",
    filterLabel: "按审核状态筛选",
    allStatuses: "全部状态",
    statuses: {
      draft: "草稿",
      pending: "待审核",
      approved: "已通过",
      rejected: "已退回",
    },
    articles: "篇文章",
    submitted: "提交时间",
    noMatches: "没有符合当前条件的文章。",
    noArticles: "暂无投稿。",
    noArticlesDescription: "等待作者提交文章。",
    article: "文章",
    by: "作者",
    unknownAuthor: "未知作者",
    approve: "通过",
    approving: "正在通过...",
    reject: "退回修改",
    rejecting: "正在退回...",
    approved: "文章已通过审核",
    returned: "文章已退回修改",
    selectArticle: "请选择一篇文章开始审核。",
    errorTitle: "无法加载投稿",
    errorDescription: "无法连接后端。请确认 FastAPI 正在运行。",
    retry: "重试",
    loading: "正在加载投稿",
  },
} as const;

const statusStyles: Record<ArticleStatus, string> = {
  draft: "border-slate-500/20 bg-slate-500/10 text-slate-400",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-400",
};

interface ReviewPageProps {
  basePath: string;
  bookId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

function formatDate(value: string, language: Language) {
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function toPreviewArticle(article: Article): PreviewArticle {
  return {
    number: article.number,
    title: article.title,
    subtitle: "",
    body: article.content,
    imageUrl: article.image ?? "",
    imagePage: -1,
    imageWrap: "topBottom",
    imagePosition: { x: 50, y: 72 },
    imageSize: { width: 50, height: 25 },
  };
}

function ReviewSkeleton({ language }: { language: Language }) {
  return (
    <div
      aria-label={copy[language].loading}
      className="animate-pulse"
      role="status"
    >
      <div className="border-b border-border pb-7">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="mt-4 h-8 w-64 rounded bg-muted" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-muted/70" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(340px,0.9fr)_minmax(420px,1.1fr)]">
        <div className="h-[620px] rounded-xl border border-border bg-muted/30" />
        <div className="h-[620px] rounded-xl border border-border bg-muted/30" />
        <div className="h-[620px] rounded-xl border border-border bg-muted/30" />
      </div>
    </div>
  );
}

export function ReviewPage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: ReviewPageProps) {
  const pageCopy = copy[language];
  const [searchParams] = useSearchParams();
  const requestedArticleIdValue = searchParams.get("articleId");
  const requestedArticleId =
    requestedArticleIdValue && /^\d+$/.test(requestedArticleIdValue)
      ? Number(requestedArticleIdValue)
      : null;
  const [articles, setArticles] = useState<Article[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadReview() {
      setIsLoading(true);
      setHasError(false);
      try {
        const [loadedArticles, loadedAuthors] = await Promise.all([
          articleRepository.listSubmitted(bookId),
          authorRepository.list(bookId),
        ]);
        const initialArticle =
          loadedArticles.find((article) => article.id === requestedArticleId) ??
          loadedArticles[0];
        const firstArticle = initialArticle
          ? await articleRepository.get(initialArticle.id)
          : null;
        if (!active) return;
        setArticles(loadedArticles);
        setAuthors(loadedAuthors);
        setSelectedArticle(firstArticle);
        setSelectedId(firstArticle?.id ?? null);
      } catch {
        if (active) setHasError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadReview();
    return () => {
      active = false;
    };
  }, [bookId, reloadKey, requestedArticleId]);

  const authorNames = useMemo(
    () => new Map(authors.map((author) => [author.id, author.name])),
    [authors],
  );
  const getAuthorName = (article: Article) =>
    authorNames.get(article.author_id) ?? pageCopy.unknownAuthor;

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return articles.filter((article) => {
      const authorName = authorNames.get(article.author_id) ?? "";
      const matchesStatus =
        statusFilter === "all" || article.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        article.title.toLowerCase().includes(normalizedQuery) ||
        authorName.toLowerCase().includes(normalizedQuery) ||
        article.number.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [authorNames, articles, query, statusFilter]);

  const previewArticle = useMemo(
    () => (selectedArticle ? toPreviewArticle(selectedArticle) : null),
    [selectedArticle],
  );

  const selectArticle = async (articleId: number) => {
    setSelectedId(articleId);
    setSelectedArticle(null);
    setIsDetailLoading(true);
    try {
      setSelectedArticle(await articleRepository.get(articleId));
    } catch {
      setHasError(true);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const runAction = async (action: "approve" | "reject") => {
    if (!selectedArticle) return;
    setBusyAction(action);
    try {
      const status = action === "approve" ? "approved" : "rejected";
      await articleRepository.updateStatus(selectedArticle.id, status);
      const [refreshedArticles, refreshedArticle] = await Promise.all([
        articleRepository.listSubmitted(bookId),
        articleRepository.get(selectedArticle.id),
      ]);
      setArticles(refreshedArticles);
      setSelectedArticle(refreshedArticle);
      setNotice(action === "approve" ? pageCopy.approved : pageCopy.returned);
      window.setTimeout(() => setNotice(null), 2600);
    } catch {
      setHasError(true);
    } finally {
      setBusyAction(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout
        activeSection="Review"
        basePath={basePath}
        language={language}
        onNavigate={onNavigate}
        onToggleLanguage={onToggleLanguage}
      >
        <ReviewSkeleton language={language} />
      </DashboardLayout>
    );
  }

  if (hasError) {
    return (
      <DashboardLayout
        activeSection="Review"
        basePath={basePath}
        language={language}
        onNavigate={onNavigate}
        onToggleLanguage={onToggleLanguage}
      >
        <Card className="mx-auto mt-20 max-w-lg border-border bg-card shadow-none">
          <CardContent className="flex flex-col items-center px-7 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 ring-1 ring-inset ring-rose-500/20">
              <AlertCircle className="size-5" />
            </span>
            <h1 className="mt-5 text-lg font-semibold text-foreground">
              {pageCopy.errorTitle}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {pageCopy.errorDescription}
            </p>
            <Button
              className="mt-6 h-9 rounded-lg bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
              onClick={() => setReloadKey((value) => value + 1)}
              type="button"
            >
              <RefreshCw className="mr-2 size-3.5" />
              {pageCopy.retry}
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      activeSection="Review"
      basePath={basePath}
      language={language}
      onNavigate={onNavigate}
      onToggleLanguage={onToggleLanguage}
    >
      <header className="border-b border-border pb-7">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">
          <FileCheck2 className="size-3.5" />
          {pageCopy.eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
          {pageCopy.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pageCopy.description}
        </p>
      </header>

      {articles.length === 0 ? (
        <div className="mt-6 flex min-h-96 flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileCheck2 className="size-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold text-foreground">
            {pageCopy.noArticles}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {pageCopy.noArticlesDescription}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-5 xl:grid-cols-[280px_minmax(340px,0.9fr)_minmax(420px,1.1fr)]">
          <aside className="overflow-hidden rounded-xl border border-border bg-card xl:sticky xl:top-24 xl:flex xl:h-[calc(100vh-7.5rem)] xl:flex-col">
            <div className="border-b border-border p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label={pageCopy.searchLabel}
                  className="h-10 rounded-lg border-input bg-background pl-9 text-sm text-foreground placeholder:text-muted-foreground"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={pageCopy.search}
                  value={query}
                />
              </div>
              <Select
                aria-label={pageCopy.filterLabel}
                className="mt-2"
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | ReviewStatus)
                }
                value={statusFilter}
              >
                <option value="all">{pageCopy.allStatuses}</option>
                {reviewStatuses.map((status) => (
                  <option key={status} value={status}>
                    {pageCopy.statuses[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center justify-between border-b border-border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span>
                {filteredArticles.length} {pageCopy.articles}
              </span>
              <span>{pageCopy.submitted}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {filteredArticles.length ? (
                filteredArticles.map((article) => (
                  <button
                    className={`mb-1 block w-full rounded-lg border px-3 py-3 text-left transition-colors ${selectedId === article.id ? "border-blue-500/25 bg-blue-500/[0.08]" : "border-transparent hover:bg-muted/50"}`}
                    key={article.id}
                    onClick={() => void selectArticle(article.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground">
                        #{article.number}
                      </span>
                      <Badge
                        className={`rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] ${statusStyles[article.status]}`}
                      >
                        {pageCopy.statuses[article.status]}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-5 text-foreground">
                      {article.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{getAuthorName(article)}</span>
                      <span className="shrink-0">
                        {article.submitted_at
                          ? formatDate(article.submitted_at, language)
                          : "—"}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {pageCopy.noMatches}
                </p>
              )}
            </div>
          </aside>

          <section className="overflow-hidden rounded-xl border border-border bg-card xl:sticky xl:top-24 xl:flex xl:h-[calc(100vh-7.5rem)] xl:flex-col">
            {isDetailLoading ? (
              <div className="flex-1 animate-pulse p-6" role="status">
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="mt-6 h-8 w-4/5 rounded bg-muted" />
                <div className="mt-3 h-3 w-32 rounded bg-muted/70" />
                <div className="mt-6 aspect-[2/1] rounded-lg bg-muted/50" />
                <div className="mt-6 h-28 rounded bg-muted/40" />
              </div>
            ) : selectedArticle ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {pageCopy.article} #{selectedArticle.number}
                    </span>
                    <Badge
                      className={`rounded-md ${statusStyles[selectedArticle.status]}`}
                    >
                      {pageCopy.statuses[selectedArticle.status]}
                    </Badge>
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.035em] text-foreground">
                    {selectedArticle.title}
                  </h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {pageCopy.by} {getAuthorName(selectedArticle)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pageCopy.submitted}: {selectedArticle.submitted_at
                      ? formatDate(selectedArticle.submitted_at, language)
                      : "—"}
                  </p>
                  {selectedArticle.image ? (
                    <img
                      alt={selectedArticle.title}
                      className="mt-6 aspect-[2/1] w-full rounded-lg object-cover"
                      src={selectedArticle.image}
                    />
                  ) : null}
                  <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
                    {selectedArticle.content.split("\n\n").map((paragraph, index) => (
                      <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border p-4">
                  <Button
                    className="h-9 rounded-lg bg-emerald-600 px-3.5 text-white hover:bg-emerald-500"
                    disabled={busyAction !== null}
                    onClick={() => void runAction("approve")}
                  >
                    <Check className="mr-1.5 size-3.5" />
                    {busyAction === "approve"
                      ? pageCopy.approving
                      : pageCopy.approve}
                  </Button>
                  <Button
                    className="h-9 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 text-rose-400 hover:bg-rose-500/15"
                    disabled={busyAction !== null}
                    onClick={() => void runAction("reject")}
                  >
                    <X className="mr-1.5 size-3.5" />
                    {busyAction === "reject"
                      ? pageCopy.rejecting
                      : pageCopy.reject}
                  </Button>
                  {notice ? (
                    <span
                      className="flex items-center gap-1.5 text-xs text-emerald-400"
                      role="status"
                    >
                      <Send className="size-3.5" />
                      {notice}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
                {pageCopy.selectArticle}
              </p>
            )}
          </section>

          <div className="xl:sticky xl:top-24">
            {previewArticle ? (
              <LiveArticlePreview
                article={previewArticle}
                language={language}
                readOnly
              />
            ) : null}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
