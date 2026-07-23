import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CircleAlert, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { LanguageToggle } from "@/components/language-toggle";
import { ClassCollectionFields, type ClassCollectionRules } from "@/components/class-collection-fields";
import { NumberingSettingsFields } from "@/components/numbering-settings-fields";
import { SubmissionRuleFields } from "@/components/submission-rule-fields";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
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
import { FormatSettingsContent } from "@/pages/format-settings-page";
import { bookRepository, type Book } from "@/repositories/bookRepository";

type SetupStep = "settings" | "template";

interface FirstTimeSetupPageProps {
  bookId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
  step: SetupStep;
}

const copy = {
  en: {
    setup: "First-time Setup",
    step: (current: number) => `Step ${current} / 2`,
    rulesTitle: "Submission Rules",
    rulesDescription: "These rules affect every author's submissions. You can still change them later in Settings.",
    numberingTitle: "Article Numbering",
    numberingDescription: "Choose whether articles use numbers before authors begin submitting.",
    templateTitle: "Body Template",
    templateDescription: "Set the type, spacing, images, title position, and page size authors will use.",
    next: "Next: Body Template",
    saving: "Saving...",
    saveError: "Could not save the submission rules. Please try again.",
    loading: "Loading submission rules...",
    loadError: "Could not load this book.",
    retry: "Try Again",
    back: "Back to Submission Rules",
    later: "Exit setup",
    finish: "Complete Setup",
    completedToast: "Book setup complete. You can now invite authors to submit.",
    noWorry: "No need to worry.",
    flexible: "You can continue changing these rules later in Settings and Template.",
  },
  zh: {
    numberingTitle: "文章编号",
    numberingDescription: "在作者开始投稿前，选择文章是否需要编号。",
    setup: "首次配置",
    step: (current: number) => `步骤 ${current} / 2`,
    rulesTitle: "投稿规则",
    rulesDescription: "这些规则将影响所有作者的投稿行为，后续仍可在「Settings」中修改。",
    templateTitle: "正文模板",
    templateDescription: "设置作者正文使用的字体、字号、行距、图片宽度、标题位置和页面大小。",
    next: "下一步：正文模板",
    saving: "正在保存……",
    saveError: "投稿规则保存失败，请重试。",
    loading: "正在加载投稿规则……",
    loadError: "无法加载这本书。",
    retry: "重试",
    back: "返回投稿规则",
    later: "暂时退出",
    finish: "完成配置",
    completedToast: "书籍初始化完成，现在可以邀请作者投稿了。",
    noWorry: "不用担心。",
    flexible: "这些规则以后都可以在「Settings」和「Template」页面继续修改。",
  },
} as const;

const defaultRules: SubmissionRules = {
  deadlineMode: "none",
  deadlineDate: "",
  articleLimitMode: "multiple",
  maxArticles: 5,
  allowEditAfterSubmit: true,
  allowDeleteArticle: true,
};

const defaultClassRules: ClassCollectionRules = {
  mode: "none",
  fixedValue: "",
  prefix: "",
  suffix: "",
  valueStyle: "arabic",
};

export function FirstTimeSetupPage({
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
  step,
}: FirstTimeSetupPageProps) {
  const pageCopy = copy[language];
  const dashboardPath = `/book/${bookId}/dashboard`;
  const currentStep = step === "settings" ? 1 : 2;

  const completeSetup = async () => {
    await bookRepository.update(bookId, { setup_completed: true });
    toast.success(pageCopy.completedToast);
    onNavigate(dashboardPath);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-7 lg:px-10">
          <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onNavigate("/")} type="button">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"><BookOpen className="size-4" /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">OpenClassBook</span><span className="block text-xs text-muted-foreground">{pageCopy.setup}</span></span>
          </button>
          <div className="flex items-center gap-2">
            <LanguageToggle language={language} onToggle={onToggleLanguage} />
            <ThemeToggle language={language} />
            <Button className="hidden sm:inline-flex" onClick={() => onNavigate(dashboardPath)} type="button" variant="outline">{pageCopy.later}</Button>
          </div>
        </div>
        <div className="h-0.5 bg-muted"><div className="h-full bg-blue-600 transition-[width] duration-300" style={{ width: `${currentStep * 50}%` }} /></div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-500">{pageCopy.step(currentStep)}</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{step === "settings" ? pageCopy.rulesTitle : pageCopy.templateTitle}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{step === "settings" ? pageCopy.rulesDescription : pageCopy.templateDescription}</p>
          </div>
          {step === "template" ? <Button className="self-start sm:self-auto" onClick={() => onNavigate(`/book/${bookId}/setup/settings`)} type="button" variant="outline"><ArrowLeft className="mr-2 size-4" />{pageCopy.back}</Button> : null}
        </header>

        <div className="mt-7">
          {step === "settings" ? (
            <BookSetupRules bookId={bookId} language={language} onContinue={() => onNavigate(`/book/${bookId}/setup/template`)} />
          ) : (
            <FormatSettingsContent bookId={bookId} language={language} onSaved={completeSetup} saveLabel={pageCopy.finish} showHeader={false} />
          )}
        </div>

        <footer className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-sm font-semibold">{pageCopy.noWorry}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{pageCopy.flexible}</p>
          <Button className="mt-4 sm:hidden" onClick={() => onNavigate(dashboardPath)} type="button" variant="outline">{pageCopy.later}</Button>
        </footer>
      </div>
    </main>
  );
}

