import { supabase } from "@/core/supabase/client";

export type ClassPublicSettings = {
  id: string;
  workspace_id: string;
  title: string;
  course_name: string | null;
  course_type: string;
  starts_at: string;
  ends_at: string | null;
  duration_days: number;
  location_name: string | null;
  location_address: string | null;
  capacity: number;
  price_per_student: number;
  materials_included: boolean;
  certificate_enabled: boolean;
  is_public: boolean;
  slug: string | null;
  sales_headline: string | null;
  sales_description: string | null;
  sales_highlights: string[] | null;
  cover_image_url: string | null;
  deposit_amount: number | null;
};

export type ClassLead = {
  id: string;
  workspace_id: string;
  class_id: string;
  full_name: string;
  phone: string;
  instagram: string | null;
  source: string | null;
  status: string;
  pix_status: string;
  created_at: string;
  needs_pix_status_backfill?: boolean;
};

type PublicLeadSnapshot = {
  id: string;
  class_id: string;
  full_name: string;
  phone: string;
  instagram: string | null;
  status: string;
  pix_status: string;
  created_at: string;
};

type ClassLeadRow = {
  id: string;
  workspace_id: string;
  class_id: string;
  full_name: string;
  phone: string;
  instagram: string | null;
  how_found: string | null;
  status: string;
  pix_status: string | null;
  created_at: string;
};

type FinancialSummary = {
  occupied_seats: number;
};

type WorkspacePaymentSettings = {
  school_name: string | null;
  school_phone: string | null;
  school_instagram: string | null;
  whatsapp_number: string | null;
  pix_key_type: string | null;
  pix_key: string | null;
  pix_holder_name: string | null;
};

export type PublicClassData = ClassPublicSettings & {
  occupied_seats: number;
  available_seats: number;
};

export type DepositPageData = PublicClassData & {
  workspace_settings: WorkspacePaymentSettings;
};

type CreateLeadValues = {
  fullName: string;
  phone: string;
  instagram?: string;
  source: string;
};

