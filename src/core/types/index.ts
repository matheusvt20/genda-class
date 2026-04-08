import type { Session, User } from "@supabase/supabase-js";

export type Perfil = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

export type UsuarioAutenticado = {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  workspace: Workspace | null;
  carregando: boolean;
  erro: string | null;
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (dados: {
    nomeCompleto: string;
    email: string;
    senha: string;
  }) => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
  sair: () => Promise<void>;
  limparErro: () => void;
};
