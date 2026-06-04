import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConnectorCatalogEntry, ConnectorId, UserConnectorDto } from "@shared/connectors/types";
import {
  deleteMyConnector,
  fetchConnectorCatalog,
  fetchMyConnectors,
  patchMyConnector,
  testMyConnector,
  upsertMyConnector,
} from "@/lib/connectors-api";
import { toast } from "@/hooks/use-toast";

type ConnectorsPaneProps = {
  actionButtonClass: string;
};

function findMine(connectors: UserConnectorDto[], id: ConnectorId) {
  return connectors.find((c) => c.provider === id);
}

function TelegramSetupCard({
  catalog,
  mine,
  actionButtonClass,
  onSaved,
}: {
  catalog: ConnectorCatalogEntry;
  mine: UserConnectorDto | undefined;
  actionButtonClass: string;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(mine?.accountLabel ?? "My Telegram");
  const [chatId, setChatId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLabel(mine?.accountLabel ?? "My Telegram");
  }, [mine?.accountLabel, mine?.id]);

  const save = async () => {
    if (!chatId.trim() && !mine) {
      toast({
        title: "Chat ID required",
        description: "Paste your Telegram numeric chat ID to connect.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      await upsertMyConnector("telegram", {
        accountLabel: label,
        chatId: chatId.trim() || undefined,
      });
      setChatId("");
      toast({ title: "Telegram connector saved" });
      onSaved();
    } catch (e) {
      toast({
        title: "Could not save",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const out = await testMyConnector("telegram");
      toast({ title: "Test sent", description: out.detail ?? "Check Telegram." });
    } catch (e) {
      toast({
        title: "Test failed",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await patchMyConnector("telegram", { status: "disabled" });
      toast({ title: "Telegram connector disabled" });
      onSaved();
    } catch (e) {
      toast({
        title: "Could not disable",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteMyConnector("telegram");
      toast({ title: "Telegram connector removed" });
      onSaved();
    } catch (e) {
      toast({
        title: "Could not remove",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-border p-3 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{catalog.label}</p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{catalog.setupHint}</p>
      </div>
      {mine ? (
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Status: <span className="text-foreground">{mine.status}</span>
          {" · "}
          {mine.credentialRefPreview}
        </p>
      ) : null}
      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Label</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full border border-border bg-transparent px-2 py-2 text-xs"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Chat ID {mine ? "(leave blank to keep current)" : ""}
        </span>
        <input
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="e.g. 123456789"
          className="w-full border border-border bg-transparent px-2 py-2 text-xs font-mono"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className={actionButtonClass}
        >
          {busy ? "Saving…" : mine ? "Update" : "Connect"}
        </button>
        {mine?.status === "active" ? (
          <button type="button" disabled={busy} onClick={() => void test()} className={actionButtonClass}>
            Send test
          </button>
        ) : null}
        {mine ? (
          <>
            <button type="button" disabled={busy} onClick={() => void disable()} className={actionButtonClass}>
              Disable
            </button>
            <button type="button" disabled={busy} onClick={() => void remove()} className={actionButtonClass}>
              Remove
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ComingSoonCard({ catalog }: { catalog: ConnectorCatalogEntry }) {
  return (
    <div className="border border-dashed border-border p-3 space-y-1 opacity-70">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{catalog.label}</p>
      <p className="text-[11px] text-muted-foreground">{catalog.description}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Coming soon</p>
    </div>
  );
}

export function ConnectorsPane({ actionButtonClass }: ConnectorsPaneProps) {
  const queryClient = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: ["connector-catalog"],
    queryFn: fetchConnectorCatalog,
  });

  const mineQuery = useQuery({
    queryKey: ["connectors-mine"],
    queryFn: fetchMyConnectors,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["connectors-mine"] });
  };

  const catalog = catalogQuery.data ?? [];
  const mine = mineQuery.data ?? [];

  return (
    <div className="p-4 space-y-4 min-h-0 overflow-y-auto">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Connectors</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Link outbound channels for task handoffs. When you open a task, Sail notifies your active
          connectors (email via notify address, Telegram here).
        </p>
      </div>

      {catalogQuery.isLoading || mineQuery.isLoading ? (
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading…</p>
      ) : null}

      {catalog.map((entry) => {
        if (entry.id === "telegram" && entry.status === "available") {
          return (
            <TelegramSetupCard
              key={entry.id}
              catalog={entry}
              mine={findMine(mine, "telegram")}
              actionButtonClass={actionButtonClass}
              onSaved={invalidate}
            />
          );
        }
        if (entry.status === "coming_soon") {
          return <ComingSoonCard key={entry.id} catalog={entry} />;
        }
        return null;
      })}
    </div>
  );
}
