import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  BookOpenText,
  Check,
  Download,
  Eye,
  FileImage,
  FileOutput,
  FileText,
  Image,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getTemplateCatalogEntry } from "@/mock/template-catalog";
import { ApiError } from "@/repositories/apiClient";
import { bookRepository, type Book } from "@/repositories/bookRepository";
import {
  exportRepository,
  type ExportPreview,
  type ExportResult,
} from "@/repositories/exportRepository";

type GenerationStatus = "idle" | "generating" | "success" | "error";
type PreviewRenderStatus = "idle" | "rendering" | "success" | "error";

const copy = {
  en: {
    eyebrow: "Final publication",
    title: "Export PDF",
    description:
      "Combine the current Template, Layout, and approved articles into a print-ready book.",
    config: "Export settings",
    format: "Export format",
    futureFormat: "EPUB can be added later",
    pageSize: "Page size",
    readOnly: "Read only",
    content: "Export content",
    contentHint: "Automatically controlled by Book Layout",
    stats: "Export statistics",
    articles: "Main content",
    pages: "Estimated pages",
    images: "Images",
    lastUpdated: "Last updated",
    publication: "Publication information",
    book: "Book",
    bookTitle: "Title",
    owner: "Owner",
    summary: "Description",
    noSummary: "No description",
    createdAt: "Created",
    template: "Template",
    font: "Font",
    fontSize: "Body size",
    margin: "Page margin",
    imageWidth: "Image width",
    numbering: "Numbering",
    preset: "Publishing template",
    columns: "Layout",
    articlePagination: "Article pagination",
    headerFooter: "Header / footer",
    colors: "Colors",
    flow: "Publication order",
    flowHint: "Read directly from the current Book Layout",
    preview: "PDF Preview",
    previewHint: "Render the current book only when you need to inspect its actual pages.",
    renderPreview: "Render actual pages",
    renderingPreview: "Rendering actual pages...",
    previewReady: "Actual PDF preview",
    previewFailed: "Unable to render the PDF preview.",
    previewRetryHint: "Try rendering the preview again.",
    renderAgain: "Render again",
    previewFrameTitle: "Rendered book PDF preview",
    page: "Page",
    placeholder: "Publication preview",
    generate: "Generate PDF",
    generating: "Generating PDF...",
    generatingHint: "Please wait...",
    download: "Download PDF",
    generated: "PDF generated successfully",
    generatedPages: (count: number) => `${count} pages ready to download`,
    exportFailed: "Export failed.",
    retryHint: "Please try again later.",
    retry: "Retry",
    emptyTitle: "No publishable content.",
    emptyDescription: "Approve an article or upload a valid publication file first.",
    coverWarning: "No cover is set. The default cover will be used.",
    loadError: "Unable to load export data.",
    loadErrorHint: "Please confirm that the backend is running.",
    reload: "Reload",
    downloading: "Preparing download...",
    sections: {
      cover: "Cover",
      preface: "Preface",
      articles: "Main content",
      afterword: "Afterword",
      acknowledgement: "Acknowledgements",
      back_cover: "Back cover",
    },
  },
  zh: {
    eyebrow: "最终出版",
    title: "导出 PDF",
    description: "将当前 Template、Layout 与审核通过的文章组合成可直接打印的完整书籍。",
    config: "导出配置",
    format: "导出格式",
    futureFormat: "未来可扩展 EPUB",
    pageSize: "页面大小",
    readOnly: "只读",
    content: "导出内容",
    contentHint: "完全由书籍排版自动决定",
    stats: "导出统计",
    articles: "正文",
    pages: "预计页数",
    images: "图片",
    lastUpdated: "最后更新时间",
    publication: "出版信息",
    book: "书籍",
    bookTitle: "书名",
    owner: "负责人",
    summary: "简介",
    noSummary: "暂无简介",
    createdAt: "创建时间",
    template: "Template 信息",
    font: "字体",
    fontSize: "正文字号",
    margin: "页边距",
    imageWidth: "图片宽度",
    numbering: "编号样式",
    preset: "出版模板",
    columns: "分栏布局",
    articlePagination: "文章分页",
    headerFooter: "页眉 / 页脚",
    colors: "配色",
    flow: "导出流程",
    flowHint: "直接读取当前书籍排版顺序",
    preview: "PDF 预览",
    previewHint: "仅在需要检查实际排版页面时，再开始渲染当前书籍。",
    renderPreview: "渲染实际页面",
    renderingPreview: "正在渲染实际页面……",
    previewReady: "实际 PDF 预览",
    previewFailed: "无法渲染 PDF 预览。",
    previewRetryHint: "请重新尝试渲染预览。",
    renderAgain: "重新渲染",
    previewFrameTitle: "已渲染的书籍 PDF 预览",
    page: "第",
    placeholder: "出版预览",
    generate: "生成 PDF",
    generating: "正在生成 PDF……",
    generatingHint: "请稍候……",
    download: "下载 PDF",
    generated: "PDF 生成成功",
    generatedPages: (count: number) => `共 ${count} 页，可以下载`,
    exportFailed: "导出失败。",
    retryHint: "请稍后重试。",
    retry: "重试",
    emptyTitle: "暂无可出版内容。",
    emptyDescription: "请先审核通过文章，或上传有效的出版文件。",
    coverWarning: "未设置封面。将使用默认封面。",
    loadError: "无法加载导出数据。",
    loadErrorHint: "请确认后端正在运行。",
    reload: "重新加载",
    downloading: "正在准备下载……",
    sections: {
      cover: "封面",
      preface: "前言",
      articles: "正文",
      afterword: "后记",
      acknowledgement: "致谢",
      back_cover: "封底",
    },
  },
} as const;

