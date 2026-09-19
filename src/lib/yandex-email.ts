export function yandexConfirmsLocalEmail(profileEmail: string | null | undefined, userEmail: string): boolean {
  return Boolean(profileEmail && profileEmail === userEmail);
}
