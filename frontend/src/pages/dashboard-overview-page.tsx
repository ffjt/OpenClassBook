import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileOutput,
  FileText,
  Settings2,
  UserPlus,
  Users,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/i18n";

const statDefinitions = [
  { label: "authors", value: "42", icon: Users, tone: "blue" },
  { label: "submitted", value: "38", icon: FileText, tone: "violet" },
  { label: "pending", value: "7", icon: Clock3, tone: "amber" },
  { label: "approved", value: "31", icon: CheckCircle2, tone: "emerald" },
] as const;

const quickActionDefinitions = [
  { label: "inviteAuthors", icon: UserPlus },
  { label: "viewArticles", icon: FileText },
  { label: "review", icon: FileCheck2 },
  { label: "exportPdf", icon: FileOutput },
] as const;

const dashboardCopy = {
  en: {
    defaultBookTitle: "Our Class Stories 2026",
    status: "Collecting submissions",
    description:
      "A collection of stories, essays, and reflections written by our class throughout the 2025–2026 school year.",
    lastUpdated: "Last updated today",
    stats: {
      authors: "Authors",
      submitted: "Submitted",
      pending: "Pending Review",
      approved: "Approved",
    },
    submissionProgress: "Submission progress",
    overallTarget: "Overall collection target",
    articleCount: "38 / 60 Articles",
    remaining: "22 remaining",
    progressLabel: "Submission progress: 38 of 60 articles",
    nextStep: "Next Step",
    templateMissing: "Book Template has not been configured.",
    templateDescription:
      "Configure your publishing template before inviting authors.",
    configureTemplate: "Configure Template",
    recentActivity: "Recent activity",
    quickActions: "Quick actions",
    quickActionsDescription: "Common tasks for this book",
    actions: {
      inviteAuthors: "Invite Authors",
      viewArticles: "View Articles",
      review: "Review",
      exportPdf: "Export PDF",
    },
    activity: [
      { initials: "ZS", name: "Zhang San", action: "submitted an article", time: "12 minutes ago", accent: "bg-blue-500/10 text-blue-400" },
      { initials: "LS", name: "Li Si", action: "joined the book", time: "1 hour ago", accent: "bg-violet-500/10 text-violet-400" },
      { initials: "WW", name: "Wang Wu", action: "updated an article", time: "Yesterday", accent: "bg-emerald-500/10 text-emerald-400" },
    ],
  },
  zh: {
    defaultBookTitle: "我们的班级故事 2026",
    status: "正在收集投稿",
    description: "收录班级同学在 2025–2026 学年创作的故事、随笔与成长感悟。",
    lastUpdated: "今天更新",
    stats: {
      authors: "作者人数",
      submitted: "已投稿",
      pending: "待审核",
      approved: "已通过",
    },
    submissionProgress: "投稿进度",
    overallTarget: "总体收集目标",
    articleCount: "38 / 60 篇文章",
    remaining: "还差 22 篇",
    progressLabel: "投稿进度：已完成 38 篇，共 60 篇",
    nextStep: "下一步",
    templateMissing: "出版模板尚未配置",
    templateDescription: "请在邀请作者前配置好书籍的出版模板。",
    configureTemplate: "配置模板",
    recentActivity: "最近动态",
    quickActions: "快捷操作",
    quickActionsDescription: "这本书的常用操作",
    actions: {
      inviteAuthors: "邀请作者",
      viewArticles: "查看文章",
      review: "审核投稿",
      exportPdf: "导出 PDF",
    },
    activity: [
      { initials: "张", name: "张三", action: "提交了一篇文章", time: "12 分钟前", accent: "bg-blue-500/10 text-blue-400" },
      { initials: "李", name: "李四", action: "加入了这本书", time: "1 小时前", accent: "bg-violet-500/10 text-violet-400" },
      { initials: "王", name: "王五", action: "更新了一篇文章", time: "昨天", accent: "bg-emerald-500/10 text-emerald-400" },
    ],
  },
};

const iconTones = {
  blue: "bg-blue-500/10 text-blue-400 ring-blue-500/15",
  violet: "bg-violet-500/10 text-violet-400 ring-violet-500/15",
  amber: "bg-amber-500/10 text-amber-400 ring-amber-500/15",
  emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/15",
};

