/**
 * QR-S branded email layout — inline CSS for mail clients.
 * Placeholders use {{variable}} syntax; do not rename without updating senders.
 */

export type EmailTemplateVars = Record<string, string | number | undefined>;

const BRAND = {
  primary: "#1E4FD1",
  primaryHover: "#1840AB",
  accent: "#0C8659",
  text: "#131720",
  textMuted: "#6B7689",
  surface: "#F5F7FA",
  card: "#FFFFFF",
  border: "#DEE3EB",
  font: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function interpolate(template: string, vars: EmailTemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? "" : escapeHtml(String(value));
  });
}

export function renderEmailLayout({
  previewText,
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
  appUrl = "https://qr-s.ru",
}: {
  previewText: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  appUrl?: string;
}): string {
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<tr>
          <td style="padding: 8px 0 0;">
            <a href="${ctaUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;font-family:${BRAND.font};font-size:15px;font-weight:700;line-height:1;text-decoration:none;padding:14px 28px;border-radius:10px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
      .email-card { padding: 28px 20px !important; }
      .email-title { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${BRAND.surface};font-family:${BRAND.font};color:${BRAND.text};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.surface};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 20px;text-align:center;">
              <a href="${appUrl}" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px;">
                <span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg, ${BRAND.primary} 0%, #2F5FE6 100%);"></span>
                <span style="font-family:${BRAND.font};font-size:20px;font-weight:800;color:${BRAND.text};letter-spacing:-0.02em;">QR-S.ru</span>
              </a>
            </td>
          </tr>
          <tr>
            <td class="email-card" style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;padding:40px 36px;box-shadow:0 1px 2px rgba(19,23,32,0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td class="email-title" style="font-family:${BRAND.font};font-size:28px;font-weight:800;line-height:1.15;color:${BRAND.text};letter-spacing:-0.03em;padding:0 0 16px;">
                    ${escapeHtml(title)}
                  </td>
                </tr>
                <tr>
                  <td style="font-family:${BRAND.font};font-size:15px;line-height:1.65;color:${BRAND.textMuted};padding:0 0 24px;">
                    ${bodyHtml}
                  </td>
                </tr>
                ${ctaBlock}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;text-align:center;font-family:${BRAND.font};font-size:12px;line-height:1.6;color:${BRAND.textMuted};">
              ${footerNote ? `<p style="margin:0 0 8px;">${escapeHtml(footerNote)}</p>` : ""}
              <p style="margin:0;">
                <a href="${appUrl}" style="color:${BRAND.primary};text-decoration:none;">QR-S.ru</a>
                · Генератор QR-кодов для бизнеса
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderWelcomeEmail(vars: EmailTemplateVars): string {
  const appUrl = String(vars.appUrl ?? "https://qr-s.ru");
  const body = interpolate(
    `<p>Здравствуйте, {{name}}!</p>
     <p>Добро пожаловать в QR-S.ru. Ваш аккаунт создан — можно создавать первый QR-код, настраивать дизайн и отслеживать сканирования.</p>
     <p>Рабочее пространство: <strong>{{workspaceName}}</strong></p>`,
    vars,
  );

  return renderEmailLayout({
    previewText: "Добро пожаловать в QR-S.ru",
    title: "Аккаунт создан",
    bodyHtml: body,
    ctaLabel: "Перейти в кабинет",
    ctaUrl: `${appUrl}/dashboard`,
    appUrl,
  });
}

export function renderPasswordResetEmail(vars: EmailTemplateVars): string {
  const appUrl = String(vars.appUrl ?? "https://qr-s.ru");
  const body = interpolate(
    `<p>Здравствуйте, {{name}}!</p>
     <p>Мы получили запрос на сброс пароля для вашего аккаунта QR-S.ru. Нажмите кнопку ниже, чтобы задать новый пароль.</p>
     <p>Ссылка действительна {{expiresIn}}. Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>`,
    vars,
  );

  return renderEmailLayout({
    previewText: "Сброс пароля QR-S.ru",
    title: "Сброс пароля",
    bodyHtml: body,
    ctaLabel: "Задать новый пароль",
    ctaUrl: String(vars.resetUrl ?? `${appUrl}/login`),
    footerNote: "По соображениям безопасности ссылка одноразовая.",
    appUrl,
  });
}

export function renderBillingReceiptEmail(vars: EmailTemplateVars): string {
  const appUrl = String(vars.appUrl ?? "https://qr-s.ru");
  const body = interpolate(
    `<p>Здравствуйте, {{name}}!</p>
     <p>Оплата по тарифу <strong>{{planName}}</strong> прошла успешно.</p>
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-collapse:collapse;">
       <tr><td style="padding:8px 0;color:#6B7689;">Сумма</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#131720;">{{amount}}</td></tr>
       <tr><td style="padding:8px 0;color:#6B7689;">Период</td><td style="padding:8px 0;text-align:right;color:#131720;">{{period}}</td></tr>
       <tr><td style="padding:8px 0;color:#6B7689;">Номер платежа</td><td style="padding:8px 0;text-align:right;color:#131720;">{{paymentId}}</td></tr>
     </table>`,
    vars,
  );

  return renderEmailLayout({
    previewText: "Квитанция об оплате QR-S.ru",
    title: "Оплата получена",
    bodyHtml: body,
    ctaLabel: "Открыть биллинг",
    ctaUrl: `${appUrl}/dashboard/billing`,
    appUrl,
  });
}

export function renderTeamInviteEmail(vars: EmailTemplateVars): string {
  const appUrl = String(vars.appUrl ?? "https://qr-s.ru");
  const body = interpolate(
    `<p>Здравствуйте!</p>
     <p><strong>{{inviterName}}</strong> приглашает вас в рабочее пространство <strong>{{workspaceName}}</strong> на QR-S.ru.</p>
     <p>После входа вы сможете совместно управлять QR-кодами, аналитикой и настройками workspace.</p>`,
    vars,
  );

  return renderEmailLayout({
    previewText: "Приглашение в команду QR-S.ru",
    title: "Приглашение в команду",
    bodyHtml: body,
    ctaLabel: "Принять приглашение",
    ctaUrl: String(vars.inviteUrl ?? `${appUrl}/dashboard/team`),
    appUrl,
  });
}

export const emailTemplates = {
  welcome: renderWelcomeEmail,
  passwordReset: renderPasswordResetEmail,
  billingReceipt: renderBillingReceiptEmail,
  teamInvite: renderTeamInviteEmail,
} as const;

export type EmailTemplateId = keyof typeof emailTemplates;

export function renderEmailTemplate(id: EmailTemplateId, vars: EmailTemplateVars): string {
  return emailTemplates[id](vars);
}
