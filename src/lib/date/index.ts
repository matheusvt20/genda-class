function ajustarData(data: string | Date) {
  return data instanceof Date ? data : new Date(data);
}

export function formatarData(data: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(ajustarData(data));
}

export function formatarHora(data: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
  }).format(ajustarData(data));
}

export function formatarDataHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(ajustarData(data));
}

export function inicioDoMes(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

export function fimDoMes(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function inicioDaSemana(data = new Date()) {
  const dia = new Date(data);
  const deslocamento = (dia.getDay() + 6) % 7;
  dia.setDate(dia.getDate() - deslocamento);
  dia.setHours(0, 0, 0, 0);
  return dia;
}

export function fimDaSemana(data = new Date()) {
  const dia = inicioDaSemana(data);
  dia.setDate(dia.getDate() + 6);
  dia.setHours(23, 59, 59, 999);
  return dia;
}

export function formatarDataInput(data: string | Date) {
  const valor = ajustarData(data);
  const ano = valor.getFullYear();
  const mes = `${valor.getMonth() + 1}`.padStart(2, "0");
  const dia = `${valor.getDate()}`.padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function combinarDataEHora(data: string, horario: string) {
  return new Date(`${data}T${horario}:00`).toISOString();
}

export function extrairHora(data: string | Date) {
  const valor = ajustarData(data);
  return `${valor.getHours()}`.padStart(2, "0") + `:${`${valor.getMinutes()}`.padStart(2, "0")}`;
}
