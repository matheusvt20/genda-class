import { supabase } from "@/core/supabase/client";

export type CourseType = string;

export type ClassStatus = "draft" | "open" | "closed" | "completed" | "cancelled";
export type ClassDisplayStatus = "aberta" | "lotada" | "concluida" | "cancelada" | "rascunho";
export type EnrollmentStatus =
  | "interessada"
  | "aguardando_pagamento"
  | "confirmada"
  | "lista_espera"
  | "cancelada"
  | "compareceu"
  | "faltou";
export type EnrollmentPaymentStatus = "nao_pago" | "parcial" | "pago";
export type PaymentType = "deposito" | "parcela" | "saldo_final" | "ajuste" | "reembolso";
export type PaymentMethod = "pix" | "dinheiro" | "cartao" | "transferencia" | "outro";
export type PaymentStatus = "paid" | "pending" | "cancelled";
export type CostCategory =
  | "materiais"
  | "aluguel"
  | "coffee"
  | "certificado"
  | "kit"
  | "transporte"
  | "marketing"
  | "outros";
export type CostStatus = "previsto" | "realizado";

type ClassRecord = {
  id: string;
  workspace_id: string;
  title: string;
  course_name: string | null;
  course_type: CourseType;
  starts_at: string;
  ends_at: string | null;
  duration_days: number;
  location_name: string | null;
  location_address: string | null;
  capacity: number;
  status: ClassStatus;
  price_per_student: number;
  notes: string | null;
  materials_included: boolean;
  materials_list: string | null;
  certificate_enabled: boolean;
  duration_hours: number | null;
  created_at: string;
  updated_at: string;
};

type ClassScheduleRecord = Pick<ClassRecord, "id" | "title" | "starts_at" | "duration_days">;

export type ClassFinancialSummaryRecord = {
  class_id: string;
  workspace_id: string;
  class_title: string;
  starts_at: string;
  class_status: ClassStatus;
  capacity: number;
  price_per_student: number;
  enrollment_count: number;
  occupied_seats: number;
  expected_revenue: number;
  received_amount: number;
  open_amount: number;
  pending_amount: number;
  expected_costs: number;
  realized_costs: number;
  estimated_profit: number;
  realized_profit: number;
  realized_margin_percent: number;
  break_even_students: number;
};

