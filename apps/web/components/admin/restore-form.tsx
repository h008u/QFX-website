"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";
import { restoreBackupAction } from "@/app/admin/_actions/backup";
import { Button } from "@/components/ui/button";
import { ActionMessage, useAction } from "./ui";

export function RestoreForm() {
  const input = useRef<HTMLInputElement>(null);
  const a = useAction(restoreBackupAction);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" disabled={a.pending} onClick={() => input.current?.click()}>
        <Upload className="h-4 w-4" /> {a.pending ? "جارٍ الاسترجاع..." : "اختر ملف النسخة"}
      </Button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!confirm("سيتم استبدال الإعدادات الحالية بإعدادات النسخة. متابعة؟")) return;
          a.run(await f.text());
          e.target.value = "";
        }}
      />
      <ActionMessage result={a.result} />
    </div>
  );
}
