import type { AxiosResponse } from "axios";
import apiClient from "./axiosInstance";

const RECOMMENDATION_REQUEST_TIMEOUT_MS = 120000;
const DEFAULT_RETRY_AFTER_MS = 3000;

export interface AiRecommendationResponseDTO {
  id: number;
  nameOrTitle: string;
  matchScore: number;
  skills?: string[];
  description?: string;
  budget?: number;
  duration?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

const createAbortError = (): Error => {
  const error = new Error("Recommendation request was aborted.");
  error.name = "AbortError";
  return error;
};

const waitForNextRetry = (delayMs: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    let settled = false;
    let abortHandler: (() => void) | undefined;

    const cleanup = () => {
      if (abortHandler) {
        signal?.removeEventListener("abort", abortHandler);
      }
    };

    const timer = globalThis.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    }, delayMs);

    abortHandler = () => {
      if (settled) {
        return;
      }
      settled = true;
      globalThis.clearTimeout(timer);
      cleanup();
      reject(createAbortError());
    };

    signal?.addEventListener("abort", abortHandler, { once: true });
  });

const resolveRetryDelay = (retryAfterHeader?: string): number => {
  const seconds = Number(retryAfterHeader);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  return DEFAULT_RETRY_AFTER_MS;
};

const getApiErrorMessage = <T>(
  response: AxiosResponse<ApiResponse<T>>,
  fallbackMessage: string,
): string =>
  response.data.error?.message ||
  response.data.message ||
  fallbackMessage;

const pollRecommendationUntilReady = async <T>(
  request: () => Promise<AxiosResponse<ApiResponse<T>>>,
  fallbackMessage: string,
  signal?: AbortSignal,
): Promise<T> => {
  while (true) {
    if (signal?.aborted) {
      throw createAbortError();
    }

    const response = await request();

    if (response.status === 202) {
      const retryDelay = resolveRetryDelay(
        response.headers["retry-after"] as string | undefined,
      );
      await waitForNextRetry(retryDelay, signal);
      continue;
    }

    if (!response.data.success) {
      throw new Error(getApiErrorMessage(response, fallbackMessage));
    }

    return response.data.data;
  }
};

export const getFreelancerRecommendations = async (
  jobPostingId: number | string,
  signal?: AbortSignal,
): Promise<AiRecommendationResponseDTO[]> => {
  const encodedJobPostingId = encodeURIComponent(String(jobPostingId));

  return pollRecommendationUntilReady(
    () =>
      apiClient.get<ApiResponse<AiRecommendationResponseDTO[]>>(
        `/api/v1/employer/jobs/${encodedJobPostingId}/recommendations`,
        {
          signal,
          timeout: RECOMMENDATION_REQUEST_TIMEOUT_MS,
        },
      ),
    "추천 프리랜서를 불러오지 못했습니다.",
    signal,
  );
};

export const getJobRecommendationsForFreelancer = async (
  signal?: AbortSignal,
): Promise<AiRecommendationResponseDTO[]> =>
  pollRecommendationUntilReady(
    () =>
      apiClient.get<ApiResponse<AiRecommendationResponseDTO[]>>(
        "/api/v1/freelancer/jobs/recommendations",
        {
          signal,
          timeout: RECOMMENDATION_REQUEST_TIMEOUT_MS,
        },
      ),
    "추천 프로젝트를 불러오지 못했습니다.",
    signal,
  );
