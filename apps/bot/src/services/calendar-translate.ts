/**
 * ترجمة عناوين أحداث المفكرة الاقتصادية إلى العربية بدون تكلفة (قاموس مصطلحات).
 * يمكن لاحقاً استبدالها بترجمة عبر نموذج ذكاء اصطناعي إن رغبت.
 */

const EXACT: Record<string, string> = {
  "Non-Farm Employment Change": "التغير في الوظائف غير الزراعية (NFP)",
  "Unemployment Rate": "معدل البطالة",
  "Unemployment Claims": "طلبات إعانة البطالة",
  "Average Hourly Earnings m/m": "متوسط الأجر في الساعة (شهري)",
  "CPI m/m": "مؤشر أسعار المستهلك (شهري)",
  "CPI y/y": "مؤشر أسعار المستهلك (سنوي)",
  "Core CPI m/m": "مؤشر أسعار المستهلك الأساسي (شهري)",
  "Core CPI y/y": "مؤشر أسعار المستهلك الأساسي (سنوي)",
  "PPI m/m": "مؤشر أسعار المنتجين (شهري)",
  "Core PPI m/m": "مؤشر أسعار المنتجين الأساسي (شهري)",
  "Core PCE Price Index m/m": "مؤشر أسعار نفقات الاستهلاك الشخصي الأساسي (شهري)",
  "Federal Funds Rate": "قرار الفائدة الأمريكية (الفيدرالي)",
  "FOMC Statement": "بيان لجنة السوق المفتوحة (FOMC)",
  "FOMC Press Conference": "المؤتمر الصحفي للفيدرالي",
  "FOMC Meeting Minutes": "محضر اجتماع الفيدرالي",
  "Fed Chair Powell Speaks": "خطاب رئيس الفيدرالي",
  "Advance GDP q/q": "الناتج المحلي الإجمالي — القراءة الأولية (ربعي)",
  "Prelim GDP q/q": "الناتج المحلي الإجمالي — القراءة التمهيدية (ربعي)",
  "Final GDP q/q": "الناتج المحلي الإجمالي — القراءة النهائية (ربعي)",
  "GDP m/m": "الناتج المحلي الإجمالي (شهري)",
  "Retail Sales m/m": "مبيعات التجزئة (شهري)",
  "Core Retail Sales m/m": "مبيعات التجزئة الأساسية (شهري)",
  "ISM Manufacturing PMI": "مؤشر ISM الصناعي",
  "ISM Services PMI": "مؤشر ISM للخدمات",
  "JOLTS Job Openings": "فرص العمل الشاغرة JOLTS",
  "ADP Non-Farm Employment Change": "تقرير ADP للوظائف غير الزراعية",
  "Main Refinancing Rate": "قرار الفائدة الأوروبية",
  "Monetary Policy Statement": "بيان السياسة النقدية",
  "ECB Press Conference": "المؤتمر الصحفي للبنك المركزي الأوروبي",
  "Official Bank Rate": "قرار الفائدة البريطانية",
  "BOJ Policy Rate": "قرار الفائدة اليابانية",
  "Cash Rate": "قرار الفائدة الأسترالية",
  "Overnight Rate": "قرار الفائدة الكندية",
  "Official Cash Rate": "قرار الفائدة النيوزيلندية",
  "SNB Policy Rate": "قرار الفائدة السويسرية",
  "Employment Change": "التغير في التوظيف",
  "Claimant Count Change": "التغير في طلبات إعانة البطالة",
  "Crude Oil Inventories": "مخزونات النفط الخام",
};

const KEYWORDS: [RegExp, string][] = [
  [/\bSpeaks\b/i, "خطاب"],
  [/\bPress Conference\b/i, "مؤتمر صحفي"],
  [/\bCore CPI\b/i, "التضخم الأساسي"],
  [/\bCPI\b/i, "مؤشر أسعار المستهلك"],
  [/\bPPI\b/i, "مؤشر أسعار المنتجين"],
  [/\bGDP\b/i, "الناتج المحلي الإجمالي"],
  [/\bRetail Sales\b/i, "مبيعات التجزئة"],
  [/\bManufacturing PMI\b/i, "مؤشر مديري المشتريات الصناعي"],
  [/\bServices PMI\b/i, "مؤشر مديري المشتريات الخدمي"],
  [/\bPMI\b/i, "مؤشر مديري المشتريات"],
  [/\bRate Statement|Policy Rate|Interest Rate|Bank Rate\b/i, "قرار سعر الفائدة"],
  [/\bUnemployment\b/i, "البطالة"],
  [/\bEmployment\b/i, "التوظيف"],
  [/\bTrade Balance\b/i, "الميزان التجاري"],
  [/\bConsumer Confidence\b/i, "ثقة المستهلك"],
  [/\bSentiment\b/i, "ثقة/معنويات"],
  [/\bHousing|Home Sales|Building Permits\b/i, "قطاع الإسكان"],
  [/\bInflation\b/i, "التضخم"],
  [/\bMinutes\b/i, "محضر اجتماع"],
];

export function translateEventTitle(title: string): string {
  const clean = title.trim();
  if (EXACT[clean]) return EXACT[clean];
  for (const [re, ar] of KEYWORDS) {
    // نُبقي العنوان الأصلي لأن الكلمة المفتاحية وحدها لا تكفي (مثل: خطاب — RBNZ Gov Speaks)
    if (re.test(clean)) return `${ar} — ${clean}`;
  }
  return clean;
}
