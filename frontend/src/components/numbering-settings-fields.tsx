import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readArticleNumberFile } from "@/lib/article-numbers";
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
      import: {
        title: "Import number pool",
        description:
          "Authors choose from numbers imported by the administrator.",
      },
    },
    recommended: "Recommended",
    prefix: "Number prefix",
    digits: "Number digits",
    example: "Example",
    chooseFile: "Choose number file",
    replaceFile: "Replace number file",
    imported: (count: number) => `${count} unique numbers imported`,
    fileHelp: "One number per row is recommended. Up to 2,000 numbers.",
    fileError: "This file could not be read. Check its format and duplicate values.",
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
      import: {
        title: "导入编号池",
        description: "作者只能从管理员导入的编号池中认领。",
      },
    },
    recommended: "推荐",
    prefix: "编号前缀",
    digits: "编号位数",
    example: "示例",
    chooseFile: "选择编号文件",
    replaceFile: "替换编号文件",
    imported: (count: number) => `已导入 ${count} 个不重复编号`,
    fileHelp: "建议每行一个编号，最多 2,000 个。",
    fileError: "无法读取该文件，请检查格式及重复编号。",
  },
} as const;

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);
  const [fileError, setFileError] = useState(false);

  const selectMode = (mode: "none" | "automatic" | "import") => {
    setFileError(false);
    onChange({
      ...value,
      existingNumberMode: mode === "import" ? "import" : value.existingNumberMode,
      numberMode: mode === "import" ? "existing" : mode,
    });
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setIsReading(true);
    setFileError(false);
    try {
      const numberPool = await readArticleNumberFile(file);
      onChange({
        ...value,
        existingNumberMode: "import",
        numberMode: "existing",
        numberPool,
      });
    } catch {
      setFileError(true);
    } finally {
      setIsReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-3">
        {(["none", "automatic", "import"] as const).map((mode) => {
          const modeCopy = pageCopy.modes[mode];
          const checked = mode === "import"
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
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {modeCopy.title}
                  {mode === "import" ? (
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] text-blue-500">
                      {pageCopy.recommended}
                    </span>
                  ) : null}
                </span>
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
        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-dashed border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  {value.numberPool.length ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <FileSpreadsheet className="size-4" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {value.numberPool.length
                      ? pageCopy.imported(value.numberPool.length)
                      : pageCopy.fileHelp}
                  </p>
                  {value.numberPool.length ? (
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                      {value.numberPool.slice(0, 5).join(" · ")}
                      {value.numberPool.length > 5 ? " …" : ""}
                    </p>
                  ) : null}
                  {fileError ? (
                    <p className="mt-1 text-xs text-rose-500" role="alert">
                      {pageCopy.fileError}
                    </p>
                  ) : null}
                </div>
              </div>
              <input
                accept=".xlsx,.csv,.txt"
                className="hidden"
                onChange={(event) => void importFile(event.target.files?.[0])}
                ref={inputRef}
                type="file"
              />
              <Button
                className="shrink-0"
                disabled={isReading}
                onClick={() => inputRef.current?.click()}
                type="button"
                variant="outline"
              >
                {isReading ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}
                {value.numberPool.length
                  ? pageCopy.replaceFile
                  : pageCopy.chooseFile}
              </Button>
        </div>
      ) : null}
    </div>
  );
}
