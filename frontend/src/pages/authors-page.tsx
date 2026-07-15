import {
  AlertCircle,
  Hash,
  MoreHorizontal,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  authorRepository,
  type Author,
  type AuthorArticleStatus,
  type AuthorStatus,
} from "@/repositories/authorRepository";
import {
  bookRepository,
  type NumberMode,
} from "@/repositories/bookRepository";

interface AuthorsPageProps {
  basePath: string;
  bookId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const statusStyles: Record<AuthorStatus, string> = {
  joined: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  invited: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  not_joined: "border-border bg-muted/40 text-muted-foreground",
};

const articleStyles: Record<AuthorArticleStatus, string> = {
  submitted: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  draft: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  not_started: "border-border bg-muted/40 text-muted-foreground",
};

const authorsCopy = {
  en: {
    title: "Authors",
    description: "Manage everyone contributing to this book.",
    contributors: "contributors",
    numberMode: "Number assignment mode",
    numberModes: {
      none: "No article numbers",
      automatic: "Generate numbers automatically",
      import: "Import existing numbers",
    },
    stats: {
      total: "Total Authors",
      joined: "Joined",
      submitted: "Submitted",
      pending: "Pending",
    },
    search: "Search authors...",
    searchLabel: "Search authors",
    filterLabel: "Filter authors by status",
    allStatuses: "All statuses",
    invite: "Invite Authors",
    noAuthors: "No authors yet.",
    noAuthorsDescription:
      "Invite your first author to start collecting articles.",
    noResults: "No authors found.",
    noResultsDescription: "Try adjusting your search or status filter.",
    clearFilters: "Clear filters",
    columns: {
      number: "Number",
      name: "Name",
      status: "Status",
      article: "Article",
      updatedAt: "Last Updated",
      actions: "Actions",
    },
    actions: { view: "View", edit: "Edit", remove: "Remove" },
    actionLabel: "Actions for",
    statuses: {
      joined: "Joined",
      invited: "Invited",
      not_joined: "Not Joined",
    },
    articleStatuses: {
      submitted: "Submitted",
      draft: "Draft",
      not_started: "Not Started",
    },
    errorTitle: "Unable to load authors",
    errorDescription:
      "Unable to connect to the backend. Please confirm FastAPI is running.",
    retry: "Retry",
    loading: "Loading authors",
    removeConfirm: "Remove this author and their articles?",
  },
  zh: {
    title: "作者管理",
    description: "管理本书的所有投稿作者。",
    contributors: "位作者",
    numberMode: "编号分配模式",
    numberModes: {
      none: "不使用编号",
      automatic: "自动生成编号",
      import: "导入已有编号",
    },
    stats: {
      total: "作者总数",
      joined: "已加入",
      submitted: "已投稿",
      pending: "待完成",
    },
    search: "搜索作者...",
    searchLabel: "搜索作者",
    filterLabel: "按状态筛选作者",
    allStatuses: "全部状态",
    invite: "邀请作者",
    noAuthors: "暂无作者。",
    noAuthorsDescription: "邀请第一位作者开始投稿。",
    noResults: "未找到作者。",
    noResultsDescription: "请调整搜索内容或状态筛选条件。",
    clearFilters: "清除筛选",
    columns: {
      number: "编号",
      name: "姓名",
      status: "加入状态",
      article: "文章状态",
      updatedAt: "最后更新",
      actions: "操作",
    },
    actions: { view: "查看", edit: "编辑", remove: "移除" },
    actionLabel: "操作：",
    statuses: {
      joined: "已加入",
      invited: "已邀请",
      not_joined: "未加入",
    },
    articleStatuses: {
      submitted: "已投稿",
      draft: "草稿",
      not_started: "未开始",
    },
    errorTitle: "无法加载作者",
    errorDescription: "无法连接后端。请确认 FastAPI 正在运行。",
    retry: "重试",
    loading: "正在加载作者",
    removeConfirm: "确定移除这位作者及其文章吗？",
  },
} as const;

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function AuthorsSkeleton({ language }: { language: Language }) {
  return (
    <div
      aria-label={authorsCopy[language].loading}
      className="animate-pulse"
      role="status"
    >
      <div className="border-b border-border pb-8">
        <div className="h-8 w-52 rounded bg-muted" />
        <div className="mt-3 h-4 w-80 rounded bg-muted/70" />
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-24 rounded-xl border border-border bg-muted/30"
            key={index}
          />
        ))}
      </div>
      <div className="mt-7 h-10 w-full max-w-md rounded-lg bg-muted/50" />
      <div className="mt-4 h-72 rounded-xl border border-border bg-muted/30" />
    </div>
  );
}

