import type { User } from "@shared/schema";

export type PublicUser = Omit<User, "passwordHash">;

async function jsonMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message: unknown }).message;
      if (typeof m === "string") return m;
      if (m && typeof m === "object") return "Invalid input";
    }
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await jsonMessage(res));
  const data = (await res.json()) as { user: PublicUser };
  return data.user;
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: PublicUser }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await jsonMessage(res));
  return (await res.json()) as { user: PublicUser };
}

export async function register(payload: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<{ user: PublicUser }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await jsonMessage(res));
  return (await res.json()) as { user: PublicUser };
}

export async function logout(): Promise<void> {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await jsonMessage(res));
}
