import type { Book, BookUpdateInput } from "@/repositories/bookRepository";

export interface SubmissionRules {
  deadlineMode: "none" | "date";
  deadlineDate: string;
  articleLimitMode: "single" | "multiple" | "unlimited";
  maxArticles: number;
  allowEditAfterSubmit: boolean;
  allowDeleteArticle: boolean;
}

function toLocalDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function submissionRulesFromBook(book: Book): SubmissionRules {
  return {
    deadlineMode: book.submission_deadline ? "date" : "none",
    deadlineDate: toLocalDateInput(book.submission_deadline),
    articleLimitMode: !book.allow_multiple_articles
      ? "single"
      : book.limit_articles_per_author
        ? "multiple"
        : "unlimited",
    maxArticles: book.max_articles_per_author > 1
      ? book.max_articles_per_author
      : 5,
    allowEditAfterSubmit: book.allow_edit_after_submit,
    allowDeleteArticle: book.allow_delete_article,
  };
}

export function submissionRulesToUpdate(rules: SubmissionRules): BookUpdateInput {
  const deadline = rules.deadlineMode === "date" && rules.deadlineDate
    ? new Date(`${rules.deadlineDate}T23:59:59.999`).toISOString()
    : null;
  const multiple = rules.articleLimitMode !== "single";
  return {
    submission_deadline: deadline,
    allow_multiple_articles: multiple,
    limit_articles_per_author: rules.articleLimitMode !== "unlimited",
    max_articles_per_author: rules.articleLimitMode === "single" ? 1 : rules.maxArticles,
    allow_edit_after_submit: rules.allowEditAfterSubmit,
    allow_delete_article: rules.allowDeleteArticle,
  };
}

export function isSubmissionDeadlinePassed(
  book: Pick<Book, "submission_deadline">,
) {
  return Boolean(
    book.submission_deadline && Date.now() > Date.parse(book.submission_deadline),
  );
}
