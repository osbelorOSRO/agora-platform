import { useState } from "react";
import { crearClienteManual } from "../services/clientes.service";
import { estilos } from "../theme/estilos";
import { UserPlus } from "lucide-react";

interface Props {
  onClose: () => void;
  onClienteCreado: () => void;
}

const FormNuevoCliente = ({ onClose, onClienteCreado }: Props) => {
  const [clienteId, setClienteId] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipoId, setTipoId] = useState("lid"); // <-- tipo_id por defecto
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    // Loguea el valor antes de enviar
    console.log('tipoId enviado:', `"${tipoId}"`);
    try {
      // Sanitiza el valor por si acaso
      const res = await crearClienteManual(clienteId, nombre, tipoId.trim());

      if (res.error) {
        setError(res.error);
      } else {
        onClienteCreado();
        onClose();
      }
    } catch (err) {
      console.error("Error al crear cliente:", err);
      setError("Error inesperado.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={estilos.formNuevo.overlay}>
      <form onSubmit={manejarEnvio} className={estilos.formNuevo.card}>
        <h2 className={estilos.formNuevo.titulo}>
          <UserPlus className="w-5 h-5" />
          Nuevo Cliente
        </h2>

        <div>
          <label className={estilos.formNuevo.label}>Número (WhatsApp)*</label>
          <input
            type="text"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className={estilos.formNuevo.input}
            required
          />
        </div>

        <div>
          <label className={estilos.formNuevo.label}>Nombre (opcional)</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={estilos.formNuevo.input}
          />
        </div>

        <div>
          <label className={estilos.formNuevo.label}>Tipo ID</label>
          <select
            value={tipoId}
            onChange={(e) => setTipoId(e.target.value)}
            className={estilos.formNuevo.input}
            required
          >
            <option value="lid">lid</option>
            <option value="jid">jid</option>
          </select>
        </div>

        {error && <p className={estilos.formNuevo.error}>{error}</p>}

        <div className={estilos.formNuevo.botones}>
          <button
            type="button"
            onClick={onClose}
            className={estilos.formNuevo.btnCancelar}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={cargando}
            className={estilos.formNuevo.btnGuardar}
          >
            {cargando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormNuevoCliente;