export type StudentRecord = {
  id: string;
  workspace_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type EnrollmentRecord = {
  id: string;
  workspace_id: string;
  class_id: string;
  student_id: string;
  status: EnrollmentStatus;
  sale_price: number;
  deposit_amount: number;
  discount_amount: number;
  balance_due: number;
  payment_status: EnrollmentPaymentStatus;
  enrolled_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  attendance_marked_at: string | null;
  notes: string | null;
  students?: StudentRecord | null;
};

export type PaymentRecord = {
  id: string;
  workspace_id: string;
  class_enrollment_id: string;
  class_id: string;
  student_id: string;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  paid_at: string;
  status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  students?: StudentRecord | null;
};

export type CostRecord = {
  id: string;
  workspace_id: string;
  class_id: string;
  category: CostCategory;
  description: string | null;
  amount: number;
  incurred_at: string;
  status: CostStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type AttendanceSessionRecord = {
  id: string;
  workspace_id: string;
  class_id: string;
  attendance_date: string;
  token: string;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

type AttendanceCheckinRecord = {
  id: string;
  session_id: string;
  class_id: string;
  enrollment_id: string;
  checked_in_at: string;
};

export type ClassListItem = ClassRecord & {
  vagasOcupadas: number;
  vagasDisponiveis: number;
  vagasListaEspera: number;
  totalEsperado: number;
  totalRecebido: number;
  percentualOcupacao: number;
  statusExibicao: ClassDisplayStatus;
};

export type ClassDetailData = {
  turma: ClassListItem;
  resumoFinanceiro: ClassFinancialSummaryRecord;
  inscricoes: Array<EnrollmentRecord & { student: StudentRecord | null; totalPago: number }>;
  pagamentos: Array<PaymentRecord & { student: StudentRecord | null }>;
  custos: CostRecord[];
  sessoesChamada: AttendanceSessionRecord[];
  checkinsAtivos: AttendanceCheckinRecord[];
};

export type AttendanceRosterItem = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  checkedInAt: string | null;
};

export type ClassScheduleConflict = {
  id: string;
  title: string;
  startsAt: string;
  durationDays: number;
  overlappingDates: string[];
};

export type ClassFormValues = {
  title: string;
  courseType: CourseType;
  startDate: string;
  durationDays: number;
  startTime: string;
  endTime: string;
  locationName: string;
  locationAddress: string;
  capacity: number;
  pricePerStudent: number;
  notes: string;
  materialsIncluded: boolean;
  materialsList: string;
  certificateEnabled: boolean;
  durationHours: number | null;
};

export type EnrollmentFormValues = {
  studentId: string;
  status: EnrollmentStatus;
  salePrice: number;
  notes: string;
};

export type PaymentFormValues = {
  enrollmentId: string;
  studentId: string;
  amount: number;
  description: string;
  receiptUrl: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paidAt: string;
  notes: string;
};

export type CostFormValues = {
  category: CostCategory;
  description: string;
  amount: number;
  incurredAt: string;
  status: CostStatus;
  notes: string;
};

export async function getActiveClassCount(workspaceId: string) {
  const response = await supabase
    .from("classes")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .not("status", "in", '("cancelled","completed")');

  if (response.error) {
    throw response.error;
  }

  return response.count ?? 0;
}

export const courseTypeLabels: Record<CourseType, string> = {
  vip: "VIP",
  turma_pequena: "Turma pequena",
  workshop: "Workshop",
  formacao_tecnica: "Formação técnica",
  formacao_instrutora: "Formação de instrutora",
};

export const courseTypeOptions = [
  { value: "vip", label: "VIP" },
  { value: "turma_pequena", label: "Turma pequena" },
  { value: "workshop", label: "Workshop" },
  { value: "formacao_tecnica", label: "Formação técnica" },
  { value: "formacao_instrutora", label: "Formação de instrutora" },
] as const;

export function getCourseTypeLabel(courseType: string) {
  return courseTypeLabels[courseType] ?? courseType;
}

export function getClassOccupiedDates(startsAt: string, durationDays: number) {
  const totalDias = Math.max(1, durationDays || 1);
  const datas: string[] = [];
  const inicio = new Date(startsAt);

  for (let indice = 0; indice < totalDias; indice += 1) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + indice);
    datas.push(dia.toISOString().slice(0, 10));
  }

  return datas;
}

export async function findClassScheduleConflicts(
  workspaceId: string,
  values: Pick<ClassFormValues, "startDate" | "durationDays">,
  classIdToIgnore?: string,
) {
  const { data, error } = await supabase
    .from("classes")
    .select("id, title, starts_at, duration_days")
    .eq("workspace_id", workspaceId)
    .returns<ClassScheduleRecord[]>();

  if (error) {
    throw error;
  }

  const occupiedDates = new Set(
    getClassOccupiedDates(new Date(`${values.startDate}T00:00:00`).toISOString(), values.durationDays),
  );

  return (data ?? [])
    .filter((item) => item.id !== classIdToIgnore)
    .map((item) => {
      const overlappingDates = getClassOccupiedDates(item.starts_at, item.duration_days).filter((date) =>
        occupiedDates.has(date),
      );

      if (overlappingDates.length === 0) {
        return null;
      }

      return {
        id: item.id,
        title: item.title,
        startsAt: item.starts_at,
        durationDays: item.duration_days,
        overlappingDates,
      } satisfies ClassScheduleConflict;
    })
    .filter((item): item is ClassScheduleConflict => item !== null);
}

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  interessada: "Interessada",
  aguardando_pagamento: "Aguardando pagamento",
  confirmada: "Confirmada",
  lista_espera: "Lista de espera",
  cancelada: "Cancelada",
  compareceu: "Compareceu",
  faltou: "Faltou",
};

export const paymentStatusLabels: Record<EnrollmentPaymentStatus, string> = {
  nao_pago: "Não pago",
  parcial: "Parcial",
  pago: "Pago",
};

