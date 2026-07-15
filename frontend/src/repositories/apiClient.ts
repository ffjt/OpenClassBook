export interface ApiErrorDetail {
  code?: string;
  message?: string;
  message_zh?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: ApiErrorDetail,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(
      `API request failed (${response.status})`,
      response.status,
      await readErrorDetail(response),
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function readErrorDetail(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: ApiErrorDetail };
    return payload.detail;
  } catch {
    return undefined;
  }
}

export async function apiDownload(path: string): Promise<Blob> {
  const url = /^https?:\/\//.test(path) ? path : `${apiBaseUrl}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(`API request failed (${response.status})`, response.status);
  }
  return response.blob();
}
