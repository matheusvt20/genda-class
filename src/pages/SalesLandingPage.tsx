import { useEffect, useRef, useState } from "react";

const depoimentos = [
  {
    nome: "Claudia Pinheiro",
    profissao: "Nail Designer",
    texto: "Antes eu perdia o controle de quem tinha pago o sinal. Agora está tudo num lugar só.",
    foto: "/images/claudia-pinheiro.png",
  },
  {
    nome: "Carol Lima",
    profissao: "Lash Designer · RJ",
    texto: "Parei de usar planilha e WhatsApp para controlar minhas turmas. O Genda Class mudou minha operação.",
    foto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80",
  },
  {
    nome: "Tati Souza",
    profissao: "Designer de Sobrancelha · MG",
    texto: "Agora sei exatamente quanto lucrei em cada turma. Isso mudou o jeito que eu precifíco meus cursos.",
    foto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&q=80",
  },
  {
    nome: "Ana Ferreira",
    profissao: "Micropigmentadora · RS",
    texto: "A página de vendas já me trouxe 3 inscrições sem eu precisar ficar respondendo no WhatsApp.",
    foto: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=80&q=80",
  },
  {
    nome: "Bruna Costa",
    profissao: "Esteticista · PR",
    texto: "O QR Code de presença no dia do curso é incrível. As alunas adoram e eu não preciso fazer chamada manual.",
    foto: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&q=80",
  },
  {
    nome: "Juliana Melo",
    profissao: "Nail Designer · BA",
    texto: "Finalmente consigo ver o lucro real de cada turma. Antes eu achava que tava ganhando bem, mas não sabia os custos.",
    foto: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&q=80",
  },
] as const;

const nichos = [
  {
    titulo: "Cursos VIP",
    descricao:
      "Atendimento individual ou em pequenos grupos premium. Controle cada detalhe do pagamento e entregue uma experiência profissional.",
    imagem: "/images/cursos-vip.png",
    bullets: ["Turma de 1 a 3 alunas", "Preço premium por aluna", "Certificado personalizado"],
  },
  {
    titulo: "Formação de Instrutora",
    descricao:
      "Cursos completos para formar profissionais. Gerencie turmas maiores, kits de materiais e emita certificados com carga horária.",
    imagem: "/images/camila-perpetuo.png",
    bullets: ["Controle de kit por aluna", "Certificado com carga horária", "Histórico completo da turma"],
  },
  {
    titulo: "Workshops",
    descricao:
      "Eventos de curta duração onde a aluna assiste e aprende. Organize inscrições, controle presença e divulgue com página profissional.",
    imagem: "/images/workshops.png",
    bullets: ["Inscrição pela página pública", "QR Code de presença", "Resultado financeiro do evento"],
  },
  {
    titulo: "Formações Técnicas",
    descricao:
      "Cursos práticos de 1 ou mais dias com materiais inclusos. Calcule o custo real, defina o preço certo e saiba o lucro antes de abrir.",
    imagem: "/images/tati-lash-designer-2.png",
    bullets: ["Cálculo de custo por aluna", "Ponto de equilíbrio da turma", "Duplicar turma com 1 clique"],
  },
  {
    titulo: "Eventos Presenciais",
    descricao:
      "Palestras, encontros e imersões presenciais. Controle as inscrições, gerencie pagamentos e tenha uma visão financeira completa do evento.",
    imagem: "/images/eventos-presenciais.png",
    bullets: ["Página de vendas do evento", "Controle de vagas em tempo real", "Lista de presença por QR Code"],
  },
  {
    titulo: "Cursos Recorrentes",
    descricao:
      "Você dá o mesmo curso toda semana ou quinzena. Duplique a turma anterior com 1 clique e comece já com toda a estrutura pronta.",
    imagem: "/images/cursos-recorrentes.png",
    bullets: ["Duplicar turma com 1 clique", "Histórico de todas as edições", "Comparativo de resultado por turma"],
  },
] as const;

const beneficios = [
  "Crie e gerencie turmas presenciais",
  "Controle sinal, parcelas e saldo de cada aluna",
  "Saiba o lucro real de cada turma",
  "Página de vendas para divulgar seu curso",
  "Chamada por QR Code no dia do curso",
  "Certificado automático para suas alunas",
] as const;

const ctaHref = "/cadastro";

