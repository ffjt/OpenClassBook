import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useEffect, useState } from "react";
import {
  CircleAlert,
  CheckCircle2,
  Check,
  ChevronDown,
  Eye,
  LoaderCircle,
  Newspaper,
  RefreshCw,
  BookOpen,
  WandSparkles,
  X,
} from "lucide-react";

import { BookPagePreview } from "@/components/dashboard/format-settings/book-page-preview";
import { FormatPanel } from "@/components/dashboard/format-settings/format-panel";
import type { Template } from "@/types/template";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useBookTemplate } from "@/hooks/use-book-template";
import { useSystemFonts } from "@/hooks/use-system-fonts";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { defaultTemplate } from "@/mock/template";
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
    presetsDescription: "Start with a complete visual system. Advanced settings remain available below.",
    collection: "Classic Collection",
    collectionDescription: "Single-column, spacious, reading-first essays and collections.",
    magazine: "Campus Magazine",
    magazineDescription: "Editorial two-column layout with accent rules, metadata and images.",
    advanced: "Advanced settings",
    advancedHint: "Override the selected template for this book",
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
    presetsDescription: "先选择一套完整的视觉系统；下方仍可按书籍需要覆盖高级设置。",
    collection: "经典文集",
    collectionDescription: "单栏、留白充足、阅读优先，适合作文集与毕业文集。",
    magazine: "校园报刊",
    magazineDescription: "双栏编辑式排版，带强调色、页眉页脚、作者信息与图片。",
    advanced: "高级设置",
    advancedHint: "仅覆盖当前书籍，不会改变官方模板",
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

const presetDefaults: Record<Template["preset"], Partial<Template>> = {
  collection: {
    preset: "collection",
    themeColor: "#1f2937",
    accentColor: "#1f2937",
    columns: 1,
    showHeader: false,
    headerText: "",
    showFooter: true,
    footerText: "OpenClassBook · 2026",
    showAuthorMeta: true,
    imageRadius: 0,
    imageBorder: true,
    quoteStyle: false,
    titleFont: {
      family: "serif",
      fullName: "System Serif",
      postscriptName: "system-serif",
      style: "Regular",
    },
    titleSize: 25,
    titleBold: true,
    titleAlign: "center",
    subtitleAlign: "center",
    titleSpacing: 24,
    bodyFont: {
      family: "serif",
      fullName: "System Serif",
      postscriptName: "system-serif",
      style: "Regular",
    },
    bodySize: 14,
    lineHeight: 1.6,
    firstLineIndent: 2,
    justify: true,
    imageMaxWidth: 72,
    pageMargin: "wide",
  },
  magazine: {
    preset: "magazine",
    themeColor: "#111827",
    accentColor: "#dc2626",
    columns: 2,
    showHeader: true,
    headerText: "OPEN CLASSBOOK · CAMPUS EDITION",
    showFooter: true,
    footerText: "校园刊物 · 2026",
    showAuthorMeta: true,
    imageRadius: 0,
    imageBorder: false,
    quoteStyle: true,
    titleFont: {
      family: "sans-serif",
      fullName: "System Sans",
      postscriptName: "system-sans",
      style: "Regular",
    },
    titleSize: 20,
    titleBold: true,
    titleAlign: "left",
    subtitleAlign: "left",
    titleSpacing: 12,
    bodyFont: {
      family: "serif",
      fullName: "System Serif",
      postscriptName: "system-serif",
      style: "Regular",
    },
    bodySize: 10.5,
    lineHeight: 1.4,
    firstLineIndent: 0,
    justify: true,
    imageMaxWidth: 100,
    pageMargin: "normal",
  },
};

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
  const [bookLoadError, setBookLoadError] = useState(false);
  const [bookReloadKey, setBookReloadKey] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
    bookRepository.get(bookId).then(
      (book) => {
        if (active) {
          setBookTitle(book.title);
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

  const applyPreset = (preset: Template["preset"]) => {
    setSaveStatus("idle");
    setTemplate((current) => ({
      ...current,
      ...presetDefaults[preset],
      preset,
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

      <section className={cn("rounded-2xl border border-border bg-card/60 p-4 sm:p-5", showHeader && "mt-6")}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-foreground">{copy.presetsTitle}</h2>
          <p className="text-xs leading-5 text-muted-foreground">{copy.presetsDescription}</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <PresetCard
            active={settings.preset === "collection"}
            description={copy.collectionDescription}
            icon={BookOpen}
            onClick={() => applyPreset("collection")}
            selectedLabel={copy.selected}
            title={copy.collection}
            accent="#1f2937"
          />
          <PresetCard
            active={settings.preset === "magazine"}
            description={copy.magazineDescription}
            icon={Newspaper}
            onClick={() => applyPreset("magazine")}
            selectedLabel={copy.selected}
            title={copy.magazine}
            accent="#dc2626"
          />
        </div>
      </section>

      <div className={cn("grid items-start gap-6 lg:grid-cols-[minmax(320px,0.54fr)_minmax(0,1fr)]", showHeader && "mt-6")}>
        <aside>
          <details className="group rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <span>
                {copy.advanced}
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">{copy.advancedHint}</span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border p-3">
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
          </details>
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

interface PresetCardProps {
  active: boolean;
  accent: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  selectedLabel: string;
  title: string;
}

function PresetCard({
  active,
  accent,
  description,
  icon: Icon,
  onClick,
  selectedLabel,
  title,
}: PresetCardProps) {
  return (
    <button
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg",
        active
          ? "border-blue-500/60 bg-blue-500/[0.08] shadow-md"
          : "border-border bg-background/70 hover:border-blue-500/30",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: accent }}
      />
      <span className="flex items-start justify-between gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: accent }}
        >
          <Icon className="size-4" />
        </span>
        {active ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-500">
            <Check className="size-3.5" />
            {selectedLabel}
          </span>
        ) : null}
      </span>
      <span className="mt-4 block text-sm font-semibold text-foreground">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
    </button>
  );
}
