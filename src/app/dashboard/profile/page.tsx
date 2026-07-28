import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { isYandexAuthConfigured } from "@/lib/yandex-auth";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Alert } from "@/components/ui";
import { ProfileForm } from "./profile-form";

function roleLabel(isAdmin: boolean, membershipRole: string): string {
  if (isAdmin) return "Администратор";
  if (membershipRole === "OWNER") return "Владелец";
  if (membershipRole === "ADMIN") return "Администратор";
  return "Участник";
}

export default async function ProfilePage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const membership = user.memberships.find((m) => m.workspaceId === workspace.id);
  const canChangePassword = user.passwordHash !== "telegram-auth";

  return (
    <div className="qrs-profile-page">
      <DashboardPageHeader title="Профиль" description="Личные данные и настройки аккаунта." />

      <Suspense
        fallback={
          <Alert variant="info" className="qrs-profile-card">
            Загрузка профиля…
          </Alert>
        }
      >
        <ProfileForm
          initialName={user.name ?? ""}
          initialEmail={user.email}
          initialAvatarUrl={user.avatarUrl}
          yandexLinked={!!user.yandexId}
          yandexAuthEnabled={isYandexAuthConfigured()}
          canChangePassword={canChangePassword}
          subtitle={`${roleLabel(!!user.isAdmin, membership?.role ?? "MEMBER")} · ${workspace.name}`}
        />
      </Suspense>
    </div>
  );
}
