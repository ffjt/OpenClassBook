import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CheckCircle2,
  Eye,
  LoaderCircle,
  RefreshCw,
  WandSparkles,
  X,
} from "lucide-react";

import { BookPagePreview } from "@/components/dashboard/format-settings/book-page-preview";
import { FormatPanel } from "@/components/dashboard/format-settings/format-panel";
import { withColumnLayout, type Template } from "@/types/template";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useBookTemplate } from "@/hooks/use-book-template";
import { useSystemFonts } from "@/hooks/use-system-fonts";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { defaultTemplate } from "@/mock/template";
import { applyTemplateAppearanceColorDefaults, getTemplateAssetUrl, templateCatalog } from "@/mock/template-catalog";
import type { TemplateCatalogEntry } from "@/mock/template-catalog";
import { articleRepository } from "@/repositories/articleRepository";
import {
  bookRepository,
  type ArticlePageMode,
  type NumberMode,
} from "@/repositories/bookRepository";
import { templateRepository } from "@/repositories/templateRepository";

const formatSettingsCopy = {
  en: {
    eyebrow: "Book Template Designer",
    title: "Format Settings",
    description:
      "Design the publishing style for this book and see every change on the page.",
    descriptionNote: "All submitted articles will use this template.",
    presetsTitle: "Choose a publishing template",
    presetsDescription: "Choose a template on the left and inspect its live article preview on the right.",
    columnsTitle: "Choose the page layout",
    columnsDescription: "Set the reading structure first, then choose the visual template.",
    singleColumn: "Single column",
    singleColumnHint: "Calm, continuous reading",
    doubleColumn: "Two columns",
    doubleColumnHint: "Compact editorial rhythm",
    advanced: "Advanced settings",
    advancedHint: "Override the selected template for this book",
    backToTemplates: "Back to template selection",
    next: "Next: Advanced settings",
    selected: "Selected",
    save: "Save Settings",
    saving: "Saving...",
    saved: "Settings saved.",
    error: "Could not save settings. Please try again.",
    loading: "Loading saved settings...",
    loadError: "Could not load the saved settings.",
    retry: "Try Again",
    openPreview: "Open preview",
    closePreview: "Close preview",
    previewDialogTitle: "Template preview",
    reviewTitle: "Review approved articles again?",
    reviewDescription:
      "Changing format settings will change the formatting of all approved articles. Would you like to review these articles again?",
    cancel: "Cancel",
    reReview: "Re-review",
    approveAll: "Approve all",
  },
  zh: {
    eyebrow: "书籍模板设计器",
    title: "格式设置",
    description: "设计这本书的出版样式，并在纸张上实时查看每一处调整。",
    descriptionNote: "所有投稿文章都会使用这套模板。",
    presetsTitle: "选择出版模板",
    presetsDescription: "在左侧选择模板，并在右侧查看真实文章排版预览。",
    columnsTitle: "选择页面分栏",
    columnsDescription: "先确定正文阅读结构，再选择视觉模板。",
    singleColumn: "单栏",
    singleColumnHint: "舒展、连续的阅读体验",
    doubleColumn: "双栏",
    doubleColumnHint: "紧凑的刊物排版节奏",
    advanced: "高级设置",
    advancedHint: "仅覆盖当前书籍，不会改变官方模板",
    backToTemplates: "返回模板选择",
    next: "下一步：高级设置",
    selected: "当前使用",
    save: "保存设置",
    saving: "正在保存...",
    saved: "设置已保存。",
    error: "保存失败，请重试。",
    loading: "正在加载已保存的设置...",
    loadError: "无法加载已保存的设置。",
    retry: "重试",
    openPreview: "打开预览",
    closePreview: "关闭预览",
    previewDialogTitle: "模板预览",
    reviewTitle: "是否重新审核已通过的文章？",
    reviewDescription:
      "更改格式设置会改变所有已经通过审核的文章格式，是否重新审核这些文章？",
    cancel: "取消",
    reReview: "重新审核",
    approveAll: "一键通过",
  },
} as const;