function normalizeHighlights(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

async function getSummaryForClass(classId: string) {
  const response = await supabase
    .from("vw_class_financial_summary")
    .select("occupied_seats")
    .eq("class_id", classId)
    .maybeSingle<FinancialSummary>();

  if (response.error) {
    throw response.error;
  }

  return response.data ?? { occupied_seats: 0 };
}

export async function getClassPublicSettings(classId: string) {
  const response = await supabase
    .from("classes")
    .select(
      "id, workspace_id, title, course_name, course_type, starts_at, ends_at, duration_days, location_name, location_address, capacity, price_per_student, materials_included, certificate_enabled, is_public, slug, sales_headline, sales_description, sales_highlights, cover_image_url, deposit_amount",
    )
    .eq("id", classId)
    .single<ClassPublicSettings>();

  if (response.error) {
    throw response.error;
  }

  return {
    ...response.data,
    sales_highlights: normalizeHighlights(response.data.sales_highlights),
  } satisfies ClassPublicSettings;
}

export async function updateClassPublicSettings(
  classId: string,
  data: Partial<ClassPublicSettings>,
) {
  const payload = {
    ...data,
    slug: data.slug?.trim() || null,
    sales_headline: data.sales_headline?.trim() || null,
    sales_description: data.sales_description?.trim() || null,
    cover_image_url: data.cover_image_url?.trim() || null,
    sales_highlights: (data.sales_highlights ?? []).map((item) => item.trim()).filter(Boolean),
  };

  const response = await supabase.from("classes").update(payload).eq("id", classId);

  if (response.error) {
    throw response.error;
  }
}

export async function listClassLeads(classId: string) {
  const response = await supabase
    .from("class_leads")
    .select("id, workspace_id, class_id, full_name, phone, instagram, how_found, status, pix_status, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .returns<ClassLeadRow[]>();

  if (response.error) {
    throw response.error;
  }

  return (response.data ?? []).map((lead) => ({
    id: lead.id,
    workspace_id: lead.workspace_id,
    class_id: lead.class_id,
    full_name: lead.full_name,
    phone: lead.phone,
    instagram: lead.instagram,
    source: lead.how_found,
    status: lead.status,
    pix_status: lead.pix_status || "pendente",
    created_at: lead.created_at,
    needs_pix_status_backfill: !lead.pix_status,
  }));
}

export async function updateLeadPixStatus(leadId: string, pixStatus: string) {
  const response = await supabase.rpc("update_public_lead_pix_status", {
    p_lead_id: leadId,
    p_pix_status: pixStatus,
  });

  if (response.error) {
    throw response.error;
  }
}

export async function getPublicClassLead(leadId: string) {
  const response = await supabase
    .rpc("get_public_class_lead", {
      p_lead_id: leadId,
    })
    .returns<PublicLeadSnapshot[]>();

  if (response.error) {
    throw response.error;
  }

  return response.data?.[0] ?? null;
}

type ConfirmLeadEnrollmentParams = {
  leadId: string;
  workspaceId: string;
  classId: string;
  fullName: string;
  phone: string;
  instagram?: string | null;
  salePrice: number;
  depositAmount: number;
};

export async function confirmLeadEnrollment(params: ConfirmLeadEnrollmentParams) {
  const normalizedPhone = params.phone.trim();

  const studentResponse = await supabase
    .from("students")
    .select("id")
    .eq("workspace_id", params.workspaceId)
    .eq("phone", normalizedPhone)
    .maybeSingle<{ id: string }>();

  if (studentResponse.error) {
    throw studentResponse.error;
  }

  let studentId = studentResponse.data?.id ?? null;

  if (!studentId) {
    const insertStudentResponse = await supabase
      .from("students")
      .insert({
        workspace_id: params.workspaceId,
        full_name: params.fullName.trim(),
        phone: normalizedPhone || null,
        instagram: params.instagram?.trim() || null,
        is_active: true,
      })
      .select("id")
      .single<{ id: string }>();

    if (insertStudentResponse.error) {
      throw insertStudentResponse.error;
    }

    studentId = insertStudentResponse.data.id;
  }

  const balanceDue = Math.max(Number(params.salePrice) - Number(params.depositAmount), 0);
  const paymentStatus = Number(params.depositAmount) > 0 ? "parcial" : "pago";

  const enrollmentResponse = await supabase
    .from("class_enrollments")
    .select("id")
    .eq("class_id", params.classId)
    .eq("student_id", studentId)
    .maybeSingle<{ id: string }>();

  if (enrollmentResponse.error) {
    throw enrollmentResponse.error;
  }

  let enrollmentId = enrollmentResponse.data?.id ?? null;

  if (!enrollmentId) {
    const insertEnrollmentResponse = await supabase
      .from("class_enrollments")
      .insert({
        workspace_id: params.workspaceId,
        class_id: params.classId,
        student_id: studentId,
        status: "confirmada",
        sale_price: params.salePrice,
        deposit_amount: params.depositAmount,
        discount_amount: 0,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        confirmed_at: new Date().toISOString(),
      })
      .select("id")
      .single<{ id: string }>();

    if (insertEnrollmentResponse.error) {
      throw insertEnrollmentResponse.error;
    }

    enrollmentId = insertEnrollmentResponse.data.id;
  } else {
    const updateEnrollmentResponse = await supabase
      .from("class_enrollments")
      .update({
        status: "confirmada",
        sale_price: params.salePrice,
        deposit_amount: params.depositAmount,
        discount_amount: 0,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", enrollmentId);

    if (updateEnrollmentResponse.error) {
      throw updateEnrollmentResponse.error;
    }
  }

  if (Number(params.depositAmount) > 0) {
    const existingDepositResponse = await supabase
      .from("class_payments")
      .select("id")
      .eq("class_enrollment_id", enrollmentId)
      .eq("payment_type", "deposito")
      .eq("status", "paid")
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingDepositResponse.error) {
      throw existingDepositResponse.error;
    }

    if (!existingDepositResponse.data) {
      const paymentResponse = await supabase.from("class_payments").insert({
        workspace_id: params.workspaceId,
        class_id: params.classId,
        class_enrollment_id: enrollmentId,
        student_id: studentId,
        amount: Number(params.depositAmount),
        description: "Sinal confirmado via lead público",
        payment_type: "deposito",
        payment_method: "pix",
        paid_at: new Date().toISOString(),
        status: "paid",
      });

      if (paymentResponse.error) {
        throw paymentResponse.error;
      }
    }
  }

  const leadResponse = await supabase
    .from("class_leads")
    .update({
      pix_status: "confirmado",
      status: "inscrito",
    })
    .eq("id", params.leadId);

  if (leadResponse.error) {
    throw leadResponse.error;
  }

  return {
    studentId,
    enrollmentId,
  };
}

export async function getPublicClassBySlug(slug: string): Promise<PublicClassData | null> {
  const classResponse = await supabase
    .from("classes")
    .select(
      "id, workspace_id, title, course_name, course_type, starts_at, ends_at, duration_days, location_name, location_address, capacity, price_per_student, materials_included, certificate_enabled, is_public, slug, sales_headline, sales_description, sales_highlights, cover_image_url, deposit_amount",
    )
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle<ClassPublicSettings>();

  if (classResponse.error) {
    throw classResponse.error;
  }

  if (!classResponse.data) {
    return null;
  }

  const summary = await getSummaryForClass(classResponse.data.id);
  const highlights = normalizeHighlights(classResponse.data.sales_highlights);

  return {
    ...classResponse.data,
    sales_highlights: highlights,
    occupied_seats: Number(summary.occupied_seats ?? 0),
    available_seats: Math.max(Number(classResponse.data.capacity) - Number(summary.occupied_seats ?? 0), 0),
  };
}

export async function createClassLead(slug: string, values: CreateLeadValues) {
  const classData = await getPublicClassBySlug(slug);

  if (!classData) {
    throw new Error("Turma pública não encontrada.");
  }

  const response = await supabase
    .rpc("create_public_class_lead", {
      p_class_slug: slug,
      p_full_name: values.fullName.trim(),
      p_phone: values.phone.trim(),
      p_instagram: values.instagram?.trim() || null,
      p_how_found: values.source.trim(),
    })
    .returns<Array<{ id: string; workspace_id: string; class_id: string }>>();

  if (response.error) {
    throw response.error;
  }

  const createdLead = response.data?.[0];

  if (!createdLead) {
    throw new Error("Não foi possível criar o lead público.");
  }

  return {
    leadId: createdLead.id,
    classData,
  };
}

export async function getDepositPageData(slug: string): Promise<DepositPageData | null> {
  const classData = await getPublicClassBySlug(slug);

  if (!classData) {
    return null;
  }

  const settingsResponse = await supabase
    .from("workspace_settings")
    .select("school_name, school_phone, school_instagram, whatsapp_number, pix_key_type, pix_key, pix_holder_name")
    .eq("workspace_id", classData.workspace_id)
    .single<WorkspacePaymentSettings>();

  if (settingsResponse.error) {
    throw settingsResponse.error;
  }

  return {
    ...classData,
    workspace_settings: settingsResponse.data,
  };
}
