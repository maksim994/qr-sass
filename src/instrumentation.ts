export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { warnAbuseConfiguration } = await import('@/lib/abuse/config');
    warnAbuseConfiguration();
  }
}
