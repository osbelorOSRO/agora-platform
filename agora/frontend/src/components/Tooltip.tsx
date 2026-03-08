import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ label, children }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const handleEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({
        left: rect.left + rect.width / 2,
        top: rect.top,
      });
      setVisible(true);
    }
  };

  const handleLeave = () => setVisible(false);

  return (
    <>
      <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={handleLeave} className="inline-block">
        {children}
      </div>
      {visible &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top - 8,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              zIndex: 99999,
            }}
            className="bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap"
          >
            {label}
          </div>,
          document.body
        )}
    </>
  );
};
