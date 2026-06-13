import publicAiLogo from "@/assets/images/public-ai-logo-transparent.png";
import unicefLogo from "@/assets/images/unicef-logo-transparent.png";
import { useEffect, useState } from "react";

export type ContextOrganizationId = "public-ai" | "unicef";

export type ContextOrganization = {
  id: ContextOrganizationId;
  name: string;
  monogram: string;
  brandColor: string;
  logoSrc: string;
  logoClassName?: string;
};

/** Default orgs in context for every user until they change selection. */
export const DEFAULT_CONTEXT_ORG_IDS: ContextOrganizationId[] = ["public-ai", "unicef"];

export const CONTEXT_ORG_STORAGE_KEY = "sr.context.organizationIds";
export const CONTEXT_ORG_CHANGE_EVENT = "sr:context-orgs-changed";

export const CONTEXT_ORGANIZATIONS: ContextOrganization[] = [
  {
    id: "public-ai",
    name: "Public AI",
    monogram: "P",
    brandColor: "#E84125",
    logoSrc: publicAiLogo,
    logoClassName: "h-5 w-auto max-w-[88px] object-contain object-left",
  },
  {
    id: "unicef",
    name: "UNICEF",
    monogram: "U",
    brandColor: "#1CABE2",
    logoSrc: unicefLogo,
    logoClassName: "h-5 w-auto max-w-[88px] object-contain object-left",
  },
];

export function orgById(id: ContextOrganizationId): ContextOrganization {
  const org = CONTEXT_ORGANIZATIONS.find((o) => o.id === id);
  if (!org) throw new Error(`Unknown context organization: ${id}`);
  return org;
}

export function parseStoredContextOrgIds(raw: string | null): ContextOrganizationId[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter(
      (id): id is ContextOrganizationId =>
        id === "public-ai" || id === "unicef",
    );
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

export function loadContextOrgIds(): ContextOrganizationId[] {
  if (typeof window === "undefined") return [...DEFAULT_CONTEXT_ORG_IDS];
  return (
    parseStoredContextOrgIds(window.localStorage.getItem(CONTEXT_ORG_STORAGE_KEY)) ??
    [...DEFAULT_CONTEXT_ORG_IDS]
  );
}

export function saveContextOrgIds(ids: ContextOrganizationId[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONTEXT_ORG_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(CONTEXT_ORG_CHANGE_EVENT));
}

export function useContextOrgIds(): ContextOrganizationId[] {
  const [ids, setIds] = useState<ContextOrganizationId[]>(() => [...DEFAULT_CONTEXT_ORG_IDS]);

  useEffect(() => {
    const refresh = () => setIds(loadContextOrgIds());
    refresh();
    window.addEventListener(CONTEXT_ORG_CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CONTEXT_ORG_CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return ids;
}
