import { useMemo, useState, type FormEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type InviteProfile = {
  token: string;
  firstName: string | null;
  email: string | null;
  description: string | null;
  researchSummary: string | null;
} | null;

type OnboardingAuthCardProps = {
  mode?: "login" | "register";
  inviteProfile: InviteProfile;
  /** When opening Create account (e.g. from link-derived profile), prefill register name fields. */
  registerNamePrefill?: { firstName: string; lastName: string } | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;
};

export function OnboardingAuthCard({
  mode = "register",
  inviteProfile,
  registerNamePrefill = null,
  onLogin,
  onRegister,
}: OnboardingAuthCardProps) {
  const [tab, setTab] = useState<"login" | "register">(mode);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState(inviteProfile?.email ?? "");
  const [loginPassword, setLoginPassword] = useState("");

  const [firstName, setFirstName] = useState(
    () => registerNamePrefill?.firstName ?? inviteProfile?.firstName ?? "",
  );
  const [lastName, setLastName] = useState(
    () => registerNamePrefill?.lastName ?? "",
  );
  const [registerEmail, setRegisterEmail] = useState(inviteProfile?.email ?? "");
  const [registerPassword, setRegisterPassword] = useState("");

  const isInviteEmailLocked = useMemo(
    () => Boolean(inviteProfile?.email?.trim()),
    [inviteProfile],
  );

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setPending(true);
    try {
      await onLogin(loginEmail, loginPassword);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  async function submitRegister(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setPending(true);
    try {
      await onRegister({
        firstName,
        lastName,
        email: registerEmail,
        password: registerPassword,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Account creation failed",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border border-border bg-card/40 p-4 space-y-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Account access
      </p>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="pt-3">
          <form className="space-y-3" onSubmit={submitLogin}>
            <div className="space-y-1.5">
              <Label htmlFor="onboard-login-email">Email</Label>
              <Input
                id="onboard-login-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onboard-login-password">Password</Label>
              <Input
                id="onboard-login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="register" className="pt-3 space-y-4">
          <form className="space-y-3" onSubmit={submitRegister}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="onboard-first-name">First name</Label>
                <Input
                  id="onboard-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onboard-last-name">Last name</Label>
                <Input
                  id="onboard-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onboard-register-email">Email</Label>
              <Input
                id="onboard-register-email"
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                readOnly={isInviteEmailLocked}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="onboard-register-password">Password</Label>
              <Input
                id="onboard-register-password"
                type="password"
                minLength={8}
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creating..." : "Create account"}
            </Button>
          </form>
          {inviteProfile ? (
            <div className="rounded border border-border bg-background/60 p-3 space-y-2 text-xs">
              <p className="uppercase tracking-widest text-muted-foreground">
                Account preview
              </p>
              <p>
                <span className="text-muted-foreground">Invite token:</span>{" "}
                {inviteProfile.token}
              </p>
              <p>
                <span className="text-muted-foreground">Invite email:</span>{" "}
                {inviteProfile.email ?? "Unknown"} (read-only)
              </p>
              <p>
                <span className="text-muted-foreground">Description:</span>{" "}
                {inviteProfile.description ?? "None"}
              </p>
              <p>
                <span className="text-muted-foreground">Research summary:</span>{" "}
                {inviteProfile.researchSummary ?? "None"}
              </p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
      {submitError ? (
        <p className="text-xs text-destructive border border-destructive/40 bg-destructive/10 px-2 py-1.5">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}
