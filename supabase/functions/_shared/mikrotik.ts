export interface RouterRecord {
  id: string;
  name: string;
  ip_address: string;
  api_port: number;
  username: string;
  password: string;
  connection_type?: string | null;
}

interface RouterOsItem {
  ".id"?: string;
  [key: string]: unknown;
}

interface HotspotAccessParams {
  phone: string;
  macAddress?: string | null;
  deviceIp?: string | null;
  expiresAt?: string | null;
  speedLimit?: string | null;
  sharedUsers?: number;
}

interface PppoeAccessParams {
  username: string;
  password: string;
  profileName: string;
  rateLimit?: string | null;
  sessionLimit?: number;
  remoteAddress?: string | null;
  comment?: string;
}

export interface RouterHealthSnapshot {
  isOnline: boolean;
  uptimeSeconds: number;
}

function getRestConnection(router: RouterRecord) {
  const normalizedPort =
    router.api_port === 8728 || router.api_port === 8729 ? 443 : router.api_port;
  const protocol = normalizedPort === 80 ? "http" : "https";
  const baseUrl = `${protocol}://${router.ip_address}:${normalizedPort}/rest`;
  return {
    baseUrl,
    authHeader: `Basic ${btoa(`${router.username}:${router.password}`)}`,
  };
}

async function routerFetch<T>(
  router: RouterRecord,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { baseUrl, authHeader } = getRestConnection(router);
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `RouterOS request failed (${response.status}) for ${path}: ${body}`,
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown router error");
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        continue;
      }
    }
  }

  throw lastError || new Error(`RouterOS request failed for ${path}`);
}

async function listItems(
  router: RouterRecord,
  path: string,
): Promise<RouterOsItem[]> {
  return await routerFetch<RouterOsItem[]>(router, path);
}

function toItemArray(value: unknown): RouterOsItem[] {
  if (Array.isArray(value)) {
    return value as RouterOsItem[];
  }

  if (value && typeof value === "object") {
    return [value as RouterOsItem];
  }

  return [];
}

