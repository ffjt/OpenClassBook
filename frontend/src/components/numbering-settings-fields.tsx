import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Language } from "@/lib/i18n";
import type { NumberingSettingsValue } from "@/lib/numbering-settings";
import { cn } from "@/lib/utils";

const copy = {
  en: {
    modes: {
      none: {
        title: "No numbering",
        description:
          "Articles stay unnumbered in the editor, layout, and final book.",
      },
      automatic: {
        title: "Generate numbers automatically",
        description:
          "Set a prefix and digit count, such as NO-001.",
      },
      claim: {
        title: "Claim a number",
        description:
          "Authors claim one available number from the range you set.",
      },
    },
    prefix: "Number prefix",
    digits: "Number digits",
    example: "Example",
    claimRange: "Claimable number range",
    rangeHelp: "Each number in this inclusive range can be claimed once.",
    from: "From",
    to: "To",
  },
  zh: {
    modes: {
      none: {
        title: "不使用编号",
        description: "作者编辑、书籍排版和最终成书都不显示文章编号。",
      },
      automatic: {
        title: "自动生成编号",
        description: "设置编号前缀和位数，例如 NO-001。",
      },
      claim: {
        title: "认领编号模式",
        description: "作者从你设定的编号范围内认领一个可用编号。",
      },
    },
    prefix: "编号前缀",
    digits: "编号位数",
    example: "示例",
    claimRange: "可认领编号范围",
    rangeHelp: "范围内的每个编号只能被认领一次。",
    from: "从",
    to: "到",
  },
} as const;

const minClaimNumber = 1;
const maxClaimNumber = 999_999;

export function NumberingSettingsFields({
  language,
  onChange,
  value,
}: {
  language: Language;
  onChange: (value: NumberingSettingsValue) => void;
  value: NumberingSettingsValue;
}) {
  const pageCopy = copy[language];

  const selectMode = (mode: "none" | "automatic" | "claim") => {
    onChange({
      ...value,
      numberMode: mode === "claim" ? "existing" : mode,
    });
  };

  const updateRange = (field: "claimNumberStart" | "claimNumberEnd", raw: string) => {
    const next = Math.min(
      maxClaimNumber,
      Math.max(minClaimNumber, Math.trunc(Number(raw)) || minClaimNumber),
    );
    if (field === "claimNumberStart") {
      onChange({
        ...value,
        claimNumberStart: next,
        claimNumberEnd: Math.max(next, value.claimNumberEnd),
      });
      return;
    }
    onChange({
      ...value,
      claimNumberStart: Math.min(value.claimNumberStart, next),
      claimNumberEnd: next,
    });
  };

  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-3">
        {(["none", "automatic", "claim"] as const).map((mode) => {
          const modeCopy = pageCopy.modes[mode];
          const checked = mode === "claim"
            ? value.numberMode === "existing"
            : value.numberMode === mode;
          return (
            <label
              className={cn(
                "relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
                checked
                  ? "border-blue-500/50 bg-blue-500/[0.06]"
                  : "border-border hover:bg-muted/40",
              )}
              key={mode}
            >
              <input
                checked={checked}
                className="mt-1 accent-blue-600"
                name="number-mode"
                onChange={() => selectMode(mode)}
                type="radio"
              />
              <span>
                <span className="text-sm font-semibold">{modeCopy.title}</span>
                <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                  {modeCopy.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {value.numberMode === "automatic" ? (
        <div className="mt-5 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="number-prefix">{pageCopy.prefix}</Label>
            <Input
              id="number-prefix"
              maxLength={20}
              onChange={(event) =>
                onChange({ ...value, numberPrefix: event.target.value })
              }
              placeholder="NO-"
              value={value.numberPrefix}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number-digits">{pageCopy.digits}</Label>
            <Input
              id="number-digits"
              max={8}
              min={1}
              onChange={(event) =>
                onChange({
                  ...value,
                  numberDigits: Math.min(
                    8,
                    Math.max(1, Number(event.target.value) || 1),
                  ),
                })
              }
              type="number"
              value={value.numberDigits}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {pageCopy.example}: {" "}
            <code className="font-semibold text-foreground">
              {value.numberPrefix}
              {String(1).padStart(value.numberDigits, "0")}
            </code>
          </p>
        </div>
      ) : null}

      {value.numberMode === "existing" ? (
        <fieldset className="mt-5 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">{pageCopy.claimRange}</legend>
          <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">{pageCopy.rangeHelp}</p>
          <div className="space-y-2">
            <Label htmlFor="claim-number-start">{pageCopy.from}</Label>
            <Input
              id="claim-number-start"
              inputMode="numeric"
              max={maxClaimNumber}
              min={minClaimNumber}
              onChange={(event) => updateRange("claimNumberStart", event.target.value)}
              step={1}
              type="number"
              value={value.claimNumberStart}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="claim-number-end">{pageCopy.to}</Label>
            <Input
              id="claim-number-end"
              inputMode="numeric"
              max={maxClaimNumber}
              min={minClaimNumber}
              onChange={(event) => updateRange("claimNumberEnd", event.target.value)}
              step={1}
              type="number"
              value={value.claimNumberEnd}
            />
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
