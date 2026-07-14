import { Hash, ImagePlus, Type, WrapText } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTemplate } from "@/hooks/use-template";
import type { Language } from "@/lib/i18n";
import type { MockArticle } from "@/mock/article";
import type { ImageWrap } from "@/types/article";

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
    numberHint: "Assigned by the book template",
    articleTitle: "Article Title",
    articleTitlePlaceholder: "Enter an article title",
    body: "Article Body",
    bodyPlaceholder: "Write your article here...",
    image: "Article Image",
    upload: "Upload Image",
    uploadHint: "Image upload placeholder",
    uploadNote: "PNG or JPG · Upload is not enabled in this prototype",
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
    numberHint: "\u7531\u4e66\u7c4d\u6a21\u677f\u5206\u914d",
    articleTitle: "\u6587\u7ae0\u6807\u9898",
    articleTitlePlaceholder: "\u8f93\u5165\u6587\u7ae0\u6807\u9898",
    body: "\u6b63\u6587",
    bodyPlaceholder: "\u5728\u8fd9\u91cc\u4e66\u5199\u6587\u7ae0\u2026\u2026",
    image: "\u6587\u7ae0\u56fe\u7247",
    upload: "\u4e0a\u4f20\u56fe\u7247",
    uploadHint: "\u56fe\u7247\u4e0a\u4f20\u5360\u4f4d\u533a",
    uploadNote: "PNG \u6216 JPG \u00b7 \u5f53\u524d\u539f\u578b\u4e0d\u4f1a\u771f\u6b63\u4e0a\u4f20",
  },
} as const;

interface ArticleEditorFormProps {
  article: MockArticle;
  language: Language;
  onBodyChange: (body: string) => void;
  onImageWrapChange: (imageWrap: ImageWrap) => void;
  onTitleChange: (title: string) => void;
}

export function ArticleEditorForm({
  article,
  language,
  onBodyChange,
  onImageWrapChange,
  onTitleChange,
}: ArticleEditorFormProps) {
  const { template } = useTemplate();
  const copy = editorCopy[language];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <header className="border-b border-border px-5 py-5 sm:px-6">
        <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          {copy.description}
        </p>
      </header>

      <div className="space-y-7 p-5 sm:p-6">
        {template.showNumber && (
          <fieldset className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <Label
                className="flex items-center gap-2 text-xs font-medium text-foreground"
                htmlFor="article-number"
              >
                <Hash className="size-3.5 text-muted-foreground" />
                {copy.number}
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {copy.numberHint}
              </span>
            </div>
            <Input
              className="h-10 rounded-lg border-input bg-background font-mono text-sm tracking-[0.14em] text-muted-foreground shadow-none"
              id="article-number"
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
            <button
              className="group flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-5 py-7 text-center transition-colors hover:border-blue-500/40 hover:bg-blue-500/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
          </fieldset>
        )}
      </div>
    </section>
  );
}
