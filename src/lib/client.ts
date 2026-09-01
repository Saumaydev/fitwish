"use client";

/* Client-side API helper + shared hooks */

export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; formData?: FormData } = {}
): Promise<T> {
  const { method, body, formData } = options;
  const init: RequestInit = { method: method ?? (body || formData ? "POST" : "GET") };
  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiClientError(0, "Unable to connect. Check your connection and try again.");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? "Something went wrong. Please try again.";
    throw new ApiClientError(res.status, message);
  }
  return data as T;
}

export const swrFetcher = <T,>(url: string) => api<T>(url);

/** Reusable online/offline status */
export function useOnlineStatus(): boolean {
  if (typeof window === "undefined") return true;
  // Handled inside OnlineBanner with its own subscription.
  return true;
}
