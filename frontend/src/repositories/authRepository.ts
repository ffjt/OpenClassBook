import { ApiError, apiRequest } from "@/repositories/apiClient";

const accessTokenKey = "openclassbook-access-token";
const refreshTokenKey = "openclassbook-refresh-token";

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
  const accessToken = window.localStorage.getItem(accessTokenKey);
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function mergeHeaders(headers?: HeadersInit): Record<string, string> {
  return {
    ...authorizationHeaders(),
    ...Object.fromEntries(new Headers(headers).entries()),
  };
}

async function refreshSession(): Promise<boolean> {
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
  try {
    return await apiRequest<T>(path, {
      ...init,
      headers: mergeHeaders(init?.headers),
    });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !(await refreshSession())) {
      throw error;
    }
    return apiRequest<T>(path, {
      ...init,
      headers: mergeHeaders(init?.headers),
    });
  }
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
