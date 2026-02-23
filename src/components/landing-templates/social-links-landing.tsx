import { QreateFooter } from "./qreate-footer";

type SocialLink = { platform?: string; url?: string };

type Props = { payload: Record<string, unknown> };

const platformColors: Record<string, string> = {
  instagram: "bg-pink-500 hover:bg-pink-600",
  facebook: "bg-blue-600 hover:bg-blue-700",
  twitter: "bg-sky-500 hover:bg-sky-600",
  x: "bg-gray-900 hover:bg-black",
  youtube: "bg-red-600 hover:bg-red-700",
  tiktok: "bg-gray-900 hover:bg-black",
  telegram: "bg-sky-500 hover:bg-sky-600",
  vk: "bg-blue-500 hover:bg-blue-600",
  linkedin: "bg-blue-700 hover:bg-blue-800",
  whatsapp: "bg-green-500 hover:bg-green-600",
  pinterest: "bg-red-500 hover:bg-red-600",
  github: "bg-gray-800 hover:bg-gray-900",
};

function getColorClass(platform?: string): string {
  if (!platform) return "bg-blue-600 hover:bg-blue-700";
  return platformColors[platform.toLowerCase()] ?? "bg-blue-600 hover:bg-blue-700";
}

export function SocialLinksLanding({ payload }: Props) {
  const title = (payload.title as string) || "Социальные сети";
  const links = (payload.links as SocialLink[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
        <h1 className="text-center text-2xl font-bold text-gray-900">{title}</h1>

        {links.length === 0 && (
          <p className="mt-4 text-center text-gray-500">Нет ссылок</p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          {links.map((link, i) => (
            <a
              key={i}
              href={link.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-colors ${getColorClass(link.platform)}`}
            >
              {link.platform || "Ссылка"}
            </a>
          ))}
        </div>
      </div>

      <QreateFooter />
    </div>
  );
}
