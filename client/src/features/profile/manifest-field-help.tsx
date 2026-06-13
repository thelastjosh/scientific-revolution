import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ManifestFieldId = "profile" | "relationship" | "skill";

const HELP: Record<
  ManifestFieldId,
  { heading: string; body: React.ReactNode }
> = {
  profile: {
    heading: "profile.md",
    body: (
      <>
        <p className="mb-2">
          Your public identity on Sail — role, summary, domains, and recent work. Others see this
          when browsing People; matchmaking also reads your bio.
        </p>
        <p className="mb-1 font-bold uppercase tracking-wider text-[10px] opacity-80">
          What to put here
        </p>
        <p className="mb-2">
          Headings, bullet lists, short paragraphs. Example:{" "}
          <span className="opacity-90">
            ## Summary — climate policy researcher; Python + stakeholder interviews.
          </span>
        </p>
        <p className="mb-1 font-bold uppercase tracking-wider text-[10px] opacity-80">
          How Sail updates it
        </p>
        <ul className="list-disc pl-4 space-y-1 mb-0">
          <li>
            <strong>You</strong> edit and click Save — the first ~6k characters also sync to your
            short bio field.
          </li>
          <li>
            <strong>Onboarding</strong> may append sections when you link a profile or upload a CV,
            e.g.{" "}
            <span className="opacity-90 block mt-0.5 font-mono text-[10px]">
              ## Link-Derived Profile
              <br />
              Source: https://…
            </span>
          </li>
        </ul>
      </>
    ),
  },
  relationship: {
    heading: "relationship.md",
    body: (
      <>
        <p className="mb-2">
          Your network map — who you work with, org affiliations, and how you are connected. Used
          for context when coordinating across people and orgs.
        </p>
        <p className="mb-1 font-bold uppercase tracking-wider text-[10px] opacity-80">
          What to put here
        </p>
        <p className="mb-2">
          Sections like Peers, Organizations, Mentorship. Example:{" "}
          <span className="opacity-90">
            ## Peers — [[UNICEF data team]] — co-authored Q4 report.
          </span>
        </p>
        <p className="mb-1 font-bold uppercase tracking-wider text-[10px] opacity-80">
          How Sail updates it
        </p>
        <ul className="list-disc pl-4 space-y-1 mb-0">
          <li>
            <strong>You</strong> maintain this file manually as your network changes.
          </li>
          <li>
            <strong>Onboarding</strong> may add a link-import stub, e.g.{" "}
            <span className="opacity-90 block mt-0.5 font-mono text-[10px]">
              ## Link Source
              <br />- Jane Doe
            </span>
          </li>
        </ul>
      </>
    ),
  },
  skill: {
    heading: "skill.md",
    body: (
      <>
        <p className="mb-2">
          How you work and what you can contribute — skills, tools, communication preferences, and
          availability. Matchmaking reads this (with your bio) to suggest volunteers for tasks.
        </p>
        <p className="mb-1 font-bold uppercase tracking-wider text-[10px] opacity-80">
          What to put here
        </p>
        <p className="mb-2">
          Capability lists and operating notes. Example:{" "}
          <span className="opacity-90">
            ## Capabilities — Python, SQL, survey design; async-first; EU mornings for sync.
          </span>
        </p>
        <p className="mb-1 font-bold uppercase tracking-wider text-[10px] opacity-80">
          How Sail updates it
        </p>
        <ul className="list-disc pl-4 space-y-1 mb-0">
          <li>
            <strong>You</strong> edit when your skills or working style change — Sail does not
            rewrite this file automatically today.
          </li>
          <li>
            <strong>Matchmaking</strong> scores candidates using text from skill.md + bio when you
            submit a draft task for matching.
          </li>
        </ul>
      </>
    ),
  },
};

export function ManifestFieldHelpTooltip({ field }: { field: ManifestFieldId }) {
  const { heading, body } = HELP[field];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground rounded-sm"
          aria-label={`About ${heading}`}
        >
          <CircleHelp className="w-3.5 h-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        align="start"
        className="max-w-[300px] whitespace-normal normal-case text-left leading-relaxed px-3 py-2.5 font-mono text-[11px] bg-popover text-popover-foreground border border-border"
      >
        {body}
      </TooltipContent>
    </Tooltip>
  );
}
