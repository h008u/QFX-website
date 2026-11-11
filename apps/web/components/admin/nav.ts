import {
  Activity, BarChart3, Bell, Bot, CandlestickChart, MessagesSquare, CalendarDays, DatabaseBackup, FileClock, GitBranch, Home, Image, Inbox, LineChart,
  Newspaper, PenSquare, Settings, ShieldCheck, Users, UsersRound, Workflow, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  adminOnly?: boolean;
  badge?: "pending" | "failed" | "leads";
  keywords?: string;
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "نظرة عامة", icon: Home, group: "اللوحة", keywords: "overview dashboard" },
  { href: "/admin/flow", label: "التدفق والسجل", icon: Workflow, group: "اللوحة", badge: "failed", keywords: "flow log سجل" },
  { href: "/admin/review", label: "المراجعة والموافقة", icon: Inbox, group: "اللوحة", badge: "pending", keywords: "review approval موافقة" },
  { href: "/admin/compose", label: "منشور جديد", icon: PenSquare, group: "النشر", keywords: "post new compose كتابة" },
  { href: "/admin/calendar", label: "تقويم المحتوى", icon: CalendarDays, group: "النشر", keywords: "calendar schedule جدولة" },
  { href: "/admin/signals", label: "التوصيات والأداء", icon: LineChart, group: "النشر", keywords: "signals performance أداء" },
  { href: "/admin/strategies", label: "بوتات التحليل", icon: Bot, group: "النشر", keywords: "strategies backtest استراتيجيات اختبار" },
  { href: "/admin/mt5", label: "ربط MT5", icon: CandlestickChart, group: "النشر", keywords: "mt5 metatrader منصة صفقات" },
  { href: "/admin/alerts", label: "تنبيهات الأسعار", icon: Bell, group: "النشر", keywords: "price alerts سعر" },
  { href: "/admin/newsroom", label: "غرفة الأخبار والأجندة", icon: Newspaper, group: "الأخبار", keywords: "news agenda calendar أجندة" },
  { href: "/admin/comments", label: "تعليقات المجتمع", icon: MessagesSquare, group: "العملاء", keywords: "comments moderation تعليقات إشراف" },
  { href: "/admin/crm", label: "العملاء والأعضاء", icon: UsersRound, group: "العملاء", badge: "leads", keywords: "crm leads members إحالة" },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings, group: "الإعدادات", keywords: "settings destinations sources مصادر أماكن" },
  { href: "/admin/rules", label: "القواعد والقوالب", icon: GitBranch, group: "الإعدادات", keywords: "rules policy templates سياسة كلمات" },
  { href: "/admin/media", label: "مكتبة الصور", icon: Image, group: "الإعدادات", keywords: "media images صور" },
  { href: "/admin/system", label: "صحة النظام", icon: Activity, group: "النظام", keywords: "system health status حالة" },
  { href: "/admin/activity", label: "سجل النشاط", icon: FileClock, group: "النظام", keywords: "activity audit نشاط" },
  { href: "/admin/team", label: "الفريق", icon: Users, group: "النظام", adminOnly: true, keywords: "team roles أدوار" },
  { href: "/admin/backup", label: "النسخ الاحتياطي", icon: DatabaseBackup, group: "النظام", adminOnly: true, keywords: "backup restore نسخة" },
];

export const QUICK_ACTIONS = [
  { href: "/admin/compose", label: "اكتب منشوراً جديداً", icon: PenSquare },
  { href: "/admin/signals#new", label: "أرسل توصية", icon: BarChart3 },
  { href: "/admin/review", label: "راجع المنشورات المعلّقة", icon: Inbox },
  { href: "/admin/system", label: "شغّل المهام الآن", icon: ShieldCheck },
];