const fixedContentSections = [
  "cover",
  "preface",
  "articles",
  "afterword",
  "acknowledgement",
  "back_cover",
] as const;

interface ExportPageProps {
  basePath: string;
  bookId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

export function ExportPage({
  basePath,
  bookId,
  language,
  onNavigate,
  onToggleLanguage,
}: ExportPageProps) {
  const pageCopy = copy[language];
  const [book, setBook] = useState<Book | null>(null);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [result, setResult] = useState<ExportResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewRenderStatus, setPreviewRenderStatus] =
    useState<PreviewRenderStatus>("idle");
  const [previewRenderError, setPreviewRenderError] = useState<string | null>(null);
  const [renderedPreviewUrl, setRenderedPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    setIsLoading(true);
    setHasLoadError(false);
    setResult(null);
    setGenerationError(null);
    setGenerationStatus("idle");
    setPreviewRenderStatus("idle");
    setPreviewRenderError(null);
    setRenderedPreviewUrl(null);
    Promise.all([
      bookRepository.get(bookId),
      exportRepository.getPreview(bookId, {
        preflight: false,
        signal: controller.signal,
      }),
    ])
      .then(([loadedBook, loadedPreview]) => {
        if (!active) return;
        setBook(loadedBook);
        setPreview(loadedPreview);
      })
      .catch(() => active && setHasLoadError(true))
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [bookId, reloadKey]);

  useEffect(
    () => () => {
      if (renderedPreviewUrl) URL.revokeObjectURL(renderedPreviewUrl);
    },
    [renderedPreviewUrl],
  );

  const createExport = useCallback(async () => {
    if (!preview?.can_export) return;
    setGenerationStatus("generating");
    setResult(null);
    setGenerationError(null);
    try {
      const generated = await exportRepository.generate(bookId);
      setResult(generated);
      setGenerationStatus("success");
      return generated;
    } catch (error) {
      setGenerationError(localizedApiError(error, language));
      setGenerationStatus("error");
      throw error;
    }
  }, [bookId, language, preview?.can_export]);

  const generate = useCallback(async () => {
    setRenderedPreviewUrl(null);
    setPreviewRenderStatus("idle");
    setPreviewRenderError(null);
    try {
      await createExport();
    } catch {
      // The generation message already contains the localized error.
    }
  }, [createExport]);

  const renderPreview = useCallback(async () => {
    setPreviewRenderStatus("rendering");
    setPreviewRenderError(null);
    try {
      const generated = renderedPreviewUrl ? await createExport() : result ?? await createExport();
      if (!generated) return;
      const blob = await exportRepository.download(generated.download_url);
      setRenderedPreviewUrl(URL.createObjectURL(blob));
      setPreviewRenderStatus("success");
    } catch (error) {
      setPreviewRenderError(localizedApiError(error, language));
      setPreviewRenderStatus("error");
    }
  }, [createExport, language, renderedPreviewUrl, result]);

