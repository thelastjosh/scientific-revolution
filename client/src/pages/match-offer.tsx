import { useEffect, useState } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type OfferPayload = {
  offer: {
    proposal: { status: string; expiresAt: string };
    task: { id: string; title: string; description: string; organizationId: string | null };
    candidate: { firstName: string; lastName: string };
    reasons: string[];
  };
};

async function fetchOffer(token: string): Promise<OfferPayload["offer"]> {
  const r = await fetch(`/api/matchmaking/offer/${encodeURIComponent(token)}`);
  const data = (await r.json().catch(() => ({}))) as { message?: string; offer?: OfferPayload["offer"] };
  if (!r.ok || !data.offer) {
    throw new Error(data.message ?? `Offer not found (${r.status})`);
  }
  return data.offer;
}

async function postOfferAction(token: string, action: "accept" | "decline") {
  const r = await fetch(`/api/matchmaking/offer/${encodeURIComponent(token)}/${action}`, {
    method: "POST",
  });
  const data = (await r.json().catch(() => ({}))) as { message?: string; ok?: boolean };
  if (!r.ok) {
    throw new Error(data.message ?? `${action} failed (${r.status})`);
  }
}

export default function MatchOfferPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [, params] = useRoute("/match/offer/:token");
  const token = params?.token ?? "";

  const [offer, setOffer] = useState<OfferPayload["offer"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid offer link");
      setLoading(false);
      return;
    }
    fetchOffer(token)
      .then(setOffer)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const action = params.get("action");
    if (!action || !token || loading || !offer || acting || result) return;
    if (action !== "accept" && action !== "decline") return;
    if (offer.proposal.status !== "pending") return;

    setActing(true);
    postOfferAction(token, action)
      .then(() => {
        setResult(action === "accept" ? "You accepted this task." : "You declined this offer.");
        setOffer((prev) =>
          prev
            ? {
                ...prev,
                proposal: {
                  ...prev.proposal,
                  status: action === "accept" ? "accepted" : "declined",
                },
              }
            : prev,
        );
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setActing(false));
  }, [search, token, loading, offer, acting, result]);

  const handleAction = async (action: "accept" | "decline") => {
    setActing(true);
    setError(null);
    try {
      await postOfferAction(token, action);
      setResult(action === "accept" ? "You accepted this task." : "You declined this offer.");
      setOffer((prev) =>
        prev
          ? {
              ...prev,
              proposal: {
                ...prev.proposal,
                status: action === "accept" ? "accepted" : "declined",
              },
            }
          : prev,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 font-mono text-sm">
        Loading offer…
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto font-mono">
      <h1 className="text-lg uppercase tracking-widest mb-4">Task match offer</h1>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Alert className="mb-4">
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      ) : null}

      {offer ? (
        <div className="border border-border p-4 space-y-3">
          <p className="text-sm">
            Hi {offer.candidate.firstName}, you were matched to:
          </p>
          <p className="font-semibold">{offer.task.title}</p>
          <p className="text-xs whitespace-pre-wrap text-muted-foreground">
            {offer.task.description}
          </p>
          {offer.reasons.length > 0 ? (
            <ul className="text-xs list-disc pl-4 space-y-1">
              {offer.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Status: {offer.proposal.status} · expires {offer.proposal.expiresAt.slice(0, 10)}
          </p>
          {offer.proposal.status === "pending" && !result ? (
            <div className="flex gap-2 pt-2">
              <Button
                disabled={acting}
                onClick={() => void handleAction("accept")}
                className="rounded-none uppercase tracking-wider text-xs"
              >
                Accept
              </Button>
              <Button
                variant="outline"
                disabled={acting}
                onClick={() => void handleAction("decline")}
                className="rounded-none uppercase tracking-wider text-xs"
              >
                Decline
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setLocation("/")}
        className="mt-6 text-xs uppercase tracking-widest underline text-muted-foreground"
      >
        Back to home
      </button>
    </div>
  );
}
