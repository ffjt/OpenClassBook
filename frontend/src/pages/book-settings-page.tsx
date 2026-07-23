import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  Copy,
  Database,
  Download,
  FileText,
  Hash,
  Link2,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  NumberingSettingsFields,
} from "@/components/numbering-settings-fields";
import { SubmissionRuleFields } from "@/components/submission-rule-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Language } from "@/lib/i18n";
import {
  defaultNumberingSettings,
  numberingSettingsToPayload,
  type NumberingSettingsValue,
} from "@/lib/numbering-settings";
import {
  submissionRulesFromBook,
  submissionRulesToUpdate,
  type SubmissionRules,
} from "@/lib/submission-rules";
import { cn } from "@/lib/utils";
import {
  bookRepository,
  type Book,
  type BookUpdateInput,
} from "@/repositories/bookRepository";

type SectionId =
  | "basic"
  | "submission"
  | "numbering"
  | "invitation"
  | "data"
  | "danger";
type SaveSection = Exclude<SectionId, "data" | "danger">;
type DangerAction = "drafts" | "articles" | "authors" | "book";

interface BookSettingsPageProps {
  basePath: string;
  bookId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    title: "Book Settings",
    description: "Manage the basic configuration for this book.",
    nav: {
      basic: "Basic Information",
      submission: "Submission",
      numbering: "Numbering",
      invitation: "Invitation",
      data: "Data",
      danger: "Danger Zone",
    },
    basicDescription: "Edit the identity and description shown across this book.",
    fields: {
      title: "Book title",
      subtitle: "Subtitle (optional)",
      owner: "Owner",
      school: "School (optional)",
      publisher: "Publisher (optional)",
      description: "Description",
    },
    save: "Save changes",
    saving: "Saving...",
    saved: "Saved successfully.",
    saveError: "Unable to save. Please try again later.",
    submissionDescription: "Control how authors can join and manage submissions.",
    submissionStatus: "Submission status",
    open: "Open for submissions",
    paused: "Pause submissions",
    openDescription: "Authors can join and submit articles normally.",
    pausedDescription: "The Join page will show that submissions are paused.",
    allowEdit: "Allow editing submitted articles",
    allowMultiple: "Allow multiple articles",
    allowDelete: "Allow authors to delete their articles",
    numberingDescription: "Configure the article numbering behavior for this book.",
    numberMode: "Current numbering mode",
    modes: { none: "No article numbers", automatic: "Automatic at layout", existing: "Existing article numbers" },
    modeDescriptions: {
      none: "Articles do not display a number.",
      automatic: "The system assigns numbers in order (001, 002, 003...).",
      existing: "Authors keep and claim real-world article numbers.",
    },
    numberFormat: "Number format",
    numberClaim: "Number claiming",
    authorClaim: "Authors can claim numbers",
    managerAssign: "Administrator assigns numbers (Reserved)",
    numberNote: "Article numbers are real-world identifiers, not database IDs. They remain consistent through submission, review, layout, and PDF export.",
    numberPrefix: "Number prefix",
    numberDigits: "Number digits",
    preview: "Preview",
    invitationDescription: "Manage the active invitation for this book.",
    inviteEnabled: "Enable invitation",
    inviteEnabledDescription: "New authors can use the invitation to join this book.",
    inviteCode: "Invitation code",
    joinLink: "Join link",
    copyCode: "Copy invitation code",
    copyLink: "Copy join link",
    copied: "Copied.",
    regenerate: "Regenerate invitation code",
    regenerateTitle: "Regenerate invitation code?",
    regenerateDescription: "The current code will stop working immediately.",
    cancel: "Cancel",
    confirmRegenerate: "Regenerate code",
    dataDescription: "A live summary of content stored for this book.",
    stats: { authors: "Authors", articles: "Articles", approved: "Approved", updated: "Last updated" },
    exportBackup: "Export book backup",
    importBackup: "Import book backup",
    developing: "In development",
    dangerDescription: "These actions permanently remove data from this book.",
    dangers: {
      drafts: { title: "Delete all drafts", description: "Remove every draft article in this book." },
      articles: { title: "Delete all articles", description: "Remove drafts, submissions, and reviewed articles." },
      authors: { title: "Delete all authors", description: "Remove all authors and their articles." },
      book: { title: "Delete current book", description: "Permanently remove this book and all of its data." },
    },
    delete: "Delete",
    dangerConfirmTitle: "Confirm permanent deletion",
    dangerConfirmDescription: "This action cannot be undone.",
    typeBookTitle: "Enter the current book title to continue:",
    confirmDelete: "Delete permanently",
    loadError: "Unable to load Book Settings",
    loadErrorDescription: "Unable to connect to the backend. Please try again.",
    retry: "Retry",
    loading: "Loading Book Settings",
  },
  zh: {
    title: "书籍设置",
    description: "管理当前书籍的基础配置。",
    nav: {
      basic: "基本信息",
      submission: "投稿设置",
      numbering: "编号规则",
      invitation: "邀请设置",
      data: "数据管理",
      danger: "危险操作",
    },
    basicDescription: "编辑这本书在各页面中使用的基础信息。",
    fields: {
      title: "书名",
      subtitle: "副标题（可选）",
      owner: "负责人",
      school: "学校（可选）",
      publisher: "出版社（可选）",
      description: "简介",
    },
    save: "保存更改",
    saving: "正在保存...",
    saved: "保存成功。",
    saveError: "保存失败，请稍后重试。",
    submissionDescription: "控制作者加入和管理投稿的方式。",
    submissionStatus: "投稿状态",
    open: "开放投稿",
    paused: "暂停投稿",
    openDescription: "作者可以正常加入并提交文章。",
    pausedDescription: "Join 页面将显示当前书籍已停止接收投稿。",
    allowEdit: "允许修改已提交文章",
    allowMultiple: "允许创建多篇文章",
    allowDelete: "允许删除自己的文章",
    numberingDescription: "配置当前书籍的文章编号方式。",
    numberMode: "当前编号模式",
    modes: { none: "我不需要编号", automatic: "排版时自动生成编号", existing: "我已经有编号" },
    modeDescriptions: {
      none: "文章不显示编号。",
      automatic: "系统自动按顺序分配（001、002、003……）。",
      existing: "保留现实中已有的文章编号，由作者认领。",
    },
    numberFormat: "编号格式",
    numberClaim: "编号认领",
    authorClaim: "作者可以自行认领编号",
    managerAssign: "管理员指定编号（预留）",
    numberNote: "编号是现实中的文章编号，而不是数据库 ID。编号将在投稿、审核、排版和 PDF 导出过程中保持一致。",
    numberPrefix: "编号前缀",
    numberDigits: "编号位数",
    preview: "预览",
    invitationDescription: "管理当前书籍正在使用的邀请。",
    inviteEnabled: "开启邀请",
    inviteEnabledDescription: "新作者可以使用邀请加入当前书籍。",
    inviteCode: "邀请码",
    joinLink: "加入链接",
    copyCode: "复制邀请码",
    copyLink: "复制加入链接",
    copied: "已复制。",
    regenerate: "重新生成邀请码",
    regenerateTitle: "重新生成邀请码？",
    regenerateDescription: "当前邀请码将立即失效。",
    cancel: "取消",
    confirmRegenerate: "重新生成",
    dataDescription: "当前书籍已保存内容的实时统计。",
    stats: { authors: "作者数量", articles: "文章数量", approved: "审核通过", updated: "最后更新时间" },
    exportBackup: "导出书籍备份",
    importBackup: "导入书籍备份",
    developing: "开发中",
    dangerDescription: "以下操作会永久删除当前书籍的数据。",
    dangers: {
      drafts: { title: "删除所有草稿", description: "删除当前书籍中的全部草稿文章。" },
      articles: { title: "删除所有文章", description: "删除草稿、投稿和已审核文章。" },
      authors: { title: "删除所有作者", description: "删除全部作者及其文章。" },
      book: { title: "删除当前书籍", description: "永久删除当前书籍及其全部数据。" },
    },
    delete: "删除",
    dangerConfirmTitle: "确认永久删除",
    dangerConfirmDescription: "此操作无法撤销。",
    typeBookTitle: "请输入当前书名以继续：",
    confirmDelete: "永久删除",
    loadError: "无法加载书籍设置",
    loadErrorDescription: "无法连接后端，请稍后重试。",
    retry: "重试",
    loading: "正在加载书籍设置",
  },
} as const;

