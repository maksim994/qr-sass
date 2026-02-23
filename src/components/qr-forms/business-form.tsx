"use client";

import { FileUploadField } from "./file-upload-field";

const SOCIAL_PLATFORMS = [
  { value: "Instagram", label: "Instagram", placeholder: "instagram.com/username" },
  { value: "Facebook", label: "Facebook", placeholder: "facebook.com/page" },
  { value: "VK", label: "ВКонтакте", placeholder: "vk.com/community" },
  { value: "Telegram", label: "Telegram", placeholder: "t.me/channel" },
  { value: "WhatsApp", label: "WhatsApp", placeholder: "wa.me/79001234567" },
  { value: "YouTube", label: "YouTube", placeholder: "youtube.com/@channel" },
] as const;

const SOCIAL_ICONS: Record<string, string> = {
  Instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  Facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  VK: "M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.372 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z",
  Telegram: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  WhatsApp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  YouTube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

type SocialLink = { platform: string; url: string };

type Props = {
  payload: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
  workspaceId: string;
};

function ensurePhones(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string" && raw) return [raw];
  return [];
}

function ensureSocialLinks(raw: unknown): SocialLink[] {
  if (Array.isArray(raw)) return raw as SocialLink[];
  return [];
}

export function BusinessForm({ payload, onChange, workspaceId }: Props) {
  const set = (field: string, value: unknown) =>
    onChange({ ...payload, [field]: value });

  const phones = ensurePhones(payload.phones ?? payload.phone);
  const socialLinks = ensureSocialLinks(payload.socialLinks);

  const setPhones = (arr: string[]) => onChange({ ...payload, phones: arr, phone: arr[0] || "" });
  const setSocialLinks = (arr: SocialLink[]) => onChange({ ...payload, socialLinks: arr });

  const addPhone = () => setPhones([...phones, ""]);
  const removePhone = (i: number) => setPhones(phones.filter((_, j) => j !== i));
  const setPhone = (i: number, v: string) =>
    setPhones(phones.map((p, j) => (j === i ? v : p)));

  const addSocial = () => setSocialLinks([...socialLinks, { platform: "Instagram", url: "" }]);
  const removeSocial = (i: number) => setSocialLinks(socialLinks.filter((_, j) => j !== i));
  const setSocialField = (i: number, field: keyof SocialLink, value: string) =>
    setSocialLinks(socialLinks.map((l, j) => (j === i ? { ...l, [field]: value } : l)));

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div>
        <label className="label">Логотип</label>
        <FileUploadField
          accept="image/*"
          workspaceId={workspaceId}
          currentFilename={payload.logoFilename as string | undefined}
          currentFileUrl={(payload.logo as string) || undefined}
          onUploaded={({ fileUrl, fileId, filename }) =>
            onChange({ ...payload, logo: fileUrl, logoFileId: fileId, logoFilename: filename })
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Название компании</label>
          <input
            className="input"
            value={String(payload.companyName || "")}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="ООО Компания"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Описание</label>
          <textarea
            className="textarea"
            rows={2}
            value={String(payload.description || "")}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Краткое описание компании"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Адрес</label>
          <input
            className="input"
            value={String(payload.address || "")}
            onChange={(e) => set("address", e.target.value)}
            placeholder="г. Москва, ул. Примерная, 1"
          />
        </div>

        {/* Multiple phones */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="label">Телефоны</label>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addPhone}>
              + Добавить
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {phones.length === 0 ? (
              <button type="button" className="btn btn-secondary btn-sm w-full" onClick={addPhone}>
                + Добавить номер
              </button>
            ) : (
              phones.map((ph, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    type="tel"
                    value={ph}
                    onChange={(e) => setPhone(i, e.target.value)}
                    placeholder="+7 999 123 45 67"
                  />
                  <button
                    type="button"
                    className="btn btn-sm text-red-600"
                    onClick={() => removePhone(i)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={String(payload.email || "")}
            onChange={(e) => set("email", e.target.value)}
            placeholder="info@company.com"
          />
        </div>
        <div>
          <label className="label">Сайт</label>
          <input
            className="input"
            type="url"
            value={String(payload.website || "")}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://company.com"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Часы работы</label>
          <textarea
            className="textarea"
            rows={3}
            value={String(payload.hours || "")}
            onChange={(e) => set("hours", e.target.value)}
            placeholder={"Пн-Пт: 9:00-18:00\nСб: 10:00-15:00\nВс: выходной"}
          />
        </div>
      </div>

      {/* Social links */}
      <div>
        <div className="flex items-center justify-between">
          <label className="label">Социальные сети</label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addSocial}>
            + Добавить
          </button>
        </div>
        <div className="mt-2 space-y-3">
          {socialLinks.length === 0 ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-6 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
              onClick={addSocial}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Добавить соцсеть
            </button>
          ) : (
            socialLinks.map((link, i) => {
              const platform = SOCIAL_PLATFORMS.find((p) => p.value === link.platform) ?? SOCIAL_PLATFORMS[0];
              const iconPath = SOCIAL_ICONS[link.platform] ?? SOCIAL_ICONS.Instagram;
              return (
                <div key={i} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex items-center gap-2 sm:col-span-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d={iconPath} />
                      </svg>
                    </div>
                    <select
                      className="select min-w-0 flex-1"
                      value={link.platform}
                      onChange={(e) => setSocialField(i, "platform", e.target.value)}
                    >
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="input min-w-0 text-sm"
                    type="url"
                    value={link.url}
                    onChange={(e) => setSocialField(i, "url", e.target.value)}
                    placeholder={platform.placeholder}
                  />
                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    onClick={() => removeSocial(i)}
                    title="Удалить"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
          {socialLinks.length > 0 && (
            <button type="button" className="btn btn-secondary btn-sm w-full" onClick={addSocial}>
              + Добавить ещё
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
