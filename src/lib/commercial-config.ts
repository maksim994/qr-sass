/** Current public offer. Stored payments, subscription dates and archived terms are immutable. */
export const COMMERCIAL = {
  trialDays: 7,
  free: { priceRub: 0, archive: 10, dynamic: 2, members: 1, csvRows: 0 },
  pro: { priceRub: 299, members: 5, csvRows: 50 },
  business: { priceRub: 2990, csvRows: 50 },
} as const;
export const rubles = (amount: number) => `${amount.toLocaleString("ru-RU")}\u00a0₽`;
export const FREE_DYNAMIC_COPY = `${COMMERCIAL.free.dynamic} динамических кода бесплатно`;
export const PRINTED_QR_COPY = `Напечатанные коды продолжают открываться и после окончания тарифа. Менять ссылку можно при действующем тарифе, а у ${COMMERCIAL.free.dynamic} бесплатных динамических кодов — и без оплаты.`;