const sectionIcons = {
  basic: BookOpen,
  submission: FileText,
  numbering: Hash,
  invitation: Link2,
  data: Database,
  danger: ShieldAlert,
} as const;

function optional(value: string) {
  return value.trim() || null;
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

export function BookSettingsPage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: BookSettingsPageProps) {
  const pageCopy = copy[language];
  const [book, setBook] = useState<Book | null>(null);
  const [basic, setBasic] = useState({ title: "", subtitle: "", owner: "", school: "", publisher: "", description: "" });
  const [submissionEnabled, setSubmissionEnabled] = useState(true);
  const [submissionRules, setSubmissionRules] = useState<SubmissionRules>({
    deadlineMode: "none",
    deadlineDate: "",
    articleLimitMode: "multiple",
    maxArticles: 5,
    allowEditAfterSubmit: true,
    allowDeleteArticle: true,
  });
  const [numbering, setNumbering] = useState<NumberingSettingsValue>(
    defaultNumberingSettings,
  );
  const [inviteEnabled, setInviteEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState<SaveSection | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const [dangerBusy, setDangerBusy] = useState(false);
  const [bookTitleConfirmation, setBookTitleConfirmation] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);
    bookRepository.get(bookId).then(
      (loaded) => {
        if (!active) return;
        setBook(loaded);
        setBasic({
          title: loaded.title,
          subtitle: loaded.subtitle ?? "",
          owner: loaded.owner_name,
          school: loaded.school ?? "",
          publisher: loaded.publisher ?? "",
          description: loaded.description ?? "",
        });
        setSubmissionEnabled(loaded.submission_enabled);
        setSubmissionRules(submissionRulesFromBook(loaded));
        setNumbering({
          claimNumberEnd: loaded.claim_number_end,
          claimNumberStart: loaded.claim_number_start,
          numberDigits: loaded.number_digits,
          numberMode: loaded.number_mode,
          numberPrefix: loaded.number_prefix,
        });
        setInviteEnabled(loaded.invite_enabled);
        setIsLoading(false);
      },
      () => {
        if (!active) return;
        setHasError(true);
        setIsLoading(false);
      },
    );
    return () => { active = false; };
  }, [bookId, reloadKey]);

  const joinLink = useMemo(
    () => book ? `${window.location.origin}/join/${book.invite_code}` : "",
    [book],
  );

  const save = async (section: SaveSection, payload: BookUpdateInput) => {
    setSaving(section);
    try {
      const updated = await bookRepository.update(bookId, payload);
      setBook(updated);
      toast.success(pageCopy.saved);
    } catch {
      toast.error(pageCopy.saveError);
    } finally {
      setSaving(null);
    }
  };

  const copyValue = async (value: string) => {
    await copyToClipboard(value);
    toast.success(pageCopy.copied);
  };

  const regenerateInvite = async () => {
    setRegenerating(true);
    try {
      setBook(await bookRepository.regenerateInviteCode(bookId));
      toast.success(pageCopy.saved);
    } catch {
      toast.error(pageCopy.saveError);
    } finally {
      setRegenerating(false);
    }
  };

  const runDangerAction = async () => {
    if (!dangerAction || !book) return;
    setDangerBusy(true);
    try {
      if (dangerAction === "book") {
        await bookRepository.delete(bookId);
        onNavigate("/book");
        return;
      }
      const updated = dangerAction === "drafts"
        ? await bookRepository.deleteDrafts(bookId)
        : dangerAction === "articles"
          ? await bookRepository.deleteArticles(bookId)
          : await bookRepository.deleteAuthors(bookId);
      setBook(updated);
      toast.success(pageCopy.saved);
      setDangerAction(null);
    } catch {
      toast.error(pageCopy.saveError);
    } finally {
      setDangerBusy(false);
    }
  };

  const shellProps = {
    activeSection: "Settings" as const,
    basePath,
    language,
    onNavigate,
    onToggleLanguage,
  };

  if (isLoading) {
    return (
      <DashboardLayout {...shellProps}>
        <div aria-label={pageCopy.loading} className="animate-pulse" role="status">
          <div className="h-8 w-52 rounded bg-muted" />
          <div className="mt-3 h-4 w-80 rounded bg-muted/70" />
          <div className="mt-9 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="h-72 rounded-xl border border-border bg-muted/30" />
            <div className="h-[680px] rounded-xl border border-border bg-muted/30" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (hasError || !book) {
    return (
      <DashboardLayout {...shellProps}>
        <Card className="mx-auto mt-20 max-w-lg border-border bg-card shadow-none">
          <CardContent className="flex flex-col items-center px-7 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
              <AlertCircle className="size-5" />
            </span>
            <h1 className="mt-5 text-lg font-semibold">{pageCopy.loadError}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{pageCopy.loadErrorDescription}</p>
            <Button className="mt-6" onClick={() => setReloadKey((value) => value + 1)} variant="outline">
              <RefreshCw className="mr-2 size-4" />{pageCopy.retry}
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const lastUpdated = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(book.updated_at));

  return (
    <DashboardLayout {...shellProps} bookTitle={book.title} ownerName={book.owner_name}>
      <header className="border-b border-border pb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{pageCopy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{pageCopy.description}</p>
      </header>

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="sticky top-24 z-20 overflow-x-auto rounded-xl border border-border bg-card p-2 lg:overflow-visible" aria-label={pageCopy.title}>
          <ul className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
            {(Object.keys(pageCopy.nav) as SectionId[]).map((id) => {
              const Icon = sectionIcons[id];
              return (
                <li key={id}>
                  <a className={cn("flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", id === "danger" && "text-rose-500 hover:text-rose-600")} href={`#${id}`}>
                    <Icon className="size-4 shrink-0" />{pageCopy.nav[id]}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <Card className="scroll-mt-24 shadow-none" id="basic">
            <CardHeader>
              <CardTitle>{pageCopy.nav.basic}</CardTitle>
              <CardDescription>{pageCopy.basicDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="book-title">{pageCopy.fields.title}</Label><Input id="book-title" maxLength={255} onChange={(event) => setBasic({ ...basic, title: event.target.value })} value={basic.title} /></div>
                <div className="space-y-2"><Label htmlFor="book-subtitle">{pageCopy.fields.subtitle}</Label><Input id="book-subtitle" maxLength={255} onChange={(event) => setBasic({ ...basic, subtitle: event.target.value })} value={basic.subtitle} /></div>
                <div className="space-y-2"><Label htmlFor="book-owner">{pageCopy.fields.owner}</Label><Input id="book-owner" maxLength={120} onChange={(event) => setBasic({ ...basic, owner: event.target.value })} value={basic.owner} /></div>
                <div className="space-y-2"><Label htmlFor="book-school">{pageCopy.fields.school}</Label><Input id="book-school" maxLength={255} onChange={(event) => setBasic({ ...basic, school: event.target.value })} value={basic.school} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="book-publisher">{pageCopy.fields.publisher}</Label><Input id="book-publisher" maxLength={255} onChange={(event) => setBasic({ ...basic, publisher: event.target.value })} value={basic.publisher} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="book-description">{pageCopy.fields.description}</Label><Textarea id="book-description" maxLength={2000} onChange={(event) => setBasic({ ...basic, description: event.target.value })} value={basic.description} /></div>
              </div>
              <div className="flex justify-end border-t border-border pt-5">
                <SaveButton busy={saving === "basic"} copy={pageCopy} disabled={!basic.title.trim() || !basic.owner.trim()} onClick={() => void save("basic", { title: basic.title.trim(), subtitle: optional(basic.subtitle), owner_name: basic.owner.trim(), school: optional(basic.school), publisher: optional(basic.publisher), description: optional(basic.description) })} />
              </div>
            </CardContent>
          </Card>

          <Card className="scroll-mt-24 shadow-none" id="submission">
            <CardHeader><CardTitle>{pageCopy.nav.submission}</CardTitle><CardDescription>{pageCopy.submissionDescription}</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <fieldset><legend className="text-sm font-medium">{pageCopy.submissionStatus}</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([{ value: true, title: pageCopy.open, description: pageCopy.openDescription }, { value: false, title: pageCopy.paused, description: pageCopy.pausedDescription }] as const).map((option) => <label className={cn("flex cursor-pointer gap-3 rounded-lg border p-4", submissionEnabled === option.value ? "border-blue-500/50 bg-blue-500/[0.06]" : "border-border")} key={String(option.value)}><input checked={submissionEnabled === option.value} className="mt-1 accent-blue-600" name="submission-status" onChange={() => setSubmissionEnabled(option.value)} type="radio" /><span><span className="block text-sm font-medium">{option.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span></span></label>)}
              </div></fieldset>
              <div className="border-y border-border py-5">
                <SubmissionRuleFields language={language} onChange={setSubmissionRules} rules={submissionRules} />
              </div>
              <div className="flex justify-end"><SaveButton busy={saving === "submission"} copy={pageCopy} disabled={submissionRules.deadlineMode === "date" && !submissionRules.deadlineDate} onClick={() => void save("submission", { submission_enabled: submissionEnabled, ...submissionRulesToUpdate(submissionRules) })} /></div>
            </CardContent>
          </Card>

          <Card className="scroll-mt-24 shadow-none" id="numbering">
            <CardHeader><CardTitle>{pageCopy.nav.numbering}</CardTitle><CardDescription>{pageCopy.numberingDescription}</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <NumberingSettingsFields
                language={language}
                onChange={setNumbering}
                value={numbering}
              />
              <p className="border-t border-border pt-5 text-xs leading-5 text-muted-foreground">{pageCopy.numberNote}</p>
              <div className="flex justify-end"><SaveButton busy={saving === "numbering"} copy={pageCopy} onClick={() => void save("numbering", numberingSettingsToPayload(numbering))} /></div>
            </CardContent>
          </Card>

          <Card className="scroll-mt-24 shadow-none" id="invitation">
            <CardHeader><CardTitle>{pageCopy.nav.invitation}</CardTitle><CardDescription>{pageCopy.invitationDescription}</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div className="border-y border-border"><ToggleRow checked={inviteEnabled} description={pageCopy.inviteEnabledDescription} label={pageCopy.inviteEnabled} onChange={setInviteEnabled} /></div>
              <div className="space-y-2"><Label>{pageCopy.inviteCode}</Label><div className="flex gap-2"><Input className="font-mono" readOnly value={book.invite_code} /><Button aria-label={pageCopy.copyCode} className="size-12 shrink-0 rounded-lg p-0" onClick={() => void copyValue(book.invite_code)} title={pageCopy.copyCode} variant="outline"><Copy className="size-4" /></Button></div></div>
              <div className="space-y-2"><Label>{pageCopy.joinLink}</Label><div className="flex gap-2"><Input readOnly value={joinLink} /><Button aria-label={pageCopy.copyLink} className="size-12 shrink-0 rounded-lg p-0" onClick={() => void copyValue(joinLink)} title={pageCopy.copyLink} variant="outline"><Copy className="size-4" /></Button></div></div>
              <div className="flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
                <AlertDialog.Root><AlertDialog.Trigger asChild><Button variant="outline"><RotateCcw className="mr-2 size-4" />{pageCopy.regenerate}</Button></AlertDialog.Trigger><ConfirmDialogContent cancel={pageCopy.cancel} confirm={pageCopy.confirmRegenerate} description={pageCopy.regenerateDescription} loading={regenerating} onConfirm={() => void regenerateInvite()} title={pageCopy.regenerateTitle} /></AlertDialog.Root>
                <SaveButton busy={saving === "invitation"} copy={pageCopy} onClick={() => void save("invitation", { invite_enabled: inviteEnabled })} />
              </div>
            </CardContent>
          </Card>

          <Card className="scroll-mt-24 shadow-none" id="data">
            <CardHeader><CardTitle>{pageCopy.nav.data}</CardTitle><CardDescription>{pageCopy.dataDescription}</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                <Stat icon={Users} label={pageCopy.stats.authors} value={String(book.author_count)} />
                <Stat icon={FileText} label={pageCopy.stats.articles} value={String(book.article_count)} />
                <Stat icon={Check} label={pageCopy.stats.approved} value={String(book.approved_article_count)} />
                <Stat icon={RefreshCw} label={pageCopy.stats.updated} value={lastUpdated} />
              </dl>
              <div className="flex flex-wrap gap-3 border-t border-border pt-5"><Button disabled title={pageCopy.developing} variant="outline"><Download className="mr-2 size-4" />{pageCopy.exportBackup}<span className="ml-2 text-xs text-muted-foreground">({pageCopy.developing})</span></Button><Button disabled title={pageCopy.developing} variant="outline"><Upload className="mr-2 size-4" />{pageCopy.importBackup}<span className="ml-2 text-xs text-muted-foreground">({pageCopy.developing})</span></Button></div>
            </CardContent>
          </Card>

          <Card className="scroll-mt-24 border-rose-500/35 bg-rose-500/[0.025] shadow-none" id="danger">
            <CardHeader><CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400"><ShieldAlert className="size-4" />{pageCopy.nav.danger}</CardTitle><CardDescription>{pageCopy.dangerDescription}</CardDescription></CardHeader>
            <CardContent className="divide-y divide-rose-500/15">
              {(Object.keys(pageCopy.dangers) as DangerAction[]).map((action) => <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between" key={action}><div><p className="text-sm font-medium">{pageCopy.dangers[action].title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{pageCopy.dangers[action].description}</p></div><Button className="shrink-0 border border-rose-500/40 bg-transparent text-rose-600 hover:bg-rose-500/10 dark:text-rose-400" onClick={() => { setBookTitleConfirmation(""); setDangerAction(action); }}><Trash2 className="mr-2 size-4" />{pageCopy.delete}</Button></div>)}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog.Root onOpenChange={(open) => { if (!open && !dangerBusy) setDangerAction(null); }} open={dangerAction !== null}>
        <AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" /><AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-rose-500/35 bg-card p-6 shadow-2xl focus:outline-none"><div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500"><ShieldAlert className="size-5" /></div><AlertDialog.Title className="mt-5 text-lg font-semibold">{pageCopy.dangerConfirmTitle}</AlertDialog.Title><AlertDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">{dangerAction ? `${pageCopy.dangers[dangerAction].description} ${pageCopy.dangerConfirmDescription}` : ""}</AlertDialog.Description>{dangerAction === "book" ? <div className="mt-5 space-y-2"><Label htmlFor="confirm-book-title">{pageCopy.typeBookTitle}</Label><Input autoComplete="off" id="confirm-book-title" onChange={(event) => setBookTitleConfirmation(event.target.value)} value={bookTitleConfirmation} /><p className="text-xs font-medium text-rose-500">{book.title}</p></div> : null}<div className="mt-6 flex justify-end gap-2"><AlertDialog.Cancel asChild><Button disabled={dangerBusy} variant="outline">{pageCopy.cancel}</Button></AlertDialog.Cancel><Button className="bg-rose-600 text-white hover:bg-rose-700" disabled={dangerBusy || (dangerAction === "book" && bookTitleConfirmation !== book.title)} onClick={() => void runDangerAction()}>{dangerBusy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}{pageCopy.confirmDelete}</Button></div></AlertDialog.Content></AlertDialog.Portal>
      </AlertDialog.Root>
    </DashboardLayout>
  );
}

function SaveButton({ busy, copy: value, disabled, onClick }: { busy: boolean; copy: typeof copy.en | typeof copy.zh; disabled?: boolean; onClick: () => void }) {
  return <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={busy || disabled} onClick={onClick}>{busy ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}{busy ? value.saving : value.save}</Button>;
}

function ToggleRow({ checked, description, label, onChange }: { checked: boolean; description?: string; label: string; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 py-4"><span><span className="block text-sm font-medium">{label}</span>{description ? <span className="mt-1 block text-xs text-muted-foreground">{description}</span> : null}</span><Switch checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</dt><dd className="mt-2 text-sm font-semibold">{value}</dd></div>;
}

function ConfirmDialogContent({ cancel, confirm, description, loading, onConfirm, title }: { cancel: string; confirm: string; description: string; loading: boolean; onConfirm: () => void; title: string }) {
  return <AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" /><AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl focus:outline-none"><AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title><AlertDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">{description}</AlertDialog.Description><div className="mt-6 flex justify-end gap-2"><AlertDialog.Cancel asChild><Button disabled={loading} variant="outline">{cancel}</Button></AlertDialog.Cancel><AlertDialog.Action asChild><Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={loading} onClick={onConfirm}>{loading ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <RotateCcw className="mr-2 size-4" />}{confirm}</Button></AlertDialog.Action></div></AlertDialog.Content></AlertDialog.Portal>;
}
