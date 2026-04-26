type InlineProfilePreviewProps = {
  name: string;
  email: string;
  inviteToken: string | null;
  description: string | null;
  researchSummary: string | null;
  /** e.g. job title or LinkedIn headline */
  headline?: string | null;
  /** Public page we derived from */
  sourcePageUrl?: string | null;
};

export function InlineProfilePreview({
  name,
  email,
  inviteToken,
  description,
  researchSummary,
  headline,
  sourcePageUrl,
}: InlineProfilePreviewProps) {
  return (
    <div
      className="border border-border bg-card/50 p-4 text-left space-y-3"
      role="region"
      aria-label="Profile preview"
    >
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Your profile (preview)
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Name</dt>
          <dd>{name}</dd>
        </div>
        {headline ? (
          <div>
            <dt className="text-xs text-muted-foreground">Headline</dt>
            <dd className="text-xs">{headline}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-muted-foreground">Email</dt>
          <dd className="break-words">{email}</dd>
        </div>
        {sourcePageUrl ? (
          <div>
            <dt className="text-xs text-muted-foreground">Source</dt>
            <dd>
              <a
                href={sourcePageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline break-all"
              >
                {sourcePageUrl}
              </a>
            </dd>
          </div>
        ) : null}
        {inviteToken ? (
          <div>
            <dt className="text-xs text-muted-foreground">Invite</dt>
            <dd className="font-mono text-xs break-all">{inviteToken}</dd>
          </div>
        ) : null}
        {description ? (
          <div>
            <dt className="text-xs text-muted-foreground">Context</dt>
            <dd className="whitespace-pre-line text-xs">{description}</dd>
          </div>
        ) : null}
        {researchSummary ? (
          <div>
            <dt className="text-xs text-muted-foreground">Research / summary</dt>
            <dd className="whitespace-pre-line text-xs text-muted-foreground">
              {researchSummary}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
