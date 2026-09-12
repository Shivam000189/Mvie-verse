import axios, { AxiosInstance } from "axios";
import { env } from "./env";

/**
 * Dedicated Axios HTTP client configured for TMDB.
 * Supports modern Bearer Token (v4 Read Access Token) as primary auth,
 * with fallback to v3 API Key query parameter.
 */
export const createTmdbClient = (): AxiosInstance => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (env.tmdb.accessToken) {
    headers["Authorization"] = `Bearer ${env.tmdb.accessToken}`;
  }

  const client = axios.create({
    baseURL: env.tmdb.baseUrl,
    timeout: env.tmdb.timeoutMs,
    headers,
  });

  // Request interceptor: If no Bearer token is set, attach v3 api_key query param
  client.interceptors.request.use((config) => {
    if (!env.tmdb.accessToken && env.tmdb.apiKey) {
      config.params = {
        ...config.params,
        api_key: env.tmdb.apiKey,
      };
    }
    return config;
  });

  return client;
};

export const tmdbClient = createTmdbClient();
