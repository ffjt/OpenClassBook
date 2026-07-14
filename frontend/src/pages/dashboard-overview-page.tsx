import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileOutput,
  FileText,
  RefreshCw,
  Settings2,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  articleRepository,
  type Article,
} from "@/repositories/articleRepository";
import {
  authorRepository,
  type Author,
} from "@/repositories/authorRepository";
import { bookRepository, type Book } from "@/repositories/bookRepository";
import {
  templateRepository,
  type BookTemplate,
} from "@/repositories/templateRepository";

interface DashboardData {
  articles: Article[];
  authors: Author[];
  book: Book;
  template: BookTemplate | null;
}

const statDefinitions = [
  { label: "authors", icon: Users, tone: "blue" },
  { label: "submitted", icon: FileText, tone: "violet" },
  { label: "pending", icon: Clock3, tone: "amber" },
  { label: "approved", icon: CheckCircle2, tone: "emerald" },
] as const;

const quickActionDefinitions = [
  { label: "inviteAuthors", icon: UserPlus, path: "/authors" },
  { label: "viewArticles", icon: FileText, path: "/review" },
  { label: "review", icon: FileCheck2, path: "/review" },
  { label: "exportPdf", icon: FileOutput, path: "/export" },
] as const;

const copy = {
  en: {
    descriptionEmpty: "No description yet.",
    createdAt: "Created",
    owner: "Owner",
    stats: {
      authors: "Authors",
      submitted: "Submitted",
      pending: "Pending Review",
      approved: "Approved",
    },
    submissionProgress: "Submission progress",
    submissionProgressDescription: "Submitted articles compared with all authors",
    progressCount: (submitted: number, authors: number) =>
      `${submitted} submitted / ${authors} authors`,
    remaining: (count: number) => `${count} remaining`,
    progressLabel: (submitted: number, authors: number) =>
      `Submission progress: ${submitted} submitted out of ${authors} authors`,
    noAuthors: "No authors yet",
    noArticles: "No articles yet",
    nextStep: "Next Step",
    next: {
      template: {
        title: "Configure the publishing template",
        description: "Set the book format before collecting submissions.",
        action: "Configure Template",
      },
      authors: {
        title: "Invite authors",
        description: "Add the first contributors to this book.",
        action: "Invite Authors",
      },
      submissions: {
        title: "Wait for author submissions",
        description: "Authors can submit after they join the book.",
        action: "View Authors",
      },
      review: {
        title: "Review pending submissions",
        description: (count: number) => `${count} submission${count === 1 ? "" : "s"} waiting for review.`,
        action: "Start Review",
      },
      complete: {
        title: "All submissions are reviewed",
        description: "There are no pending submissions right now.",
        action: "View Submissions",
      },
    },
    recentActivity: "Recent activity",
    noActivity: "No activity yet",
    noActivityDescription:
      "Recent activity will appear here when authors start submitting.",
    quickActions: "Quick actions",
    quickActionsDescription: "Common tasks for this book",
    actions: {
      inviteAuthors: "Invite Authors",
      viewArticles: "View Articles",
      review: "Review",
      exportPdf: "Export PDF",
    },
    errorTitle: "Unable to load the dashboard",
    errorDescription:
      "Unable to connect to the backend. Please check that FastAPI is running.",
    missingBookTitle: "No book selected",
    missingBookDescription: "Open the dashboard from a created book.",
    reload: "Reload",
    loading: "Loading dashboard data",
  },
  zh: {
    descriptionEmpty: "暂无简介。",
    createdAt: "创建时间",
    owner: "负责人",
    stats: {
      authors: "作者人数",
      submitted: "已投稿",
      pending: "待审核",
      approved: "已通过",
    },
    submissionProgress: "投稿进度",
    submissionProgressDescription: "已投稿文章数与作者总人数的对比",
    progressCount: (submitted: number, authors: number) =>
      `已投稿 ${submitted} / 作者 ${authors}`,
    remaining: (count: number) => `剩余 ${count} 位`,
    progressLabel: (submitted: number, authors: number) =>
      `投稿进度：${authors} 位作者中已有 ${submitted} 篇投稿`,
    noAuthors: "暂无作者",
    noArticles: "暂无文章",
    nextStep: "下一步",
    next: {
      template: {
        title: "配置出版模板",
        description: "请先设置书籍格式，再开始收集投稿。",
        action: "配置模板",
      },
      authors: {
        title: "邀请作者",
        description: "为这本书添加第一批投稿者。",
        action: "邀请作者",
      },
      submissions: {
        title: "等待作者投稿",
        description: "作者加入书籍后即可开始投稿。",
        action: "查看作者",
      },
      review: {
        title: "审核待处理投稿",
        description: (count: number) => `有 ${count} 篇投稿等待审核。`,
        action: "开始审核",
      },
      complete: {
        title: "所有投稿均已审核",
        description: "当前没有待审核的投稿。",
        action: "查看投稿",
      },
    },
    recentActivity: "最近动态",
    noActivity: "暂无动态",
    noActivityDescription: "当作者开始投稿后，将在这里显示最近活动。",
    quickActions: "快捷操作",
    quickActionsDescription: "这本书的常用操作",
    actions: {
      inviteAuthors: "邀请作者",
      viewArticles: "查看文章",
      review: "审核投稿",
      exportPdf: "导出 PDF",
    },
    errorTitle: "无法加载仪表盘",
    errorDescription: "无法连接后端，请检查 FastAPI 是否正在运行。",
    missingBookTitle: "未选择书籍",
    missingBookDescription: "请从已创建的书籍进入仪表盘。",
    reload: "重新加载",
    loading: "正在加载仪表盘数据",
  },
} as const;

