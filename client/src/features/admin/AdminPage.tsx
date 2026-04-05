import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUiExperiments, putUiExperiment } from "@/lib/ui-experiments-api";
import { Label } from "@/components/ui/label";
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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { UiExperimentVariant } from "@shared/schema";

const STORAGE_KEY = "sr_admin_token";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [persisted, setPersisted] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem(STORAGE_KEY);
    if (t) {
      setToken(t);
      setPersisted(true);
    }
  }, []);

  const { data: experiments, isLoading, error } = useQuery({
    queryKey: ["ui-experiments"],
    queryFn: fetchUiExperiments,
  });

  const saveSession = () => {
    sessionStorage.setItem(STORAGE_KEY, token.trim());
    setPersisted(true);
  };

  const clearSession = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken("");
    setPersisted(false);
  };

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
      const t = sessionStorage.getItem(STORAGE_KEY) ?? token.trim();
      if (!t) throw new Error("Enter admin secret and save session first.");
      return putUiExperiment(key, { enabled, variant }, t);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ui-experiments"] });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-mono p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
              Operations
            </p>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter">
              UI experiments
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Toggle interface blocks and choose A/B variants. Changes apply to
              all visitors after refresh. Protect this route in production (see{" "}
              <code className="text-foreground">ADMIN_SECRET</code>).
            </p>
          </div>
          <Link href="/dashboard">
            <a className="text-xs font-bold uppercase tracking-widest border border-border px-4 py-2 hover:bg-foreground hover:text-background transition-colors inline-block">
              Dashboard
            </a>
          </Link>
        </div>

        <section className="border border-border p-4 md:p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            Admin session
          </h2>
          <p className="text-xs text-muted-foreground">
            Paste the same value as server{" "}
            <code className="text-foreground">ADMIN_SECRET</code>. Stored only
            in this browser tab (sessionStorage).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end max-w-xl">
            <div className="flex-1 space-y-2">
              <Label htmlFor="admin-secret" className="text-[10px] uppercase tracking-widest">
                Secret
              </Label>
              <Input
                id="admin-secret"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="••••••••"
                className="font-mono border-2 border-border rounded-none"
              />
            </div>
            <button
              type="button"
              onClick={saveSession}
              className="bg-foreground text-background px-6 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 shrink-0"
            >
              Save session
            </button>
            {persisted && (
              <button
                type="button"
                onClick={clearSession}
                className="border border-border px-4 py-2 text-xs uppercase tracking-widest hover:bg-secondary shrink-0"
              >
                Clear
              </button>
            )}
          </div>
          {persisted && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Session active — toggles will send Authorization header.
            </p>
          )}
        </section>

        {error && (
          <Alert variant="destructive" className="rounded-none border-2">
            <AlertTitle>Could not load experiments</AlertTitle>
            <AlertDescription>
              {(error as Error).message}. Is the API running (
              <code className="text-foreground">npm run dev</code>)?
            </AlertDescription>
          </Alert>
        )}

        {mutation.isError && (
          <Alert variant="destructive" className="rounded-none border-2">
            <AlertTitle>Update failed</AlertTitle>
            <AlertDescription>
              {(mutation.error as Error).message}
            </AlertDescription>
          </Alert>
        )}

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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground text-sm">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                experiments?.map((row) => (
                  <TableRow key={row.key} className="border-border">
                    <TableCell>
                      <div className="font-mono text-xs text-foreground">
                        {row.key}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 max-w-md">
                        {row.label}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.enabled}
                        disabled={mutation.isPending}
                        onCheckedChange={(enabled) =>
                          mutation.mutate({ key: row.key, enabled })
                        }
                        className="rounded-none"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.variant}
                        disabled={mutation.isPending || !row.enabled}
                        onValueChange={(v) =>
                          mutation.mutate({
                            key: row.key,
                            variant: v as UiExperimentVariant,
                          })
                        }
                      >
                        <SelectTrigger className="w-full rounded-none border-2 font-mono text-xs uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-2 font-mono">
                          <SelectItem
                            value="control"
                            className="font-mono text-xs uppercase"
                          >
                            control (A)
                          </SelectItem>
                          <SelectItem
                            value="variant_b"
                            className="font-mono text-xs uppercase"
                          >
                            variant_b (B)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
