/**
 * تشكيل الحروف العربية مسبقاً إلى «أشكال العرض» (Presentation Forms-B).
 * Satori يقيس عرض الكلمة بالحروف المنفصلة ثم يرسمها متصلة، فتظهر فراغات خاطئة بين الكلمات.
 * بتحويل كل حرف لشكله السياقي (أول/وسط/آخر/منفصل) قبل التسليم، يتطابق القياس مع الرسم.
 */
// [منفصل, آخر, أول, وسط] — null = الحرف لا يتصل بما بعده
const FORMS: Record<string, [number, number, number | null, number | null]> = {
  "ء": [0xfe80, 0xfe80, null, null],
  "آ": [0xfe81, 0xfe82, null, null],
  "أ": [0xfe83, 0xfe84, null, null],
  "ؤ": [0xfe85, 0xfe86, null, null],
  "إ": [0xfe87, 0xfe88, null, null],
  "ئ": [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  "ا": [0xfe8d, 0xfe8e, null, null],
  "ب": [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  "ة": [0xfe93, 0xfe94, null, null],
  "ت": [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  "ث": [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  "ج": [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  "ح": [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  "خ": [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  "د": [0xfea9, 0xfeaa, null, null],
  "ذ": [0xfeab, 0xfeac, null, null],
  "ر": [0xfead, 0xfeae, null, null],
  "ز": [0xfeaf, 0xfeb0, null, null],
  "س": [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  "ش": [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  "ص": [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  "ض": [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  "ط": [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  "ظ": [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  "ع": [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  "غ": [0xfecd, 0xfece, 0xfecf, 0xfed0],
  "ف": [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  "ق": [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  "ك": [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  "ل": [0xfedd, 0xfede, 0xfedf, 0xfee0],
  "م": [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  "ن": [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  "ه": [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  "و": [0xfeed, 0xfeee, null, null],
  "ى": [0xfeef, 0xfef0, null, null],
  "ي": [0xfef1, 0xfef2, 0xfef3, 0xfef4],
};
// لام + ألف ← حرف مركّب [منفصل, آخر]
const LAM_ALEF: Record<string, [number, number]> = {
  "آ": [0xfef5, 0xfef6],
  "أ": [0xfef7, 0xfef8],
  "إ": [0xfef9, 0xfefa],
  "ا": [0xfefb, 0xfefc],
};
const HARAKAT = /[ً-ْـ]/g;

const joinsNext = (ch: string | undefined) => !!ch && !!FORMS[ch] && FORMS[ch][2] !== null;

export function reshapeArabic(text: string): string {
  const s = text.replace(HARAKAT, "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const f = FORMS[ch];
    if (!f) {
      out += ch;
      continue;
    }
    const prev = s[i - 1];
    const linkPrev = joinsNext(prev);
    if (ch === "ل" && LAM_ALEF[s[i + 1]]) {
      out += String.fromCharCode(LAM_ALEF[s[i + 1]][linkPrev ? 1 : 0]);
      i++;
      continue;
    }
    const linkNext = f[2] !== null && !!FORMS[s[i + 1]];
    if (linkPrev && linkNext) out += String.fromCharCode(f[3]!);
    else if (linkPrev) out += String.fromCharCode(f[1]);
    else if (linkNext) out += String.fromCharCode(f[2]!);
    else out += String.fromCharCode(f[0]);
  }
  return out;
}
