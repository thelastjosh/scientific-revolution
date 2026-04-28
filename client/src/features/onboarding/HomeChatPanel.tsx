import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpCircle, Plus } from "lucide-react";
import { ChatTypingIndicator } from "./ChatTypingIndicator";
import { TypewriterText } from "./TypewriterText";
import { OnboardingAuthCard } from "./OnboardingAuthCard";
import { ProfileSummaryDrawer } from "./ProfileSummaryDrawer";
import { InlineProfilePreview } from "./InlineProfilePreview";
import { ProfilePreviewFollowUp } from "./ProfilePreviewFollowUp";
import { shouldShowOnboardingBlock } from "./onboarding-intent";
import { shouldShowInChatProfilePreview } from "./onboarding-interview-end";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HELP_ME_ONBOARD_PROMPT,
  isHomeOpeningMessageVariant,
  pickHomeOpeningMessage,
  splitDisplayNameForRegister,
  type HomeOpeningMessageVariant,
  USER_EDIT_PROFILE_MESSAGE,
} from "@shared/onboarding-opening";
import { PREVIEW_TITLE_FONT_REM } from "./home-chat-font";
import { OnboardingIntro } from "./OnboardingIntro";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchOnboardingBootstrap,
  graduateOnboardingToWorkspace,
  type LinkDerivedProfile,
  postOnboardingChat,
  postProfileFromLink,
  saveOnboardingContext,
} from "@/lib/onboarding-api";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  richOnboarding?: boolean;
  authCardMode?: "login" | "register";
  postAuthActions?: boolean;
  /** Rich card: in-chat profile summary at end of interview onboarding */
  inlineProfilePreview?: boolean;
  /** Rich card: profile built from a pasted public URL (server fetch + optional search) */
  linkProfileResult?: boolean;
  /** When auth card is register, optional name prefill (e.g. from profile preview) */
  authRegisterNamePrefill?: { firstName: string; lastName: string };
};

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const EXAMPLE_PROMPTS = [
  { label: "What is Scientific Revolution?", value: "What is Scientific Revolution?" },
  { label: "Help me onboard", value: HELP_ME_ONBOARD_PROMPT },
] as const;

type HomeChatPanelProps = {
  inviteToken?: string | null;
  onUserMessage?: (messageIndex: number, text: string) => void;
  onResetHome?: () => void;
};

