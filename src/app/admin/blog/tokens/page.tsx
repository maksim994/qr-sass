import { requireAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { tokenPublicSelect } from "@/lib/blog-api-tokens";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { Button } from "@/components/ui";
import { BlogTokenControl } from "@/components/admin/blog-token-control";
export default async function BlogTokensPage() {
  await requireAdmin();
  const tokens = await getDb().blogApiToken.findMany({ select: tokenPublicSelect, orderBy: { createdAt: "desc" } });
  return <div>
    <AdminPageHeader title="API-ключи статей" description="Чтение и редактирование статей без браузера. Публикация, расписание и удаление доступны в админке." action={<Button href="/admin/blog" variant="secondary" size="sm">К статьям</Button>} />
    <BlogTokenControl initialTokens={tokens.map(token => ({ ...token, createdAt: token.createdAt.toISOString(), lastUsedAt: token.lastUsedAt?.toISOString() ?? null, revokedAt: token.revokedAt?.toISOString() ?? null }))} />
  </div>;
}
