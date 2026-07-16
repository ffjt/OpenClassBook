import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Hash, ImagePlus, RefreshCw, Trash2, Type, WrapText } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTemplate } from "@/hooks/use-template";
import type { Language } from "@/lib/i18n";
import type { ImageWrap, PreviewArticle } from "@/types/article";

const editorCopy = {
  en: {
    imageWrap: "Text wrapping",
    square: "Square",
    tight: "Tight",
    through: "Through",
    topBottom: "Top and bottom",
    behindText: "Behind text",
    inFrontOfText: "In front of text",
    title: "Article Editor",
    description: "Write your story. The book template controls its appearance.",
    number: "Article Number",
    numberHint: "Unique within this book",
    numberUnavailable: "Not used by this book",
    numberPending: "Assigned later in book layout",
    articleTitle: "Article Title",
    articleTitlePlaceholder: "Enter an article title",
    subtitle: "Subtitle",
    subtitlePlaceholder: "Enter an article subtitle",
    body: "Article Body",
    bodyPlaceholder: "Write your article here...",
    image: "Article Image",
    upload: "Upload Image",
    uploadHint: "Click to choose or drop an image here",
    uploadNote: "JPG/JPEG, PNG, WebP, GIF, AVIF, SVG or BMP · Up to 10 MB",
    replace: "Replace",
    remove: "Remove",
    imageReady: "Image ready",
    invalidType: "Please choose a JPG/JPEG, PNG, WebP, GIF, AVIF, SVG or BMP image.",
    fileTooLarge: "The image must be no larger than 10 MB.",
    readFailed: "The image could not be read. Please try another file.",
  },
  zh: {
    imageWrap: "\u6587\u5b57\u73af\u7ed5",
    square: "\u56db\u5468\u578b",
    tight: "\u7d27\u5bc6\u578b",
    through: "\u7a7f\u8d8a\u578b",
    topBottom: "\u4e0a\u4e0b\u578b",
    behindText: "\u886c\u4e8e\u6587\u5b57\u4e0b\u65b9",
    inFrontOfText: "\u6d6e\u4e8e\u6587\u5b57\u4e0a\u65b9",
    title: "\u6587\u7ae0\u7f16\u8f91\u5668",
    description: "\u53ea\u9700\u4e13\u6ce8\u4e66\u5199\uff0c\u4e66\u7c4d\u6a21\u677f\u4f1a\u7edf\u4e00\u63a7\u5236\u6587\u7ae0\u6837\u5f0f\u3002",
    number: "\u6587\u7ae0\u7f16\u53f7",
    numberHint: "\u5728\u6574\u672c\u4e66\u4e2d\u552f\u4e00",
    numberUnavailable: "\u5f53\u524d\u4e66\u7c4d\u4e0d\u4f7f\u7528\u7f16\u53f7",
    numberPending: "\u5c06\u5728\u4e66\u7c4d\u6392\u7248\u65f6\u5206\u914d",
    articleTitle: "\u6587\u7ae0\u6807\u9898",
    articleTitlePlaceholder: "\u8f93\u5165\u6587\u7ae0\u6807\u9898",
    subtitle: "\u526f\u6807\u9898",
    subtitlePlaceholder: "\u8f93\u5165\u6587\u7ae0\u526f\u6807\u9898",
    body: "\u6b63\u6587",
    bodyPlaceholder: "\u5728\u8fd9\u91cc\u4e66\u5199\u6587\u7ae0\u2026\u2026",
    image: "\u6587\u7ae0\u56fe\u7247",
    upload: "\u4e0a\u4f20\u56fe\u7247",
    uploadHint: "\u70b9\u51fb\u9009\u62e9\uff0c\u6216\u5c06\u56fe\u7247\u62d6\u5230\u8fd9\u91cc",
    uploadNote: "JPG/JPEG\u3001PNG\u3001WebP\u3001GIF\u3001AVIF\u3001SVG \u6216 BMP \u00b7 \u6700\u5927 10 MB",
    replace: "\u66f4\u6362",
    remove: "\u5220\u9664",
    imageReady: "\u56fe\u7247\u5df2\u5c31\u7eea",
    invalidType: "\u8bf7\u9009\u62e9 JPG/JPEG\u3001PNG\u3001WebP\u3001GIF\u3001AVIF\u3001SVG \u6216 BMP \u56fe\u7247\u3002",
    fileTooLarge: "\u56fe\u7247\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc7 10 MB\u3002",
    readFailed: "\u65e0\u6cd5\u8bfb\u53d6\u8be5\u56fe\u7247\uff0c\u8bf7\u5c1d\u8bd5\u5176\u4ed6\u6587\u4ef6\u3002",
  },
} as const;

