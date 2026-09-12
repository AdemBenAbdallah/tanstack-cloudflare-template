import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/i18n";
import { createProjectFn } from "@/lib/projects";

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      createProjectFn({ data: input }),
    onSuccess: () => {
      setName("");
      setDescription("");
      onOpenChange(false);
      toast.success(t.app.created);
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => toast.error(t.app.createFailed),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.app.newProject}</DialogTitle>
          <DialogDescription>{t.app.newProjectDescription}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              createMutation.mutate({
                name: name.trim(),
                description: description.trim() || undefined,
              });
            }
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="new-project-name">{t.app.name}</Label>
            <Input
              id="new-project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.app.namePlaceholder}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-project-desc">{t.app.description}</Label>
            <Textarea
              id="new-project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t.app.creating : t.app.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
