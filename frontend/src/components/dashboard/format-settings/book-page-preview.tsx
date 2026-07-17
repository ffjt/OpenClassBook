import { PublicationArticlePreview } from "@/components/author-editor/live-article-preview";
import type { BookFormatSettings } from "@/components/dashboard/format-settings/format-settings-types";
import type { Language } from "@/lib/i18n";
import type { ArticlePageMode } from "@/repositories/bookRepository";

const sampleCopy = {
  en: {
    author: "Author: Lin Xiaoyu",
    body: "Today, I stood in the classroom and watched the leaves moving outside the window. I suddenly realized that youth grows quietly inside these ordinary days.\n\nEvery record is an appointment we make with time.\n\nFrom one story to a shared memory, these small moments eventually become a publication that belongs to all of us.",
    flowBody: "\n\nAnother story\nMore approved articles continue naturally in the same publication flow.",
    subtitle: "A letter to our eighteen-year-old selves",
    title: "Our Youth",
  },
  zh: {
    author: "作者：林晓宇",
    body: "今天，我站在教室里，望着窗外被风吹动的树叶，忽然意识到青春正在这些平凡的日子里悄悄生长。\n\n每一次记录，都是我们与时间的约定。\n\n从一个人的故事到一群人的记忆，这些细小的片段最终汇成属于我们的出版物。",
    flowBody: "\n\n另一篇故事\n更多审核通过的文章会在同一个出版流中自然衔接。",
    subtitle: "写给十八岁的我们",
    title: "我们的青春",
  },
} as const;

interface BookPagePreviewProps {
  articlePageMode: ArticlePageMode;
  authorClassName: string | null;
  bookTitle: string;
  language: Language;
  numberingEnabled: boolean;
  settings: BookFormatSettings;
}

export function BookPagePreview({
  articlePageMode,
  authorClassName,
  bookTitle,
  language,
  numberingEnabled,
  settings,
}: BookPagePreviewProps) {
  const sample = sampleCopy[language];

  return (
    <PublicationArticlePreview
      article={{
        authorMeta: authorClassName
          ? `${sample.author} · ${authorClassName}`
          : sample.author,
        body: `${sample.body}${articlePageMode === "flow" ? sample.flowBody : ""}`,
        imagePage: -1,
        imagePosition: { x: 50, y: 72 },
        imageSize: { height: 24, width: 72 },
        imageUrl: settings.allowImages ? "/openclassbook-hero.png" : "",
        imageWrap: "topBottom",
        number: numberingEnabled ? "001" : "",
        subtitle: sample.subtitle,
        title: sample.title,
      }}
      articlePageMode={articlePageMode}
      bookTitle={bookTitle}
      language={language}
      readOnly
      template={settings}
    />
  );
}
