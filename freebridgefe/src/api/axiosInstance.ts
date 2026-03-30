import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
export const USER_KEY = "user";
export const AUTH_SESSION_UPDATED_EVENT = "auth-session-updated";
export const AUTH_SESSION_CLEARED_EVENT = "auth-session-cleared";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  httpStatus?: string;
}

interface RefreshTokenData {
  accessToken: string;
  refreshToken: string;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

const tokenRefreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token management
export const TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";

let refreshRequestPromise: Promise<{
  status: "success" | "expired" | "failed";
  accessToken?: string;
  message?: string;
}> | null = null;
let sessionExpiredAlertShown = false;

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = (accessToken: string, refreshToken?: string): void => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(AUTH_SESSION_UPDATED_EVENT, {
        detail: { accessToken },
      }),
    );
  }

  sessionExpiredAlertShown = false;
};

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearStoredAuthData = (): void => {
  clearTokens();
  localStorage.removeItem(USER_KEY);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_CLEARED_EVENT));
  }
};

async function refreshAccessToken() {
  if (refreshRequestPromise) {
    return refreshRequestPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return {
      status: "expired" as const,
      message: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
    };
  }

  refreshRequestPromise = tokenRefreshClient
    .post<ApiResponse<RefreshTokenData>>("/api/users/refresh", { refreshToken })
    .then((response) => {
      const nextTokens = response.data.data;
      setTokens(nextTokens.accessToken, nextTokens.refreshToken);
      return {
        status: "success" as const,
        accessToken: nextTokens.accessToken,
      };
    })
    .catch((error: AxiosError<ApiResponse<unknown>>) => {
      const isExpiredSession =
        error.response?.status === 401 || error.response?.status === 400;

      if (isExpiredSession) {
        return {
          status: "expired" as const,
          message:
            error.response?.data?.message ||
            "로그인이 만료되었습니다. 다시 로그인해 주세요.",
        };
      }

      return {
        status: "failed" as const,
        message:
          error.response?.data?.message || "인증 정보를 갱신하지 못했습니다.",
      };
    })
    .finally(() => {
      refreshRequestPromise = null;
    });

  return refreshRequestPromise;
}

function handleExpiredSession(message?: string) {
  clearStoredAuthData();

  if (!sessionExpiredAlertShown) {
    sessionExpiredAlertShown = true;
    window.alert(message || "로그인이 만료되었습니다. 다시 로그인해 주세요.");
  }

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

// Request interceptor - Add JWT token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (typeof config.headers.setContentType === "function") {
        config.headers.setContentType(undefined);
      } else {
        delete config.headers["Content-Type"];
      }
    }

    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle 401 errors (redirect to login)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined;

    // Define unauthenticated endpoints that shouldn't trigger automatic logout on 401
    const unauthenticatedEndpoints = [
      "/api/users/login",
      "/api/users/refresh",
      "/api/users/signup",
      "/api/users/check-email",
      "/api/auth/", // This safely covers send, verify, and resend verification
    ];
    const isUnauthenticatedEndpoint = unauthenticatedEndpoints.some(
      (endpoint) => config?.url?.includes(endpoint),
    );

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      isUnauthenticatedEndpoint
    ) {
      return Promise.reject(error);
    }

    config._retry = true;

    const refreshResult = await refreshAccessToken();

    if (refreshResult.status === "success") {
      return apiClient(config);
    }

    if (refreshResult.status === "expired") {
      handleExpiredSession(refreshResult.message);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
