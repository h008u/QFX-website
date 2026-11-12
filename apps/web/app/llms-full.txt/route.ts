import { buildLlms } from "@/lib/llms";

export const revalidate = 3600;

export async function GET() {
  return new Response(await buildLlms(true), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
