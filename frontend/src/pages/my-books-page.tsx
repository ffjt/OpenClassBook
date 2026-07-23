import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { AccountMenu } from "@/components/account-menu";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  bookRepository,
  type Book,
  type BookStatus,
} from "@/repositories/bookRepository";

interface MyBooksPageProps {
  language: Language;
  onNavigate: (path: string) => void;
  onToggleLanguage: () => void;
}

const copy = {
  en: {
    title: "My Books",
    description: "View and manage all the books you have created.",
    newBook: "New Book",
    emptyTitle: "You haven't created any books yet.",
    emptyDescription: "Create your first book and start collecting articles.",
    createBook: "Create a Book",
    noDescription: "No description yet.",
    authors: (count: number) => `${count} ${count === 1 ? "author" : "authors"}`,
    updated: "Updated",
    openDashboard: "Open Dashboard",
    deleteBook: "Delete",
    deleting: "Deleting",
    deleteConfirm: (title: string) =>
      `Delete “${title}”? This will permanently delete the book and its content.`,
    deleteError: "Unable to delete this book. Please try again.",
    newlyCreated: "Newly created",
    statuses: {
      collecting: "Accepting Submissions",
      reviewing: "In Review",
      published: "Published",
    },
    loading: "Loading your books",
    errorTitle: "Unable to load your books",
    errorDescription:
      "Unable to connect to the backend. Please check that FastAPI is running.",
    retry: "Try again",
  },
  zh: {
    title: "我的书籍",
    description: "查看并管理你创建的所有书籍。",
    newBook: "新建书籍",
    emptyTitle: "你还没有创建任何书籍。",
    emptyDescription: "创建第一本书，开始收集文章。",
    createBook: "创建一本书",
    noDescription: "暂无简介。",
    authors: (count: number) => `${count} 位作者`,
    updated: "更新于",
    openDashboard: "打开 Dashboard",
    deleteBook: "删除",
    deleting: "正在删除",
    deleteConfirm: (title: string) =>
      `确定删除《${title}》吗？书籍及其内容将被永久删除。`,
    deleteError: "无法删除这本书，请重试。",
    newlyCreated: "刚刚创建",
    statuses: {
      collecting: "正在投稿",
      reviewing: "审核中",
      published: "已出版",
    },
    loading: "正在加载书籍",
    errorTitle: "无法加载书籍",
    errorDescription: "无法连接后端，请检查 FastAPI 是否正在运行。",
    retry: "重试",
  },
} as const;

