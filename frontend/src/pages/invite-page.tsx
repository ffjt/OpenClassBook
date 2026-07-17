import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Link2,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Language } from "@/lib/i18n";
import { ApiError } from "@/repositories/apiClient";
import { bookRepository, type Book } from "@/repositories/bookRepository";

interface InvitePageProps {
  basePath: string;
  bookId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    title: "Invite Authors",
    description: "Share the code or link with authors you want to invite.",
    back: "Back to Authors",
    book: "Book",
    owner: "Owner",
    inviteCode: "Invitation code",
    joinLink: "Join link",
    copyCode: "Copy code",
    copyLink: "Copy link",
    copiedCode: "Invitation code copied.",
    copiedLink: "Join link copied.",
    missingTitle: "Unable to find this book.",
    missingDescription: "The book may have been removed or the link is incorrect.",
    errorTitle: "Unable to connect to the server.",
    errorDescription: "Please confirm FastAPI is running.",
    retry: "Retry",
    loading: "Loading invitation",
  },
  zh: {
    title: "邀请作者",
    description: "将邀请码或加入链接分享给需要邀请的作者。",
    back: "返回作者管理",
    book: "书名",
    owner: "负责人",
    inviteCode: "邀请码",
    joinLink: "加入链接",
    copyCode: "复制邀请码",
    copyLink: "复制加入链接",
    copiedCode: "邀请码已复制。",
    copiedLink: "加入链接已复制。",
    missingTitle: "无法找到该书籍。",
    missingDescription: "该书籍可能已被删除，或当前链接不正确。",
    errorTitle: "无法连接服务器。",
    errorDescription: "请确认 FastAPI 正在运行。",
    retry: "重试",
    loading: "正在加载邀请信息",
  },
} as const;

function InviteSkeleton({ language }: { language: Language }) {
  return (
    <div aria-label={copy[language].loading} className="animate-pulse" role="status">
      <div className="border-b border-border pb-8">
        <div className="h-8 w-52 rounded bg-muted" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-muted/70" />
      </div>
      <div className="mx-auto mt-8 h-[420px] max-w-3xl rounded-xl border border-border bg-muted/30" />
    </div>
  );
}

export function InvitePage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: InvitePageProps) {
  const pageCopy = copy[language];
  const [invite, setInvite] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"missing" | "server" | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);

    bookRepository
      .get(bookId)
      .then((data) => {
        if (active) setInvite(data);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setInvite(null);
        setError(requestError instanceof ApiError && requestError.status === 404 ? "missing" : "server");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [bookId, reloadKey]);

  const joinLink = useMemo(
    () => invite ? `${window.location.origin}/join/${invite.invite_code}` : "",
    [invite],
  );

  const copyValue = async (kind: "code" | "link", value: string) => {
    let didCopy = false;
    try {
      await navigator.clipboard.writeText(value);
      didCopy = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      didCopy = document.execCommand("copy");
      textarea.remove();
    }

    if (didCopy) {
      setCopied(kind);
    } else {
      setCopied(null);
    }
  };

  const layoutProps = {
    activeSection: "Authors" as const,
    basePath,
    language,
    onNavigate,
    onToggleLanguage,
  };

  if (isLoading) {
    return (
      <DashboardLayout {...layoutProps}>
        <InviteSkeleton language={language} />
      </DashboardLayout>
    );
  }

  if (error || !invite) {
    const isMissing = error === "missing";
    return (
      <DashboardLayout {...layoutProps}>
        <Card className="mx-auto mt-20 max-w-lg border-border bg-card shadow-none">
          <CardContent className="flex flex-col items-center px-7 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 ring-1 ring-inset ring-rose-500/20">
              <AlertCircle className="size-5" />
            </span>
            <h1 className="mt-5 text-lg font-semibold text-foreground">
              {isMissing ? pageCopy.missingTitle : pageCopy.errorTitle}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {isMissing ? pageCopy.missingDescription : pageCopy.errorDescription}
            </p>
            {!isMissing ? (
              <Button className="mt-6" onClick={() => setReloadKey((value) => value + 1)} type="button">
                <RefreshCw className="mr-2 size-4" />
                {pageCopy.retry}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...layoutProps} bookTitle={invite.title} ownerName={invite.owner_name}>
      <section className="border-b border-border pb-8">
        <button
          className="mb-5 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => onNavigate(`${basePath}/authors`)}
          type="button"
        >
          <ArrowLeft className="size-3.5" />
          {pageCopy.back}
        </button>
        <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
          {pageCopy.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{pageCopy.description}</p>
      </section>

      <Card className="mx-auto mt-8 max-w-3xl border-border bg-card shadow-none">
        <CardContent className="p-6 sm:p-8">
          <dl className="grid gap-4 border-b border-border pb-7 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">{pageCopy.book}</dt>
              <dd className="mt-2 text-lg font-semibold text-foreground">{invite.title}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <UserRound className="size-3.5" />
                {pageCopy.owner}
              </dt>
              <dd className="mt-2 text-lg font-semibold text-foreground">{invite.owner_name}</dd>
            </div>
          </dl>

          <div className="mt-7 space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground">{pageCopy.inviteCode}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input className="font-mono tracking-[0.12em]" readOnly value={invite.invite_code} />
                <Button onClick={() => void copyValue("code", invite.invite_code)} type="button" variant="outline">
                  {copied === "code" ? <Check className="mr-2 size-4 text-emerald-400" /> : <Copy className="mr-2 size-4" />}
                  {pageCopy.copyCode}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">{pageCopy.joinLink}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" readOnly value={joinLink} />
                </div>
                <Button onClick={() => void copyValue("link", joinLink)} type="button" variant="outline">
                  {copied === "link" ? <Check className="mr-2 size-4 text-emerald-400" /> : <Copy className="mr-2 size-4" />}
                  {pageCopy.copyLink}
                </Button>
              </div>
            </div>
          </div>

          <p aria-live="polite" className="mt-6 min-h-5 text-sm text-emerald-400">
            {copied === "code" ? pageCopy.copiedCode : copied === "link" ? pageCopy.copiedLink : ""}
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
