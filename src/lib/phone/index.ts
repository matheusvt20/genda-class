export function limparTelefone(valor: string) {
  return valor.replace(/\D/g, "");
}

export function formatarTelefone(valor: string) {
  const digitos = limparTelefone(valor).slice(0, 11);

  if (digitos.length <= 2) {
    return digitos;
  }

  if (digitos.length <= 7) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }

  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

export function telefoneParaWhatsapp(valor: string) {
  const digitos = limparTelefone(valor);
  if (!digitos) {
    return null;
  }

  return `https://wa.me/55${digitos}`;
}
