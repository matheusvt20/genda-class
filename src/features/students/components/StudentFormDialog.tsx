import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { formatarTelefone } from "@/lib/phone";
import type { StudentFormValues } from "@/features/students/services/students.service";

type Props = {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  initialValues: StudentFormValues;
  onClose: () => void;
  onSubmit: (values: StudentFormValues) => Promise<void> | void;
};

export function StudentFormDialog({
  open,
  title,
  description,
  loading,
  initialValues,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<StudentFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setError(null);
    }
  }, [initialValues, open]);

  const footer = useMemo(
    () => (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variante="secundaria" className="w-full sm:w-auto" onClick={onClose}>
          Cancelar
        </Button>
        <Button className="w-full sm:w-auto" form="student-form" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    ),
    [loading, onClose],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.fullName.trim()) {
      setError("Informe o nome completo.");
      return;
    }

    await onSubmit(values);
  }

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} footer={footer}>
      <form id="student-form" className="grid gap-4" onSubmit={handleSubmit}>
        <Input
          id="student-name"
          label="Nome completo"
          value={values.fullName}
          erro={error}
          onChange={(event) => {
            setError(null);
            setValues((current) => ({ ...current, fullName: event.target.value }));
          }}
        />
        <Input
          id="student-phone"
          label="Telefone"
          value={values.phone}
          onChange={(event) =>
            setValues((current) => ({ ...current, phone: formatarTelefone(event.target.value) }))
          }
        />
        <Input
          id="student-email"
          label="Email"
          type="email"
          value={values.email}
          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
        />
        <Input
          id="student-instagram"
          label="Instagram"
          value={values.instagram}
          onChange={(event) => setValues((current) => ({ ...current, instagram: event.target.value }))}
        />
        <Textarea
          id="student-notes"
          label="Observações"
          value={values.notes}
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
        />
        <Toggle
          checked={values.isActive}
          onChange={(checked) => setValues((current) => ({ ...current, isActive: checked }))}
          label="Aluna ativa"
          description="Use para filtrar alunas que ainda estudam com você."
        />
      </form>
    </Modal>
  );
}
