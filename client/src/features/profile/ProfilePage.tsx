import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, Save, Shield, Key, FileCode, Paperclip, Download, Network, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import profile1 from "@/assets/images/profile-1.png";
import profile2 from "@/assets/images/profile-2.png";
import profile3 from "@/assets/images/profile-3.png";

export default function Profile() {
  const [markdown, setMarkdown] = useState<string>(`# Profile: SR-NODE-881

## Identity
- **Role**: Distributed Systems Engineer
- **Status**: Active
- **Clearance**: Level 3

## Capabilities
- Rust/Systems Programming
- Distributed Consensus Algorithms
- Cryptography
- Network Protocol Design

## Recent Activity
- Optimized gossip protocol efficiency by 15%
- Audited smart contract logic for core-auth module
- Proposed new shard distribution mechanism
`);

  const [relationshipMarkdown, setRelationshipMarkdown] = useState<string>(`# Relationship

## Peers
- [[SR-NODE-102]] - Co-authored consensus paper
- [[U-99281]] - Pair programming partner

## Organizations
- [[Public AI]] - Core contributor
- [[Developer DAO]] - Member

## Mentorship
- Mentoring [[U-33210]] in Rust systems programming

## Recognitions (Opt-In)
- **Fast Responder Badge** from Sarah
- **"Saved my deployment"** note from Aadi
- **Architecture Pioneer** badge from Developer DAO
`);

  const [skillMarkdown, setSkillMarkdown] = useState<string>(`# Agent Operating Instructions

## Communication Protocols
- **Style**: Direct, concise, zero pleasantries.
- **Escalation**: Immediate upon blocking issues.
- **Mode**: Async-first, sync only for critical architecture decisions.

## Technical Directives
- **Languages**: Rust, TypeScript, Go.
- **Quality**: Strict typing, memory safety checks required.
- **Output**: Provide code snippets without extensive explanation unless requested.

## Operational Window
- **Sync Availability**: 14:00 - 18:00 UTC.
- **Deep Work**: Do not interrupt outside sync window unless system critical.
`);

  const [showGraph, setShowGraph] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [profileImage, setProfileImage] = useState<string>(profile1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const mockUploads = [
    { id: 'u1', name: 'consensus_paper_draft.pdf', size: '2.4 MB', type: 'PDF', date: '2026-02-18' },
    { id: 'u2', name: 'rust_impl_notes.md', size: '14 KB', type: 'Markdown', date: '2026-02-19' },
    { id: 'u3', name: 'public_key.asc', size: '4 KB', type: 'PGP Key', date: '2026-02-19' }
  ];

  const handleSave = () => {
    setSaveState("saving");
    setTimeout(() => {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2200);
    }, 700);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const buttonBaseClass =
    "inline-flex items-center gap-2 border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground active:translate-y-[1px]";
  const saveButtonClass =
    saveState === "saved"
      ? `${buttonBaseClass} border-foreground bg-foreground text-background`
      : `${buttonBaseClass} border-border hover:bg-secondary/50 active:bg-secondary`;

  return (
    <div className="min-h-screen bg-background text-foreground font-mono p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/dashboard">
            <a className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              BACK TO DASHBOARD
            </a>
          </Link>
          <div className="text-xs font-bold uppercase tracking-widest border border-border px-2 py-1">
            Secure Environment
          </div>
        </header>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 border-2 border-foreground overflow-hidden">
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover filter grayscale contrast-125" />
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-2 border-foreground border-dashed"
              >
                <Camera className="w-5 h-5 mb-1" />
                <span className="text-[8px] font-bold uppercase tracking-widest">Upload</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden" 
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter">Profile</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saveState === "saving"}
            className={saveButtonClass}
          >
            <Save className="w-4 h-4" />
            {saveState === "saving"
              ? "Saving..."
              : saveState === "saved"
                ? "Profile Saved"
                : "Save Profile"}
          </button>
        </div>

        <div className="border border-border bg-card relative mb-12">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30 text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground">profile.md</span>
            <span className="font-mono text-[10px] text-muted-foreground">MARKDOWN ENABLED</span>
          </div>
          
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="w-full h-[500px] bg-transparent p-6 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="border border-border bg-card relative mb-12">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30 text-xs">
            <div className="flex items-center gap-4">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">relationship.md</span>
              <button 
                onClick={() => setShowGraph(!showGraph)}
                className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest bg-secondary/50 px-2 py-1 hover:bg-foreground hover:text-background transition-colors"
              >
                <Network className="w-3 h-3" />
                {showGraph ? 'Edit Text' : 'View Graph'}
              </button>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">MARKDOWN ENABLED</span>
          </div>
          
          {showGraph ? (
            <div className="w-full h-[300px] bg-secondary/10 p-6 flex items-center justify-center relative overflow-hidden">
               {/* Extremely simple mock graph visualization */}
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px]" />
               
               <div className="relative w-full max-w-sm h-full flex items-center justify-center">
                 {/* Center Node */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-foreground text-background flex items-center justify-center rounded-full text-xs font-bold z-10 overflow-hidden">
                   <img src={profile1} className="w-full h-full object-cover filter grayscale contrast-125" alt="YOU" />
                 </div>
                 
                 {/* Connections */}
                 <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="opacity-30" />
                    <line x1="50%" y1="50%" x2="80%" y2="30%" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="opacity-30" />
                    <line x1="50%" y1="50%" x2="70%" y2="80%" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="opacity-30" />
                    <line x1="50%" y1="50%" x2="30%" y2="70%" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="opacity-30" />
                 </svg>

                 {/* External Nodes */}
                 <Link href="/node/sarah">
                   <a className="absolute top-[10%] left-[10%] w-12 h-12 bg-secondary flex flex-col items-center justify-center rounded-full text-[8px] font-bold border border-border text-center overflow-hidden hover:border-foreground transition-colors cursor-pointer group">
                     <img src={profile2} className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 opacity-30 mix-blend-multiply group-hover:opacity-50 transition-opacity" alt="Node" />
                     <span className="relative z-10 p-1 leading-tight">Sarah</span>
                   </a>
                 </Link>
                 <Link href="/node/public-ai">
                   <a className="absolute top-[20%] right-[10%] w-14 h-14 bg-secondary flex items-center justify-center rounded-full text-[8px] font-bold border border-border text-center p-1 leading-tight hover:border-foreground transition-colors cursor-pointer group">Public AI</a>
                 </Link>
                 <Link href="/node/aadi">
                   <a className="absolute bottom-[10%] right-[20%] w-12 h-12 bg-secondary flex flex-col items-center justify-center rounded-full text-[8px] font-bold border border-border text-center overflow-hidden hover:border-foreground transition-colors cursor-pointer group">
                     <img src={profile3} className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 opacity-30 mix-blend-multiply group-hover:opacity-50 transition-opacity" alt="Node" />
                     <span className="relative z-10 p-1 leading-tight">Aadi</span>
                   </a>
                 </Link>
                 <Link href="/node/developer-dao">
                   <a className="absolute bottom-[20%] left-[20%] w-14 h-14 bg-secondary flex items-center justify-center rounded-full text-[8px] font-bold border border-border text-center p-1 leading-tight hover:border-foreground transition-colors cursor-pointer group">Developer DAO</a>
                 </Link>
               </div>
            </div>
          ) : (
            <textarea
              value={relationshipMarkdown}
              onChange={(e) => setRelationshipMarkdown(e.target.value)}
              className="w-full h-[300px] bg-transparent p-6 font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
            />
          )}
        </div>

        <div className="border border-border bg-card relative mb-12">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30 text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground">skill.md</span>
            <span className="font-mono text-[10px] text-muted-foreground">MARKDOWN ENABLED</span>
          </div>
          
          <textarea
            value={skillMarkdown}
            onChange={(e) => setSkillMarkdown(e.target.value)}
            className="w-full h-[300px] bg-transparent p-6 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="border-t border-dashed border-border pt-8 mb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wide flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Credentials
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-lg">
                Manage access keys, API tokens, and cryptographic identities associated with this node.
              </p>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 border border-border px-4 py-3 hover:bg-secondary hover:border-black dark:hover:border-white transition-all text-xs font-bold uppercase tracking-widest group">
                  <Key className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  Add Credentials
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md font-mono border-2 border-black dark:border-white">
                <DialogHeader>
                  <DialogTitle className="uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Inject Secret
                  </DialogTitle>
                  <DialogDescription>
                    Securely store a new credential in the local vault.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest">Credential Type</label>
                    <select className="w-full bg-background border border-border p-2 text-sm font-mono focus:outline-none focus:border-foreground">
                      <option>API Key</option>
                      <option>SSH Private Key</option>
                      <option>PGP Key</option>
                      <option>OAuth Token</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest">Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. GITHUB_TOKEN"
                      className="w-full bg-background border border-border p-2 text-sm font-mono focus:outline-none focus:border-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest">Secret Value</label>
                    <textarea 
                      placeholder="Paste secret here..."
                      className="w-full bg-background border border-border p-2 text-sm font-mono focus:outline-none focus:border-foreground min-h-[100px] resize-none"
                    />
                  </div>

                  <button className="w-full bg-foreground text-background py-3 text-xs font-bold uppercase tracking-widest hover:opacity-90 mt-2">
                    Encrypt & Store
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Raw Files Section */}
        <div className="border-t border-dashed border-border pt-8 pb-8">
           <div className="flex flex-col gap-6">
              <div>
                 <h2 className="text-lg font-bold uppercase tracking-wide flex items-center gap-2">
                   <Paperclip className="w-5 h-5" />
                   Raw Files
                 </h2>
                 <p className="text-xs text-muted-foreground mt-1">
                   Uploaded documents, proofs, and raw data objects linked to this profile.
                 </p>
              </div>

              <div className="grid gap-2">
                 {mockUploads.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border border-border bg-card hover:bg-secondary/20 transition-colors">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-secondary flex items-center justify-center border border-border">
                             <FileCode className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                             <div className="font-bold text-sm font-mono">{file.name}</div>
                             <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex gap-2">
                                <span>{file.type}</span>
                                <span className="text-border">|</span>
                                <span>{file.size}</span>
                                <span className="text-border">|</span>
                                <span>{file.date}</span>
                             </div>
                          </div>
                       </div>
                       <button className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Download">
                          <Download className="w-4 h-4" />
                       </button>
                    </div>
                 ))}
                 
                 <div className="border border-dashed border-border p-4 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/10 cursor-pointer transition-colors uppercase tracking-widest font-bold">
                    + Upload New File
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