function parseDurationToSeconds(value: string | null | undefined) {
  if (!value) return 0;

  let remaining = value.trim();
  let total = 0;

  const weeksMatch = remaining.match(/(\d+)w/);
  if (weeksMatch) total += Number(weeksMatch[1]) * 7 * 24 * 3600;

  const daysMatch = remaining.match(/(\d+)d/);
  if (daysMatch) total += Number(daysMatch[1]) * 24 * 3600;

  remaining = remaining.replace(/\d+[wd]/g, "");

  const timeMatch = remaining.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (timeMatch) {
    total += Number(timeMatch[1]) * 3600;
    total += Number(timeMatch[2]) * 60;
    total += Number(timeMatch[3]);
  }

  if (total > 0) {
    return total;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function findItemByField(
  router: RouterRecord,
  path: string,
  field: string,
  value: string,
) {
  const items = await listItems(router, path);
  return (
    items.find((item) => String(item[field] || "") === value) || null
  );
}

async function upsertNamedItem(
  router: RouterRecord,
  path: string,
  name: string,
  payload: Record<string, unknown>,
) {
  const existing = await findItemByField(router, path, "name", name);
  if (existing?.[".id"]) {
    await routerFetch(router, `${path}/${encodeURIComponent(existing[".id"] as string)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return existing[".id"] as string;
  }

  const created = await routerFetch<RouterOsItem>(router, path, {
    method: "PUT",
    body: JSON.stringify({ name, ...payload }),
  });
  return (created?.[".id"] as string | undefined) || name;
}

function hotspotComment(expiresAt?: string | null) {
  return expiresAt ? `moonconnect-hotspot|${expiresAt}` : "moonconnect-hotspot";
}

function pppoeComment(comment?: string) {
  return comment || "moonconnect-pppoe";
}

export async function ensureHotspotAccess(
  router: RouterRecord,
  params: HotspotAccessParams,
) {
  const profileName = `mc-${params.phone.replace(/[^0-9a-z]/gi, "-")}`;
  const uptimeLimit = params.expiresAt
    ? `${Math.max(
        1,
        Math.ceil(
          (new Date(params.expiresAt).getTime() - Date.now()) / 60000,
        ),
      )}m`
    : undefined;

  await upsertNamedItem(router, "/ip/hotspot/user/profile", profileName, {
    "rate-limit": params.speedLimit || "2M/2M",
    "shared-users": String(params.sharedUsers || 1),
  });

  await upsertNamedItem(router, "/ip/hotspot/user", params.phone, {
    password: params.phone,
    profile: profileName,
    comment: hotspotComment(params.expiresAt),
    ...(uptimeLimit ? { "limit-uptime": uptimeLimit } : {}),
  });

  if (params.macAddress || params.deviceIp) {
    const existingBinding = params.macAddress
      ? await findItemByField(
          router,
          "/ip/hotspot/ip-binding",
          "mac-address",
          params.macAddress,
        )
      : null;

    const bindingPayload = {
      type: "bypassed",
      comment: hotspotComment(params.expiresAt),
      ...(params.macAddress ? { "mac-address": params.macAddress } : {}),
      ...(params.deviceIp ? { address: params.deviceIp } : {}),
    };

    if (existingBinding?.[".id"]) {
      await routerFetch(
        router,
        `/ip/hotspot/ip-binding/${encodeURIComponent(existingBinding[".id"] as string)}`,
        {
          method: "PATCH",
          body: JSON.stringify(bindingPayload),
        },
      );
    } else {
      await routerFetch(router, "/ip/hotspot/ip-binding", {
        method: "PUT",
        body: JSON.stringify(bindingPayload),
      });
    }
  }

  const activeSessions = await listItems(router, "/ip/hotspot/active");
  const matchingActive = activeSessions.filter((item) => {
    const nameMatches = String(item.user || "") === params.phone;
    const macMatches =
      params.macAddress && String(item["mac-address"] || "") === params.macAddress;
    const ipMatches = params.deviceIp && String(item.address || "") === params.deviceIp;
    return Boolean(nameMatches || macMatches || ipMatches);
  });

  for (const session of matchingActive) {
    if (!session[".id"]) continue;
    await routerFetch(
      router,
      `/ip/hotspot/active/${encodeURIComponent(session[".id"] as string)}`,
      { method: "DELETE" },
    );
  }
}

export async function revokeHotspotAccess(
  router: RouterRecord,
  phone: string,
  macAddress?: string | null,
  deviceIp?: string | null,
) {
  const hotspotUser = await findItemByField(router, "/ip/hotspot/user", "name", phone);
  if (hotspotUser?.[".id"]) {
    await routerFetch(
      router,
      `/ip/hotspot/user/${encodeURIComponent(hotspotUser[".id"] as string)}`,
      { method: "DELETE" },
    );
  }

  if (macAddress) {
    const binding = await findItemByField(
      router,
      "/ip/hotspot/ip-binding",
      "mac-address",
      macAddress,
    );
    if (binding?.[".id"]) {
      await routerFetch(
        router,
        `/ip/hotspot/ip-binding/${encodeURIComponent(binding[".id"] as string)}`,
        { method: "DELETE" },
      );
    }
  }

  const activeSessions = await listItems(router, "/ip/hotspot/active");
  const matchingActive = activeSessions.filter((item) => {
    const nameMatches = String(item.user || "") === phone;
    const macMatches = macAddress && String(item["mac-address"] || "") === macAddress;
    const ipMatches = deviceIp && String(item.address || "") === deviceIp;
    return Boolean(nameMatches || macMatches || ipMatches);
  });

  for (const session of matchingActive) {
    if (!session[".id"]) continue;
    await routerFetch(
      router,
      `/ip/hotspot/active/${encodeURIComponent(session[".id"] as string)}`,
      { method: "DELETE" },
    );
  }
}

export async function ensurePppoeAccess(
  router: RouterRecord,
  params: PppoeAccessParams,
) {
  await upsertNamedItem(router, "/ppp/profile", params.profileName, {
    ...(params.rateLimit ? { "rate-limit": params.rateLimit } : {}),
    ...(params.sessionLimit ? { "only-one": params.sessionLimit === 1 ? "yes" : "no" } : {}),
  });

  await upsertNamedItem(router, "/ppp/secret", params.username, {
    password: params.password,
    service: "pppoe",
    profile: params.profileName,
    ...(params.remoteAddress ? { "remote-address": params.remoteAddress } : {}),
    comment: pppoeComment(params.comment),
  });

  const activeSessions = await listItems(router, "/ppp/active");
  const matchingActive = activeSessions.filter(
    (item) => String(item.name || "") === params.username,
  );

  for (const session of matchingActive) {
    if (!session[".id"]) continue;
    await routerFetch(
      router,
      `/ppp/active/${encodeURIComponent(session[".id"] as string)}`,
      { method: "DELETE" },
    );
  }
}

export async function revokePppoeAccess(router: RouterRecord, username: string) {
  const secret = await findItemByField(router, "/ppp/secret", "name", username);
  if (secret?.[".id"]) {
    await routerFetch(
      router,
      `/ppp/secret/${encodeURIComponent(secret[".id"] as string)}`,
      { method: "DELETE" },
    );
  }

  const activeSessions = await listItems(router, "/ppp/active");
  const matchingActive = activeSessions.filter(
    (item) => String(item.name || "") === username,
  );

  for (const session of matchingActive) {
    if (!session[".id"]) continue;
    await routerFetch(
      router,
      `/ppp/active/${encodeURIComponent(session[".id"] as string)}`,
      { method: "DELETE" },
    );
  }
}

export async function getRouterHealth(
  router: RouterRecord,
): Promise<RouterHealthSnapshot> {
  try {
    const resource = await routerFetch<unknown>(router, "/system/resource");
    const resourceItems = toItemArray(resource);
    const resourceRow = resourceItems[0] || {};
    const uptimeSeconds = parseDurationToSeconds(
      String(resourceRow.uptime || ""),
    );

    return {
      isOnline: true,
      uptimeSeconds,
    };
  } catch (error) {
    console.error(`Router health check failed for ${router.name}:`, error);
    return {
      isOnline: false,
      uptimeSeconds: 0,
    };
  }
}

export async function restartRouter(router: RouterRecord) {
  await routerFetch(router, "/system/reboot", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