export const classStatusLabels: Record<ClassDisplayStatus, string> = {
  aberta: "Aberta",
  lotada: "Lotada",
  concluida: "Concluída",
  cancelada: "Cancelada",
  rascunho: "Rascunho",
};

export const costCategoryLabels: Record<CostCategory, string> = {
  materiais: "Materiais",
  aluguel: "Aluguel",
  coffee: "Coffee",
  certificado: "Certificado",
  kit: "Kit",
  transporte: "Transporte",
  marketing: "Marketing",
  outros: "Outros",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
};

export const paymentTypeLabels: Record<PaymentType, string> = {
  deposito: "Depósito",
  parcela: "Parcela",
  saldo_final: "Saldo final",
  ajuste: "Ajuste",
  reembolso: "Reembolso",
};

const statusesQueOcupamVaga: EnrollmentStatus[] = [
  "aguardando_pagamento",
  "confirmada",
  "compareceu",
  "faltou",
];

function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function getEndDate(startDate: string, durationDays: number) {
  const data = new Date(`${startDate}T00:00:00`);
  data.setDate(data.getDate() + Math.max(1, durationDays || 1) - 1);
  return data.toISOString().slice(0, 10);
}

function isMissingFinancialViewError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" ||
    error.message?.includes("vw_class_financial_summary") ||
    error.message?.includes("schema cache") ||
    false
  );
}

function buildFinancialSummaryFallback(
  turma: ClassRecord,
  inscricoes: EnrollmentRecord[],
  pagamentos: PaymentRecord[] = [],
  custos: CostRecord[] = [],
): ClassFinancialSummaryRecord {
  const inscricoesDaTurma = inscricoes.filter((item) => item.class_id === turma.id);
  const pagamentosDaTurma = pagamentos.filter((item) => item.class_id === turma.id);
  const custosDaTurma = custos.filter((item) => item.class_id === turma.id);
  const enrollmentCount = inscricoesDaTurma.filter((item) => item.status !== "cancelada" && item.status !== "lista_espera").length;
  const occupiedSeats = inscricoesDaTurma.filter((item) => statusesQueOcupamVaga.includes(item.status)).length;
  const expectedRevenue = inscricoesDaTurma.reduce((total, item) => {
    if (item.status === "cancelada" || item.status === "lista_espera") {
      return total;
    }

    return total + Math.max(Number(item.sale_price) - Number(item.discount_amount || 0), 0);
  }, 0);
  const receivedAmount = pagamentosDaTurma.reduce((total, item) => {
    if (item.status !== "paid") {
      return total;
    }

    return total + (item.payment_type === "reembolso" ? Number(item.amount) * -1 : Number(item.amount));
  }, 0);
  const pendingAmount = pagamentosDaTurma.reduce((total, item) => {
    if (item.status !== "pending") {
      return total;
    }

    return total + (item.payment_type === "reembolso" ? Number(item.amount) * -1 : Number(item.amount));
  }, 0);
  const openAmount = inscricoesDaTurma.reduce((total, item) => {
    if (item.status === "cancelada" || item.status === "lista_espera") {
      return total;
    }

    return total + Math.max(Number(item.balance_due), 0);
  }, 0);
  const expectedCosts = custosDaTurma.reduce(
    (total, item) => total + (item.status === "previsto" ? Number(item.amount) : 0),
    0,
  );
  const realizedCosts = custosDaTurma.reduce(
    (total, item) => total + (item.status === "realizado" ? Number(item.amount) : 0),
    0,
  );
  const realizedProfit = receivedAmount - realizedCosts;

  return {
    class_id: turma.id,
    workspace_id: turma.workspace_id,
    class_title: turma.title,
    starts_at: turma.starts_at,
    class_status: turma.status,
    capacity: turma.capacity,
    price_per_student: Number(turma.price_per_student),
    enrollment_count: enrollmentCount,
    occupied_seats: occupiedSeats,
    expected_revenue: expectedRevenue,
    received_amount: receivedAmount,
    open_amount: openAmount,
    pending_amount: pendingAmount,
    expected_costs: expectedCosts,
    realized_costs: realizedCosts,
    estimated_profit: expectedRevenue - expectedCosts,
    realized_profit: realizedProfit,
    realized_margin_percent: receivedAmount > 0 ? (realizedProfit / receivedAmount) * 100 : 0,
    break_even_students: Number(turma.price_per_student) > 0 ? realizedCosts / Number(turma.price_per_student) : 0,
  };
}

