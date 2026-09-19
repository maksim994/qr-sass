"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Select, Modal } from "@/components/ui";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { MSG } from "@/lib/user-messages";
import { adminDate, adminPlanLabels } from "@/lib/admin-list";
import styles from "./admin.module.css";
type Props = {
  workspaceId: string;
  name: string;
  plan: string;
  hasArchive?: boolean;
  periodEnd: string | null;
};
export function AccessForm(props: Props) {
  const router = useRouter();
  const pending = useRef(false);
  const [open, setOpen] = useState(false),
    [plan, setPlan] = useState(props.plan),
    [date, setDate] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetchApi(
        `/api/admin/workspaces/${props.workspaceId}/plan`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            reason,
            ...(plan !== "FREE" && plan !== "FRIENDS" && date
              ? {
                  currentPeriodEnd: new Date(
                    `${date}T23:59:59.999+03:00`,
                  ).toISOString(),
                }
              : {}),
          }),
        },
      );
      const parsed = await parseApiResponse(response);
      if (!parsed.ok) {
        setError(parsed.error ?? MSG.ADMIN_CHANGE_FAILED);
        return;
      }
      setOpen(false);
      setNotice("Доступ обновлён. Изменение записано в журнал.");
      router.refresh();
    } catch {
      setError(MSG.ADMIN_CHANGE_FAILED);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setPlan(props.plan);
          setDate("");
          setReason("");
          setError("");
          setNotice("");
          setOpen(true);
        }}
      >
        Изменить доступ
      </Button>
      {notice && (
        <p role="status" className={styles.note}>
          {notice}
        </p>
      )}
      <Modal
        open={open}
        onClose={() => {
          if (!pending.current) setOpen(false);
        }}
        closeDisabled={busy}
        title="Изменить доступ"
        subtitle={props.name}
      >
        <form className={styles.form} onSubmit={save}>
          <p className={styles.note}>
            Сейчас: {props.plan === "FRIENDS" ? "Для своих" : props.plan === "ARCHIVE" ? "Архивный тариф" : adminPlanLabels[props.plan]}. Срок:{" "}
            {props.plan === "FRIENDS" ? "бессрочно" : adminDate(props.periodEnd)} (Москва). Это ручное предоставление
            доступа, оно не создаёт оплату.
          </p>
          <Field label="Новый тариф">
            <Select
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
              disabled={busy}
            >
              {Object.entries({ ...adminPlanLabels, FRIENDS: "Для своих — бесплатно и бессрочно", ...(props.hasArchive ? { ARCHIVE: "Сохранённые архивные условия" } : {}) }).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {plan === "FRIENDS" ? <p>Все возможности, QR и участники без тарифных лимитов. Оплата и продление не нужны.</p> : plan !== "FREE" ? (
            <Field
              label="Новый срок доступа"
              hint="До конца выбранного дня по Москве. Пусто — сохранить текущий срок."
            >
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={busy}
                required={
                  plan !== "ARCHIVE" && (!props.periodEnd || new Date(props.periodEnd) <= new Date())
                }
              />
            </Field>
          ) : (
            <Alert variant="warning">
              Платный доступ прекратится сразу. Сохранённые QR-коды не
              удаляются.
            </Alert>
          )}
          {props.plan === "ARCHIVE" && plan !== "ARCHIVE" && <Alert variant="warning">Архивные условия будут заменены выбранным тарифом. Старые QR продолжат работать.</Alert>}
          <Field
            label="Причина изменения"
            hint="Будет видна в журнале администраторов."
          >
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={3}
              maxLength={500}
              required
              disabled={busy}
            />
          </Field>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className={styles.actions}>
            <Button type="submit" disabled={busy}>
              {busy ? "Сохранение…" : "Сохранить доступ"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
