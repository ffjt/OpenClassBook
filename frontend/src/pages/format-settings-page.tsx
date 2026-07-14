import { useState } from "react";
import { CircleAlert, CheckCircle2, LoaderCircle, WandSparkles } from "lucide-react";

import { BookPagePreview } from "@/components/dashboard/format-settings/book-page-preview";
import { FormatPanel } from "@/components/dashboard/format-settings/format-panel";
import type { Template } from "@/types/template";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useSystemFonts } from "@/hooks/use-system-fonts";
import { useTemplate } from "@/hooks/use-template";
import type { Language } from "@/lib/i18n";
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
  const { template: settings, setTemplate } = useTemplate();
  const { fontOptions, loadSystemFonts, status: fontStatus } = useSystemFonts();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const updateSetting = <Key extends keyof Template>(
    key: Key,
    value: Template[Key],
  ) => {
    setSaveStatus("idle");
    setTemplate((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = async () => {
    setSaveStatus("saving");
    try {
      await templateRepository.save(bookId, settings);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

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
    </>
  );
}
