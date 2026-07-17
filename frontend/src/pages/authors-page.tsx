import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LiveArticlePreview } from "@/components/author-editor/live-article-preview";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useBookTemplate } from "@/hooks/use-book-template";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Language } from "@/lib/i18n";
import {
  articleRepository,
  type Article,
  type ArticleStatus,
} from "@/repositories/articleRepository";
import {
  authorRepository,
  type AuthorSummary,
} from "@/repositories/authorRepository";
import { bookRepository } from "@/repositories/bookRepository";
import type { PreviewArticle } from "@/types/article";

interface AuthorsPageProps {
  basePath: string;
  bookId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    title: "Authors",
    description: "Each author has a stable identity and can manage multiple articles.",
    totalAuthors: "Total Authors",
    totalArticles: "Total Articles",
    activeAuthors: "Authors with submissions",
    search: "Search authors...",
    invite: "Invite Authors",
    name: "Display Name",
    articles: "Articles",
    latest: "Latest Article",
    updated: "Last Updated",
    actions: "Actions",
    noArticle: "No submissions yet",
    noAuthors: "No authors yet.",
    noResults: "No matching authors.",
    viewArticles: "View articles",
    remove: "Remove",
    removeConfirm: "Remove this author and all their articles?",
    error: "Unable to load authors.",
    retry: "Retry",
    previewLoadError: "Unable to load the publication template.",
    loading: "Loading authors",
    back: "Back to authors",
    authorArticles: "Articles by",
    articleCount: (count: number) => `${count} ${count === 1 ? "article" : "articles"}`,
    noAuthorArticles: "This author has not created any articles yet.",
    loadingArticles: "Loading articles",
    articleError: "Unable to load this author's articles.",
    statuses: {
      draft: "Draft",
      pending: "Pending",
      approved: "Approved",
      rejected: "Returned",
    },
    showContent: "View content",
    hideContent: "Hide content",
    goToReview: "Go to review",
    deleteArticle: "Delete",
    deleteConfirm: "Delete this article? This action cannot be undone.",
    actionError: "The operation failed. Please try again.",
  },
  zh: {
    title: "作者管理",
    description: "每位作者拥有稳定身份，并可统一管理多篇文章。",
    totalAuthors: "作者总数",
    totalArticles: "文章总数",
    activeAuthors: "已有投稿作者",
    search: "搜索作者...",
    invite: "邀请作者",
    name: "显示名称",
    articles: "文章数量",
    latest: "最近文章",
    updated: "最后更新",
    actions: "操作",
    noArticle: "暂无投稿",
    noAuthors: "暂无作者。",
    noResults: "未找到匹配的作者。",
    viewArticles: "查看文章",
    remove: "移除",
    removeConfirm: "确定移除这位作者及其全部文章吗？",
    error: "无法加载作者。",
    retry: "重试",
    previewLoadError: "无法加载出版模板。",
    loading: "正在加载作者",
    back: "返回作者列表",
    authorArticles: "作者文章",
    articleCount: (count: number) => `${count} 篇文章`,
    noAuthorArticles: "这位作者还没有创建文章。",
    loadingArticles: "正在加载文章",
    articleError: "无法加载这位作者的文章。",
    statuses: {
      draft: "草稿",
      pending: "待审核",
      approved: "已通过",
      rejected: "已退回",
    },
    showContent: "查看内容",
    hideContent: "收起内容",
    goToReview: "转到审核",
    deleteArticle: "删除",
    deleteConfirm: "确定删除这篇文章吗？此操作无法撤销。",
    actionError: "操作失败，请重试。",
  },
} as const;

const statusStyles: Record<ArticleStatus, string> = {
  draft: "border-slate-500/20 bg-slate-500/10 text-slate-400",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-400",
};

