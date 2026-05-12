import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpCircle, Copy, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createTask,
  extractTaskDraft,
  fetchDashboard,
  saveProfileDraft,
  sendWorkspaceChat,
  updateTask,
  type DashboardOrganization,
  type DashboardProfile,
} from "@/lib/dashboard-api";
import type { Task } from "@shared/network-feed";
import { useAuth } from "@/features/auth/auth-context";
import { toast } from "@/hooks/use-toast";
import {
  createInvite,
  listMyInvites,
  revokeInvite,
} from "@/lib/onboarding-api";

/** Shared motion for dashboard controls: lift on hover, press on click. */
const DASH_PRESS =
  "transition-all duration-200 ease-out motion-safe:hover:scale-[1.02] motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-safe:active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0";

const DASH_BTN = cn(
  "inline-flex items-center justify-center border border-border bg-transparent",
  DASH_PRESS,
  "hover:bg-secondary/70 hover:border-foreground/25 hover:shadow-sm",
);

type Pane = "profile" | "people" | "tasks" | "invites";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [activePane, setActivePane] = useState<Pane>("tasks");
  const [draft, setDraft] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [rawDoc, setRawDoc] = useState("");
  const [newTaskNotifyEmail, setNewTaskNotifyEmail] = useState("");
  const [newTaskOrgId, setNewTaskOrgId] = useState<string>("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOrgId, setInviteOrgId] = useState("");
  const [inviteMaxUses, setInviteMaxUses] = useState("1");

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const profile = dashboardQuery.data?.profile ?? null;
  const tasks = dashboardQuery.data?.tasks ?? [];
  const people = dashboardQuery.data?.people ?? [];
  const organizations = dashboardQuery.data?.organizations ?? [];

  useEffect(() => {
    if (organizations.length > 0 && !newTaskOrgId) {
      setNewTaskOrgId(organizations[0]!.id);
    }
  }, [organizations, newTaskOrgId]);

  useEffect(() => {
    if (activePane === "invites" && organizations.length > 0 && !inviteOrgId) {
      setInviteOrgId(organizations[0]!.id);
    }
  }, [activePane, organizations, inviteOrgId]);
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
      toast({ title: "Sent", description: "Your message was delivered to the workspace." });
    },
    onError: (e: Error) => {
      toast({
        title: "Message not sent",
        description: e.message,
        variant: "destructive",
      });
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
    onError: (e: Error) => {
      toast({
        title: "Profile save failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const extractMutation = useMutation({
    mutationFn: extractTaskDraft,
    onSuccess: () => {
      toast({ title: "Draft ready", description: "Review the extracted title and description below." });
    },
    onError: (e: Error) => {
      toast({
        title: "Extract failed",
        description: e.message,
        variant: "destructive",
      });
    },
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
      toast({ title: "Task created", description: created.title });
    },
    onError: (e: Error) => {
      toast({
        title: "Could not create task",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<
        Pick<Task, "title" | "description" | "status" | "organizationId" | "deliveryChannels">
      >;
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
      toast({ title: "Task saved", description: updated.title });
    },
    onError: (e: Error) => {
      toast({
        title: "Task save failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const invitesQuery = useQuery({
    queryKey: ["my-invites"],
    queryFn: listMyInvites,
    enabled: activePane === "invites",
  });

  const createInviteMutation = useMutation({
    mutationFn: () =>
      createInvite({
        email: inviteEmail.trim() || null,
        organizationId: inviteOrgId.trim() || null,
        maxUses: Number(inviteMaxUses) || 1,
        inviterRelationshipLabel: "inviter",
        inviterContextSummary: "Invite created from workspace dashboard.",
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["my-invites"] });
      setInviteEmail("");
      const url =
        data.emailResult?.inviteUrl ??
        `${window.location.origin}/?invite=${encodeURIComponent(data.invite.token)}`;
      toast({
        title: "Invite created",
        description: url,
      });
    },
    onError: (e: Error) => {
      toast({
        title: "Could not create invite",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (token: string) => revokeInvite(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-invites"] });
      toast({ title: "Invite revoked" });
    },
    onError: (e: Error) => {
      toast({
        title: "Revoke failed",
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/?invite=${encodeURIComponent(token)}`;
    void navigator.clipboard.writeText(url).then(
      () => {
        toast({ title: "Copied", description: "Invite link copied to clipboard." });
      },
      () => {
        toast({
          title: "Copy failed",
          description: url,
          variant: "destructive",
        });
      },
    );
  };

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

  const paneTabClass = (pane: Pane) =>
    cn(
      DASH_BTN,
      "px-3 py-1.5 text-xs uppercase tracking-wider",
      activePane === pane &&
        "border-foreground bg-foreground text-background hover:bg-foreground hover:border-foreground shadow-sm scale-100",
      activePane === pane && "motion-safe:hover:scale-100 motion-safe:hover:translate-y-0",
    );

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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button type="button" onClick={() => setActivePane("profile")} className={paneTabClass("profile")}>
            Profile
          </button>
          <button type="button" onClick={() => setActivePane("people")} className={paneTabClass("people")}>
            People
          </button>
          <button type="button" onClick={() => setActivePane("tasks")} className={paneTabClass("tasks")}>
            Tasks
          </button>
          <button type="button" onClick={() => setActivePane("invites")} className={paneTabClass("invites")}>
            Invites
          </button>
          {isAdmin ? (
            <Link href="/admin">
              <a className={cn(DASH_BTN, "px-3 py-1.5 text-xs uppercase tracking-wider no-underline")}>
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
            className={cn(DASH_BTN, "px-3 py-1.5 text-xs uppercase tracking-wider")}
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
              <div
                key={m.id}
                className={cn(
                  m.role === "user" ? "text-right" : "text-left",
                  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300",
                )}
              >
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
                className={cn(
                  "absolute right-2 bottom-2 rounded-full p-1 text-foreground",
                  DASH_PRESS,
                  "hover:bg-secondary/80 hover:text-foreground",
                  sendMutation.isPending && "animate-pulse",
                )}
                aria-label="Send message"
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
              onSave={(input) => profileMutation.mutateAsync(input)}
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
                  className={cn(DASH_BTN, "px-3 py-1.5 text-xs uppercase tracking-wider")}
                >
                  {extractMutation.isPending ? "Extracting…" : "Extract draft"}
                </button>
                {extractMutation.data ? (
                  <div className="space-y-2 border-t border-border pt-2">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Draft</p>
                    <p className="text-sm">{extractMutation.data.title}</p>
                    <p className="text-xs whitespace-pre-wrap">
                      {extractMutation.data.description}
                    </p>
                    {organizations.length > 0 ? (
                      <label className="block space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Organization (for comms timeline)
                        </span>
                        <select
                          value={newTaskOrgId}
                          onChange={(e) => setNewTaskOrgId(e.target.value)}
                          className="w-full border border-border bg-transparent px-2 py-2 text-xs"
                        >
                          {organizations.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="block space-y-1">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Notify email (optional)
                      </span>
                      <input
                        type="email"
                        value={newTaskNotifyEmail}
                        onChange={(e) => setNewTaskNotifyEmail(e.target.value)}
                        placeholder="partner@example.com"
                        className="w-full border border-border bg-transparent px-2 py-2 text-xs"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        createTaskMutation.mutate({
                          title: extractMutation.data!.title,
                          description: extractMutation.data!.description,
                          rawSourceDoc: rawDoc,
                          organizationId: newTaskOrgId || null,
                          deliveryChannels:
                            newTaskNotifyEmail.trim().length > 0
                              ? [{ kind: "email", address: newTaskNotifyEmail.trim() }]
                              : undefined,
                        })
                      }
                      disabled={createTaskMutation.isPending}
                      className={cn(DASH_BTN, "px-3 py-1.5 text-xs uppercase tracking-wider")}
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      {createTaskMutation.isPending ? "Creating…" : "Create task"}
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
                    className={cn(
                      DASH_BTN,
                      "w-full text-left border p-3 justify-start rounded-none",
                      selectedTaskId === t.id
                        ? "border-foreground bg-secondary/40 shadow-sm"
                        : "border-border",
                    )}
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
                  organizations={organizations}
                  onSave={(patch) =>
                    updateTaskMutation.mutate({ id: selectedTask.id, patch })
                  }
                  saving={updateTaskMutation.isPending}
                />
              ) : null}
            </div>
          ) : null}

          {activePane === "invites" ? (
            <div className="p-4 space-y-4 min-h-0 flex flex-col">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Invite links</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed normal-case">
                  Create shareable links for onboarding. Recipients open the link on the home page to
                  start with your invite context.
                </p>
              </div>

              <div className="space-y-2 border border-border p-3 shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">New invite</p>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Invitee email (optional)"
                  className="w-full border border-border bg-transparent px-2 py-2 text-xs"
                />
                {organizations.length > 0 ? (
                  <label className="block space-y-1">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Organization
                    </span>
                    <select
                      value={inviteOrgId}
                      onChange={(e) => setInviteOrgId(e.target.value)}
                      className="w-full border border-border bg-transparent px-2 py-2 text-xs"
                    >
                      <option value="">(none)</option>
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <input
                    value={inviteOrgId}
                    onChange={(e) => setInviteOrgId(e.target.value)}
                    placeholder="Organization ID (optional)"
                    className="w-full border border-border bg-transparent px-2 py-2 text-xs"
                  />
                )}
                <input
                  value={inviteMaxUses}
                  onChange={(e) => setInviteMaxUses(e.target.value)}
                  placeholder="Max uses"
                  className="w-full border border-border bg-transparent px-2 py-2 text-xs"
                />
                <button
                  type="button"
                  disabled={createInviteMutation.isPending}
                  onClick={() => createInviteMutation.mutate()}
                  className={cn(DASH_BTN, "w-full px-3 py-2 text-xs uppercase tracking-wider")}
                >
                  {createInviteMutation.isPending ? "Creating…" : "Create invite"}
                </button>
              </div>

              <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
                  Your invites
                </p>
                {invitesQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : invitesQuery.isError ? (
                  <p className="text-xs text-destructive">
                    {(invitesQuery.error as Error).message ?? "Could not load invites"}
                  </p>
                ) : (
                  <>
                    {(invitesQuery.data ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No invites yet.</p>
                    ) : (
                      <ul className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
                        {(invitesQuery.data ?? []).map((invite) => (
                          <li
                            key={invite.token}
                            className="border border-border p-2 space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                  {String(invite.validity ?? "unknown")}
                                </p>
                                <p className="font-mono break-all text-[11px] leading-snug mt-0.5">
                                  {invite.token}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => copyInviteLink(invite.token)}
                                className={cn(DASH_BTN, "inline-flex gap-1 px-2 py-1 text-[10px] uppercase tracking-wider")}
                              >
                                <Copy className="w-3 h-3" aria-hidden />
                                Copy link
                              </button>
                              <button
                                type="button"
                                disabled={revokeInviteMutation.isPending}
                                onClick={() => revokeInviteMutation.mutate(invite.token)}
                                className={cn(
                                  DASH_BTN,
                                  "px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-destructive/10 hover:border-destructive/40",
                                )}
                              >
                                Revoke
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
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
  }) => Promise<unknown>;
}) {
  const [saveState, setSaveState] = useState<{
    profile: "idle" | "saving" | "saved" | "error";
    relationship: "idle" | "saving" | "saved" | "error";
    skill: "idle" | "saving" | "saved" | "error";
  }>({
    profile: "idle",
    relationship: "idle",
    skill: "idle",
  });
  useEffect(() => {
    if (
      saveState.profile !== "saved" &&
      saveState.relationship !== "saved" &&
      saveState.skill !== "saved"
    ) {
      return;
    }
    const t = window.setTimeout(
      () =>
        setSaveState((prev) => ({
          profile: prev.profile === "saved" ? "idle" : prev.profile,
          relationship:
            prev.relationship === "saved" ? "idle" : prev.relationship,
          skill: prev.skill === "saved" ? "idle" : prev.skill,
        })),
      2500,
    );
    return () => window.clearTimeout(t);
  }, [saveState]);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [profileMarkdown, setProfileMarkdown] = useState(profile.profileMarkdown);
  const [relationshipMarkdown, setRelationshipMarkdown] = useState(
    profile.relationshipMarkdown,
  );
  const [skillMarkdown, setSkillMarkdown] = useState(profile.skillMarkdown);

  const saveLabel = (state: "idle" | "saving" | "saved" | "error") =>
    state === "saving"
      ? "Saving..."
      : state === "saved"
        ? "Profile Saved"
        : state === "error"
          ? "Save failed - retry"
          : "Save Profile";
  const saveButtonClass = (state: "idle" | "saving" | "saved" | "error") =>
    state === "saved"
      ? cn(
          DASH_BTN,
          "border-foreground bg-foreground text-background px-3 py-1.5 text-xs uppercase tracking-wider",
          "hover:bg-foreground hover:border-foreground motion-safe:hover:scale-[1.02]",
        )
      : state === "error"
        ? cn(
            DASH_BTN,
            "border-destructive text-destructive px-3 py-1.5 text-xs uppercase tracking-wider",
            "hover:bg-destructive/10",
          )
        : cn(DASH_BTN, "px-3 py-1.5 text-xs uppercase tracking-wider");

  return (
    <div className="p-4 space-y-4 min-h-0 overflow-y-auto">
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
      <ManifestEditorBlock
        title="profile.md"
        value={profileMarkdown}
        onChange={setProfileMarkdown}
        saveState={saveState.profile}
        saveLabel={saveLabel(saveState.profile)}
        saveButtonClass={saveButtonClass(saveState.profile)}
        onSave={async () => {
          setSaveState((prev) => ({ ...prev, profile: "saving" }));
          try {
            await onSave({
              firstName,
              lastName,
              bio: profileMarkdown.slice(0, 6000),
              profileMarkdown,
            });
            setSaveState((prev) => ({ ...prev, profile: "saved" }));
          } catch {
            setSaveState((prev) => ({ ...prev, profile: "error" }));
          }
        }}
      />
      <ManifestEditorBlock
        title="relationship.md"
        value={relationshipMarkdown}
        onChange={setRelationshipMarkdown}
        saveState={saveState.relationship}
        saveLabel={saveLabel(saveState.relationship)}
        saveButtonClass={saveButtonClass(saveState.relationship)}
        onSave={async () => {
          setSaveState((prev) => ({ ...prev, relationship: "saving" }));
          try {
            await onSave({
              firstName,
              lastName,
              relationshipMarkdown,
            });
            setSaveState((prev) => ({ ...prev, relationship: "saved" }));
          } catch {
            setSaveState((prev) => ({ ...prev, relationship: "error" }));
          }
        }}
      />
      <ManifestEditorBlock
        title="skill.md"
        value={skillMarkdown}
        onChange={setSkillMarkdown}
        saveState={saveState.skill}
        saveLabel={saveLabel(saveState.skill)}
        saveButtonClass={saveButtonClass(saveState.skill)}
        onSave={async () => {
          setSaveState((prev) => ({ ...prev, skill: "saving" }));
          try {
            await onSave({
              firstName,
              lastName,
              skillMarkdown,
            });
            setSaveState((prev) => ({ ...prev, skill: "saved" }));
          } catch {
            setSaveState((prev) => ({ ...prev, skill: "error" }));
          }
        }}
      />
    </div>
  );
}

function ManifestEditorBlock({
  title,
  value,
  onChange,
  saveState,
  saveLabel,
  saveButtonClass,
  onSave,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  saveState: "idle" | "saving" | "saved" | "error";
  saveLabel: string;
  saveButtonClass: string;
  onSave: () => Promise<void>;
}) {
  return (
    <div className="border border-border bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border text-xs">
        <span className="inline-flex items-center border border-border px-2.5 py-1 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <textarea
        rows={12}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent px-3 py-3 text-xs resize-none focus:outline-none"
      />
      <div className="px-3 pb-3">
        <button
          type="button"
          disabled={saveState === "saving"}
          onClick={() => void onSave()}
          className={cn(
            saveButtonClass,
            "transition-[transform,colors,box-shadow] duration-300 ease-out",
            saveState === "saved" && "ring-2 ring-foreground/30 ring-offset-2 ring-offset-background",
          )}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

function TaskEditor({
  task,
  organizations,
  onSave,
  saving,
}: {
  task: Task;
  organizations: DashboardOrganization[];
  onSave: (
    patch: Partial<
      Pick<Task, "title" | "description" | "status" | "organizationId" | "deliveryChannels">
    >,
  ) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [notifyEmail, setNotifyEmail] = useState(
    () => task.deliveryChannels.find((c) => c.kind === "email")?.address ?? "",
  );
  const [organizationId, setOrganizationId] = useState(task.organizationId ?? "");
  const wasSaving = useRef(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setNotifyEmail(task.deliveryChannels.find((c) => c.kind === "email")?.address ?? "");
    setOrganizationId(task.organizationId ?? "");
  }, [task]);

  useEffect(() => {
    if (wasSaving.current && !saving) {
      setShowSaved(true);
      const id = window.setTimeout(() => setShowSaved(false), 2200);
      return () => window.clearTimeout(id);
    }
    wasSaving.current = saving;
  }, [saving]);

  useEffect(() => {
    setShowSaved(false);
  }, [task.id]);

  const deliveryChannels =
    notifyEmail.trim().length > 0 ? [{ kind: "email" as const, address: notifyEmail.trim() }] : [];

  return (
    <div className="border border-border p-3 space-y-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Edit selected task
      </p>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        When you set status to <span className="text-foreground">open</span>, Sail sends a handoff email
        to the notify address (if Resend is configured and the task is not already handed off).
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
      {organizations.length > 0 ? (
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Organization
          </span>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="w-full border border-border bg-transparent px-3 py-2 text-xs"
          >
            <option value="">(none)</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block space-y-1">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Notify email
        </span>
        <input
          type="email"
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          placeholder="leave empty to clear"
          className="w-full border border-border bg-transparent px-3 py-2 text-xs"
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave({
            title,
            description,
            status,
            organizationId: organizationId || null,
            deliveryChannels,
          })
        }
        className={cn(
          DASH_BTN,
          "px-3 py-1.5 text-xs uppercase tracking-wider transition-[transform,colors,box-shadow] duration-300",
          showSaved &&
            "border-emerald-600/80 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/25 ring-offset-2 ring-offset-background",
        )}
      >
        {saving ? "Saving…" : showSaved ? "Saved ✓" : "Save task"}
      </button>
    </div>
  );
}
