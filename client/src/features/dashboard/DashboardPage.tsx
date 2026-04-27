import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_EPOCH, MOCK_PROJECTS, MOCK_TASKS, type Task } from "@/lib/mock-data";
import { fetchDashboard, type DashboardProfile } from "@/lib/dashboard-api";
import type { Epoch, Project } from "@shared/network-feed";
import { Link, useSearch } from "wouter";
import { ArrowLeft, Info, CheckCircle, Clock, AlertTriangle, GitCommit, FileText, User, X, Crown, Github, Terminal, Database, Upload, Globe, Search, ArrowRight, Shuffle, MessageSquare, Calendar, Plug, UserPlus, Network, LogIn, Activity, Download, Award } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GlobalStatusBoard } from "./global-status";
import { FeatureGate } from "@/features/experiments/FeatureGate";
import { useUiExperiment } from "@/features/experiments/useUiExperiment";
import { fetchOnboardingContext, type OnboardingContext } from "@/lib/onboarding-api";
import profile1 from "@/assets/images/profile-1.png";
import profile2 from "@/assets/images/profile-2.png";
import profile3 from "@/assets/images/profile-3.png";

export default function Dashboard() {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [networkEpoch, setNetworkEpoch] = useState<Epoch | null>(null);
  const [dbProfile, setDbProfile] = useState<DashboardProfile | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardReady, setDashboardReady] = useState(false);
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const communityFilter = searchParams.get("community");

  // Intent search state (migrated from intent-search.tsx)
  const [intent, setIntent] = useState("");
  const [intentMode, setIntentMode] = useState<'contribute' | 'request'>('contribute');
  const [hasRole, setHasRole] = useState(true); // Mock toggle for role component
  const [showTeam, setShowTeam] = useState(false); // Toggle to show team nodes vs nearby nodes
  const [taskForm, setTaskForm] = useState({ title: '', description: '', isSync: false, meetingLink: '', useNotetaker: false });
  const [onboardingContext, setOnboardingContext] = useState<OnboardingContext | null>(null);
  
  const [goals, setGoals] = useState<{id: string, text: string}[]>([
    { id: '1', text: 'Help set up an agent framework for my org' },
    { id: '2', text: 'Review smart contract security architecture' }
  ]);

  const taskCardLayout = useUiExperiment("dashboard.task_card_layout");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const context = await fetchOnboardingContext();
        if (!cancelled) setOnboardingContext(context);
      } catch {
        if (!cancelled) setOnboardingContext(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDashboardReady(false);
    setDashboardError(null);
    void (async () => {
      try {
        const d = await fetchDashboard();
        if (cancelled) return;
        setTasks(d.tasks);
        setProjects(d.projects);
        setNetworkEpoch(d.epoch);
        setDbProfile(d.profile);
        setDashboardError(null);
      } catch (e) {
        if (cancelled) return;
        setDashboardError((e as Error).message);
        setTasks(MOCK_TASKS);
        setProjects(MOCK_PROJECTS);
        setNetworkEpoch(MOCK_EPOCH);
        setDbProfile(null);
      } finally {
        if (!cancelled) setDashboardReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddGoal = () => {
    if (intent.trim()) {
      setGoals([{ id: Date.now().toString(), text: intent }, ...goals]);
      setIntent("");
    }
  };

  const handleStartTask = (task: Task) => {
    setActiveTask(task);
  };

  const handleCompleteTask = () => {
    if (activeTask) {
      setCompletedTasks([...completedTasks, activeTask.id]);
      setActiveTask(null);
    }
  };

  const toggleIntentMode = () => {
    setIntentMode(prev => prev === 'contribute' ? 'request' : 'contribute');
    setIntent("");
  };

  const filteredTasks = tasks.filter((t) => {
    const isNotCompleted = !completedTasks.includes(t.id);
    const matchesCommunity = communityFilter
      ? t.community === communityFilter
      : true;
    return isNotCompleted && matchesCommunity;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Link href="/">
              <a className="text-xl font-bold tracking-tighter uppercase hover:underline">Scientific Revolution</a>
             </Link>
             <span className="text-xs px-2 py-0.5 border border-border hidden md:inline-block">BETA</span>
          </div>
          <div className="flex items-center gap-2 text-sm overflow-x-auto no-scrollbar">
            <FeatureGate flagKey="dashboard.invite_sheet">
            <Sheet>
              <SheetTrigger asChild>
                <button className="text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-border h-8 px-2 sm:px-0 sm:w-28 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-1 sm:gap-2 shrink-0">
                    <UserPlus className="w-3 h-3" />
                    Invite
                </button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] border-l-2 border-border !px-0 flex flex-col h-full font-mono">
                 <div className="px-6 pt-6 pb-4 border-b border-border">
                    <SheetHeader className="text-left">
                      <SheetTitle className="uppercase tracking-widest text-lg flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Network Expansion
                      </SheetTitle>
                      <SheetDescription>
                        Generate an invite link or code to onboard new nodes.
                      </SheetDescription>
                    </SheetHeader>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="bg-secondary/30 border border-border p-4 text-sm">
                      <p className="font-bold mb-2">Relationship Binding</p>
                      <p className="text-muted-foreground">
                        When they join, users you invite will be automatically connected to you and visible on your profile. Your <span className="font-mono text-foreground">relationships.md</span> will be updated to reflect the new connection.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest">Generate Invite Code</h4>
                      <div className="flex gap-2">
                        <div className="bg-background border border-border p-3 flex-1 text-center font-mono text-lg tracking-[0.5em] font-bold">
                          SR-NODE-881X
                        </div>
                        <button className="bg-foreground text-background px-6 font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity">
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest">Generate Direct Link</h4>
                      <div className="flex gap-2">
                        <div className="bg-background border border-border p-3 flex-1 text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                          https://scientific-revolution.net/join?code=SR-NODE-881X
                        </div>
                        <button className="bg-foreground text-background px-6 font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-opacity">
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-dashed border-border">
                      <h4 className="text-xs font-bold uppercase tracking-widest">Standard Email Invite</h4>
                      <div className="space-y-2">
                        <input 
                          type="email" 
                          placeholder="TARGET NODE EMAIL" 
                          className="w-full bg-background border border-border p-3 text-sm focus:outline-none focus:border-foreground"
                        />
                        <button className="w-full bg-black text-white dark:bg-white dark:text-black py-3 text-xs font-bold uppercase tracking-widest hover:opacity-90">
                          Dispatch Invitation
                        </button>
                      </div>
                    </div>
                 </div>
              </SheetContent>
            </Sheet>
            </FeatureGate>

            <Link href="/profile">
                <a className="text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-border h-8 px-2 sm:px-0 sm:w-28 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-1 sm:gap-2 shrink-0">
                    <img src={profile1} alt="Profile" className="w-4 h-4 sm:w-5 sm:h-5 object-cover filter grayscale contrast-125 border border-current" />
                    Profile
                </a>
            </Link>
            
            <Sheet>
              <SheetTrigger asChild>
                <button className="text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-border h-8 px-2 sm:px-0 sm:w-28 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-1 sm:gap-2 shrink-0">
                    <Network className="w-3 h-3" />
                    Network
                </button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] border-l-2 border-border !px-0 flex flex-col h-full font-mono">
                 <div className="px-6 pt-6 pb-4 border-b border-border">
                    <SheetHeader className="text-left">
                      <SheetTitle className="uppercase tracking-widest text-lg flex items-center gap-2">
                        <Network className="w-5 h-5" />
                        Network State
                      </SheetTitle>
                      <SheetDescription>
                        Aggregate activity across your connected graph.
                      </SheetDescription>
                    </SheetHeader>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-border p-4 bg-secondary/10">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Connections Formed</div>
                        <div className="text-2xl font-bold">14</div>
                      </div>
                      <div className="border border-border p-4 bg-secondary/10">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Graph Depth</div>
                        <div className="text-2xl font-bold">3 Hops</div>
                      </div>
                      <div className="border border-border p-4 bg-secondary/10">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Tasks Posted (Network)</div>
                        <div className="text-2xl font-bold">128</div>
                      </div>
                      <div className="border border-border p-4 bg-secondary/10">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Tasks Completed (Network)</div>
                        <div className="text-2xl font-bold">842</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest mb-4">Recent Network Activity</h4>
                      <div className="space-y-4">
                        {[
                          { node: 'Sarah', action: 'completed task', target: 'T-9902', time: '10m ago' },
                          { node: 'Aadi', action: 'formed connection with', target: 'Public AI', time: '1h ago' },
                          { node: 'Public AI', action: 'posted new project', target: 'CMD-003', time: '3h ago' },
                          { node: 'Chen', action: 'completed evaluation', target: 'T-2025', time: '5h ago' }
                        ].map((activity, i) => (
                          <div key={i} className="flex gap-3 text-sm border-l-2 border-border pl-3 py-1">
                            <span className="text-muted-foreground shrink-0 w-12">{activity.time}</span>
                            <span>
                              <span className="font-bold">{activity.node}</span>{' '}
                              <span className="text-muted-foreground">{activity.action}</span>{' '}
                              <span className="font-mono">{activity.target}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
              </SheetContent>
            </Sheet>

            <FeatureGate flagKey="dashboard.calendar_sheet">
            <Sheet>
              <SheetTrigger asChild>
                <button className="text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-border h-8 px-2 sm:px-0 sm:w-28 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-1 sm:gap-2 shrink-0">
                    <Calendar className="w-3 h-3" />
                    Calendar
                </button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] border-l-2 border-border !px-0 flex flex-col h-full font-mono">
                 <div className="px-6 pt-6 pb-4 border-b border-border">
                    <SheetHeader className="text-left">
                      <SheetTitle className="uppercase tracking-widest text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Synchronous Events
                      </SheetTitle>
                      <SheetDescription>
                        High-bandwidth alignment and collaboration sessions.
                      </SheetDescription>
                    </SheetHeader>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {tasks.filter((t) => t.type === "event").map((event) => (
                      <div key={event.id} className="border border-border p-4 hover:bg-secondary/20 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold bg-black text-white dark:bg-white dark:text-black px-2 py-1">
                            {event.shortWhy}
                          </span>
                          <span className={`text-xs font-bold ${event.motivationScore > 0 ? 'text-green-500' : event.motivationScore < 0 ? 'text-red-500' : ''}`}>
                            {event.motivationScore > 0 ? '+ MOTIVATION' : '- MOTIVATION'}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm uppercase mb-1">{event.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 font-mono">
                          <Clock className="w-3 h-3" />
                          {event.eventDate ? new Date(event.eventDate).toLocaleString() : 'TBD'}
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
                        <button 
                          onClick={() => {
                            handleStartTask(event);
                            // We need to close the sheet here, but we don't have controlled state.
                            // We can just rely on user closing it or clicking outside.
                          }}
                          className="w-full py-2 bg-foreground text-background text-xs font-bold uppercase tracking-widest hover:opacity-90"
                        >
                          Join Event
                        </button>
                      </div>
                    ))}
                    {tasks.filter((t) => t.type === "event").length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No upcoming events scheduled.
                      </div>
                    )}
                 </div>
              </SheetContent>
            </Sheet>
            </FeatureGate>

            <Link href="/login">
                <a className="text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-border h-8 px-2 sm:px-0 sm:w-28 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-1 sm:gap-2 shrink-0">
                    <LogIn className="w-3 h-3" />
                    Login
                </a>
            </Link>
          </div>
        </div>
      </header>

      {!dashboardReady ? (
        <div className="border-b border-border bg-secondary/20 px-4 py-2 text-center text-xs uppercase tracking-widest text-muted-foreground">
          Loading network data…
        </div>
      ) : null}
      {dashboardError ? (
        <div className="border-b border-dashed border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs text-center text-amber-950 dark:text-amber-100 max-w-6xl mx-auto">
          {dashboardError} — showing embedded demo data until the API is available.
        </div>
      ) : null}
      {dbProfile && dashboardReady && !dashboardError ? (
        <div className="border-b border-border bg-card/40 px-4 py-2 max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="uppercase tracking-widest text-[10px]">Signed in as</span>{" "}
            <span className="text-foreground font-mono">
              {dbProfile.firstName} {dbProfile.lastName}
            </span>
          </span>
          <span>Reputation {dbProfile.reputation.toFixed(1)}</span>
          <span>Motivation {dbProfile.motivation}</span>
          {dbProfile.bio ? (
            <span className="max-w-xl line-clamp-2">{dbProfile.bio}</span>
          ) : null}
        </div>
      ) : null}

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {onboardingContext ? (
          <div className="mb-6 border border-border bg-card/30 p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Onboarding state
            </p>
            <p className="text-sm mt-1">
              Step: <span className="font-semibold">{onboardingContext.onboardingStep}</span>
              {onboardingContext.summary ? ` · ${onboardingContext.summary}` : ""}
            </p>
          </div>
        ) : null}
        
        {/* Intent Search Section */}
        {!activeTask && (
            <div className="mb-12 border-b border-dashed border-border pb-12">
                {/* Mini Profile & Role Hero */}
                <div className="flex flex-col md:flex-row gap-6 mb-12 bg-secondary/10 border border-border p-6 md:p-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 border-2 border-foreground overflow-hidden shrink-0 bg-secondary">
                        <img src={profile1} alt="Profile" className="w-full h-full object-cover filter grayscale contrast-125" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold uppercase tracking-tighter">
                          {dbProfile
                            ? `${dbProfile.firstName} ${dbProfile.lastName}`.toUpperCase()
                            : "YOU (SR-NODE-881)"}
                        </h2>
                        <div className="text-xs text-muted-foreground uppercase mt-1">
                          {dbProfile?.bio ||
                            "Distributed Systems Engineer · Level 3 Clearance"}
                        </div>
                      </div>
                    </div>
                    
                    {hasRole ? (
                      <div className="border border-border bg-card p-6 relative group cursor-pointer hover:border-foreground transition-colors">
                        <div className="absolute top-0 right-0 bg-foreground text-background px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                          Active Role
                        </div>
                        <h3 className="text-lg font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Crown className="w-5 h-5 text-yellow-500" />
                          Consensus Architect
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md">
                          Lead designer for the global consensus protocol. Responsible for resolving Byzantine faults and optimizing gossip throughput.
                        </p>
                        
                        <div className="pt-4 border-t border-dashed border-border mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{showTeam ? 'My Team' : 'Nearby Nodes'}</h4>
                            <div className="flex gap-2">
                              <Sheet>
                                <SheetTrigger asChild>
                                  <button 
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] uppercase font-bold tracking-widest border border-border px-2 py-0.5 hover:bg-foreground hover:text-background transition-colors flex items-center gap-1"
                                  >
                                    <Search className="w-3 h-3" />
                                    Browse
                                  </button>
                                </SheetTrigger>
                                <SheetContent className="w-[400px] sm:w-[540px] border-l-2 border-border !px-0 flex flex-col h-full font-mono overflow-hidden">
                                  <div className="px-6 pt-6 pb-4 border-b border-border">
                                    <SheetHeader className="text-left">
                                      <SheetTitle className="uppercase tracking-widest text-lg flex items-center gap-2">
                                        <Network className="w-5 h-5" />
                                        Nearby Nodes Directory
                                      </SheetTitle>
                                      <SheetDescription>
                                        Browse active contributors near you. Download their capability files to signal market demand.
                                      </SheetDescription>
                                    </SheetHeader>
                                  </div>
                                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                                    {[
                                      { name: 'Sarah', role: 'Fullstack Engineer', clearance: 'L2', skills: ['React', 'Node.js', 'System Design'], img: profile2 },
                                      { name: 'Chen', role: 'Smart Contract Auditor', clearance: 'L4', skills: ['Solidity', 'Rust', 'Cryptography'], img: profile3 },
                                    ].map((node, i) => (
                                      <div key={i} className="border border-border p-4 bg-card group hover:border-foreground transition-colors">
                                        <div className="flex items-start gap-4 mb-4">
                                          <div className="w-12 h-12 rounded-full border border-border overflow-hidden bg-secondary shrink-0">
                                            <img src={node.img} className="w-full h-full object-cover filter grayscale contrast-125" />
                                          </div>
                                          <div>
                                            <h4 className="font-bold text-lg uppercase tracking-tighter">{node.name}</h4>
                                            <p className="text-xs text-muted-foreground uppercase">{node.role} • {node.clearance}</p>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                          {node.skills.map(skill => (
                                            <span key={skill} className="text-[10px] bg-secondary px-2 py-1 font-mono uppercase text-muted-foreground">
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                        <div className="border-t border-dashed border-border pt-4 flex gap-2">
                                          <button 
                                            className="flex-1 flex items-center justify-center gap-2 bg-background border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              alert(`Downloaded ${node.name}'s capabilities.md. This has been logged as a market demand signal on their dashboard.`);
                                            }}
                                          >
                                            <Download className="w-3 h-3" />
                                            capabilities.md
                                          </button>
                                          <button 
                                            className="flex-1 flex items-center justify-center gap-2 bg-secondary/20 border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              alert(`Recognition sent to ${node.name}! They can choose to add it to their relationships.md.`);
                                            }}
                                          >
                                            <Award className="w-3 h-3" />
                                            Recognize
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </SheetContent>
                              </Sheet>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowTeam(!showTeam);
                                }}
                                className="text-[10px] uppercase font-bold tracking-widest border border-border px-2 py-0.5 hover:bg-foreground hover:text-background transition-colors"
                              >
                                {showTeam ? 'View Network' : 'My Team'}
                              </button>
                            </div>
                          </div>
                          
                          {showTeam ? (
                            <div className="flex items-center gap-6 animate-in fade-in overflow-x-auto no-scrollbar pb-2">
                              <div className="flex flex-col items-center gap-1 group/node shrink-0">
                                <div className="w-8 h-8 rounded-full border-2 border-foreground overflow-hidden bg-secondary">
                                  <img src={profile1} className="w-full h-full object-cover filter grayscale contrast-125" />
                                </div>
                                <span className="text-[8px] font-mono uppercase font-bold">You</span>
                              </div>
                              <div className="h-px w-4 sm:w-8 bg-foreground shrink-0" />
                              <div className="flex flex-col items-center gap-1 group/node shrink-0">
                                <div className="w-8 h-8 rounded-full border-2 border-foreground overflow-hidden bg-secondary">
                                  <img src={profile2} className="w-full h-full object-cover filter grayscale contrast-125 opacity-90 mix-blend-multiply" />
                                </div>
                                <span className="text-[8px] font-mono uppercase font-bold">Sarah</span>
                              </div>
                              <div className="h-px w-4 sm:w-8 bg-foreground shrink-0" />
                              <div className="flex flex-col items-center gap-1 group/node shrink-0">
                                <div className="w-8 h-8 rounded-full border-2 border-foreground overflow-hidden bg-secondary">
                                  <img src={profile3} className="w-full h-full object-cover filter grayscale contrast-125 opacity-90 mix-blend-multiply" />
                                </div>
                                <span className="text-[8px] font-mono uppercase font-bold">Chen</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-6 animate-in fade-in overflow-x-auto no-scrollbar pb-2">
                              <div className="flex flex-col items-center gap-1 group/node shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-8 h-8 rounded-full border border-border overflow-hidden bg-secondary cursor-pointer relative">
                                      <Link href="/node/sarah">
                                        <a className="absolute inset-0 z-10" />
                                      </Link>
                                      <img src={profile2} className="w-full h-full object-cover filter grayscale contrast-125 opacity-70 mix-blend-multiply group-hover/node:opacity-100 transition-opacity" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="border-border bg-card p-3 max-w-[200px]">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs font-bold uppercase tracking-widest">Sarah</p>
                                      <span className="text-[8px] bg-green-500/20 text-green-500 px-1 py-0.5 font-bold">L2</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground uppercase mb-2">Fullstack Engineer</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">React</span>
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">Node.js</span>
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">System Design</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
                                      Click to view full node profile
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                                <span className="text-[8px] font-mono uppercase text-muted-foreground group-hover/node:text-foreground transition-colors">Sarah</span>
                              </div>
                              <div className="h-px w-4 sm:w-8 bg-border border-dashed shrink-0" />
                              <div className="flex flex-col items-center gap-1 group/node shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-8 h-8 rounded-full border-2 border-foreground overflow-hidden bg-secondary cursor-pointer relative">
                                      <Link href="/profile">
                                        <a className="absolute inset-0 z-10" />
                                      </Link>
                                      <img src={profile1} className="w-full h-full object-cover filter grayscale contrast-125" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="border-border bg-card p-3 max-w-[200px]">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs font-bold uppercase tracking-widest text-primary">You</p>
                                      <span className="text-[8px] bg-green-500/20 text-green-500 px-1 py-0.5 font-bold">L3</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground uppercase mb-2">Distributed Systems Engineer</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">Rust</span>
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">Consensus</span>
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">Crypto</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
                                      Click to view private profile
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                                <span className="text-[8px] font-mono uppercase font-bold text-foreground">You</span>
                              </div>
                              <div className="h-px w-4 sm:w-8 bg-border border-dashed shrink-0" />
                              <div className="flex flex-col items-center gap-1 group/node shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-8 h-8 rounded-full border border-border overflow-hidden bg-secondary cursor-pointer relative">
                                      <Link href="/node/chen">
                                        <a className="absolute inset-0 z-10" />
                                      </Link>
                                      <img src={profile3} className="w-full h-full object-cover filter grayscale contrast-125 opacity-70 mix-blend-multiply group-hover/node:opacity-100 transition-opacity" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="border-border bg-card p-3 max-w-[200px]">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs font-bold uppercase tracking-widest">Chen</p>
                                      <span className="text-[8px] bg-green-500/20 text-green-500 px-1 py-0.5 font-bold">L4</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground uppercase mb-2">Smart Contract Auditor</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">Solidity</span>
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">Rust</span>
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">Cryptography</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
                                      Click to view full node profile
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                                <span className="text-[8px] font-mono uppercase text-muted-foreground group-hover/node:text-foreground transition-colors">Chen</span>
                              </div>
                              <div className="h-px w-4 sm:w-8 bg-border border-dashed shrink-0" />
                              <div className="flex flex-col items-center gap-1 group/node cursor-pointer shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-8 h-8 rounded-full border border-border overflow-hidden bg-secondary flex items-center justify-center relative">
                                      <Link href="/node/unicef">
                                        <a className="absolute inset-0 z-10" />
                                      </Link>
                                      <Globe className="w-4 h-4 text-muted-foreground group-hover/node:text-foreground transition-colors" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="border-border bg-card p-3 max-w-[200px]">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs font-bold uppercase tracking-widest">UNICEF</p>
                                      <span className="text-[8px] bg-secondary border border-border px-1 py-0.5 font-bold">ORG</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground uppercase mb-2">Global Child Welfare</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">Data Science</span>
                                      <span className="text-[8px] bg-secondary px-1 py-0.5 font-mono">Infrastructure</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
                                      Click to view organization profile
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                                <span className="text-[8px] font-mono uppercase text-muted-foreground group-hover/node:text-foreground">UNICEF</span>
                              </div>
                              <div className="h-px w-4 sm:w-8 bg-border border-dashed shrink-0" />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center gap-1 group/node cursor-pointer shrink-0">
                                    <div className="w-8 h-8 rounded-full border border-dashed border-red-500/50 bg-red-500/5 flex items-center justify-center">
                                      <span className="text-red-500/50 text-[10px] font-bold">?</span>
                                    </div>
                                    <span className="text-[8px] font-mono uppercase text-red-500/70">Frontend</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="border-red-500/20 bg-card">
                                  <p className="text-xs font-mono">This org could use someone with React/Frontend skills</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">Identified from 2 active unassigned tasks</p>
                                </TooltipContent>
                              </Tooltip>
                              <div className="h-px w-4 sm:w-8 bg-border border-dashed shrink-0" />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center gap-1 group/node cursor-pointer shrink-0">
                                    <div className="w-8 h-8 rounded-full border border-dashed border-amber-500/50 bg-amber-500/5 flex items-center justify-center">
                                      <span className="text-amber-500/50 text-[10px] font-bold">?</span>
                                    </div>
                                    <span className="text-[8px] font-mono uppercase text-amber-500/70">QA Auth</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="border-amber-500/20 bg-card">
                                  <p className="text-xs font-mono">This org could use someone with Security QA skills</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">Derived from "Auth Audit" task</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          Select Your Initial Role
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          {[
                            { title: 'Data Annotator', desc: 'Process raw inputs to train core models.' },
                            { title: 'Security Auditor', desc: 'Find vulnerabilities in network smart contracts.' },
                            { title: 'Evangelist', desc: 'Expand the network by onboarding new nodes.' }
                          ].map(role => (
                            <button key={role.title} className="border border-border p-4 text-left hover:bg-secondary hover:border-foreground transition-colors group">
                              <h4 className="font-bold text-sm uppercase mb-1">{role.title}</h4>
                              <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">{role.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Debug toggle for mockup purposes */}
                  <div className="absolute top-4 right-4 md:static md:w-auto">
                    <button 
                      onClick={() => setHasRole(!hasRole)} 
                      className="text-[10px] uppercase font-mono bg-secondary border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                    >
                      Toggle State
                    </button>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 border border-border px-3 py-1 mb-6 text-xs uppercase tracking-widest bg-background">
                    <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                    My Goals
                </div>
                
                <div className="relative group mb-6">
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <input 
                        type="text" 
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddGoal();
                        }}
                        placeholder="I want to..."
                        className="w-full bg-transparent border-b-2 border-border py-4 pl-8 pr-16 text-2xl md:text-3xl font-bold focus:outline-none focus:border-black dark:focus:border-white transition-all placeholder:text-muted-foreground/30"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                            onClick={handleAddGoal}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${intent ? 'bg-black text-white dark:bg-white dark:text-black opacity-100' : 'opacity-0 translate-x-4 pointer-events-none'}`}
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs font-mono">Submit intent</p>
                      </TooltipContent>
                    </Tooltip>
                </div>

                {/* Goals List */}
                {goals.length > 0 && (
                  <div className="mb-6 space-y-2">
                    {goals.map(goal => (
                      <Sheet key={goal.id}>
                        <SheetTrigger asChild>
                          <div 
                            className="border border-border p-3 text-sm flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors group bg-card"
                            onClick={() => setTaskForm({ title: goal.text, description: '', isSync: false, meetingLink: '', useNotetaker: false })}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-border group-hover:bg-foreground transition-colors" />
                              <span className="font-mono font-bold">{goal.text}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-all" />
                          </div>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[600px] border-l-2 border-border !px-0 flex flex-col h-full font-mono overflow-hidden">
                           <div className="px-6 pt-6 pb-4 border-b border-border">
                              <SheetHeader className="text-left">
                                <SheetTitle className="uppercase tracking-widest text-lg flex items-center gap-2">
                                  <MessageSquare className="w-5 h-5" />
                                  Goal Task Details
                                </SheetTitle>
                                <SheetDescription>
                                  Flesh out this goal into a task for the network.
                                </SheetDescription>
                              </SheetHeader>
                           </div>
                           <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-[10px] uppercase font-bold mb-1 text-muted-foreground">Task Title</label>
                                  <input 
                                    type="text" 
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                                    className="w-full bg-transparent border border-border p-2 text-sm focus:outline-none focus:border-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold mb-1 text-muted-foreground">Description</label>
                                  <textarea 
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                                    className="w-full bg-transparent border border-border p-2 text-sm h-24 focus:outline-none focus:border-foreground resize-none custom-scrollbar"
                                    placeholder="Provide context, deliverables, and any relevant links..."
                                  />
                                </div>
                                
                                <div className="flex items-center gap-2 pt-2">
                                  <input 
                                    type="checkbox" 
                                    id={`sync-toggle-${goal.id}`}
                                    checked={taskForm.isSync}
                                    onChange={(e) => setTaskForm({...taskForm, isSync: e.target.checked})}
                                    className="accent-foreground w-4 h-4"
                                  />
                                  <label htmlFor={`sync-toggle-${goal.id}`} className="text-sm font-bold cursor-pointer">Requires synchronous coordination</label>
                                </div>

                                {taskForm.isSync && (
                                  <div className="pt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                      <label className="block text-[10px] uppercase font-bold mb-1 text-green-500">Meeting Link (Zoom / Google Meet)</label>
                                      <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input 
                                          type="url" 
                                          value={taskForm.meetingLink}
                                          onChange={(e) => setTaskForm({...taskForm, meetingLink: e.target.value})}
                                          className="w-full bg-transparent border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-green-500"
                                          placeholder="https://zoom.us/j/..."
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-3 bg-green-500/5 border border-green-500/20 p-3">
                                      <input 
                                        type="checkbox" 
                                        id={`notetaker-toggle-${goal.id}`}
                                        checked={taskForm.useNotetaker}
                                        onChange={(e) => setTaskForm({...taskForm, useNotetaker: e.target.checked})}
                                        className="accent-green-500 w-4 h-4 mt-0.5 shrink-0"
                                      />
                                      <div>
                                        <label htmlFor={`notetaker-toggle-${goal.id}`} className="text-sm font-bold cursor-pointer text-green-500 uppercase tracking-wide flex items-center gap-2">
                                          <MessageSquare className="w-4 h-4" />
                                          Deploy AI Notetaker
                                        </label>
                                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                                          Sponsored by <strong>UNICEF</strong>. An AI agent will join the meeting to transcribe, summarize, and automatically attach notes to this task record for all participants.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <button 
                                className="w-full mt-6 bg-foreground text-background font-bold uppercase tracking-widest py-3 hover:opacity-90 transition-opacity"
                                onClick={() => {
                                  alert("Task posted to the network!");
                                }}
                              >
                                Post Task to Network
                              </button>
                           </div>
                        </SheetContent>
                      </Sheet>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                            className="group flex items-center gap-2 px-4 py-2 border border-border hover:bg-secondary hover:border-black dark:hover:border-white transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            <Shuffle className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                            Tell me what to do
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs font-mono">Auto-assign a task based on your profile</p>
                      </TooltipContent>
                    </Tooltip>

                    <Sheet>
                      <SheetTrigger asChild>
                        <button 
                            className="group flex items-center gap-2 px-4 py-2 border border-border hover:bg-secondary hover:border-black dark:hover:border-white transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            <MessageSquare className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                            Say what needs to be done
                        </button>
                      </SheetTrigger>
                      <SheetContent className="w-[400px] sm:w-[600px] border-l-2 border-border !px-0 flex flex-col h-full font-mono overflow-hidden">
                         <div className="px-6 pt-6 pb-4 border-b border-border">
                            <SheetHeader className="text-left">
                              <SheetTitle className="uppercase tracking-widest text-lg flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Planning Flow
                              </SheetTitle>
                              <SheetDescription>
                                Request help from the network. Start with a suggested template or draft from scratch.
                              </SheetDescription>
                            </SheetHeader>
                         </div>
                         <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Suggested Tasks Library */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <Crown className="w-4 h-4 text-yellow-500" />
                                  Suggested Task Library
                                </h3>
                                <div className="space-y-3">
                                  {[
                                    { title: "Help me set up an agent framework for my org and employees", desc: "1-hour sync to evaluate needs and deploy an initial scaffolding.", sync: true },
                                    { title: "Review our smart contract security architecture", desc: "Async review of our current tokenomics and permissions.", sync: false },
                                    { title: "Write a technical blog post about our latest release", desc: "Async task. We'll provide bullet points, you turn it into a narrative.", sync: false }
                                  ].map((template, idx) => (
                                    <div 
                                      key={idx} 
                                      className="border border-border p-4 hover:border-foreground cursor-pointer transition-colors group bg-secondary/5"
                                      onClick={() => setTaskForm({ title: template.title, description: template.desc, isSync: template.sync, meetingLink: '', useNotetaker: false })}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-sm leading-tight group-hover:underline">{template.title}</h4>
                                        {template.sync && (
                                          <span className="text-[10px] bg-foreground text-background px-1.5 py-0.5 uppercase font-bold shrink-0 ml-2">Sync</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{template.desc}</p>
                                    </div>
                                  ))}
                                </div>
                            </div>

                            <div className="border-t border-dashed border-border pt-8">
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-6">Task Details</h3>
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-[10px] uppercase font-bold mb-1 text-muted-foreground">Task Title</label>
                                    <input 
                                      type="text" 
                                      value={taskForm.title}
                                      onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                                      className="w-full bg-transparent border border-border p-2 text-sm focus:outline-none focus:border-foreground"
                                      placeholder="e.g., Audit our new consensus module"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] uppercase font-bold mb-1 text-muted-foreground">Description</label>
                                    <textarea 
                                      value={taskForm.description}
                                      onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                                      className="w-full bg-transparent border border-border p-2 text-sm h-24 focus:outline-none focus:border-foreground resize-none custom-scrollbar"
                                      placeholder="Provide context, deliverables, and any relevant links..."
                                    />
                                  </div>
                                  
                                  <div className="flex items-center gap-2 pt-2">
                                    <input 
                                      type="checkbox" 
                                      id="sync-toggle"
                                      checked={taskForm.isSync}
                                      onChange={(e) => setTaskForm({...taskForm, isSync: e.target.checked})}
                                      className="accent-foreground w-4 h-4"
                                    />
                                    <label htmlFor="sync-toggle" className="text-sm font-bold cursor-pointer">Requires synchronous coordination</label>
                                  </div>

                                  {taskForm.isSync && (
                                    <div className="pt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                      <div>
                                        <label className="block text-[10px] uppercase font-bold mb-1 text-green-500">Meeting Link (Zoom / Google Meet)</label>
                                        <div className="relative">
                                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                          <input 
                                            type="url" 
                                            value={taskForm.meetingLink}
                                            onChange={(e) => setTaskForm({...taskForm, meetingLink: e.target.value})}
                                            className="w-full bg-transparent border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-green-500"
                                            placeholder="https://zoom.us/j/..."
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-3 bg-green-500/5 border border-green-500/20 p-3">
                                        <input 
                                          type="checkbox" 
                                          id="notetaker-toggle"
                                          checked={taskForm.useNotetaker}
                                          onChange={(e) => setTaskForm({...taskForm, useNotetaker: e.target.checked})}
                                          className="accent-green-500 w-4 h-4 mt-0.5 shrink-0"
                                        />
                                        <div>
                                          <label htmlFor="notetaker-toggle" className="text-sm font-bold cursor-pointer text-green-500 uppercase tracking-wide flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" />
                                            Deploy AI Notetaker
                                          </label>
                                          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                                            Sponsored by <strong>UNICEF</strong>. An AI agent will join the meeting to transcribe, summarize, and automatically attach notes to this task record for all participants.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button 
                                  className="w-full mt-6 bg-foreground text-background font-bold uppercase tracking-widest py-3 hover:opacity-90 transition-opacity"
                                  onClick={() => {
                                    alert("Task posted to the network!");
                                  }}
                                >
                                  Post Task to Network
                                </button>
                            </div>
                         </div>
                      </SheetContent>
                    </Sheet>
                </div>
            </div>
        )}

        {/* Universal Aggregate Network View */}
        {!activeTask && !communityFilter && (
          <div className="mb-12 border border-border bg-card p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <Network className="w-5 h-5 text-foreground" />
                <h2 className="text-lg font-bold uppercase tracking-widest">Network Aggregate State</h2>
              </div>
              
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">
                    <div className="border border-border p-4 bg-secondary/10 hover:bg-secondary/30 transition-colors">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Connections Formed</div>
                      <div className="text-3xl font-bold font-mono">14</div>
                      <div className="text-[10px] text-green-500 uppercase mt-2 font-bold">+2 THIS EPOCH</div>
                    </div>
                    <div className="border border-border p-4 bg-secondary/10 hover:bg-secondary/30 transition-colors">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Graph Depth</div>
                      <div className="text-3xl font-bold font-mono">3<span className="text-lg text-muted-foreground ml-1">HOPS</span></div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-2">REACHING 1,204 NODES</div>
                    </div>
                    <div className="border border-border p-4 bg-secondary/10 hover:bg-secondary/30 transition-colors">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Tasks Posted</div>
                      <div className="text-3xl font-bold font-mono">128</div>
                      <div className="text-[10px] text-green-500 uppercase mt-2 font-bold">+15 THIS EPOCH</div>
                    </div>
                    <div className="border border-border p-4 bg-secondary/10 hover:bg-secondary/30 transition-colors">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Tasks Completed</div>
                      <div className="text-3xl font-bold font-mono">842</div>
                      <div className="text-[10px] text-green-500 uppercase mt-2 font-bold">+89 THIS EPOCH</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Live Activity Feed
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {[
                        { node: 'Sarah', action: 'completed task', target: 'T-9902', time: '10m ago' },
                        { node: 'Aadi', action: 'formed connection with', target: 'Public AI', time: '1h ago' },
                        { node: 'Public AI', action: 'posted new project', target: 'CMD-003', time: '3h ago' },
                        { node: 'Chen', action: 'completed evaluation', target: 'T-2025', time: '5h ago' },
                        { node: 'Sarah', action: 'started task', target: 'T-9904', time: '6h ago' },
                        { node: 'Developer DAO', action: 'completed project', target: 'CMD-001', time: '12h ago' }
                      ].map((activity, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-sm border-l-2 border-border pl-3 py-2 bg-secondary/5 hover:bg-secondary/20 transition-colors">
                          <span className="text-muted-foreground shrink-0 w-16 font-mono text-xs">{activity.time}</span>
                          <span>
                            <span className="font-bold hover:underline cursor-pointer">{activity.node}</span>{' '}
                            <span className="text-muted-foreground">{activity.action}</span>{' '}
                            <span className="font-mono bg-foreground text-background px-1 text-xs ml-1">{activity.target}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Topology Visualization */}
                <div className="border border-border bg-foreground text-background p-4 relative overflow-hidden hidden lg:flex flex-col items-center justify-center min-h-[300px]">
                  <div className="absolute top-4 left-4 z-20">
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">Live Topology</div>
                    <div className="text-[8px] font-mono opacity-50">Active Nodes: 1,204</div>
                  </div>
                  
                  <div className="absolute inset-0 z-0 flex items-center justify-center">
                    <svg className="w-full h-full stroke-current opacity-20" xmlns="http://www.w3.org/2000/svg">
                      <line x1="50%" y1="50%" x2="20%" y2="30%" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="50%" y1="50%" x2="80%" y2="20%" strokeWidth="1" />
                      <line x1="50%" y1="50%" x2="30%" y2="80%" strokeWidth="1" />
                      <line x1="50%" y1="50%" x2="70%" y2="70%" strokeWidth="1" strokeDasharray="4 4" />
                      
                      <line x1="80%" y1="20%" x2="90%" y2="40%" strokeWidth="1" />
                      <line x1="20%" y1="30%" x2="10%" y2="50%" strokeWidth="1" />
                      <line x1="30%" y1="80%" x2="50%" y2="90%" strokeWidth="1" />
                    </svg>
                  </div>

                  {/* Orbit rings */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] pt-[50%] border border-current rounded-full opacity-5 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] pt-[85%] border border-current rounded-full opacity-5 pointer-events-none" />

                  {/* Center Node (You) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                    <div className="w-3 h-3 bg-green-500 animate-pulse mb-1" />
                    <span className="text-[8px] font-mono uppercase bg-background text-foreground px-1">YOU</span>
                  </div>

                  {/* Other nodes */}
                  <div className="absolute top-[30%] left-[20%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 group cursor-pointer">
                    <div className="w-2 h-2 bg-current mb-1 group-hover:scale-150 transition-transform" />
                    <span className="text-[8px] font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity bg-background text-foreground px-1">SARAH</span>
                  </div>
                  <div className="absolute top-[20%] left-[80%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 group cursor-pointer">
                    <div className="w-2 h-2 bg-current mb-1 group-hover:scale-150 transition-transform" />
                    <span className="text-[8px] font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity bg-background text-foreground px-1">PUBLIC AI</span>
                  </div>
                  <div className="absolute top-[80%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 group cursor-pointer">
                    <div className="w-2 h-2 bg-current mb-1 group-hover:scale-150 transition-transform" />
                    <span className="text-[8px] font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity bg-background text-foreground px-1">CHEN</span>
                  </div>
                  <div className="absolute top-[70%] left-[70%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 group cursor-pointer">
                    <div className="w-2 h-2 bg-current mb-1 opacity-50 group-hover:scale-150 transition-transform" />
                    <span className="text-[8px] font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity bg-background text-foreground px-1">DEV DAO</span>
                  </div>

                  <div className="absolute top-[40%] left-[90%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                    <div className="w-1.5 h-1.5 bg-current mb-1 opacity-30" />
                  </div>
                  <div className="absolute top-[50%] left-[10%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                    <div className="w-1.5 h-1.5 bg-current mb-1 opacity-30" />
                  </div>
                  <div className="absolute top-[90%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                    <div className="w-1.5 h-1.5 bg-current mb-1 opacity-30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!activeTask && (
          <FeatureGate flagKey="dashboard.global_status">
            <GlobalStatusBoard epoch={networkEpoch} />
          </FeatureGate>
        )}

        {/* Command Projects */}
        {!activeTask && !communityFilter && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
               <Crown className="w-5 h-5 text-yellow-500" />
               <h2 className="text-lg font-bold uppercase tracking-widest">Recommended Projects</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
               {projects.map((project) => (
                 <div key={project.id} className={`border p-6 relative ${project.status === 'claimed' ? 'border-dashed border-muted-foreground/40 bg-secondary/10 opacity-70' : 'border-foreground bg-card'}`}>
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-xs font-bold bg-black text-white px-2 py-1 dark:bg-white dark:text-black">
                         {project.shortWhy}
                       </span>
                       <div className="flex items-center gap-2">
                         <span className={`font-bold text-sm ${project.motivationScore > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {project.motivationScore > 0 ? '+ MOTIVATION' : '- MOTIVATION'}
                         </span>
                       </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2 uppercase leading-tight">{project.title}</h3>
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{project.description}</p>
                    
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                         <Clock className="w-3 h-3" />
                         {project.deadline} Deadline
                       </span>
                       
                       {project.status === 'open' ? (
                         <button className="bg-foreground text-background px-4 py-1.5 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">
                           Claim Project
                         </button>
                       ) : (
                         <span className="text-xs uppercase font-bold text-muted-foreground border border-border px-2 py-1 flex items-center gap-2">
                           <img src={profile2} className="w-4 h-4 object-cover filter grayscale contrast-125" alt="Claimed by" />
                           Claimed by {project.claimedBy}
                         </span>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
        
        {communityFilter && (
          <div className="mb-6 flex items-center justify-between bg-secondary/20 p-4 border border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest">
                Filtered View: {communityFilter.replace('-', ' ')}
              </span>
            </div>
            <Link href="/dashboard">
              <a className="text-xs uppercase hover:underline flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
                Clear Filter
              </a>
            </Link>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTask ? (
            <motion.div
              key="active-task"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto"
            >
              <button 
                onClick={() => setActiveTask(null)}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                ABORT TASK
              </button>

              <div className="border border-border p-8 bg-card relative overflow-hidden">
                {/* Decorative corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black dark:border-white" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-black dark:border-white" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-black dark:border-white" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black dark:border-white" />

                <div className="flex justify-between items-start mb-8 border-b border-border pb-6">
                  <div>
                    <span className="text-xs font-bold bg-black text-white px-2 py-1 mb-2 inline-block dark:bg-white dark:text-black">
                      {activeTask.shortWhy}
                    </span>
                    <h2 className="text-2xl font-bold mt-2 leading-tight">{activeTask.title}</h2>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${activeTask.motivationScore > 0 ? 'text-green-500' : activeTask.motivationScore < 0 ? 'text-red-500' : ''}`}>
                      {activeTask.motivationScore > 0 ? '+ MOTIVATION' : '- MOTIVATION'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{activeTask.timeEstimate} EST</div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs uppercase font-bold text-muted-foreground mb-2">Instructions</h3>
                    <p className="text-lg leading-relaxed">{activeTask.description}</p>
                    {activeTask.githubLink && (
                      <a 
                        href="#" // Mock link
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-4 font-mono font-bold"
                      >
                        <Github className="w-4 h-4" />
                        View on GitHub
                      </a>
                    )}
                  </div>

                  <div className="bg-secondary p-4 border border-border">
                     <h3 className="text-xs uppercase font-bold mb-2 flex items-center gap-2">
                       {activeTask.workspaceType === 'github-import' ? (
                          <Terminal className="w-4 h-4" />
                       ) : (
                          <AlertTriangle className="w-4 h-4" />
                       )}
                       Workspace
                     </h3>
                     
                     {activeTask.workspaceType === 'github-import' ? (
                        <div className="bg-card border border-border p-4">
                          <Tabs defaultValue="mcp" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-4 bg-muted/50 p-1">
                              <TabsTrigger value="mcp" className="text-xs uppercase font-bold tracking-wider">Connect MCP</TabsTrigger>
                              <TabsTrigger value="webcli" className="text-xs uppercase font-bold tracking-wider">Web CLI</TabsTrigger>
                              <TabsTrigger value="local" className="text-xs uppercase font-bold tracking-wider">Local Clone</TabsTrigger>
                              <TabsTrigger value="upload" className="text-xs uppercase font-bold tracking-wider">Direct Upload</TabsTrigger>
                            </TabsList>

                            <TabsContent value="mcp">
                                <div className="bg-secondary/20 border border-dashed border-border p-8 text-center flex flex-col items-center justify-center space-y-6">
                                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 relative">
                                    <Plug className="w-8 h-8 text-primary" />
                                    <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-background" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-bold uppercase tracking-widest">Model Context Protocol</h4>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                                      Connect your AI assistant directly to this workspace. It will automatically gain access to the codebase, task context, and evaluation loop.
                                    </p>
                                  </div>
                                  
                                  <div className="flex flex-col gap-3 w-full max-w-xs">
                                      <button className="w-full bg-foreground text-background px-6 py-3 text-sm font-bold uppercase tracking-widest hover:opacity-90 flex items-center justify-center gap-2">
                                          Connect Claude Desktop
                                      </button>
                                      <button className="w-full border border-border bg-background hover:bg-secondary px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors">
                                          Copy MCP Server URL
                                      </button>
                                  </div>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="webcli">
                                <div className="bg-black text-white p-4 font-mono text-xs rounded-sm border border-border dark:bg-zinc-950">
                                   <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
                                      <div className="w-2 h-2 rounded-full bg-red-500" />
                                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                      <div className="w-2 h-2 rounded-full bg-green-500" />
                                      <span className="ml-2 text-zinc-500">repo-environment — bash</span>
                                   </div>
                                   <div className="space-y-1 opacity-90 h-[200px] overflow-y-auto">
                                      <div className="flex gap-2">
                                        <span className="text-green-400">➜</span>
                                        <span className="text-blue-400">~</span>
                                        <span>git clone {activeTask.githubLink}.git</span>
                                      </div>
                                      <div className="text-zinc-400">Cloning into 'core-auth'...</div>
                                      <div className="text-zinc-400">remote: Enumerating objects: 1420, done.</div>
                                      <div className="text-zinc-400">remote: Counting objects: 100% (1420/1420), done.</div>
                                      <div className="text-zinc-400">remote: Compressing objects: 100% (890/890), done.</div>
                                      <div className="text-zinc-400">Receiving objects: 100% (1420/1420), 4.21 MiB | 2.10 MiB/s, done.</div>
                                      <div className="flex gap-2 mt-2">
                                        <span className="text-green-400">➜</span>
                                        <span className="text-blue-400">core-auth</span>
                                        <span className="text-zinc-500">git:(main)</span>
                                        <span>npm install</span>
                                      </div>
                                      <div className="text-zinc-400 animate-pulse">Running post-install scripts...</div>
                                   </div>
                                </div>
                                <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground">
                                  <span>Environment Status: <span className="text-green-500 font-bold">READY</span></span>
                                  <span className="flex items-center gap-1"><Terminal className="w-3 h-3"/> Web Terminal Active</span>
                                </div>
                            </TabsContent>

                            <TabsContent value="local">
                                <div className="bg-secondary/20 border border-dashed border-border p-6 text-center space-y-4">
                                  <div className="mx-auto w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-2">
                                    <Github className="w-6 h-6" />
                                  </div>
                                  <h4 className="text-sm font-bold uppercase">Clone to Local Machine</h4>
                                  <div className="bg-background border border-border p-3 font-mono text-xs flex items-center justify-between gap-4">
                                    <code className="text-muted-foreground">git clone {activeTask.githubLink}.git</code>
                                    <button className="text-[10px] uppercase font-bold bg-primary text-primary-foreground px-2 py-1">Copy</button>
                                  </div>
                                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    Push your changes to a new branch named <span className="font-mono text-foreground">feat/{activeTask.id.toLowerCase()}</span> and create a Pull Request to complete this task.
                                  </p>
                                </div>
                            </TabsContent>

                            <TabsContent value="upload">
                                <div className="bg-secondary/20 border border-dashed border-border p-10 text-center flex flex-col items-center justify-center space-y-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                                  <Upload className="w-10 h-10 text-muted-foreground" />
                                  <div>
                                    <h4 className="text-sm font-bold uppercase">Drag & Drop Patch File</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Upload .diff or .patch files manually</p>
                                  </div>
                                  <button className="text-xs bg-secondary border border-border px-4 py-2 font-bold uppercase hover:bg-background transition-colors">Select File</button>
                                </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                     ) : (
                        <div className="h-48 flex items-center justify-center border border-dashed border-muted-foreground/40 text-muted-foreground text-sm">
                          [TASK WORKSPACE INTERFACE WOULD LOAD HERE]
                        </div>
                     )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-6">
                    <Sheet>
                      <SheetTrigger asChild>
                        <button className="flex items-center text-sm font-medium hover:underline decoration-1 underline-offset-4">
                          <GitCommit className="w-4 h-4 mr-2" />
                          WHY AM I DOING THIS?
                        </button>
                      </SheetTrigger>
                      <SheetContent className="w-[400px] sm:w-[540px] border-l-2 border-border !px-0 flex flex-col h-full font-mono">
                         <div className="px-6 pt-6 pb-4 border-b border-border">
                            <SheetHeader className="text-left">
                              <SheetTitle className="uppercase tracking-widest text-lg flex items-center gap-2">
                                <Info className="w-5 h-5" />
                                Task Context
                              </SheetTitle>
                              <SheetDescription>
                                Lineage and rationale for {activeTask.shortWhy}
                              </SheetDescription>
                            </SheetHeader>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto p-6">
                            <div className="mb-8">
                              <h4 className="text-xs uppercase font-bold text-muted-foreground mb-3 tracking-widest">Rationale</h4>
                              <p className="text-sm leading-relaxed border-l-2 border-primary pl-4 py-1">
                                {activeTask.rationale}
                              </p>
                            </div>

                            <div className="mb-8">
                              <h4 className="text-xs uppercase font-bold text-muted-foreground mb-3 tracking-widest">Evaluation Loop</h4>
                              <p className="text-sm leading-relaxed border-l-2 border-secondary-foreground pl-4 py-1 font-mono">
                                {activeTask.evaluationLoop}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-xs uppercase font-bold text-muted-foreground mb-4 tracking-widest">Lineage & History</h4>
                              <div className="relative border-l border-border ml-2 space-y-8">
                                {activeTask.history.map((item, idx) => (
                                  <div key={item.id} className="ml-6 relative">
                                    <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 bg-background border-2 border-primary rounded-full z-10" />
                                    
                                    <div className="flex flex-col gap-1 mb-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold bg-secondary px-1.5 py-0.5 border border-border">
                                          {item.shortWhy}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-2">
                                          {item.contributorId && (
                                              <span className="flex items-center gap-1">
                                                <img src={profile3} className="w-3 h-3 object-cover filter grayscale contrast-125" alt="Contributor" />
                                                {item.contributorId}
                                              </span>
                                          )}
                                          {item.date}
                                        </span>
                                      </div>
                                      <h5 className="font-bold text-sm mt-1">{item.title}</h5>
                                    </div>
                                    
                                    <div className="bg-secondary/30 p-3 border border-border text-xs space-y-2">
                                      <div className="flex gap-2 text-muted-foreground">
                                        <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                                        <span className="font-medium text-foreground">Result:</span>
                                      </div>
                                      <p className="pl-5 leading-relaxed">
                                        {item.result}
                                      </p>
                                      
                                      {item.contributorId && (
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pl-5">
                                            <User className="w-3 h-3" />
                                            Completed by {item.contributorId}
                                          </div>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              alert(`Recognition sent to ${item.contributorId}! They can choose to add it to their relationships.md.`);
                                            }}
                                            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 bg-secondary/50 px-2 py-0.5 border border-border hover:border-foreground"
                                          >
                                            <Award className="w-3 h-3" />
                                            Recognize
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                
                                <div className="ml-6 relative pb-2">
                                   <div className="absolute -left-[31px] top-0 w-2.5 h-2.5 bg-black dark:bg-white rounded-full z-10" />
                                   <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest pt-0.5">
                                     Origin
                                   </div>
                                </div>
                              </div>
                            </div>
                         </div>
                      </SheetContent>
                    </Sheet>

                    <button 
                      onClick={handleCompleteTask}
                      data-testid="button-submit-task"
                      className="bg-primary text-primary-foreground px-8 py-3 text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                    >
                      Submit Output
                    </button>
                    {activeTask.workspaceType === 'advisory' && (
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={() => {
                            alert("Outcome logged! This will be reflected on the advisor's public profile.");
                            setActiveTask(null);
                          }}
                          className="bg-secondary text-foreground border border-border px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
                        >
                          Log Advisory Outcome
                        </button>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest max-w-[200px] text-right">
                          Report if this advice led to concrete action. Boosts advisor's impact score.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="task-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold uppercase tracking-widest">Available Assignments</h2>
                <div className="text-xs text-muted-foreground">
                  {filteredTasks.length} TASKS PENDING
                </div>
              </div>

              <div className="flex flex-col gap-32 py-24">
                {filteredTasks.map((task, idx) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleStartTask(task)}
                    className={
                      taskCardLayout.enabled && taskCardLayout.variant === "variant_b"
                        ? "group border-2 border-dashed border-foreground/50 p-6 md:p-10 hover:bg-secondary/40 cursor-pointer transition-all relative min-h-[40vh] flex flex-col justify-center"
                        : "group border border-border p-8 md:p-12 hover:bg-secondary cursor-pointer transition-all hover:border-black dark:hover:border-white relative min-h-[60vh] flex flex-col justify-center"
                    }
                    data-testid={`task-card-${task.id}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                         <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                           {task.shortWhy}
                         </span>
                         {task.status === 'in-progress' && (
                           <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 border border-blue-200 uppercase">Active</span>
                         )}
                      </div>
                      <div className="flex items-center gap-4 text-xs font-medium">
                        <div className="flex -space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href="/node/sarah">
                                <a className="relative z-40 hover:z-50 block cursor-pointer">
                                  <img src={profile1} className="w-5 h-5 object-cover filter grayscale contrast-125 border border-background" alt="Sarah - Looking" />
                                </a>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs font-mono">Sarah - Looking</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href="/node/aadi">
                                <a className="relative z-30 hover:z-50 block cursor-pointer">
                                  <img src={profile2} className="w-5 h-5 object-cover filter grayscale contrast-125 border border-background" alt="Aadi - Involved" />
                                </a>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs font-mono">Aadi - Involved</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href="/node/chen">
                                <a className="relative z-20 hover:z-50 block cursor-pointer">
                                  <img src={profile3} className="w-5 h-5 object-cover filter grayscale contrast-125 border border-background" alt="Chen - Involved" />
                                </a>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs font-mono">Chen - Involved</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/node/${task.community}`}>
                                <a className="relative z-10 hover:z-50 block cursor-pointer w-5 h-5 bg-foreground text-background flex items-center justify-center text-[8px] font-bold border border-background">
                                  {task.community.substring(0,2).toUpperCase()}
                                </a>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs font-mono">{task.community.replace('-', ' ').toUpperCase()} - Organization</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {task.timeEstimate}
                        </span>
                        <span className={`px-2 py-0.5 font-bold ${task.motivationScore > 0 ? 'bg-green-500/20 text-green-600 dark:text-green-400' : task.motivationScore < 0 ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-secondary'}`}>
                          {task.motivationScore > 0 ? '+ MOTIVATION' : '- MOTIVATION'}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2 group-hover:underline decoration-1 underline-offset-4 decoration-muted-foreground/50">
                      {task.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl group-hover:text-foreground transition-colors">
                      {task.description}
                    </p>
                  </motion.div>
                ))}

                {filteredTasks.length === 0 && (
                  <div className="text-center py-20 border border-dashed border-border">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-bold uppercase">All systems nominal</h3>
                    <p className="text-muted-foreground mt-2">No pending tasks in your queue.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20 py-8 bg-secondary/10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            © 2026 Scientific Revolution Network
          </div>
          <div className="flex items-center gap-6 text-xs uppercase tracking-widest font-bold">
            <Link href="/about">
              <a className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            </Link>
            <Link href="/terms">
              <a className="text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</a>
            </Link>
            <Link href="/privacy">
              <a className="text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
