import { supabase } from "@/core/supabase/client";

export async function obterSessaoAtual() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}
