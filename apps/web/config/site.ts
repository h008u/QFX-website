export const siteConfig = {
  name: "QFX",
  title: "QFX — وكيلك المعتمد في أسواق الفوركس",
  description:
    "انضم إلى مجتمع QFX للتداول: حساب لدى وسيط مرخّص عبر وكالتنا، توصيات يومية بسجل أداء شفاف، تحليلات فنية، وأخبار المفكرة الاقتصادية بالعربية.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  referralUrl: process.env.NEXT_PUBLIC_IB_REFERRAL_URL || "#join",
  brokerName: process.env.NEXT_PUBLIC_BROKER_NAME || "شركة الوساطة الشريكة",
  telegramUrl: process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || "https://t.me/",
  nav: [
    { href: "/", label: "الرئيسية" },
    { href: "/how-it-works", label: "كيف نعمل" },
    { href: "/signals", label: "التوصيات" },
    { href: "/feed", label: "المجتمع والأخبار" },
  ],
};