function formatDate(value: string, language: Language) {
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    dateStyle: "medium",
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

export function AuthorsPage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: AuthorsPageProps) {
  const pageCopy = copy[language];
  const [authors, setAuthors] = useState<AuthorSummary[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedAuthor, setSelectedAuthor] = useState<AuthorSummary | null>(null);
  const [authorArticles, setAuthorArticles] = useState<Article[]>([]);
  const [isArticlesLoading, setIsArticlesLoading] = useState(false);
  const [articlesError, setArticlesError] = useState(false);
  const [articlesReloadKey, setArticlesReloadKey] = useState(0);
  const [expandedArticleId, setExpandedArticleId] = useState<number | null>(null);
  const [busyArticleId, setBusyArticleId] = useState<number | null>(null);
  const [actionError, setActionError] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const {
    reload: reloadTemplate,
    status: templateStatus,
    template,
  } = useBookTemplate(bookId);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    async function loadAuthors() {
      try {
        const [loadedAuthors, loadedBook] = await Promise.all([
          authorRepository.list(bookId),
          bookRepository.get(bookId),
        ]);
        if (!active) return;
        setBookTitle(loadedBook.title);
        setAuthors(loadedAuthors);
      } catch {
        if (active) setHasError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadAuthors();
    return () => {
      active = false;
    };
  }, [bookId, reloadKey]);

  useEffect(() => {
    if (!selectedAuthor) return;
    let active = true;
    setIsArticlesLoading(true);
    setArticlesError(false);
    setActionError(false);

    articleRepository
      .listByAuthor(selectedAuthor.id)
      .then((articles) => {
        if (active) setAuthorArticles(articles);
      })
      .catch(() => {
        if (active) setArticlesError(true);
      })
      .finally(() => {
        if (active) setIsArticlesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [articlesReloadKey, selectedAuthor]);

  const filteredAuthors = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return authors.filter((author) => author.name.toLowerCase().includes(normalized));
  }, [authors, query]);

  const totalArticles = authors.reduce(
    (sum, author) => sum + author.article_count,
    0,
  );
  const activeAuthors = authors.filter(
    (author) => author.article_count > 0,
  ).length;

  const refreshSelectedAuthor = async () => {
    if (!selectedAuthor) return;
    const refreshed = await authorRepository.list(bookId);
    setAuthors(refreshed);
    setSelectedAuthor(
      (current) => refreshed.find((author) => author.id === current?.id) ?? null,
    );
  };

  const removeAuthor = async (author: AuthorSummary) => {
    if (!window.confirm(pageCopy.removeConfirm)) return;
    try {
      await authorRepository.delete(author.id);
      setAuthors((current) => current.filter((item) => item.id !== author.id));
    } catch {
      setHasError(true);
    }
  };

  const deleteArticle = async (article: Article) => {
    if (!window.confirm(pageCopy.deleteConfirm)) return;
    setBusyArticleId(article.id);
    setActionError(false);
    try {
      await articleRepository.delete(article.id);
      setAuthorArticles((current) => current.filter((item) => item.id !== article.id));
      setExpandedArticleId((current) => (current === article.id ? null : current));
      await refreshSelectedAuthor();
    } catch {
      setActionError(true);
    } finally {
      setBusyArticleId(null);
    }
  };

  const openAuthor = (author: AuthorSummary) => {
    setSelectedAuthor(author);
    setExpandedArticleId(null);
    setAuthorArticles([]);
  };

  return (
    <DashboardLayout
      activeSection="Authors"
      basePath={basePath}
      language={language}
      onNavigate={onNavigate}
      onToggleLanguage={onToggleLanguage}
    >
      {isLoading ? (
        <div aria-label={pageCopy.loading} className="animate-pulse" role="status">
          <div className="h-8 w-52 rounded bg-muted" />
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="h-24 rounded-xl bg-muted/40" key={index} />
            ))}
          </div>
          <div className="mt-7 h-72 rounded-xl bg-muted/30" />
        </div>
      ) : hasError ? (
        <Card className="mx-auto mt-20 max-w-lg">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="size-6 text-rose-400" />
            <p className="mt-4 text-sm text-muted-foreground">{pageCopy.error}</p>
            <Button className="mt-5" onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw className="mr-2 size-4" />
              {pageCopy.retry}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <header className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.035em]">{pageCopy.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{pageCopy.description}</p>
            </div>
            <Button onClick={() => onNavigate(`/book/${bookId}/invite`)}>
              <UserPlus className="mr-2 size-4" />
              {pageCopy.invite}
            </Button>
          </header>

          <section className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              { label: pageCopy.totalAuthors, value: authors.length, icon: Users },
              { label: pageCopy.totalArticles, value: totalArticles, icon: FileText },
              { label: pageCopy.activeAuthors, value: activeAuthors, icon: UserPlus },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="size-3.5" />
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {selectedAuthor ? (
            <section className="mt-7">
              <button
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setSelectedAuthor(null)}
                type="button"
              >
                <ArrowLeft className="size-4" />
                {pageCopy.back}
              </button>
              <div className="mt-5 flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {pageCopy.authorArticles}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    {selectedAuthor.name}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pageCopy.articleCount(authorArticles.length)}
                </p>
              </div>

              {isArticlesLoading ? (
                <div aria-label={pageCopy.loadingArticles} className="mt-5 space-y-3 animate-pulse" role="status">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div className="h-28 rounded-xl bg-muted/30" key={index} />
                  ))}
                </div>
              ) : articlesError ? (
                <Card className="mt-5">
                  <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
                    <AlertCircle className="size-5 text-rose-400" />
                    <p className="mt-3 text-sm text-muted-foreground">{pageCopy.articleError}</p>
                    <Button
                      className="mt-5 h-9 px-4"
                      onClick={() => setArticlesReloadKey((value) => value + 1)}
                      variant="outline"
                    >
                      <RefreshCw className="mr-2 size-3.5" />
                      {pageCopy.retry}
                    </Button>
                  </CardContent>
                </Card>
              ) : authorArticles.length === 0 ? (
                <Card className="mt-5">
                  <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
                    <FileText className="size-6 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">{pageCopy.noAuthorArticles}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="mt-5 space-y-3">
                  {actionError ? (
                    <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400" role="alert">
                      {pageCopy.actionError}
                    </p>
                  ) : null}
                  {authorArticles.map((article) => {
                    const isExpanded = expandedArticleId === article.id;
                    const isBusy = busyArticleId === article.id;
                    return (
                      <Card key={article.id}>
                        <CardContent className="p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">#{article.number}</span>
                                <Badge className={statusStyles[article.status]}>
                                  {pageCopy.statuses[article.status]}
                                </Badge>
                              </div>
                              <h3 className="mt-3 text-base font-semibold text-foreground">{article.title}</h3>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(article.updated_at, language)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              {article.status !== "draft" ? (
                                <Button
                                  className="h-9 px-3 text-xs"
                                  disabled={isBusy}
                                  onClick={() =>
                                    onNavigate(`${basePath}/review?articleId=${article.id}`)
                                  }
                                >
                                  {pageCopy.goToReview}
                                </Button>
                              ) : null}
                              <Button
                                className="h-9 px-3 text-xs text-rose-400"
                                disabled={isBusy}
                                onClick={() => void deleteArticle(article)}
                                variant="outline"
                              >
                                <Trash2 className="mr-1.5 size-3.5" />
                                {pageCopy.deleteArticle}
                              </Button>
                            </div>
                          </div>
                          <button
                            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
                            onClick={() => setExpandedArticleId(isExpanded ? null : article.id)}
                            type="button"
                          >
                            {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                            {isExpanded ? pageCopy.hideContent : pageCopy.showContent}
                          </button>
                          {isExpanded ? (
                            <div className="mt-4 border-t border-border pt-5">
                              <div className="mx-auto max-w-2xl">
                                {templateStatus === "error" ? (
                                  <div className="rounded-xl border border-border bg-card p-6 text-center">
                                    <p className="text-sm text-muted-foreground">{pageCopy.previewLoadError}</p>
                                    <Button className="mt-4" onClick={reloadTemplate} variant="outline">
                                      <RefreshCw className="mr-2 size-4" />
                                      {pageCopy.retry}
                                    </Button>
                                  </div>
                                ) : templateStatus === "ready" ? (
                                  <LiveArticlePreview
                                    article={toPreviewArticle(article)}
                                    articlePageMode="single"
                                    bookTitle={bookTitle}
                                    language={language}
                                    readOnly
                                    template={template}
                                  />
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section className="mt-7">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={pageCopy.search}
                  value={query}
                />
              </div>
              <Card className="mt-4 overflow-hidden">
                {authors.length === 0 || filteredAuthors.length === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <Users className="size-6 text-muted-foreground" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      {authors.length === 0 ? pageCopy.noAuthors : pageCopy.noResults}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{pageCopy.name}</TableHead>
                        <TableHead>{pageCopy.articles}</TableHead>
                        <TableHead>{pageCopy.latest}</TableHead>
                        <TableHead>{pageCopy.updated}</TableHead>
                        <TableHead className="text-right">{pageCopy.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuthors.map((author) => {
                        const latest = author.latest_article;
                        return (
                          <TableRow key={author.id}>
                            <TableCell className="font-medium">
                              <button
                                className="text-left text-foreground underline-offset-4 hover:text-blue-400 hover:underline"
                                onClick={() => openAuthor(author)}
                                type="button"
                              >
                                {author.name}
                              </button>
                            </TableCell>
                            <TableCell>
                              <Badge className="border border-border bg-transparent text-foreground">
                                {author.article_count}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {latest?.title ?? (
                                <span className="text-muted-foreground">{pageCopy.noArticle}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(latest?.updated_at ?? author.updated_at, language)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  aria-label={pageCopy.actions}
                                  className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
                                >
                                  <MoreHorizontal className="size-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => openAuthor(author)}>
                                    {pageCopy.viewArticles}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-rose-400"
                                    onClick={() => void removeAuthor(author)}
                                  >
                                    {pageCopy.remove}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
