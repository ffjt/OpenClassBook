import { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  FilePenLine,
  FilePlus2,
  Hash,
  LoaderCircle,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";

import { ArticleEditorForm } from "@/components/author-editor/article-editor-form";
import { LiveArticlePreview } from "@/components/author-editor/live-article-preview";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBookTemplate } from "@/hooks/use-book-template";
import type { Language } from "@/lib/i18n";
import { ApiError } from "@/repositories/apiClient";
import {
  articleRepository,
  type Article,
  type ArticleStatus,
} from "@/repositories/articleRepository";
import {
  authorRepository,
  type AuthorDetail,
} from "@/repositories/authorRepository";
import type { PreviewArticle } from "@/types/article";

const copy = {
  en: {
    eyebrow: "Author workspace",
    title: "My Submissions",
    description: (name: string) => `${name}, manage all your articles in this book.`,
    newArticle: "New Article",
    empty: "No submissions yet",
    untitled: "Untitled article",
    statuses: { draft: "Draft", pending: "Submitted", approved: "Approved", rejected: "Needs revision" },
    save: "Save Draft",
    saving: "Saving...",
    submit: "Submit Article",
    submitting: "Submitting...",
    saved: "Draft saved",
    submitted: "Article submitted",
    titleRequired: "Enter an article title before saving.",
    loadError: "Could not load this author workspace.",
    saveError: "Could not save this article. Please try again.",
    retry: "Try Again",
    loading: "Loading your submissions...",
    updated: "Updated",
    claimEyebrow: "Book-wide numbering",
    claimTitle: "Claim an article number",
    claimDescription: "Enter the number you want. It is shared across all authors and can only be claimed once.",
    claimLabel: "Desired article number",
    claimPlaceholder: "For example, 001",
    claim: "Claim this number",
    cancel: "Cancel",
    claimRequired: "Claim an article number before writing a new article.",
    numberClaimed: "That number has already been claimed. Please enter another number.",
  },
  zh: {
    eyebrow: "作者工作台",
    title: "我的投稿",
    description: (name: string) => `${name}，在这里统一管理你在本书中的全部文章。`,
    newArticle: "新建文章",
    empty: "暂无投稿",
    untitled: "未命名文章",
    statuses: { draft: "草稿", pending: "已提交", approved: "已通过", rejected: "需修改" },
    save: "保存草稿",
    saving: "正在保存...",
    submit: "提交文章",
    submitting: "正在提交...",
    saved: "草稿已保存",
    submitted: "文章已提交",
    titleRequired: "请先填写文章标题。",
    loadError: "无法加载作者工作台。",
    saveError: "无法保存文章，请重试。",
    retry: "重试",
    loading: "正在加载你的投稿...",
    updated: "更新于",
    claimEyebrow: "整本书统一编号",
    claimTitle: "认领文章编号",
    claimDescription: "请输入你想要的编号。该编号由全部作者共享，每个编号只能被认领一次。",
    claimLabel: "想要认领的文章编号",
    claimPlaceholder: "例如：001",
    claim: "认领此编号",
    cancel: "取消",
    claimRequired: "新建文章前请先认领编号。",
    numberClaimed: "该编号已被认领，请输入其他编号。",
  },
} as const;

const statusStyles: Record<ArticleStatus, string> = {
  draft: "border-slate-500/20 bg-slate-500/10 text-slate-500",
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  rejected: "border-rose-500/20 bg-rose-500/10 text-rose-500",
};

const blankArticle: PreviewArticle = {
  number: "",
  title: "",
  subtitle: "",
  body: "",
  imageUrl: "",
  imagePage: -1,
  imageWrap: "topBottom",
  imagePosition: { x: 50, y: 72 },
  imageSize: { width: 50, height: 25 },
};

