import { requireAdmin } from "@/lib/admin-auth";
import { listEditorialRedirects } from "@/lib/editorial-redirects";
import { AdminPageHeader } from "@/components/admin/admin-page";
import { Button } from "@/components/ui";
import { BlogRedirectControl } from "@/components/admin/blog-redirect-control";
export default async function RedirectsPage() {
  await requireAdmin();
  const rows = await listEditorialRedirects();
  return (
    <div>
      <AdminPageHeader
        title="Редиректы"
        description="Перенаправление старого адреса на конечную страницу. Новые правила возвращают 301 и сохраняются в журнале."
        action={
          <Button href="/admin/blog" variant="secondary" size="sm">
            К статьям
          </Button>
        }
      />
      <BlogRedirectControl
        initialRules={rows.map((row) => ({
          ...row,
          createdAt: row.createdAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
