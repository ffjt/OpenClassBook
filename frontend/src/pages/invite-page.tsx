import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  Copy,
  Link2,
  Plus,
  RefreshCw,
  RotateCw,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Language } from "@/lib/i18n";
import { ApiError } from "@/repositories/apiClient";
import {
  bookRepository,
  type Book,
  type Invitation,
  type InvitationSettingsInput,
} from "@/repositories/bookRepository";

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
    description: "Create secure, time-limited invitations and track every successful join.",
    back: "Back to Authors",
    book: "Book",
    owner: "Owner",
    newInvite: "New invitation",
    code: "Invitation code",
    link: "Join link",
    copyCode: "Copy code",
    copyLink: "Copy link",
    copiedCode: "Invitation code copied.",
    copiedLink: "Join link copied.",
    expiration: "Expires at",
    noExpiration: "No expiration",
    maxUses: "Maximum uses",
    unlimited: "Unlimited",
    usage: "Usage",
    status: "Status",
    active: "Active",
    disabled: "Disabled",
    expired: "Expired",
    exhausted: "Limit reached",
    save: "Save limits",
    saving: "Saving...",
    create: "Create invitation",
    creating: "Creating...",
    regenerate: "Regenerate",
    regenerating: "Regenerating...",
    disable: "Disable",
    disabling: "Disabling...",
    createHint: "Leave a field blank for an invitation with no limit.",
    actionError: "Invitation changes could not be saved. Please try again.",
    missingTitle: "Unable to find this book.",
    missingDescription: "The book may have been removed or the link is incorrect.",
    errorTitle: "Unable to connect to the server.",
    errorDescription: "Please confirm FastAPI is running.",
    retry: "Retry",
    loading: "Loading invitations",
  },
  zh: {
    title: "邀请作者",
    description: "创建安全、可限时的邀请，并跟踪每一次成功加入。",
    back: "返回作者管理",
    book: "书名",
    owner: "负责人",
    newInvite: "新建邀请",
    code: "邀请码",
    link: "加入链接",
    copyCode: "复制邀请码",
    copyLink: "复制链接",
    copiedCode: "邀请码已复制。",
    copiedLink: "加入链接已复制。",
    expiration: "过期时间",
    noExpiration: "永不过期",
    maxUses: "最大使用次数",
    unlimited: "不限次数",
    usage: "已使用",
    status: "状态",
    active: "有效",
    disabled: "已停用",
    expired: "已过期",
    exhausted: "次数已用尽",
    save: "保存限制",
    saving: "正在保存...",
    create: "创建邀请",
    creating: "正在创建...",
    regenerate: "重新生成",
    regenerating: "正在生成...",
    disable: "停用",
    disabling: "正在停用...",
    createHint: "留空即表示该项不限制。",
    actionError: "邀请设置未能保存，请重试。",
    missingTitle: "无法找到该书籍。",
    missingDescription: "书籍可能已被删除，或当前链接不正确。",
    errorTitle: "无法连接服务器。",
    errorDescription: "请确认 FastAPI 正在运行。",
    retry: "重试",
    loading: "正在加载邀请",
  },
} as const;

function toDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getSettings(form: HTMLFormElement): InvitationSettingsInput {
  const data = new FormData(form);
  const expiration = String(data.get("expires_at") ?? "").trim();
  const maxUses = String(data.get("max_uses") ?? "").trim();
  return {
    expires_at: expiration ? new Date(expiration).toISOString() : null,
    max_uses: maxUses ? Number(maxUses) : null,
  };
}

function InvitationSkeleton({ language }: { language: Language }) {
  return (
    <div aria-label={copy[language].loading} className="animate-pulse" role="status">
      <div className="border-b border-border pb-8">
        <div className="h-8 w-52 rounded bg-muted" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-muted/70" />
      </div>
      <div className="mx-auto mt-8 h-[460px] max-w-4xl rounded-xl border border-border bg-muted/30" />
    </div>
  );
}

function invitationState(invitation: Invitation, language: Language) {
  const text = copy[language];
  if (invitation.status === "disabled") return text.disabled;
  if (invitation.expires_at && Date.parse(invitation.expires_at) <= Date.now()) return text.expired;
  if (invitation.max_uses !== null && invitation.used_count >= invitation.max_uses) return text.exhausted;
  return text.active;
}

