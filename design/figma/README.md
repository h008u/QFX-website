# QFX → Figma

سكربت يبني نظام تصميم QFX وشاشاته داخل ملف Figma مباشرة (طبقات قابلة للتعديل، لا صور).

## ماذا يُنشئ
| الصفحة | المحتوى |
|---|---|
| **QFX · Foundations** | مجموعة متغيرات `QFX Color` بوضعين Light/Dark (13 لوناً مع رموز CSS)، و15 نمط خط `QFX/*`، ولوحات عرض للألوان والخطوط |
| **QFX · Components** | Symbol Logo (11)، Button (3 أنواع × 2 حجم)، Change (صعود/هبوط × شارة/نص)، Category Pill، Stat، Watchlist Row (جوال/كمبيوتر)، Bottom Nav (5 حالات)، Header/Mobile |
| **QFX · Screens** | جوال: قائمة المراقبة، صفحة الرمز، الشارت — كمبيوتر: صفحة الرمز، الرئيسية — مع نسخ داكنة |

كل الألوان مربوطة بالمتغيرات: لتحويل أي شاشة للوضع الداكن اخترها ثم من لوحة Layer اختر Mode → Dark.
إعادة التشغيل آمنة: تحذف فقط صفحات/متغيرات/أنماط QFX السابقة وتبنيها من جديد.

## التشغيل (تطبيق Figma لسطح المكتب)
1. افتح ملف Figma.
2. القائمة: **Plugins → Development → Import plugin from manifest…**
3. اختر الملف `design/figma/manifest.json` من هذا المستودع.
4. شغّله: **Plugins → Development → QFX Design Import**.
5. يستغرق دقيقة تقريباً، وتظهر رسالة ✅ في الأسفل عند الانتهاء.

بديل: إضافة **Scripter** — الصق محتوى `code.js` كاملاً واضغط Run.

## ملاحظات
- الخط العربي: يُستخدم IBM Plex Sans Arabic إن كان متوفراً، وإلا Noto Sans Arabic ثم Cairo/Tajawal. الأرقام والحروف اللاتينية بـ Roboto.
- الأسعار والبيانات توضيحية (نفس بيانات العرض في الموقع).
