export function sanitizeSubdomain(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getTenantSubdomain() {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const paramSubdomain = params.get("org");
  if (paramSubdomain) return sanitizeSubdomain(paramSubdomain);

  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");

  if (!isLocalHost && parts.length >= 3 && parts[0] !== "www") {
    return sanitizeSubdomain(parts[0]);
  }

  return "";
}

export function getTenantLoginUrl(subdomain: string) {
  const cleanSubdomain = sanitizeSubdomain(subdomain);
  if (!cleanSubdomain) return "/login";

  if (typeof window === "undefined") {
    return `https://${cleanSubdomain}.moonconnect.app/login`;
  }

  const hostname = window.location.hostname;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");

  if (isLocalHost) {
    return `${window.location.origin}/login?org=${cleanSubdomain}`;
  }

  const rootDomain =
    import.meta.env.VITE_APP_ROOT_DOMAIN || "moonconnect.app";

  return `https://${cleanSubdomain}.${rootDomain}/login`;
}

export function getTenantAppUrl(subdomain: string) {
  const cleanSubdomain = sanitizeSubdomain(subdomain);
  if (!cleanSubdomain) return "/app";

  if (typeof window === "undefined") {
    return `https://${cleanSubdomain}.moonconnect.app/app`;
  }

  const hostname = window.location.hostname;
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost");

  if (isLocalHost) {
    return `${window.location.origin}/app?org=${cleanSubdomain}`;
  }

  const rootDomain =
    import.meta.env.VITE_APP_ROOT_DOMAIN || "moonconnect.app";

  return `https://${cleanSubdomain}.${rootDomain}/app`;
}
