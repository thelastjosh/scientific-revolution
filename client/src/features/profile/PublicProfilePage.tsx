import { Link, useRoute } from "wouter";
import { ArrowLeft, FileText, ChevronRight, Award } from "lucide-react";
import profile1 from "@/assets/images/profile-1.png";
import profile2 from "@/assets/images/profile-2.png";
import profile3 from "@/assets/images/profile-3.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function PublicProfile() {
  const [, params] = useRoute("/node/:id");
  const id = params?.id || "unknown";
  const name = id.replace(/-/g, " ");
  
  // Decide which avatar to show based on ID
  let avatar = "";
  if (id === 'sarah') avatar = profile1;
  else if (id === 'aadi') avatar = profile2;
  else if (id === 'chen') avatar = profile3;

  return (
    <div className="min-h-screen bg-background text-foreground font-mono p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/dashboard">
            <span className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              BACK TO DASHBOARD
            </span>
          </Link>
          <div className="text-xs font-bold uppercase tracking-widest border border-border px-2 py-1">
            Public Node Data
          </div>
        </header>

        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12 border-b border-border pb-8">
          <div className="w-24 h-24 border-2 border-foreground overflow-hidden bg-secondary flex items-center justify-center text-3xl font-bold uppercase shrink-0">
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover filter grayscale contrast-125" />
            ) : (
              name.substring(0, 2)
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tighter">{name}</h1>
                <div className="text-xs text-muted-foreground mt-3 flex items-center gap-4">
                   <span className="bg-secondary px-2 py-1 border border-border">NODE ID: {id.toUpperCase()}</span>
                   <span className="text-green-600 dark:text-green-400 font-bold">● ACTIVE</span>
                   <span className="border border-border px-2 py-1">{avatar ? 'INDIVIDUAL' : 'ORGANIZATION'}</span>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <button 
                  onClick={() => alert(`Recognition sent to ${name}! They can choose to add it to their relationships.md.`)}
                  className="flex items-center gap-2 border border-border px-4 py-3 bg-secondary/20 hover:bg-foreground hover:text-background transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  <Award className="w-4 h-4" />
                  Recognize
                </button>

                <div className="border border-border p-3 bg-secondary/5 text-right shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Advisory Impact</div>
                  <div className="text-2xl font-mono font-bold">12</div>
                  <div className="text-[8px] uppercase tracking-widest text-muted-foreground mt-1">Actions taken on advice</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <h2 className="text-lg font-bold uppercase tracking-widest mb-2">Public Manifests</h2>
          
          <SummaryCard 
            title="profile.md" 
            summary={`Core identity and capabilities for ${name}. Includes role definitions, clearance levels, and recent activity logs.`}
            content={`# Profile: ${name.toUpperCase()}

## Identity
- **Node Type**: ${avatar ? 'Individual Contributor' : 'Organization / Collective'}
- **Status**: Active
- **Clearance**: Public / Level 1

## Capabilities
- Ecosystem Development
- Resource Allocation
- Domain Expertise
- Peer Verification

## Recent Activity
- Initiated 4 new bounties in the past epoch
- Validated 12 task completions
- Updated operational guidelines
`}
          />
          <SummaryCard 
            title="relationship.md" 
            summary={`Network graph mapping connections to peers, affiliated organizations, and mentorship trees.`}
            content={`# Relationship

## Affiliations
- Core Network Node
- Cross-chain Data Guild

## Known Peers
- Sarah
- Aadi
- Chen

## Sub-orgs
- Strategy Working Group
- Operations Guild

## Recognitions (Opt-In)
- **Fast Responder Badge** from Sarah
- **"Saved my deployment"** note from Aadi
- **Architecture Pioneer** badge from Developer DAO
`}
          />
          <SummaryCard 
            title="skill.md" 
            summary={`Agent operating instructions, technical directives, and operational windows for ${name}.`}
            content={`# Agent Operating Instructions

## Communication Protocols
- **Style**: Direct, concise, zero pleasantries.
- **Escalation**: Immediate upon blocking issues.
- **Mode**: Async-first, sync only for critical architecture decisions.

## Technical Directives
- **Quality**: Strict adherence to formatting guidelines.
- **Output**: Provide data without extensive explanation unless requested.

## Operational Window
- **Availability**: 24/7 via automated agent protocols.
`}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, summary, content }: { title: string, summary: string, content: string }) {
  return (
    <div className="border border-border bg-card hover:border-foreground transition-colors p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
      <div>
        <h3 className="font-bold uppercase tracking-widest flex items-center gap-2 mb-2 text-lg">
          <FileText className="w-5 h-5" />
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <button className="whitespace-nowrap flex items-center gap-2 border border-border px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors">
            View Full <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col font-mono border-2 border-black dark:border-white rounded-none bg-background p-0">
          <DialogHeader className="p-6 border-b border-border bg-secondary/30">
            <DialogTitle className="uppercase tracking-widest">{title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-6 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
