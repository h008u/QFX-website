// دالة Vercel الوحيدة للبوت. الكود الفعلي مبني مسبقاً بـ tsup في dist/vercel.js (npm run build)
// لأن Vercel لا يحلّ الاستيرادات بلا امتداد ولا حزمة @qfx/shared المكتوبة بـ TypeScript.
import { handler } from "../dist/vercel.js";

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
