import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import {
  CircleAlert,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  WandSparkles,
} from "lucide-react";

import { BookPagePreview } from "@/components/dashboard/format-settings/book-page-preview";
import { FormatPanel } from "@/components/dashboard/format-settings/format-panel";
import type { Template } from "@/types/template";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useBookTemplate } from "@/hooks/use-book-template";
import { useSystemFonts } from "@/hooks/use-system-fonts";
import type { Language } from "@/lib/i18n";
import { defaultTemplate } from "@/mock/template";
import { articleRepository } from "@/repositories/articleRepository";
import { templateRepository } from "@/repositories/templateRepository";

const formatSettingsCopy = {
  en: {
    eyebrow: "Book Template Designer",
    title: "Format Settings",
    description:
      "Design the publishing style for this book and see every change on the page.",
    descriptionNote: "All submitted articles will use this template.",
    save: "Save Settings",
    saving: "Saving...",
    saved: "Settings saved.",
    error: "Could not save settings. Please try again.",
    loading: "Loading saved settings...",
    loadError: "Could not load the saved settings.",
    retry: "Try Again",
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
    save: "保存设置",
    saving: "正在保存...",
    saved: "设置已保存。",
    error: "保存失败，请重试。",
    loading: "正在加载已保存的设置...",
    loadError: "无法加载已保存的设置。",
    retry: "重试",
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
}

function FormatSettingsContent({ bookId, language }: FormatSettingsContentProps) {
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
  const [reviewAction, setReviewAction] = useState<
    "re-review" | "approve-all" | null
  >(null);

  const updateSetting = <Key extends keyof Template>(
    key: Key,
    value: Template[Key],
  ) => {
    setSaveStatus("idle");
    setTemplate((current) => ({ ...current, [key]: value }));
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
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  if (loadStatus === "idle" || loadStatus === "loading") {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        {copy.loading}
      </div>
    );
  }

  if (loadStatus === "error") {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
        <CircleAlert className="size-7 text-rose-400" />
        <p className="text-sm text-muted-foreground">{copy.loadError}</p>
        <Button onClick={reload} type="button" variant="outline">
          <RefreshCw className="mr-2 size-4" />
          {copy.retry}
        </Button>
      </div>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
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
      </header>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(320px,0.54fr)_minmax(0,1fr)]">
        <aside>
          <FormatPanel
            fontOptions={fontOptions}
            fontStatus={fontStatus}
            language={language}
            onLoadSystemFonts={loadSystemFonts}
            onChange={updateSetting}
            settings={settings}
          />
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
              {saveStatus === "saving" ? copy.saving : copy.save}
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

        <div className="xl:sticky xl:top-24">
          <BookPagePreview language={language} settings={settings} />
        </div>
      </div>

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
