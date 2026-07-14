import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, FileCheck2, Search, Send, X } from "lucide-react";

import { LiveArticlePreview } from "@/components/author-editor/live-article-preview";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Language } from "@/lib/i18n";
import type { Article, ArticleStatus } from "@/mock/articles";
import type { MockArticle } from "@/mock/article";
import { reviewArticleRepository } from "@/repositories/reviewArticleRepository";

const copy = {
  en: {
    eyebrow: "Editorial desk",
    title: "Review submissions",
    description: "Read, preview, and review every submitted article.",
    search: "Search articles",
    searchLabel: "Search articles",
    filterLabel: "Filter by review status",
    allStatuses: "All statuses",
    statuses: { pending: "Pending", approved: "Approved", rejected: "Rejected" },
    articles: "articles",
    updated: "Updated",
    noMatches: "No articles match this view.",
    article: "Article",
    by: "By",
    approve: "Approve",
    approving: "Approving...",
    reject: "Reject",
    rejecting: "Returning...",
    saveDraft: "Save draft",
    saving: "Saving...",
    approved: "Article approved",
    returned: "Article returned for revision",
    saved: "Draft timestamp updated",
    selectArticle: "Select an article to begin.",
  },
  zh: {
    eyebrow: "编辑工作台",
    title: "审核投稿",
    description: "阅读、预览并审核所有投稿文章。",
    search: "搜索文章",
    searchLabel: "搜索文章",
    filterLabel: "按审核状态筛选",
    allStatuses: "全部状态",
    statuses: { pending: "待审核", approved: "已通过", rejected: "已退回" },
    articles: "篇文章",
    updated: "更新于",
    noMatches: "没有符合当前条件的文章。",
    article: "文章",
    by: "作者",
    approve: "通过",
    approving: "正在通过...",
    reject: "退回修改",
    rejecting: "正在退回...",
    saveDraft: "保存草稿",
    saving: "正在保存...",
    approved: "文章已通过审核",
    returned: "文章已退回修改",
    saved: "草稿时间已更新",
    selectArticle: "请选择一篇文章开始审核。",
  },
} as const;

const statusStyles: Record<ArticleStatus, string> = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-400",
};

interface ReviewPageProps {
  basePath: string;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    day: "numeric",
    month: language === "zh" ? "long" : "short",
  }).format(new Date(value));
}

function toPreviewArticle(article: Article): MockArticle {
  return {
    number: article.number,
    title: article.title,
    body: article.content,
    imageUrl: article.image,
    imageWrap: "topBottom",
    imagePosition: { x: 50, y: 72 },
  };
}

export function ReviewPage({
  basePath,
  language,
  onNavigate,
  onToggleLanguage,
}: ReviewPageProps) {
  const pageCopy = copy[language];
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ArticleStatus>("all");
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | "draft" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    reviewArticleRepository.getArticles().then((loadedArticles) => {
      if (!active) return;
      setArticles(loadedArticles);
      setSelectedArticle(loadedArticles[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesStatus = statusFilter === "all" || article.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        article.title.toLowerCase().includes(normalizedQuery) ||
        article.author.toLowerCase().includes(normalizedQuery) ||
        article.number.includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [articles, query, statusFilter]);

  const previewArticle = useMemo(
    () => (selectedArticle ? toPreviewArticle(selectedArticle) : null),
    [selectedArticle],
  );

  const replaceArticle = (updated: Article, message: string) => {
    setArticles((current) => current.map((article) => (article.id === updated.id ? updated : article)));
    setSelectedArticle(updated);
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const runAction = async (action: "approve" | "reject" | "draft") => {
    if (!selectedArticle) return;
    setBusyAction(action);
    try {
      const updated =
        action === "approve"
          ? await reviewArticleRepository.approveArticle(selectedArticle.id)
          : action === "reject"
            ? await reviewArticleRepository.rejectArticle(selectedArticle.id)
            : await reviewArticleRepository.updateArticle(selectedArticle.id, {});
      replaceArticle(
        updated,
        action === "approve" ? pageCopy.approved : action === "reject" ? pageCopy.returned : pageCopy.saved,
      );
    } finally {
      setBusyAction(null);
    }
  };

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
        <p className="mt-2 text-sm text-muted-foreground">{pageCopy.description}</p>
      </header>

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
              onChange={(event) => setStatusFilter(event.target.value as "all" | ArticleStatus)}
              value={statusFilter}
            >
              <option value="all">{pageCopy.allStatuses}</option>
              <option value="pending">{pageCopy.statuses.pending}</option>
              <option value="approved">{pageCopy.statuses.approved}</option>
              <option value="rejected">{pageCopy.statuses.rejected}</option>
            </Select>
          </div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span>{filteredArticles.length} {pageCopy.articles}</span>
            <span>{pageCopy.updated}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredArticles.length ? (
              filteredArticles.map((article) => (
                <button
                  className={`mb-1 block w-full rounded-lg border px-3 py-3 text-left transition-colors ${selectedArticle?.id === article.id ? "border-blue-500/25 bg-blue-500/[0.08]" : "border-transparent hover:bg-muted/50"}`}
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground">#{article.number}</span>
                    <Badge className={`rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] ${statusStyles[article.status]}`}>
                      {pageCopy.statuses[article.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-5 text-foreground">{article.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">{article.author}</span>
                    <span className="shrink-0">{formatDate(article.updatedAt, language)}</span>
                  </div>
                </button>
              ))
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{pageCopy.noMatches}</p>
            )}
          </div>
        </aside>

        <section className="overflow-hidden rounded-xl border border-border bg-card xl:sticky xl:top-24 xl:flex xl:h-[calc(100vh-7.5rem)] xl:flex-col">
          {selectedArticle ? (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {pageCopy.article} #{selectedArticle.number}
                  </span>
                  <Badge className={`rounded-md ${statusStyles[selectedArticle.status]}`}>
                    {pageCopy.statuses[selectedArticle.status]}
                  </Badge>
                </div>
                <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.035em] text-foreground">
                  {selectedArticle.title}
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">{pageCopy.by} {selectedArticle.author}</p>
                <img alt="" className="mt-6 aspect-[2/1] w-full rounded-lg object-cover" src={selectedArticle.image} />
                <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
                  {selectedArticle.content.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border p-4">
                <Button className="h-9 rounded-lg bg-emerald-600 px-3.5 text-white hover:bg-emerald-500" disabled={busyAction !== null} onClick={() => runAction("approve")}>
                  <Check className="mr-1.5 size-3.5" />{busyAction === "approve" ? pageCopy.approving : pageCopy.approve}
                </Button>
                <Button className="h-9 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 text-rose-400 hover:bg-rose-500/15" disabled={busyAction !== null} onClick={() => runAction("reject")}>
                  <X className="mr-1.5 size-3.5" />{busyAction === "reject" ? pageCopy.rejecting : pageCopy.reject}
                </Button>
                <Button className="h-9 rounded-lg border border-border bg-background px-3.5 text-foreground hover:bg-muted" disabled={busyAction !== null} onClick={() => runAction("draft")}>
                  <Clock3 className="mr-1.5 size-3.5" />{busyAction === "draft" ? pageCopy.saving : pageCopy.saveDraft}
                </Button>
                {notice && <span className="flex items-center gap-1.5 text-xs text-emerald-400" role="status"><Send className="size-3.5" />{notice}</span>}
              </div>
            </>
          ) : (
            <p className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">{pageCopy.selectArticle}</p>
          )}
        </section>

        <div className="xl:sticky xl:top-24">
          {previewArticle ? (
            <LiveArticlePreview article={previewArticle} language={language} readOnly />
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