interface DashboardOverviewPageProps {
  basePath?: string;
  bookTitle?: string;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

export function DashboardOverviewPage({
  basePath = "/dashboard",
  bookTitle,
  language,
  onNavigate,
  onToggleLanguage,
}: DashboardOverviewPageProps) {
  const copy = dashboardCopy[language];

  return (
    <DashboardLayout
      activeSection="Overview"
      basePath={basePath}
      language={language}
      onNavigate={onNavigate}
      onToggleLanguage={onToggleLanguage}
    >
      <section className="flex flex-col gap-4 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-zinc-50 sm:text-3xl">
              {bookTitle ?? copy.defaultBookTitle}
            </h1>
            <Badge className="border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-400">
              <span className="mr-2 size-1.5 rounded-full bg-emerald-400" />
              {copy.status}
            </Badge>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            {copy.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-600">
          <BookOpen className="size-3.5" />
          {copy.lastUpdated}
        </div>
      </section>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statDefinitions.map(({ icon: Icon, label, tone, value }) => (
          <Card
            className="border-white/[0.07] bg-[#131519] shadow-none"
            key={label}
          >
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium text-zinc-500">
                  {copy.stats[label]}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-zinc-100">
                  {value}
                </p>
              </div>
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg ring-1 ring-inset",
                  iconTones[tone],
                )}
              >
                <Icon className="size-[18px]" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)]">
        <div className="grid content-start gap-4">
          <Card className="border-white/[0.07] bg-[#131519] shadow-none">
            <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-4">
              <div>
                <CardTitle className="text-zinc-100">
                  {copy.submissionProgress}
                </CardTitle>
                <p className="mt-1.5 text-xs text-zinc-500">
                  {copy.overallTarget}
                </p>
              </div>
              <span className="text-2xl font-semibold tracking-[-0.03em] text-zinc-100">
                63%
              </span>
            </CardHeader>
            <CardContent className="p-5 pt-1">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-300">
                  {copy.articleCount}
                </span>
                <span className="text-zinc-600">{copy.remaining}</span>
              </div>
              <Progress
                aria-label={copy.progressLabel}
                className="h-2 bg-white/[0.06] [&>div]:bg-blue-500"
                value={63}
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-amber-500/15 bg-[#131519] shadow-none">
            <div className="h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
            <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-inset ring-amber-500/20">
                  <Settings2 className="size-[18px]" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-400/80">
                    {copy.nextStep}
                  </p>
                  <h2 className="mt-2 text-sm font-semibold text-zinc-100">
                    {copy.templateMissing}
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                    {copy.templateDescription}
                  </p>
                </div>
              </div>
              <Button
                className="h-9 shrink-0 rounded-lg bg-zinc-100 px-4 text-xs text-zinc-950 hover:bg-white"
                onClick={() => onNavigate(`${basePath}/template`)}
                type="button"
              >
                {copy.configureTemplate}
                <ArrowRight className="ml-2 size-3.5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/[0.07] bg-[#131519] shadow-none">
            <CardHeader className="p-5 pb-4">
              <CardTitle className="text-zinc-100">
                {copy.recentActivity}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/[0.06]">
                {copy.activity.map(
                  ({ accent, action, initials, name, time }) => (
                    <div
                      className="flex items-center gap-3 px-5 py-4"
                      key={`${name}-${action}`}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                          accent,
                        )}
                      >
                        {initials}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm text-zinc-500">
                        <span className="font-medium text-zinc-200">{name}</span>{" "}
                        {action}
                      </p>
                      <time className="hidden shrink-0 text-xs text-zinc-600 sm:block">
                        {time}
                      </time>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit border-white/[0.07] bg-[#131519] shadow-none">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-zinc-100">
              {copy.quickActions}
            </CardTitle>
            <p className="text-xs leading-5 text-zinc-500">
              {copy.quickActionsDescription}
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 p-5 pt-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickActionDefinitions.map(({ icon: Icon, label }) => (
              <button
                className="group flex h-12 items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3.5 text-left text-sm font-medium text-zinc-300 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                key={label}
                type="button"
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.05] text-zinc-500 transition-colors group-hover:text-blue-400">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex-1">{copy.actions[label]}</span>
                <ArrowRight className="size-3.5 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
              </button>
            ))}
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  );
}
