const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_SECRET = process.env.API_SECRET ?? "";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_SECRET,
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export type ApiEnvelope<T> = {
  data: T;
  error: null;
  meta: { total?: number } | null;
};

export function get<T>(path: string) {
  return apiFetch<ApiEnvelope<T>>(path);
}

export function post<T>(path: string, body: unknown) {
  return apiFetch<ApiEnvelope<T>>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function put<T>(path: string, body: unknown) {
  return apiFetch<ApiEnvelope<T>>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function del<T>(path: string) {
  return apiFetch<ApiEnvelope<T>>(path, { method: "DELETE" });
}
