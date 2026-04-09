import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { formatarMoeda } from "@/lib/currency";
import {
  courseTypeOptions,
  type ClassFormValues,
} from "@/features/classes/services/classes.service";

type Props = {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  initialValues?: ClassFormValues;
  onClose: () => void;
  onSubmit: (values: ClassFormValues) => Promise<void> | void;
};

const valoresPadrao: ClassFormValues = {
  title: "",
  courseType: "turma_pequena",
  startDate: "",
  durationDays: 1,
  startTime: "09:00",
  endTime: "18:00",
  locationName: "",
  locationAddress: "",
  capacity: 8,
  pricePerStudent: 0,
  notes: "",
  materialsIncluded: false,
  materialsList: "",
  certificateEnabled: false,
  durationHours: null,
};

type FormErrors = Partial<Record<keyof ClassFormValues, string>>;
const CUSTOM_COURSE_TYPE = "__custom_course_type__";

function formatarValorMonetario(valor: number) {
  return formatarMoeda(valor);
}

function parseValorMonetario(valor: string) {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) {
    return 0;
  }

  return Number(digitos) / 100;
}

export function ClassFormDialog({
  open,
  title,
  description,
  loading = false,
  initialValues,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<ClassFormValues>(initialValues ?? valoresPadrao);
  const [errors, setErrors] = useState<FormErrors>({});
  const [priceInput, setPriceInput] = useState(formatarValorMonetario((initialValues ?? valoresPadrao).pricePerStudent));
  const [courseTypeMode, setCourseTypeMode] = useState<string>((initialValues ?? valoresPadrao).courseType);
  const [customCourseType, setCustomCourseType] = useState("");
  const estavaAbertoRef = useRef(false);

  useEffect(() => {
    if (open && !estavaAbertoRef.current) {
      const nextValues = initialValues ?? valoresPadrao;
      const isPreset = courseTypeOptions.some((option) => option.value === nextValues.courseType);

      setValues(nextValues);
      setErrors({});
      setPriceInput(formatarValorMonetario(nextValues.pricePerStudent));
      setCourseTypeMode(isPreset ? nextValues.courseType : CUSTOM_COURSE_TYPE);
      setCustomCourseType(isPreset ? "" : nextValues.courseType);
    }

    estavaAbertoRef.current = open;
  }, [initialValues, open]);

  function handleCancel() {
    const nextValues = initialValues ?? valoresPadrao;
    const isPreset = courseTypeOptions.some((option) => option.value === nextValues.courseType);

    setValues(nextValues);
    setErrors({});
    setPriceInput(formatarValorMonetario(nextValues.pricePerStudent));
    setCourseTypeMode(isPreset ? nextValues.courseType : CUSTOM_COURSE_TYPE);
    setCustomCourseType(isPreset ? "" : nextValues.courseType);
    onClose();
  }

  const footer = useMemo(
    () => (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variante="secundaria" className="w-full sm:w-auto" onClick={handleCancel}>
          Cancelar
        </Button>
        <Button className="w-full sm:w-auto" form="class-form" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    ),
    [handleCancel, loading],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {
      title: values.title.trim() ? undefined : "Informe o nome do curso.",
      courseType: values.courseType.trim() ? undefined : "Escolha ou informe o tipo do curso.",
      startDate: values.startDate ? undefined : "Escolha a data de início.",
      durationDays: values.durationDays >= 1 ? undefined : "A duração mínima é 1 dia.",
      locationName: values.locationName.trim() ? undefined : "Informe o local.",
      capacity: values.capacity >= 1 ? undefined : "O limite mínimo é 1 vaga.",
      pricePerStudent: values.pricePerStudent >= 0 ? undefined : "Informe um valor válido.",
      durationHours:
        values.certificateEnabled && (!values.durationHours || values.durationHours < 1)
          ? "Informe a carga horária."
          : undefined,
    };

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    await onSubmit(values);
  }

  return (
    <Modal open={open} onClose={() => undefined} title={title} description={description} footer={footer} size="lg">
      <form id="class-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <Input
          id="class-title"
          label="Nome do curso"
          value={values.title}
          erro={errors.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
        />
        <Select
          id="class-type"
          label="Tipo do curso"
          value={courseTypeMode}
          erro={errors.courseType}
          onChange={(event) => {
            const nextMode = event.target.value;
            setCourseTypeMode(nextMode);

            if (nextMode === CUSTOM_COURSE_TYPE) {
              setValues((current) => ({ ...current, courseType: customCourseType }));
              return;
            }

            setValues((current) => ({ ...current, courseType: nextMode }));
          }}
        >
          {courseTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option value={CUSTOM_COURSE_TYPE}>Cadastrar outra categoria</option>
        </Select>
        {courseTypeMode === CUSTOM_COURSE_TYPE ? (
          <Input
            id="class-type-custom"
            label="Nova categoria"
            value={customCourseType}
            erro={errors.courseType}
            onChange={(event) => {
              setCustomCourseType(event.target.value);
              setValues((current) => ({ ...current, courseType: event.target.value }));
            }}
            placeholder="Ex.: Curso Vip Premium"
          />
        ) : null}
        <Input
          id="class-date"
          label="Data de início"
          type="date"
          value={values.startDate}
          erro={errors.startDate}
          onChange={(event) => setValues((current) => ({ ...current, startDate: event.target.value }))}
        />
        <Input
          id="class-duration-days"
          label="Duração (dias)"
          type="number"
          min={1}
          value={values.durationDays}
          erro={errors.durationDays}
          onChange={(event) =>
            setValues((current) => ({ ...current, durationDays: Number(event.target.value || 1) }))
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            id="class-start-time"
            label="Início"
            type="time"
            value={values.startTime}
            onChange={(event) => setValues((current) => ({ ...current, startTime: event.target.value }))}
          />
          <Input
            id="class-end-time"
            label="Fim"
            type="time"
            value={values.endTime}
            onChange={(event) => setValues((current) => ({ ...current, endTime: event.target.value }))}
          />
        </div>
        <Input
          id="class-location"
          label="Local"
          value={values.locationName}
          erro={errors.locationName}
          onChange={(event) => setValues((current) => ({ ...current, locationName: event.target.value }))}
        />
        <Input
          id="class-address"
          label="Endereço"
          value={values.locationAddress}
          onChange={(event) => setValues((current) => ({ ...current, locationAddress: event.target.value }))}
        />
        <Input
          id="class-capacity"
          label="Limite de vagas"
          type="number"
          min={1}
          value={values.capacity}
          erro={errors.capacity}
          onChange={(event) =>
            setValues((current) => ({ ...current, capacity: Number(event.target.value || 0) }))
          }
        />
        <Input
          id="class-price"
          label="Preço por aluna"
          type="text"
          inputMode="numeric"
          value={priceInput}
          erro={errors.pricePerStudent}
          onChange={(event) => {
            const valorNumerico = parseValorMonetario(event.target.value);
            setPriceInput(formatarValorMonetario(valorNumerico));
            setValues((current) => ({ ...current, pricePerStudent: valorNumerico }));
          }}
        />
        <div className="md:col-span-2">
          <Textarea
            id="class-notes"
            label="Descrição / observações"
            value={values.notes}
            onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
          />
        </div>
        <div className="md:col-span-2">
          <Toggle
            checked={values.materialsIncluded}
            onChange={(checked) => setValues((current) => ({ ...current, materialsIncluded: checked }))}
            label="Inclui kit de materiais?"
            description="Ative para detalhar os materiais fornecidos."
          />
        </div>
        {values.materialsIncluded ? (
          <div className="md:col-span-2">
            <Textarea
              id="class-materials"
              label="Lista de materiais"
              value={values.materialsList}
              onChange={(event) => setValues((current) => ({ ...current, materialsList: event.target.value }))}
            />
          </div>
        ) : null}
        <div className="md:col-span-2">
          <Toggle
            checked={values.certificateEnabled}
            onChange={(checked) => setValues((current) => ({ ...current, certificateEnabled: checked }))}
            label="Certificado?"
            description="Ative para registrar a carga horária."
          />
        </div>
        {values.certificateEnabled ? (
          <Input
            id="class-duration"
            label="Carga horária em horas"
            type="number"
            min={1}
            value={values.durationHours ?? ""}
            erro={errors.durationHours}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                durationHours: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
        ) : null}
      </form>
    </Modal>
  );
}