function BookSetupRules({ bookId, language, onContinue }: { bookId: number; language: Language; onContinue: () => void }) {
  const pageCopy = copy[language];
  const [book, setBook] = useState<Book | null>(null);
  const [rules, setRules] = useState(defaultRules);
  const [classRules, setClassRules] = useState(defaultClassRules);
  const [numbering, setNumbering] = useState<NumberingSettingsValue>(defaultNumberingSettings);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error" | "load-error">("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    bookRepository.get(bookId).then((loaded) => {
      if (!active) return;
      setBook(loaded);
      setRules(submissionRulesFromBook(loaded));
      const [prefix = "", suffix = ""] = (loaded.class_name_template ?? "").split("{value}");
      setClassRules({ mode: loaded.class_collection_mode, fixedValue: loaded.class_fixed_value ?? "", prefix, suffix, valueStyle: loaded.class_value_style ?? "arabic" });
      setNumbering({
        claimNumberEnd: loaded.claim_number_end,
        claimNumberStart: loaded.claim_number_start,
        numberDigits: loaded.number_digits,
        numberMode: loaded.number_mode,
        numberPrefix: loaded.number_prefix,
      });
      setStatus("ready");
    }, () => active && setStatus("load-error"));
    return () => { active = false; };
  }, [bookId, reloadKey]);

  const save = async () => {
    const invalidClassRules = classRules.mode === "fixed" ? !classRules.fixedValue.trim() : classRules.mode === "template" ? !(classRules.prefix.trim() || classRules.suffix.trim()) : false;
    if (!book || (rules.deadlineMode === "date" && !rules.deadlineDate) || invalidClassRules) return;
    setStatus("saving");
    try {
      await bookRepository.update(bookId, {
        ...submissionRulesToUpdate(rules),
        class_collection_mode: classRules.mode,
        class_fixed_value: classRules.mode === "fixed" ? classRules.fixedValue.trim() : null,
        class_name_template: classRules.mode === "template" ? `${classRules.prefix}{value}${classRules.suffix}` : null,
        class_value_style: classRules.mode === "template" ? classRules.valueStyle : null,
        ...numberingSettingsToPayload(numbering),
      });
      onContinue();
    } catch {
      setStatus("error");
    }
  };

  if (status === "loading") return <div className="flex min-h-96 items-center justify-center text-sm text-muted-foreground"><LoaderCircle className="mr-2 size-4 animate-spin" />{pageCopy.loading}</div>;
  if (status === "load-error" || !book) return <div className="flex min-h-96 flex-col items-center justify-center text-center"><CircleAlert className="size-7 text-rose-500" /><p className="mt-4 text-sm text-muted-foreground">{pageCopy.loadError}</p><Button className="mt-5" onClick={() => setReloadKey((value) => value + 1)} variant="outline">{pageCopy.retry}</Button></div>;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 sm:p-7">
        <SubmissionRuleFields language={language} onChange={setRules} rules={rules} />
        <ClassCollectionFields language={language} onChange={setClassRules} rules={classRules} />
      </section>
      <section className="rounded-lg border border-border bg-card p-5 sm:p-7">
        <h2 className="text-base font-semibold">{pageCopy.numberingTitle}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{pageCopy.numberingDescription}</p>
        <div className="mt-5">
          <NumberingSettingsFields language={language} onChange={setNumbering} value={numbering} />
        </div>
      </section>

      <div className="flex flex-col items-end gap-3 border-t border-border pt-5">
        {status === "error" ? <p className="text-sm text-rose-500" role="alert">{pageCopy.saveError}</p> : null}
        <Button className="h-11 w-full bg-blue-600 px-6 text-white hover:bg-blue-700 sm:w-auto" disabled={status === "saving" || (rules.deadlineMode === "date" && !rules.deadlineDate) || (classRules.mode === "fixed" && !classRules.fixedValue.trim()) || (classRules.mode === "template" && !(classRules.prefix.trim() || classRules.suffix.trim()))} onClick={() => void save()}>
          {status === "saving" ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <ArrowRight className="mr-2 size-4" />}
          {status === "saving" ? pageCopy.saving : pageCopy.next}
        </Button>
      </div>
    </div>
  );
}
