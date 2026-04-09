import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/core/supabase/client";
import {
  createClassLead,
  getPublicClassBySlug,
  type PublicClassData,
} from "@/features/classes/services/public-sales.service";
import { formatarMoeda } from "@/lib/currency";
import { formatarData, formatarHora } from "@/lib/date";

type SalesTestimonial = {
  name: string;
  text: string;
  photoUrl?: string | null;
};

type SalesPageExtras = {
  teacher_photo_url?: string | null;
  sales_video_url?: string | null;
  sales_gallery?: unknown;
  sales_testimonials?: unknown;
  teacher_name?: string | null;
  teacher_bio?: string | null;
};

type WorkspacePublicInfo = {
  school_name: string | null;
  whatsapp_number: string | null;
};

type EnrollmentFormState = {
  fullName: string;
  phone: string;
  instagram: string;
  source: string;
};

const initialForm: EnrollmentFormState = {
  fullName: "",
  phone: "",
  instagram: "",
  source: "Instagram",
};

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      return value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeTestimonials(value: unknown): SalesTestimonial[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const current = item as Record<string, unknown>;
        const name = typeof current.name === "string" ? current.name.trim() : "";
        const text = typeof current.text === "string" ? current.text.trim() : "";
        const photoUrl = typeof current.photoUrl === "string" ? current.photoUrl : null;

        if (!name || !text) {
          return null;
        }

        return {
          name,
          text,
          photoUrl,
        } satisfies SalesTestimonial;
      })
      .filter((item): item is SalesTestimonial => item !== null);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      return normalizeTestimonials(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return [];
}

