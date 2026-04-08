import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-mist">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-brand-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              Genda Class
            </span>
            <div className="space-y-4">
              <h1 className="max-w-lg text-4xl font-semibold leading-tight">
                Gestão de turmas e financeiro pensada para cursos da beleza.
              </h1>
              <p className="max-w-md text-base text-white/80">
                Organize alunas, pagamentos, vagas e resultados financeiros em um só lugar.
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
            <p className="text-sm text-white/80">
              Estrutura pronta para crescer com autenticação, banco isolado por workspace e deploy independente.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
}
