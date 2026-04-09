import { Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type PlanLimitModalProps = {
  open: boolean;
  type: "turma" | "aluna";
  onClose: () => void;
};

const supportUrl =
  "https://wa.me/5521983405061?text=Olá! Quero saber mais sobre o plano completo do Genda Class.";

const contentByType = {
  turma:
    "O plano gratuito permite 1 turma ativa por vez. Para criar turmas ilimitadas, entre em contato com o suporte.",
  aluna:
    "O plano gratuito permite até 20 alunas cadastradas. Para cadastrar mais alunas, entre em contato com o suporte.",
} as const;

export function PlanLimitModal({ open, type, onClose }: PlanLimitModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Limite do plano gratuito atingido"
      description={contentByType[type]}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variante="secundaria" onClick={onClose}>
            Fechar
          </Button>
          <a href={supportUrl} target="_blank" rel="noreferrer" className="inline-flex">
            <Button className="w-full sm:w-auto">Falar com o suporte</Button>
          </a>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-3 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Lock className="size-7" />
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-600">{contentByType[type]}</p>
      </div>
    </Modal>
  );
}
