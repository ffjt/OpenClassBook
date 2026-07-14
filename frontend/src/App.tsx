import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Inbox,
  LayoutDashboard,
  Languages,
  Menu,
  MoreHorizontal,
  Search,
  Send,
  X,
} from "lucide-react";

import { TemplateProvider } from "@/context/TemplateContext";
import { LocaleProvider, useLocale } from "@/context/LocaleContext";
import { PublicationPreview } from "@/components/publication/PublicationPreview";
import type { Article, ArticleStatus } from "@/mock/articles";
import { articleRepository } from "@/repositories/articleRepository";

const statusStyles: Record<ArticleStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatDate(value: string, locale: "en" | "zh") {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    month: locale === "zh" ? "long" : "short",
    day: "numeric",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: ArticleStatus }) {
  const { t } = useLocale();
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusStyles[status]}`}>
      {t(status)}
    </span>
  );
}

function ReviewWorkspace() {
  const { locale, setLocale, t } = useLocale();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ArticleStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | "draft" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    articleRepository.getArticles().then((loadedArticles) => {
      if (!mounted) return;
      setArticles(loadedArticles);
      setSelectedArticle(loadedArticles[0] ?? null);
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesStatus = statusFilter === "all" || article.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        article.title.toLowerCase().includes(normalizedQuery) ||
        article.author.toLowerCase().includes(normalizedQuery) ||
        article.number.includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [articles, query, statusFilter]);

  const replaceArticle = (updatedArticle: Article, message: string) => {
    setArticles((current) => current.map((article) => (article.id === updatedArticle.id ? updatedArticle : article)));
    setSelectedArticle(updatedArticle);
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const runAction = async (action: "approve" | "reject" | "draft") => {
    if (!selectedArticle) return;
    setBusyAction(action);
    try {
      const updatedArticle =
        action === "approve"
          ? await articleRepository.approveArticle(selectedArticle.id)
          : action === "reject"
            ? await articleRepository.rejectArticle(selectedArticle.id)
            : await articleRepository.updateArticle(selectedArticle.id, {});
      replaceArticle(
        updatedArticle,
        action === "approve" ? t("articleApproved") : action === "reject" ? t("articleReturned") : t("draftUpdated"),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const selectArticle = async (id: string) => {
    const article = await articleRepository.getArticleById(id);
    if (article) setSelectedArticle(article);
  };

  return (
    <div className="min-h-screen bg-[#f8f8f6] text-[#202522]">
        <header className="flex h-16 items-center justify-between border-b border-[#e4e5e1] bg-white px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <button type="button" className="inline-flex size-9 items-center justify-center rounded-md border border-[#e2e4df] text-[#666b67] lg:hidden" aria-label="Open navigation">
              <Menu className="size-4" />
            </button>
            <a href="#review" className="text-[15px] font-semibold tracking-[-0.02em]">OpenClassBook</a>
            <div className="hidden h-5 w-px bg-[#e4e5e1] sm:block" />
            <nav className="hidden items-center gap-5 text-sm text-[#777b77] sm:flex">
              <a href="#dashboard" className="flex items-center gap-2 hover:text-[#202522]"><LayoutDashboard className="size-4" /> {t("dashboard")}</a>
              <a href="#review" className="flex items-center gap-2 font-medium text-[#202522]"><Inbox className="size-4" /> {t("review")}</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "zh" : "en")}
              aria-label={t("switchLanguage")}
              title={t("switchLanguage")}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[#dfe2dd] bg-white px-2.5 text-xs font-medium text-[#5f6761] transition-colors hover:bg-[#f4f6f3]"
            >
              <Languages className="size-3.5" />
              <span>{locale === "zh" ? "中文" : "EN"}</span>
              <span className="text-[#a0a5a0]">/</span>
              <span className="text-[#8a8f8a]">{locale === "zh" ? "EN" : "中"}</span>
            </button>
            <span className="hidden text-xs text-[#858984] md:inline">{t("adminWorkspace")}</span>
            <div className="flex size-8 items-center justify-center rounded-full bg-[#dcebe6] text-xs font-semibold text-[#174f4a]">AK</div>
          </div>
        </header>

        <main id="review" className="mx-auto grid max-w-[1800px] grid-cols-1 lg:h-[calc(100vh-4rem)] lg:grid-cols-[320px_minmax(0,1fr)_420px]">
          <aside className="flex min-h-[460px] min-w-0 flex-col border-b border-[#e1e3df] bg-white lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="border-b border-[#e4e5e1] px-5 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#858984]">{t("editorialDesk")}</p>
                  <h1 className="mt-1.5 text-xl font-semibold tracking-[-0.035em]">{t("reviewSubmissions")}</h1>
                </div>
                <button type="button" className="inline-flex size-8 items-center justify-center rounded-md text-[#858984] hover:bg-[#f3f4f1]" aria-label={t("moreListOptions")}><MoreHorizontal className="size-4" /></button>
              </div>
              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#989c97]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("searchArticles")}
                  aria-label={t("searchArticles")}
                  className="h-10 w-full rounded-md border border-[#dfe2dd] bg-[#fafbf9] pl-9 pr-3 text-sm outline-none placeholder:text-[#a1a5a0] focus:border-[#7e9d91] focus:ring-2 focus:ring-[#dcebe6]"
                />
              </div>
              <div className="relative mt-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "all" | ArticleStatus)}
                  aria-label={t("filterByStatus")}
                  className="h-9 w-full appearance-none rounded-md border border-[#dfe2dd] bg-white px-3 pr-8 text-xs font-medium text-[#5e645f] outline-none focus:border-[#7e9d91]"
                >
                  <option value="all">{t("allStatuses")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="approved">{t("approved")}</option>
                  <option value="rejected">{t("rejected")}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[#858984]" />
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#979b96]">
              <span>{filteredArticles.length} {t("articles")}</span>
              <span>{t("updated")}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {isLoading ? (
                <div className="space-y-2 px-3 py-2"><div className="h-16 animate-pulse bg-[#f0f1ee]" /><div className="h-16 animate-pulse bg-[#f0f1ee]" /></div>
              ) : filteredArticles.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-[#8b908b]">{t("noMatches")}</div>
              ) : (
                filteredArticles.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => selectArticle(article.id)}
                    className={`mb-1 block w-full border-l-2 px-3 py-3 text-left transition-colors ${selectedArticle?.id === article.id ? "border-[#174f4a] bg-[#f1f6f3]" : "border-transparent hover:bg-[#f7f8f5]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-[#969b96]">#{article.number}</span>
                      <StatusBadge status={article.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-5 text-[#303632]">{article.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#8b908b]">
                      <span className="truncate">{article.author}</span>
                      <span className="shrink-0">{formatDate(article.updatedAt, locale)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex min-h-[640px] min-w-0 flex-col bg-[#fbfbf9] lg:min-h-0">
            <div className="flex items-center justify-between border-b border-[#e4e5e1] px-5 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <FileText className="size-4 text-[#6f7771]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8a8f8a]">{t("articleEditor")}</p>
                  <p className="mt-0.5 text-sm font-medium text-[#303632]">{t("readAndReview")}</p>
                </div>
              </div>
              {selectedArticle && <StatusBadge status={selectedArticle.status} />}
            </div>

            {selectedArticle ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-10 sm:py-10">
                  <div className="mx-auto max-w-2xl">
                    <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b908b]"><span>{t("article")} #{selectedArticle.number}</span><span className="size-1 rounded-full bg-[#b6bbb6]" /><span>{t("updated")} {formatDate(selectedArticle.updatedAt, locale)}</span></div>
                    <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#242a26] sm:text-4xl">{selectedArticle.title}</h2>
                    <p className="mt-3 text-sm text-[#747a74]">{t("by")} <span className="font-medium text-[#4b524d]">{selectedArticle.author}</span></p>
                    <img src={selectedArticle.image} alt="" className="mt-8 aspect-[2/1] w-full object-cover" />
                    <div className="mt-8 max-w-xl space-y-5 text-[15px] leading-8 text-[#464d48]">
                      {selectedArticle.content.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-[#e4e5e1] bg-white px-5 py-4 sm:px-8">
                  <button type="button" disabled={busyAction !== null} onClick={() => runAction("approve")} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#174f4a] px-4 text-sm font-medium text-white transition-colors hover:bg-[#113f3b] disabled:cursor-wait disabled:opacity-60"><Check className="size-4" />{busyAction === "approve" ? t("approving") : t("approve")}</button>
                  <button type="button" disabled={busyAction !== null} onClick={() => runAction("reject")} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e2caca] bg-white px-4 text-sm font-medium text-[#a34f4f] transition-colors hover:bg-[#fff6f5] disabled:cursor-wait disabled:opacity-60"><X className="size-4" />{busyAction === "reject" ? t("returning") : t("reject")}</button>
                  <button type="button" disabled={busyAction !== null} onClick={() => runAction("draft")} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#dfe2dd] bg-white px-4 text-sm font-medium text-[#5f6761] transition-colors hover:bg-[#f6f7f4] disabled:cursor-wait disabled:opacity-60"><Clock3 className="size-4" />{busyAction === "draft" ? t("saving") : t("saveDraft")}</button>
                  {notice && <span role="status" className="ml-auto flex items-center gap-1.5 text-xs font-medium text-[#477269]"><Send className="size-3.5" />{notice}</span>}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-[#8b908b]">{t("selectArticle")}</div>
            )}
          </section>

          <aside className="min-h-[640px] min-w-0 border-t border-[#e1e3df] lg:min-h-0 lg:border-l lg:border-t-0">
            <PublicationPreview article={selectedArticle} />
          </aside>
        </main>
    </div>
  );
}

function App() {
  return (
    <LocaleProvider>
      <TemplateProvider>
        <ReviewWorkspace />
      </TemplateProvider>
    </LocaleProvider>
  );
}

export default App;
