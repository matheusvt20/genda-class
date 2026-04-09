import { Outlet, useLocation } from "react-router-dom";

export function AuthLayout() {
  const location = useLocation();
  const isRegisterPage = location.pathname === "/cadastro";

  return (
    <div className="min-h-screen bg-mist">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section
          className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between"
          style={
            isRegisterPage
              ? {
                  background:
                    "linear-gradient(rgba(45, 78, 245, 0.85), rgba(45, 78, 245, 0.85)), url(https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=60) center / cover no-repeat",
                }
              : { background: "#2D4EF5" }
          }
        >
          {isRegisterPage ? (
            <>
              <div>
                <p className="text-lg font-semibold text-white">Genda Class</p>
              </div>
              <div className="flex flex-1 items-center justify-center">
                <h1 className="max-w-md text-center text-4xl font-semibold leading-tight">
                  Organize suas turmas. Conheça o lucro real.
                </h1>
              </div>
              <p className="text-xs text-white/80">Grátis para sempre · Sem cartão</p>
            </>
          ) : (
            <>
              <div className="space-y-8">
                <span className="inline-flex rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                  Gratuito • Sem cartão
                </span>
                <div className="space-y-5">
                  <h1 className="max-w-xl text-4xl font-semibold leading-tight">
                    Chega de WhatsApp, planilha e bloco de notas para gerenciar suas turmas.
                  </h1>
                  <p className="max-w-lg text-base text-white/80">
                    O Genda Class organiza suas turmas presenciais, controla pagamentos e mostra quanto você realmente
                    lucrou em cada curso.
                  </p>

                  <div className="space-y-3 text-sm text-white/90">
                    {[
                      "Crie e gerencie turmas presenciais",
                      "Controle sinal, parcelas e saldo de cada aluna",
                      "Saiba o lucro real de cada turma",
                      "Página de vendas para divulgar seu curso",
                      "Chamada por QR Code no dia do curso",
                      "Certificado automático para suas alunas",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 text-base">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
                <p className="text-sm text-white/80">Grátis para sempre para 1 turma ativa e até 20 alunas.</p>
              </div>
            </>
          )}
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
