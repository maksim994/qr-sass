import Link from "next/link";
import { BLOG_LANDING_LINKS, PRINT_SIZE_ROWS } from "@/lib/blog-seo";
import { HomeQuickStart } from "@/components/landing/home-quick-start";
import { publicGeneratorOptions } from "@/lib/public-generator";
import s from "./blog-seo-intro.module.css";
export function BlogSeoIntro({slug}:{slug:string}){
 const links=BLOG_LANDING_LINKS[slug];
 return <>
  {links&&<nav className={s.links} aria-label="Создать QR по теме статьи">{links.map(([href,label])=><Link key={href} href={href}>{label} →</Link>)}</nav>}
  {slug==="razmer-qr-koda-dlya-pechati"&&<section className={s.print} aria-labelledby="print-size-title"><h2 id="print-size-title">Размер QR для пробной печати</h2><p>Ориентиры для макета. Итог зависит от плотности кода, контраста, камеры и освещения.</p><div><table><thead><tr><th scope="col">Материал</th><th scope="col">Расстояние</th><th scope="col">Сторона QR</th></tr></thead><tbody>{PRINT_SIZE_ROWS.map(([format,distance,size])=><tr key={format}><th scope="row">{format}</th><td>{distance}</td><td>{size}</td></tr>)}</tbody></table></div><p><Link href="/qr-dlya-vizitki">Сделать QR для визитки</Link> · <Link href="/qr-po-ssylke">QR по ссылке</Link></p></section>}
  {slug==="qr-kod-dlya-vkontakte"&&<div className={s.quick}><strong>Где взять QR сообщества</strong><p>На телефоне откройте сообщество и меню действий: используйте пункт QR, если он доступен в вашей версии ВК. На компьютере скопируйте адрес сообщества из браузера. Свою ссылку vk.com или vk.ru можно превратить в QR ниже.</p><a href="#article-generator">Создать свой QR на сообщество →</a></div>}
 </>;
}
export async function ArticleGenerator(){
 const options=await publicGeneratorOptions();
 return <section id="article-generator" className={s.generator} aria-labelledby="article-generator-title"><h2 id="article-generator-title">Свой QR на сообщество ВКонтакте</h2><p>Скачайте статический код бесплатно. Для статистики и смены ссылки выберите динамический; сохранение потребует аккаунт.</p><HomeQuickStart signedIn={options.signedIn} enabledTypes={options.enabledTypes} enabledStaticTypes={options.enabledStaticTypes} dynamicRemaining={options.dynamicRemaining} trialUsed={options.trialUsed} heading={false} source="landing" initialType="URL" urlLabel="Ссылка на сообщество ВКонтакте" urlPlaceholder="https://vk.com/…" /></section>;
}