const acceptedImageTypes = [
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
];
const acceptedImageExtensions = [
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jfif",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
];
const imageAccept = [...acceptedImageTypes, ...acceptedImageExtensions].join(",");
const maxImageBytes = 10 * 1024 * 1024;
type UploadError = "fileTooLarge" | "invalidType" | "readFailed" | "";

interface ArticleEditorFormProps {
  article: PreviewArticle;
  language: Language;
  numberingEnabled: boolean;
  numberPlaceholder: string;
  onBodyChange: (body: string) => void;
  onImageChange: (imageUrl: string) => void;
  onImageWrapChange: (imageWrap: ImageWrap) => void;
  onSubtitleChange: (subtitle: string) => void;
  onTitleChange: (title: string) => void;
}

export function ArticleEditorForm({
  article,
  language,
  numberingEnabled,
  numberPlaceholder,
  onBodyChange,
  onImageChange,
  onImageWrapChange,
  onSubtitleChange,
  onTitleChange,
}: ArticleEditorFormProps) {
  const { template } = useTemplate();
  const copy = editorCopy[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState<UploadError>("");

  const readImage = (file?: File) => {
    setIsDraggingFile(false);
    setUploadError("");
    if (!file) return;
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (
      !acceptedImageTypes.includes(file.type.toLowerCase()) &&
      !acceptedImageExtensions.includes(extension)
    ) {
      setUploadError("invalidType");
      return;
    }
    if (file.size > maxImageBytes) {
      setUploadError("fileTooLarge");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        const image = new Image();
        image.addEventListener("load", () =>
          onImageChange(reader.result as string),
        );
        image.addEventListener("error", () => setUploadError("readFailed"));
        image.src = reader.result;
      } else {
        setUploadError("readFailed");
      }
    });
    reader.addEventListener("error", () => setUploadError("readFailed"));
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    readImage(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    readImage(event.dataTransfer.files[0]);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <header className="border-b border-border px-5 py-5 sm:px-6">
        <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {copy.description}
        </p>
      </header>

      <div className="space-y-7 p-5 sm:p-6">
        {(template.showNumber || !numberingEnabled) && (
          <fieldset className="space-y-2.5 disabled:opacity-60" disabled={!numberingEnabled}>
            <div className="flex items-center justify-between gap-3">
              <Label
                className="flex items-center gap-2 text-xs font-medium text-foreground"
                htmlFor="article-number"
              >
                <Hash className="size-3.5 text-muted-foreground" />
                {copy.number}
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {numberingEnabled ? copy.numberHint : copy.numberUnavailable}
              </span>
            </div>
            <Input
              className="h-10 rounded-lg border-input bg-background font-mono text-sm tracking-[0.14em] text-muted-foreground shadow-none"
              id="article-number"
              disabled={!numberingEnabled}
              placeholder={numberPlaceholder || copy.numberPending}
              readOnly
              value={article.number}
            />
          </fieldset>
        )}

        <fieldset className="space-y-2.5">
          <Label
            className="flex items-center gap-2 text-xs font-medium text-foreground"
            htmlFor="article-title"
          >
            <Type className="size-3.5 text-muted-foreground" />
            {copy.articleTitle}
          </Label>
          <Input
            className="h-10 rounded-lg border-input bg-background text-sm text-foreground shadow-none placeholder:text-muted-foreground"
            id="article-title"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={copy.articleTitlePlaceholder}
            value={article.title}
          />
        </fieldset>

        {template.subtitleMode === "free" && (
          <fieldset className="space-y-2.5">
            <Label
              className="flex items-center gap-2 text-xs font-medium text-foreground"
              htmlFor="article-subtitle"
            >
              <Type className="size-3.5 text-muted-foreground" />
              {copy.subtitle}
            </Label>
            <Input
              className="h-10 rounded-lg border-input bg-background text-sm text-foreground shadow-none placeholder:text-muted-foreground"
              id="article-subtitle"
              onChange={(event) => onSubtitleChange(event.target.value)}
              placeholder={copy.subtitlePlaceholder}
              value={article.subtitle}
            />
          </fieldset>
        )}

        <fieldset className="space-y-2.5">
          <Label
            className="flex items-center gap-2 text-xs font-medium text-foreground"
            htmlFor="article-body"
          >
            <Type className="size-3.5 text-muted-foreground" />
            {copy.body}
          </Label>
          <Textarea
            className="min-h-[300px] rounded-lg border-input bg-background text-sm leading-6 text-foreground shadow-none placeholder:text-muted-foreground xl:min-h-[360px]"
            id="article-body"
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder={copy.bodyPlaceholder}
            value={article.body}
          />
        </fieldset>

        {template.allowImages && (
          <fieldset className="space-y-2.5">
            <Label className="flex items-center gap-2 text-xs font-medium text-foreground">
              <ImagePlus className="size-3.5 text-muted-foreground" />
              {copy.image}
            </Label>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(160px,0.9fr)] items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
              <Label
                className="flex items-center gap-2 text-xs text-muted-foreground"
                htmlFor="author-image-wrap"
              >
                <WrapText className="size-3.5 text-muted-foreground" />
                {copy.imageWrap}
              </Label>
              <Select
                className="h-9 text-xs"
                id="author-image-wrap"
                onChange={(event) =>
                  onImageWrapChange(event.target.value as ImageWrap)
                }
                value={article.imageWrap}
              >
                <option value="square">{copy.square}</option>
                <option value="tight">{copy.tight}</option>
                <option value="through">{copy.through}</option>
                <option value="topBottom">{copy.topBottom}</option>
                <option value="behindText">{copy.behindText}</option>
                <option value="inFrontOfText">{copy.inFrontOfText}</option>
              </Select>
            </div>
            <input
              accept={imageAccept}
              aria-hidden="true"
              className="sr-only"
              onChange={handleFileChange}
              ref={fileInputRef}
              tabIndex={-1}
              type="file"
            />
            {article.imageUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <img
                  alt=""
                  className="size-16 shrink-0 rounded-md bg-background object-cover ring-1 ring-border"
                  src={article.imageUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {copy.imageReady}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {copy.uploadNote}
                  </p>
                </div>
                <button
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  onClick={() => fileInputRef.current?.click()}
                  title={copy.replace}
                  type="button"
                >
                  <RefreshCw className="size-3.5" />
                  <span className="sr-only">{copy.replace}</span>
                </button>
                <button
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  onClick={() => onImageChange("")}
                  title={copy.remove}
                  type="button"
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">{copy.remove}</span>
                </button>
              </div>
            ) : (
              <button
                className={`group flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-5 py-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isDraggingFile ? "border-blue-500 bg-blue-500/10" : "border-border bg-muted/30 hover:border-blue-500/40 hover:bg-blue-500/[0.04]"}`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                type="button"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 transition-colors group-hover:bg-blue-500/15">
                  <ImagePlus className="size-4" />
                </span>
                <span className="mt-3 text-xs font-medium text-foreground">
                  {copy.upload}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  {copy.uploadHint}
                </span>
                <span className="mt-3 text-[10px] text-muted-foreground/70">
                  {copy.uploadNote}
                </span>
              </button>
            )}
            {uploadError && (
              <p className="text-[11px] text-red-400" role="alert">
                {copy[uploadError]}
              </p>
            )}
          </fieldset>
        )}
      </div>
    </section>
  );
}