const statusStyles: Record<BookStatus, string> = {
  collecting: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  reviewing: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  published: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function BooksSkeleton({ label }: { label: string }) {
  return (
    <div
      aria-label={label}
      className="grid animate-pulse gap-5 md:grid-cols-2 xl:grid-cols-3"
      role="status"
    >
      {[0, 1, 2].map((item) => (
        <div
          className="h-[390px] rounded-2xl border border-border bg-muted/30"
          key={item}
        />
      ))}
    </div>
  );
}

export function MyBooksPage({
  language,
  onNavigate,
  onToggleLanguage,
}: MyBooksPageProps) {
  const pageCopy = copy[language];
  const [searchParams] = useSearchParams();
  const highlightedBookId = Number(searchParams.get("created"));
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingBookId, setDeletingBookId] = useState<number | null>(null);
  const [deleteErrorBookId, setDeleteErrorBookId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setHasError(false);

    bookRepository
      .list()
      .then((result) => {
        if (active) setBooks(result);
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const deleteBook = async (book: Book) => {
    if (!window.confirm(pageCopy.deleteConfirm(book.title))) return;

    setDeletingBookId(book.id);
    setDeleteErrorBookId(null);
    try {
      await bookRepository.delete(book.id);
      setBooks((current) => current.filter((item) => item.id !== book.id));
    } catch {
      setDeleteErrorBookId(book.id);
    } finally {
      setDeletingBookId(null);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-7 lg:px-10">
          <a
            className="flex items-center gap-3 text-sm font-semibold tracking-[-0.02em] text-foreground"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/");
            }}
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-400">
              <BookOpen className="size-[18px]" />
            </span>
            OpenClassBook
          </a>
          <div className="flex items-center gap-2">
            <LanguageToggle language={language} onToggle={onToggleLanguage} />
            <ThemeToggle language={language} />
            <AccountMenu language={language} onNavigate={onNavigate} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-7 lg:px-10 lg:pt-14">
        <section className="flex flex-col gap-6 border-b border-border pb-9 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              {pageCopy.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              {pageCopy.description}
            </p>
          </div>
          <Button
            className="h-10 self-start rounded-lg bg-blue-600 px-4 text-sm text-white hover:bg-blue-500 sm:self-auto"
            onClick={() => onNavigate("/book/create")}
            type="button"
          >
            <Plus className="mr-2 size-4" />
            {pageCopy.newBook}
          </Button>
        </section>

        <section className="pt-8">
          {isLoading ? <BooksSkeleton label={pageCopy.loading} /> : null}

          {!isLoading && hasError ? (
            <Card className="mx-auto max-w-lg border-border bg-card shadow-none">
              <CardContent className="flex flex-col items-center px-7 py-12 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 ring-1 ring-inset ring-rose-500/20">
                  <AlertCircle className="size-5" />
                </span>
                <h2 className="mt-5 text-lg font-semibold text-foreground">
                  {pageCopy.errorTitle}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {pageCopy.errorDescription}
                </p>
                <Button
                  className="mt-6 h-9 rounded-lg bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
                  onClick={() => setReloadKey((value) => value + 1)}
                  type="button"
                >
                  <RefreshCw className="mr-2 size-3.5" />
                  {pageCopy.retry}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && !hasError && books.length === 0 ? (
            <Card className="border-dashed border-border bg-muted/20 shadow-none">
              <CardContent className="flex min-h-[360px] flex-col items-center justify-center px-6 py-14 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/50 text-muted-foreground">
                  <BookOpen className="size-6" />
                </span>
                <h2 className="mt-6 text-xl font-semibold tracking-[-0.025em] text-foreground">
                  {pageCopy.emptyTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {pageCopy.emptyDescription}
                </p>
                <Button
                  className="mt-7 h-10 rounded-lg bg-blue-600 px-5 text-white hover:bg-blue-500"
                  onClick={() => onNavigate("/book/create")}
                  type="button"
                >
                  <Plus className="mr-2 size-4" />
                  {pageCopy.createBook}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && !hasError && books.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {books.map((book) => {
                const isHighlighted = book.id === highlightedBookId;
                const updatedAt = new Intl.DateTimeFormat(
                  language === "zh" ? "zh-CN" : "en",
                  { dateStyle: "medium" },
                ).format(new Date(book.updated_at));

                return (
                  <Card
                    className={cn(
                      "group overflow-hidden border-border bg-card shadow-none transition-colors hover:border-blue-500/35",
                      isHighlighted &&
                        "border-blue-500/60 ring-2 ring-blue-500/20",
                    )}
                    id={isHighlighted ? "newly-created-book" : undefined}
                    key={book.id}
                  >
                    <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-border bg-[radial-gradient(circle_at_65%_28%,rgba(59,130,246,0.22),transparent_35%),linear-gradient(145deg,#1b1e25,#101216)]">
                      <BookOpen className="size-12 text-blue-400/75" strokeWidth={1.4} />
                      <span className="absolute inset-x-6 bottom-5 truncate text-center text-xs font-medium tracking-[0.14em] text-zinc-500 uppercase">
                        OpenClassBook
                      </span>
                      {isHighlighted ? (
                        <Badge className="absolute right-4 top-4 border-blue-400/25 bg-blue-500/15 text-blue-200">
                          {pageCopy.newlyCreated}
                        </Badge>
                      ) : null}
                    </div>

                    <CardContent className="flex min-h-[230px] flex-col p-5">
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="line-clamp-2 text-lg font-semibold tracking-[-0.025em] text-foreground">
                          {book.title}
                        </h2>
                        <Badge
                          className={cn(
                            "shrink-0 border",
                            statusStyles[book.status],
                          )}
                        >
                          {pageCopy.statuses[book.status]}
                        </Badge>
                      </div>
                      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
                        {book.description || pageCopy.noDescription}
                      </p>

                      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="size-3.5" />
                          {pageCopy.authors(book.author_count)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" />
                          {pageCopy.updated} {updatedAt}
                        </span>
                      </div>

                      <div className="mt-auto pt-5">
                        {deleteErrorBookId === book.id ? (
                          <p
                            aria-live="polite"
                            className="mb-3 text-xs text-rose-600 dark:text-rose-400"
                            role="status"
                          >
                            {pageCopy.deleteError}
                          </p>
                        ) : null}
                        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                          <button
                            className="group/link flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                            onClick={() =>
                              onNavigate(`/book/${book.id}/dashboard`)
                            }
                            type="button"
                          >
                            {pageCopy.openDashboard}
                            <ArrowRight className="ml-2 size-4 transition-transform group-hover/link:translate-x-0.5" />
                          </button>
                          <Button
                            aria-label={`${pageCopy.deleteBook}: ${book.title}`}
                            className="h-8 rounded-md border-rose-500/20 px-2.5 text-xs text-rose-600 hover:border-rose-500/35 hover:bg-rose-500/10 dark:text-rose-400"
                            disabled={deletingBookId !== null}
                            onClick={() => void deleteBook(book)}
                            type="button"
                            variant="outline"
                          >
                            {deletingBookId === book.id ? (
                              <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1.5 size-3.5" />
                            )}
                            {deletingBookId === book.id
                              ? pageCopy.deleting
                              : pageCopy.deleteBook}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
