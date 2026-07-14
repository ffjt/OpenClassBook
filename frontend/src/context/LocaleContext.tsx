import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "zh";

const messages = {
  en: {
    dashboard: "Dashboard",
    review: "Review",
    adminWorkspace: "Admin workspace",
    editorialDesk: "Editorial desk",
    reviewSubmissions: "Review submissions",
    moreListOptions: "More list options",
    searchArticles: "Search articles",
    filterByStatus: "Filter by review status",
    allStatuses: "All statuses",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    articles: "articles",
    updated: "Updated",
    noMatches: "No articles match this view.",
    articleEditor: "Article editor",
    readAndReview: "Read and review",
    article: "Article",
    by: "By",
    approve: "Approve",
    approving: "Approving...",
    reject: "Reject",
    returning: "Returning...",
    saveDraft: "Save draft",
    saving: "Saving...",
    articleApproved: "Article approved",
    articleReturned: "Article returned for revision",
    draftUpdated: "Draft timestamp updated",
    selectArticle: "Select an article to begin.",
    liveOutput: "Live output",
    publicationPreview: "Publication preview",
    synced: "Synced",
    previewEmpty: "Select an article to preview its publication layout.",
    readInIssue: "Read in issue",
    fieldNotes: "Field Notes",
    switchLanguage: "切换至中文",
  },
  zh: {
    dashboard: "工作台",
    review: "审核",
    adminWorkspace: "管理员工作区",
    editorialDesk: "编辑工作台",
    reviewSubmissions: "审核投稿",
    moreListOptions: "更多列表选项",
    searchArticles: "搜索文章",
    filterByStatus: "按审核状态筛选",
    allStatuses: "全部状态",
    pending: "待审核",
    approved: "已通过",
    rejected: "已退回",
    articles: "篇文章",
    updated: "更新时间",
    noMatches: "没有符合当前条件的文章。",
    articleEditor: "文章详情",
    readAndReview: "阅读与审核",
    article: "文章",
    by: "作者",
    approve: "通过",
    approving: "正在通过...",
    reject: "退回修改",
    returning: "正在退回...",
    saveDraft: "保存草稿",
    saving: "正在保存...",
    articleApproved: "文章已通过审核",
    articleReturned: "文章已退回修改",
    draftUpdated: "草稿时间已更新",
    selectArticle: "请选择一篇文章开始审核。",
    liveOutput: "实时输出",
    publicationPreview: "出版预览",
    synced: "已同步",
    previewEmpty: "请选择文章以预览出版效果。",
    readInIssue: "在本期中阅读",
    fieldNotes: "课堂札记",
    switchLanguage: "Switch to English",
  },
} as const;

type MessageKey = keyof (typeof messages)["en"];

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() =>
    navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en",
  );

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key) => messages[locale][key] }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// Context hooks intentionally share this small module with the provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