function calcularMetricasDaTurma(
  turma: ClassRecord,
  inscricoes: EnrollmentRecord[],
  resumoFinanceiro?: ClassFinancialSummaryRecord | null,
): ClassListItem {
  const inscricoesDaTurma = inscricoes.filter((item) => item.class_id === turma.id);
  const vagasOcupadas = resumoFinanceiro?.occupied_seats ??
    inscricoesDaTurma.filter((item) => statusesQueOcupamVaga.includes(item.status)).length;
  const vagasListaEspera = inscricoesDaTurma.filter((item) => item.status === "lista_espera").length;
  const totalEsperado =
    resumoFinanceiro?.expected_revenue ??
    inscricoesDaTurma
      .filter((item) => item.status !== "cancelada" && item.status !== "lista_espera")
      .reduce((total, item) => total + Math.max(Number(item.sale_price) - Number(item.discount_amount || 0), 0), 0);
  const totalRecebido = resumoFinanceiro?.received_amount ?? 0;
  const vagasDisponiveis = Math.max(turma.capacity - vagasOcupadas, 0);
  const percentualOcupacao = turma.capacity > 0 ? (vagasOcupadas / turma.capacity) * 100 : 0;

  let statusExibicao: ClassDisplayStatus = "aberta";

  if (turma.status === "cancelled") {
    statusExibicao = "cancelada";
  } else if (turma.status === "draft") {
    statusExibicao = "rascunho";
  } else if (turma.status === "completed" || turma.status === "closed") {
    statusExibicao = "concluida";
  } else if (vagasOcupadas >= turma.capacity) {
    statusExibicao = "lotada";
  }

  return {
    ...turma,
    vagasOcupadas,
    vagasDisponiveis,
    vagasListaEspera,
    totalEsperado,
    totalRecebido,
    percentualOcupacao,
    statusExibicao,
  };
}

async function recalculateEnrollmentPayment(enrollmentId: string) {
  const { error } = await supabase.rpc("recalculate_class_enrollment_payment", {
    p_enrollment_id: enrollmentId,
  });

  if (error) {
    throw error;
  }
}

export async function listClasses(workspaceId: string) {
  const [classesResponse, enrollmentsResponse, financialSummaryResponse] = await Promise.all([
    supabase
      .from("classes")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("starts_at", { ascending: true })
      .returns<ClassRecord[]>(),
    supabase.from("class_enrollments").select("*").eq("workspace_id", workspaceId).returns<EnrollmentRecord[]>(),
    supabase
      .from("vw_class_financial_summary")
      .select("*")
      .eq("workspace_id", workspaceId)
      .returns<ClassFinancialSummaryRecord[]>(),
  ]);

  if (classesResponse.error) {
    throw classesResponse.error;
  }

  if (enrollmentsResponse.error) {
    throw enrollmentsResponse.error;
  }

  if (financialSummaryResponse.error && !isMissingFinancialViewError(financialSummaryResponse.error)) {
    throw financialSummaryResponse.error;
  }

  const financialSummaryByClassId = new Map(
    (financialSummaryResponse.data ?? []).map((item) => [item.class_id, item] as const),
  );

  return (classesResponse.data ?? []).map((turma) =>
    calcularMetricasDaTurma(turma, enrollmentsResponse.data ?? [], financialSummaryByClassId.get(turma.id) ?? null),
  );
}

