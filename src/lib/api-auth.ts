import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-response";
import { verifyApiKey } from "@/lib/api-keys";

export async function getApiUser() {
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
        const owner = await getDb().membership.findFirst({
          where: { workspaceId: k.workspaceId, role: "OWNER" },
          select: { userId: true },
        });
        if (!owner) return null;
        return {
          id: owner.userId,
          email: "",
          name: null,
          memberships: [{ workspaceId: k.workspaceId, role: "MEMBER" }],
        };
      }
    }
    return null;
  }

  const session = await getSession();
  if (!session?.sub) return null;
  return getDb().user.findUnique({
    where: { id: session.sub },
    include: { memberships: true },
  });
}

export function unauthorized() {
  return apiError("Unauthorized.", "UNAUTHORIZED", 401);
}
