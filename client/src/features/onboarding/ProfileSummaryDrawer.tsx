import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type ProfileSummaryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    name: string;
    email: string;
    inviteToken: string | null;
    inviteDescription: string | null;
    inviteResearchSummary: string | null;
    headline?: string | null;
    sourcePageUrl?: string | null;
  };
};

export function ProfileSummaryDrawer({
  open,
  onOpenChange,
  profile,
}: ProfileSummaryDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[360px] border-l border-border px-4 font-mono">
        <SheetHeader>
          <SheetTitle className="text-left text-sm uppercase tracking-widest">
            Profile so far
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {profile.name}
          </p>
          {profile.headline ? (
            <p>
              <span className="text-muted-foreground">Headline:</span> {profile.headline}
            </p>
          ) : null}
          {profile.sourcePageUrl ? (
            <p className="text-xs break-all">
              <span className="text-muted-foreground">Source:</span>{" "}
              <a
                href={profile.sourcePageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {profile.sourcePageUrl}
              </a>
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Email:</span> {profile.email}
          </p>
          <p>
            <span className="text-muted-foreground">Invite token:</span>{" "}
            {profile.inviteToken ?? "None"}
          </p>
          <p>
            <span className="text-muted-foreground">Context:</span>{" "}
            {profile.inviteDescription ?? "None"}
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-line">
            {profile.inviteResearchSummary ?? "No research summary captured yet."}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
