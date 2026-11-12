/** عنوان صفحة بأسلوب TradingView: عنوان ضخم محاذٍ للبداية ووصف رمادي */
export function PageTitle({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight md:text-[44px]">{title}</h1>
        {text && <p className="mt-3 text-[15px] leading-7 text-muted-foreground md:text-[17px]">{text}</p>}
      </div>
      {children}
    </div>
  );
}