const iconTones = {
  blue: "bg-blue-500/10 text-blue-400 ring-blue-500/15",
  violet: "bg-violet-500/10 text-violet-400 ring-violet-500/15",
  amber: "bg-amber-500/10 text-amber-400 ring-amber-500/15",
  emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/15",
};

interface DashboardOverviewPageProps {
  basePath: string;
  bookId?: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

function DashboardSkeleton({ language }: { language: Language }) {
  return (
    <div aria-label={copy[language].loading} className="animate-pulse" role="status">
      <div className="border-b border-border pb-8">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="mt-4 h-4 w-full max-w-xl rounded bg-muted/70" />
        <div className="mt-2 h-4 w-80 rounded bg-muted/70" />
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statDefinitions.map(({ label }) => (
          <div className="h-24 rounded-xl border border-border bg-muted/30" key={label} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)]">
        <div className="h-80 rounded-xl border border-border bg-muted/30" />
        <div className="h-64 rounded-xl border border-border bg-muted/30" />
      </div>
    </div>
  );
}

export function DashboardOverviewPage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: DashboardOverviewPageProps) {
  const pageCopy = copy[language];
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(bookId));
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!bookId) {
      setData(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let active = true;
    setData(null);
    setIsLoading(true);
    setHasError(false);

    Promise.all([
      bookRepository.get(bookId),
      authorRepository.listByBook(bookId),
      articleRepository.listByBook(bookId),
      templateRepository.getByBook(bookId),
    ])
      .then(([book, authors, articles, template]) => {
        if (active) setData({ book, authors, articles, template });
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

  const book = data?.book;

  if (isLoading) {
    return (
      <DashboardLayout
        activeSection="Overview"
        basePath={basePath}
        language={language}
        onNavigate={onNavigate}
        onToggleLanguage={onToggleLanguage}
      >
        <DashboardSkeleton language={language} />
      </DashboardLayout>
    );
  }

  if (!bookId || hasError || !data || !book) {
    const missingBook = !bookId;
    return (
      <DashboardLayout
        activeSection="Overview"
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
              {missingBook ? pageCopy.missingBookTitle : pageCopy.errorTitle}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {missingBook
                ? pageCopy.missingBookDescription
                : pageCopy.errorDescription}
            </p>
            {!missingBook ? (
              <Button
                className="mt-6 h-9 rounded-lg bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
                onClick={() => setReloadKey((value) => value + 1)}
                type="button"
              >
                <RefreshCw className="mr-2 size-3.5" />
                {pageCopy.reload}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const { articles, authors, template } = data;
  const submitted = articles.length;
  const pending = articles.filter(
    (article) => article.review_status === "pending",
  ).length;
  const approved = articles.filter(
    (article) => article.review_status === "approved",
  ).length;
  const progress = authors.length
    ? Math.min(100, Math.round((submitted / authors.length) * 100))
    : 0;
  const remaining = Math.max(authors.length - submitted, 0);
  const statValues = {
    authors: authors.length,
    submitted,
    pending,
    approved,
  };
  const createdAt = new Intl.DateTimeFormat(
    language === "zh" ? "zh-CN" : "en",
    { dateStyle: "medium" },
  ).format(new Date(book.created_at));

  const nextStep = !template
    ? { ...pageCopy.next.template, icon: Settings2, path: "/template" }
    : authors.length === 0
      ? { ...pageCopy.next.authors, icon: UserPlus, path: "/authors" }
      : submitted === 0
        ? { ...pageCopy.next.submissions, icon: Clock3, path: "/authors" }
        : pending > 0
          ? {
              ...pageCopy.next.review,
              description: pageCopy.next.review.description(pending),
              icon: FileCheck2,
              path: "/review",
            }
          : { ...pageCopy.next.complete, icon: CheckCircle2, path: "/review" };
  const NextStepIcon = nextStep.icon;

  return (
    <DashboardLayout
      activeSection="Overview"
      basePath={basePath}
      bookTitle={book.title}
      language={language}
      onNavigate={onNavigate}
      onToggleLanguage={onToggleLanguage}
      ownerName={book.owner_name}
    >
      <section className="flex flex-col gap-5 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
            {book.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {book.description || pageCopy.descriptionEmpty}
          </p>
        </div>
        <dl className="grid shrink-0 gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <dt>{pageCopy.createdAt}</dt>
            <dd className="text-foreground">{createdAt}</dd>
          </div>
          <div className="flex items-center gap-2">
            <UserRound className="size-3.5 text-muted-foreground" />
            <dt>{pageCopy.owner}</dt>
            <dd className="text-foreground">{book.owner_name}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statDefinitions.map(({ icon: Icon, label, tone }) => (
          <Card className="border-border bg-card shadow-none" key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {pageCopy.stats[label]}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {statValues[label]}
                </p>
              </div>
              <span className={cn("flex size-10 items-center justify-center rounded-lg ring-1 ring-inset", iconTones[tone])}>
                <Icon className="size-[18px]" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)]">
        <div className="grid content-start gap-4">
          <Card className="border-border bg-card shadow-none">
            <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-4">
              <div>
                <CardTitle className="text-foreground">{pageCopy.submissionProgress}</CardTitle>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {pageCopy.submissionProgressDescription}
                </p>
              </div>
              <span className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                {progress}%
              </span>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <div className="mb-3 flex items-center justify-between gap-4 text-xs">
                <span className="font-medium text-foreground">
                  {pageCopy.progressCount(submitted, authors.length)}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {pageCopy.remaining(remaining)}
                </span>
              </div>
              <Progress
                aria-label={pageCopy.progressLabel(submitted, authors.length)}
                className="h-2 bg-muted [&>div]:bg-blue-500"
                value={progress}
              />
              {authors.length === 0 || articles.length === 0 ? (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  {authors.length === 0 ? (
                    <span className="rounded-md bg-muted/60 px-2.5 py-1.5">{pageCopy.noAuthors}</span>
                  ) : null}
                  {articles.length === 0 ? (
                    <span className="rounded-md bg-muted/60 px-2.5 py-1.5">{pageCopy.noArticles}</span>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-amber-500/20 bg-card shadow-none">
            <div className="h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
            <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20">
                  <NextStepIcon className="size-[18px]" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-400/80">{pageCopy.nextStep}</p>
                  <h2 className="mt-2 text-sm font-semibold text-foreground">{nextStep.title}</h2>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{nextStep.description}</p>
                </div>
              </div>
              <Button
                className="h-9 shrink-0 rounded-lg bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
                onClick={() => onNavigate(`${basePath}${nextStep.path}`)}
                type="button"
              >
                {nextStep.action}
                <ArrowRight className="ml-2 size-3.5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-none">
            <CardHeader className="p-5 pb-4">
              <CardTitle className="text-foreground">{pageCopy.recentActivity}</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-44 flex-col items-center justify-center border-t border-border px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <Activity className="size-4" />
              </span>
              <p className="mt-4 text-sm font-medium text-foreground">{pageCopy.noActivity}</p>
              <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">{pageCopy.noActivityDescription}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-border bg-card shadow-none">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-foreground">{pageCopy.quickActions}</CardTitle>
            <p className="text-xs leading-5 text-muted-foreground">{pageCopy.quickActionsDescription}</p>
          </CardHeader>
          <CardContent className="grid gap-2 p-5 pt-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickActionDefinitions.map(({ icon: Icon, label, path }) => (
              <button
                className="group flex h-12 items-center gap-3 rounded-lg border border-border bg-background px-3.5 text-left text-sm font-medium text-foreground transition-colors hover:border-blue-500/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                key={label}
                onClick={() => onNavigate(`${basePath}${path}`)}
                type="button"
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-blue-500">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex-1">{pageCopy.actions[label]}</span>
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  );
}
