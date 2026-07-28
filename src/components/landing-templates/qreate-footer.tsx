export function QreateFooter() {
  const appUrl = process.env.APP_URL ?? "https://qr-s.ru";

  return (
    <footer className="qrs-hosted-footer">
      <span>Создано в</span>
      <a href={appUrl} target="_blank" rel="noopener noreferrer">
        QR-S.ru
      </a>
    </footer>
  );
}
