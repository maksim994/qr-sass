"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { Alert, Button, Input, Modal } from "@/components/ui";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import { MSG } from "@/lib/user-messages";
import styles from "./team.module.css";

type Member = {
  id: string; userId: string; email: string; name: string | null;
  role: string; roleLabel: string; isCurrentUser: boolean;
};
type Props = {
  workspaceId: string; members: Member[]; canInvite: boolean;
  isAdmin: boolean; planLabel: string; maxUsers: number | null;
};

export function TeamPageClient({ workspaceId, members, canInvite, isAdmin, planLabel, maxUsers }: Props) {
  const router = useRouter();
  const emailId = useId();
  const pending = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const busy = loading || removing;

  useEffect(() => { if (error || success) feedbackRef.current?.focus(); }, [error, success]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !canInvite || pending.current) return;
    pending.current = true;
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetchApi(`/api/workspaces/${workspaceId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await parseApiResponse(res);
      if (!result.ok) { setError(result.error ?? MSG.TEAM_ADD_FAILED); return; }
      setEmail(""); setSuccess("Участник добавлен в команду.");
      trackGoal(PRODUCT_GOALS.member_invited);
      router.refresh();
    } catch { setError(MSG.TEAM_ADD_FAILED); }
    finally { pending.current = false; setLoading(false); }
  }

  async function remove() {
    if (!selected || pending.current) return;
    pending.current = true;
    setRemoving(true); setRemoveError(null); setError(null); setSuccess(null);
    try {
      const res = await fetchApi(`/api/workspaces/${workspaceId}/members/${selected.userId}`, { method: "DELETE" });
      const result = await parseApiResponse(res);
      if (!result.ok) { setRemoveError(result.error ?? MSG.TEAM_REMOVE_FAILED); return; }
      setSelected(null); setSuccess("Участник исключён из команды."); router.refresh();
    } catch { setRemoveError(MSG.TEAM_REMOVE_FAILED); }
    finally { pending.current = false; setRemoving(false); }
  }

  return <div className={styles.team}>
    <section className={styles.summary} aria-label="Участники и тариф">
      <div><h2>Доступ к кабинету</h2><p>Тариф «{planLabel}»</p></div>
      <p className={styles.capacity}><strong>{members.length.toLocaleString("ru-RU")}{maxUsers !== null ? ` из ${maxUsers.toLocaleString("ru-RU")}` : ""}</strong><span>{maxUsers === null ? "участников · без лимита" : "мест занято"}</span></p>
    </section>
    {(error || success) && <div ref={feedbackRef} tabIndex={-1} className={styles.feedback}><Alert variant={error ? "danger" : "success"} onClose={() => { setError(null); setSuccess(null); }}>{error || success}</Alert></div>}
    {isAdmin ? <section className={styles.panel} aria-labelledby="team-add-title">
      <h2 id="team-add-title">Добавить участника</h2>
      {canInvite ? <><p className={styles.description}>Укажите email пользователя, который уже зарегистрирован в QR-S.ru. Он сразу получит доступ к этому кабинету с ролью «Участник». Письмо не отправляется.</p>
        <form onSubmit={invite} className={styles.addForm}><div><label htmlFor={emailId}>Email участника</label><Input id={emailId} type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} required autoComplete="off"/></div><Button type="submit" disabled={busy || !email.trim()}>{loading ? "Добавление…" : "Добавить участника"}</Button></form>
      </> : <div className={styles.limit}><p>Все места на текущем тарифе заняты. Чтобы добавить человека, освободите место или выберите тариф с большим лимитом.</p><Link href="/dashboard/billing" className="fk-button fk-button--secondary">Посмотреть тарифы</Link></div>}
    </section> : <p className={styles.notice}>Добавлять и исключать участников могут владелец и администраторы кабинета.</p>}
    <section className={styles.members} aria-labelledby="team-members-title"><h2 id="team-members-title">Участники кабинета <span>{members.length}</span></h2>
      {members.length === 0 ? <p className={styles.empty}>Участников пока нет.</p> : <table className={styles.table}><caption className="sr-only">Состав команды и роли участников</caption><thead><tr><th scope="col">Участник</th><th scope="col">Роль</th>{isAdmin && <th scope="col"><span className="sr-only">Действия</span></th>}</tr></thead><tbody>{members.map(member => <tr key={member.id}>
        <td><div className={styles.person}><span className={styles.avatar} aria-hidden="true">{(member.name?.trim() || member.email)[0]?.toUpperCase()}</span><div className={styles.identity}><div className={styles.name}>{member.name?.trim() || member.email}{member.isCurrentUser && <span className={styles.you}>Вы</span>}</div>{member.name?.trim() && <p>{member.email}</p>}</div></div></td>
        <td className={styles.role}><span className={styles.mobileLabel}>Роль</span>{member.roleLabel}</td>
        {isAdmin && <td className={styles.action}>{!member.isCurrentUser && member.role !== "OWNER" && <button type="button" disabled={busy} className={styles.remove} aria-label={`Исключить: ${member.name?.trim() || member.email}`} onClick={() => { setRemoveError(null); setSelected(member); }}>Исключить</button>}</td>}
      </tr>)}</tbody></table>}
    </section>
    <details className={styles.roles}><summary>Что означают роли</summary><dl><div><dt>Владелец</dt><dd>Управляет кабинетом и командой. Его нельзя исключить из списка участников.</dd></div><div><dt>Администратор</dt><dd>Может добавлять и исключать участников в пределах лимита тарифа.</dd></div><div><dt>Участник</dt><dd>Работает в общем кабинете, но не управляет составом команды.</dd></div></dl></details>
    {selected && <Modal open title="Исключить участника?" closeDisabled={removing} onClose={() => { if (!pending.current) setSelected(null); }} footer={<><Button variant="secondary" disabled={removing} onClick={() => setSelected(null)}>Отмена</Button><Button variant="danger" disabled={removing} onClick={remove}>{removing ? "Исключение…" : "Исключить"}</Button></>}>
      <p className={styles.selectedName}>{selected.name?.trim() || selected.email}</p>{selected.name?.trim() && <p className={styles.selectedEmail}>{selected.email}</p>}<p className={styles.description}>Пользователь потеряет доступ к этому кабинету. Его аккаунт останется в сервисе.</p>{removeError && <Alert variant="danger">{removeError}</Alert>}
    </Modal>}
  </div>;
}
