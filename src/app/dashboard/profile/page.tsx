import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { selectWorkspace } from "@/lib/workspace-select";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const canChangePassword = user.passwordHash !== "telegram-auth";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Профиль</h1>
        <p className="mt-1 text-sm text-slate-500">
          Личные данные и настройки аккаунта.
        </p>
      </div>

      <div className="card p-6">
        <ProfileForm
          initialName={user.name ?? ""}
          initialEmail={user.email}
          canChangePassword={canChangePassword}
        />
      </div>
    </div>
  );
}
