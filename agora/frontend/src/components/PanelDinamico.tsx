import React from "react";
import { motion } from "framer-motion";
import TarjetaCliente from "./tarjetas/TarjetaCliente";
import TarjetaEnvio from "./tarjetas/TarjetaEnvio";
import TarjetaScraping from "./tarjetas/TarjetaScraping";
import TarjetaContrato from "./tarjetas/TarjetaContrato";
import TarjetaCorreo from "./tarjetas/TarjetaCorreo";

interface Props {
  tipo: string;
  onClose: () => void;
}

const PanelDinamico: React.FC<Props> = ({ tipo, onClose }) => {
  const renderContenido = () => {
    switch (tipo) {
      case "cliente":
        return <TarjetaCliente onClose={onClose} />;
      case "envio":
        return <TarjetaEnvio onClose={onClose} />;
      case "scraping":
        return <TarjetaScraping onClose={onClose} />;
      case "contrato":
        return <TarjetaContrato onClose={onClose} />;
      case "correo":
        return <TarjetaCorreo onClose={onClose} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      className="fixed right-14 top-0 h-full w-[380px] p-4 bg-white shadow-xl z-40 overflow-auto"
    >
      {renderContenido()}
    </motion.div>
  );
};

export default PanelDinamico;
