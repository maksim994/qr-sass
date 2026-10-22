export function expectedDigest(now, enabledSince) {
  const day = new Date(now.getTime() + 3 * 3600000).toISOString().slice(0, 10);
  const midnight = new Date(`${day}T00:00:00+03:00`);
  return enabledSince && enabledSince < midnight && now >= new Date(`${day}T09:10:00+03:00`)
    ? `digest:${day}` : null;
}
