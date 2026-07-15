import axios, { AxiosError } from "axios";

import { apiBaseUrl } from "@/repositories/apiClient";

export type UploadType =
  | "cover"
  | "preface"
  | "afterword"
  | "acknowledgement"
  | "back_cover";

export interface UploadedFile {
  success: true;
  file_name: string;
  file_size: number;
  file_type: string;
  path: string;
  uploaded_at: string;
}

export interface UploadedFileMetadata {
  file_name: string;
  file_size: number;
  file_type: string;
  path: string;
  uploaded_at: string;
}

export type UploadErrorCode =
  | "file_too_large"
  | "unsupported_file_format"
  | "upload_failed";

const client = axios.create({
  baseURL: `${apiBaseUrl}/api/v1`,
});

export const uploadRepository = {
  async upload(
    bookId: number,
    type: UploadType,
    file: File,
    onProgress: (progress: number) => void,
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    const response = await client.post<UploadedFile>(
      `/books/${bookId}/upload`,
      form,
      {
        onUploadProgress: ({ loaded, total }) => {
          const size = total || file.size;
          onProgress(size ? Math.min(100, Math.round((loaded / size) * 100)) : 0);
        },
      },
    );
    return response.data;
  },

  async getMetadata(bookId: number, type: UploadType, path: string) {
    const response = await client.head(`/files/${bookId}/${type}`);
    return {
      file_name: getFileName(path),
      file_size: Number(response.headers["content-length"] || 0),
      file_type: String(
        response.headers["content-type"] || "application/octet-stream",
      ),
      path: String(response.headers["x-file-path"] || path),
      uploaded_at: String(
        response.headers["last-modified"] || new Date().toISOString(),
      ),
    } satisfies UploadedFileMetadata;
  },

  delete(bookId: number, type: UploadType) {
    return client.delete<void>(`/books/${bookId}/upload/${type}`);
  },

  getFileUrl(bookId: number, type: UploadType) {
    return `${apiBaseUrl}/api/v1/files/${bookId}/${type}`;
  },
};

export function getUploadErrorCode(error: unknown): UploadErrorCode {
  if (!(error instanceof AxiosError)) return "upload_failed";
  const detail = error.response?.data as { detail?: { code?: string } } | undefined;
  if (detail?.detail?.code === "file_too_large") return "file_too_large";
  if (detail?.detail?.code === "unsupported_file_format") {
    return "unsupported_file_format";
  }
  return "upload_failed";
}

function getFileName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}
