import { MoreHorizontal, Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";

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
import { authors, type ArticleStatus, type AuthorStatus } from "@/mock/authors";
import { cn } from "@/lib/utils";

interface AuthorsPageProps {
  basePath?: string;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const statusStyles: Record<AuthorStatus, string> = {
  Joined: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  Invited: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  "Not Joined": "border-white/[0.1] bg-white/[0.04] text-zinc-500",
};

const articleStyles: Record<ArticleStatus, string> = {
  Submitted: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  Draft: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  "Not Started": "border-white/[0.1] bg-white/[0.04] text-zinc-500",
};

const authorsCopy = {
  en: {
    title: "Authors",
    description: "Manage everyone contributing to this book.",
    contributors: "contributors",
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
    never: "—",
    actionLabel: "Actions for",
    statuses: {
      Joined: "Joined",
      Invited: "Invited",
      "Not Joined": "Not Joined",
    },
    articleStatuses: {
      Submitted: "Submitted",
      Draft: "Draft",
      "Not Started": "Not Started",
    },
  },
  zh: {
    title: "作者管理",
    description: "管理本书的所有投稿作者。",
    contributors: "位作者",
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
    noAuthors: "暂时没有作者。",
    noAuthorsDescription: "邀请第一位作者，开始收集文章。",
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
    never: "—",
    actionLabel: "操作：",
    statuses: {
      Joined: "已加入",
      Invited: "已邀请",
      "Not Joined": "未加入",
    },
    articleStatuses: {
      Submitted: "已投稿",
      Draft: "草稿",
      "Not Started": "未开始",
    },
  },
} as const;

const updatedAtCopy: Record<string, Record<Language, string>> = {
  "2 minutes ago": { en: "2 minutes ago", zh: "2 分钟前" },
  "4 hours ago": { en: "4 hours ago", zh: "4 小时前" },
  Today: { en: "Today", zh: "今天" },
  Yesterday: { en: "Yesterday", zh: "昨天" },
  "3 days ago": { en: "3 days ago", zh: "3 天前" },
  "5 days ago": { en: "5 days ago", zh: "5 天前" },
};

export function AuthorsPage({
  basePath = "/dashboard",
  language,
  onNavigate,
  onToggleLanguage,
}: AuthorsPageProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | AuthorStatus>(
    "All",
  );
  const copy = authorsCopy[language];

  const filteredAuthors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return authors.filter((author) => {
      const matchesQuery =
        !normalizedQuery ||
        author.name.toLowerCase().includes(normalizedQuery) ||
        author.number.includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "All" || author.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  const stats = [
    { label: copy.stats.total, value: authors.length, tone: "text-zinc-100" },
    {
      label: copy.stats.joined,
      value: authors.filter((author) => author.status === "Joined").length,
      tone: "text-emerald-400",
    },
    {
      label: copy.stats.submitted,
      value: authors.filter((author) => author.articleStatus === "Submitted")
        .length,
      tone: "text-blue-400",
    },
    {
      label: copy.stats.pending,
      value: authors.filter((author) => author.articleStatus !== "Submitted")
        .length,
      tone: "text-amber-400",
    },
  ];

  return (
    <DashboardLayout
      activeSection="Authors"
      basePath={basePath}
      language={language}
      onNavigate={onNavigate}
      onToggleLanguage={onToggleLanguage}
    >
      <section className="flex flex-col gap-4 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-zinc-50 sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{copy.description}</p>
        </div>
        <span className="hidden items-center gap-2 text-xs text-zinc-600 sm:flex">
          <Users className="size-3.5" />
          {authors.length} {copy.contributors}
        </span>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, tone, value }) => (
          <Card
            className="border-white/[0.07] bg-[#131519] shadow-none"
            key={label}
          >
            <CardContent className="p-5">
              <p className="text-xs font-medium text-zinc-500">{label}</p>
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
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
              <Input
                aria-label={copy.searchLabel}
                className="h-10 rounded-lg border-white/[0.08] bg-white/[0.035] pl-9 text-sm placeholder:text-zinc-600"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.search}
                value={query}
              />
            </div>
            <Select
              aria-label={copy.filterLabel}
              onChange={(event) =>
                setStatusFilter(event.target.value as "All" | AuthorStatus)
              }
              value={statusFilter}
            >
              <option className="bg-[#1a1c21]" value="All">
                {copy.allStatuses}
              </option>
              {(Object.keys(statusStyles) as AuthorStatus[]).map((status) => (
                <option className="bg-[#1a1c21]" key={status} value={status}>
                  {copy.statuses[status]}
                </option>
              ))}
            </Select>
          </div>
          <Button
            className="h-10 rounded-lg bg-zinc-100 px-4 text-sm text-zinc-950 hover:bg-white"
            type="button"
          >
            <UserPlus className="mr-2 size-4" />
            {copy.invite}
          </Button>
        </div>

        <Card className="mt-4 overflow-hidden border-white/[0.07] bg-[#131519] shadow-none">
          {authors.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-white/[0.05] text-zinc-500">
                <Users className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-zinc-200">
                {copy.noAuthors}
              </h2>
              <p className="mt-1.5 max-w-xs text-sm text-zinc-500">
                {copy.noAuthorsDescription}
              </p>
              <Button
                className="mt-5 h-9 rounded-lg bg-zinc-100 px-4 text-xs text-zinc-950 hover:bg-white"
                type="button"
              >
                <UserPlus className="mr-2 size-3.5" />
                {copy.invite}
              </Button>
            </div>
          ) : filteredAuthors.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-white/[0.05] text-zinc-500">
                <Search className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold text-zinc-200">
                {copy.noResults}
              </h2>
              <p className="mt-1.5 text-sm text-zinc-500">
                {copy.noResultsDescription}
              </p>
              <Button
                className="mt-5 h-9 rounded-lg border-white/[0.1] bg-transparent px-4 text-xs text-zinc-300 hover:bg-white/[0.05]"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("All");
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
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {author.number}
                    </TableCell>
                    <TableCell className="font-medium text-zinc-200">
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
                          articleStyles[author.articleStatus],
                        )}
                      >
                        {copy.articleStatuses[author.articleStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {author.updatedAt
                        ? (updatedAtCopy[author.updatedAt]?.[language] ??
                          author.updatedAt)
                        : copy.never}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`${copy.actionLabel} ${author.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.07] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          type="button"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>{copy.actions.view}</DropdownMenuItem>
                          <DropdownMenuItem>{copy.actions.edit}</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400 focus:text-red-300">
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
