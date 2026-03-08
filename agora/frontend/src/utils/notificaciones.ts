import { toast } from "sonner";

export function notificarExito(mensaje: string) {
  toast.success(mensaje);
}

export function notificarError(mensaje: string) {
  toast.error(mensaje);
}