  const download = useCallback(async () => {
    if (!result) return;
    setIsDownloading(true);
    try {
      const blob = await exportRepository.download(result.download_url);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${book?.title || "openclassbook"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }, [book?.title, result]);

  const shellProps = {
    activeSection: "Export" as const,
    basePath,
    bookTitle: book?.title,
    language,
    onNavigate,
    onToggleLanguage,
    ownerName: book?.owner_name,
  };

  if (isLoading) {
    return (
      <DashboardLayout {...shellProps}>
        <ExportSkeleton />
      </DashboardLayout>
    );
  }

  if (hasLoadError || !book || !preview) {
    return (
      <DashboardLayout {...shellProps}>
        <StateCard
          description={pageCopy.loadErrorHint}
          onAction={() => setReloadKey((current) => current + 1)}
          action={pageCopy.reload}
          title={pageCopy.loadError}
        />
      </DashboardLayout>
    );
  }

  const localizedWarnings =
    language === "zh" ? preview.warnings_zh : preview.warnings;

  return (
    <DashboardLayout {...shellProps}>
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">
            {pageCopy.eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
            {pageCopy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {pageCopy.description}
          </p>
        </div>
        <Badge className="w-fit border-blue-500/25 bg-blue-500/10 text-blue-300">
          PDF
        </Badge>
      </div>

      {!preview.can_export ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-4">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-foreground">{pageCopy.emptyTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {pageCopy.emptyDescription}
            </p>
          </div>
        </div>
      ) : null}

      {localizedWarnings.length ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <Image className="size-4 shrink-0 text-amber-400" />
          <ul className="space-y-1">
            {localizedWarnings.map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <ExportConfig language={language} preview={preview} />
        <PublicationInfo book={book} language={language} preview={preview} />
        <PdfPreview
          canRender={preview.can_export}
          generationStatus={generationStatus}
          language={language}
          onRender={() => void renderPreview()}
          previewError={previewRenderError}
          previewUrl={renderedPreviewUrl}
          status={previewRenderStatus}
        />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <GenerationMessage
            language={language}
            errorMessage={generationError}
            result={result}
            status={generationStatus}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            {generationStatus === "error" ? (
              <Button className="h-10 rounded-lg px-5" onClick={() => void generate()}>
                <RefreshCw className="mr-2 size-4" />
                {pageCopy.retry}
              </Button>
            ) : (
              <Button
                className="h-10 rounded-lg px-5"
                disabled={!preview.can_export || generationStatus === "generating"}
                onClick={() => void generate()}
              >
                {generationStatus === "generating" ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                {generationStatus === "generating"
                  ? pageCopy.generating
                  : pageCopy.generate}
              </Button>
            )}
            <Button
              className="h-10 rounded-lg px-5"
              disabled={!result || isDownloading}
              onClick={() => void download()}
              variant="outline"
            >
              {isDownloading ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : (
                <Download className="mr-2 size-4" />
              )}
              {isDownloading ? pageCopy.downloading : pageCopy.download}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ExportConfig({
  language,
  preview,
}: {
  language: Language;
  preview: ExportPreview;
}) {
  const pageCopy = copy[language];
  const availablePresets = useMemo(
    () => new Set(preview.sections.map((section) => section.preset)),
    [preview.sections],
  );
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <SectionHeading icon={FileOutput} title={pageCopy.config} />
      <div className="mt-5 space-y-5">
        <div>
          <MetaLabel>{pageCopy.format}</MetaLabel>
          <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-muted/25 px-3 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="size-4 text-rose-400" /> PDF
            </span>
            <Badge className="border-border bg-muted text-muted-foreground">
              {pageCopy.readOnly}
            </Badge>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{pageCopy.futureFormat}</p>
        </div>
        <InfoRow
          label={pageCopy.pageSize}
          value={preview.template.page_size.toUpperCase()}
        />
        <div className="border-t border-border pt-5">
          <MetaLabel>{pageCopy.content}</MetaLabel>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {pageCopy.contentHint}
          </p>
          <div className="mt-3 space-y-2">
            {fixedContentSections.map((preset) => {
              const included = availablePresets.has(preset);
              return (
                <div
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs",
                    included ? "bg-muted/35 text-foreground" : "text-muted-foreground/50",
                  )}
                  key={preset}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border",
                      included
                        ? "border-blue-500/40 bg-blue-500/15 text-blue-300"
                        : "border-border",
                    )}
                  >
                    {included ? <Check className="size-3" /> : null}
                  </span>
                  {pageCopy.sections[preset]}
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t border-border pt-5">
          <MetaLabel>{pageCopy.stats}</MetaLabel>
          <div className="mt-3 space-y-3">
            <InfoRow label={pageCopy.articles} value={`${preview.stats.article_count}`} />
            <InfoRow
              label={pageCopy.pages}
              value={`${preview.stats.estimated_page_count}`}
            />
            <InfoRow label={pageCopy.images} value={`${preview.stats.image_count}`} />
            <InfoRow
              label={pageCopy.lastUpdated}
              value={formatDate(preview.stats.last_updated, language)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicationInfo({
  book,
  language,
  preview,
}: {
  book: Book;
  language: Language;
  preview: ExportPreview;
}) {
  const pageCopy = copy[language];
  const visualTemplate = getTemplateCatalogEntry(preview.template.template_id);
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <SectionHeading icon={BookOpenText} title={pageCopy.publication} />
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <InfoBlock title={pageCopy.book}>
          <InfoRow label={pageCopy.bookTitle} value={book.title} />
          <InfoRow label={pageCopy.owner} value={book.owner_name} />
          <InfoRow label={pageCopy.summary} value={book.description || pageCopy.noSummary} />
          <InfoRow label={pageCopy.createdAt} value={formatDate(book.created_at, language)} />
          <InfoRow
            label={pageCopy.lastUpdated}
            value={formatDate(book.updated_at, language)}
          />
        </InfoBlock>
        <InfoBlock title={pageCopy.template}>
          <InfoRow
            label={pageCopy.preset}
            value={visualTemplate.name[language]}
          />
          <InfoRow
            label={pageCopy.columns}
            value={preview.template.columns === 2 ? (language === "zh" ? "双栏" : "Two columns") : (language === "zh" ? "单栏" : "Single column")}
          />
          <InfoRow
            label={pageCopy.articlePagination}
            value={
              preview.template.article_page_mode === "flow"
                ? language === "zh" ? "文章连续排版" : "Continuous flow"
                : language === "zh" ? "每篇文章新页" : "New page per article"
            }
          />
          <InfoRow label={pageCopy.font} value={preview.template.font} />
          <InfoRow label={pageCopy.fontSize} value={`${preview.template.font_size} pt`} />
          <InfoRow
            label={pageCopy.margin}
            value={formatOption(preview.template.page_margin, language)}
          />
          <InfoRow label={pageCopy.imageWidth} value={`${preview.template.image_width}%`} />
          <InfoRow
            label={pageCopy.headerFooter}
            value={
              preview.template.show_header || preview.template.show_footer
                ? language === "zh" ? "已启用" : "Enabled"
                : language === "zh" ? "未启用" : "Disabled"
            }
          />
          <InfoRow
            label={pageCopy.colors}
            value={`${preview.template.theme_color} / ${preview.template.accent_color}`}
          />
          <InfoRow
            label={pageCopy.numbering}
            value={formatOption(preview.template.numbering_style, language)}
          />
        </InfoBlock>
      </div>
      <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{pageCopy.flow}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">{pageCopy.flowHint}</p>
          </div>
          <Badge className="border-border bg-muted text-muted-foreground">
            Layout
          </Badge>
        </div>
        <div className="mt-5 flex flex-col items-center">
          {preview.sections.map((section, index) => (
            <div className="flex w-full flex-col items-center" key={section.id}>
              <div className="flex w-full max-w-sm items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                {section.kind === "articles" ? (
                  <BookOpenText className="size-4 text-blue-400" />
                ) : (
                  <FileImage className="size-4 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-foreground">
                  {language === "zh" ? section.label_zh : section.label_en}
                </span>
              </div>
              {index < preview.sections.length - 1 ? (
                <ArrowDown className="my-1.5 size-3.5 text-muted-foreground" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PdfPreview({
  canRender,
  generationStatus,
  language,
  onRender,
  previewError,
  previewUrl,
  status,
}: {
  canRender: boolean;
  generationStatus: GenerationStatus;
  language: Language;
  onRender: () => void;
  previewError: string | null;
  previewUrl: string | null;
  status: PreviewRenderStatus;
}) {
  const pageCopy = copy[language];
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <SectionHeading icon={FilesIcon} title={pageCopy.preview} />
      <p className="mt-2 text-[11px] text-muted-foreground">{pageCopy.previewHint}</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted/20">
        {previewUrl ? (
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
              <p className="text-xs font-medium text-foreground">{pageCopy.previewReady}</p>
              <Button
                className="h-8 px-3 text-xs"
                disabled={status === "rendering" || generationStatus === "generating"}
                onClick={onRender}
                variant="outline"
              >
                {status === "rendering" ? (
                  <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 size-3.5" />
                )}
                {pageCopy.renderAgain}
              </Button>
            </div>
            <iframe
              className="h-[720px] w-full bg-[#525659]"
              src={previewUrl}
              title={pageCopy.previewFrameTitle}
            />
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400">
              {status === "rendering" ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <Eye className="size-5" />
              )}
            </span>
            <p className="mt-4 text-sm font-medium text-foreground">
              {status === "rendering" ? pageCopy.renderingPreview : pageCopy.renderPreview}
            </p>
            {status === "error" ? (
              <p className="mt-2 max-w-xs text-xs leading-5 text-rose-400">
                {pageCopy.previewFailed} {previewError || pageCopy.previewRetryHint}
              </p>
            ) : (
              <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
                {pageCopy.previewHint}
              </p>
            )}
            <Button
              className="mt-5 h-9 rounded-lg px-4"
              disabled={
                !canRender || status === "rendering" || generationStatus === "generating"
              }
              onClick={onRender}
            >
              {status === "rendering" ? (
                <LoaderCircle className="mr-2 size-4 animate-spin" />
              ) : status === "error" ? (
                <RefreshCw className="mr-2 size-4" />
              ) : (
                <Eye className="mr-2 size-4" />
              )}
              {status === "rendering" ? pageCopy.renderingPreview : pageCopy.renderPreview}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function localizedApiError(error: unknown, language: Language) {
  if (!(error instanceof ApiError)) return null;
  return language === "zh" ? error.detail?.message_zh ?? null : error.detail?.message ?? null;
}

function GenerationMessage({
  errorMessage,
  language,
  result,
  status,
}: {
  errorMessage: string | null;
  language: Language;
  result: ExportResult | null;
  status: GenerationStatus;
}) {
  const pageCopy = copy[language];
  if (status === "generating") {
    return (
      <div>
        <p className="text-sm font-medium text-foreground">{pageCopy.generating}</p>
        <p className="mt-1 text-xs text-muted-foreground">{pageCopy.generatingHint}</p>
      </div>
    );
  }
  if (status === "success" && result) {
    return (
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
          <Check className="size-4" /> {pageCopy.generated}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {pageCopy.generatedPages(result.page_count)}
        </p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div>
        <p className="text-sm font-medium text-rose-400">{pageCopy.exportFailed}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {errorMessage || pageCopy.retryHint}
        </p>
      </div>
    );
  }
  return <span className="text-xs text-muted-foreground">PDF · OpenClassBook</span>;
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: typeof FileOutput;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
        <Icon className="size-4" />
      </span>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function InfoBlock({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="mb-3 text-xs font-semibold text-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function StateCard({
  action,
  description,
  onAction,
  title,
}: {
  action: string;
  description: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <div className="mx-auto mt-20 max-w-lg rounded-xl border border-border bg-card px-7 py-12 text-center">
      <AlertCircle className="mx-auto size-5 text-rose-400" />
      <h1 className="mt-5 text-lg font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <Button className="mt-6 h-9 rounded-lg px-4 text-xs" onClick={onAction}>
        <RefreshCw className="mr-2 size-3.5" /> {action}
      </Button>
    </div>
  );
}

function ExportSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-44 rounded bg-muted" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-muted/70" />
      <div className="mt-8 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        {[1, 2, 3].map((item) => (
          <div className="h-[620px] rounded-xl border border-border bg-card" key={item} />
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOption(value: string, language: Language) {
  const labels: Record<string, Record<Language, string>> = {
    narrow: { en: "Narrow", zh: "窄" },
    normal: { en: "Normal", zh: "常规" },
    wide: { en: "Wide", zh: "宽" },
    above: { en: "Above title", zh: "标题上方" },
    left: { en: "Left of title", zh: "标题左侧" },
    hidden: { en: "Hidden", zh: "隐藏" },
  };
  return labels[value]?.[language] ?? value;
}

const FilesIcon = FileText;
