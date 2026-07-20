import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  FileText,
  Hash,
  Image,
  Columns3,
  Pilcrow,
  ScanText,
  Type,
} from "lucide-react";

import type {
  Alignment,
  BookFormatSettings,
  FontSelection,
} from "@/components/dashboard/format-settings/format-settings-types";
import { FontPicker } from "@/components/dashboard/format-settings/font-picker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/i18n";
import type { SystemFontStatus } from "@/hooks/use-system-fonts";

const panelCopy = {
  en: {
    sections: {
      systemFontsError: "System fonts unavailable",
      title: "Article Title",
      numbering: "Numbering",
      body: "Body",
      images: "Images",
      page: "Page",
      presentation: "Publication details",
    },
    fields: {
      fontDenied: "Font access was not granted.",
      fontUnsupported: "Local fonts are not supported by this browser.",
      retryFonts: "Try Again",
      font: "Font",
      size: "Size",
      bold: "Bold",
      subtitleMode: "Subtitle rule",
      subtitleDisabled: "Subtitle unavailable",
      subtitleFixed: "Require the same subtitle",
      subtitleFree: "Allow custom subtitles",
      fixedSubtitle: "Required subtitle",
      fixedSubtitlePlaceholder: "Enter the subtitle used for every article",
      subtitleAlignment: "Subtitle align",
      alignment: "Alignment",
      titleSpacing: "Title spacing",
      showNumber: "Show number",
      numberPosition: "Number position",
      lineSpacing: "Line spacing",
      firstLineIndent: "First line indent",
      justify: "Justify text",
      allowImages: "Allow images",
      imageWidth: "Image width",
      paperSize: "Paper size",
      paperWidth: "Width",
      paperHeight: "Height",
      margin: "Margins",
      pageNumber: "Page number",
      numberingUnavailable: "Unavailable because this book does not use article numbers.",
      columns: "Columns",
      showHeader: "Show header",
      headerText: "Header text",
      showFooter: "Show footer",
      footerText: "Footer text",
      showAuthorMeta: "Show author and class",
      themeColor: "Text color",
      accentColor: "Accent color",
      imageRadius: "Image corner radius",
      imageBorder: "Image border",
      quoteStyle: "Quote styling",
      titleSurface: "Translucent title background",
      titleSurfaceOpacity: "Background opacity",
    },
    values: {
      above: "Above title",
      titleLeft: "Left of title",
      hidden: "Hidden",
      characters: "characters",
      narrow: "Narrow",
      normal: "Normal",
      wide: "Wide",
      bottomCenter: "Bottom center",
      bottomRight: "Bottom right",
      custom: "Custom",
      oneColumn: "Single column",
      twoColumns: "Two columns",
    },
  },
  zh: {
    sections: {
      systemFontsError: "系统字体读取失败",
      title: "文章标题",
      numbering: "编号",
      body: "正文",
      images: "图片",
      page: "页面",
      presentation: "出版细节",
    },
    fields: {
      fontDenied: "未获得系统字体访问权限。",
      fontUnsupported: "当前浏览器不支持读取本地字体。",
      retryFonts: "重试",
      font: "字体",
      size: "字号",
      bold: "加粗",
      showSubtitle: "显示副标题",
      subtitleAlignment: "副标题对齐",
      alignment: "对齐方式",
      titleSpacing: "标题正文间距",
      showNumber: "显示编号",
      numberPosition: "编号位置",
      lineSpacing: "行距",
      firstLineIndent: "首行缩进",
      justify: "两端对齐",
      allowImages: "允许图片",
      imageWidth: "图片宽度",
      paperSize: "纸张尺寸",
      paperWidth: "宽度",
      paperHeight: "高度",
      margin: "页边距",
      pageNumber: "页码位置",
      numberingUnavailable: "当前书籍选择了“我不需要编号”，编号格式不可用。",
      columns: "分栏布局",
      showHeader: "显示页眉",
      headerText: "页眉文字",
      showFooter: "显示页脚",
      footerText: "页脚文字",
      showAuthorMeta: "显示作者与班级",
      themeColor: "正文颜色",
      accentColor: "强调色",
      imageRadius: "图片圆角",
      imageBorder: "图片边框",
      quoteStyle: "引用样式",
      titleSurface: "标题半透明背景",
      titleSurfaceOpacity: "背景透明度",
    },
    values: {
      above: "标题上方",
      titleLeft: "标题左侧",
      hidden: "隐藏",
      characters: "字符",
      narrow: "窄",
      normal: "标准",
      wide: "宽",
      bottomCenter: "底部居中",
      bottomRight: "底部右侧",
      custom: "自定义",
      oneColumn: "单栏",
      twoColumns: "双栏",
    },
  },
} as const;

