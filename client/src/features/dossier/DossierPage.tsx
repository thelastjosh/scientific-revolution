import { Link } from "wouter";
import { MOCK_USER, MOCK_TASKS, type Task } from "@/lib/mock-data";
import { ArrowLeft, Shield, Award, Hash, FileCheck, Share2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Dossier() {
  // Combine completed tasks from history (mock)
  // For the mockup, we'll simulate a history of completed tasks derived from the mock data
  const artifacts = [
    { id: 'T-8820', title: 'Collect raw data from Sector 7 sensors', date: '2023-10-24', hash: '0x7f...a92b', units: 15 },
    { id: 'T-8819', title: 'Install sensors in Sector 7', date: '2023-10-22', hash: '0x3c...11fd', units: 25 },
    { id: 'T-9900', title: 'Digitize analog tape #44', date: '2023-10-25', hash: '0x8b...99ee', units: 40 },
    { id: 'T-1101', title: 'Draft Proposal B', date: '2023-10-26', hash: '0x2d...55aa', units: 50 },
    { id: 'T-1100', title: 'Community Survey Analysis', date: '2023-10-24', hash: '0x1a...cc44', units: 10 },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-8">
          <Link href="/dashboard">
            <a className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              RETURN TO DASHBOARD
            </a>
          </Link>
        </div>

        {/* Dossier Header */}
        <div className="border-b-4 border-foreground pb-8 mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Personnel Dossier</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase">{MOCK_USER.id}</h1>
              <div className="flex items-center gap-4 mt-4">
                <div className="bg-secondary px-3 py-1 border border-border text-xs uppercase font-bold">
                  Level 4 Clearance
                </div>
                <div className="text-xs text-muted-foreground">
                  Joined: 2023-08-12
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-right">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">Reputation</div>
                <div className="text-2xl font-bold">{MOCK_USER.reputation}%</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest mb-1">Motivation</div>
                <div className="text-2xl font-bold text-green-500">{MOCK_USER.motivation}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Artifacts Registry */}
        <div className="space-y-12">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Verified Artifacts
            </h2>
            
            <div className="grid gap-4">
              {artifacts.map((artifact, idx) => (
                <motion.div 
                  key={artifact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-border p-4 bg-card hover:bg-secondary/50 transition-colors group relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="bg-foreground text-background w-10 h-10 flex items-center justify-center shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-muted-foreground">{artifact.id}</span>
                          <span className="text-[10px] border border-border px-1 text-muted-foreground">{artifact.date}</span>
                        </div>
                        <h3 className="font-bold text-lg leading-tight">{artifact.title}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                      <div className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Hash className="w-3 h-3" />
                          Cryptographic Signature
                        </div>
                        <div className="tracking-widest opacity-60 group-hover:opacity-100">{artifact.hash}</div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-bold ${artifact.units > 0 ? 'text-green-500' : artifact.units < 0 ? 'text-red-500' : ''}`}>
                           {artifact.units > 0 ? '+ MOTIVATION' : '- MOTIVATION'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Hover Effect */}
                  <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-secondary to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="mt-12 p-8 border border-dashed border-border bg-secondary/10 text-center">
            <h3 className="text-lg font-bold uppercase mb-2">Proof of Work</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              This dossier serves as immutable proof of your contributions to the Scientific Revolution. 
              Use your unique signature key to verify these artifacts externally.
            </p>
            <button className="bg-foreground text-background px-6 py-2 text-sm font-bold uppercase tracking-widest hover:opacity-90 inline-flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Export Public Record
            </button>
        </div>
      </div>
    </div>
  );
}
