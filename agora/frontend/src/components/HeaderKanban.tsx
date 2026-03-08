import React, { useRef, useEffect } from "react";
import { Menu } from "lucide-react";
import { estilos } from "../theme/estilos";

interface Props {
  onAbrirSidebar: () => void;
}

const HeaderKanban: React.FC<Props> = ({ onAbrirSidebar }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        // reservado para futuras acciones
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={estilos.headerKanban.contenedor}>
      {/* Botón menú lateral (izquierda) */}
      <div className={estilos.headerKanban.botones} ref={cardRef}>
        <button
          onClick={onAbrirSidebar}
          className={estilos.headerKanban.btnMenu}
          title="Abrir menú lateral"
          type="button"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Texto a la derecha */}
      <div className={estilos.headerKanban.marca}>
        <span className={estilos.headerKanban.textoMarca}>Agora</span>
      </div>
    </header>
  );
};

export default HeaderKanban;
