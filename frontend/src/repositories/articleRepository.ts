import { mockArticles, type Article, type ArticleStatus } from "@/mock/articles";

export type ArticleUpdate = Partial<
  Pick<Article, "title" | "content" | "image" | "author" | "status">
>;

/** API-shaped contract. The UI depends on this contract, not on the data source. */
export interface ArticleRepository {
  /** GET /articles */
  getArticles(): Promise<Article[]>;
  /** GET /articles/:id */
  getArticleById(id: string): Promise<Article | null>;
  /** PATCH /articles/:id/status */
  approveArticle(id: string): Promise<Article>;
  /** PATCH /articles/:id/status */
  rejectArticle(id: string): Promise<Article>;
  /** PATCH /articles/:id */
  updateArticle(id: string, data: ArticleUpdate): Promise<Article>;
}

let articles = mockArticles.map((article) => ({ ...article }));

function copyArticle(article: Article): Article {
  return { ...article };
}

function findArticle(id: string): Article {
  const article = articles.find((candidate) => candidate.id === id);
  if (!article) {
    throw new Error(`Article ${id} was not found`);
  }
  return article;
}

function updateStatus(id: string, status: ArticleStatus): Article {
  const article = findArticle(id);
  article.status = status;
  article.updatedAt = new Date().toISOString();
  return copyArticle(article);
}

export const articleRepository: ArticleRepository = {
  async getArticles() {
    return articles.map(copyArticle);
  },

  async getArticleById(id) {
    const article = articles.find((candidate) => candidate.id === id);
    return article ? copyArticle(article) : null;
  },

  async approveArticle(id) {
    return updateStatus(id, "approved");
  },

  async rejectArticle(id) {
    return updateStatus(id, "rejected");
  },

  async updateArticle(id, data) {
    const article = findArticle(id);
    Object.assign(article, data, { updatedAt: new Date().toISOString() });
    return copyArticle(article);
  },
};

export function resetMockArticles() {
  articles = mockArticles.map((article) => ({ ...article }));
}