interface FormatPanelProps {
  fontOptions: FontSelection[];
  fontStatus: SystemFontStatus;
  language: Language;
  onLoadSystemFonts: () => void;
  onChange: <Key extends keyof BookFormatSettings>(
    key: Key,
    value: BookFormatSettings[Key],
  ) => void;
  settings: BookFormatSettings;
  numberingEnabled: boolean;
}

interface PanelSectionProps {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  disabled?: boolean;
}

function PanelSection({ children, disabled, icon: Icon, title }: PanelSectionProps) {
  return (
    <Card className={cn("border-border bg-card shadow-none", disabled && "bg-muted/20 opacity-65")}>
      <CardHeader className="flex-row items-center gap-2.5 space-y-0 border-b border-border px-4 py-3.5">
        <Icon className="size-4 text-blue-400" />
        <CardTitle className="text-sm text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4">{children}</CardContent>
    </Card>
  );
}

interface ControlRowProps {
  children: React.ReactNode;
  htmlFor?: string;
  label: string;
}

function ControlRow({ children, htmlFor, label }: ControlRowProps) {
  return (
    <div className="grid min-h-9 grid-cols-[minmax(0,1fr)_minmax(156px,210px)] items-center gap-3 sm:gap-4">
      <Label
        className="min-w-0 text-xs font-medium leading-5 text-muted-foreground"
        htmlFor={htmlFor}
      >
        {label}
      </Label>
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );
}

interface AlignmentControlProps {
  label: string;
  onChange: (value: Alignment) => void;
  value: Alignment;
}

const alignmentOptions = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
] as const;

