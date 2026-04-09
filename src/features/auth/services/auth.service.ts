import type { ResultadoAutenticacao } from "@/core/types";
import { supabase } from "@/core/supabase/client";

export async function entrarComEmailSenha(email: string, senha: string): Promise<ResultadoAutenticacao> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    throw error;
  }

  return {
    session: data.session,
    user: data.user,
    precisaConfirmarEmail: false,
  };
}

export async function cadastrarComEmailSenha(dados: {
  nomeCompleto: string;
  phone: string;
  email: string;
  senha: string;
}): Promise<ResultadoAutenticacao> {
  const { data, error } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: {
      data: {
        full_name: dados.nomeCompleto,
        phone: dados.phone,
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    session: data.session,
    user: data.user,
    precisaConfirmarEmail: !data.session,
  };
}

export async function enviarRecuperacaoSenha(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });

  if (error) {
    throw error;
  }
}

export async function sairDaConta() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
