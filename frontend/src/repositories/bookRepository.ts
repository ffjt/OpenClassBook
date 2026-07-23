import { authenticatedApiRequest } from "@/repositories/authRepository";

export type NumberMode = "none" | "automatic" | "existing";
export type ClassCollectionMode = "none" | "fixed" | "template";
export type ClassValueStyle = "arabic" | "chinese";
export type BookStatus = "collecting" | "reviewing" | "published";
export type ArticlePageMode = "single" | "flow";
export type LayoutSectionKind = "page" | "articles";
export type LayoutSectionPreset =
  | "cover"
  | "contents"
  | "preface"
  | "articles"
  | "principal_message"
  | "teacher_message"
  | "afterword"
  | "closing"
  | "acknowledgement"
  | "ending"
  | "back_cover";

export interface BookLayoutSection {
  id: string;
  kind: LayoutSectionKind;
  preset: LayoutSectionPreset | null;
  name: string | null;
  file: string | null;
  hidden: boolean;
  show_author: boolean;
  show_class: boolean;
}

export interface Book {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  owner_name: string;
  school: string | null;
  publisher: string | null;
  appearance_metadata: Record<string, string> | null;
  invite_code: string;
  invite_enabled: boolean;
  submission_enabled: boolean;
  submission_deadline: string | null;
  allow_multiple_articles: boolean;
  limit_articles_per_author: boolean;
  max_articles_per_author: number;
  allow_edit_after_submit: boolean;
  allow_delete_article: boolean;
  class_collection_mode: ClassCollectionMode;
  class_fixed_value: string | null;
  class_name_template: string | null;
  class_value_style: ClassValueStyle | null;
  number_mode: NumberMode;
  claim_number_start: number;
  claim_number_end: number;
  number_prefix: string;
  number_digits: number;
  status: BookStatus;
  setup_completed: boolean;
  cover_file: string | null;
  preface_file: string | null;
  afterword_file: string | null;
  acknowledgement_file: string | null;
  back_cover_file: string | null;
  layout_sections: BookLayoutSection[] | null;
  layout_article_order: number[] | null;
  layout_article_page_mode: ArticlePageMode;
  author_count: number;
  article_count: number;
  approved_article_count: number;
  claimed_number_count: number;
  created_at: string;
  updated_at: string;
}

export type InvitationStatus = "active" | "disabled" | "replaced";

export interface Invitation {
  id: number;
  book_id: number;
  code: string;
  created_by: number;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  status: InvitationStatus;
  created_at: string;
}

export interface InvitationSettingsInput {
  expires_at?: string | null;
  max_uses?: number | null;
}

export interface BookCreateInput {
  title: string;
  description: string | null;
  owner_name: string;
  number_mode?: NumberMode;
  claim_number_start?: number;
  claim_number_end?: number;
  number_prefix?: string;
  number_digits?: number;
}

export type BookUpdateInput = Partial<
  Pick<
    Book,
    | "title"
    | "subtitle"
    | "description"
    | "owner_name"
    | "school"
    | "publisher"
    | "appearance_metadata"
    | "submission_enabled"
    | "submission_deadline"
    | "allow_multiple_articles"
    | "limit_articles_per_author"
    | "max_articles_per_author"
    | "allow_edit_after_submit"
    | "allow_delete_article"
    | "class_collection_mode"
    | "class_fixed_value"
    | "class_name_template"
    | "class_value_style"
    | "invite_enabled"
    | "number_mode"
    | "claim_number_start"
    | "claim_number_end"
    | "number_prefix"
    | "number_digits"
    | "status"
    | "setup_completed"
    | "cover_file"
    | "preface_file"
    | "afterword_file"
    | "acknowledgement_file"
    | "back_cover_file"
    | "layout_sections"
    | "layout_article_page_mode"
  >
>;

export const bookRepository = {
  create(data: BookCreateInput) {
    return authenticatedApiRequest<Book>("/books", {
      body: JSON.stringify(data),
      method: "POST",
    });
  },

  list() {
    return authenticatedApiRequest<Book[]>("/books");
  },

  get(id: number) {
    return authenticatedApiRequest<Book>(`/books/${id}`);
  },

  update(id: number, data: BookUpdateInput) {
    return authenticatedApiRequest<Book>(`/books/${id}`, {
      body: JSON.stringify(data),
      method: "PATCH",
    });
  },

  delete(id: number) {
    return authenticatedApiRequest<void>(`/books/${id}`, {
      method: "DELETE",
    });
  },

  regenerateInviteCode(id: number) {
    return authenticatedApiRequest<Book>(`/books/${id}/invite-code`, {
      method: "POST",
    });
  },

  listInvitations(id: number) {
    return authenticatedApiRequest<Invitation[]>(`/books/${id}/invitations`);
  },

  createInvitation(id: number, data: InvitationSettingsInput) {
    return authenticatedApiRequest<Invitation>(`/books/${id}/invitations`, {
      body: JSON.stringify(data),
      method: "POST",
    });
  },

  updateInvitation(id: number, invitationId: number, data: InvitationSettingsInput) {
    return authenticatedApiRequest<Invitation>(`/books/${id}/invitations/${invitationId}`, {
      body: JSON.stringify(data),
      method: "PATCH",
    });
  },

  regenerateInvitation(id: number, invitationId: number) {
    return authenticatedApiRequest<Invitation>(
      `/books/${id}/invitations/${invitationId}/regenerate`,
      { method: "POST" },
    );
  },

  disableInvitation(id: number, invitationId: number) {
    return authenticatedApiRequest<Invitation>(
      `/books/${id}/invitations/${invitationId}/disable`,
      { method: "POST" },
    );
  },

  deleteDrafts(id: number) {
    return authenticatedApiRequest<Book>(`/books/${id}/drafts`, { method: "DELETE" });
  },

  deleteArticles(id: number) {
    return authenticatedApiRequest<Book>(`/books/${id}/articles`, { method: "DELETE" });
  },

  deleteAuthors(id: number) {
    return authenticatedApiRequest<Book>(`/books/${id}/authors`, { method: "DELETE" });
  },
};