function AlignmentControl({ label, onChange, value }: AlignmentControlProps) {
  return (
    <div
      aria-label={label}
      className="grid grid-cols-3 rounded-lg border border-border bg-muted/30 p-0.5"
      role="group"
    >
      {alignmentOptions.map(({ icon: Icon, value: option }) => (
        <button
          aria-label={`${label}: ${option}`}
          aria-pressed={value === option}
          className={cn(
            "flex h-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
            value === option && "bg-background text-blue-500 shadow-sm",
          )}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

export function FormatPanel({
  fontOptions,
  fontStatus,
  language,
  onLoadSystemFonts,
  onChange,
  settings,
  numberingEnabled,
}: FormatPanelProps) {
  const copy = panelCopy[language];
  const selectableFontOptions = Array.from(
    new Map(
      [settings.titleFont, settings.bodyFont, ...fontOptions].map((font) => [
        font.postscriptName,
        font,
      ]),
    ).values(),
  );
  const fontStatusText =
    fontStatus === "unsupported"
      ? copy.fields.fontUnsupported
      : copy.fields.fontDenied;
  const subtitleCopy =
    language === "zh"
      ? {
          disabled: "\u526f\u6807\u9898\u4e0d\u53ef\u7528",
          fixed: "\u5f3a\u5236\u4f7f\u7528\u76f8\u540c\u526f\u6807\u9898",
          free: "\u81ea\u7531\u4f7f\u7528\u526f\u6807\u9898",
          label: "\u526f\u6807\u9898\u89c4\u5219",
          placeholder: "\u8f93\u5165\u6bcf\u7bc7\u6587\u7ae0\u90fd\u4f7f\u7528\u7684\u526f\u6807\u9898",
          required: "\u7edf\u4e00\u526f\u6807\u9898",
        }
      : {
          disabled: "Subtitle unavailable",
          fixed: "Require the same subtitle",
          free: "Allow custom subtitles",
          label: "Subtitle rule",
          placeholder: "Enter the subtitle used for every article",
          required: "Required subtitle",
        };

  return (
    <div className="grid content-start gap-3">
      {(fontStatus === "denied" || fontStatus === "unsupported") && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <ScanText className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {copy.sections.systemFontsError}
              </p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">
                {fontStatusText}
              </p>
            </div>
          </div>
          {fontStatus === "denied" && (
            <button
              className="flex h-8 shrink-0 items-center rounded-lg border border-border bg-background px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
              onClick={onLoadSystemFonts}
              type="button"
            >
              {copy.fields.retryFonts}
            </button>
          )}
        </div>
      )}

      <PanelSection icon={Type} title={copy.sections.title}>
        <ControlRow label={copy.fields.font}>
          <FontPicker
            ariaLabel={copy.fields.font}
            fontOptions={selectableFontOptions}
            language={language}
            onOpen={fontStatus === "idle" ? onLoadSystemFonts : undefined}
            onValueChange={(value) => onChange("titleFont", value)}
            value={settings.titleFont}
          />
        </ControlRow>
        <ControlRow htmlFor="title-size" label={copy.fields.size}>
          <div className="relative">
            <Input
              className="h-9 rounded-lg border-input bg-background px-3 pr-10 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-blue-500/20"
              id="title-size"
              inputMode="numeric"
              max={72}
              min={6}
              onChange={(event) => onChange("titleSize", Number(event.target.value))}
              type="number"
              value={settings.titleSize}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              px
            </span>
          </div>
        </ControlRow>
        <ControlRow htmlFor="title-bold" label={copy.fields.bold}>
          <Switch
            aria-label={copy.fields.bold}
            checked={settings.titleBold}
            className="ml-auto"
            id="title-bold"
            onChange={(event) => onChange("titleBold", event.target.checked)}
          />
        </ControlRow>
        <ControlRow htmlFor="subtitle-mode" label={subtitleCopy.label}>
          <Select
            className="h-9 text-xs"
            id="subtitle-mode"
            onChange={(event) =>
              onChange(
                "subtitleMode",
                event.target.value as BookFormatSettings["subtitleMode"],
              )
            }
            value={settings.subtitleMode}
          >
            <option value="disabled">{subtitleCopy.disabled}</option>
            <option value="fixed">{subtitleCopy.fixed}</option>
            <option value="free">{subtitleCopy.free}</option>
          </Select>
        </ControlRow>
        {settings.subtitleMode === "fixed" && (
          <ControlRow htmlFor="fixed-subtitle" label={subtitleCopy.required}>
            <Input
              className="h-9 rounded-lg border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground"
              id="fixed-subtitle"
              onChange={(event) => onChange("fixedSubtitle", event.target.value)}
              placeholder={subtitleCopy.placeholder}
              value={settings.fixedSubtitle}
            />
          </ControlRow>
        )}
        {settings.subtitleMode !== "disabled" && (
          <ControlRow label={copy.fields.subtitleAlignment}>
            <AlignmentControl
              label={copy.fields.subtitleAlignment}
              onChange={(value) => onChange("subtitleAlign", value)}
              value={settings.subtitleAlign}
            />
          </ControlRow>
        )}
        <ControlRow label={copy.fields.alignment}>
          <AlignmentControl
            label={copy.fields.alignment}
            onChange={(value) => onChange("titleAlign", value)}
            value={settings.titleAlign}
          />
        </ControlRow>
        <ControlRow htmlFor="title-spacing" label={copy.fields.titleSpacing}>
          <div className="flex items-center gap-3">
            <Slider
              id="title-spacing"
              max={48}
              min={8}
              onChange={(event) =>
                onChange("titleSpacing", Number(event.target.value))
              }
              value={settings.titleSpacing}
            />
            <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
              {settings.titleSpacing}px
            </span>
          </div>
        </ControlRow>
      </PanelSection>

      <PanelSection disabled={!numberingEnabled} icon={Hash} title={copy.sections.numbering}>
        <fieldset className="grid gap-4 disabled:cursor-not-allowed" disabled={!numberingEnabled}>
          <ControlRow htmlFor="show-number" label={copy.fields.showNumber}>
            <Switch
              aria-label={copy.fields.showNumber}
              checked={numberingEnabled && settings.showNumber}
              className="ml-auto"
              id="show-number"
              onChange={(event) => onChange("showNumber", event.target.checked)}
            />
          </ControlRow>
          <ControlRow htmlFor="number-position" label={copy.fields.numberPosition}>
            <Select
              className="h-9 text-xs"
              id="number-position"
              onChange={(event) =>
                onChange(
                  "numberPosition",
                  event.target.value as BookFormatSettings["numberPosition"],
                )
              }
              value={settings.numberPosition}
            >
              <option value="above">{copy.values.above}</option>
              <option value="left">{copy.values.titleLeft}</option>
              <option value="hidden">{copy.values.hidden}</option>
            </Select>
          </ControlRow>
        </fieldset>
        {!numberingEnabled ? (
          <p className="text-[11px] leading-5 text-muted-foreground">
            {copy.fields.numberingUnavailable}
          </p>
        ) : null}
      </PanelSection>

      <PanelSection icon={Pilcrow} title={copy.sections.body}>
        <ControlRow label={copy.fields.font}>
          <FontPicker
            ariaLabel={copy.fields.font}
            fontOptions={selectableFontOptions}
            language={language}
            onOpen={fontStatus === "idle" ? onLoadSystemFonts : undefined}
            onValueChange={(value) => onChange("bodyFont", value)}
            value={settings.bodyFont}
          />
        </ControlRow>
        <ControlRow htmlFor="body-size" label={copy.fields.size}>
          <div className="relative">
            <Input
              className="h-9 rounded-lg border-input bg-background px-3 pr-10 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-blue-500/20"
              id="body-size"
              inputMode="numeric"
              max={48}
              min={6}
              onChange={(event) => onChange("bodySize", Number(event.target.value))}
              step={0.5}
              type="number"
              value={settings.bodySize}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              px
            </span>
          </div>
        </ControlRow>
        <ControlRow htmlFor="line-spacing" label={copy.fields.lineSpacing}>
          <Select
            className="h-9 text-xs"
            id="line-spacing"
            onChange={(event) =>
              onChange("lineHeight", Number(event.target.value))
            }
            value={settings.lineHeight}
          >
            {[1, 1.25, 1.35, 1.4, 1.5, 1.75, 2].map((spacing) => (
              <option key={spacing} value={spacing}>
                {spacing.toFixed(spacing === 1 || spacing === 2 ? 1 : 2)}
              </option>
            ))}
          </Select>
        </ControlRow>
        <ControlRow htmlFor="first-line-indent" label={copy.fields.firstLineIndent}>
          <Select
            className="h-9 text-xs"
            id="first-line-indent"
            onChange={(event) =>
              onChange("firstLineIndent", Number(event.target.value))
            }
            value={settings.firstLineIndent}
          >
            {[0, 1, 2, 4].map((indent) => (
              <option key={indent} value={indent}>
                {indent} {copy.values.characters}
              </option>
            ))}
          </Select>
        </ControlRow>
        <ControlRow htmlFor="justify-body" label={copy.fields.justify}>
          <div className="flex items-center justify-end gap-3">
            <AlignJustify className="size-3.5 text-muted-foreground" />
            <Switch
              aria-label={copy.fields.justify}
              checked={settings.justify}
              id="justify-body"
              onChange={(event) => onChange("justify", event.target.checked)}
            />
          </div>
        </ControlRow>
        <ControlRow htmlFor="quote-style" label={copy.fields.quoteStyle}>
          <Switch
            aria-label={copy.fields.quoteStyle}
            checked={settings.quoteStyle}
            className="ml-auto"
            id="quote-style"
            onChange={(event) => onChange("quoteStyle", event.target.checked)}
          />
        </ControlRow>
      </PanelSection>

      <PanelSection icon={Image} title={copy.sections.images}>
        <ControlRow htmlFor="allow-images" label={copy.fields.allowImages}>
          <Switch
            aria-label={copy.fields.allowImages}
            checked={settings.allowImages}
            className="ml-auto"
            id="allow-images"
            onChange={(event) => onChange("allowImages", event.target.checked)}
          />
        </ControlRow>
        {settings.allowImages && (
          <ControlRow htmlFor="image-width" label={copy.fields.imageWidth}>
            <div className="flex items-center gap-3">
              <Slider
                id="image-width"
                max={100}
                min={20}
                onChange={(event) =>
                  onChange("imageMaxWidth", Number(event.target.value))
                }
                value={settings.imageMaxWidth}
              />
              <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
                {settings.imageMaxWidth}%
              </span>
            </div>
          </ControlRow>
        )}
      </PanelSection>

      <PanelSection icon={FileText} title={copy.sections.page}>
        <ControlRow htmlFor="paper-size" label={copy.fields.paperSize}>
          <Select
            className="h-9 text-xs"
            id="paper-size"
            onChange={(event) =>
              onChange("pageSize", event.target.value as BookFormatSettings["pageSize"])
            }
            value={settings.pageSize}
          >
            <option value="a4">A4</option>
            <option value="a5">A5</option>
            <option value="b5">B5</option>
            <option value="custom">{copy.values.custom}</option>
          </Select>
        </ControlRow>
        {settings.pageSize === "custom" && (
          <>
            <ControlRow htmlFor="paper-width" label={copy.fields.paperWidth}>
              <div className="relative">
                <Input
                  className="h-9 rounded-lg border-input bg-background px-3 pr-10 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  id="paper-width"
                  max={420}
                  min={80}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (value > 0) onChange("customPageWidth", value);
                  }}
                  type="number"
                  value={settings.customPageWidth}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  mm
                </span>
              </div>
            </ControlRow>
            <ControlRow htmlFor="paper-height" label={copy.fields.paperHeight}>
              <div className="relative">
                <Input
                  className="h-9 rounded-lg border-input bg-background px-3 pr-10 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-blue-500/20"
                  id="paper-height"
                  max={594}
                  min={80}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (value > 0) onChange("customPageHeight", value);
                  }}
                  type="number"
                  value={settings.customPageHeight}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  mm
                </span>
              </div>
            </ControlRow>
          </>
        )}
        <ControlRow htmlFor="page-margin" label={copy.fields.margin}>
          <Select
            className="h-9 text-xs"
            id="page-margin"
            onChange={(event) =>
              onChange("pageMargin", event.target.value as BookFormatSettings["pageMargin"])
            }
            value={settings.pageMargin}
          >
            <option value="narrow">{copy.values.narrow}</option>
            <option value="normal">{copy.values.normal}</option>
            <option value="wide">{copy.values.wide}</option>
          </Select>
        </ControlRow>
        <ControlRow htmlFor="page-number" label={copy.fields.pageNumber}>
          <Select
            className="h-9 text-xs"
            id="page-number"
            onChange={(event) =>
              onChange(
                "pageNumberPosition",
                event.target.value as BookFormatSettings["pageNumberPosition"],
              )
            }
            value={settings.pageNumberPosition}
          >
            <option value="center">{copy.values.bottomCenter}</option>
            <option value="right">{copy.values.bottomRight}</option>
            <option value="hidden">{copy.values.hidden}</option>
          </Select>
        </ControlRow>
      </PanelSection>

      <PanelSection icon={Columns3} title={copy.sections.presentation}>
        <ControlRow htmlFor="columns" label={copy.fields.columns}>
          <Select
            className="h-9 text-xs"
            id="columns"
            onChange={(event) =>
              onChange("columns", Number(event.target.value) as 1 | 2)
            }
            value={settings.columns}
          >
            <option value={1}>{copy.values.oneColumn}</option>
            <option value={2}>{copy.values.twoColumns}</option>
          </Select>
        </ControlRow>
        <ControlRow htmlFor="theme-color" label={copy.fields.themeColor}>
          <Input
            className="h-9 rounded-lg border-input bg-background px-2 text-xs"
            id="theme-color"
            onChange={(event) => onChange("themeColor", event.target.value)}
            type="color"
            value={settings.themeColor}
          />
        </ControlRow>
        <ControlRow htmlFor="accent-color" label={copy.fields.accentColor}>
          <Input
            className="h-9 rounded-lg border-input bg-background px-2 text-xs"
            id="accent-color"
            onChange={(event) => onChange("accentColor", event.target.value)}
            type="color"
            value={settings.accentColor}
          />
        </ControlRow>
        <ControlRow htmlFor="show-header" label={copy.fields.showHeader}>
          <Switch
            aria-label={copy.fields.showHeader}
            checked={settings.showHeader}
            className="ml-auto"
            id="show-header"
            onChange={(event) => onChange("showHeader", event.target.checked)}
          />
        </ControlRow>
        {settings.showHeader && (
          <ControlRow htmlFor="header-text" label={copy.fields.headerText}>
            <Input
              className="h-9 rounded-lg border-input bg-background px-3 text-xs text-foreground"
              id="header-text"
              onChange={(event) => onChange("headerText", event.target.value)}
              value={settings.headerText}
            />
          </ControlRow>
        )}
        <ControlRow htmlFor="show-footer" label={copy.fields.showFooter}>
          <Switch
            aria-label={copy.fields.showFooter}
            checked={settings.showFooter}
            className="ml-auto"
            id="show-footer"
            onChange={(event) => onChange("showFooter", event.target.checked)}
          />
        </ControlRow>
        {settings.showFooter && (
          <ControlRow htmlFor="footer-text" label={copy.fields.footerText}>
            <Input
              className="h-9 rounded-lg border-input bg-background px-3 text-xs text-foreground"
              id="footer-text"
              onChange={(event) => onChange("footerText", event.target.value)}
              value={settings.footerText}
            />
          </ControlRow>
        )}
        <ControlRow htmlFor="show-author-meta" label={copy.fields.showAuthorMeta}>
          <Switch
            aria-label={copy.fields.showAuthorMeta}
            checked={settings.showAuthorMeta}
            className="ml-auto"
            id="show-author-meta"
            onChange={(event) => onChange("showAuthorMeta", event.target.checked)}
          />
        </ControlRow>
        <ControlRow htmlFor="title-surface" label={copy.fields.titleSurface}>
          <Switch
            aria-label={copy.fields.titleSurface}
            checked={settings.titleSurfaceEnabled}
            className="ml-auto"
            id="title-surface"
            onChange={(event) =>
              onChange("titleSurfaceEnabled", event.target.checked)
            }
          />
        </ControlRow>
        {settings.titleSurfaceEnabled && (
          <ControlRow
            htmlFor="title-surface-opacity"
            label={copy.fields.titleSurfaceOpacity}
          >
            <div className="flex items-center gap-3">
              <Slider
                id="title-surface-opacity"
                max={100}
                min={0}
                onChange={(event) =>
                  onChange(
                    "titleSurfaceOpacity",
                    Number(event.target.value),
                  )
                }
                step={5}
                value={settings.titleSurfaceOpacity}
              />
              <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
                {settings.titleSurfaceOpacity}%
              </span>
            </div>
          </ControlRow>
        )}
        <ControlRow htmlFor="image-radius" label={copy.fields.imageRadius}>
          <div className="flex items-center gap-3">
            <Slider
              id="image-radius"
              max={24}
              min={0}
              onChange={(event) => onChange("imageRadius", Number(event.target.value))}
              value={settings.imageRadius}
            />
            <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
              {settings.imageRadius}px
            </span>
          </div>
        </ControlRow>
        <ControlRow htmlFor="image-border" label={copy.fields.imageBorder}>
          <Switch
            aria-label={copy.fields.imageBorder}
            checked={settings.imageBorder}
            className="ml-auto"
            id="image-border"
            onChange={(event) => onChange("imageBorder", event.target.checked)}
          />
        </ControlRow>
      </PanelSection>
    </div>
  );
}
