import { ArrowUpRight, BookOpen } from "lucide-react";

import type { Article } from "@/mock/articles";
import { useTemplateContext } from "@/context/TemplateContext";
import { useLocale } from "@/context/LocaleContext";

interface PublicationPreviewProps {
  article: Article | null;
}

export function PublicationPreview({ article }: PublicationPreviewProps) {
  const template = useTemplateContext();
  const { t } = useLocale();

  if (!article) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        <div>
          <BookOpen className="mx-auto mb-3 size-7 text-zinc-300" />
          {t("previewEmpty")}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f2f1ed]">
      <div className="flex items-center justify-between border-b border-[#deddd8] px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#77766f]">{t("liveOutput")}</p>
          <p className="mt-1 text-sm font-medium text-[#262824]">{t("publicationPreview")}</p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#77766f]">
          <span className="size-1.5 rounded-full bg-emerald-600" />
          {t("synced")}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-6 sm:px-8">
        <article className="mx-auto max-w-[360px] overflow-hidden bg-[#fffdf8] text-[#262824] shadow-[0_14px_35px_-22px_rgba(26,32,30,0.45)]">
          <div className="relative h-44 overflow-hidden sm:h-52">
            <img src={article.image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
            <span className="absolute left-5 top-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">
              {template.issueLabel}
            </span>
            <span className="absolute bottom-4 left-5 text-xs font-medium text-white/90">#{article.number}</span>
          </div>

          <div className="px-6 pb-8 pt-6 sm:px-8">
            <div className="mb-6 flex items-center justify-between border-b border-[#deddd8] pb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: template.accentColor }}>
                {template.publicationTitle}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#85847e]">{article.author}</span>
            </div>
            <h2 className="font-serif text-[clamp(1.7rem,4vw,2.25rem)] leading-[1.04] tracking-[-0.035em]">{article.title}</h2>
            <p className="mt-3 text-xs italic leading-5 text-[#77766f]">{template.publicationSubtitle}</p>
            <div className="mt-6 space-y-4 text-[13px] leading-[1.75] text-[#4d4d47]">
              {article.content.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-7 flex items-center justify-between border-t border-[#deddd8] pt-4 text-[10px] uppercase tracking-[0.13em] text-[#85847e]">
              <span>{t("fieldNotes")}</span>
              <span className="flex items-center gap-1">{t("readInIssue")} <ArrowUpRight className="size-3" /></span>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
