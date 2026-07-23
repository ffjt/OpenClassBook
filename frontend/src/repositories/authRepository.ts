import { ApiError, apiBaseUrl, apiRequest } from "@/repositories/apiClient";

const accessTokenKey = "openclassbook-access-token";
const refreshTokenKey = "openclassbook-refresh-token";
const authorSessionsKey = "openclassbook-author-sessions";

export interface AuthorSession {
  authorId: number;
  bookId: number;
  name: string;
  token: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthenticationResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: AuthUser;
}

interface VerificationCodeResponse {
  message: string;
  message_zh: string;
  retry_after_seconds: number;
}

export interface RegisterInput {
  email: string;
  code: string;
  password: string;
  username: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

function saveSession(response: AuthenticationResponse): AuthUser {
  window.localStorage.setItem(accessTokenKey, response.access_token);
  window.localStorage.setItem(refreshTokenKey, response.refresh_token);
  return response.user;
}

function authorizationHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const accessToken = window.localStorage.getItem(accessTokenKey);
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function mergeHeaders(headers?: HeadersInit): Record<string, string> {
  return {
    ...authorizationHeaders(),
    ...Object.fromEntries(new Headers(headers).entries()),
  };
}

function getApiUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${apiBaseUrl}/api/v1${path}`;
}

async function readErrorDetail(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: ApiError["detail"] };
    return payload.detail;
  } catch {
    return undefined;
  }
}

async function refreshSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = window.localStorage.getItem(refreshTokenKey);
  if (!refreshToken) return false;

  try {
    saveSession(
      await apiRequest<AuthenticationResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
    );
    return true;
  } catch {
    authRepository.clearSession();
    return false;
  }
}

export async function authenticatedApiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await authenticatedFetch(path, init);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function authenticatedFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const request = () => {
    const headers = mergeHeaders(init?.headers);
    if (init?.body && !(init.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    return fetch(getApiUrl(path), {
      ...init,
      headers: Object.keys(headers).length ? headers : undefined,
    });
  };

  let response = await request();
  if (response.status === 401 && (await refreshSession())) {
    response = await request();
  }
  if (response.ok) return response;
  throw new ApiError(
    `API request failed (${response.status})`,
    response.status,
    await readErrorDetail(response),
  );
}

export function getAuthenticationHeaders(): Record<string, string> {
  return authorizationHeaders();
}

function getAuthorSessions(): AuthorSession[] {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(authorSessionsKey) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (value): value is AuthorSession =>
            typeof value === "object" && value !== null &&
            typeof (value as AuthorSession).authorId === "number" &&
            typeof (value as AuthorSession).bookId === "number" &&
            typeof (value as AuthorSession).name === "string" &&
            typeof (value as AuthorSession).token === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function saveAuthorSessions(sessions: AuthorSession[]) {
  window.sessionStorage.setItem(authorSessionsKey, JSON.stringify(sessions));
}

export const authorSessionRepository = {
  save(session: AuthorSession) {
    saveAuthorSessions([
      ...getAuthorSessions().filter((current) => current.authorId !== session.authorId),
      session,
    ]);
  },
  get(authorId: number) {
    return getAuthorSessions().find((session) => session.authorId === authorId) ?? null;
  },
  getByBookAndName(bookId: number, name: string) {
    return getAuthorSessions().find(
      (session) => session.bookId === bookId && session.name === name,
    ) ?? null;
  },
  getByBook(bookId: number) {
    return getAuthorSessions().find((session) => session.bookId === bookId) ?? null;
  },
  clear(authorId: number) {
    saveAuthorSessions(getAuthorSessions().filter((session) => session.authorId !== authorId));
  },
};

export async function authorApiRequest<T>(
  path: string,
  authorId: number,
  init?: RequestInit,
): Promise<T> {
  const session = authorSessionRepository.get(authorId);
  if (!session) {
    throw new ApiError("Author session is unavailable", 401);
  }
  return apiRequest<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.token}`,
      ...init?.headers,
    },
  });
}

export async function authorBookApiRequest<T>(
  path: string,
  bookId: number,
  init?: RequestInit,
): Promise<T> {
  const session = authorSessionRepository.getByBook(bookId);
  if (!session) {
    throw new ApiError("Author session is unavailable", 401);
  }
  return authorApiRequest<T>(path, session.authorId, init);
}

export const authRepository = {
  hasSession: () => Boolean(window.localStorage.getItem(refreshTokenKey)),
  clearSession: () => {
    window.localStorage.removeItem(accessTokenKey);
    window.localStorage.removeItem(refreshTokenKey);
  },
  async sendVerificationCode(email: string) {
    return apiRequest<VerificationCodeResponse>("/auth/verification-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  async register(input: RegisterInput) {
    return saveSession(
      await apiRequest<AuthenticationResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  },
  async login(input: LoginInput) {
    return saveSession(
      await apiRequest<AuthenticationResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
  },
  async me() {
    return authenticatedApiRequest<AuthUser>("/auth/me");
  },
  async logout() {
    const refreshToken = window.localStorage.getItem(refreshTokenKey);
    try {
      if (refreshToken) {
        await apiRequest<void>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } finally {
      authRepository.clearSession();
    }
  },
};