export async function getClassDetail(classId: string) {
  const [
    classResponse,
    enrollmentsResponse,
    paymentsResponse,
    costsResponse,
    sessionsResponse,
    checkinsResponse,
    financialSummaryResponse,
  ] =
    await Promise.all([
      supabase.from("classes").select("*").eq("id", classId).single<ClassRecord>(),
      supabase
        .from("class_enrollments")
        .select("*, students(*)")
        .eq("class_id", classId)
        .order("enrolled_at", { ascending: false })
        .returns<EnrollmentRecord[]>(),
      supabase
        .from("class_payments")
        .select("*, students(*)")
        .eq("class_id", classId)
        .order("paid_at", { ascending: false })
        .returns<PaymentRecord[]>(),
      supabase
        .from("class_costs")
        .select("*")
        .eq("class_id", classId)
        .order("incurred_at", { ascending: false })
        .returns<CostRecord[]>(),
      supabase
        .from("class_attendance_sessions")
        .select("*")
        .eq("class_id", classId)
        .order("started_at", { ascending: false })
        .returns<AttendanceSessionRecord[]>(),
      supabase
        .from("class_attendance_checkins")
        .select("*")
        .eq("class_id", classId)
        .returns<AttendanceCheckinRecord[]>(),
      supabase
        .from("vw_class_financial_summary")
        .select("*")
        .eq("class_id", classId)
        .single<ClassFinancialSummaryRecord>(),
    ]);

  if (classResponse.error) {
    throw classResponse.error;
  }

  if (enrollmentsResponse.error) {
    throw enrollmentsResponse.error;
  }

  if (paymentsResponse.error) {
    throw paymentsResponse.error;
  }

  if (costsResponse.error) {
    throw costsResponse.error;
  }

  if (sessionsResponse.error) {
    throw sessionsResponse.error;
  }

  if (checkinsResponse.error) {
    throw checkinsResponse.error;
  }

  if (financialSummaryResponse.error && !isMissingFinancialViewError(financialSummaryResponse.error)) {
    throw financialSummaryResponse.error;
  }

  const resumoFinanceiro =
    financialSummaryResponse.data ??
    buildFinancialSummaryFallback(
      classResponse.data,
      enrollmentsResponse.data ?? [],
      paymentsResponse.data ?? [],
      costsResponse.data ?? [],
    );

  const turma = calcularMetricasDaTurma(
    classResponse.data,
    enrollmentsResponse.data ?? [],
    resumoFinanceiro,
  );

  const pagamentosPorInscricao = new Map<string, number>();
  for (const pagamento of paymentsResponse.data ?? []) {
    if (pagamento.status !== "paid") {
      continue;
    }

    pagamentosPorInscricao.set(
      pagamento.class_enrollment_id,
      (pagamentosPorInscricao.get(pagamento.class_enrollment_id) ?? 0) + Number(pagamento.amount),
    );
  }

  return {
    turma,
    resumoFinanceiro,
    inscricoes: (enrollmentsResponse.data ?? []).map((item) => ({
      ...item,
      student: item.students ?? null,
      totalPago: pagamentosPorInscricao.get(item.id) ?? 0,
    })),
    pagamentos: (paymentsResponse.data ?? []).map((item) => ({
      ...item,
      student: item.students ?? null,
    })),
    custos: costsResponse.data ?? [],
    sessoesChamada: sessionsResponse.data ?? [],
    checkinsAtivos: checkinsResponse.data ?? [],
  } satisfies ClassDetailData;
}

export async function saveClass(workspaceId: string, values: ClassFormValues, classId?: string) {
  if (!classId) {
    const count = await getActiveClassCount(workspaceId);

    if (count >= 1) {
      throw new Error("PLAN_LIMIT_CLASSES");
    }
  }

  const payload = {
    workspace_id: workspaceId,
    title: values.title.trim(),
    course_name: values.title.trim(),
    course_type: values.courseType,
    starts_at: combineDateAndTime(values.startDate, values.startTime),
    ends_at: combineDateAndTime(getEndDate(values.startDate, values.durationDays), values.endTime),
    duration_days: Math.max(1, values.durationDays),
    location_name: values.locationName.trim(),
    location_address: values.locationAddress.trim(),
    capacity: values.capacity,
    price_per_student: values.pricePerStudent,
    notes: values.notes.trim() || null,
    materials_included: values.materialsIncluded,
    materials_list: values.materialsIncluded ? values.materialsList.trim() || null : null,
    certificate_enabled: values.certificateEnabled,
    duration_hours: values.certificateEnabled ? values.durationHours : null,
  };

  if (classId) {
    const { error } = await supabase.from("classes").update(payload).eq("id", classId);
    if (error) {
      throw error;
    }
    return classId;
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      ...payload,
      status: "open" satisfies ClassStatus,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    throw error;
  }

  return data.id;
}

