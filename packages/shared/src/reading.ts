// القراءة المعتادة للأخبار الاقتصادية: إذا طلع الرقم أعلى من المتوقع شنو يصير عادةً (تعليمي، منقول من Spir)
const NAMES: Record<string, string> = { USD: "الدولار", EUR: "اليورو", GBP: "الجنيه", JPY: "الين", CHF: "الفرنك", CAD: "الدولار الكندي", AUD: "الدولار الأسترالي", NZD: "الدولار النيوزيلندي", CNY: "اليوان" };
const INVERSE = /unemployment|jobless|claims|claimant/i;
const POSITIVE = /cpi|inflation|ppi|pce|gdp|retail sales|pmi|non-?farm|payroll|employment change|nfp|ism|confidence|sentiment|rate decision|interest rate|cash rate|bank rate|policy rate|funds rate|refinancing|wage|earnings|industrial production|manufacturing|services|housing|building|trade balance|durable|jolts|job openings|adp/i;
const TALK = /speaks|speech|press conference|testif|minutes|statement|outlook|report|meeting/i;

export function readingOf(currency: string, titleEn: string) {
  const cur = NAMES[currency];
  if (!cur) return null;
  if (INVERSE.test(titleEn)) return { cur, higherGood: false, talk: false };
  if (POSITIVE.test(titleEn)) return { cur, higherGood: true, talk: false };
  if (TALK.test(titleEn)) return { cur, higherGood: true, talk: true };
  return null;
}

/** قبل الخبر: شنو يعني لو طلع أعلى أو أقل من المتوقع (HTML) */
export function eventReadingText(currency: string, titleEn: string): string {
  const r = readingOf(currency, titleEn);
  if (!r) return "";
  if (r.talk) return `📖 تصريحات قد تحرّك ${r.cur} بقوة حسب لهجتها (المتشددة تقوّيه غالباً، والمتساهلة تضعفه).`;
  const up = r.higherGood ? "يقوّي" : "يضعف";
  const down = r.higherGood ? "يضعف" : "يقوّي";
  const gold = currency === "USD" ? "\n🥇 الذهب يتحرك عادةً عكس الدولار." : "";
  return `📖 إذا جاء <b>أعلى</b> من المتوقع ← عادةً ${up} ${r.cur}.\nإذا جاء <b>أقل</b> ← عادةً ${down} ${r.cur}.${gold}`;
}
