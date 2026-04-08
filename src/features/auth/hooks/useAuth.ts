import { useContext } from "react";
import { AuthContext } from "@/app/providers";

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de AppProviders.");
  }

  return contexto;
}
