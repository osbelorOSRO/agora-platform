import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number; // px (default 420)
  footer?: React.ReactNode; // opcional: botones o info
  children: React.ReactNode; // contenido scrollable
  className?: string; // para clases personalizadas, ej. fondo dinámico
};

export default function SidePanel({
  open,
  onClose,
  title = "",
  width = 420,
  footer,
  children,
  className = "",
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.aside
            className={`fixed right-0 top-0 z-50 h-full shadow-xl flex flex-col ${className || "bg-fondoCard"}`}
            style={{ width }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-label={title || "Panel lateral"}
          >
            {/* Header sticky con fondo dinámico */}
            <div className="sticky top-0 z-10 bg-fondoInput border-b border-borde">
              <div className="flex items-center justify-between p-4">
                <h3 className="text-base font-semibold m-0 text-textoInput">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded hover:bg-black/5 focus:outline-none text-textoInput"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
            {/* Footer sticky con fondo dinámico */}
            {footer && (
              <div className="sticky bottom-0 bg-fondoInput border-t border-borde p-3">
                {footer}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
