export function toPublicQr<T extends { passwordHash?: string | null }>(qr: T) {
  const { passwordHash, ...rest } = qr;
  return { ...rest, passwordRequired: Boolean(passwordHash) };
}
