import { supabase } from "@/core/supabase/client";
import type {
  EnrollmentPaymentStatus,
  EnrollmentStatus,
  StudentRecord,
} from "@/features/classes/services/classes.service";

type StudentEnrollmentRow = {
  id: string;
  class_id: string;
  student_id: string;
  status: EnrollmentStatus;
  sale_price: number;
  balance_due: number;
  payment_status: EnrollmentPaymentStatus;
  enrolled_at: string;
  attendance_marked_at: string | null;
  classes?: {
    id: string;
    title: string;
    starts_at: string;
    certificate_enabled: boolean;
    duration_hours: number | null;
  } | null;
};

type StudentPaymentRow = {
  id: string;
  class_id: string;
  student_id: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  paid_at: string;
  status: "paid" | "pending" | "cancelled";
  class_enrollment_id: string;
  classes?: {
    id: string;
    title: string;
    starts_at: string;
  } | null;
};

export type StudentListItem = StudentRecord & {
  totalCursos: number;
  saldoDevedor: number;
  statusFinanceiro: "em_dia" | "com_debito";
};

export type StudentDetailData = {
  student: StudentRecord;
  enrollments: StudentEnrollmentRow[];
  payments: StudentPaymentRow[];
  totalCursos: number;
  totalPago: number;
  saldoDevedor: number;
  certificados: Array<{
    enrollmentId: string;
    courseTitle: string;
    date: string;
    durationHours: number | null;
    available: boolean;
  }>;
};

export type StudentFormValues = {
  fullName: string;
  phone: string;
  email: string;
  instagram: string;
  notes: string;
  isActive: boolean;
};

export async function getStudentCount(workspaceId: string) {
  const response = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (response.error) {
    throw response.error;
  }

  return response.count ?? 0;
}

export async function listStudents(workspaceId: string) {
  const [studentsResponse, enrollmentsResponse] = await Promise.all([
    supabase
      .from("students")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("full_name", { ascending: true })
      .returns<StudentRecord[]>(),
    supabase
      .from("class_enrollments")
      .select("id, student_id, status, balance_due")
      .eq("workspace_id", workspaceId)
      .returns<Array<{ id: string; student_id: string; status: EnrollmentStatus; balance_due: number }>>(),
  ]);

  if (studentsResponse.error) {
    throw studentsResponse.error;
  }

  if (enrollmentsResponse.error) {
    throw enrollmentsResponse.error;
  }

  const enrollments = enrollmentsResponse.data ?? [];

  return (studentsResponse.data ?? []).map((student) => {
    const studentEnrollments = enrollments.filter((item) => item.student_id === student.id && item.status !== "cancelada");
    const saldoDevedor = studentEnrollments.reduce((total, item) => total + Number(item.balance_due), 0);

    return {
      ...student,
      totalCursos: studentEnrollments.length,
      saldoDevedor,
      statusFinanceiro: saldoDevedor > 0 ? "com_debito" : "em_dia",
    } satisfies StudentListItem;
  });
}

export async function getStudentDetail(studentId: string) {
  const [studentResponse, enrollmentsResponse, paymentsResponse] = await Promise.all([
    supabase.from("students").select("*").eq("id", studentId).single<StudentRecord>(),
    supabase
      .from("class_enrollments")
      .select("*, classes(id, title, starts_at, certificate_enabled, duration_hours)")
      .eq("student_id", studentId)
      .order("enrolled_at", { ascending: false })
      .returns<StudentEnrollmentRow[]>(),
    supabase
      .from("class_payments")
      .select("*, classes(id, title, starts_at)")
      .eq("student_id", studentId)
      .order("paid_at", { ascending: false })
      .returns<StudentPaymentRow[]>(),
  ]);

  if (studentResponse.error) {
    throw studentResponse.error;
  }

  if (enrollmentsResponse.error) {
    throw enrollmentsResponse.error;
  }

  if (paymentsResponse.error) {
    throw paymentsResponse.error;
  }

  const enrollments = enrollmentsResponse.data ?? [];
  const payments = paymentsResponse.data ?? [];

  const totalPago = payments.filter((item) => item.status === "paid").reduce((total, item) => total + Number(item.amount), 0);
  const saldoDevedor = enrollments.reduce((total, item) => total + Number(item.balance_due), 0);

  return {
    student: studentResponse.data,
    enrollments,
    payments,
    totalCursos: enrollments.filter((item) => item.status !== "cancelada").length,
    totalPago,
    saldoDevedor,
    certificados: enrollments
      .filter((item) => item.classes?.certificate_enabled)
      .map((item) => ({
        enrollmentId: item.id,
        courseTitle: item.classes?.title ?? "Curso",
        date: item.classes?.starts_at ?? item.enrolled_at,
        durationHours: item.classes?.duration_hours ?? null,
        available: item.status === "compareceu" || item.status === "confirmada",
      })),
  } satisfies StudentDetailData;
}

export async function saveStudent(workspaceId: string, values: StudentFormValues, studentId?: string) {
  if (!studentId) {
    const count = await getStudentCount(workspaceId);

    if (count >= 20) {
      throw new Error("PLAN_LIMIT_STUDENTS");
    }
  }

  const payload = {
    workspace_id: workspaceId,
    full_name: values.fullName.trim(),
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    instagram: values.instagram.trim() || null,
    notes: values.notes.trim() || null,
    is_active: values.isActive,
  };

  if (studentId) {
    const { error } = await supabase.from("students").update(payload).eq("id", studentId);
    if (error) {
      throw error;
    }
    return studentId;
  }

  const { data, error } = await supabase.from("students").insert(payload).select("id").single<{ id: string }>();
  if (error) {
    throw error;
  }

  return data.id;
}
