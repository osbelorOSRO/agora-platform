import { useState } from "react";
import { Trash2 } from "lucide-react";
import { estilos } from "../theme/estilos";
import { eliminarCliente } from "../services/clientes.service";

interface Props {
  onClose: () => void;
  onClienteEliminado: () => void;
}

const FormEliminarCliente: React.FC<Props> = ({ onClose, onClienteEliminado }) => {
  const [clienteId, setClienteId] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState("");

  const handleEliminar = async () => {
    if (!clienteId) return;

    try {
      await eliminarCliente(clienteId);
      onClienteEliminado();
    } catch (err: any) {
      console.error("❌ Error:", err);
      setError(err.message || "Error al eliminar cliente");
    }
  };

  return (
    <div className={estilos.formEliminar.overlay}>
      <div className={estilos.formEliminar.card}>
        <h2 className={estilos.formEliminar.titulo}>
          <Trash2 className="w-5 h-5" /> Eliminar Cliente
        </h2>

        {!confirmar ? (
          <>
            <label className={estilos.formEliminar.label}>Número completo del cliente</label>
            <input
              type="text"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              placeholder="Ej: 56912345678"
              className={estilos.formEliminar.input}
            />
            {error && <p className={estilos.formEliminar.error}>{error}</p>}
            <div className={estilos.formEliminar.botones}>
              <button onClick={onClose} className={estilos.formEliminar.btnCancelar}>
                Cancelar
              </button>
              <button
                onClick={() => setConfirmar(true)}
                disabled={!clienteId}
                className={estilos.formEliminar.btnConfirmar}
              >
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={estilos.formEliminar.advertencia}>
              ¿Estás seguro que deseas eliminar al cliente{" "}
              <strong>{clienteId}</strong> y toda su información?
              <br />
              <span className={estilos.formEliminar.advertenciaFuerte}>
                Esta acción no se puede deshacer.
              </span>
            </p>
            {error && <p className={estilos.formEliminar.error}>{error}</p>}
            <div className={estilos.formEliminar.botones}>
              <button onClick={onClose} className={estilos.formEliminar.btnCancelar}>
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                className={estilos.formEliminar.btnConfirmar}
              >
                Eliminar definitivamente
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FormEliminarCliente;
