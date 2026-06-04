import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMatchmakingMetrics,
  fetchMatchmakingRuns,
  postMatchmakingDemo,
  type MatchmakingDemoResult,
} from "@/lib/matchmaking-admin-api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default function MatchmakingTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [demoResult, setDemoResult] = useState<MatchmakingDemoResult | null>(null);

  const metricsQuery = useQuery({
    queryKey: ["admin-matchmaking-metrics"],
    queryFn: fetchMatchmakingMetrics,
  });
  const runsQuery = useQuery({
    queryKey: ["admin-matchmaking-runs"],
    queryFn: () => fetchMatchmakingRuns({ limit: 30 }),
  });

  const demoMutation = useMutation({
    mutationFn: () => postMatchmakingDemo({ taskId: "T-500103", reset: true }),
    onSuccess: (demo) => {
      setDemoResult(demo);
      queryClient.invalidateQueries({ queryKey: ["admin-matchmaking-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-matchmaking-runs"] });
      toast({
        title: demo.decision === "propose" ? "Demo match proposed" : "Demo waited",
        description:
          demo.decision === "propose"
            ? `Offer URLs below (email ${demo.emailSkipped ? "skipped in dev" : "sent"})`
            : demo.reasons[0] ?? "No confident match",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Demo failed", description: e.message, variant: "destructive" });
    },
  });

  const metrics = metricsQuery.data;
  const runs = runsQuery.data?.runs ?? [];

  if (metricsQuery.isLoading) {
    return (
      <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading matchmaking…</p>
    );
  }

  if (metricsQuery.error) {
    return (
      <p className="text-xs text-destructive">{(metricsQuery.error as Error).message}</p>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-8">
      <div className="border border-border p-4 space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Test the flow</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Resets seeded task <span className="font-mono text-foreground">T-500103</span>, runs
          matchmaking, and prints offer links. No Resend needed in local dev. Or run{" "}
          <span className="font-mono">npm run matchmaking:demo</span> from the terminal.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={demoMutation.isPending}
          onClick={() => demoMutation.mutate()}
          className="rounded-none text-xs uppercase tracking-wider"
        >
          {demoMutation.isPending ? "Running demo…" : "Run matchmaking demo"}
        </Button>
        {demoResult ? (
          <div className="text-[11px] font-mono space-y-1 border-t border-border pt-3 break-all">
            <p>
              <span className="text-muted-foreground">Decision:</span> {demoResult.decision}
            </p>
            {demoResult.candidateEmail ? (
              <p>
                <span className="text-muted-foreground">Candidate:</span> {demoResult.candidateEmail}
              </p>
            ) : null}
            {demoResult.urls ? (
              <>
                <p>
                  <a href={demoResult.urls.offerPage} className="underline" target="_blank" rel="noreferrer">
                    {demoResult.urls.offerPage}
                  </a>
                </p>
                <p className="text-muted-foreground">
                  Accept · Decline links are on the offer page
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Match rate", value: pct(metrics.rates.matchRate) },
          { label: "Wait rate", value: pct(metrics.rates.waitRate) },
          { label: "Accept rate", value: pct(metrics.rates.acceptRate) },
          { label: "Decline rate", value: pct(metrics.rates.declineRate) },
        ].map((s) => (
          <div key={s.label} className="border border-border p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="border border-border p-3">
          <span className="text-muted-foreground">Runs</span> {metrics.totals.runs}
        </div>
        <div className="border border-border p-3">
          <span className="text-muted-foreground">Proposals</span> {metrics.totals.proposals}
        </div>
        <div className="border border-border p-3">
          <span className="text-muted-foreground">Accepted</span> {metrics.totals.acceptedProposals}
        </div>
        <div className="border border-border p-3">
          <span className="text-muted-foreground">Pending</span> {metrics.totals.pendingProposals}
        </div>
      </div>

      {metrics.byModule.length > 0 ? (
        <div className="border border-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">By module version</p>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] uppercase">Module</TableHead>
                <TableHead className="text-[10px] uppercase">Version</TableHead>
                <TableHead className="text-[10px] uppercase">Runs</TableHead>
                <TableHead className="text-[10px] uppercase">Propose</TableHead>
                <TableHead className="text-[10px] uppercase">Wait</TableHead>
                <TableHead className="text-[10px] uppercase">Avg conf.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.byModule.map((m) => (
                <TableRow key={`${m.moduleId}-${m.moduleVersion}`} className="border-border">
                  <TableCell>{m.moduleId}</TableCell>
                  <TableCell>{m.moduleVersion}</TableCell>
                  <TableCell>{m.runs}</TableCell>
                  <TableCell>{m.proposeRuns}</TableCell>
                  <TableCell>{m.waitRuns}</TableCell>
                  <TableCell>{m.avgConfidence.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {metrics.daily.length > 0 ? (
        <div className="border border-border p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
            Daily activity
          </p>
          <ChartContainer
            config={{
              proposeRuns: { label: "Propose", color: "hsl(var(--foreground))" },
              waitRuns: { label: "Wait", color: "hsl(var(--muted-foreground))" },
            }}
            className="h-[220px] w-full aspect-auto"
          >
            <BarChart data={metrics.daily}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} />
              <YAxis tickLine={false} axisLine={false} fontSize={10} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="proposeRuns" fill="var(--color-proposeRuns)" radius={0} />
              <Bar dataKey="waitRuns" fill="var(--color-waitRuns)" radius={0} />
            </BarChart>
          </ChartContainer>
        </div>
      ) : null}

      <div className="border border-border overflow-x-auto">
        <p className="text-xs uppercase tracking-widest text-muted-foreground p-4 border-b border-border">
          Recent runs
        </p>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[10px] uppercase">Time</TableHead>
              <TableHead className="text-[10px] uppercase">Task</TableHead>
              <TableHead className="text-[10px] uppercase">Module</TableHead>
              <TableHead className="text-[10px] uppercase">Decision</TableHead>
              <TableHead className="text-[10px] uppercase">Conf.</TableHead>
              <TableHead className="text-[10px] uppercase">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-xs">
                  No runs yet
                </TableCell>
              </TableRow>
            ) : (
              runs.map((r) => (
                <TableRow key={r.id} className="border-border align-top">
                  <TableCell className="text-[11px] whitespace-nowrap">
                    {r.createdAt.slice(0, 16).replace("T", " ")}
                  </TableCell>
                  <TableCell className="text-[11px] font-mono">{r.taskId}</TableCell>
                  <TableCell className="text-[11px]">
                    {r.moduleId} v{r.moduleVersion}
                  </TableCell>
                  <TableCell className="text-[11px] uppercase">{r.decision}</TableCell>
                  <TableCell className="text-[11px]">{r.confidence.toFixed(2)}</TableCell>
                  <TableCell className="text-[11px] max-w-[240px]">
                    {r.reasons[0] ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
