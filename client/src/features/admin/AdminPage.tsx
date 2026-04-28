import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUiExperiments, putUiExperiment } from "@/lib/ui-experiments-api";
import { fetchAdminSummary } from "@/lib/admin-api";
import { Switch } from "@/components/ui/switch";
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
import type { UiExperimentVariant } from "@shared/schema";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<
    "accounts" | "tasks" | "credentials" | "surveys" | "context" | "experiments"
  >("accounts");

  const { data: experiments, isLoading, error } = useQuery({
    queryKey: ["ui-experiments"],
    queryFn: fetchUiExperiments,
  });

  const summaryQuery = useQuery({
    queryKey: ["admin-summary"],
    queryFn: fetchAdminSummary,
  });

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

  const summary = summaryQuery.data;

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
              Manage accounts, tasks, credentials, context, surveys, and experiments.
            </p>
          </div>
          <Link href="/dashboard">
            <a className="text-xs font-bold uppercase tracking-widest border border-border px-4 py-2 hover:bg-foreground hover:text-background transition-colors inline-block">
              Dashboard
            </a>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["accounts", "tasks", "credentials", "surveys", "context", "experiments"] as const).map(
            (k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`border border-border px-3 py-1.5 text-xs uppercase tracking-wider ${tab === k ? "bg-foreground text-background" : ""}`}
              >
                {k}
              </button>
            ),
          )}
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
                  <TableHead className="text-[10px] uppercase tracking-widest font-bold">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.accounts.map((a) => (
                  <TableRow key={a.id} className="border-border">
                    <TableCell>{a.firstName} {a.lastName}</TableCell>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>{a.role}</TableCell>
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

        {tab !== "experiments" && tab !== "accounts" && tab !== "tasks" && summary ? (
          <div className="border border-border p-4 text-xs text-muted-foreground uppercase tracking-widest">
            {tab} entries:{" "}
            {tab === "credentials"
              ? summary.channelCredentials.length
              : tab === "surveys"
                ? summary.surveys.length
                : summary.contextEntries.length}
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
      </div>
    </div>
  );
}
