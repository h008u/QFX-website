import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_DOCS } from "@/config/legal";
import { pageMeta } from "@/lib/seo";

export const revalidate = 3600;

const doc = LEGAL_DOCS.privacy;
export const metadata: Metadata = pageMeta({ title: doc.title, description: doc.description, path: "/privacy", keywords: "legal" });

export default function Page() {
  return <LegalPage slug="privacy" />;
}