function toPreviewArticle(article: Article): PreviewArticle {
  return {
    ...blankArticle,
    number: article.number,
    title: article.title,
    body: article.content,
    imageUrl: article.image ?? "",
    imagePosition: { ...blankArticle.imagePosition },
    imageSize: { ...blankArticle.imageSize },
  };
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

interface AuthorEditorPageProps {
  authorId: number;
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

export function AuthorEditorPage({
  authorId,
  language,
  onNavigate,
  onToggleLanguage,
}: AuthorEditorPageProps) {
  const pageCopy = copy[language];
  const [author, setAuthor] = useState<AuthorDetail | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<number | "new">("new");
  const [draft, setDraft] = useState<PreviewArticle>({
    ...blankArticle,
    imagePosition: { ...blankArticle.imagePosition },
    imageSize: { ...blankArticle.imageSize },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [busyAction, setBusyAction] = useState<"save" | "submit" | null>(null);
  const [isClaimingNumber, setIsClaimingNumber] = useState(false);
  const [claimInput, setClaimInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { reload: reloadTemplate, status: templateStatus } = useBookTemplate(
    author?.book_id,
  );

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasLoadError(false);

    Promise.all([
      authorRepository.get(authorId),
      articleRepository.listByAuthor(authorId),
    ]).then(
      ([loadedAuthor, loadedArticles]) => {
        if (!active) return;
        setAuthor(loadedAuthor);
        setArticles(loadedArticles);
        if (loadedArticles[0]) {
          setSelectedId(loadedArticles[0].id);
          setDraft(toPreviewArticle(loadedArticles[0]));
        } else {
          setSelectedId("new");
          setIsClaimingNumber(loadedAuthor.book.number_mode === "automatic");
          setDraft({
            ...blankArticle,
            imagePosition: { ...blankArticle.imagePosition },
            imageSize: { ...blankArticle.imageSize },
          });
        }
        setIsLoading(false);
      },
      () => {
        if (!active) return;
        setHasLoadError(true);
        setIsLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [authorId, reloadKey]);

  const startNewArticle = () => {
    setSelectedId("new");
    setDraft({
      ...blankArticle,
      imagePosition: { ...blankArticle.imagePosition },
      imageSize: { ...blankArticle.imageSize },
    });
    setFormError(null);
    setMessage(null);
    setClaimInput("");
    setIsClaimingNumber(author?.book.number_mode === "automatic");
  };

  const claimNumber = () => {
    const number = claimInput.trim();
    if (!number || selectedId !== "new") return;
    setDraft((current) => ({ ...current, number }));
    setIsClaimingNumber(false);
  };

  const selectArticle = (article: Article) => {
    setSelectedId(article.id);
    setDraft(toPreviewArticle(article));
    setIsClaimingNumber(false);
    setFormError(null);
    setMessage(null);
  };

  const saveArticle = async (action: "save" | "submit") => {
    if (!author) return;
    if (author.book.number_mode === "automatic" && !draft.number) {
      setFormError(pageCopy.claimRequired);
      setIsClaimingNumber(true);
      return;
    }
    const title = draft.title.trim();
    if (!title) {
      setFormError(pageCopy.titleRequired);
      document.getElementById("article-title")?.focus();
      return;
    }

    setBusyAction(action);
    setFormError(null);
    setMessage(null);
    const status: ArticleStatus = action === "submit" ? "pending" : "draft";
    const articleData = {
      author_id: author.id,
      title,
      content: draft.body,
      image: draft.imageUrl || null,
      status,
    };

    try {
      const saved =
        selectedId === "new"
          ? await articleRepository.create(author.book_id, {
              ...articleData,
              number: draft.number || undefined,
            })
          : await articleRepository.update(selectedId, articleData);
      const refreshed = await articleRepository.listByAuthor(author.id);
      setArticles(refreshed);
      setSelectedId(saved.id);
      setDraft(toPreviewArticle(saved));
      setMessage(action === "submit" ? pageCopy.submitted : pageCopy.saved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError(pageCopy.numberClaimed);
        setClaimInput(draft.number);
        setIsClaimingNumber(true);
      } else {
        setFormError(pageCopy.saveError);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const templateLoading =
    author && (templateStatus === "idle" || templateStatus === "loading");
  if (isLoading || templateLoading || hasLoadError || templateStatus === "error") {
    const loading = isLoading || Boolean(templateLoading);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        {loading ? <><LoaderCircle className="size-7 animate-spin text-blue-500" /><p className="text-sm text-muted-foreground">{pageCopy.loading}</p></> : <><AlertCircle className="size-7 text-rose-400" /><p className="text-sm text-muted-foreground">{pageCopy.loadError}</p><Button onClick={() => { if (hasLoadError) setReloadKey((value) => value + 1); else reloadTemplate(); }} variant="outline"><RefreshCw className="mr-2 size-4" />{pageCopy.retry}</Button></>}
      </div>
    );
  }

  if (!author) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-xl sm:px-7 lg:px-10">
        <a className="flex items-center gap-3" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}><span className="flex size-9 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-500"><BookOpen className="size-[18px]" /></span><span className="text-sm font-semibold">OpenClassBook</span></a>
        <div className="flex items-center gap-2"><LanguageToggle language={language} onToggle={onToggleLanguage} /><ThemeToggle language={language} /></div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
        <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-500"><FilePenLine className="size-3.5" />{pageCopy.eyebrow}</p><h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{pageCopy.title}</h1><p className="mt-3 text-sm text-muted-foreground">{pageCopy.description(author.name)}</p></div>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={startNewArticle}><FilePlus2 className="mr-2 size-4" />{pageCopy.newArticle}</Button>
        </header>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-border bg-card p-3 lg:sticky lg:top-24">
            <div className="flex items-center justify-between px-2 py-2"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{pageCopy.title}</span><Badge className="border border-border bg-transparent text-foreground">{articles.length}</Badge></div>
            <button className={`mt-2 w-full rounded-lg border p-3 text-left transition-colors ${selectedId === "new" ? "border-blue-500/30 bg-blue-500/[0.08]" : "border-dashed border-border hover:bg-muted/40"}`} onClick={startNewArticle} type="button"><span className="flex items-center gap-2 text-sm font-medium"><FilePlus2 className="size-4 text-blue-500" />{pageCopy.newArticle}</span></button>
            <div className="mt-2 space-y-1">
              {articles.length ? articles.map((article) => <button className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId === article.id ? "border-blue-500/30 bg-blue-500/[0.08]" : "border-transparent hover:bg-muted/50"}`} key={article.id} onClick={() => selectArticle(article)} type="button"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-medium">{article.title || pageCopy.untitled}</p><Badge className={statusStyles[article.status]}>{pageCopy.statuses[article.status]}</Badge></div><p className="mt-2 text-[11px] text-muted-foreground">{pageCopy.updated} {formatDate(article.updated_at, language)}</p></button>) : <p className="px-3 py-8 text-center text-sm text-muted-foreground">{pageCopy.empty}</p>}
            </div>
          </aside>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-card p-3">
              {formError ? <p className="mr-auto text-sm text-rose-500" role="alert">{formError}</p> : message ? <p className="mr-auto text-sm text-emerald-500" role="status">{message}</p> : null}
              <Button disabled={busyAction !== null} onClick={() => void saveArticle("save")} variant="outline"><Save className="mr-2 size-4" />{busyAction === "save" ? pageCopy.saving : pageCopy.save}</Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={busyAction !== null} onClick={() => void saveArticle("submit")}><Send className="mr-2 size-4" />{busyAction === "submit" ? pageCopy.submitting : pageCopy.submit}</Button>
            </div>
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,0.54fr)_minmax(0,1fr)]">
              <ArticleEditorForm article={draft} language={language} onBodyChange={(body) => setDraft((current) => ({ ...current, body }))} onImageWrapChange={(imageWrap) => setDraft((current) => ({ ...current, imageWrap }))} onImageChange={(imageUrl) => setDraft((current) => ({ ...current, imageUrl }))} onSubtitleChange={(subtitle) => setDraft((current) => ({ ...current, subtitle }))} onTitleChange={(title) => { setDraft((current) => ({ ...current, title })); setFormError(null); }} />
              <div className="xl:sticky xl:top-24"><LiveArticlePreview article={draft} language={language} onImagePositionChange={(imagePosition) => setDraft((current) => ({ ...current, imagePosition }))} onImagePageChange={(imagePage) => setDraft((current) => ({ ...current, imagePage }))} onImageSizeChange={(imageSize) => setDraft((current) => ({ ...current, imageSize }))} /></div>
            </div>
          </section>
        </div>
      </main>
      {isClaimingNumber ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-5 backdrop-blur-sm">
          <section
            aria-labelledby="claim-number-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8"
            role="dialog"
          >
            <div className="flex size-11 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-blue-500">
              <Hash className="size-5" />
            </div>
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-500">
              {pageCopy.claimEyebrow}
            </p>
            <h2
              className="mt-2 text-2xl font-semibold tracking-[-0.03em]"
              id="claim-number-title"
            >
              {pageCopy.claimTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {pageCopy.claimDescription}
            </p>
            <label
              className="mt-6 block text-xs font-medium text-foreground"
              htmlFor="claim-article-number"
            >
              {pageCopy.claimLabel}
            </label>
            <Input
              autoFocus
              className="mt-2 h-12 rounded-xl font-mono text-lg tracking-[0.12em]"
              id="claim-article-number"
              maxLength={50}
              onChange={(event) => setClaimInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") claimNumber();
              }}
              placeholder={pageCopy.claimPlaceholder}
              value={claimInput}
            />
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                onClick={() => setIsClaimingNumber(false)}
                type="button"
                variant="outline"
              >
                {pageCopy.cancel}
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={!claimInput.trim()}
                onClick={claimNumber}
                type="button"
              >
                <Hash className="mr-2 size-4" />
                {pageCopy.claim}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
