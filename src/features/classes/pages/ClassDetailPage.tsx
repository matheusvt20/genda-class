import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { ArrowLeft, QrCode, UserPlus, Wallet } from "lucide-react";
import { supabase } from "@/core/supabase/client";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ClassFormDialog } from "@/features/classes/components/ClassFormDialog";
import { CostFormDialog } from "@/features/classes/components/CostFormDialog";
import { EnrollmentFormDialog } from "@/features/classes/components/EnrollmentFormDialog";
import { PaymentFormDialog } from "@/features/classes/components/PaymentFormDialog";
import {
  cancelPayment,
  classStatusLabels,
  costCategoryLabels,
  createCost,
  createEnrollment,
  createPayment,
  duplicateClass,
  endAttendanceSession,
  enrollmentStatusLabels,
  findClassScheduleConflicts,
  getCourseTypeLabel,
  getClassDetail,
  markAttendanceManually,
  paymentMethodLabels,
  paymentStatusLabels,
  paymentTypeLabels,
  saveClass,
  startAttendanceSession,
  updateCost,
  updateClassLifecycleStatus,
  updateEnrollment,
    updatePayment,
    type AttendanceRosterItem,
    type ClassDetailData,
    type ClassFormValues,
    type CostRecord,
  type CostFormValues,
  type EnrollmentFormValues,
  type EnrollmentStatus,
    type PaymentRecord,
    type PaymentFormValues,
  } from "@/features/classes/services/classes.service";
import {
  confirmLeadEnrollment,
  getClassPublicSettings,
  listClassLeads,
  updateClassPublicSettings,
  updateLeadPixStatus,
  type ClassLead,
  type ClassPublicSettings,
} from "@/features/classes/services/public-sales.service";
import { listStudents, type StudentListItem } from "@/features/students/services/students.service";
import { formatarMoeda } from "@/lib/currency";
import { extrairHora, formatarData, formatarDataHora, formatarDataInput } from "@/lib/date";

const tabs = [
  { id: "geral", label: "Visão geral" },
  { id: "alunas", label: "Alunas" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "custos", label: "Custos" },
  { id: "resultado", label: "Resultado" },
  { id: "divulgacao", label: "Divulgação" },
  { id: "leads", label: "Leads" },
  { id: "chamada", label: "Chamada" },
];

type PublicClassFormValues = {
  isPublic: boolean;
  slug: string;
  salesHeadline: string;
  salesDescription: string;
  salesHighlights: string[];
  coverImageUrl: string;
  depositAmount: number;
  teacherPhotoUrl: string;
  videoUrl: string;
  galleryImages: string[];
  testimonials: TestimonialFormItem[];
  teacherName: string;
  teacherBio: string;
};

type TestimonialFormItem = {
  id: string;
  name: string;
  text: string;
  photoUrl: string;
};

type CertificateMeta = {
  schoolName: string;
  teacherName: string;
};

function badgeToneForStatus(status: string) {
  if (status.includes("pago") || status.includes("compareceu") || status.includes("conclu")) {
    return "verde";
  }

  if (status.includes("cancel")) {
    return "cinza";
  }

  if (status.includes("parcial") || status.includes("aguardando") || status.includes("lotada")) {
    return "laranja";
  }

  if (status.includes("lista")) {
    return "violeta";
  }

  return "azul";
}

function getHeaderStatusBadgeClass(status: string) {
  if (status === "aberta") {
    return "bg-[#DCFCE7] text-[#166534]";
  }

  if (status === "lotada") {
    return "bg-[#FEF3C7] text-[#A16207]";
  }

  if (status === "concluida") {
    return "bg-[#F1F5F9] text-[#475569]";
  }

  if (status === "cancelada") {
    return "bg-[#FEE2E2] text-[#DC2626]";
  }

  return "bg-[#EEF1FF] text-[#2D4EF5]";
}

function createTempId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return Number(digits || "0") / 100;
}

function getYoutubeThumbnailUrl(value: string) {
  const url = value.trim();

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    }
  } catch {
    return null;
  }

  return null;
}

async function handleFileUpload(file: File) {
  // TODO: quando o Supabase Storage for habilitado, trocar a conversao base64 por upload
  // e salvar aqui a URL publica retornada pelo Storage.
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Nao foi possivel ler o arquivo selecionado."));
    };

    reader.onerror = () => reject(reader.error ?? new Error("Falha ao carregar arquivo."));
    reader.readAsDataURL(file);
  });
}

function toClassFormValues(data: ClassDetailData["turma"]): ClassFormValues {
  return {
    title: data.title,
    courseType: data.course_type,
    startDate: formatarDataInput(data.starts_at),
    durationDays: data.duration_days,
    startTime: extrairHora(data.starts_at),
    endTime: extrairHora(data.ends_at ?? data.starts_at),
    locationName: data.location_name ?? "",
    locationAddress: data.location_address ?? "",
    capacity: data.capacity,
    pricePerStudent: data.price_per_student,
    notes: data.notes ?? "",
    materialsIncluded: data.materials_included,
    materialsList: data.materials_list ?? "",
    certificateEnabled: data.certificate_enabled,
    durationHours: data.duration_hours,
  };
}

function toLocalDateTimeInput(value: string) {
  return value.slice(0, 16);
}

function toPaymentFormValues(payment: PaymentRecord): PaymentFormValues {
  return {
    enrollmentId: payment.class_enrollment_id,
    studentId: payment.student_id,
    amount: payment.amount,
    description: payment.description ?? "",
    receiptUrl: payment.receipt_url ?? "",
    paymentType: payment.payment_type,
    paymentMethod: payment.payment_method,
    status: payment.status,
    paidAt: toLocalDateTimeInput(payment.paid_at),
    notes: payment.notes ?? "",
  };
}

function toCostFormValues(cost: CostRecord): CostFormValues {
  return {
    category: cost.category,
    description: cost.description ?? "",
    amount: cost.amount,
    incurredAt: cost.incurred_at,
    status: cost.status,
    notes: cost.notes ?? "",
  };
}

function toPublicClassFormValues(settings: ClassPublicSettings): PublicClassFormValues {
  return {
    isPublic: settings.is_public,
    slug: settings.slug ?? "",
    salesHeadline: settings.sales_headline ?? settings.course_name ?? settings.title,
    salesDescription: settings.sales_description ?? "",
    salesHighlights: settings.sales_highlights ?? [],
    coverImageUrl: settings.cover_image_url ?? "",
    depositAmount: Number(settings.deposit_amount ?? 0),
    teacherPhotoUrl: "",
    videoUrl: "",
    galleryImages: [],
    testimonials: [],
    teacherName: "",
    teacherBio: "",
  };
}

function getPaymentStatusLabel(status: PaymentRecord["status"]) {
  if (status === "paid") {
    return "Pago";
  }

  if (status === "pending") {
    return "Pendente";
  }

  return "Cancelado";
}

