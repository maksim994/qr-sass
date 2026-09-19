const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function generatePassword(): string {
  const bytes = new Uint8Array(16);
  let password: string;
  do {
    crypto.getRandomValues(bytes);
    // 64 characters divide the byte range evenly, avoiding modulo bias.
    password = Array.from(bytes, (byte) => ALPHABET[byte % 64]).join("");
  } while (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password));
  return password;
}
