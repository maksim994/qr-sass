import { jwtVerify } from "jose";

/** The previous production release issued seven-day sessions. Never extend them. */
export async function verifySessionJwt(token: string, options: {
  secret: string; previousSecret?: string; rotatedAt?: string; now?: Date;
}) {
  const now = options.now ?? new Date();
  const verify = (secret: string) => jwtVerify(token, new TextEncoder().encode(secret), {
    algorithms: ["HS256"], currentDate: now,
  });
  try {
    return await verify(options.secret);
  } catch (originalError) {
    const rotated = Date.parse(options.rotatedAt ?? "");
    const maxAgeMs = 7 * 86400000;
    if (!options.previousSecret || !Number.isFinite(rotated) || now.getTime() < rotated || now.getTime() >= rotated + maxAgeMs) throw originalError;
    const result = await verify(options.previousSecret);
    const { iat, exp } = result.payload;
    if (typeof iat !== "number" || typeof exp !== "number" || iat > Math.floor(rotated / 1000) || exp > iat + maxAgeMs / 1000) throw originalError;
    return result;
  }
}
