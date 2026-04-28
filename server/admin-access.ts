import type { User } from "@shared/schema";

const ADMIN_EMAIL_ALLOWLIST = new Set<string>(["joshua.z.tan@gmail.com"]);

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isAdminUser(user: Pick<User, "role" | "email">): boolean {
  return user.role === "admin" || ADMIN_EMAIL_ALLOWLIST.has(normalizeEmail(user.email));
}
