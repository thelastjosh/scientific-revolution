/**
 * Task feed / dossier shapes shared by API and client.
 * Keep in sync with `network_tasks` and dashboard UI.
 */

export interface HistoryItem {
  id: string;
  shortWhy: string;
  title: string;
  result: string;
  date: string;
  contributorId?: string;
}

export interface Task {
  id: string;
  shortWhy: string;
  title: string;
  description: string;
  rationale: string;
  evaluationLoop: string;
  motivationScore: number;
  timeEstimate: string;
  status: "available" | "in-progress" | "completed";
  history: HistoryItem[];
  community: "public-ai" | "unicef" | "general" | "developer-dao";
  githubLink?: string;
  workspaceType?: "default" | "github-import" | "event" | "advisory";
  type?: "standard" | "event";
  eventDate?: string;
}

export interface Epoch {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  current: number;
  deadline: string;
  status: "nominal" | "degraded" | "critical";
}

export interface Project {
  id: string;
  shortWhy: string;
  title: string;
  description: string;
  motivationScore: number;
  deadline: string;
  status: "open" | "claimed";
  claimedBy?: string;
}
