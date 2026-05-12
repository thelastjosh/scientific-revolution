import { signNetworkBody } from "./network-agent/hmac";
import type { DispatchEnvelope } from "./network-agent/contract";
import { getAgentByOrganizationId, updateAgentStatus } from "./organization-agent-service";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export type DispatchResult =
  | { ok: true; status: number; bodySnippet?: string }
  | { ok: false; reason: string; status?: number };

export async function dispatchToOrgAgent(
  organizationId: string,
  envelope: DispatchEnvelope,
  signingSecret: string,
): Promise<DispatchResult> {
  const agent = await getAgentByOrganizationId(organizationId);
  if (!agent || agent.status === "disabled") {
    return { ok: false, reason: "no_active_agent" };
  }
  if (agent.status === "pending") {
    return { ok: false, reason: "agent_pending_registration" };
  }
  const base = normalizeBaseUrl(agent.baseUrl);
  const url = `${base}/v1/network/dispatch`;
  const bodyStr = JSON.stringify(envelope);
  const ts = String(Date.now());
  const sig = signNetworkBody(signingSecret, ts, bodyStr);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sail-Timestamp": ts,
        "X-Sail-Signature": sig,
        "X-Sail-Organization-Id": organizationId,
      },
      body: bodyStr,
      signal: ac.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      await updateAgentStatus(agent.id, "degraded").catch(() => {});
      return {
        ok: false,
        reason: `upstream_${res.status}`,
        status: res.status,
      };
    }
    await updateAgentStatus(agent.id, "active").catch(() => {});
    return { ok: true, status: res.status, bodySnippet: text.slice(0, 200) };
  } catch (e) {
    await updateAgentStatus(agent.id, "degraded").catch(() => {});
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "fetch_failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function pingOrgAgent(organizationId: string): Promise<DispatchResult> {
  const agent = await getAgentByOrganizationId(organizationId);
  if (!agent) return { ok: false, reason: "no_agent" };
  const envelope: DispatchEnvelope = {
    traceId: `ping-${Date.now()}`,
    networkApiLevel: "1",
    dispatchKind: "ping",
    organizationId,
    payload: { at: new Date().toISOString() },
  };
  return dispatchToOrgAgent(organizationId, envelope, agent.signingSecret);
}
