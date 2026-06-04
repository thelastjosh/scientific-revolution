import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUiExperiments, putUiExperiment } from "@/lib/ui-experiments-api";
import {
  fetchAdminSummary,
  patchAdminMemberContact,
  postAdminMemberNotifyTest,
  type AdminAccount,
} from "@/lib/admin-api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { UiExperimentVariant } from "@shared/schema";
import MatchmakingTab from "@/features/admin/MatchmakingTab";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<
    "accounts" | "tasks" | "credentials" | "surveys" | "context" | "experiments" | "matchmaking"
  >("accounts");
  const [phoneContactUser, setPhoneContactUser] = useState<AdminAccount | null>(null);
  const [phoneDraft, setPhoneDraft] = useState("");

  const { data: experiments, isLoading } = useQuery({
    queryKey: ["ui-experiments"],
    queryFn: fetchUiExperiments,
  });

  const summaryQuery = useQuery({
    queryKey: ["admin-summary"],
    queryFn: fetchAdminSummary,
  });

  useEffect(() => {
    if (phoneContactUser) {
      setPhoneDraft(phoneContactUser.phoneNumber ?? "");
    }
  }, [phoneContactUser]);

  const mutation = useMutation({
    mutationFn: async ({
      key,
      enabled,
      variant,
    }: {
      key: string;
      enabled?: boolean;
      variant?: UiExperimentVariant;
    }) => {
      return putUiExperiment(key, { enabled, variant });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ui-experiments"] });
    },
  });

  const notifyMutation = useMutation({
    mutationFn: (input: { userId: string; channel: "email" | "workspace_message" | "telegram" }) =>
      postAdminMemberNotifyTest(input.userId, { channel: input.channel }),
    onSuccess: (_, v) => {
      toast({
        title: v.channel === "email" ? "Test email sent" : "Test workspace message posted",
      });
    },
    onError: (e: Error) => {
      toast({
        title: "Send failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const contactMutation = useMutation({
    mutationFn: (input: { userId: string; phoneNumber: string | null }) =>
      patchAdminMemberContact(input.userId, { phoneNumber: input.phoneNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
      setPhoneContactUser(null);
      toast({ title: "Phone number saved" });
    },
    onError: (e: Error) => {
      toast({
        title: "Could not save phone",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const summary = summaryQuery.data;
  const actionButtonClass =
    "inline-flex items-center border border-border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors hover:bg-secondary/50 active:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground font-mono p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Operations
            </p>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter">
              Admin control center
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Manage accounts, tasks, credentials, context, surveys, and experiments. Test
              outbound email and workspace messages from the accounts tab.
            </p>
          </div>
          <Link href="/dashboard">
            <a className={`${actionButtonClass} px-4 py-2 font-bold`}>
              Dashboard
            </a>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              "accounts",
              "tasks",
              "credentials",
              "surveys",
              "context",
              "experiments",
              "matchmaking",
            ] as const
          ).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`${actionButtonClass} ${tab === k ? "bg-foreground text-background border-foreground" : ""}`}
            >
              {k}
            </button>
          ))}
        </div>

        {summaryQuery.error ? (
          <Alert variant="destructive" className="rounded-none border-2">
            <AlertTitle>Could not load admin summary</AlertTitle>
            <AlertDescription>{(summaryQuery.error as Error).message}</AlertDescription>
          </Alert>
        ) : null}

        {summaryQuery.isLoading ? (
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading summary…</p>
        ) : null}

        {tab === "accounts" && summary ? (
          <div className="border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Name</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Email</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Phone</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold min-w-[140px]">
                    Integrations
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Role</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold text-right">
                    Tests
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.accounts.map((a) => (
                  <TableRow key={a.id} className="border-border align-top">
                    <TableCell>
                      {a.firstName} {a.lastName}
                    </TableCell>
                    <TableCell className="max-w-[200px] break-all">{a.email}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-1 items-start">
                        <span>{a.phoneNumber ?? "—"}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-none text-[10px] uppercase tracking-wider"
                          onClick={() => setPhoneContactUser(a)}
                        >
                          Edit phone
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {a.integrations.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ul className="space-y-1.5 max-w-[220px]">
                          {a.integrations.map((i) => (
                            <li key={i.id} className="border-l-2 border-border pl-2">
                              <div>
                                <span className="font-semibold text-foreground">{i.provider}</span>
                                <span className="text-muted-foreground"> · {i.status}</span>
                              </div>
                              {i.accountLabel ? (
                                <div className="text-muted-foreground truncate" title={i.accountLabel}>
                                  {i.accountLabel}
                                </div>
                              ) : null}
                              <div className="text-[10px] text-muted-foreground font-mono truncate">
                                {i.credentialRefPreview}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell>{a.role}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col gap-1 items-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-7 rounded-none text-[10px] uppercase tracking-wider w-full max-w-[140px]"
                          disabled={notifyMutation.isPending}
                          onClick={() => notifyMutation.mutate({ userId: a.id, channel: "email" })}
                        >
                          Test email
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-7 rounded-none text-[10px] uppercase tracking-wider w-full max-w-[140px]"
                          disabled={notifyMutation.isPending}
                          onClick={() =>
                            notifyMutation.mutate({ userId: a.id, channel: "workspace_message" })
                          }
                        >
                          Test message
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-7 rounded-none text-[10px] uppercase tracking-wider w-full max-w-[140px]"
                          disabled={
                            notifyMutation.isPending ||
                            !a.integrations.some((i) => i.provider === "telegram" && i.status === "active")
                          }
                          onClick={() => notifyMutation.mutate({ userId: a.id, channel: "telegram" })}
                        >
                          Test Telegram
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {tab === "tasks" && summary ? (
          <div className="border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Task</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.tasks.map((t) => (
                  <TableRow key={t.id} className="border-border">
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{t.status}</TableCell>
                    <TableCell className="font-mono text-xs">{t.ownerUserId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {tab === "credentials" && summary ? (
          <div className="border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">User ID</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Provider</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Label</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Credential</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.channelCredentials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground text-sm">
                      No channel credentials stored.
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.channelCredentials.map((c) => (
                    <TableRow key={c.id} className="border-border">
                      <TableCell className="font-mono text-[10px] max-w-[120px] break-all">
                        {c.userId}
                      </TableCell>
                      <TableCell>{c.provider}</TableCell>
                      <TableCell className="max-w-[180px] break-words">{c.accountLabel}</TableCell>
                      <TableCell>{c.status}</TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground max-w-[160px] break-all">
                        {c.credentialRefPreview}
                      </TableCell>
                      <TableCell className="text-[10px] whitespace-nowrap">{c.updatedAt}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {tab === "surveys" && summary ? (
          <div className="border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Surveys: {summary.surveys.length}
            </p>
            <pre className="text-[11px] overflow-auto max-h-96 whitespace-pre-wrap break-all border border-border p-3 bg-muted/30">
              {JSON.stringify(summary.surveys, null, 2)}
            </pre>
          </div>
        ) : null}

        {tab === "context" && summary ? (
          <div className="border border-border p-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Context entries: {summary.contextEntries.length}
            </p>
            <pre className="text-[11px] overflow-auto max-h-96 whitespace-pre-wrap break-all border border-border p-3 bg-muted/30">
              {JSON.stringify(summary.contextEntries, null, 2)}
            </pre>
          </div>
        ) : null}

        {tab === "experiments" ? (
          <div className="border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">
                    Flag
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold w-[120px]">
                    On
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold w-[200px]">
                    A/B variant
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground text-sm">Loading…</TableCell>
                  </TableRow>
                ) : null}
                {!isLoading && experiments?.map((row) => (
                  <TableRow key={row.key} className="border-border">
                    <TableCell>
                      <div className="font-mono text-xs text-foreground">{row.key}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 max-w-md">{row.label}</div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.enabled}
                        disabled={mutation.isPending}
                        onCheckedChange={(enabled) => mutation.mutate({ key: row.key, enabled })}
                        className="rounded-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.variant}
                        disabled={mutation.isPending || !row.enabled}
                        onValueChange={(v) => mutation.mutate({ key: row.key, variant: v as UiExperimentVariant })}
                      >
                        <SelectTrigger className="border-border rounded-none h-8 text-xs font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-border font-mono text-xs">
                          <SelectItem value="control">control</SelectItem>
                          <SelectItem value="variant_b">variant_b</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {tab === "matchmaking" ? <MatchmakingTab /> : null}
      </div>

      <Dialog open={!!phoneContactUser} onOpenChange={(open) => !open && setPhoneContactUser(null)}>
        <DialogContent className="rounded-none border-2 border-border sm:max-w-md font-mono">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-tight text-sm">Member phone</DialogTitle>
            <DialogDescription className="text-xs font-mono">
              {phoneContactUser
                ? `${phoneContactUser.firstName} ${phoneContactUser.lastName} · ${phoneContactUser.email}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label htmlFor="admin-phone-input" className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Phone number
            </label>
            <Input
              id="admin-phone-input"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder="E.164 or local format"
              className="rounded-none font-mono text-sm"
              autoComplete="off"
            />
            <p className="text-[10px] text-muted-foreground">
              Clear the field and save to remove the stored number.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-none uppercase text-xs tracking-wider"
              onClick={() => setPhoneContactUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none uppercase text-xs tracking-wider"
              disabled={contactMutation.isPending || !phoneContactUser}
              onClick={() => {
                if (!phoneContactUser) return;
                const trimmed = phoneDraft.trim();
                contactMutation.mutate({
                  userId: phoneContactUser.id,
                  phoneNumber: trimmed === "" ? null : trimmed,
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
