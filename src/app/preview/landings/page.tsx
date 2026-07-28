import { MenuLanding } from "@/components/landing-templates/menu-landing";
import { CouponLanding } from "@/components/landing-templates/coupon-landing";

const menuPayload = {
  title: "Кофейня «Зерно»",
  categories: [
    {
      name: "Кофе",
      items: [
        { name: "Капучино", description: "Двойной эспрессо, молоко", price: "290 ₽" },
        { name: "Флэт уайт", description: "Мягкий и насыщенный", price: "310 ₽" },
      ],
    },
    {
      name: "Выпечка",
      items: [
        { name: "Круассан", description: "Сливочное масло", price: "180 ₽" },
      ],
    },
  ],
};

const couponPayload = {
  title: "Скидка на первый заказ",
  description: "Действует на весь ассортимент",
  discount: 15,
  promoCode: "QRS-START",
  expiryDate: "31.12.2026",
  terms: "Не суммируется с другими акциями. Один промокод на пользователя.",
};

export default function HostedLandingsPreviewPage() {
  return (
    <div style={{ display: "grid", gap: "48px" }}>
      <section id="menu">
        <MenuLanding payload={menuPayload} />
      </section>
      <section id="coupon">
        <CouponLanding payload={couponPayload} />
      </section>
    </div>
  );
}
