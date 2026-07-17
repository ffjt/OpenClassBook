import { GraduationCap } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ClassCollectionMode, ClassValueStyle } from "@/repositories/bookRepository";

export interface ClassCollectionRules {
  mode: ClassCollectionMode;
  fixedValue: string;
  prefix: string;
  suffix: string;
  valueStyle: ClassValueStyle;
}

const copy = {
  en: {
    title: "Collect class",
    description: "Keep author metadata consistent for publication.",
    none: "Do not collect class",
    collect: "Collect class",
    fixed: "One class for everyone",
    fixedNote: "Every author will use the same class name.",
    format: "Formatted fill-in",
    formatNote: "Authors fill only the blank; fixed text stays locked.",
    className: "Class name",
    prefix: "Fixed text before",
    blank: "Author fills this blank",
    suffix: "Fixed text after",
    preview: "Author sees",
    blankPreview: "blank",
    numeralStyle: "Blank content",
    arabic: "Arabic digits (0–9)",
    chinese: "Chinese numerals (一二三…)",
  },
  zh: {
    title: "收集班级",
    description: "统一作者信息格式，保证出版时整齐美观。",
    none: "不收集班级",
    collect: "收集班级",
    fixed: "统一规定",
    fixedNote: "所有作者使用同一个班级名称。",
    format: "按格式填写",
    formatNote: "固定文字由你规定，作者只能填写中间空格。",
    className: "统一班级名称",
    prefix: "前面的固定文字",
    blank: "作者填写的空格",
    suffix: "后面的固定文字",
    preview: "作者看到的格式",
    blankPreview: "填写处",
    numeralStyle: "填空内容",
    arabic: "阿拉伯数字（0–9）",
    chinese: "中文数字（一二三……）",
  },
} as const;

function Choice({ checked, label, note, onClick }: { checked: boolean; label: string; note?: string; onClick: () => void }) {
  return (
    <button className={cn("rounded-xl border p-4 text-left transition-colors", checked ? "border-blue-500/40 bg-blue-500/[0.08]" : "border-border hover:bg-muted/40")} onClick={onClick} type="button">
      <span className="flex items-center gap-2 text-sm font-medium"><span className={cn("size-3.5 rounded-full border-4", checked ? "border-blue-600 bg-white" : "border-muted-foreground/40")} />{label}</span>
      {note ? <span className="mt-2 block pl-5.5 text-xs leading-5 text-muted-foreground">{note}</span> : null}
    </button>
  );
}

export function ClassCollectionFields({ language, rules, onChange }: { language: Language; rules: ClassCollectionRules; onChange: (rules: ClassCollectionRules) => void }) {
  const text = copy[language];
  const collecting = rules.mode !== "none";
  return (
    <section className="grid gap-5 border-t border-border pt-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="size-4 text-blue-500" />{text.title}</h3>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{text.description}</p>
      </div>
      <div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice checked={!collecting} label={text.none} onClick={() => onChange({ ...rules, mode: "none" })} />
          <Choice checked={collecting} label={text.collect} onClick={() => onChange({ ...rules, mode: rules.mode === "none" ? "fixed" : rules.mode })} />
        </div>
        {collecting ? (
          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice checked={rules.mode === "fixed"} label={text.fixed} note={text.fixedNote} onClick={() => onChange({ ...rules, mode: "fixed" })} />
              <Choice checked={rules.mode === "template"} label={text.format} note={text.formatNote} onClick={() => onChange({ ...rules, mode: "template" })} />
            </div>
            {rules.mode === "fixed" ? (
              <label className="mt-4 block text-xs font-medium">{text.className}<Input className="mt-2" maxLength={120} onChange={(event) => onChange({ ...rules, fixedValue: event.target.value })} placeholder={language === "zh" ? "例如：高二（3）班" : "e.g. Grade 11, Class 3"} value={rules.fixedValue} /></label>
            ) : (
              <div className="mt-4">
                <div className="mb-4"><p className="text-xs font-medium">{text.numeralStyle}</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><Choice checked={rules.valueStyle === "arabic"} label={text.arabic} onClick={() => onChange({ ...rules, valueStyle: "arabic" })} /><Choice checked={rules.valueStyle === "chinese"} label={text.chinese} onClick={() => onChange({ ...rules, valueStyle: "chinese" })} /></div></div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1.15fr_1fr]">
                  <label className="text-xs font-medium">{text.prefix}<Input className="mt-2" maxLength={60} onChange={(event) => onChange({ ...rules, prefix: event.target.value })} placeholder={language === "zh" ? "高二（" : "Grade 11, Class "} value={rules.prefix} /></label>
                  <label className="text-xs font-medium text-muted-foreground">{text.blank}<Input className="mt-2 border-dashed" disabled placeholder={language === "zh" ? "作者只能填写这里" : "Authors fill only this"} /></label>
                  <label className="text-xs font-medium">{text.suffix}<Input className="mt-2" maxLength={60} onChange={(event) => onChange({ ...rules, suffix: event.target.value })} placeholder={language === "zh" ? "）班" : ""} value={rules.suffix} /></label>
                </div>
                <p className="mt-3 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{text.preview}: </span>{rules.prefix}<span className="mx-1 rounded border border-dashed border-blue-500/50 px-2 py-0.5 text-blue-500">{rules.valueStyle === "arabic" ? "3" : "三"}</span>{rules.suffix}</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