export function HomeChatPanel({
  inviteToken = null,
  onUserMessage,
  onResetHome,
}: HomeChatPanelProps) {
  const [, navigate] = useLocation();
  const { user, login, register, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState<string | null>(null);
  const [inviteProfile, setInviteProfile] = useState<{
    token: string;
    firstName: string | null;
    email: string | null;
    description: string | null;
    researchSummary: string | null;
  } | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [linkDerivedProfile, setLinkDerivedProfile] =
    useState<LinkDerivedProfile | null>(null);
  const [linkProfileLoading, setLinkProfileLoading] = useState(false);
  const [graduating, setGraduating] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [entryOpeningLine, setEntryOpeningLine] = useState<HomeOpeningMessageVariant>(
    () => pickHomeOpeningMessage(),
  );
  const [previewSession, setPreviewSession] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cvFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const genericFileRef = useRef<HTMLInputElement>(null);
  const inChatProfilePreviewShownRef = useRef(false);
  const scrollRaf = useRef<number>(0);

  const scheduleScrollToBottom = useCallback(() => {
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = 0;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const resetChatToHome = useCallback(() => {
    navigate("/");
    setMessages([]);
    setDraft("");
    setChatError(null);
    setChatLoading(false);
    setLinkDerivedProfile(null);
    setLinkProfileLoading(false);
    inChatProfilePreviewShownRef.current = false;
    setPreviewSession((n) => n + 1);
    onResetHome?.();
  }, [navigate, onResetHome]);

  const showEntryPreview = ready && messages.length === 0;

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setBootstrapError(null);
    inChatProfilePreviewShownRef.current = false;
    setMessages([]);
    (async () => {
      try {
        const bootstrap = await fetchOnboardingBootstrap(inviteToken);
        if (cancelled) return;
        setInviteFirstName(bootstrap.inviteFirstName);
        setInviteProfile(bootstrap.inviteProfile);
        if (isHomeOpeningMessageVariant(bootstrap.openingMessage)) {
          setEntryOpeningLine(bootstrap.openingMessage);
        } else {
          setEntryOpeningLine(pickHomeOpeningMessage());
        }
      } catch {
        if (cancelled) return;
        setBootstrapError("Could not load invite context; chat still works.");
        setInviteFirstName(null);
        setInviteProfile(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chatLoading, linkProfileLoading]);

  const addAuthCard = (
    mode: "login" | "register",
    registerNamePrefill?: { firstName: string; lastName: string },
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: id(),
        role: "assistant",
        text: "",
        authCardMode: mode,
        authRegisterNamePrefill:
          mode === "register" ? registerNamePrefill : undefined,
      },
    ]);
  };

  const finishAuthFlow = async () => {
    setMessages((prev) => [
      ...prev,
      {
        id: id(),
        role: "assistant",
        text: "You're in. You can safely leave and we'll email you with a task later.",
      },
      { id: id(), role: "assistant", text: "", postAuthActions: true },
    ]);
    setProfileDrawerOpen(true);
    try {
      await saveOnboardingContext({
        persona: inviteToken ? "invite_link" : "general",
        inviteToken: inviteToken ?? null,
        inviteEmail: inviteProfile?.email ?? user?.email ?? null,
        onboardingStep: "authenticated_home_chat",
        summary: draft.trim() || null,
      });
    } catch {
      // Non-blocking in case context endpoint is unavailable.
    }
  };

  const completeLoginToDashboard = async (email: string, password: string) => {
    await login(email, password);
    setLoginModalOpen(false);
    navigate("/dashboard");
  };

  const submitUserText = async (raw: string) => {
    const text = raw.trim();
    if (!text || !ready || chatLoading || linkProfileLoading) return;

    const userMsg: ChatMessage = { id: id(), role: "user", text };
    const userIndex = messages.length;
    setChatError(null);
    setDraft("");
    onUserMessage?.(userIndex, text);

    if (text === HELP_ME_ONBOARD_PROMPT) {
      setMessages((prev) => [...prev, userMsg]);
      setChatLoading(true);
      await new Promise((r) => setTimeout(r, 520));
      setMessages((prev) => [
        ...prev,
        { id: id(), role: "assistant", text: "", richOnboarding: true },
      ]);
      setChatLoading(false);
      return;
    }

    const history = [...messages, userMsg];
    setMessages(history);

    setChatLoading(true);
    try {
      const { message } = await postOnboardingChat({
        inviteToken: inviteToken ?? null,
        entryOpeningLine,
        messages: history.map((m) => ({
          role: m.role,
          content: m.text,
        })),
      });
      setMessages((prev) => {
        const withAssistant: ChatMessage[] = [
          ...prev,
          { id: id(), role: "assistant", text: message },
        ];
        const userOnly = withAssistant
          .filter((m) => m.role === "user")
          .map((m) => ({ text: m.text }));
        if (
          !inChatProfilePreviewShownRef.current &&
          shouldShowInChatProfilePreview(
            message,
            userOnly,
            HELP_ME_ONBOARD_PROMPT,
          )
        ) {
          inChatProfilePreviewShownRef.current = true;
          return [
            ...withAssistant,
            {
              id: id(),
              role: "assistant",
              text: "",
              inlineProfilePreview: true,
            },
          ];
        }
        return withAssistant;
      });
      if (shouldShowOnboardingBlock(text)) {
        setMessages((prev) => [
          ...prev,
          { id: id(), role: "assistant", text: "", richOnboarding: true },
        ]);
      }
    } catch (e) {
      setChatError((e as Error).message);
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setDraft(text);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddLink = async (url: string) => {
    if (!ready || linkProfileLoading) return;
    setLinkProfileLoading(true);
    setChatError(null);
    try {
      const profile = await postProfileFromLink(url);
      setLinkDerivedProfile(profile);
      setMessages((prev) => [
        ...prev,
        { id: id(), role: "user", text: `I'm adding a link: ${url}` },
        {
          id: id(),
          role: "assistant",
          text: "Here's a quick profile from that page and public search snippets.",
          linkProfileResult: true,
        },
      ]);
    } catch (e) {
      const msg = (e as Error).message;
      setChatError(msg);
      toast({
        title: "Couldn’t build profile from link",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLinkProfileLoading(false);
    }
  };

  const send = () => {
    void submitUserText(draft);
  };

  const profileSummary = useMemo(
    () => {
      const userName = user
        ? `${user.firstName} ${user.lastName}`.trim()
        : "Not signed in";
      const name = linkDerivedProfile?.displayName?.trim() || userName;
      const inviteResearch = inviteProfile?.researchSummary?.trim() ?? null;
      const linkSummary = linkDerivedProfile?.summary?.trim() ?? null;
      const researchParts: string[] = [];
      if (linkSummary) researchParts.push(linkSummary);
      if (linkDerivedProfile?.fromSearch) {
        researchParts.push("Additional context from web search was included.");
      }
      if (inviteResearch) {
        researchParts.push(`Invite / prior notes:\n${inviteResearch}`);
      }
      return {
        name,
        email: user?.email ?? inviteProfile?.email ?? "Unknown",
        inviteToken: inviteToken ?? null,
        inviteDescription: inviteProfile?.description ?? null,
        inviteResearchSummary:
          researchParts.length > 0 ? researchParts.join("\n\n") : null,
        headline: linkDerivedProfile?.title?.trim() ?? null,
        sourcePageUrl: linkDerivedProfile?.sourceUrl ?? null,
      };
    },
    [user, inviteProfile, inviteToken, linkDerivedProfile],
  );

  const openCreateAccountFromProfilePreview = () => {
    const { firstName, lastName } = splitDisplayNameForRegister(
      profileSummary.name,
    );
    addAuthCard("register", { firstName, lastName });
  };

  const continueInWorkspace = async () => {
    if (graduating) return;
    setGraduating(true);
    try {
      await graduateOnboardingToWorkspace({
        messages: messages
          .filter((m) => m.role === "assistant" || m.role === "user")
          .map((m) => ({ role: m.role, content: m.text })),
        activeIntent: "workspace_transition",
      });
      navigate("/dashboard");
    } catch (e) {
      toast({
        title: "Could not continue to workspace",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setGraduating(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden font-mono border border-border bg-background">
      <header className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Entry
          </p>
          <button
            type="button"
            onClick={resetChatToHome}
            className="block text-left text-xs font-bold uppercase tracking-tight hover:underline underline-offset-4 decoration-border hover:decoration-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            Scientific Revolution
          </button>
        </div>
        {user ? (
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <a className="text-[10px] uppercase tracking-widest border border-border px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors">
                Dashboard
              </a>
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              className="text-[10px] uppercase tracking-widest border border-border px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLoginModalOpen(true)}
            className="text-[10px] uppercase tracking-widest border border-border px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors"
          >
            Login
          </button>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 space-y-10 custom-scrollbar">
        {!ready && (
          <p className="text-sm text-muted-foreground uppercase tracking-widest">
            Loading…
          </p>
        )}
        {bootstrapError && ready && (
          <p className="text-xs text-muted-foreground border border-border border-dashed p-2">
            {bootstrapError}
          </p>
        )}
        {showEntryPreview && (
          <div className="space-y-6 text-left pr-8">
            <p
              className="font-normal tracking-tight whitespace-pre-line text-foreground"
              style={{
                fontSize: `${PREVIEW_TITLE_FONT_REM}rem`,
                lineHeight: PREVIEW_TITLE_FONT_REM > 1.75 ? 1.15 : 1.35,
              }}
            >
              <TypewriterText
                text={entryOpeningLine}
                messageKey={`entry-preview-${previewSession}-${entryOpeningLine}`}
                msPerChar={5}
                onProgress={scheduleScrollToBottom}
              />
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  disabled={chatLoading || linkProfileLoading}
                  onClick={() => void submitUserText(p.value)}
                  className="border border-border bg-background px-3 py-2 text-left text-xs font-medium leading-snug hover:bg-foreground hover:text-background transition-colors disabled:opacity-40 max-w-full sm:max-w-[20rem]"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {ready &&
          messages.map((m) => {
            if (m.role === "assistant" && m.richOnboarding) {
              return (
                <div key={m.id} className="text-left">
                  <OnboardingIntro
                    inviteFirstName={inviteFirstName}
                    inviteToken={inviteToken}
                    linkBusy={linkProfileLoading}
                    onAddLink={handleAddLink}
                    onContinueInterview={() => {
                      void submitUserText("Continue interview");
                    }}
                    onSkipOnboarding={() => addAuthCard("register")}
                  />
                </div>
              );
            }
            if (m.authCardMode) {
              return (
                <div key={m.id} className="text-left pr-8">
                  <OnboardingAuthCard
                    mode={m.authCardMode}
                    inviteProfile={inviteProfile}
                    registerNamePrefill={m.authRegisterNamePrefill ?? null}
                    onLogin={async (email, password) => {
                      await completeLoginToDashboard(email, password);
                    }}
                    onRegister={async (payload) => {
                      await register(payload);
                      await finishAuthFlow();
                    }}
                  />
                </div>
              );
            }
            if (m.postAuthActions) {
              return (
                <div key={m.id} className="text-left pr-8 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    className="border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-foreground hover:text-background transition-colors"
                  >
                    Continue onboarding
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void continueInWorkspace();
                    }}
                    className="border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-foreground hover:text-background transition-colors disabled:opacity-60"
                    disabled={graduating}
                  >
                    {graduating ? "Opening workspace..." : "Continue in workspace"}
                  </button>
                </div>
              );
            }
            if (m.inlineProfilePreview) {
              return (
                <div key={m.id} className="text-left pr-8 max-w-md space-y-4">
                  <InlineProfilePreview
                    name={profileSummary.name}
                    email={profileSummary.email}
                    inviteToken={profileSummary.inviteToken}
                    description={profileSummary.inviteDescription}
                    researchSummary={profileSummary.inviteResearchSummary}
                    headline={profileSummary.headline}
                    sourcePageUrl={profileSummary.sourcePageUrl}
                  />
                  <ProfilePreviewFollowUp
                    signedIn={Boolean(user)}
                    onCreateAccount={openCreateAccountFromProfilePreview}
                    onEditProfile={() => {
                      void submitUserText(USER_EDIT_PROFILE_MESSAGE);
                    }}
                  />
                </div>
              );
            }
            if (m.linkProfileResult) {
              return (
                <div key={m.id} className="text-left pr-8 max-w-md space-y-4">
                  <p className="text-sm font-normal tracking-normal leading-relaxed break-words whitespace-pre-line text-foreground">
                    <TypewriterText
                      text={m.text}
                      messageKey={m.id}
                      msPerChar={3}
                      onProgress={scheduleScrollToBottom}
                    />
                  </p>
                  <InlineProfilePreview
                    name={profileSummary.name}
                    email={profileSummary.email}
                    inviteToken={profileSummary.inviteToken}
                    description={profileSummary.inviteDescription}
                    researchSummary={profileSummary.inviteResearchSummary}
                    headline={profileSummary.headline}
                    sourcePageUrl={profileSummary.sourcePageUrl}
                  />
                  <ProfilePreviewFollowUp
                    signedIn={Boolean(user)}
                    onCreateAccount={openCreateAccountFromProfilePreview}
                    onEditProfile={() => {
                      void submitUserText(USER_EDIT_PROFILE_MESSAGE);
                    }}
                  />
                </div>
              );
            }
            if (m.role === "user") {
              return (
                <div key={m.id} className="text-right pl-8">
                  <p className="text-sm font-normal tracking-tight leading-relaxed break-words whitespace-pre-line text-foreground">
                    {m.text}
                  </p>
                </div>
              );
            }
            return (
              <div key={m.id} className="text-left pr-8">
                <p className="text-sm font-normal tracking-normal leading-relaxed break-words whitespace-pre-line text-foreground">
                  <TypewriterText
                    text={m.text}
                    messageKey={m.id}
                    msPerChar={3}
                    onProgress={scheduleScrollToBottom}
                  />
                </p>
              </div>
            );
          })}
        {(chatLoading || linkProfileLoading) && (
          <div className="text-left pr-8">
            <ChatTypingIndicator />
            {linkProfileLoading ? (
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
                Fetching page and search snippets…
              </p>
            ) : null}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3 bg-card/30">
        {chatError && (
          <p className="text-xs text-destructive mb-2 border border-destructive/50 px-2 py-1.5">
            {chatError}
          </p>
        )}
        <div className="relative w-full text-left">
          <input
            ref={cvFileRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                toast({
                  title: "CV attached",
                  description: `${f.name} — connect upload pipeline to save.`,
                });
              }
              e.target.value = "";
            }}
          />
          <input
            ref={imageFileRef}
            type="file"
            className="sr-only"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                toast({
                  title: "Image selected",
                  description: f.name,
                });
              }
              e.target.value = "";
            }}
          />
          <input
            ref={genericFileRef}
            type="file"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                toast({
                  title: "File selected",
                  description: f.name,
                });
              }
              e.target.value = "";
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="absolute left-0 bottom-1.5 p-0.5 text-foreground hover:opacity-80 transition-opacity disabled:opacity-40"
                disabled={!ready || chatLoading || linkProfileLoading}
                aria-label="Add attachment"
              >
                <Plus className="w-6 h-6" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="font-mono text-xs">
              <DropdownMenuItem
                onSelect={() => {
                  cvFileRef.current?.click();
                }}
              >
                CV
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setDraft((d) => (d ? `${d}\n` : "") + "https://");
                  inputRef.current?.focus();
                  toast({
                    title: "Website",
                    description: "Add your URL in the message, then send.",
                  });
                }}
              >
                Website
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  imageFileRef.current?.click();
                }}
              >
                Image
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  genericFileRef.current?.click();
                }}
              >
                File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <label htmlFor="home-chat-input" className="sr-only">
            Message
          </label>
          <textarea
            ref={inputRef}
            id="home-chat-input"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Reply…"
            disabled={!ready || chatLoading || linkProfileLoading}
            className="w-full min-h-[2.5rem] max-h-24 resize-none bg-transparent border-0 pl-9 pr-14 py-1.5 text-xs leading-snug text-left placeholder:text-muted-foreground focus:outline-none focus:ring-0 rounded-none font-mono disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!ready || chatLoading || linkProfileLoading}
            className="absolute right-0 bottom-1 p-0.5 text-foreground hover:opacity-80 transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUpCircle className="w-7 h-7" strokeWidth={1.5} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-start gap-x-5 gap-y-1 text-[9px] text-muted-foreground uppercase tracking-widest">
          <Link href="/admin">
            <a className="hover:text-foreground hover:underline underline-offset-4">
              Admin
            </a>
          </Link>
          <span className="opacity-40">Scientific Revolution · Sail v0</span>
        </div>
      </div>
      <ProfileSummaryDrawer
        open={profileDrawerOpen}
        onOpenChange={setProfileDrawerOpen}
        profile={profileSummary}
      />
      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="max-w-md border border-border font-mono">
          <DialogHeader>
            <DialogTitle className="text-xs uppercase tracking-widest">Login</DialogTitle>
          </DialogHeader>
          <OnboardingAuthCard
            mode="login"
            inviteProfile={inviteProfile}
            registerNamePrefill={null}
            onLogin={completeLoginToDashboard}
            onRegister={async (payload) => {
              await register(payload);
              await finishAuthFlow();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
