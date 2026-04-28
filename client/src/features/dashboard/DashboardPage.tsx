import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpCircle, Plus } from "lucide-react";
import {
  createTask,
  extractTaskDraft,
  fetchDashboard,
  saveProfileDraft,
  sendWorkspaceChat,
  updateTask,
  type DashboardProfile,
} from "@/lib/dashboard-api";
import type { Task } from "@shared/network-feed";
import { useAuth } from "@/features/auth/auth-context";

type Pane = "profile" | "people" | "tasks";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [activePane, setActivePane] = useState<Pane>("tasks");
  const [draft, setDraft] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [rawDoc, setRawDoc] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [profileSaveState, setProfileSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const profile = dashboardQuery.data?.profile ?? null;
  const tasks = dashboardQuery.data?.tasks ?? [];
  const people = dashboardQuery.data?.people ?? [];
  const workspaceSession = dashboardQuery.data?.workspaceSession ?? null;
  const messages = dashboardQuery.data?.workspaceMessages ?? [];
  const isAdmin = dashboardQuery.data?.isAdmin ?? false;

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!workspaceSession) throw new Error("Workspace session unavailable");
      return sendWorkspaceChat({ sessionId: workspaceSession.id, content });
    },
    onSuccess: ({ userMessage, assistantMessage }) => {
      queryClient.setQueryData(
        ["dashboard"],
        (prev: Awaited<ReturnType<typeof fetchDashboard>> | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            workspaceMessages: [
              ...prev.workspaceMessages,
              userMessage,
              assistantMessage,
            ],
          };
        },
      );
      setDraft("");
    },
  });

  const profileMutation = useMutation({
    mutationFn: saveProfileDraft,
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["dashboard"],
        (prev: Awaited<ReturnType<typeof fetchDashboard>> | undefined) => {
          if (!prev) return prev;
          return { ...prev, profile: updated };
        },
      );
    },
  });

  useEffect(() => {
    if (profileSaveState !== "saved") return;
    const t = window.setTimeout(() => setProfileSaveState("idle"), 2500);
    return () => window.clearTimeout(t);
  }, [profileSaveState]);

  const extractMutation = useMutation({
    mutationFn: extractTaskDraft,
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (created) => {
      queryClient.setQueryData(
        ["dashboard"],
        (prev: Awaited<ReturnType<typeof fetchDashboard>> | undefined) => {
          if (!prev) return prev;
          return { ...prev, tasks: [created, ...prev.tasks] };
        },
      );
      setSelectedTaskId(created.id);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<Task, "title" | "description" | "status">>;
    }) => updateTask(id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ["dashboard"],
        (prev: Awaited<ReturnType<typeof fetchDashboard>> | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t) => (t.id === updated.id ? updated : t)),
          };
        },
      );
    },
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Loading workspace...
        </p>
      </div>
    );
  }

  if (dashboardQuery.isError || !workspaceSession || !profile) {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono p-6 space-y-4">
        <p className="text-sm text-destructive">
          {(dashboardQuery.error as Error)?.message ?? "Dashboard unavailable"}
        </p>
        <Link href="/">
          <a className="text-xs uppercase tracking-widest underline">Return home</a>
        </Link>
      </div>
    );
  }

  const filteredPeople = people.filter((p) => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });
  const navButtonClass =
    "inline-flex items-center border border-border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors hover:bg-secondary/50 active:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground font-mono flex flex-col">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Workspace
          </p>
          <p className="text-sm">
            {profile.firstName} {profile.lastName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActivePane("profile")}
            className={navButtonClass}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActivePane("people")}
            className={navButtonClass}
          >
            People
          </button>
          <button
            type="button"
            onClick={() => setActivePane("tasks")}
            className={navButtonClass}
          >
            Tasks
          </button>
          {isAdmin ? (
            <Link href="/admin">
              <a className={navButtonClass}>
                Admin
              </a>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className={navButtonClass}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px]">
        <section className="border-r border-border flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Dashboard chat
            </p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                  {m.role}
                </p>
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3">
            <div className="relative">
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Tell the workspace agent what you need..."
                className="w-full bg-transparent border border-border px-3 py-2 pr-12 text-xs"
              />
              <button
                type="button"
                onClick={() => sendMutation.mutate(draft)}
                disabled={!draft.trim() || sendMutation.isPending}
                className="absolute right-2 bottom-2"
              >
                <ArrowUpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {activePane} pane
            </p>
          </div>

          {activePane === "profile" ? (
            <ProfilePane
              profile={profile}
              onSave={async (input) => {
                setProfileSaveState("saving");
                try {
                  await profileMutation.mutateAsync(input);
                  setProfileSaveState("saved");
                } catch {
                  setProfileSaveState("error");
                }
              }}
              saveState={profileSaveState}
            />
          ) : null}

          {activePane === "people" ? (
            <div className="p-4 space-y-3">
              <input
                value={peopleQuery}
                onChange={(e) => setPeopleQuery(e.target.value)}
                placeholder="Search people"
                className="w-full border border-border bg-transparent px-3 py-2 text-xs"
              />
              {filteredPeople.map((p) => (
                <div key={p.id} className="border border-border p-3">
                  <p className="text-sm">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                  {p.bio ? <p className="text-xs mt-2 whitespace-pre-wrap">{p.bio}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          {activePane === "tasks" ? (
            <div className="p-4 space-y-4">
              <div className="border border-border p-3 space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Paste source document
                </p>
                <textarea
                  rows={6}
                  value={rawDoc}
                  onChange={(e) => setRawDoc(e.target.value)}
                  className="w-full border border-border bg-transparent px-2 py-2 text-xs"
                  placeholder="Paste transcript, email thread, or raw notes..."
                />
                <button
                  type="button"
                  onClick={() => extractMutation.mutate(rawDoc)}
                  disabled={!rawDoc.trim() || extractMutation.isPending}
                  className="border border-border px-3 py-1.5 text-xs uppercase tracking-wider"
                >
                  Extract draft
                </button>
                {extractMutation.data ? (
                  <div className="space-y-2 border-t border-border pt-2">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Draft</p>
                    <p className="text-sm">{extractMutation.data.title}</p>
                    <p className="text-xs whitespace-pre-wrap">
                      {extractMutation.data.description}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        createTaskMutation.mutate({
                          title: extractMutation.data!.title,
                          description: extractMutation.data!.description,
                          rawSourceDoc: rawDoc,
                        })
                      }
                      className="border border-border px-3 py-1.5 text-xs uppercase tracking-wider"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Create task
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Your tasks</p>
                {tasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`w-full text-left border p-3 ${
                      selectedTaskId === t.id ? "border-foreground" : "border-border"
                    }`}
                  >
                    <p className="text-sm">{t.title}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                      {t.status}
                    </p>
                  </button>
                ))}
              </div>

              {selectedTask ? (
                <TaskEditor
                  task={selectedTask}
                  onSave={(patch) =>
                    updateTaskMutation.mutate({ id: selectedTask.id, patch })
                  }
                  saving={updateTaskMutation.isPending}
                />
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ProfilePane({
  profile,
  onSave,
}: {
  profile: DashboardProfile;
  onSave: (input: {
    firstName?: string;
    lastName?: string;
    bio?: string | null;
    profileMarkdown?: string;
    relationshipMarkdown?: string;
    skillMarkdown?: string;
  }) => Promise<void>;
  saveState: "idle" | "saving" | "saved" | "error";
}) {
  const [activeManifest, setActiveManifest] = useState<"profile" | "relationship" | "skill">(
    "profile",
  );
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [profileMarkdown, setProfileMarkdown] = useState(profile.profileMarkdown);
  const [relationshipMarkdown, setRelationshipMarkdown] = useState(
    profile.relationshipMarkdown,
  );
  const [skillMarkdown, setSkillMarkdown] = useState(profile.skillMarkdown);

  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "Profile Saved"
        : saveState === "error"
          ? "Save failed - retry"
          : "Save Profile";
  const saveButtonClass =
    saveState === "saved"
      ? "inline-flex items-center border border-foreground bg-foreground text-background px-3 py-1.5 text-xs uppercase tracking-wider transition-colors"
      : saveState === "error"
        ? "inline-flex items-center border border-destructive text-destructive px-3 py-1.5 text-xs uppercase tracking-wider transition-colors"
        : "inline-flex items-center border border-border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors hover:bg-secondary/50 active:bg-secondary";

  const manifestText =
    activeManifest === "profile"
      ? profileMarkdown
      : activeManifest === "relationship"
        ? relationshipMarkdown
        : skillMarkdown;

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full border border-border bg-transparent px-3 py-2 text-xs"
          placeholder="First name"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full border border-border bg-transparent px-3 py-2 text-xs"
          placeholder="Last name"
        />
      </div>
      <div className="border border-border bg-card">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border text-xs">
          <div className="flex items-center gap-2">
            {(["profile", "relationship", "skill"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveManifest(tab)}
                className={`inline-flex items-center border px-2.5 py-1 uppercase tracking-wider transition-colors ${
                  activeManifest === tab
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-secondary/50 active:bg-secondary"
                }`}
              >
                {tab}.md
              </button>
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Manifest editor
          </span>
        </div>
        <textarea
          rows={14}
          value={manifestText}
          onChange={(e) => {
            if (activeManifest === "profile") setProfileMarkdown(e.target.value);
            if (activeManifest === "relationship")
              setRelationshipMarkdown(e.target.value);
            if (activeManifest === "skill") setSkillMarkdown(e.target.value);
          }}
          className="w-full bg-transparent px-3 py-3 text-xs resize-none focus:outline-none"
        />
      </div>
      <button
        type="button"
        disabled={saveState === "saving"}
        onClick={() =>
          onSave({
            firstName,
            lastName,
            bio: profileMarkdown.slice(0, 6000),
            profileMarkdown,
            relationshipMarkdown,
            skillMarkdown,
          })
        }
        className={saveButtonClass}
      >
        {saveLabel}
      </button>
    </div>
  );
}

function TaskEditor({
  task,
  onSave,
  saving,
}: {
  task: Task;
  onSave: (patch: Partial<Pick<Task, "title" | "description" | "status">>) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  return (
    <div className="border border-border p-3 space-y-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Edit selected task
      </p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-border bg-transparent px-3 py-2 text-xs"
      />
      <textarea
        rows={6}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border border-border bg-transparent px-3 py-2 text-xs"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as Task["status"])}
        className="w-full border border-border bg-transparent px-3 py-2 text-xs"
      >
        <option value="draft">draft</option>
        <option value="open">open</option>
        <option value="completed">completed</option>
        <option value="archived">archived</option>
      </select>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave({ title, description, status })}
        className="border border-border px-3 py-1.5 text-xs uppercase tracking-wider"
      >
        Save task
      </button>
    </div>
  );
}
