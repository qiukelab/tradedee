import { useQuery } from "@tanstack/react-query";
export async function api(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
) {
  const r = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message ?? "ไม่สามารถโหลดข้อมูลได้");
  return data;
}
export function useData(path: string, enabled = true) {
  return useQuery({
    queryKey: [path],
    queryFn: () => api(path),
    enabled,
    retry: false,
    refetchInterval: 30000,
  });
}
