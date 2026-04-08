import { supabase } from "@/core/supabase/client";

export async function entrarComEmailSenha(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    throw error;
  }
}

export async function cadastrarComEmailSenha(dados: {
  nomeCompleto: string;
  email: string;
  senha: string;
}) {
  const { error } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: {
      data: {
        full_name: dados.nomeCompleto,
      },
    },
  });

  if (error) {
    throw error;
  }
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
