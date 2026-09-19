import { headers } from "next/headers";
import { MSG } from "@/lib/user-messages";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-response";
import { verifyApiKey } from "@/lib/api-keys";
import { getEntitlements } from "@/lib/entitlements";

export type ApiActor = {
  kind: "session" | "apiKey";
  id: string;
  email: string;
  name: string | null;
  memberships: Array<{ workspaceId: string; role: string }>;
  apiKeyId?: string;
};

export async function getApiUser(): Promise<ApiActor | null> {
  const headersList = await headers();
  const auth = headersList.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (!token.startsWith("qre_")) return null;
    const prefix = token.slice(0, 12);
    const db = getDb();
    const keys = await db.apiKey.findMany({ where: { keyPrefix: prefix } });
    for (const k of keys) {
      if (verifyApiKey(token, k.keyPrefix, k.keyHash)) {
        const owner = await db.membership.findFirst({
          where: { workspaceId: k.workspaceId, role: "OWNER" },
          select: { userId: true },
        });
        if (!owner) return null;
        const entitlements = await getEntitlements(k.workspaceId);
        if (!entitlements.allowsApi) return null;
        return {
          kind: "apiKey",
          id: owner.userId,
          email: "",
          name: null,
          memberships: [{ workspaceId: k.workspaceId, role: "MEMBER" }],
          apiKeyId: k.id,
        };
      }
    }
    return null;
  }

  const session = await getSession();
  if (!session?.sub) return null;
  const user = await getDb().user.findUnique({
    where: { id: session.sub },
    include: { memberships: true },
  });
  if (!user) return null;
  return {
    kind: "session",
    id: user.id,
    email: user.email,
    name: user.name,
    memberships: user.memberships.map((m) => ({ workspaceId: m.workspaceId, role: m.role })),
  };
}

export function unauthorized() {
  return apiError(MSG.UNAUTHORIZED, "UNAUTHORIZED", 401);
}
