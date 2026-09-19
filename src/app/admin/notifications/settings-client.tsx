"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input } from "@/components/ui";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";
import styles from "@/components/admin/admin.module.css";
const labels: Record<string, string> = {
  registration_completed: "Новый пользователь",
  trial_started: "Начало триала",
  payment_succeeded: "Первая и повторная оплата",
  admin_role: "Изменение прав администратора",
};
export type NotificationSettings = {
  enabled: boolean;
  chatId: string;
  events: string[];
  dailyDigest: boolean;
  digestHour: number;
  hasToken: boolean;
};
export function SettingsClient({
  initial,
  keyReady,
}: {
  initial: NotificationSettings;
  keyReady: boolean;
}) {
  const router = useRouter(),
    pending = useRef(false);
  const [state, setState] = useState(initial),
    [savedChatId, setSavedChatId] = useState(initial.chatId),
    [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const connectionDirty = state.chatId !== savedChatId || token.length > 0;
  async function submit(action: "save" | "test") {
    if (pending.current || (action === "test" && connectionDirty)) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetchApi("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "save" ? { action, ...state, token } : { action },
        ),
      });
      const result = await parseApiResponse(response);
      if (!result.ok) {
        setError(result.error ?? MSG.ADMIN_CHANGE_FAILED);
        return;
      }
      if (action === "save") {
        setState({ ...state, hasToken: state.hasToken || !!token });
        setSavedChatId(state.chatId);
        setToken("");
      }
      setNotice(
        action === "save"
          ? "Настройки сохранены. Новые события будут использовать эти настройки."
          : "Тестовое сообщение поставлено в очередь. Проверьте журнал доставки.",
      );
      router.refresh();
    } catch {
      setError(MSG.AUTH_NETWORK_ERROR);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void submit("save");
      }}
    >
      {!keyReady && (
        <Alert variant="warning">
          На сервере нужно задать ADMIN_INTEGRATIONS_KEY. До этого токен
          сохранить нельзя.
        </Alert>
      )}
      <p className={styles.note}>
        Создайте отдельного бота в BotFather. Напишите ему /start или добавьте в
        закрытую группу с правом отправки сообщений. Укажите числовой ID чата.
        Бот авторизации Mini App менять не нужно.
      </p>
      <Field
        label="Токен бота"
        hint={
          state.hasToken
            ? "Токен сохранён. Оставьте поле пустым, чтобы сохранить его."
            : "Токен хранится зашифрованным и не возвращается в браузер."
        }
      >
        <Input
          type="password"
          autoComplete="new-password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          disabled={busy || !keyReady}
        />
      </Field>
      <Field
        label="ID чата"
        hint="Например, числовой ID личного чата или отрицательный ID группы."
      >
        <Input
          value={state.chatId}
          onChange={(e) => setState({ ...state, chatId: e.target.value })}
          pattern="-?[0-9]+"
          required
          disabled={busy}
        />
      </Field>
      <label className={styles.actions}>
        <input
          type="checkbox"
          checked={state.enabled}
          disabled={busy}
          onChange={(e) => setState({ ...state, enabled: e.target.checked })}
        />
        Отправлять уведомления о новых событиях
      </label>
      <fieldset className={styles.form}>
        <legend className={styles.title}>Мгновенные уведомления</legend>
        {Object.entries(labels).map(([name, label]) => (
          <label key={name} className={styles.actions}>
            <input
              type="checkbox"
              disabled={busy}
              checked={state.events.includes(name)}
              onChange={(e) =>
                setState({
                  ...state,
                  events: e.target.checked
                    ? [...state.events, name]
                    : state.events.filter((v) => v !== name),
                })
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label className={styles.actions}>
        <input
          type="checkbox"
          disabled={busy}
          checked={state.dailyDigest}
          onChange={(e) =>
            setState({ ...state, dailyDigest: e.target.checked })
          }
        />
        Ежедневная сводка за вчера
      </label>
      <Field label="Час сводки · Москва">
        <Input
          type="number"
          min={0}
          max={23}
          required
          value={state.digestHour}
          disabled={busy}
          onChange={(e) =>
            setState({ ...state, digestHour: Number(e.target.value) })
          }
        />
      </Field>
      <p className={styles.note}>
        Тестовые события исключены. Сообщения содержат ссылки на админку: для
        открытия с телефона нужен доступный адрес сайта. При сохранении настроек
        ранее ожидающие сообщения будут отменены.
      </p>
      {error && <Alert variant="danger">{error}</Alert>}
      {notice && <p role="status">{notice}</p>}
      {connectionDirty && (
        <p role="status" className={styles.note}>
          Сначала сохраните изменения подключения, затем отправьте тест.
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {busy ? "Выполняем…" : "Сохранить настройки"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !state.hasToken || connectionDirty || !keyReady}
          onClick={() => submit("test")}
        >
          Отправить тест
        </Button>
      </div>
    </form>
  );
}
export function RetryNotification({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetchApi("/api/admin/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "retry", id }),
            });
            const parsed = await parseApiResponse(response);
            if (!parsed.ok) setError(parsed.error ?? MSG.ADMIN_CHANGE_FAILED);
            else router.refresh();
          } catch {
            setError(MSG.AUTH_NETWORK_ERROR);
          } finally {
            setBusy(false);
          }
        }}
      >
        Повторить
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
