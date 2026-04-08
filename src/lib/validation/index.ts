export function emailValido(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}
