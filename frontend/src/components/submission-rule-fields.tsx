import { CalendarDays, Files, LockKeyhole, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Language } from "@/lib/i18n";
import type { SubmissionRules } from "@/lib/submission-rules";
import { cn } from "@/lib/utils";

interface SubmissionRuleFieldsProps {
  language: Language;
  onChange: (rules: SubmissionRules) => void;
  rules: SubmissionRules;
}

const copy = {
  en: {
    deadline: "Submission deadline",
    noDeadline: "No deadline",
    chooseDate: "Choose a date",
    deadlineAfter: "After the deadline",
    deadlineNote: "Authors can still view their articles, but cannot submit or make changes.",
    limit: "Maximum submissions per author",
    single: "One article only",
    multiple: "Multiple articles",
    unlimited: "No limit",
    maximum: "Maximum",
    articles: "articles",
    editing: "Allow changes after submission",
    beforeReview: "Allow changes before review",
    lockImmediately: "Lock immediately after submission",
    deletion: "Allow authors to delete their own articles",
    deletionNote: "When disabled, only an administrator can delete articles.",
  },
  zh: {
    deadline: "投稿截止时间",
    noDeadline: "不限制",
    chooseDate: "指定日期",
    deadlineAfter: "截止后",
    deadlineNote: "作者仍可查看自己的文章，但不能继续提交或修改。",
    limit: "每位作者最多投稿",
    single: "仅一篇",
    multiple: "多篇",
    unlimited: "不限制",
    maximum: "最多",
    articles: "篇",
    editing: "投稿后允许修改",
    beforeReview: "审核前允许修改",
    lockImmediately: "提交后立即锁定",
    deletion: "允许作者删除自己的文章",
    deletionNote: "关闭后，只能由管理员删除。",
  },
} as const;

function RadioOption({
  checked,
  label,
  name,
  onChange,
}: {
  checked: boolean;
  label: string;
  name: string;
  onChange: () => void;
}) {
  return (
    <label className={cn(
      "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
      checked ? "border-blue-500/50 bg-blue-500/[0.06]" : "border-border hover:bg-muted/40",
    )}>
      <input checked={checked} className="accent-blue-600" name={name} onChange={onChange} type="radio" />
      <span className="font-medium">{label}</span>
    </label>
  );
}

export function SubmissionRuleFields({
  language,
  onChange,
  rules,
}: SubmissionRuleFieldsProps) {
  const pageCopy = copy[language];

  return (
    <div className="divide-y divide-border">
      <section className="grid gap-5 py-6 first:pt-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="size-4 text-blue-500" />
            {pageCopy.deadline}
          </h3>
        </div>
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <RadioOption checked={rules.deadlineMode === "none"} label={pageCopy.noDeadline} name="submission-deadline" onChange={() => onChange({ ...rules, deadlineMode: "none" })} />
            <RadioOption checked={rules.deadlineMode === "date"} label={pageCopy.chooseDate} name="submission-deadline" onChange={() => onChange({ ...rules, deadlineMode: "date" })} />
          </div>
          {rules.deadlineMode === "date" ? (
            <Input
              aria-label={pageCopy.deadline}
              className="mt-3 max-w-xs"
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => onChange({ ...rules, deadlineDate: event.target.value })}
              type="date"
              value={rules.deadlineDate}
            />
          ) : null}
          <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-xs leading-5 text-muted-foreground">
            <span className="font-semibold text-foreground">{pageCopy.deadlineAfter}: </span>
            {pageCopy.deadlineNote}
          </div>
        </div>
      </section>

      <section className="grid gap-5 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Files className="size-4 text-blue-500" />
          {pageCopy.limit}
        </h3>
        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            <RadioOption checked={rules.articleLimitMode === "single"} label={pageCopy.single} name="article-limit" onChange={() => onChange({ ...rules, articleLimitMode: "single" })} />
            <RadioOption checked={rules.articleLimitMode === "multiple"} label={pageCopy.multiple} name="article-limit" onChange={() => onChange({ ...rules, articleLimitMode: "multiple" })} />
            <RadioOption checked={rules.articleLimitMode === "unlimited"} label={pageCopy.unlimited} name="article-limit" onChange={() => onChange({ ...rules, articleLimitMode: "unlimited" })} />
          </div>
          {rules.articleLimitMode === "multiple" ? (
            <div className="mt-3 flex max-w-xs items-center gap-3">
              <Label htmlFor="max-articles">{pageCopy.maximum}</Label>
              <Input
                className="w-24"
                id="max-articles"
                max={100}
                min={2}
                onChange={(event) => onChange({ ...rules, maxArticles: Math.min(100, Math.max(2, Number(event.target.value) || 2)) })}
                type="number"
                value={rules.maxArticles}
              />
              <span className="text-sm text-muted-foreground">{pageCopy.articles}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <LockKeyhole className="size-4 text-blue-500" />
          {pageCopy.editing}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <RadioOption checked={rules.allowEditAfterSubmit} label={pageCopy.beforeReview} name="editing-rule" onChange={() => onChange({ ...rules, allowEditAfterSubmit: true })} />
          <RadioOption checked={!rules.allowEditAfterSubmit} label={pageCopy.lockImmediately} name="editing-rule" onChange={() => onChange({ ...rules, allowEditAfterSubmit: false })} />
        </div>
      </section>

      <section className="grid gap-5 py-6 last:pb-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Trash2 className="size-4 text-blue-500" />
          {pageCopy.deletion}
        </h3>
        <div>
          <Switch
            aria-label={pageCopy.deletion}
            checked={rules.allowDeleteArticle}
            onChange={(event) => onChange({ ...rules, allowDeleteArticle: event.target.checked })}
          />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{pageCopy.deletionNote}</p>
        </div>
      </section>
    </div>
  );
}