export function AuthorsPage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: AuthorsPageProps) {
  const copy = authorsCopy[language];
  const [authors, setAuthors] = useState<Author[]>([]);
  const [numberMode, setNumberMode] = useState<NumberMode | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AuthorStatus>(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    Promise.all([bookRepository.get(bookId), authorRepository.list(bookId)])
      .then(([book, loadedAuthors]) => {
        if (active) {
          setAuthors(loadedAuthors);
          setNumberMode(book.number_mode);
        }
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookId, reloadKey]);

  const filteredAuthors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return authors.filter((author) => {
      const matchesQuery =
        !normalizedQuery ||
        author.name.toLowerCase().includes(normalizedQuery) ||
        author.number.toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" || author.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [authors, query, statusFilter]);

  const stats = [
    { label: copy.stats.total, value: authors.length, tone: "text-foreground" },
    {
      label: copy.stats.joined,
      value: authors.filter((author) => author.status === "joined").length,
      tone: "text-emerald-400",
    },
    {
      label: copy.stats.submitted,
      value: authors.filter((author) => author.article_status === "submitted")
        .length,
      tone: "text-blue-400",
    },
    {
      label: copy.stats.pending,
      value: authors.filter((author) => author.article_status !== "submitted")
        .length,
      tone: "text-amber-400",
    },
  ];

  const removeAuthor = async (author: Author) => {
    if (!window.confirm(copy.removeConfirm)) return;
    setDeletingId(author.id);
    try {
      await authorRepository.delete(author.id);
      setAuthors((current) => current.filter((item) => item.id !== author.id));
    } catch {
      setHasError(true);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout
        activeSection="Authors"
        basePath={basePath}
        language={language}
        onNavigate={onNavigate}
        onToggleLanguage={onToggleLanguage}
      >
        <AuthorsSkeleton language={language} />
      </DashboardLayout>
    );
  }

  if (hasError) {
    return (
      <DashboardLayout
        activeSection="Authors"
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
              {copy.errorTitle}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {copy.errorDescription}
            </p>
            <Button
              className="mt-6 h-9 rounded-lg bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
              onClick={() => setReloadKey((value) => value + 1)}
              type="button"
            >
              <RefreshCw className="mr-2 size-3.5" />
              {copy.retry}
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      activeSection="Authors"
      basePath={basePath}
      language={language}
      onNavigate={onNavigate}
      onToggleLanguage={onToggleLanguage}
    >
      <section className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <dl className="grid shrink-0 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Hash className="size-3.5" />
            <dt>{copy.numberMode}</dt>
            <dd className="text-foreground">
              {numberMode ? copy.numberModes[numberMode] : "—"}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-3.5" />
            <dt className="sr-only">{copy.stats.total}</dt>
            <dd>
              {authors.length} {copy.contributors}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, tone, value }) => (
          <Card className="border-border bg-card shadow-none" key={label}>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p
                className={cn(
                  "mt-2 text-2xl font-semibold tracking-[-0.03em]",
                  tone,
                )}
              >
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={copy.searchLabel}
                className="h-10 rounded-lg border-input bg-background pl-9 text-sm placeholder:text-muted-foreground"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.search}
                value={query}
              />
            </div>
            <Select
              aria-label={copy.filterLabel}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | AuthorStatus)
              }
              value={statusFilter}
            >
              <option className="bg-popover" value="all">
                {copy.allStatuses}
              </option>
              {(Object.keys(statusStyles) as AuthorStatus[]).map((status) => (
                <option className="bg-popover" key={status} value={status}>
                  {copy.statuses[status]}
                </option>
              ))}
            </Select>
          </div>
          <Button
            className="h-10 rounded-lg bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90"
            onClick={() => onNavigate(`/book/${bookId}/invite`)}
            type="button"
          >
            <UserPlus className="mr-2 size-4" />
            {copy.invite}
          </Button>
        </div>

        <Card className="mt-4 overflow-hidden border-border bg-card shadow-none">
          {authors.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-foreground">
                {copy.noAuthors}
              </h2>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                {copy.noAuthorsDescription}
              </p>
              <Button
                className="mt-5 h-9 rounded-lg bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
                onClick={() => onNavigate(`/book/${bookId}/invite`)}
                type="button"
              >
                <UserPlus className="mr-2 size-3.5" />
                {copy.invite}
              </Button>
            </div>
          ) : filteredAuthors.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-foreground">
                {copy.noResults}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {copy.noResultsDescription}
              </p>
              <Button
                className="mt-5 h-9 rounded-lg border-border bg-transparent px-4 text-xs text-foreground hover:bg-muted"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
                type="button"
                variant="outline"
              >
                {copy.clearFilters}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-24">{copy.columns.number}</TableHead>
                  <TableHead>{copy.columns.name}</TableHead>
                  <TableHead>{copy.columns.status}</TableHead>
                  <TableHead>{copy.columns.article}</TableHead>
                  <TableHead>{copy.columns.updatedAt}</TableHead>
                  <TableHead className="w-16 text-right">
                    {copy.columns.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuthors.map((author) => (
                  <TableRow key={author.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {author.number}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {author.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border", statusStyles[author.status])}>
                        {copy.statuses[author.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border",
                          articleStyles[author.article_status],
                        )}
                      >
                        {copy.articleStatuses[author.article_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(author.updated_at, language)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`${copy.actionLabel} ${author.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          type="button"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>{copy.actions.view}</DropdownMenuItem>
                          <DropdownMenuItem>{copy.actions.edit}</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-300"
                            disabled={deletingId === author.id}
                            onClick={() => void removeAuthor(author)}
                          >
                            {copy.actions.remove}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </DashboardLayout>
  );
}
