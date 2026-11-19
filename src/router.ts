import { useCallback, useEffect, useState } from "react";

export type AppRoute =
  | { name: "home" }
  | { name: "doc"; docId: string }
  | { name: "recent" }
  | { name: "favorites" }
  | { name: "trash" }
  | { name: "search"; query: string }
  | { name: "not_found"; path: string };

const NAVIGATE_EVENT = "app:navigate";

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

export function buildDocPath(id: string): string {
  return `/doc/${encodeURIComponent(id)}`;
}

export function buildSearchPath(query?: string): string {
  const q = query?.trim();
  if (!q) return "/search";
  return `/search?q=${encodeURIComponent(q)}`;
}

export function parseRoute(pathname: string, search: string): AppRoute {
  const path = normalizePathname(pathname);

  if (path === "/") {
    return { name: "home" };
  }
  if (path === "/recent") {
    return { name: "recent" };
  }
  if (path === "/favorites") {
    return { name: "favorites" };
  }
  if (path === "/trash") {
    return { name: "trash" };
  }
  if (path === "/search") {
    const params = new URLSearchParams(search);
    return { name: "search", query: params.get("q") ?? "" };
  }
  if (path.startsWith("/doc/")) {
    const rawId = path.slice("/doc/".length);
    if (rawId && !rawId.includes("/")) {
      try {
        return { name: "doc", docId: decodeURIComponent(rawId) };
      } catch {
        return { name: "not_found", path };
      }
    }
    return { name: "not_found", path };
  }

  return { name: "not_found", path };
}

export function navigate(to: string, options?: { replace?: boolean }): void {
  const current = window.location.pathname + window.location.search;
  if (current === to) return;

  if (options?.replace) {
    window.history.replaceState(null, "", to);
  } else {
    window.history.pushState(null, "", to);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

function getCurrentLocationState() {
  const { pathname, search } = window.location;
  return {
    route: parseRoute(pathname, search),
    pathWithSearch: pathname + search,
  };
}

export function useRoute() {
  const [loc, setLoc] = useState(getCurrentLocationState);

  useEffect(() => {
    const sync = () => setLoc(getCurrentLocationState());
    window.addEventListener("popstate", sync);
    window.addEventListener(NAVIGATE_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(NAVIGATE_EVENT, sync);
    };
  }, []);

  const nav = useCallback((to: string, options?: { replace?: boolean }) => {
    navigate(to, options);
  }, []);

  return {
    route: loc.route,
    pathWithSearch: loc.pathWithSearch,
    navigate: nav,
  };
}
