import { useState } from "react";
import { onboardingGreetingLine } from "@shared/onboarding-opening";
import { toast } from "@/hooks/use-toast";

type OnboardingIntroProps = {
  /** Shown above the main block when the visitor arrived via a named invite */
  inviteFirstName?: string | null;
  onContinueInterview?: () => void;
  onSkipOnboarding?: () => void;
  /** Called with a public URL the user pastes (e.g. LinkedIn, personal site) */
  onAddLink?: (url: string) => void | Promise<void>;
  /** Called with a selected CV file */
  onUploadCv?: (file: File) => void | Promise<void>;
  cvUploadState?: "idle" | "uploading" | "parsed" | "error";
  cvFileName?: string | null;
  cvUploadError?: string | null;
  cvPreview?: string | null;
  /** Server is fetching the URL and building a profile */
  linkBusy?: boolean;
  inviteValidity?: "valid" | "expired_time" | "exhausted_uses" | "revoked" | "not_found";
};

export function OnboardingIntro({
  inviteFirstName,
  onContinueInterview,
  onSkipOnboarding,
  onAddLink,
  onUploadCv,
  cvUploadState = "idle",
  cvFileName = null,
  cvUploadError = null,
  cvPreview = null,
  linkBusy = false,
  inviteValidity = "not_found",
}: OnboardingIntroProps) {
  const [linkField, setLinkField] = useState("");
  const greeting = onboardingGreetingLine(inviteFirstName);
  const actionButtonClass =
    "shrink-0 border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors hover:bg-secondary/50 active:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-50";

  const onCvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      void onUploadCv?.(f);
    }
    e.target.value = "";
  };

  const applyLink = () => {
    const raw = linkField.trim();
    if (!raw) {
      toast({
        title: "Add a link",
        description: "Paste a URL (e.g. personal site or LinkedIn).",
      });
      return;
    }
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      // eslint-disable-next-line no-new -- validate URL
      new URL(normalized);
    } catch {
      toast({
        title: "Invalid link",
        description: "Could not parse that URL. Try including the domain (e.g. linkedin.com/in/…).",
      });
      return;
    }
    void onAddLink?.(normalized);
    setLinkField("");
  };

  return (
    <div className="animate-sr-fade-in space-y-5 text-left pr-8">
      {greeting ? (
        <p className="text-sm font-normal tracking-tight leading-snug text-muted-foreground">
          {greeting}
        </p>
      ) : null}
      <p className="text-base font-normal tracking-tight leading-snug break-words text-foreground">
        You can onboard through a few ways:
      </p>

      <ul className="space-y-4 text-left border-l-2 border-border pl-4 ml-0.5">
        {inviteValidity !== "not_found" ? (
          <li>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Invite status:{" "}
              <span className="text-foreground">{inviteValidity.replace("_", " ")}</span>
            </p>
          </li>
        ) : null}
        <li className="space-y-2">
          <p
            className="text-muted-foreground font-normal"
            style={{ fontSize: "0.8125rem", lineHeight: 1.45 }}
          >
            Add a link (e.g. personal website, LinkedIn)
          </p>
          <div className="flex flex-wrap items-stretch gap-2 max-w-md">
            <input
              type="url"
              inputMode="url"
              value={linkField}
              onChange={(e) => setLinkField(e.target.value)}
              placeholder="https://…"
              disabled={linkBusy}
              className="min-w-[12rem] flex-1 border border-border bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-foreground disabled:opacity-50"
            />
            <button
              type="button"
              onClick={applyLink}
              disabled={linkBusy}
              className={actionButtonClass}
            >
              {linkBusy ? "Fetching…" : "Add"}
            </button>
          </div>
        </li>

        <li className="space-y-2">
          <p
            className="text-muted-foreground font-normal"
            style={{ fontSize: "0.8125rem", lineHeight: 1.45 }}
          >
            Upload a CV
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 border border-border bg-background px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors hover:bg-secondary/50 active:bg-secondary">
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={onCvChange}
            />
            {cvUploadState === "uploading" ? "Uploading…" : "Choose file"}
          </label>
          {cvFileName ? (
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              File: <span className="text-foreground normal-case tracking-normal">{cvFileName}</span>
            </p>
          ) : null}
          {cvUploadState === "parsed" ? (
            <p className="text-[10px] uppercase tracking-widest text-foreground">
              CV parsed, preview below will be applied to profile on account creation.
            </p>
          ) : null}
          {cvUploadState === "error" && cvUploadError ? (
            <p className="text-[10px] uppercase tracking-widest text-destructive">
              {cvUploadError}
            </p>
          ) : null}
          {cvPreview ? (
            <div className="max-w-md border border-border bg-background p-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                CV profile preview
              </p>
              <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono">
                {cvPreview}
              </pre>
            </div>
          ) : null}
        </li>

        <li>
          <div className="space-y-2">
            <p
              className="text-muted-foreground font-normal"
              style={{ fontSize: "0.8125rem", lineHeight: 1.45 }}
            >
              Continue interview in chat
            </p>
            <button
              type="button"
              onClick={onContinueInterview}
              className={actionButtonClass}
            >
              Continue interview
            </button>
          </div>
        </li>

        <li>
          <div className="space-y-2">
            <p
              className="text-muted-foreground font-normal"
              style={{ fontSize: "0.8125rem", lineHeight: 1.45 }}
            >
              Skip onboarding for now
            </p>
            <button
              type="button"
              onClick={onSkipOnboarding}
              className={actionButtonClass}
            >
              Create account
            </button>
          </div>
        </li>
      </ul>
    </div>
  );
}
