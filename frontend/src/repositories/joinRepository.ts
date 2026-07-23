import type { AuthorDetail } from "@/repositories/authorRepository";
import type { Book } from "@/repositories/bookRepository";
import { authorApiRequest } from "@/repositories/authRepository";
import { apiRequest } from "@/repositories/apiClient";

interface JoinBookResponse {
  book: Book;
}

export interface JoinResponse {
  mode: "created" | "selection_required";
  author_id: number | null;
  author_token: string | null;
}

export const joinRepository = {
  get(inviteCode: string) {
    return apiRequest<JoinBookResponse>(`/join/${encodeURIComponent(inviteCode)}`);
  },

  join(inviteCode: string, name: string, classValue?: string) {
    return apiRequest<JoinResponse>(`/join/${encodeURIComponent(inviteCode)}`, {
      body: JSON.stringify({ name, class_value: classValue || undefined }),
      method: "POST",
    });
  },

  getAuthor(authorId: number) {
    return authorApiRequest<AuthorDetail>(`/authors/${authorId}`, authorId);
  },
};