function CtaButton({ secondary = false, children, href = ctaHref }: { secondary?: boolean; children: string; href?: string }) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition ${
        secondary
          ? "border border-[#2D4EF5] text-[#2D4EF5] hover:bg-[#eef1ff]"
          : "bg-[#2D4EF5] text-white hover:bg-[#2643d8]"
      }`}
    >
      {children}
    </a>
  );
}

function SectionLabel({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${dark ? "text-white/70" : "text-[#2D4EF5]"}`}>
      {children}
    </p>
  );
}

export function SalesLandingPage() {
  const [nichoIndex, setNichoIndex] = useState(nichos.length);
  const [nichoAnimating, setNichoAnimating] = useState(true);
  const [nichosDesktop, setNichosDesktop] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [nichosHover, setNichosHover] = useState(false);
  const nichosResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Genda Class • Organize suas turmas presenciais";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    const syncViewport = () => {
      setNichosDesktop(window.innerWidth >= 768);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  const depoimentosDuplicados = [...depoimentos, ...depoimentos];
  const nichosVisiveis = nichosDesktop ? 3 : 1;
  const nichosInfinitos = [...nichos, ...nichos, ...nichos];
  const nichoDots = Array.from({ length: 4 }, (_, index) => index);
  const nichoDotAtivo = ((nichoIndex - nichos.length) % 4 + 4) % 4;

  const avançarNichos = () => {
    setNichoAnimating(true);
    setNichoIndex((current) => current + 1);
  };

  const voltarNichos = () => {
    setNichoAnimating(true);
    setNichoIndex((current) => current - 1);
  };

  const nichosTransform = nichosDesktop
    ? `translateX(calc(${nichoIndex} * (((100% - 48px) / 3) + 24px) * -1))`
    : `translateX(calc(${nichoIndex} * (100% + 24px) * -1))`;

  useEffect(() => {
    if (nichosResetTimeoutRef.current) {
      clearTimeout(nichosResetTimeoutRef.current);
      nichosResetTimeoutRef.current = null;
    }

    if (nichoIndex >= nichos.length * 2) {
      nichosResetTimeoutRef.current = setTimeout(() => {
        setNichoAnimating(false);
        setNichoIndex((current) => current - nichos.length);
      }, 500);
    }

    if (nichoIndex < nichos.length) {
      nichosResetTimeoutRef.current = setTimeout(() => {
        setNichoAnimating(false);
        setNichoIndex((current) => current + nichos.length);
      }, 500);
    }

    return () => {
      if (nichosResetTimeoutRef.current) {
        clearTimeout(nichosResetTimeoutRef.current);
        nichosResetTimeoutRef.current = null;
      }
    };
  }, [nichoIndex]);

  useEffect(() => {
    if (!nichoAnimating) {
      const id = setTimeout(() => setNichoAnimating(true), 40);
      return () => clearTimeout(id);
    }
  }, [nichoAnimating]);

  useEffect(() => {
    if (nichosHover) return;

    const interval = setInterval(() => {
      setNichoAnimating(true);
      setNichoIndex((current) => current + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [nichosHover]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <style>{`
        @keyframes scroll-depoimentos {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .esteira-genda {
          animation: scroll-depoimentos 30s linear infinite;
          display: flex;
          width: max-content;
        }
        .esteira-genda:hover {
          animation-play-state: paused;
        }
      `}</style>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href="/pv" className="text-lg font-semibold text-slate-900">
            Genda Class
          </a>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 lg:flex">
            <a href="#para-quem" className="hover:text-slate-900">
              Para quem
            </a>
            <a href="#como-funciona" className="hover:text-slate-900">
              Como funciona
            </a>
            <a href="#funcionalidades" className="hover:text-slate-900">
              Funcionalidades
            </a>
            <a href="#depoimentos" className="hover:text-slate-900">
              Depoimentos
            </a>
          </nav>

          <CtaButton>Criar conta grátis</CtaButton>
        </div>
      </header>

      <main className="pt-24">
        <section className="overflow-hidden px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-14">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-7">
              <span className="inline-flex rounded-full bg-[#EEF1FF] px-4 py-2 text-xs font-semibold text-[#2D4EF5]">
                ✦ Feito para quem ministra cursos presenciais
              </span>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-slate-950 sm:text-5xl lg:text-[52px]">
                  Chega de WhatsApp.
                  <br />
                  Chega de planilha.
                  <br />
                  Começa o lucro.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  O Genda Class organiza suas turmas presenciais, controla quem pagou, e te mostra quanto você
                  realmente lucrou em cada curso.
                </p>
              </div>

              <div className="relative md:hidden">
                <img
                  src="/images/camila-perpetuo.png"
                  alt="Camila Perpetuo, Lash Designer"
                  loading="lazy"
                  className="h-[420px] w-full rounded-[24px] object-cover shadow-2xl sm:h-[520px]"
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-[24px]"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 55%)" }}
                />
                <div className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-slate-900 shadow-lg">
                  Turmas organizadas ✓
                </div>
                <div className="absolute bottom-5 left-5 right-5 flex max-w-md flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#2D4EF5] px-3 py-1 text-[11px] font-semibold text-white">
                      Lash Designer
                    </span>
                    <span className="rounded-full border border-white/70 px-3 py-1 text-[11px] font-semibold text-white">
                      Cursos presenciais
                    </span>
                  </div>
                  <div>
                    <p className="text-[20px] font-bold text-white">Camila Perpetuo</p>
                    <p className="text-[13px] text-slate-200">Lash Designer</p>
                  </div>
                  <p className="border-l-2 border-white pl-3 text-[13px] italic leading-6 text-white">
                    Antes eu controlava tudo no WhatsApp. Hoje sei exatamente quanto lucrei em cada turma.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <CtaButton>Quero organizar minhas turmas →</CtaButton>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver como funciona
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex -space-x-3">
                  {depoimentos.slice(0, 4).map((item) => (
                    <img
                      key={item.nome}
                      src={item.foto}
                      alt={item.nome}
                      loading="lazy"
                      className="size-11 rounded-full border-2 border-white object-cover"
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-500">+ profissionais já estão usando o Genda Class</p>
              </div>

              <div className="max-w-xl space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">% das vagas preenchidas</p>
                <div className="h-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-[68%] rounded-full bg-[#2D4EF5]" />
                </div>
                <p className="text-[11px] text-slate-500">Restam poucas vagas no plano gratuito desta semana</p>
              </div>
            </div>

            <div className="relative order-first hidden md:block lg:order-none">
              <img
                src="/images/camila-perpetuo.png"
                alt="Camila Perpetuo, Lash Designer"
                loading="lazy"
                className="h-[420px] w-full rounded-[24px] object-cover shadow-2xl sm:h-[520px]"
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-[24px]"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 55%)" }}
              />
              <div className="absolute right-5 top-5 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-slate-900 shadow-lg">
                Turmas organizadas ✓
              </div>
              <div className="absolute bottom-5 left-5 right-5 flex max-w-md flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#2D4EF5] px-3 py-1 text-[11px] font-semibold text-white">
                    Lash Designer
                  </span>
                  <span className="rounded-full border border-white/70 px-3 py-1 text-[11px] font-semibold text-white">
                    Cursos presenciais
                  </span>
                </div>
                <div>
                  <p className="text-[20px] font-bold text-white">Camila Perpetuo</p>
                  <p className="text-[13px] text-slate-200">Lash Designer</p>
                </div>
                <p className="border-l-2 border-white pl-3 text-[13px] italic leading-6 text-white">
                  Antes eu controlava tudo no WhatsApp. Hoje sei exatamente quanto lucrei em cada turma.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#2D4EF5] px-4 py-4 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {[
                "✓ Controle pagamentos sem planilha",
                "✓ Página de vendas do seu curso",
                "✓ Presença com QR Code",
                "✓ Resultado real por turma",
              ].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="text-lg font-semibold">Grátis para começar</div>
          </div>
        </section>

        <section id="depoimentos" className="overflow-hidden border-y border-slate-100 bg-slate-50 py-10">
          <div className="mb-6 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <SectionLabel>Quem usa aprova</SectionLabel>
            </div>
          </div>
          <div className="esteira-genda gap-4 px-4 sm:px-6">
            {depoimentosDuplicados.map((item, index) => (
              <article
                key={`${item.nome}-${index}`}
                className="w-[320px] shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <img src={item.foto} alt={item.nome} loading="lazy" className="size-12 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-slate-900">{item.nome}</p>
                    <p className="text-sm text-slate-500">{item.profissao}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{item.texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#2D4EF5] px-4 py-10 text-white sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
            {[
              "+50 profissionais ativas",
              "+200 turmas gerenciadas",
              "5 min para configurar e usar",
              "Grátis para começar",
            ].map((item) => (
              <div key={item}>
                <p className="text-xl font-semibold sm:text-2xl">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="para-quem" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Sistema feito para quem ensina na beleza</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Sistema feito para quem ensina na beleza</h2>
              <p className="mt-3 text-base text-slate-500">
                O Genda Class foi criado para todos os tipos de curso presencial do setor de beleza.
              </p>
            </div>

            <div className="mt-10">
              <div className="mb-5 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={voltarNichos}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 shadow-sm transition hover:bg-slate-50"
                  aria-label="Voltar nichos"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={avançarNichos}
                  className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 shadow-sm transition hover:bg-slate-50"
                  aria-label="Avançar nichos"
                >
                  →
                </button>
              </div>

              <div
                className="overflow-hidden"
                onMouseEnter={() => setNichosHover(true)}
                onMouseLeave={() => setNichosHover(false)}
                onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
                onTouchEnd={(event) => {
                  const endX = event.changedTouches[0]?.clientX ?? null;
                  if (touchStartX === null || endX === null || nichosDesktop) {
                    setTouchStartX(null);
                    return;
                  }

                  const distance = touchStartX - endX;
                  if (distance > 40) avançarNichos();
                  if (distance < -40) voltarNichos();
                  setTouchStartX(null);
                }}
              >
                <div
                  className="flex gap-6"
                  style={{ transform: nichosTransform, transition: nichoAnimating ? "transform 0.5s ease" : "none" }}
                >
                  {nichosInfinitos.map((item, index) => (
                    <article
                      key={`${item.titulo}-${index}`}
                      className="shrink-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                      style={{ flexBasis: nichosDesktop ? "calc((100% - 48px) / 3)" : "100%" }}
                    >
                      <div className="relative overflow-hidden rounded-xl">
                        <img src={item.imagem} alt={item.titulo} loading="lazy" className="h-56 w-full object-cover" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <span className="absolute bottom-3 left-3 rounded-full bg-[#2D4EF5] px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
                          {item.titulo}
                        </span>
                      </div>

                      <div className="space-y-4 px-1 pb-1 pt-5">
                        <h3 className="text-xl font-semibold text-slate-900">{item.titulo}</h3>
                        <p className="text-sm leading-6 text-slate-500">{item.descricao}</p>
                        <div className="space-y-2.5">
                          {item.bullets.map((bullet) => (
                            <div key={bullet} className="flex gap-3 text-sm text-slate-700">
                              <span className="font-semibold text-[#2D4EF5]">✓</span>
                              <span>{bullet}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-2">
                {nichoDots.map((dot) => (
                  <button
                    key={dot}
                    type="button"
                    aria-label={`Ir para posição ${dot + 1} do carrossel de nichos`}
                    onClick={() => {
                      setNichoAnimating(true);
                      setNichoIndex(nichos.length + dot);
                    }}
                    className={`h-2.5 rounded-full transition-all ${
                      nichoDotAtivo === dot ? "w-8 bg-[#2D4EF5]" : "w-2.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-5xl text-center">
              <SectionLabel>Você se identifica?</SectionLabel>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] text-slate-950 sm:text-5xl">
                A realidade de quem gerencia turma no improviso
              </h2>
              <p className="mt-5 text-lg text-slate-500 sm:text-xl">
                Se você se identifica com alguma dessas situações, o Genda Class foi feito pra você.
              </p>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              <div className="rounded-[28px] border-2 border-rose-200 bg-white p-8 sm:p-10">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-rose-50 text-3xl text-rose-600">
                    ×
                  </div>
                  <p className="text-2xl font-semibold text-rose-600">Sem o Genda Class</p>
                </div>

                <div className="mt-8 space-y-6">
                  {[
                    "Perde aluna por falta de controle e esquecimento",
                    "Cobra no achismo e não sabe o preço certo",
                    "Confusão entre interessada e confirmada",
                    "Não sabe o lucro real de nenhuma turma",
                    "Inadimplência sem controle — perde dinheiro todo mês",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-4 text-slate-700">
                      <span className="mt-2 size-3 shrink-0 rounded-full bg-rose-600" />
                      <p className="text-xl leading-[1.45]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border-2 border-emerald-200 bg-white p-8 sm:p-10">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600">
                    ✓
                  </div>
                  <p className="text-2xl font-semibold text-emerald-600">Com o Genda Class</p>
                </div>

                <div className="mt-8 space-y-6">
                  {[
                    "Todas as alunas organizadas por status em tempo real",
                    "Preço calculado com base no custo real da turma",
                    "Confirmação clara de quem pagou e quem deve",
                    "Resultado financeiro real de cada turma",
                    "Zero inadimplência esquecida — alertas automáticos",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-4 text-slate-700">
                      <span className="mt-2 size-3 shrink-0 rounded-full bg-emerald-600" />
                      <p className="text-xl leading-[1.45]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-[#2D4EF5] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionLabel dark>Simples e rápido</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold">Em 3 passos você já está organizada</h2>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                { emoji: "🎓", titulo: "Crie sua conta grátis" },
                { emoji: "📋", titulo: "Cadastre sua primeira turma" },
                { emoji: "🚀", titulo: "Comece a usar hoje" },
              ].map((item) => (
                <div key={item.titulo} className="rounded-[24px] bg-white/10 p-6 backdrop-blur">
                  <p className="text-3xl">{item.emoji}</p>
                  <p className="mt-4 text-xl font-semibold">{item.titulo}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Funcionalidades</SectionLabel>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Mais do que um controle de turma</h2>
              <p className="mt-3 text-base text-slate-500">
                O Genda Class resolve tudo que você faz hoje no improviso.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[
                ["📅", "Gestão de turmas", "Crie turmas com data, horário, local e limite de vagas. Controle status de cada aluna em tempo real."],
                ["💰", "Controle de pagamentos", "Registre sinal, parcelas e saldo. Saiba exatamente quem pagou e quem ainda deve."],
                ["📊", "Resultado financeiro", "Veja o lucro real de cada turma. Custos, receita e margem calculados automaticamente."],
                ["🔗", "Página de vendas", "Divulgue seu curso com uma página profissional. A aluna se inscreve e paga o sinal pelo Pix."],
                ["📱", "QR Code de presença", "No dia do curso, a aluna escaneia o QR Code na entrada. Presença marcada automaticamente."],
                ["🏆", "Certificado automático", "Gere o certificado da aluna com nome, curso e data com um clique."],
              ].map(([emoji, titulo, texto]) => (
                <div key={titulo} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-3xl">{emoji}</p>
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">{titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
            <div className="space-y-5">
              <SectionLabel>Nossa missão</SectionLabel>
              <h2 className="text-3xl font-semibold text-slate-950">Somos a tecnologia que cresce junto com você</h2>
              <p className="text-base leading-7 text-slate-600">
                O Genda Class nasceu para profissionais da beleza que ensinam. Sabemos que você é boa no que faz —
                nossa missão é tirar a bagunça operacional do seu caminho para você focar no que importa: ensinar e
                lucrar.
              </p>
              <CtaButton>Quero organizar minhas turmas →</CtaButton>
            </div>
            <img
              src="/images/tati-lash-designer-2.png"
              alt="Profissional da beleza"
              loading="lazy"
              className="h-[420px] w-full rounded-[24px] object-cover shadow-xl"
            />
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionLabel>A voz de quem usa</SectionLabel>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">
              Quem já transformou suas turmas com o Genda Class
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {depoimentos.map((item) => (
                <article key={item.nome} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <img src={item.foto} alt={item.nome} loading="lazy" className="size-14 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-slate-900">{item.nome}</p>
                      <p className="text-sm text-slate-500">{item.profissao}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-amber-400">★★★★★</p>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{item.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            <img
              src="/images/genda-dashboard-hero.png"
              alt="Curso da beleza"
              loading="lazy"
              className="h-[420px] w-full rounded-[24px] object-cover shadow-xl"
            />
            <div className="flex items-center">
              <div className="w-full rounded-[28px] bg-[#2D4EF5] p-8 text-white shadow-xl">
                <h2 className="text-3xl font-semibold leading-tight">Você foca no curso. O Genda Class cuida do resto.</h2>
                <p className="mt-4 text-base text-white/80">
                  Controle financeiro, alunas organizadas e nenhuma dor de cabeça.
                </p>
                <div className="mt-6">
                  <a
                    href={ctaHref}
                    className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#2D4EF5] transition hover:bg-slate-100"
                  >
                    Criar conta grátis →
                  </a>
                </div>
                <p className="mt-4 text-sm text-white/70">Grátis para sempre · Sem cartão · Sem compromisso</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#2D4EF5] px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-semibold">Suas turmas merecem funcionar com mais leveza.</h2>
            <p className="mt-4 text-base text-white/80">
              O Genda Class cuida da operação para você focar em ensinar.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center rounded-lg border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-[#2D4EF5]"
              >
                Quero organizar minhas turmas hoje →
              </a>
              <p className="text-sm text-white/70">Grátis para sempre · Sem cartão · Cancela quando quiser</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div>
              <p className="text-lg font-semibold text-slate-900">Genda Class</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Produto</p>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p>Turmas</p>
                <p>Financeiro</p>
                <p>Página de vendas</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Para quem</p>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p>Nail Designers</p>
                <p>Lash Designers</p>
                <p>Profissionais da beleza</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Empresa</p>
              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p>Sobre</p>
                <p>Contato</p>
                <p>Termos</p>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
            © 2026 Genda Class. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
