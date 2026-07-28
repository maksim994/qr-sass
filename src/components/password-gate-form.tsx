"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { UtilityPage } from "@/components/utility/utility-page";

type Props = {
  code: string;
  redirectTo: string;
  error?: string;
};

export function PasswordGateForm({ code, redirectTo, error }: Props) {
  const [loading, setLoading] = useState(false);
  const errMsg = error === "invalid_password" ? "Неверный пароль. Попробуйте ещё раз." : "";

  return (
    <UtilityPage
      variant="lock"
      title="Введите пароль"
      description="Эта страница защищена. Введите пароль, чтобы продолжить."
      showLogo
    >
      {errMsg ? (
        <Alert variant="danger" title="Ошибка">
          {errMsg}
        </Alert>
      ) : null}

      <form
        method="post"
        action="/api/qr/verify-password"
        onSubmit={() => setLoading(true)}
        className="qrs-utility-form"
      >
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <Field label="Пароль" htmlFor="qr-password" required>
          <Input
            id="qr-password"
            type="password"
            name="password"
            placeholder="Введите пароль"
            required
            autoComplete="current-password"
          />
        </Field>
        <Button type="submit" variant="primary" block disabled={loading}>
          {loading ? "Проверка…" : "Войти"}
        </Button>
      </form>
    </UtilityPage>
  );
}
