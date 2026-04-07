const NXH_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CertificateInfo {
  domain: string;
  status: "valid" | "warning" | "expired" | "invalid" | "unreachable" | "error";
  days_remaining: number | null;
  expiry_date: string | null;
  issuer?: string;
  subject?: string;
  error?: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${NXH_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    // Timeout via AbortController
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API ${res.status}: ${error}`);
  }

  return res.json();
}

export const api = {
  getDomains: () =>
    apiFetch<{ domains: string[] }>("/api/domains"),

  addDomain: (domain: string) =>
    apiFetch("/api/domains", {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),

  addDomainsBulk: (domains: string[]) =>
    apiFetch("/api/domains/bulk", {
      method: "POST",
      body: JSON.stringify({ domains }),
    }),

  deleteDomain: (domain: string) =>
    apiFetch(`/api/domains/${domain}`, { method: "DELETE" }),

  checkDomain: (domain: string) =>
    apiFetch<CertificateInfo>(`/api/check/${domain}`),

  checkAll: () =>
    apiFetch<{ results: CertificateInfo[] }>("/api/check-all"),
};