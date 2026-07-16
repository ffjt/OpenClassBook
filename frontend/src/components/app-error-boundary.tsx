import { Component, type ErrorInfo, type ReactNode } from "react";

import type { Language } from "@/lib/i18n";

const copy = {
  en: {
    eyebrow: "Application error",
    title: "This page could not be displayed.",
    description:
      "Your saved book data is safe. Reload the page, or return to My Books and try again.",
    reload: "Reload page",
    books: "Go to My Books",
  },
  zh: {
    eyebrow: "应用错误",
    title: "暂时无法显示此页面。",
    description: "已保存的书籍数据不会丢失。请刷新页面，或返回“我的书籍”后重试。",
    reload: "刷新页面",
    books: "返回我的书籍",
  },
} as const;

interface AppErrorBoundaryProps {
  children: ReactNode;
  language: Language;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("OpenClassBook render error", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const text = copy[this.props.language];

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <section className="route-enter w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-2xl sm:p-10">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <span aria-hidden="true" className="text-xl">!</span>
          </span>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-500">
            {text.eyebrow}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            {text.title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {text.description}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => window.location.reload()}
              type="button"
            >
              {text.reload}
            </button>
            <button
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => window.location.assign("/book")}
              type="button"
            >
              {text.books}
            </button>
          </div>
        </section>
      </main>
    );
  }
}
