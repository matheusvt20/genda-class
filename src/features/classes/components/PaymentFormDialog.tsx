import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  paymentMethodLabels,
  paymentTypeLabels,
  type PaymentFormValues,
  type PaymentMethod,
  type PaymentStatus,
  type PaymentType,
} from "@/features/classes/services/classes.service";
import { formatarMoeda } from "@/lib/currency";

type Props = {
  open: boolean;
  loading?: boolean;
  initialValues: PaymentFormValues;
  enrollments: Array<{
    id: string;
    studentId: string;
    studentName: string;
    salePrice: number;
    totalPaid: number;
    balanceDue: number;
  }>;
  title?: string;
  description?: string;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: PaymentFormValues) => Promise<void> | void;
};

export function PaymentFormDialog({
  open,
  loading,
  initialValues,
  enrollments,
  title = "Registrar pagamento",
  description = "Salve um novo recebimento da turma.",
  submitLabel = "Registrar pagamento",
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<PaymentFormValues>(initialValues);
  const [receiptName, setReceiptName] = useState("");

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setReceiptName("");
    }
  }, [initialValues, open]);

  const selectedEnrollment =
    enrollments.find((item) => item.id === values.enrollmentId) ?? null;

  const projectedBalance = Math.max(
    Number(selectedEnrollment?.balanceDue ?? 0) - Number(values.status === "paid" ? values.amount : 0),
    0,
  );

  const footer = useMemo(
    () => (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variante="secundaria" className="w-full sm:w-auto" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          className="w-full sm:w-auto"
          form="payment-form"
          type="submit"
          disabled={loading || !values.enrollmentId || !values.studentId}
        >
          {loading ? "Salvando..." : submitLabel}
        </Button>
      </div>
    ),
    [loading, onClose, submitLabel, values.enrollmentId, values.studentId],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(values);
  }

  async function handleReceiptUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // TODO: trocar o base64 por upload no Supabase Storage quando o bucket de comprovantes estiver habilitado.
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Não foi possível ler o comprovante."));
      };

      reader.onerror = () => reject(reader.error ?? new Error("Falha ao carregar o comprovante."));
      reader.readAsDataURL(file);
    });

    setValues((current) => ({ ...current, receiptUrl: base64 }));
    setReceiptName(file.name);
    event.target.value = "";
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={footer}
    >
      <form id="payment-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <Select
          id="payment-enrollment"
          label="Aluna"
          value={values.enrollmentId}
          onChange={(event) => {
            const nextEnrollment = enrollments.find((item) => item.id === event.target.value);

            setValues((current) => ({
              ...current,
              enrollmentId: event.target.value,
              studentId: nextEnrollment?.studentId ?? "",
              amount: nextEnrollment ? Math.max(Number(nextEnrollment.balanceDue), 0) : current.amount,
              description: current.description || (nextEnrollment ? `Pagamento de ${nextEnrollment.studentName}` : current.description),
            }));
          }}
          className="md:col-span-2"
        >
          {enrollments.length === 0 ? <option value="">Nenhuma aluna inscrita</option> : null}
          {enrollments.map((enrollment) => (
            <option key={enrollment.id} value={enrollment.id}>
              {enrollment.studentName}
            </option>
          ))}
        </Select>

        {selectedEnrollment ? (
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm md:col-span-2 md:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.05em] text-slate-500">Valor do curso</p>
              <p className="mt-1 font-semibold text-slate-900">{formatarMoeda(selectedEnrollment.salePrice)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.05em] text-slate-500">Já pago</p>
              <p className="mt-1 font-semibold text-emerald-600">{formatarMoeda(selectedEnrollment.totalPaid)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.05em] text-slate-500">Saldo atual</p>
              <p className="mt-1 font-semibold text-[#E5780A]">{formatarMoeda(selectedEnrollment.balanceDue)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.05em] text-slate-500">Saldo após pagamento</p>
              <p className="mt-1 font-semibold text-slate-900">{formatarMoeda(projectedBalance)}</p>
            </div>
          </div>
        ) : null}

        <Input
          id="payment-amount"
          label="Valor"
          type="number"
          min={0}
          step="0.01"
          value={values.amount}
          onChange={(event) => setValues((current) => ({ ...current, amount: Number(event.target.value || 0) }))}
        />
        <Input
          id="payment-date"
          label="Data"
          type="datetime-local"
          value={values.paidAt}
          onChange={(event) => setValues((current) => ({ ...current, paidAt: event.target.value }))}
        />
        <div className="md:col-span-2">
          <Input
            id="payment-description"
            label="Descrição"
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            placeholder="Ex.: sinal da matrícula"
          />
        </div>
        <div className="md:col-span-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700" htmlFor="payment-receipt">
            <span>Comprovante</span>
            <input
              id="payment-receipt"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
              onChange={(event) => void handleReceiptUpload(event)}
            />
            {values.receiptUrl ? (
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>{receiptName || "Comprovante anexado"}</span>
                <a
                  href={values.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#2D4EF5]"
                >
                  Ver comprovante
                </a>
              </div>
            ) : null}
          </label>
        </div>
        <Select
          id="payment-type"
          label="Tipo"
          value={values.paymentType}
          onChange={(event) =>
            setValues((current) => ({ ...current, paymentType: event.target.value as PaymentType }))
          }
        >
          {Object.entries(paymentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          id="payment-method"
          label="Método"
          value={values.paymentMethod}
          onChange={(event) =>
            setValues((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))
          }
        >
          {Object.entries(paymentMethodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          id="payment-status"
          label="Status"
          value={values.status}
          onChange={(event) =>
            setValues((current) => ({ ...current, status: event.target.value as PaymentStatus }))
          }
        >
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
          <option value="cancelled">Cancelado</option>
        </Select>
        <div className="md:col-span-2">
          <Textarea
            id="payment-notes"
            label="Observações"
            value={values.notes}
            onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
          />
        </div>
      </form>
    </Modal>
  );
}
