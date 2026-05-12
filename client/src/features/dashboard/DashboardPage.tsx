import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpCircle, Copy, Plus } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Pane = "profile" | "people" | "tasks";

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
  const [invitesOpen, setInvitesOpen] = useState(false);
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
    if (invitesOpen && organizations.length > 0 && !inviteOrgId) {
      setInviteOrgId(organizations[0]!.id);
    }
  }, [invitesOpen, organizations, inviteOrgId]);
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
    },
  });

  const invitesQuery = useQuery({
    queryKey: ["my-invites"],
    queryFn: listMyInvites,
    enabled: invitesOpen,
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
          <button
            type="button"
            onClick={() => setInvitesOpen(true)}
            className={navButtonClass}
          >
            Invites
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
                  organizations={organizations}
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

      <Sheet open={invitesOpen} onOpenChange={setInvitesOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md border-l border-border font-mono overflow-y-auto flex flex-col gap-4"
        >
          <SheetHeader className="text-left space-y-1 pr-8">
            <SheetTitle className="text-xs uppercase tracking-widest font-normal">
              Invite links
            </SheetTitle>
            <SheetDescription className="text-xs font-mono text-muted-foreground normal-case">
              Create shareable links for onboarding. Recipients open the link on the home page to
              start with your invite context.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-2 border border-border p-3">
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
              className="w-full border border-border px-3 py-2 text-xs uppercase tracking-wider hover:bg-secondary/50 disabled:opacity-50"
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
                            className="inline-flex items-center gap-1 border border-border px-2 py-1 uppercase tracking-wider hover:bg-secondary/50"
                          >
                            <Copy className="w-3 h-3" aria-hidden />
                            Copy link
                          </button>
                          <button
                            type="button"
                            disabled={revokeInviteMutation.isPending}
                            onClick={() => revokeInviteMutation.mutate(invite.token)}
                            className="border border-border px-2 py-1 uppercase tracking-wider hover:bg-destructive/10 disabled:opacity-50"
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
        </SheetContent>
      </Sheet>
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
      ? "inline-flex items-center border border-foreground bg-foreground text-background px-3 py-1.5 text-xs uppercase tracking-wider transition-colors"
      : state === "error"
        ? "inline-flex items-center border border-destructive text-destructive px-3 py-1.5 text-xs uppercase tracking-wider transition-colors"
        : "inline-flex items-center border border-border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors hover:bg-secondary/50 active:bg-secondary";

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
          className={saveButtonClass}
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

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setNotifyEmail(task.deliveryChannels.find((c) => c.kind === "email")?.address ?? "");
    setOrganizationId(task.organizationId ?? "");
  }, [task]);

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
        className="border border-border px-3 py-1.5 text-xs uppercase tracking-wider"
      >
        Save task
      </button>
    </div>
  );
}
