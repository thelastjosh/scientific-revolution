import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTEXT_ORGANIZATIONS,
  type ContextOrganizationId,
  orgById,
  saveContextOrgIds,
  useContextOrgIds,
} from "./context-organizations";

type ContextOrganizationsPanelProps = {
  className?: string;
};

export function ContextOrganizationsPanel({ className }: ContextOrganizationsPanelProps) {
  const activeIds = useContextOrgIds();
  const [addOpen, setAddOpen] = useState(false);

  const persist = (next: ContextOrganizationId[]) => {
    saveContextOrgIds(next);
  };

  const removeOrg = (id: ContextOrganizationId) => {
    persist(activeIds.filter((x) => x !== id));
  };

  const addOrg = (id: ContextOrganizationId) => {
    if (activeIds.includes(id)) return;
    persist([...activeIds, id]);
    setAddOpen(false);
  };

  const availableToAdd = CONTEXT_ORGANIZATIONS.filter((o) => !activeIds.includes(o.id));

  return (
    <div className={cn("shrink-0 w-full min-w-0 space-y-2", className)}>
      {activeIds.length === 0 ? (
        <p className="text-[9px] text-muted-foreground leading-snug normal-case">
          No organizations selected.
        </p>
      ) : (
        <ul className="flex flex-col gap-3 min-w-0">
          {activeIds.map((id) => {
            const org = orgById(id);
            return (
              <li key={id} className="group relative flex items-center min-w-0">
                <img
                  src={org.logoSrc}
                  alt={org.name}
                  className={cn(org.logoClassName, "shrink-0 block")}
                />
                <button
                  type="button"
                  onClick={() => removeOrg(id)}
                  className="absolute -right-0.5 -top-1 p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground focus:opacity-100 focus:outline-none transition-opacity"
                  aria-label={`Remove ${org.name} from context`}
                >
                  <X className="w-3 h-3" strokeWidth={1.5} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {availableToAdd.length > 0 ? (
        <div className="relative pt-1">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[8px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3 h-3" strokeWidth={1.5} />
            Add organization
          </button>
          {addOpen ? (
            <ul className="absolute left-0 top-full z-10 mt-1 w-full min-w-[140px] border border-border bg-background shadow-sm">
              {availableToAdd.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => addOrg(org.id)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-secondary/50 transition-colors"
                  >
                    <img
                      src={org.logoSrc}
                      alt={org.name}
                      className={cn(org.logoClassName, "shrink-0 block")}
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
