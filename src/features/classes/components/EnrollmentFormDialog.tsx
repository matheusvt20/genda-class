import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  enrollmentStatusLabels,
  type EnrollmentFormValues,
  type EnrollmentStatus,
  type StudentRecord,
} from "@/features/classes/services/classes.service";

type Props = {
  open: boolean;
  students: StudentRecord[];
  loading?: boolean;
  initialValues?: EnrollmentFormValues;
  onClose: () => void;
  onSubmit: (values: EnrollmentFormValues) => Promise<void> | void;
};

const valoresPadrao: EnrollmentFormValues = {
  studentId: "",
  status: "interessada",
  salePrice: 0,
  notes: "",
};

export function EnrollmentFormDialog({ open, students, loading, initialValues, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<EnrollmentFormValues>(initialValues ?? valoresPadrao);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? valoresPadrao);
      setError(null);
    }
  }, [initialValues, open]);

  const footer = useMemo(
    () => (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variante="secundaria" className="w-full sm:w-auto" onClick={onClose}>
          Cancelar
        </Button>
        <Button className="w-full sm:w-auto" form="enrollment-form" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    ),
    [loading, onClose],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.studentId) {
      setError("Selecione uma aluna.");
      return;
    }

    await onSubmit(values);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar aluna"
      description="Vincule uma aluna à turma e registre o status inicial."
      footer={footer}
    >
      <form id="enrollment-form" className="grid gap-4" onSubmit={handleSubmit}>
        <Select
          id="enrollment-student"
          label="Aluna"
          value={values.studentId}
          erro={error}
          onChange={(event) => {
            setError(null);
            setValues((current) => ({ ...current, studentId: event.target.value }));
          }}
        >
          <option value="">Selecione</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name}
            </option>
          ))}
        </Select>
        <Select
          id="enrollment-status"
          label="Status da inscrição"
          value={values.status}
          onChange={(event) =>
            setValues((current) => ({ ...current, status: event.target.value as EnrollmentStatus }))
          }
        >
          {Object.entries(enrollmentStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          id="enrollment-price"
          label="Valor total"
          type="number"
          min={0}
          step="0.01"
          value={values.salePrice}
          onChange={(event) =>
            setValues((current) => ({ ...current, salePrice: Number(event.target.value || 0) }))
          }
        />
        <Textarea
          id="enrollment-notes"
          label="Observações"
          value={values.notes}
          onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
        />
      </form>
    </Modal>
  );
}
