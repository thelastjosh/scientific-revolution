import { orgById, useContextOrgIds } from "./context-organizations";

/** Collapsed context rail: org monograms in brand colors. */
export function ContextCollapsedOrgs() {
  const activeIds = useContextOrgIds();

  if (activeIds.length === 0) return null;

  return (
    <ul className="flex flex-col items-center gap-2 shrink-0 py-1" aria-label="Organizations in context">
      {activeIds.map((id) => {
        const org = orgById(id);
        return (
          <li key={id}>
            <span
              className="text-sm font-bold leading-none select-none"
              style={{ color: org.brandColor }}
              title={org.name}
              aria-label={org.name}
            >
              {org.monogram}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