export function InvitePage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: InvitePageProps) {
  const pageCopy = copy[language];
  const [book, setBook] = useState<Book | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"missing" | "server" | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [actionError, setActionError] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    Promise.all([bookRepository.get(bookId), bookRepository.listInvitations(bookId)])
      .then(([loadedBook, loadedInvitations]) => {
        if (!active) return;
        setBook(loadedBook);
        setInvitations(loadedInvitations);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setBook(null);
        setInvitations([]);
        setError(requestError instanceof ApiError && requestError.status === 404 ? "missing" : "server");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [bookId, reloadKey]);

  const runAction = async (key: string, action: () => Promise<unknown>) => {
    if (busyAction) return;
    setBusyAction(key);
    setActionError(false);
    try {
      await action();
      setReloadKey((current) => current + 1);
    } catch {
      setActionError(true);
    } finally {
      setBusyAction(null);
    }
  };

  const copyValue = async (kind: "code" | "link", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      setCopied(document.execCommand("copy") ? kind : null);
      textarea.remove();
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
    return <DashboardLayout {...layoutProps}><InvitationSkeleton language={language} /></DashboardLayout>;
  }

  if (error || !book) {
    const isMissing = error === "missing";
    return (
      <DashboardLayout {...layoutProps}>
        <Card className="mx-auto mt-20 max-w-lg border-border bg-card shadow-none">
          <CardContent className="flex flex-col items-center px-7 py-12 text-center">
            <AlertCircle className="size-6 text-rose-400" />
            <h1 className="mt-5 text-lg font-semibold text-foreground">{isMissing ? pageCopy.missingTitle : pageCopy.errorTitle}</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{isMissing ? pageCopy.missingDescription : pageCopy.errorDescription}</p>
            {!isMissing ? <Button className="mt-6" onClick={() => setReloadKey((value) => value + 1)} type="button"><RefreshCw className="mr-2 size-4" />{pageCopy.retry}</Button> : null}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout {...layoutProps} bookTitle={book.title} ownerName={book.owner_name}>
      <section className="border-b border-border pb-8">
        <button className="mb-5 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground" onClick={() => onNavigate(`${basePath}/authors`)} type="button"><ArrowLeft className="size-3.5" />{pageCopy.back}</button>
        <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">{pageCopy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{pageCopy.description}</p>
      </section>

      <Card className="mx-auto mt-8 max-w-4xl border-border bg-card shadow-none">
        <CardContent className="p-6 sm:p-8">
          <dl className="grid gap-4 border-b border-border pb-7 sm:grid-cols-2">
            <div><dt className="text-xs font-medium text-muted-foreground">{pageCopy.book}</dt><dd className="mt-2 text-lg font-semibold text-foreground">{book.title}</dd></div>
            <div><dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><UserRound className="size-3.5" />{pageCopy.owner}</dt><dd className="mt-2 text-lg font-semibold text-foreground">{book.owner_name}</dd></div>
          </dl>

          <form className="mt-7 rounded-xl border border-dashed border-border bg-muted/20 p-4" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void runAction("create", () => bookRepository.createInvitation(book.id, getSettings(event.currentTarget))); }}>
            <div className="flex items-center gap-2 text-sm font-medium"><Plus className="size-4" />{pageCopy.newInvite}</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="new-invite-expiry">{pageCopy.expiration}</Label><Input id="new-invite-expiry" name="expires_at" type="datetime-local" /></div>
              <div><Label htmlFor="new-invite-max">{pageCopy.maxUses}</Label><Input id="new-invite-max" min="1" name="max_uses" placeholder={pageCopy.unlimited} type="number" /></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{pageCopy.createHint}</p><Button disabled={busyAction !== null} type="submit">{busyAction === "create" ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}{busyAction === "create" ? pageCopy.creating : pageCopy.create}</Button></div>
          </form>

          {actionError ? <p className="mt-4 text-sm text-rose-500" role="alert">{pageCopy.actionError}</p> : null}
          <div className="mt-7 space-y-5">
            {invitations.map((invitation) => {
              const joinLink = `${window.location.origin}/join/${invitation.code}`;
              const state = invitationState(invitation, language);
              const active = state === pageCopy.active;
              return (
                <article className="rounded-xl border border-border p-5" key={invitation.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium text-foreground">{pageCopy.code}</p><p className="mt-1 text-xs text-muted-foreground">{pageCopy.status}: <span className={active ? "text-emerald-500" : "text-muted-foreground"}>{state}</span></p></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><UsersRound className="size-4" />{pageCopy.usage}: {invitation.used_count}{invitation.max_uses === null ? ` / ${pageCopy.unlimited}` : ` / ${invitation.max_uses}`}</div></div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="flex gap-2"><Input className="font-mono tracking-[0.08em]" readOnly value={invitation.code} /><Button onClick={() => void copyValue("code", invitation.code)} type="button" variant="outline">{copied === "code" ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}</Button></div>
                    <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" readOnly value={joinLink} /></div><Button onClick={() => void copyValue("link", joinLink)} type="button" variant="outline">{copied === "link" ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}</Button></div>
                  </div>
                  <form className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void runAction(`save-${invitation.id}`, () => bookRepository.updateInvitation(book.id, invitation.id, getSettings(event.currentTarget))); }}>
                    <div><Label htmlFor={`expiry-${invitation.id}`}>{pageCopy.expiration}</Label><Input defaultValue={toDateTimeInput(invitation.expires_at)} id={`expiry-${invitation.id}`} name="expires_at" type="datetime-local" /></div>
                    <div><Label htmlFor={`uses-${invitation.id}`}>{pageCopy.maxUses}</Label><Input defaultValue={invitation.max_uses ?? ""} id={`uses-${invitation.id}`} min="1" name="max_uses" placeholder={pageCopy.unlimited} type="number" /></div>
                    <div className="flex items-end"><Button className="w-full" disabled={busyAction !== null} type="submit" variant="outline">{busyAction === `save-${invitation.id}` ? pageCopy.saving : pageCopy.save}</Button></div>
                  </form>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button disabled={busyAction !== null} onClick={() => void runAction(`regenerate-${invitation.id}`, () => bookRepository.regenerateInvitation(book.id, invitation.id))} type="button" variant="outline"><RotateCw className="mr-2 size-4" />{busyAction === `regenerate-${invitation.id}` ? pageCopy.regenerating : pageCopy.regenerate}</Button>
                    {invitation.status === "active" ? <Button className="text-rose-500" disabled={busyAction !== null} onClick={() => void runAction(`disable-${invitation.id}`, () => bookRepository.disableInvitation(book.id, invitation.id))} type="button" variant="outline"><Ban className="mr-2 size-4" />{busyAction === `disable-${invitation.id}` ? pageCopy.disabling : pageCopy.disable}</Button> : null}
                  </div>
                </article>
              );
            })}
          </div>
          <p aria-live="polite" className="mt-5 min-h-5 text-sm text-emerald-500">{copied === "code" ? pageCopy.copiedCode : copied === "link" ? pageCopy.copiedLink : ""}</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
