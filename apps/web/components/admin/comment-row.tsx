"use client";

import { Trash2 } from "lucide-react";
import { deleteCommentAction } from "@/app/admin/_actions/comments";
import { Button } from "@/components/ui/button";
import { useAction } from "./ui";

export function DeleteCommentButton({ id, preview }: { id: string; preview: string }) {
  const a = useAction(deleteCommentAction);
  return (
    <Button size="sm" variant="ghost" disabled={a.pending} onClick={() => confirm("حذف التعليق؟") && a.run(id, preview)} aria-label="حذف">
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
