export interface Task {
  id: string;
  title: string;
  description: string;
  status: "draft" | "open" | "completed" | "archived";
  organizationId?: string | null;
  ownerUserId: string;
  assigneeUserId?: string | null;
  sourceSessionId?: string | null;
  rawSourceDoc?: string | null;
  extractedBy?: string | null;
  deliveryChannels: { kind: string; address: string; state?: string }[];
  externalRefs: { system: string; id: string }[];
  history: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDraft {
  id: string;
  title: string;
  description: string;
  extractedTasks: Array<{ title: string; description: string }>;
  rawSourceDoc: string;
  createdAt: string;
}

export interface WorkspaceChatMessage {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  createdAt: string;
}

export interface WorkspaceSession {
  id: string;
  type: "onboarding" | "workspace";
  title: string | null;
  graduatedFromSessionId: string | null;
  activeIntent: string | null;
  createdAt: string;
  updatedAt: string;
}
