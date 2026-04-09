import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { emailValido } from "@/lib/validation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { trackCompleteRegistration } from "@/lib/pixel";

function formatarTelefoneBrasileiro(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getPasswordStrength(password: string) {
  const hasLetters = /[A-Za-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  if (password.length < 6) {
    return {
      label: "Fraca",
      level: 1,
      color: "bg-rose-500",
      textColor: "text-rose-600",
    };
  }

  if (password.length >= 8 && hasLetters && hasNumbers) {
    return {
      label: "Forte",
      level: 3,
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
    };
  }

  return {
    label: "Média",
    level: 2,
    color: "bg-orange-500",
    textColor: "text-orange-600",
  };
}

type FormErrors = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function Campo({
  id,
  label,
  type = "text",
  placeholder,
  value,
  erro,
  onChange,
  rightSlot,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  erro?: string;
  onChange: (value: string) => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`h-12 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
            rightSlot ? "pr-12" : ""
          } ${erro ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-[#2D4EF5]"}`}
        />
        {rightSlot ? <div className="absolute inset-y-0 right-0 flex items-center pr-3">{rightSlot}</div> : null}
      </div>
      {erro ? <span className="text-xs font-medium text-rose-600">{erro}</span> : null}
    </label>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { cadastrar, erro, limparErro } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const firstNameValid = firstName.trim().length > 0;
  const lastNameValid = lastName.trim().length > 0;
  const phoneValid = phone.replace(/\D/g, "").length >= 10;
  const emailValid = emailValido(email);
  const passwordValid = password.length >= 6;
  const confirmPasswordValid = confirmPassword.length > 0 && confirmPassword === password;
  const formValid =
    firstNameValid && lastNameValid && phoneValid && emailValid && passwordValid && confirmPasswordValid;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    limparErro();

    const nextErrors: FormErrors = {
      firstName: firstNameValid ? undefined : "Informe seu nome.",
      lastName: lastNameValid ? undefined : "Informe seu sobrenome.",
      phone: phoneValid ? undefined : "Informe um WhatsApp válido.",
      email: emailValid ? undefined : "Informe um email válido.",
      password: passwordValid ? undefined : "A senha precisa ter pelo menos 6 caracteres.",
      confirmPassword: confirmPasswordValid ? undefined : "As senhas não coincidem",
    };

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    try {
      setLoading(true);
      const resultado = await cadastrar({
        nomeCompleto: fullName,
        phone,
        email,
        senha: password,
      });

      trackCompleteRegistration();

      if (resultado.session) {
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate("/login", {
        replace: true,
        state: {
          cadastroPendente: true,
          email,
        },
      });
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-white">
      <div className="min-h-screen lg:grid lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#2D4EF5] text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:p-10">
          <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute right-[-80px] top-[22%] size-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute bottom-[-120px] left-[18%] size-96 rounded-full bg-white/15" />

          <div className="relative z-10">
            <p className="text-lg font-semibold">Genda Class</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
              Gestão de turmas
            </p>
          </div>

          <div className="relative z-10 flex flex-1 items-center">
            <div className="space-y-10">
              <div className="space-y-1">
                <h1 className="text-[36px] font-bold leading-tight tracking-[-0.03em] text-white">
                  Organize suas turmas.
                </h1>
                <h2 className="text-[36px] font-bold leading-tight tracking-[-0.03em] text-white">
                  É gratuito e
                </h2>
                <h3 className="text-[36px] font-bold leading-tight tracking-[-0.03em] text-[#C9D6FF]">
                  leva 2 minutos.
                </h3>
              </div>

              <div className="space-y-5">
                {[
                  ["①", "Crie sua conta", true],
                  ["②", "Configure sua turma", false],
                  ["③", "Comece a usar", false],
                ].map(([number, text, active]) => (
                  <div key={text} className="flex items-center gap-4">
                    <span
                      className={`flex size-9 items-center justify-center rounded-full border text-sm font-semibold ${
                        active ? "border-white bg-white text-[#2D4EF5]" : "border-white/30 bg-white/10 text-white/60"
                      }`}
                    >
                      {number}
                    </span>
                    <span className={`text-base font-medium ${active ? "text-white" : "text-white/60"}`}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="relative z-10 text-[11px] text-white/75">© 2026 Lansar Company. Todos os direitos reservados.</p>
        </section>

        <section className="flex min-h-screen flex-col bg-white px-5 py-6 sm:px-8 lg:justify-center lg:px-12">
          <div className="mb-8 rounded-[28px] bg-[#2D4EF5] p-6 text-white lg:hidden">
            <p className="text-base font-semibold">Genda Class</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Gestão de turmas</p>
            <div className="mt-6 space-y-1">
              <p className="text-[28px] font-bold leading-tight">Organize suas turmas.</p>
              <p className="text-[28px] font-bold leading-tight">É gratuito e</p>
              <p className="text-[28px] font-bold leading-tight text-[#C9D6FF]">leva 2 minutos.</p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-xl">
            <div className="mb-8 space-y-3">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                ● Cadastro gratuito
              </span>
              <div>
                <h1 className="text-[28px] font-bold text-slate-950">Crie sua conta</h1>
                <p className="mt-2 text-sm text-slate-500">Preencha os dados abaixo para começar</p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  id="register-first-name"
                  label="Nome"
                  placeholder="Seu nome"
                  value={firstName}
                  erro={errors.firstName}
                  onChange={setFirstName}
                />
                <Campo
                  id="register-last-name"
                  label="Sobrenome"
                  placeholder="Seu sobrenome"
                  value={lastName}
                  erro={errors.lastName}
                  onChange={setLastName}
                />
              </div>

              <Campo
                id="register-phone"
                label="WhatsApp"
                placeholder="(21) 99999-9999"
                value={phone}
                erro={errors.phone}
                onChange={(value) => setPhone(formatarTelefoneBrasileiro(value))}
              />

              <Campo
                id="register-email"
                type="email"
                label="E-mail"
                placeholder="voce@exemplo.com"
                value={email}
                erro={errors.email}
                onChange={setEmail}
              />

              <div className="space-y-2">
                <Campo
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  label="Senha"
                  placeholder="Crie uma senha"
                  value={password}
                  erro={errors.password}
                  onChange={setPassword}
                  rightSlot={
                    <button
                      type="button"
                      className="text-slate-400 transition hover:text-slate-600"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  }
                />

                <div className="space-y-2">
                  <div className="flex gap-2">
                    {[0, 1, 2].map((segment) => (
                      <div
                        key={segment}
                        className={`h-2 flex-1 rounded-full ${
                          segment < passwordStrength.level ? passwordStrength.color : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${passwordStrength.textColor}`}>Força da senha: {passwordStrength.label}</p>
                </div>
              </div>

              <Campo
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                label="Confirmar senha"
                placeholder="Repita sua senha"
                value={confirmPassword}
                erro={confirmPassword.length > 0 && confirmPassword !== password ? "As senhas não coincidem" : errors.confirmPassword}
                onChange={setConfirmPassword}
                rightSlot={
                  <button
                    type="button"
                    className="text-slate-400 transition hover:text-slate-600"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />

              {erro ? <p className="text-sm font-medium text-rose-600">{erro}</p> : null}

              <Button type="submit" className="h-12 w-full rounded-xl bg-[#2D4EF5] text-white hover:bg-[#2643d8]" disabled={loading || !formValid}>
                {loading ? "Criando conta..." : "Criar conta grátis →"}
              </Button>

              <p className="mx-auto max-w-md text-center text-[12px] leading-5 text-slate-400">
                Ao criar uma conta, você concorda com os Termos de Uso e a Política de Privacidade
              </p>

              <p className="text-center text-sm text-slate-500">
                Já tem uma conta?{" "}
                <Link to="/login" className="font-semibold text-[#2D4EF5] hover:text-[#2643d8]">
                  Fazer login →
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
