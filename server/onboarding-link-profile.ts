import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicModel } from "./onboarding-chat";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_TEXT_FOR_LLM = 12_000;

function isPrivateOrBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  ) {
    return true;
  }
  if (h === "metadata.google.internal" || h.includes("metadata.google")) {
    return true;
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = h.match(ipv4);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

export function assertUrlSafeForServerFetch(urlStr: string): URL {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (isPrivateOrBlockedHost(u.hostname)) {
    throw new Error("This host is not allowed");
  }
  return u;
}

function stripTagsAndCollapse(html: string): string {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const noTags = noScript.replace(/<[^>]+>/g, " ");
  return noTags.replace(/\s+/g, " ").trim();
}

function extractTitle(html: string): string | null {
  const m = html.match(
    /<title[^>]*>([^<]+)<\/title>/i,
  )?.[1];
  if (m) return m.replace(/\s+/g, " ").trim() || null;
  const og = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  if (og) return og.trim() || null;
  return null;
}

async function fetchWithLimit(
  url: string,
): Promise<{ body: string; finalUrl: string; contentType: string }> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SR-Onboarding/1.0; +https://scientific-revolution.org)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!r.ok) {
      throw new Error(`Fetch failed: HTTP ${r.status}`);
    }
    const finalUrl = r.url;
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      throw new Error("Page is too large to process");
    }
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const ct = r.headers.get("content-type") ?? "";
    return { body: text, finalUrl, contentType: ct };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Best-effort public context (DuckDuckGo instant answer; no API key).
 * Many queries return nothing; that is OK.
 */
async function ddgContextBlurb(
  siteLabel: string,
  pathQuery: string,
): Promise<string> {
  const q = `${siteLabel} ${pathQuery}`.replace(/\s+/g, " ").trim().slice(0, 200);
  if (!q) return "";
  const u = new URL("https://api.duckduckgo.com/");
  u.searchParams.set("q", q);
  u.searchParams.set("format", "json");
  u.searchParams.set("no_html", "1");
  u.searchParams.set("skip_disambig", "1");
  try {
    const r = await fetch(u.toString(), {
      headers: {
        "User-Agent": "SR-Onboarding/1.0 (onboarding; contact: dev)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) return "";
    const j = (await r.json()) as {
      AbstractText?: string;
      Answer?: string;
      RelatedTopics?: { Text?: string }[];
    };
    const parts: string[] = [];
    if (j.AbstractText) parts.push(String(j.AbstractText));
    if (j.Answer) parts.push(String(j.Answer));
    for (const rt of j.RelatedTopics?.slice(0, 3) ?? []) {
      if (rt?.Text) parts.push(String(rt.Text));
    }
    return parts.join("\n\n").replace(/\s+/g, " ").trim().slice(0, 2_000);
  } catch {
    return "";
  }
}

async function extractProfileWithAnthropic(
  sourceUrl: string,
  pageText: string,
  titleHint: string | null,
  searchBlurb: string,
): Promise<{ displayName: string; title: string | null; summary: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return fallbackProfile(sourceUrl, pageText, titleHint, searchBlurb);
  }
  const client = new Anthropic({ apiKey });
  const system = `You help build a short professional profile for onboarding from a fetched web page and optional public search blurb.
Return ONLY valid JSON, no markdown, with keys: "displayName" (string), "title" (string or null), "summary" (2-5 sentences, third person, factual).
If the page is mostly a login wall or empty, use the URL, title, and search blurb only; say what is uncertain.`;

  const user = `sourceUrl: ${sourceUrl}
pageTitle: ${titleHint ?? ""}
searchBlurb: ${searchBlurb || "(none)"}
pageText:
${pageText.slice(0, MAX_TEXT_FOR_LLM)}`;

  const response = await client.messages.create({
    model: getAnthropicModel(),
    max_tokens: 512,
    system,
    messages: [{ role: "user", content: user }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return fallbackProfile(sourceUrl, pageText, titleHint, searchBlurb);
  }
  const raw = textBlock.text.trim();
  let parsed: { displayName?: string; title?: string | null; summary?: string };
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}") + 1;
    parsed = JSON.parse(
      jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd) : raw,
    ) as {
      displayName?: string;
      title?: string | null;
      summary?: string;
    };
  } catch {
    return fallbackProfile(sourceUrl, pageText, titleHint, searchBlurb);
  }
  return {
    displayName: (parsed.displayName ?? "Unknown").trim() || "Unknown",
    title: typeof parsed.title === "string" ? parsed.title : null,
    summary:
      (parsed.summary ?? "No summary could be derived.").trim() ||
      "No summary could be derived.",
  };
}

function fallbackProfile(
  sourceUrl: string,
  pageText: string,
  titleHint: string | null,
  searchBlurb: string,
): { displayName: string; title: string | null; summary: string } {
  const u = new URL(sourceUrl);
  const host = u.hostname.replace(/^www\./, "");
  const title = titleHint;
  const snippet = pageText.slice(0, 500).trim();
  const search = searchBlurb.trim();
  const summary = [
    search ? `Public context: ${search}` : null,
    snippet ? `From page text: ${snippet}…` : "Little readable text was returned (the site may require login or block automated access).",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    displayName: title?.split(/[|–-]/)[0]?.trim() || host,
    title: title ?? null,
    summary: summary || `Source: ${sourceUrl}. Add details manually in chat if needed.`,
  };
}

export type LinkProfileBuildResult = {
  displayName: string;
  title: string | null;
  summary: string;
  sourceUrl: string;
  fromSearch: boolean;
};

export async function buildProfileFromPublicUrl(
  inputUrl: string,
): Promise<LinkProfileBuildResult> {
  const u = assertUrlSafeForServerFetch(inputUrl);
  const normalized = u.href;

  const { body, finalUrl } = await fetchWithLimit(normalized);
  const isHtml =
    /html|xml/i.test(body.slice(0, 500)) || /<[a-z][\s\S]*>/i.test(body);
  const pageTitle = isHtml ? extractTitle(body) : null;
  const plain = isHtml ? stripTagsAndCollapse(body) : body;

  const searchBlurb = await ddgContextBlurb(
    u.hostname.replace(/^www\./, ""),
    u.pathname + " " + u.search,
  );
  const fromSearch = searchBlurb.length > 0;

  const { displayName, title, summary } = await extractProfileWithAnthropic(
    finalUrl,
    plain,
    pageTitle,
    searchBlurb,
  );

  return {
    displayName,
    title,
    summary,
    sourceUrl: finalUrl,
    fromSearch,
  };
}
