import { z } from "zod";

/** Network API envelope version carried on dispatches and callbacks. */
export const NETWORK_API_LEVEL = "1" as const;

export const appendEventBodySchema = z.object({
  organizationId: z.string().min(1).max(64),
  traceId: z.string().min(1).max(64),
  dedupeKey: z.string().min(1).max(256),
  direction: z.enum(["inbound", "outbound"]),
  channel: z.string().min(1).max(32),
  threadKey: z.string().min(1).max(4000),
  taskId: z.string().max(32).nullable().optional(),
  actorExternalHandle: z.string().max(512).nullable().optional(),
  body: z.string().max(100_000).default(""),
  payload: z.record(z.string(), z.unknown()).optional(),
  occurredAtIso: z.string().datetime().optional(),
});

export type AppendEventBody = z.infer<typeof appendEventBodySchema>;

export const taskSyncBodySchema = z.object({
  organizationId: z.string().min(1).max(64),
  traceId: z.string().min(1).max(64),
  taskId: z.string().min(1).max(32),
  externalRefs: z
    .array(z.object({ system: z.string().max(64), id: z.string().max(512) }))
    .max(50)
    .optional(),
  patchHistory: z.record(z.string(), z.unknown()).optional(),
});

export type TaskSyncBody = z.infer<typeof taskSyncBodySchema>;

export const heartbeatBodySchema = z.object({
  organizationId: z.string().min(1).max(64),
  traceId: z.string().min(1).max(64).optional(),
  status: z.enum(["ok", "degraded"]).optional(),
});

export const dispatchEnvelopeSchema = z.object({
  traceId: z.string().min(1).max(64),
  networkApiLevel: z.string().max(16).default(NETWORK_API_LEVEL),
  dispatchKind: z.enum(["ping", "task_update", "template_push"]),
  organizationId: z.string().min(1).max(64),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type DispatchEnvelope = z.infer<typeof dispatchEnvelopeSchema>;

export const approvalRequestBodySchema = z.object({
  organizationId: z.string().min(1).max(64),
  traceId: z.string().min(1).max(64),
  requestKind: z.string().min(1).max(64),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type ApprovalRequestBody = z.infer<typeof approvalRequestBodySchema>;
