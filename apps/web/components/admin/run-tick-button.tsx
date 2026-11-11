"use client";

import { Play } from "lucide-react";
import { runTickAction } from "@/app/admin/_actions/system";
import { Button } from "@/components/ui/button";
import { ActionMessage, useAction } from "./ui";

export function RunTickButton() {
  const a = useAction(runTickAction);
  return (
    <div className="flex items-center gap-3">
      <ActionMessage result={a.result} />
      <Button disabled={a.pending} onClick={() => a.run()}>
        <Play className="h-4 w-4" /> {a.pending ? "يعمل..." : "شغّل المهام الآن"}
      </Button>
    </div>
  );
}