interface FormatSettingsPageProps {
  basePath: string;
  bookId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

export function FormatSettingsPage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: FormatSettingsPageProps) {
  return (
    <DashboardLayout
      activeSection="Template"
      basePath={basePath}
      language={language}
      onNavigate={onNavigate}
      onToggleLanguage={onToggleLanguage}
    >
      <FormatSettingsContent bookId={bookId} language={language} />
    </DashboardLayout>
  );
}

interface FormatSettingsContentProps {
  bookId: number;
  language: Language;
  onSaved?: () => Promise<void>;
  saveLabel?: string;
  showHeader?: boolean;
}

export function FormatSettingsContent({
  bookId,
  language,
  onSaved,
  saveLabel,
  showHeader = true,
}: FormatSettingsContentProps) {
  const copy = formatSettingsCopy[language];
  const {
    reload,
    status: loadStatus,
    template: settings,
    setTemplate,
  } = useBookTemplate(bookId);
  const { fontOptions, loadSystemFonts, status: fontStatus } = useSystemFonts();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [approvedArticleIds, setApprovedArticleIds] = useState<number[]>([]);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [numberMode, setNumberMode] = useState<NumberMode | null>(null);
  const [articlePageMode, setArticlePageMode] = useState<ArticlePageMode>("single");
  const [authorClassName, setAuthorClassName] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("OpenClassBook");
  const [, setBookSubtitle] = useState("");
  const [, setBookOwner] = useState("");
  const [, setBookSchool] = useState("");
  const [, setBookPublisher] = useState("");
  const [, setBookDescription] = useState("");
  const [, setAppearanceMetadata] = useState<Record<string, string>>({});
  const [, setEstimatedPageCount] = useState(0);
  const [bookLoadError, setBookLoadError] = useState(false);
  const [bookReloadKey, setBookReloadKey] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [designerStep, setDesignerStep] = useState<"templates" | "advanced">("templates");
  const [reviewAction, setReviewAction] = useState<
    "re-review" | "approve-all" | null
  >(null);

  useEffect(() => {
    let active = true;
    setBookLoadError(false);
    setNumberMode(null);
    setArticlePageMode("single");
    setAuthorClassName(null);
    setBookTitle("OpenClassBook");
    setBookSubtitle("");
    setBookOwner("");
    setBookSchool("");
    setBookPublisher("");
    setBookDescription("");
    setAppearanceMetadata({});
    bookRepository.get(bookId).then(
      (book) => {
        if (active) {
          setBookTitle(book.title);
          setBookSubtitle(book.subtitle ?? "");
          setBookOwner(book.owner_name);
          setBookSchool(book.school ?? "");
          setBookPublisher(book.publisher ?? "");
          setBookDescription(book.description ?? "");
          setAppearanceMetadata(book.appearance_metadata ?? {});
          setEstimatedPageCount(Math.max(40, (book.approved_article_count || book.article_count || 1) * 4));
          setNumberMode(book.number_mode);
          setArticlePageMode(book.layout_article_page_mode ?? "single");
          setAuthorClassName(
            book.class_collection_mode === "fixed"
              ? book.class_fixed_value
              : book.class_collection_mode === "template"
                ? book.class_name_template?.replace(
                    "{value}",
                    book.class_value_style === "chinese" ? "三" : "3",
                  ) ?? null
                : null,
          );
        }
      },
      () => {
        if (active) setBookLoadError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [bookId, bookReloadKey, language]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isPreviewOpen]);

  const updateSetting = <Key extends keyof Template>(
    key: Key,
    value: Template[Key],
  ) => {
    setSaveStatus("idle");
    setTemplate((current) => ({ ...current, [key]: value }));
  };

  const updateColumns = (columns: 1 | 2) => {
    setSaveStatus("idle");
    setTemplate((current) => withColumnLayout(current, columns));
  };

  const applyCatalogTemplate = (templateId: string) => {
    const catalog = templateCatalog.find((entry) => entry.id === templateId);
    if (!catalog) return;
    setSaveStatus("idle");
    setTemplate((current) => ({
      ...current,
      templateId: catalog.id,
      backgroundColor: catalog.secondaryColor,
      themeColor: catalog.textColor,
      accentColor: catalog.accentColor,
      bodyFont: { ...current.bodyFont, family: catalog.fontFamily, fullName: catalog.fontFamily },
      titleFont: catalog.titleFont ?? { ...current.titleFont, family: catalog.fontFamily, fullName: catalog.fontFamily },
      titleSize: catalog.titleSize ?? current.titleSize,
      appearance: applyTemplateAppearanceColorDefaults(
        current.appearance,
        catalog,
        catalog.titleFont ?? { ...current.titleFont, family: catalog.fontFamily, fullName: catalog.fontFamily },
      ),
      titleSpacing: 12,
      imageRadius: catalog.cornerStyle === "soft" ? 12 : 0,
      imageBorder: catalog.cornerStyle === "square",
      quoteStyle: true,
    }));
  };

  const commitSettings = async (action: "re-review" | "approve-all") => {
    setReviewAction(action);
    setSaveStatus("saving");
    try {
      const savedTemplate = await templateRepository.save(bookId, settings);
      if (action === "re-review") {
        await Promise.all(
          approvedArticleIds.map((articleId) =>
            articleRepository.updateStatus(articleId, "pending"),
          ),
        );
      }
      setTemplate(savedTemplate);
      await onSaved?.();
      setSaveStatus("saved");
      setIsReviewDialogOpen(false);
    } catch {
      setSaveStatus("error");
    } finally {
      setReviewAction(null);
    }
  };

  const saveSettings = async () => {
    setSaveStatus("saving");
    try {
      const [savedSettings, articles] = await Promise.all([
        templateRepository.getSettingsByBook(bookId),
        articleRepository.list(bookId),
      ]);
      const hasChanges =
        JSON.stringify(settings) !==
        JSON.stringify(savedSettings ?? defaultTemplate);
      const approvedIds = articles
        .filter((article) => article.status === "approved")
        .map((article) => article.id);

      if (hasChanges && approvedIds.length > 0) {
        setApprovedArticleIds(approvedIds);
        setSaveStatus("idle");
        setIsReviewDialogOpen(true);
        return;
      }

      const savedTemplate = await templateRepository.save(bookId, settings);
      setTemplate(savedTemplate);
      await onSaved?.();
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  if (
    (loadStatus === "idle" || loadStatus === "loading" || numberMode === null) &&
    loadStatus !== "error" &&
    !bookLoadError
  ) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        {copy.loading}
      </div>
    );
  }

  if (loadStatus === "error" || bookLoadError) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
        <CircleAlert className="size-7 text-rose-400" />
        <p className="text-sm text-muted-foreground">{copy.loadError}</p>
        <Button
          onClick={() => {
            setBookLoadError(false);
            setNumberMode(null);
            setBookReloadKey((value) => value + 1);
            reload();
          }}
          type="button"
          variant="outline"
        >
          <RefreshCw className="mr-2 size-4" />
          {copy.retry}
        </Button>
      </div>
    );
  }

  return (
    <>
      {showHeader ? <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">
            <WandSparkles className="size-3.5" />
            {copy.eyebrow}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {copy.description}
            <br />
            {copy.descriptionNote}
          </p>
        </div>
      </header> : null}

      {designerStep === "templates" ? (
        <section className={cn("rounded-2xl border border-border bg-card/60 p-4 sm:p-5", showHeader && "mt-6")}>
          <div className="mb-7 rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/12 via-blue-500/[0.05] to-transparent p-4 sm:p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-400">
                {copy.columnsTitle}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {copy.columnsDescription}
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                aria-pressed={settings.columns === 1}
                className={cn(
                  "group flex min-h-28 items-center gap-5 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  settings.columns === 1
                    ? "border-blue-400 bg-blue-500/15 shadow-[0_12px_30px_rgba(37,99,235,0.16)]"
                    : "border-border bg-background/70 hover:border-blue-500/40 hover:bg-blue-500/[0.06]",
                )}
                onClick={() => updateColumns(1)}
                type="button"
              >
                <span className="flex h-20 w-14 shrink-0 rounded-md border border-current/20 bg-white/95 p-2 shadow-sm">
                  <span className="w-full rounded-sm bg-slate-300/85" />
                </span>
                <span>
                  <span className="block text-lg font-semibold tracking-[-0.02em] text-foreground">
                    {copy.singleColumn}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {copy.singleColumnHint}
                  </span>
                </span>
              </button>
              <button
                aria-pressed={settings.columns === 2}
                className={cn(
                  "group flex min-h-28 items-center gap-5 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  settings.columns === 2
                    ? "border-blue-400 bg-blue-500/15 shadow-[0_12px_30px_rgba(37,99,235,0.16)]"
                    : "border-border bg-background/70 hover:border-blue-500/40 hover:bg-blue-500/[0.06]",
                )}
                onClick={() => updateColumns(2)}
                type="button"
              >
                <span className="grid h-20 w-14 shrink-0 grid-cols-2 gap-1 rounded-md border border-current/20 bg-white/95 p-2 shadow-sm">
                  <span className="rounded-sm bg-slate-300/85" />
                  <span className="rounded-sm bg-slate-300/85" />
                </span>
                <span>
                  <span className="block text-lg font-semibold tracking-[-0.02em] text-foreground">
                    {copy.doubleColumn}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {copy.doubleColumnHint}
                  </span>
                </span>
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">{copy.presetsTitle}</h2>
            <p className="text-xs leading-5 text-muted-foreground">{copy.presetsDescription}</p>
          </div>
          <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(280px,0.62fr)_minmax(0,1fr)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:max-h-[calc(100vh-13rem)] lg:grid-cols-1 lg:overflow-y-auto lg:pr-2 xl:grid-cols-2">
              {templateCatalog.map((catalog) => (
                <CatalogCard
                  key={catalog.id}
                  active={settings.templateId === catalog.id}
                  catalog={catalog}
                  language={language}
                  onClick={() => applyCatalogTemplate(catalog.id)}
                  selectedLabel={copy.selected}
                />
              ))}
            </div>
            <div className="min-w-0 lg:sticky lg:top-24">
              <div className="hidden lg:block lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:overscroll-contain">
                <BookPagePreview
                  authorClassName={authorClassName}
                  bookTitle={bookTitle}
                  language={language}
                  numberingEnabled={numberMode !== "none"}
                  settings={{ ...settings, showNumber: numberMode !== "none" && settings.showNumber }}
                  articlePageMode={articlePageMode}
                />
              </div>
              <div className="mt-4 flex justify-end border-t border-border pt-4">
                <Button className="h-10 rounded-lg bg-blue-500 px-5 text-sm text-white hover:bg-blue-400" onClick={() => setDesignerStep("advanced")} type="button">
                  {copy.next}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : (
      <section className={cn(showHeader && "mt-6")}>
        <button className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" onClick={() => setDesignerStep("templates")} type="button">
          <ArrowLeft className="size-4" />
          {copy.backToTemplates}
        </button>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">{copy.advanced}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{copy.advancedHint}</p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,0.54fr)_minmax(0,1fr)]">
          <aside>
            <div className="rounded-xl border border-border bg-card p-3">
              <FormatPanel
                fontOptions={fontOptions}
                fontStatus={fontStatus}
                language={language}
                onLoadSystemFonts={loadSystemFonts}
                onChange={updateSetting}
                numberingEnabled={numberMode !== "none"}
                settings={settings}
              />
            </div>
            <div className="sticky bottom-0 mt-4 border-t border-border bg-background/95 py-4 backdrop-blur-xl">
            <Button
              className="h-10 w-full rounded-lg bg-blue-500 px-5 text-sm text-white hover:bg-blue-400"
              disabled={saveStatus === "saving"}
              onClick={saveSettings}
              type="button"
            >
              {saveStatus === "saving" && (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              )}
              {saveStatus === "saving" ? copy.saving : (saveLabel ?? copy.save)}
            </Button>
            <div aria-live="polite" className="min-h-5 pt-2 text-xs" role="status">
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  {copy.saved}
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1.5 text-rose-400">
                  <CircleAlert className="size-3.5" />
                  {copy.error}
                </span>
              )}
            </div>
          </div>
          </aside>

        <div className="hidden min-h-0 lg:sticky lg:top-24 lg:block lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain">
          <BookPagePreview
            authorClassName={authorClassName}
            bookTitle={bookTitle}
            language={language}
            numberingEnabled={numberMode !== "none"}
            settings={{
              ...settings,
              showNumber: numberMode !== "none" && settings.showNumber,
            }}
            articlePageMode={articlePageMode}
          />
        </div>
        </div>
      </section>
      )}

      <Button
        className="fixed bottom-5 right-5 z-40 h-11 rounded-full bg-blue-500 px-4 text-white shadow-[0_12px_35px_rgba(37,99,235,0.4)] hover:bg-blue-400 lg:hidden"
        onClick={() => setIsPreviewOpen(true)}
        type="button"
      >
        <Eye className="mr-2 size-4" />
        {copy.openPreview}
      </Button>

      {isPreviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 backdrop-blur-sm lg:hidden"
          onMouseDown={() => setIsPreviewOpen(false)}
        >
          <section
            aria-labelledby="template-preview-dialog-title"
            aria-modal="true"
            className="flex max-h-[calc(100vh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-400">
                  {copy.openPreview}
                </p>
                <h2
                  className="mt-0.5 text-sm font-semibold text-foreground"
                  id="template-preview-dialog-title"
                >
                  {copy.previewDialogTitle}
                </h2>
              </div>
              <button
                aria-label={copy.closePreview}
                className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setIsPreviewOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
              <BookPagePreview
                authorClassName={authorClassName}
                bookTitle={bookTitle}
                language={language}
                numberingEnabled={numberMode !== "none"}
                settings={{
                  ...settings,
                  showNumber: numberMode !== "none" && settings.showNumber,
                }}
                articlePageMode={articlePageMode}
              />
            </div>
          </section>
        </div>
      ) : null}

      <AlertDialog.Root
        onOpenChange={(open) => {
          if (saveStatus !== "saving") setIsReviewDialogOpen(open);
        }}
        open={isReviewDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl focus:outline-none">
            <AlertDialog.Title className="text-lg font-semibold text-foreground">
              {copy.reviewTitle}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.reviewDescription}
            </AlertDialog.Description>
            {saveStatus === "error" && (
              <p className="mt-3 text-xs text-rose-400" role="alert">
                {copy.error}
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel asChild>
                <Button
                  className="h-9 rounded-lg px-4 text-xs"
                  disabled={saveStatus === "saving"}
                  onClick={() => setSaveStatus("idle")}
                  type="button"
                  variant="outline"
                >
                  {copy.cancel}
                </Button>
              </AlertDialog.Cancel>
              <Button
                className="h-9 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 text-xs text-amber-300 hover:bg-amber-500/15"
                disabled={saveStatus === "saving"}
                onClick={() => void commitSettings("re-review")}
                type="button"
              >
                {reviewAction === "re-review" && (
                  <LoaderCircle className="mr-2 size-3.5 animate-spin" />
                )}
                {copy.reReview}
              </Button>
              <Button
                className="h-9 rounded-lg bg-blue-500 px-4 text-xs text-white hover:bg-blue-400"
                disabled={saveStatus === "saving"}
                onClick={() => void commitSettings("approve-all")}
                type="button"
              >
                {reviewAction === "approve-all" && (
                  <LoaderCircle className="mr-2 size-3.5 animate-spin" />
                )}
                {copy.approveAll}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

function CatalogCard({
  active,
  catalog,
  language,
  onClick,
  selectedLabel,
}: {
  active: boolean;
  catalog: TemplateCatalogEntry;
  language: Language;
  onClick: () => void;
  selectedLabel: string;
}) {
  return (
    <button
      className={cn(
        "group relative overflow-hidden rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg",
        active ? "border-blue-500/60 bg-blue-500/[0.08] shadow-md" : "border-border bg-background/70 hover:border-blue-500/30",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: catalog.primaryColor }} />
      <span className="relative flex h-36 items-end overflow-hidden rounded-lg bg-cover bg-center" style={{ backgroundColor: catalog.secondaryColor, backgroundImage: `url(${getTemplateAssetUrl(catalog.id, "cover")})` }}>
        <span className={cn("absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-zinc-900/55 px-3 py-2 text-white backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100", active ? "translate-y-0 opacity-100" : "translate-y-full opacity-0")}>
          <span className="truncate text-[10px] font-semibold tracking-[0.08em]">{catalog.name[language]}</span>
          {active ? <span className="shrink-0 text-[10px] font-semibold">✓ {selectedLabel}</span> : null}
        </span>
      </span>
      <span className="mt-3 block text-sm font-semibold text-foreground">{catalog.name[language]}</span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{catalog.description[language]}</span>
    </button>
  );
}
