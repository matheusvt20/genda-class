import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  costCategoryLabels,
  type CostCategory,
  type CostFormValues,
  type CostStatus,
} from "@/features/classes/services/classes.service";

type Props = {
  open: boolean;
  loading?: boolean;
  initialValues: CostFormValues;
  title?: string;
  description?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: CostFormValues) => Promise<void> | void;
};

export function CostFormDialog({
  open,
  loading,
  initialValues,
  title = "Adicionar custo",
  description = "Registre custos previstos ou realizados da turma.",
  submitLabel = "Adicionar custo",
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<CostFormValues>(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [initialValues, open]);

  const footer = useMemo(
    () => (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variante="secundaria" className="w-full sm:w-auto" onClick={onClose}>
          Cancelar
        </Button>
        <Button className="w-full sm:w-auto" form="cost-form" type="submit" disabled={loading}>
          {loading ? "Salvando..." : submitLabel}
        </Button>
      </div>
    ),
    [loading, onClose, submitLabel],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={footer}
    >
      <form id="cost-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <Select
          id="cost-category"
          label="Categoria"
          value={values.category}
          onChange={(event) =>
            setValues((current) => ({ ...current, category: event.target.value as CostCategory }))
          }
        >
          {Object.entries(costCategoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          id="cost-status"
          label="Status"
          value={values.status}
          onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as CostStatus }))}
        >
          <option value="previsto">Previsto</option>
          <option value="realizado">Realizado</option>
        </Select>
        <Input
          id="cost-amount"
          label="Valor"
          type="number"
          min={0}
          step="0.01"
          value={values.amount}
          onChange={(event) => setValues((current) => ({ ...current, amount: Number(event.target.value || 0) }))}
        />
        <Input
          id="cost-date"
          label="Data"
          type="date"
          value={values.incurredAt}
          onChange={(event) => setValues((current) => ({ ...current, incurredAt: event.target.value }))}
        />
        <div className="md:col-span-2">
          <Input
            id="cost-description"
            label="Descrição"
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Textarea
            id="cost-notes"
            label="Observações"
            value={values.notes}
            onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
          />
        </div>
      </form>
    </Modal>
  );
}
