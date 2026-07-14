import { mockArticles, type Article, type ArticleStatus } from "@/mock/articles";

export type ArticleUpdate = Partial<
  Pick<Article, "title" | "content" | "image" | "author" | "status">
>;

const articles = mockArticles.map((article) => ({ ...article }));

function findArticle(id: string) {
  const article = articles.find((candidate) => candidate.id === id);
  if (!article) throw new Error(`Article ${id} was not found`);
  return article;
}

function updateStatus(id: string, status: ArticleStatus) {
  const article = findArticle(id);
  article.status = status;
  article.updatedAt = new Date().toISOString();
  return { ...article };
}

export const reviewArticleRepository = {
  async getArticles() {
    return articles.map((article) => ({ ...article }));
  },

  async approveArticle(id: string) {
    return updateStatus(id, "approved");
  },

  async rejectArticle(id: string) {
    return updateStatus(id, "rejected");
  },

  async updateArticle(id: string, data: ArticleUpdate) {
    const article = findArticle(id);
    Object.assign(article, data, { updatedAt: new Date().toISOString() });
    return { ...article };
  },
};
