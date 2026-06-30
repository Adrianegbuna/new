import { API_BASE_URL } from "@/config/env";

const backendOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

export function resolveMediaUrl(value?: string | null) {
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${backendOrigin}${value}`;
  }
  return `${backendOrigin}/${value}`;
}
