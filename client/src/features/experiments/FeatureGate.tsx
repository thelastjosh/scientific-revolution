import type { ReactNode } from "react";
import { useUiExperiment } from "./useUiExperiment";

/** Renders `children` only when the experiment flag is enabled (admin can turn the block off). */
export function FeatureGate({
  flagKey,
  children,
}: {
  flagKey: string;
  children: ReactNode;
}) {
  const { enabled } = useUiExperiment(flagKey);
  if (!enabled) return null;
  return <>{children}</>;
}