function getYoutubeEmbedUrl(value: string | null | undefined) {
  const url = value?.trim();

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    let videoId = "";

    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "").trim();
    } else if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
    }

    return videoId ? `https://youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function buildWhatsappLink(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}

function capitalizeFirst(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SalesPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PublicClassData | null>(null);
  const [extras, setExtras] = useState<SalesPageExtras | null>(null);
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspacePublicInfo | null>(null);
  const [form, setForm] = useState<EnrollmentFormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [response, extrasResponse] = await Promise.all([
          getPublicClassBySlug(slug),
          supabase
            .from("classes")
            .select(
              "teacher_photo_url, sales_video_url, sales_gallery, sales_testimonials, teacher_name, teacher_bio",
            )
            .eq("slug", slug)
            .maybeSingle<SalesPageExtras>(),
        ]);

        if (!active) {
          return;
        }

        if (!response) {
          setData(null);
          setExtras(null);
          setWorkspaceInfo(null);
          return;
        }

        const workspaceResponse = await supabase
          .from("workspace_settings")
          .select("school_name, whatsapp_number")
          .eq("workspace_id", response.workspace_id)
          .maybeSingle<WorkspacePublicInfo>();

        if (!active) {
          return;
        }

        if (extrasResponse.error) {
          throw extrasResponse.error;
        }

        if (workspaceResponse.error) {
          throw workspaceResponse.error;
        }

        setData(response);
        setExtras(extrasResponse.data ?? null);
        setWorkspaceInfo(workspaceResponse.data ?? null);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Não foi possível carregar esta página.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [slug]);

  const soldOut = (data?.available_seats ?? 0) <= 0;
  const occupancyPercent = useMemo(() => {
    if (!data || data.capacity <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, (data.occupied_seats / data.capacity) * 100));
  }, [data]);

  const heroMeta = data
    ? `${formatarData(data.starts_at)} • ${(data.location_name || "Cidade a definir").toUpperCase()} • ${formatarHora(
        data.starts_at,
      )} ÀS ${formatarHora(data.ends_at ?? data.starts_at)}`
    : "";
  const salesHighlights = data?.sales_highlights ?? [];
  const galleryImages = normalizeStringArray(extras?.sales_gallery);
  const testimonials = normalizeTestimonials(extras?.sales_testimonials);
  const videoEmbedUrl = getYoutubeEmbedUrl(extras?.sales_video_url);
  const teacherPhotoUrl = extras?.teacher_photo_url || data?.cover_image_url || "";
  const whatsappLink = buildWhatsappLink(workspaceInfo?.whatsapp_number);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!slug || soldOut || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await createClassLead(slug, {
        fullName: form.fullName,
        phone: form.phone,
        instagram: form.instagram,
        source: form.source,
      });

      navigate(`/curso/${slug}/sinal`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar sua inscrição.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] text-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="animate-pulse rounded-[24px] bg-white/10 p-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="h-4 w-48 rounded bg-white/10" />
                <div className="h-12 w-full rounded bg-white/10" />
                <div className="h-20 w-full rounded bg-white/10" />
                <div className="h-12 w-full rounded bg-white/10" />
              </div>
              <div className="h-[360px] rounded-[12px] bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] px-4 py-10">
        <div className="w-full max-w-xl rounded-[24px] bg-white px-6 py-10 text-center shadow-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2D4EF5]">404</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Esta turma não está disponível.</h1>
          <p className="mt-3 text-sm text-slate-500">{error ?? "Verifique o link e tente novamente."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section
        className="relative overflow-hidden"
        style={{
          background: data.cover_image_url
            ? `linear-gradient(rgba(15, 15, 26, 0.78), rgba(15, 15, 26, 0.72)), url(${data.cover_image_url}) center / cover no-repeat`
            : "#0f0f1a",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
            <div className="order-2 flex flex-col justify-center py-2 lg:order-1 lg:py-8">
              <p className="text-[11px] uppercase tracking-[0.08em] text-[#93C5FD]">{heroMeta}</p>
              <h1 className="mt-4 text-[32px] font-bold uppercase leading-[1.15] text-white">
                {data.sales_headline || data.course_name || data.title}
              </h1>
              <p className="mt-4 text-[14px] leading-6 text-white/70">
                {data.sales_description || data.title}
              </p>

              <button
                type="button"
                onClick={() => document.getElementById("sales-enrollment-form")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-6 inline-flex w-full items-center justify-center rounded-[6px] bg-white px-4 py-[14px] text-sm font-bold text-[#2D4EF5]"
              >
                QUERO ME INSCREVER
              </button>

              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-[0.08em] text-slate-300">
                  {Math.round(occupancyPercent)}% DAS VAGAS PREENCHIDAS
                </p>
                <div className="mt-2 h-1 w-full rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-[#2D4EF5]" style={{ width: `${occupancyPercent}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-slate-300">Restam {data.available_seats} vagas</p>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="h-[320px] overflow-hidden rounded-[12px] bg-white/10 sm:h-[420px] lg:h-full">
                {teacherPhotoUrl ? (
                  <img
                    src={teacherPhotoUrl}
                    alt={extras?.teacher_name || data.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-white/5 px-8 text-center text-sm text-white/70">
                    Foto da professora em breve
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#2D4EF5] px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white">
            {salesHighlights.length > 0 ? (
              salesHighlights.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="font-bold text-white">✓</span>
                  {item}
                </span>
              ))
            ) : (
              <>
                <span className="inline-flex items-center gap-2">
                  <span className="font-bold text-white">✓</span>
                  Aula prática do início ao acabamento
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="font-bold text-white">✓</span>
                  Método direto e aplicável
                </span>
              </>
            )}
          </div>
          <div className="text-[18px] font-bold text-white">{formatarMoeda(data.price_per_student)}</div>
        </div>
      </section>

      <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-[22px] font-bold text-slate-900">O que você vai aprender</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {(salesHighlights.length > 0 ? salesHighlights : ["Técnica completa passo a passo", "Aplicação prática em aula", "Correção ao vivo", "Direcionamento para evolução"]).map(
              (item) => (
                <div key={item} className="flex items-start gap-3 rounded-[12px] border border-slate-200 bg-white p-4">
                  <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    ✓
                  </span>
                  <p className="text-[13px] leading-6 text-slate-700">{item}</p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {videoEmbedUrl ? (
        <section className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-[22px] font-bold text-slate-900">Assista antes de se inscrever</h2>
            <div className="mt-8 overflow-hidden rounded-[16px] bg-black shadow-xl">
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <iframe
                  src={videoEmbedUrl}
                  title="Vídeo de apresentação"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {galleryImages.length > 0 ? (
        <section className="bg-white px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-[22px] font-bold text-slate-900">Resultados das alunas</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((imageUrl, index) => (
                <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[8px] bg-slate-100" style={{ aspectRatio: "1 / 1" }}>
                  <img
                    src={imageUrl}
                    alt={`Resultado ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {testimonials.length > 0 ? (
        <section className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-[22px] font-bold text-slate-900">O que dizem nossas alunas</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {testimonials.map((item) => (
                <div key={`${item.name}-${item.text}`} className="rounded-[16px] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="size-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-full bg-[#EEF1FF] text-sm font-bold text-[#2D4EF5]">
                        {item.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <p className="font-bold text-slate-900">{item.name}</p>
                  </div>
                  <p className="mt-4 text-[14px] italic leading-6 text-slate-600">“{item.text}”</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="sales-enrollment-form" className="bg-[#F8F9FA] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[480px] rounded-[20px] bg-white p-6 shadow-sm">
          <h2 className="text-center text-[22px] font-bold text-slate-900">Garanta sua vaga agora</h2>
          <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Nome completo</span>
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                className="h-12 rounded-[6px] border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-[#2D4EF5]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Telefone</span>
              <input
                required
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="h-12 rounded-[6px] border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-[#2D4EF5]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Instagram (opcional)</span>
              <input
                value={form.instagram}
                onChange={(event) => setForm((current) => ({ ...current, instagram: event.target.value }))}
                className="h-12 rounded-[6px] border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-[#2D4EF5]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Como ficou sabendo</span>
              <select
                value={form.source}
                onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                className="h-12 rounded-[6px] border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-[#2D4EF5]"
              >
                <option value="Instagram">Instagram</option>
                <option value="Indicação">Indicação</option>
                <option value="Google">Google</option>
                <option value="Outro">Outro</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={soldOut || submitting}
              className={`inline-flex h-12 w-full items-center justify-center rounded-[6px] px-4 text-sm font-bold uppercase tracking-[0.02em] ${
                soldOut ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-[#2D4EF5] text-white"
              }`}
            >
              {soldOut ? "Turma lotada — sem vagas disponíveis" : submitting ? "Enviando..." : "QUERO ME INSCREVER"}
            </button>

            <p className="text-center text-[12px] text-slate-500">
              Você será direcionada para o pagamento do sinal de {formatarMoeda(Number(data.deposit_amount ?? 0))}
            </p>

            {error ? <p className="text-center text-sm text-rose-600">{error}</p> : null}
          </form>
        </div>
      </section>

      <footer className="bg-[#0f0f1a] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-white/80 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-white">{workspaceInfo?.school_name || "Escola parceira"}</span>
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-white/80 underline-offset-2 hover:underline">
                {workspaceInfo?.whatsapp_number}
              </a>
            ) : (
              <span className="text-white/60">WhatsApp indisponível</span>
            )}
          </div>
          <p className="text-[11px] text-white/50">Powered by Genda Class</p>
        </div>
      </footer>
    </div>
  );
}
