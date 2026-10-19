/** Editorial consolidation only. Customer /r /p /g /v contracts are unaffected. */
export const BLOG_REDIRECTS: Record<string,string> = {
  "staticheskiy-i-dinamicheskiy-qr-kod-dlya-oplaty-raznitsa":"qr-kod-oplata-sbp",
  "staticheskiy-qr-kod-kak-sozdat-i-primenyat":"dinamicheskij-i-staticheskij-qr-kod-raznica",
  "dinamicheskiy-qr-kod-v-chem-otlichie-ot-staticheskogo-i-chto-vybrat":"dinamicheskij-i-staticheskij-qr-kod-raznica",
  "vidy-qr-kodov-staticheskie-dinamicheskie-i-ih-primenenie-v-biznese":"dinamicheskij-i-staticheskij-qr-kod-raznica",
};
export const canonicalBlogSlug=(slug:string)=>BLOG_REDIRECTS[slug]??slug;
