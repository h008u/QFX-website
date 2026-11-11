import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center py-32 text-center">
      <p className="num text-6xl font-black text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">الصفحة غير موجودة</h1>
      <Link href="/" className={buttonVariants({ className: "mt-8" })}>
        العودة للرئيسية
      </Link>
    </div>
  );
}
