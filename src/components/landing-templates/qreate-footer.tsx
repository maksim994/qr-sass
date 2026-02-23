export function QreateFooter() {
  return (
    <footer className="mt-8 flex items-center justify-center gap-1.5 text-xs text-gray-400">
      <span>Создано в</span>
      <a
        href={process.env.APP_URL ?? "https://qr-s.ru"}
        className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        qr-s.ru
      </a>
    </footer>
  );
}
