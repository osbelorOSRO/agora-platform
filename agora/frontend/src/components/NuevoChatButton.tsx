import { MessageSquarePlus } from "lucide-react";

type Props = { onClick: () => void; hidden?: boolean };

export default function NuevoChatButton({ onClick, hidden }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Iniciar conversación"
      title="Iniciar conversación"
      className={[
        "fixed z-50",
        "right-5 bottom-14",             // más arriba que bottom-10
        "h-12 w-12 rounded-full",
        "bg-fondoClient",
        "hover:bg-opacity-90 active:scale-95",
        "transition-all",
        "focus:outline-none focus:ring focus:ring-fondoClient",
        "pb-[env(safe-area-inset-bottom)]",
        hidden ? "pointer-events-none opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <MessageSquarePlus className="mx-auto h-6 w-6 texto-textoOscuro" />
    </button>
  );
}

