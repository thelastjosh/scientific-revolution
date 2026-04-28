import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function DossierPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/dashboard">
          <a className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </a>
        </Link>

        <div className="border border-border p-6 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Dossier
          </p>
          <h1 className="text-xl uppercase tracking-tight">Task execution moved off-platform</h1>
          <p className="text-sm text-muted-foreground">
            The dashboard now focuses on profile management, people directory, and task creation/editing.
            Task receipt and execution are handled via email or messaging apps.
          </p>
        </div>
      </div>
    </div>
  );
}