function getPixStatusTone(status: string) {
  if (status === "confirmado") {
    return "verde";
  }

  if (status === "enviado") {
    return "laranja";
  }

  if (status === "rejeitado") {
    return "rose";
  }

  if (status === "pendente") {
    return "cinza";
  }

  return "cinza";
}

function getPixStatusLabel(status: string) {
  if (status === "pendente") {
    return "Sinal pendente";
  }

  if (status === "enviado") {
    return "Comprovante enviado";
  }

  if (status === "confirmado") {
    return "Pagamento confirmado";
  }

  if (status === "rejeitado") {
    return "Rejeitado";
  }

  return status;
}

function normalizePhoneForComparison(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function matchesLeadWithStudent(lead: ClassLead, student: StudentListItem | { full_name: string; phone: string | null } | null) {
  if (!student) {
    return false;
  }

  const leadPhone = normalizePhoneForComparison(lead.phone);
  const studentPhone = normalizePhoneForComparison(student.phone);

  if (leadPhone && studentPhone && leadPhone === studentPhone) {
    return true;
  }

  return student.full_name.trim().toLowerCase() === lead.full_name.trim().toLowerCase();
}

function sanitizeCertificateFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateCertificatePdf(params: {
  schoolName: string;
  studentName: string;
  courseTitle: string;
  date: string;
  durationHours: number | null;
  teacherName: string;
}) {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const durationText =
    params.durationHours && params.durationHours > 0
      ? `${params.durationHours} horas`
      : "carga horária não informada";

  pdf.setDrawColor(45, 78, 245);
  pdf.setLineWidth(1.2);
  pdf.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 6, 6, "S");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.setTextColor(15, 23, 42);
  pdf.text(params.schoolName || "Escola", centerX, 34, { align: "center" });

  pdf.setFontSize(30);
  pdf.setTextColor(45, 78, 245);
  pdf.text("CERTIFICADO", centerX, 56, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(16);
  pdf.setTextColor(51, 65, 85);
  pdf.text("Certificamos que", centerX, 80, { align: "center" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.setTextColor(15, 23, 42);
  pdf.text(params.studentName, centerX, 96, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(16);
  pdf.setTextColor(51, 65, 85);
  pdf.text("concluiu com êxito o curso", centerX, 114, { align: "center" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(15, 23, 42);
  pdf.text(params.courseTitle, centerX, 128, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `realizado em ${params.date} com carga horária de ${durationText}`,
    centerX,
    144,
    { align: "center" },
  );

  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.4);
  pdf.line(centerX - 38, 176, centerX + 38, 176);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(15, 23, 42);
  pdf.text(params.teacherName || "Professora responsável", centerX, 184, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(100, 116, 139);
  pdf.text("Assinatura", centerX, 191, { align: "center" });

  pdf.save(`${sanitizeCertificateFileName(params.studentName)}-certificado.pdf`);
}

function ResultadoFinanceiro({ data }: { data: ClassDetailData }) {
  const resumo = data.resumoFinanceiro;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[
        ["Faturamento esperado", formatarMoeda(resumo.expected_revenue)],
        ["Faturamento realizado", formatarMoeda(resumo.received_amount)],
        ["Em aberto", formatarMoeda(resumo.open_amount)],
        ["Custos previstos", formatarMoeda(resumo.expected_costs)],
        ["Custos realizados", formatarMoeda(resumo.realized_costs)],
        ["Lucro estimado", formatarMoeda(resumo.estimated_profit)],
        ["Lucro realizado", formatarMoeda(resumo.realized_profit)],
        ["Margem", `${Number(resumo.realized_margin_percent).toFixed(1)}%`],
        ["Ponto de equilíbrio", `${Number(resumo.break_even_students).toFixed(1)} alunas`],
      ].map(([titulo, valor]) => (
        <Card key={titulo} className="space-y-2">
          <p className="text-sm text-slate-500">{titulo}</p>
          <p className="text-2xl font-semibold text-slate-900">{valor}</p>
        </Card>
      ))}
    </div>
  );
}

function AttendanceQRCode({ token }: { token: string }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    const url = `${window.location.origin}/presenca/${token}`;
    void QRCode.toDataURL(url, {
      width: 420,
      margin: 1,
      color: {
        dark: "#2D4EF5",
        light: "#FFFFFF",
      },
    }).then(setSrc);
  }, [token]);

  if (!src) {
    return <div className="flex min-h-72 items-center justify-center text-sm text-slate-500">Gerando QR Code...</div>;
  }

  return <img src={src} alt="QR Code da chamada" className="mx-auto w-full max-w-sm rounded-[28px] bg-white p-4" />;
}

export function ClassDetailPage() {
  const { id } = useParams();
  const { workspace } = useAuth();
  const [data, setData] = useState<ClassDetailData | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [publicSettings, setPublicSettings] = useState<ClassPublicSettings | null>(null);
  const [publicForm, setPublicForm] = useState<PublicClassFormValues>({
    isPublic: false,
    slug: "",
    salesHeadline: "",
    salesDescription: "",
    salesHighlights: [],
    coverImageUrl: "",
    depositAmount: 0,
  });
  const [leads, setLeads] = useState<ClassLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("geral");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedCostId, setSelectedCostId] = useState<string | null>(null);
  const [leadsFilter, setLeadsFilter] = useState("todos");
  const [saving, setSaving] = useState(false);
  const [publicSaving, setPublicSaving] = useState(false);
  const [leadUpdatingId, setLeadUpdatingId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [highlightDraft, setHighlightDraft] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const reconciledLeadIdsRef = useRef<Set<string>>(new Set());
  const [certificateMeta, setCertificateMeta] = useState<CertificateMeta>({
    schoolName: "Escola",
    teacherName: "Professora responsável",
  });
  const [certificateGeneratingId, setCertificateGeneratingId] = useState<string | null>(null);

  const activeSession = data?.sessoesChamada.find((item) => item.is_active) ?? null;

  async function loadData(options?: { showLoading?: boolean; preservePublicForm?: boolean }) {
    if (!id || !workspace?.id) {
      return;
    }

    const showLoading = options?.showLoading ?? !data;
    const preservePublicForm = options?.preservePublicForm ?? false;

    if (showLoading) {
      setLoading(true);
    }

    if (!data) {
      setError(null);
    }

    try {
      const [detail, studentList, currentPublicSettings] = await Promise.all([
        getClassDetail(id),
        listStudents(workspace.id),
        getClassPublicSettings(id),
      ]);

      const classLeads = await listClassLeads(id).catch(() => []);
      const [workspaceSettingsResponse, classCertificateResponse] = await Promise.all([
        supabase
          .from("workspace_settings")
          .select("school_name")
          .eq("workspace_id", workspace.id)
          .maybeSingle<{ school_name: string | null }>(),
        supabase
          .from("classes")
          .select("teacher_name")
          .eq("id", id)
          .maybeSingle<{ teacher_name: string | null }>(),
      ]);

      if (workspaceSettingsResponse.error) {
        throw workspaceSettingsResponse.error;
      }

      if (classCertificateResponse.error) {
        throw classCertificateResponse.error;
      }

      setData(detail);
      setStudents(studentList);
      setPublicSettings(currentPublicSettings);
      setCertificateMeta({
        schoolName: workspaceSettingsResponse.data?.school_name?.trim() || "Escola",
        teacherName: classCertificateResponse.data?.teacher_name?.trim() || "Professora responsável",
      });
      if (!preservePublicForm) {
        setPublicForm(toPublicClassFormValues(currentPublicSettings));
      }
      setLeads(classLeads);
    } catch (err) {
      if (!data) {
        setError(err instanceof Error ? err.message : "Não foi possível carregar esta turma.");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadData({ showLoading: true });
  }, [id, workspace?.id]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadData({ showLoading: false, preservePublicForm: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeSession?.id]);

  useEffect(() => {
    if (activeTab !== "leads") {
      return;
    }

    void loadData({ showLoading: false, preservePublicForm: true });

    const interval = window.setInterval(() => {
      void loadData({ showLoading: false, preservePublicForm: true });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeTab, id, workspace?.id]);

  useEffect(() => {
    if (activeTab !== "leads") {
      return;
    }

    const legacyLeads = leads.filter((lead) => lead.needs_pix_status_backfill);

    if (legacyLeads.length === 0) {
      return;
    }

    void Promise.all(legacyLeads.map((lead) => updateLeadPixStatus(lead.id, "pendente").catch(() => null))).then(() => {
      void loadData({ showLoading: false, preservePublicForm: true });
    });
  }, [activeTab, leads]);

  useEffect(() => {
    if (!data || !publicSettings || leads.length === 0 || !workspace?.id) {
      return;
    }

    const confirmedLeadsToReconcile = leads.filter((lead) => {
      if (lead.pix_status !== "confirmado") {
        return false;
      }

      if (reconciledLeadIdsRef.current.has(lead.id)) {
        return false;
      }

      const matchingEnrollment = data.inscricoes.find((enrollment) => matchesLeadWithStudent(lead, enrollment.student));

      if (!matchingEnrollment) {
        return true;
      }

      const depositAmount = Number(publicSettings.deposit_amount ?? 0);

      if (depositAmount <= 0) {
        return matchingEnrollment.status !== "confirmada";
      }

      const hasDepositPayment = data.pagamentos.some(
        (payment) =>
          payment.class_enrollment_id === matchingEnrollment.id &&
          payment.payment_type === "deposito" &&
          payment.status === "paid",
      );

      return matchingEnrollment.status !== "confirmada" || !hasDepositPayment;
    });

    if (confirmedLeadsToReconcile.length === 0) {
      return;
    }

    confirmedLeadsToReconcile.forEach((lead) => {
      reconciledLeadIdsRef.current.add(lead.id);
    });

    void Promise.all(
      confirmedLeadsToReconcile.map((lead) =>
        confirmLeadEnrollment({
          leadId: lead.id,
          workspaceId: workspace.id,
          classId: data.turma.id,
          fullName: lead.full_name,
          phone: lead.phone,
          instagram: lead.instagram,
          salePrice: Number(data.turma.price_per_student),
          depositAmount: Number(publicSettings.deposit_amount ?? 0),
        }).catch(() => null),
      ),
    ).then(() => {
      void loadData({ showLoading: false, preservePublicForm: true });
    });
  }, [data, leads, publicSettings, workspace?.id]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !data || !workspace?.id || !publicSettings) {
    return (
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-rose-600">Erro ao carregar turma</p>
        <h2 className="text-2xl font-semibold text-slate-900">Não foi possível abrir os detalhes desta turma.</h2>
        <p className="text-sm text-slate-500">{error ?? "Tente novamente em instantes."}</p>
        <div>
          <Button variante="secundaria" onClick={() => void loadData()}>
            Tentar novamente
          </Button>
        </div>
      </Card>
    );
  }

  const formValues = toClassFormValues(data.turma);
  const duplicateValues: ClassFormValues = {
    ...formValues,
    startDate: "",
  };
  const selectedEnrollment = data.inscricoes.find((item) => item.id === selectedEnrollmentId) ?? null;
  const selectedPayment = data.pagamentos.find((item) => item.id === selectedPaymentId) ?? null;
  const selectedCost = data.custos.find((item) => item.id === selectedCostId) ?? null;
  const paymentEnrollments = data.inscricoes
    .filter((item) => item.status !== "cancelada" && item.student)
    .map((item) => ({
      id: item.id,
      studentId: item.student_id,
      studentName: item.student?.full_name ?? "Aluna",
      salePrice: Number(item.sale_price),
      totalPaid: Number(item.totalPago),
      balanceDue: Number(item.balance_due),
    }));

  const paymentInitialValues: PaymentFormValues = selectedPayment
    ? toPaymentFormValues(selectedPayment)
    : {
        enrollmentId: selectedEnrollment?.id ?? paymentEnrollments[0]?.id ?? "",
        studentId: selectedEnrollment?.student_id ?? paymentEnrollments[0]?.studentId ?? "",
        amount: Number(selectedEnrollment?.balance_due ?? paymentEnrollments[0]?.balanceDue ?? 0),
        description: "",
        receiptUrl: "",
        paymentType: "parcela",
        paymentMethod: "pix",
        status: "paid",
        paidAt: new Date().toISOString().slice(0, 16),
        notes: "",
      };

  const costInitialValues: CostFormValues = {
    category: "materiais",
    description: "",
    amount: 0,
    incurredAt: new Date().toISOString().slice(0, 10),
    status: "previsto",
    notes: "",
  };

  async function withRefresh(action: () => Promise<void>) {
    setSaving(true);
    try {
      await action();
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function confirmarConflitos(values: ClassFormValues, classIdToIgnore?: string) {
    const conflitos = await findClassScheduleConflicts(workspace.id, values, classIdToIgnore);

    if (conflitos.length === 0) {
      return true;
    }

    const mensagem = [
      "Já existem turmas cadastradas nesse mesmo período:",
      ...conflitos.map(
        (conflito) =>
          `- ${conflito.title} (${conflito.overlappingDates
            .map((data) => new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR"))
            .join(", ")})`,
      ),
      "",
      "Deseja salvar mesmo assim?",
    ].join("\n");

    return window.confirm(mensagem);
  }

  async function handleEditClass(values: ClassFormValues) {
    await withRefresh(async () => {
      const podeSalvar = await confirmarConflitos(values, data.turma.id);

      if (!podeSalvar) {
        return;
      }

      await saveClass(workspace.id, values, data.turma.id);
      setEditDialogOpen(false);
    });
  }

  async function handleDuplicateClass(values: ClassFormValues) {
    await withRefresh(async () => {
      const podeSalvar = await confirmarConflitos(values);

      if (!podeSalvar) {
        return;
      }

      await duplicateClass(workspace.id, data.turma.id, values);
      setDuplicateDialogOpen(false);
    });
  }

  async function handleCreateEnrollment(values: EnrollmentFormValues) {
    await withRefresh(async () => {
      await createEnrollment(workspace.id, data.turma.id, values);
      setEnrollmentDialogOpen(false);
    });
  }

  async function handleCreatePayment(values: PaymentFormValues) {
    await withRefresh(async () => {
      await createPayment(workspace.id, data.turma.id, {
        ...values,
        paidAt: new Date(values.paidAt).toISOString(),
      });
      setPaymentDialogOpen(false);
      setSelectedEnrollmentId(null);
    });
  }

  async function handleUpdatePayment(values: PaymentFormValues) {
    if (!selectedPayment) {
      return;
    }

    await withRefresh(async () => {
      await updatePayment(selectedPayment.id, {
        ...values,
        paidAt: new Date(values.paidAt).toISOString(),
      });
      setPaymentDialogOpen(false);
      setSelectedPaymentId(null);
    });
  }

  async function handleCancelPayment(payment: PaymentRecord) {
    if (!window.confirm("Cancelar este pagamento? O saldo da inscrição será recalculado.")) {
      return;
    }

    await withRefresh(async () => {
      await cancelPayment(payment.id);
    });
  }

  async function handleCreateCost(values: CostFormValues) {
    await withRefresh(async () => {
      await createCost(workspace.id, data.turma.id, values);
      setCostDialogOpen(false);
    });
  }

  async function handleUpdateCost(values: CostFormValues) {
    if (!selectedCost) {
      return;
    }

    await withRefresh(async () => {
      await updateCost(selectedCost.id, values);
      setCostDialogOpen(false);
      setSelectedCostId(null);
    });
  }

  async function handleStatusChange(status: "completed" | "cancelled") {
    const mensagem =
      status === "completed" ? "Encerrar esta turma agora?" : "Cancelar esta turma? Essa ação pode impactar pagamentos.";

    if (!window.confirm(mensagem)) {
      return;
    }

    await withRefresh(async () => {
      await updateClassLifecycleStatus(data.turma.id, status);
    });
  }

  async function handleUpdateEnrollmentStatus(enrollmentId: string, status: EnrollmentStatus) {
    await withRefresh(async () => {
      await updateEnrollment(enrollmentId, { status });
    });
  }

  async function handleStartAttendance() {
    await withRefresh(async () => {
      await startAttendanceSession(workspace.id, data.turma.id, new Date().toISOString().slice(0, 10));
    });
  }

  async function handleEndAttendance() {
    if (!activeSession) {
      return;
    }

    await withRefresh(async () => {
      await endAttendanceSession(activeSession, data.inscricoes);
    });
  }

  async function handleManualAttendance(enrollmentId: string, present: boolean) {
    await withRefresh(async () => {
      await markAttendanceManually(enrollmentId, present);
    });
  }

  function handleGenerateCertificate(enrollmentId: string) {
    const enrollment = data.inscricoes.find((item) => item.id === enrollmentId);

    if (!enrollment?.student) {
      return;
    }

    setCertificateGeneratingId(enrollmentId);

    try {
      generateCertificatePdf({
        schoolName: certificateMeta.schoolName,
        studentName: enrollment.student.full_name,
        courseTitle: data.turma.course_name ?? data.turma.title,
        date: formatarData(data.turma.starts_at),
        durationHours: data.turma.duration_hours,
        teacherName: certificateMeta.teacherName,
      });
      setSuccessToast("Certificado gerado com sucesso");
      window.setTimeout(() => setSuccessToast(null), 3000);
    } finally {
      setCertificateGeneratingId(null);
    }
  }

  const activeCheckins = new Set(
    (data.checkinsAtivos ?? [])
      .filter((item) => item.session_id === activeSession?.id)
      .map((item) => item.enrollment_id),
  );

  const attendanceRoster: AttendanceRosterItem[] = data.inscricoes
    .filter((item) => ["confirmada", "aguardando_pagamento", "compareceu", "faltou"].includes(item.status))
    .map((item) => ({
      enrollmentId: item.id,
      studentId: item.student_id,
      studentName: item.student?.full_name ?? "Aluna",
      checkedInAt: activeCheckins.has(item.id) ? item.attendance_marked_at ?? new Date().toISOString() : null,
    }));

  const publicUrl = publicForm.slug ? `${window.location.origin}/curso/${publicForm.slug}` : null;
  const filteredLeads =
    leadsFilter === "todos" ? leads : leads.filter((item) => item.pix_status === leadsFilter);
  const courseTypeLabel = getCourseTypeLabel(data.turma.course_type);
  const occupancyPercent = Math.max(0, Math.min(100, data.turma.percentualOcupacao));
  const depositAmountLabel =
    Number(publicSettings.deposit_amount ?? 0) > 0
      ? formatarMoeda(Number(publicSettings.deposit_amount ?? 0))
      : "não configurado";
  const scheduleLabel = `${formatarData(data.turma.starts_at)} · ${extrairHora(data.turma.starts_at)}–${extrairHora(
    data.turma.ends_at ?? data.turma.starts_at,
  )}`;
  const videoThumbnailUrl = getYoutubeThumbnailUrl(publicForm.videoUrl);
  const overviewHighlights = [
    data.turma.materials_included ? "Kit incluso" : null,
    data.turma.certificate_enabled ? "Certificado" : null,
    data.custos.some((item) => item.category === "coffee") ? "Coffee" : null,
  ].filter((item): item is string => Boolean(item));

  function resetPublicForm() {
    if (!publicSettings) {
      return;
    }

    setPublicForm(toPublicClassFormValues(publicSettings));
    setHighlightDraft("");
    setCopyMessage(null);
  }

  function addHighlight() {
    const value = highlightDraft.trim();

    if (!value) {
      return;
    }

    setPublicForm((current) => ({
      ...current,
      salesHighlights: [...current.salesHighlights, value],
    }));
    setHighlightDraft("");
  }

  async function updateImageField(event: ChangeEvent<HTMLInputElement>, field: "teacherPhotoUrl" | "coverImageUrl") {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileUrl = await handleFileUpload(file);
    setPublicForm((current) => ({ ...current, [field]: fileUrl }));
    event.target.value = "";
  }

  async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const uploadedImages = await Promise.all(files.map((file) => handleFileUpload(file)));
    setPublicForm((current) => ({
      ...current,
      galleryImages: [...current.galleryImages, ...uploadedImages],
    }));
    event.target.value = "";
  }

  async function handleTestimonialPhotoUpload(event: ChangeEvent<HTMLInputElement>, testimonialId: string) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const fileUrl = await handleFileUpload(file);
    setPublicForm((current) => ({
      ...current,
      testimonials: current.testimonials.map((item) =>
        item.id === testimonialId ? { ...item, photoUrl: fileUrl } : item,
      ),
    }));
    event.target.value = "";
  }

  async function handleSavePublicSettings() {
    setPublicSaving(true);
    try {
      await updateClassPublicSettings(data.turma.id, {
        is_public: publicForm.isPublic,
        slug: publicForm.slug,
        sales_headline: publicForm.salesHeadline,
        sales_description: publicForm.salesDescription,
        sales_highlights: publicForm.salesHighlights,
        cover_image_url: publicForm.coverImageUrl,
        deposit_amount: publicForm.depositAmount,
      });
      await loadData();
    } finally {
      setPublicSaving(false);
    }
  }

  async function handleCopyPublicUrl() {
    if (!publicUrl) {
      return;
    }

    await navigator.clipboard.writeText(publicUrl);
    setCopyMessage("URL copiada com sucesso.");
    window.setTimeout(() => setCopyMessage(null), 2000);
  }

  async function handleUpdateLead(leadId: string, pixStatus: "confirmado" | "rejeitado") {
    setLeadUpdatingId(leadId);
    try {
      await updateLeadPixStatus(leadId, pixStatus);
      await loadData();
    } finally {
      setLeadUpdatingId(null);
    }
  }

  async function handleConfirmLead(lead: ClassLead) {
    setLeadUpdatingId(lead.id);

    try {
      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                pix_status: "confirmado",
                status: "inscrito",
              }
            : item,
        ),
      );

      await confirmLeadEnrollment({
        leadId: lead.id,
        workspaceId: workspace.id,
        classId: data.turma.id,
        fullName: lead.full_name,
        phone: lead.phone,
        instagram: lead.instagram,
        salePrice: Number(data.turma.price_per_student),
        depositAmount: Number(publicSettings.deposit_amount ?? 0),
      });
      await loadData({ showLoading: false, preservePublicForm: true });
      window.setTimeout(() => {
        void loadData({ showLoading: false, preservePublicForm: true });
      }, 250);
      window.setTimeout(() => {
        void loadData({ showLoading: false, preservePublicForm: true });
      }, 1000);
      setSuccessToast("Aluna confirmada e inscrição criada com sucesso");
      window.setTimeout(() => setSuccessToast(null), 3000);
    } catch (error) {
      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                pix_status: lead.pix_status,
                status: lead.status,
              }
            : item,
        ),
      );
      throw error;
    } finally {
      setLeadUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {successToast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {successToast}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <Link to="/turmas" className="inline-flex items-center gap-2 text-[15px] font-medium text-[#2D4EF5]">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
            <div className="hidden h-12 w-px bg-slate-200 sm:block" />
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[17px] font-medium text-slate-900">{data.turma.title}</h2>
                <span className="inline-flex items-center rounded-full bg-[#EEF1FF] px-3 py-1 text-[11px] font-medium text-[#2D4EF5]">
                  {courseTypeLabel}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${getHeaderStatusBadgeClass(
                    data.turma.statusExibicao,
                  )}`}
                >
                  {classStatusLabels[data.turma.statusExibicao]}
                </span>
              </div>
              <p className="text-xs text-slate-500">{scheduleLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variante="secundaria"
              className="h-9 rounded-lg px-3 text-xs font-medium"
              onClick={() => setEditDialogOpen(true)}
            >
              Editar
            </Button>
            <Button
              variante="secundaria"
              className="h-9 rounded-lg px-3 text-xs font-medium"
              onClick={() => setDuplicateDialogOpen(true)}
            >
              Duplicar
            </Button>
            <Button
              variante="secundaria"
              className="h-9 rounded-lg border-rose-200 px-3 text-xs font-medium text-rose-600 hover:bg-rose-50"
              onClick={() => void handleStatusChange("completed")}
            >
              Encerrar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-slate-200 md:grid-cols-4">
          <div className="border-b border-r border-slate-200 px-4 py-[10px] md:border-b-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Vagas</p>
            <p className="mt-1 text-[18px] font-medium text-slate-900">
              {data.turma.vagasOcupadas}/{data.turma.capacity}
            </p>
            <div
              style={{
                marginTop: 6,
                height: 3,
                background: "#f1f3f7",
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  width: `${occupancyPercent}%`,
                  height: "100%",
                  background: "#2D4EF5",
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
          <div className="border-b border-slate-200 px-4 py-[10px] md:border-b-0 md:border-r">
            <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Esperado</p>
            <p className="mt-1 text-[18px] font-medium text-slate-900">{formatarMoeda(data.resumoFinanceiro.expected_revenue)}</p>
          </div>
          <div className="border-r border-slate-200 px-4 py-[10px]">
            <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Recebido</p>
            <p className="mt-1 text-[18px] font-medium text-[#16A34A]">{formatarMoeda(data.resumoFinanceiro.received_amount)}</p>
          </div>
          <div className="px-4 py-[10px]">
            <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Pendente</p>
            <p className="mt-1 text-[18px] font-medium text-[#E5780A]">{formatarMoeda(data.resumoFinanceiro.open_amount)}</p>
          </div>
        </div>

        <div className="overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-4 text-sm font-medium transition ${
                    active
                      ? "border-[#2D4EF5] bg-[#EEF1FF] text-[#2D4EF5]"
                      : "border-transparent bg-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "geral" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className="space-y-4"
                style={{
                  background: "var(--color-background-secondary, #F8FAFC)",
                  borderRadius: "var(--border-radius-md, 16px)",
                  padding: "12px 16px",
                }}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Informações</p>
                <div className="space-y-3">
                  {[
                    ["Data", formatarData(data.turma.starts_at)],
                    [
                      "Horário",
                      `${extrairHora(data.turma.starts_at)}–${extrairHora(data.turma.ends_at ?? data.turma.starts_at)}`,
                    ],
                    ["Local", data.turma.location_name || "A definir"],
                    ["Duração", data.turma.duration_days === 1 ? "1 dia" : `${data.turma.duration_days} dias`],
                    ["Preço por aluna", formatarMoeda(data.turma.price_per_student)],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[auto_1fr] items-start gap-4 text-xs">
                      <p className="text-slate-500">{label}</p>
                      <p className="justify-self-end text-right font-semibold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="space-y-4"
                style={{
                  background: "var(--color-background-secondary, #F8FAFC)",
                  borderRadius: "var(--border-radius-md, 16px)",
                  padding: "12px 16px",
                }}
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.05em] text-slate-500">Observações</p>
                <p className="text-xs leading-[1.6] text-slate-500">{data.turma.notes || "Sem observações cadastradas para esta turma."}</p>
                <div className="flex flex-wrap gap-2">
                  {overviewHighlights.length > 0 ? (
                    overviewHighlights.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center rounded-full bg-[#EEF1FF] px-3 py-1 text-[11px] font-medium text-[#2D4EF5]"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Nenhum diferencial destacado.</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

      {activeTab === "alunas" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              {data.inscricoes.filter((item) => item.status === "confirmada").length} confirmadas •{" "}
              {data.inscricoes.filter((item) => item.status === "lista_espera").length} na lista de espera •{" "}
              {data.turma.vagasDisponiveis} vagas disponíveis
            </div>
            <Button className="gap-2" onClick={() => setEnrollmentDialogOpen(true)}>
              <UserPlus className="size-4" />
              Adicionar aluna
            </Button>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white">
            {data.inscricoes.map((inscricao) => (
              <div key={inscricao.id} className="border-b border-slate-200/80 px-4 py-3 last:border-b-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-slate-900">
                        {inscricao.student?.full_name || "Aluna"}
                      </h3>
                      <Badge tom={badgeToneForStatus(inscricao.status)}>
                        {enrollmentStatusLabels[inscricao.status]}
                      </Badge>
                      <Badge tom={badgeToneForStatus(inscricao.payment_status)}>
                        {paymentStatusLabels[inscricao.payment_status]}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[14px] font-semibold text-slate-900">
                      {formatarMoeda(inscricao.totalPago)} / {formatarMoeda(inscricao.sale_price)}
                    </p>
                    <p className="text-xs text-slate-500">Saldo {formatarMoeda(inscricao.balance_due)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Link
                    to={`/alunas/${inscricao.student_id}`}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-[#EEF1FF] px-3 text-[12px] font-medium text-[#2D4EF5] transition hover:bg-[#dfe5ff]"
                  >
                    Ver ficha
                  </Link>
                  <Button
                    variante="secundaria"
                    className="h-8 border-none px-3 text-[12px] font-medium text-slate-700 shadow-none hover:bg-slate-100"
                    onClick={() => {
                      setSelectedEnrollmentId(inscricao.id);
                      setPaymentDialogOpen(true);
                    }}
                  >
                    Registrar pagamento
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "pagamentos" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.05em] text-slate-500">Total recebido</p>
              <p className="text-[18px] font-semibold text-slate-900">
                {formatarMoeda(data.resumoFinanceiro.received_amount)}
              </p>
            </div>
            <Button
              className="gap-2"
              onClick={() => {
                const firstEnrollment = data.inscricoes[0];
                if (!firstEnrollment) {
                  return;
                }
                setSelectedEnrollmentId(firstEnrollment.id);
                setPaymentDialogOpen(true);
              }}
            >
              <Wallet className="size-4" />
              Registrar pagamento
            </Button>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white">
            {data.pagamentos.map((pagamento) => (
              <div key={pagamento.id} className="border-b border-slate-200/80 px-4 py-3 last:border-b-0">
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto_auto] lg:items-center lg:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-slate-900">
                      {pagamento.description || getPaymentStatusLabel(pagamento.status)}
                    </p>
                  </div>
                  <div className="min-w-0 text-sm text-slate-500">
                    {pagamento.student?.full_name || "Sem aluna vinculada"}
                  </div>
                  <div className="text-sm text-slate-500">{formatarDataHora(pagamento.paid_at)}</div>
                  <div className="text-[14px] font-semibold text-slate-900">{formatarMoeda(pagamento.amount)}</div>
                  <div>
                    <Badge tom={badgeToneForStatus(pagamento.status)}>{getPaymentStatusLabel(pagamento.status)}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-slate-500 lg:mt-0">
                  <span>Tipo: {paymentTypeLabels[pagamento.payment_type]}</span>
                  <span>Método: {paymentMethodLabels[pagamento.payment_method]}</span>
                  {pagamento.receipt_url ? (
                    <a
                      href={pagamento.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[#2D4EF5]"
                    >
                      Ver comprovante
                    </a>
                  ) : null}
                  {pagamento.notes ? <span>Obs.: {pagamento.notes}</span> : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variante="secundaria"
                    className="h-7 border-none px-3 text-[11px] font-medium text-slate-600 shadow-none hover:bg-slate-100"
                    onClick={() => {
                      setSelectedPaymentId(pagamento.id);
                      setSelectedEnrollmentId(pagamento.class_enrollment_id);
                      setPaymentDialogOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  {pagamento.status !== "cancelled" ? (
                    <Button
                      variante="secundaria"
                      className="h-7 border-none px-3 text-[11px] font-medium text-slate-600 shadow-none hover:bg-slate-100"
                      onClick={() => void handleCancelPayment(pagamento)}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "custos" ? (
        <div className="space-y-4">
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-6">
              <div>
                <p className="text-sm text-slate-500">Total previsto</p>
                <p className="text-xl font-semibold text-slate-900">{formatarMoeda(data.resumoFinanceiro.expected_costs)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total realizado</p>
                <p className="text-xl font-semibold text-slate-900">{formatarMoeda(data.resumoFinanceiro.realized_costs)}</p>
              </div>
            </div>
            <Button className="gap-2" onClick={() => setCostDialogOpen(true)}>
              Adicionar custo
            </Button>
          </Card>

          {data.custos.map((custo) => (
            <Card key={custo.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{costCategoryLabels[custo.category]}</h3>
                <p className="text-sm text-slate-500">
                  {custo.description || "Sem descrição"} • {formatarData(custo.incurred_at)}
                </p>
                {custo.notes ? <p className="text-sm text-slate-500">{custo.notes}</p> : null}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-slate-900">{formatarMoeda(custo.amount)}</p>
                <Badge tom={custo.status === "realizado" ? "verde" : "laranja"}>
                  {custo.status === "realizado" ? "Realizado" : "Previsto"}
                </Badge>
              </div>
              <div className="sm:ml-auto">
                <Button
                  variante="secundaria"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSelectedCostId(custo.id);
                    setCostDialogOpen(true);
                  }}
                >
                  Editar custo
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "resultado" ? <ResultadoFinanceiro data={data} /> : null}

      {activeTab === "divulgacao" ? (
        <Card className="space-y-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-0 shadow-soft">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setPublicForm((current) => ({ ...current, isPublic: !current.isPublic }))}
                className="relative inline-flex h-7 w-12 rounded-full transition"
                style={{ background: publicForm.isPublic ? "#2D4EF5" : "#CBD5E1" }}
              >
                <span
                  className="absolute top-1 size-5 rounded-full bg-white shadow transition"
                  style={{ left: publicForm.isPublic ? "24px" : "4px" }}
                />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-900">Publicar turma</p>
                <p className="text-sm text-slate-500">Controle a visibilidade da página pública de vendas.</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${
                  publicForm.isPublic ? "bg-[#DCFCE7] text-[#166534]" : "bg-slate-100 text-slate-500"
                }`}
              >
                {publicForm.isPublic ? "Publicada" : "Rascunho"}
              </span>
            </div>

            <a
              href={publicUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium ${
                publicUrl ? "bg-[#EEF1FF] text-[#2D4EF5]" : "bg-slate-100 text-slate-400 pointer-events-none"
              }`}
            >
              Ver página pública ↗
            </a>
          </div>

          <div className="space-y-6 px-5 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700" htmlFor="class-public-slug">
                  Slug
                </label>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    id="class-public-slug"
                    value={publicForm.slug}
                    onChange={(event) => setPublicForm((current) => ({ ...current, slug: event.target.value }))}
                    placeholder="iniciantes-molde-f1"
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  />
                  <Button variante="secundaria" className="h-11 px-4" onClick={() => void handleCopyPublicUrl()}>
                    Copiar
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500">{publicUrl ?? "Defina um slug para gerar a URL pública."}</p>
                {copyMessage ? <p className="text-xs font-medium text-emerald-600">{copyMessage}</p> : null}
              </div>

              <Input
                id="class-deposit-amount"
                label="Valor do sinal"
                type="text"
                value={formatarMoeda(publicForm.depositAmount)}
                onChange={(event) =>
                  setPublicForm((current) => ({ ...current, depositAmount: parseCurrencyInput(event.target.value) }))
                }
              />
            </div>

            <Input
              id="class-sales-headline"
              label="Headline"
              value={publicForm.salesHeadline}
              onChange={(event) => setPublicForm((current) => ({ ...current, salesHeadline: event.target.value }))}
              placeholder="Ex.: Aprenda Molde F1 do zero ao avançado"
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <Textarea
                id="class-sales-description"
                label="Descrição"
                rows={4}
                value={publicForm.salesDescription}
                onChange={(event) => setPublicForm((current) => ({ ...current, salesDescription: event.target.value }))}
              />

              <div className="space-y-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Foto da professora</span>
                  <input
                    type="file"
                    accept=".webp,.jpg,.png"
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                    onChange={(event) => void updateImageField(event, "teacherPhotoUrl")}
                  />
                </label>
                {publicForm.teacherPhotoUrl ? (
                  <img
                    src={publicForm.teacherPhotoUrl}
                    alt="Foto da professora"
                    className="h-36 w-full rounded-2xl object-cover"
                  />
                ) : null}

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Imagem de fundo do hero</span>
                  <input
                    type="file"
                    accept=".webp,.jpg,.png"
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                    onChange={(event) => void updateImageField(event, "coverImageUrl")}
                  />
                </label>
                {publicForm.coverImageUrl ? (
                  <img
                    src={publicForm.coverImageUrl}
                    alt="Imagem do hero"
                    className="h-36 w-full rounded-2xl object-cover"
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Destaques do curso</p>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={highlightDraft}
                  onChange={(event) => setHighlightDraft(event.target.value)}
                  placeholder="Digite um destaque do curso"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                />
                <Button className="h-11 w-full md:w-auto" onClick={addHighlight}>
                  +
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {publicForm.salesHighlights.length === 0 ? (
                  <span className="text-sm text-slate-400">Nenhum destaque adicionado.</span>
                ) : (
                  publicForm.salesHighlights.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setPublicForm((current) => ({
                          ...current,
                          salesHighlights: current.salesHighlights.filter((highlight) => highlight !== item),
                        }))
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-[#EEF1FF] px-3 py-1 text-[11px] font-medium text-[#2D4EF5]"
                    >
                      {item}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Input
                id="class-video-url"
                label="Link do vídeo (YouTube)"
                placeholder="https://youtube.com/..."
                value={publicForm.videoUrl}
                onChange={(event) => setPublicForm((current) => ({ ...current, videoUrl: event.target.value }))}
              />
              {videoThumbnailUrl ? (
                <img
                  src={videoThumbnailUrl}
                  alt="Thumbnail do vídeo"
                  className="h-40 w-full rounded-2xl object-cover md:max-w-sm"
                />
              ) : null}
            </div>

            <div className="space-y-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                <span>Fotos de resultados</span>
                <input
                  type="file"
                  multiple
                  accept=".webp,.jpg,.png"
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                  onChange={(event) => void handleGalleryUpload(event)}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {publicForm.galleryImages.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200">
                    <img src={imageUrl} alt={`Resultado ${index + 1}`} className="h-32 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setPublicForm((current) => ({
                          ...current,
                          galleryImages: current.galleryImages.filter((_, imageIndex) => imageIndex !== index),
                        }))
                      }
                      className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-white/90 text-sm font-medium text-slate-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Prova social / Depoimentos</p>
                <Button
                  variante="secundaria"
                  className="h-10 px-3 text-sm"
                  onClick={() =>
                    setPublicForm((current) => ({
                      ...current,
                      testimonials:
                        current.testimonials.length >= 6
                          ? current.testimonials
                          : [...current.testimonials, { id: createTempId(), name: "", text: "", photoUrl: "" }],
                    }))
                  }
                  disabled={publicForm.testimonials.length >= 6}
                >
                  Adicionar depoimento
                </Button>
              </div>
              <div className="grid gap-4">
                {publicForm.testimonials.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    Adicione até 6 depoimentos para fortalecer a prova social da página.
                  </div>
                ) : (
                  publicForm.testimonials.map((item, index) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Depoimento {index + 1}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setPublicForm((current) => ({
                              ...current,
                              testimonials: current.testimonials.filter((testimonial) => testimonial.id !== item.id),
                            }))
                          }
                          className="text-sm font-medium text-rose-600"
                        >
                          Remover
                        </button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                        <div className="space-y-4">
                          <Input
                            id={`testimonial-name-${item.id}`}
                            label="Nome"
                            value={item.name}
                            onChange={(event) =>
                              setPublicForm((current) => ({
                                ...current,
                                testimonials: current.testimonials.map((testimonial) =>
                                  testimonial.id === item.id ? { ...testimonial, name: event.target.value } : testimonial,
                                ),
                              }))
                            }
                          />
                          <Textarea
                            id={`testimonial-text-${item.id}`}
                            label="Texto"
                            rows={3}
                            value={item.text}
                            onChange={(event) =>
                              setPublicForm((current) => ({
                                ...current,
                                testimonials: current.testimonials.map((testimonial) =>
                                  testimonial.id === item.id ? { ...testimonial, text: event.target.value } : testimonial,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="grid gap-2 text-sm font-medium text-slate-700">
                            <span>Foto</span>
                            <input
                              type="file"
                              accept=".webp,.jpg,.png"
                              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                              onChange={(event) => void handleTestimonialPhotoUpload(event, item.id)}
                            />
                          </label>
                          {item.photoUrl ? (
                            <img src={item.photoUrl} alt={item.name || "Depoimento"} className="h-32 w-full rounded-2xl object-cover" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <Input
                id="class-teacher-name"
                label="Nome da professora"
                value={publicForm.teacherName}
                onChange={(event) => setPublicForm((current) => ({ ...current, teacherName: event.target.value }))}
              />
              <Textarea
                id="class-teacher-bio"
                label="Bio"
                rows={3}
                value={publicForm.teacherBio}
                onChange={(event) => setPublicForm((current) => ({ ...current, teacherBio: event.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Button variante="secundaria" className="h-11 px-4" onClick={resetPublicForm}>
                Descartar
              </Button>
              <Button className="h-11 px-4" onClick={() => void handleSavePublicSettings()} disabled={publicSaving}>
                {publicSaving ? "Salvando..." : "Salvar configurações"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === "leads" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-[20px] border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">{leads.length} registros capturados</p>
            <div className="w-full sm:w-72">
              <Select id="leads-filter" label="Filtrar por status Pix" value={leadsFilter} onChange={(event) => setLeadsFilter(event.target.value)}>
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="enviado">Enviado</option>
                <option value="confirmado">Confirmado</option>
                <option value="rejeitado">Rejeitado</option>
              </Select>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-500">
              Nenhum lead encontrado para o filtro selecionado.
            </Card>
          ) : (
            <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="border-b border-slate-200/80 px-4 py-3 last:border-b-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-bold text-slate-900">{lead.full_name}</h3>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ${
                            lead.pix_status === "pendente"
                              ? "bg-slate-100 text-slate-600"
                              : lead.pix_status === "enviado"
                                ? "bg-[#FEF9C3] text-[#854D0E]"
                                : lead.pix_status === "confirmado"
                                  ? "bg-[#DCFCE7] text-[#166534]"
                                  : "bg-[#FEE2E2] text-[#DC2626]"
                          }`}
                        >
                          {getPixStatusLabel(lead.pix_status)}
                        </span>
                      </div>
                      <p className="shrink-0 text-xs text-slate-500">{formatarDataHora(lead.created_at)}</p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[13px] text-slate-600">
                        {lead.phone} · {lead.instagram || "Instagram não informado"} · {lead.source || "Origem não informada"} ·
                        {" "}Sinal: {depositAmountLabel}
                      </p>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {lead.pix_status === "enviado" ? (
                          <Button
                            className="h-8 px-3 text-[12px] font-medium"
                            onClick={() => void handleConfirmLead(lead)}
                            disabled={leadUpdatingId === lead.id}
                          >
                            {leadUpdatingId === lead.id ? "Atualizando..." : "Confirmar pagamento"}
                          </Button>
                        ) : null}
                        {lead.pix_status !== "rejeitado" && lead.pix_status !== "confirmado" ? (
                          <Button
                            variante="secundaria"
                            className="h-8 px-3 text-[12px] font-medium"
                            onClick={() => void handleUpdateLead(lead.id, "rejeitado")}
                            disabled={leadUpdatingId === lead.id}
                          >
                            Rejeitar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "chamada" ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-600">QR Code</p>
                <h3 className="text-2xl font-semibold text-slate-900">Chamada do dia</h3>
              </div>
              {!activeSession ? (
                <Button className="gap-2" onClick={() => void handleStartAttendance()}>
                  <QrCode className="size-4" />
                  Iniciar chamada do dia
                </Button>
              ) : (
                <Button variante="secundaria" onClick={() => void handleEndAttendance()}>
                  Encerrar chamada
                </Button>
              )}
            </div>

            {activeSession ? (
              <>
                <AttendanceQRCode token={activeSession.token} />
                <p className="text-center text-sm text-slate-500">
                  As alunas podem escanear e escolher o próprio nome para registrar presença.
                </p>
              </>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Nenhuma chamada ativa. Inicie a chamada para gerar o QR Code.
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Lista em tempo real</h3>
              <Badge tom="azul">{attendanceRoster.filter((item) => item.checkedInAt).length} presentes</Badge>
            </div>

            <div className="grid gap-3">
              {attendanceRoster.map((item) => (
                <div key={item.enrollmentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.studentName}</p>
                      <p className="text-sm text-slate-500">
                        {item.checkedInAt ? `Escaneou às ${new Date(item.checkedInAt).toLocaleTimeString("pt-BR")}` : "Pendente"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variante="secundaria" onClick={() => void handleManualAttendance(item.enrollmentId, true)}>
                        Marcar presença
                      </Button>
                      <Button variante="secundaria" onClick={() => void handleManualAttendance(item.enrollmentId, false)}>
                        Marcar falta
                      </Button>
                      {data.inscricoes.find((enrollment) => enrollment.id === item.enrollmentId)?.status === "compareceu" ? (
                        <Button
                          variante="secundaria"
                          onClick={() => handleGenerateCertificate(item.enrollmentId)}
                          disabled={certificateGeneratingId === item.enrollmentId}
                        >
                          {certificateGeneratingId === item.enrollmentId ? "Gerando..." : "Gerar certificado"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
        </div>
      </div>

      <ClassFormDialog
        open={editDialogOpen}
        title="Editar turma"
        description="Atualize informações da turma sem perder inscrições e pagamentos."
        loading={saving}
        initialValues={formValues}
        onClose={() => setEditDialogOpen(false)}
        onSubmit={handleEditClass}
      />

      <ClassFormDialog
        open={duplicateDialogOpen}
        title="Duplicar turma"
        description="Copiamos dados e custos padrão. Preencha a nova data para criar a próxima edição."
        loading={saving}
        initialValues={duplicateValues}
        onClose={() => setDuplicateDialogOpen(false)}
        onSubmit={handleDuplicateClass}
      />

      <EnrollmentFormDialog
        open={enrollmentDialogOpen}
        students={students}
        loading={saving}
        initialValues={{
          studentId: "",
          status: "interessada",
          salePrice: data.turma.price_per_student,
          notes: "",
        }}
        onClose={() => setEnrollmentDialogOpen(false)}
        onSubmit={handleCreateEnrollment}
      />

      <PaymentFormDialog
        open={paymentDialogOpen}
        loading={saving}
        enrollments={paymentEnrollments}
        initialValues={{
          ...paymentInitialValues,
          paidAt: toLocalDateTimeInput(paymentInitialValues.paidAt),
        }}
        onClose={() => {
          setPaymentDialogOpen(false);
          setSelectedEnrollmentId(null);
          setSelectedPaymentId(null);
        }}
        onSubmit={selectedPayment ? handleUpdatePayment : handleCreatePayment}
      />

      <CostFormDialog
        open={costDialogOpen}
        loading={saving}
        initialValues={costInitialValues}
        onClose={() => setCostDialogOpen(false)}
        onSubmit={handleCreateCost}
      />
    </div>
  );
}
