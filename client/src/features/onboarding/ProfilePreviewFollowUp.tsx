const btnClass =
  "border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-foreground hover:text-background transition-colors";

type ProfilePreviewFollowUpProps = {
  /** When true, only the “edit” path is offered (user is already signed in). */
  signedIn: boolean;
  onCreateAccount: () => void;
  onEditProfile: () => void;
};

export function ProfilePreviewFollowUp({
  signedIn,
  onCreateAccount,
  onEditProfile,
}: ProfilePreviewFollowUpProps) {
  if (signedIn) {
    return (
      <div className="space-y-3 text-left" role="group" aria-label="Next step">
        <p className="text-sm font-normal text-foreground leading-relaxed">
          Would you like to continue editing this profile?
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEditProfile} className={btnClass}>
            Edit profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-left" role="group" aria-label="Next step">
      <p className="text-sm font-normal text-foreground leading-relaxed">
        Would you like to create an account using this profile, or continue to
        edit it?
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCreateAccount} className={btnClass}>
          Create account
        </button>
        <button type="button" onClick={onEditProfile} className={btnClass}>
          Edit profile
        </button>
      </div>
    </div>
  );
}