export async function duplicateClass(workspaceId: string, sourceClassId: string, values: ClassFormValues) {
  const novoId = await saveClass(workspaceId, values);
  const { data: custos, error } = await supabase
    .from("class_costs")
    .select("*")
    .eq("class_id", sourceClassId)
    .returns<CostRecord[]>();

  if (error) {
    throw error;
  }

  if ((custos ?? []).length > 0) {
    const { error: insertError } = await supabase.from("class_costs").insert(
      (custos ?? []).map((custo) => ({
        workspace_id: workspaceId,
        class_id: novoId,
        category: custo.category,
        description: custo.description,
        amount: custo.amount,
        incurred_at: custo.incurred_at,
        status: custo.status,
        notes: custo.notes,
      })),
    );

    if (insertError) {
      throw insertError;
    }
  }

  return novoId;
}

export async function updateClassLifecycleStatus(classId: string, status: ClassStatus) {
  const { error } = await supabase.from("classes").update({ status }).eq("id", classId);
  if (error) {
    throw error;
  }
}

export async function createEnrollment(workspaceId: string, classId: string, values: EnrollmentFormValues) {
  const confirmadaEm =
    values.status === "confirmada" || values.status === "compareceu" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("class_enrollments")
    .insert({
      workspace_id: workspaceId,
      class_id: classId,
      student_id: values.studentId,
      status: values.status,
      sale_price: values.salePrice,
      balance_due: values.salePrice,
      notes: values.notes.trim() || null,
      confirmed_at: confirmadaEm,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function updateEnrollment(
  enrollmentId: string,
  updates: Partial<Pick<EnrollmentRecord, "status" | "sale_price" | "notes" | "student_id">>,
) {
  const payload = {
    ...updates,
    notes: updates.notes?.trim() || null,
    confirmed_at:
      updates.status === "confirmada" || updates.status === "compareceu" ? new Date().toISOString() : undefined,
    cancelled_at: updates.status === "cancelada" ? new Date().toISOString() : undefined,
  };

  const { error } = await supabase.from("class_enrollments").update(payload).eq("id", enrollmentId);
  if (error) {
    throw error;
  }

  await recalculateEnrollmentPayment(enrollmentId);
}

export async function createPayment(workspaceId: string, classId: string, values: PaymentFormValues) {
  const { error } = await supabase.from("class_payments").insert({
    workspace_id: workspaceId,
    class_id: classId,
    class_enrollment_id: values.enrollmentId,
    student_id: values.studentId,
    amount: values.amount,
    description: values.description.trim() || null,
    receipt_url: values.receiptUrl.trim() || null,
    payment_type: values.paymentType,
    payment_method: values.paymentMethod,
    paid_at: values.paidAt,
    status: values.status,
    notes: values.notes.trim() || null,
  });

  if (error) {
    throw error;
  }
}

export async function createCost(workspaceId: string, classId: string, values: CostFormValues) {
  const { error } = await supabase.from("class_costs").insert({
    workspace_id: workspaceId,
    class_id: classId,
    category: values.category,
    description: values.description.trim() || null,
    amount: values.amount,
    incurred_at: values.incurredAt,
    status: values.status,
    notes: values.notes.trim() || null,
  });

  if (error) {
    throw error;
  }
}

export async function updatePayment(paymentId: string, values: PaymentFormValues) {
  const { error } = await supabase
    .from("class_payments")
    .update({
      class_enrollment_id: values.enrollmentId,
      student_id: values.studentId,
      amount: values.amount,
      description: values.description.trim() || null,
      receipt_url: values.receiptUrl.trim() || null,
      payment_type: values.paymentType,
      payment_method: values.paymentMethod,
      paid_at: values.paidAt,
      status: values.status,
      notes: values.notes.trim() || null,
    })
    .eq("id", paymentId);

  if (error) {
    throw error;
  }
}

export async function cancelPayment(paymentId: string) {
  const { error } = await supabase.from("class_payments").update({ status: "cancelled" satisfies PaymentStatus }).eq("id", paymentId);

  if (error) {
    throw error;
  }
}

export async function updateCost(costId: string, values: CostFormValues) {
  const { error } = await supabase
    .from("class_costs")
    .update({
      category: values.category,
      description: values.description.trim() || null,
      amount: values.amount,
      incurred_at: values.incurredAt,
      status: values.status,
      notes: values.notes.trim() || null,
    })
    .eq("id", costId);

  if (error) {
    throw error;
  }
}

export async function startAttendanceSession(workspaceId: string, classId: string, attendanceDate: string) {
  const { error: deactivateError } = await supabase
    .from("class_attendance_sessions")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq("class_id", classId)
    .eq("attendance_date", attendanceDate)
    .eq("is_active", true);

  if (deactivateError) {
    throw deactivateError;
  }

  const { data, error } = await supabase
    .from("class_attendance_sessions")
    .insert({
      workspace_id: workspaceId,
      class_id: classId,
      attendance_date: attendanceDate,
      is_active: true,
    })
    .select("*")
    .single<AttendanceSessionRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function endAttendanceSession(session: AttendanceSessionRecord, enrollments: EnrollmentRecord[]) {
  const { data: checkins, error: checkinsError } = await supabase
    .from("class_attendance_checkins")
    .select("*")
    .eq("session_id", session.id)
    .returns<AttendanceCheckinRecord[]>();

  if (checkinsError) {
    throw checkinsError;
  }

  const presentes = new Set((checkins ?? []).map((item) => item.enrollment_id));

  const updates = enrollments
    .filter((item) => ["confirmada", "aguardando_pagamento", "compareceu", "faltou"].includes(item.status))
    .map((item) =>
      supabase
        .from("class_enrollments")
        .update({
          status: presentes.has(item.id) ? "compareceu" : "faltou",
          attendance_marked_at: presentes.has(item.id) ? new Date().toISOString() : item.attendance_marked_at,
        })
        .eq("id", item.id),
    );

  const resultados = await Promise.all(updates);
  const erro = resultados.find((resultado) => resultado.error)?.error;
  if (erro) {
    throw erro;
  }

  const { error } = await supabase
    .from("class_attendance_sessions")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq("id", session.id);

  if (error) {
    throw error;
  }
}

export async function markAttendanceManually(enrollmentId: string, present: boolean) {
  const { error } = await supabase
    .from("class_enrollments")
    .update({
      status: present ? "compareceu" : "faltou",
      attendance_marked_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);

  if (error) {
    throw error;
  }
}

export async function getPublicAttendanceSession(token: string) {
  const { data, error } = await supabase
    .rpc("get_public_attendance_session", { p_token: token })
    .returns<
      Array<{
        session_id: string;
        class_id: string;
        class_title: string;
        attendance_date: string;
        is_active: boolean;
      }>
    >();

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

export async function getPublicAttendanceRoster(token: string) {
  const { data, error } = await supabase
    .rpc("get_public_attendance_roster", { p_token: token })
    .returns<
      Array<{
        enrollment_id: string;
        student_id: string;
        student_name: string;
        checked_in_at: string | null;
      }>
    >();

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    enrollmentId: item.enrollment_id,
    studentId: item.student_id,
    studentName: item.student_name,
    checkedInAt: item.checked_in_at,
  })) satisfies AttendanceRosterItem[];
}

export async function submitPublicAttendanceCheckin(token: string, enrollmentId: string) {
  const { data, error } = await supabase
    .rpc("submit_public_attendance_checkin", {
      p_token: token,
      p_enrollment_id: enrollmentId,
    })
    .returns<Array<{ session_id: string; checked_in_at: string }>>();

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}
