import { z } from "zod";

/** Server-built preview from a public URL (+ optional search snippets). */
export const linkDerivedProfileSchema = z.object({
  displayName: z.string(),
  title: z.string().nullable(),
  summary: z.string(),
  sourceUrl: z.string(),
  /** Whether extra context came from a web search API (DDG / Tavily, etc.) */
  fromSearch: z.boolean(),
});

export type LinkDerivedProfile = z.infer<typeof linkDerivedProfileSchema>;
