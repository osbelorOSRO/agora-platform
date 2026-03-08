import React, { useState, useEffect } from "react";
import { Send, Save } from "lucide-react";
import { motion } from "framer-motion";
import { validarRut } from "@/utils/validarRut";
import { TarjetaClienteService } from "@/services/tarjetas/tarjeta.cliente.service";
import { getContratosByClienteId, getContrato } from "@/services/contratos.service";
import SidePanel from "@/components/SidePanel";
import { estilos } from "@/theme/estilos";
import FichaEnganche from "@/components/FichaEnganche";

// ✅ Si usas un sistema de notificaciones (por ejemplo react-hot-toast)
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "";

interface Props {
  clienteId: string;
  onClose: () => void;
  fotoPerfil?: string;
}

const isValidAvatarUrl = (url?: string) => {
  if (!url) return false;
  return !url.includes("pps.whatsapp.net");
};

const TarjetaCliente: React.FC<Props> = ({ clienteId, onClose, fotoPerfil }) => {
  const [rut, setRut] = useState("");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [errorRut, setErrorRut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<string | undefined>(undefined);

  const [contratos, setContratos] = useState<any[]>([]);
  const [contratosLoading, setContratosLoading] = useState(false);

  const [mostrarFichaEnganche, setMostrarFichaEnganche] = useState(false);
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);

  // 🧩 Manejo de avatar
  useEffect(() => {
    if (isValidAvatarUrl(fotoPerfil)) setAvatar(fotoPerfil);
    else setAvatar(undefined);
  }, [fotoPerfil]);

  // 🧩 Cargar datos del cliente
  useEffect(() => {
    if (!clienteId) return;
    (async () => {
      try {
        const data = await TarjetaClienteService.obtenerCliente(clienteId);
        setRut(data?.identificacion?.rut || "");
        setNombre(data?.nombre?.manual || "");
        setDireccion(data?.direccion?.manual || "");
        setEmail(data?.email?.manual || "");
        setTelefono(data?.telefono || "");
        const url = data?.fotoPerfil ?? data?.foto_perfil;
        if (isValidAvatarUrl(url)) setAvatar(url);
        else setAvatar(undefined);
      } catch (err) {
        console.error("❌ Error al cargar cliente:", err);
      }
    })();
  }, [clienteId]);

  // 🧩 Cargar contratos
  useEffect(() => {
    if (!clienteId) return;
    setContratosLoading(true);
    getContratosByClienteId(clienteId)
      .then(setContratos)
      .catch(() => setContratos([]))
      .finally(() => setContratosLoading(false));
  }, [clienteId]);

  // ✅ Método mejorado: buscar datos por RUT y rellenar campos
  const buscarNombrePorRut = async () => {
    if (!validarRut(rut)) {
      setErrorRut(true);
      return;
    }

    setErrorRut(false);
    setLoading(true);

    try {
      const res = await TarjetaClienteService.buscarNombrePorRut(rut);

      // 📦 El backend devuelve datos en res.datos
      const nombreObtenido = res?.datos?.nombre || res?.nombre || "";
      const direccionObtenida = res?.datos?.direccion || res?.direccion || "";

      if (nombreObtenido) {
        setNombre(nombreObtenido);
        await TarjetaClienteService.actualizarCampo(clienteId, "nombre", {
          manual: nombreObtenido,
        });
      }

      if (direccionObtenida) {
        setDireccion(direccionObtenida);
        await TarjetaClienteService.actualizarCampo(clienteId, "direccion", {
          manual: direccionObtenida,
        });
      }

      // 🔄 Recargar cliente para sincronizar visualmente los cambios
      const clienteActualizado = await TarjetaClienteService.obtenerCliente(clienteId);
      setNombre(clienteActualizado?.nombre?.manual || nombreObtenido);
      setDireccion(clienteActualizado?.direccion?.manual || direccionObtenida);

      toast.success("✅ Datos actualizados correctamente");
    } catch (err) {
      console.error("❌ Error al buscar nombre:", err);
      toast.error("No se pudo obtener la información del RUT");
    } finally {
      setLoading(false);
    }
  };

  // 🧩 Guardar manualmente los cambios
  const guardarDatos = async () => {
    if (!clienteId) return;
    const payload: any = { cliente_id: clienteId };

    if (rut) payload.identificacion = { rut, origen: "manual" };
    if (nombre) payload.nombre = { manual: nombre };
    if (direccion) payload.direccion = { manual: direccion };
    if (email) payload.email = { manual: email };

    try {
      await TarjetaClienteService.actualizarDatos(clienteId, payload);
      if (telefono) {
        await TarjetaClienteService.actualizarCampo(clienteId, "telefono", telefono);
      }
      toast.success("💾 Cambios guardados correctamente");
    } catch (err) {
      console.error("❌ Error al guardar datos:", err);
      toast.error("Error al guardar los datos");
    }
  };

  // 📋 Abrir contrato
  const handleAbrirContrato = async (contratoBase) => {
    try {
      const contratoCompleto = await getContrato(clienteId, contratoBase.contrato_id);
      setContratoSeleccionado(contratoCompleto);
      setMostrarFichaEnganche(true);
    } catch (err) {
      console.error("Error al obtener contrato completo:", err);
    }
  };

  // ➕ Crear contrato
  const handleCrearContrato = () => {
    setContratoSeleccionado(null);
    setMostrarFichaEnganche(true);
  };

  const handleCerrarFichaEnganche = () => {
    setMostrarFichaEnganche(false);
    getContratosByClienteId(clienteId).then(setContratos).catch(() => setContratos([]));
  };

  if (!clienteId) return null;

  return (
    <>
      <SidePanel
        open
        onClose={onClose}
        title="Detalle del cliente"
        width={420}
        className={estilos.tarjetaCliente.lateral}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button onClick={guardarDatos} className={estilos.tarjetaCliente.botonGuardar}>
              <Save size={16} className={estilos.tarjetaCliente.iconoBoton} />
              Guardar
            </button>
          </div>
        }
      >
        <div className={estilos.tarjetaCliente.contenedorPanel}>
          {/* Avatar */}
          <div className={estilos.tarjetaCliente.avatarContenedor}>
            <img
              src={avatar ?? `${API_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`}
              alt="Foto de perfil"
              className={estilos.tarjetaCliente.avatarImagen}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `${API_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`;
              }}
            />
          </div>

          {/* Inputs */}
          <div className="mt-2 space-y-3">
            <div className={estilos.tarjetaCliente.gridLabelInput}>
              <label className={estilos.tarjetaCliente.label}>Nombre:</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del cliente"
                className={estilos.tarjetaCliente.input}
              />
            </div>

            <div className={estilos.tarjetaCliente.gridLabelInput}>
              <label className={estilos.tarjetaCliente.label}>Rut:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="Ingrese RUT"
                  className={estilos.tarjetaCliente.input + " flex-1"}
                />
                <button
                  onClick={buscarNombrePorRut}
                  disabled={loading}
                  className={estilos.tarjetaCliente.botonBuscarNombre}
                  title="Buscar nombre"
                >
                  {loading ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Send size={18} />
                    </motion.span>
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>

            {errorRut && (
              <p className={estilos.tarjetaCliente.textoError}>⚠️ RUT inválido</p>
            )}

            <div className={estilos.tarjetaCliente.gridLabelInput}>
              <label className={estilos.tarjetaCliente.label}>Fono:</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Teléfono del cliente"
                className={estilos.tarjetaCliente.input}
              />
            </div>

            <div className={estilos.tarjetaCliente.gridLabelInput}>
              <label className={estilos.tarjetaCliente.label}>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                className={estilos.tarjetaCliente.input}
              />
            </div>

            <div className={estilos.tarjetaCliente.gridLabelInput}>
              <label className={estilos.tarjetaCliente.label}>Dirección:</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Dirección"
                className={estilos.tarjetaCliente.input}
              />
            </div>
          </div>

          {/* Contratos */}
          <div className="mt-8">
            <h4 className="font-semibold mb-2">Contratos del cliente</h4>
            {contratosLoading && <p>Cargando contratos...</p>}
            {!contratosLoading && contratos.length === 0 && (
              <button
                className={estilos.tarjetaCliente.botonCrearContrato}
                onClick={handleCrearContrato}
              >
                Agregar Contrato
              </button>
            )}
            {!contratosLoading && contratos.length > 0 && (
              <div className="space-y-2">
                {contratos.map((contrato) => (
                  <div
                    key={contrato.contrato_id}
                    className={estilos.tarjetaCliente.cardContrato}
                    onClick={() => handleAbrirContrato(contrato)}
                  >
                    <p>ID: {contrato.contrato_id}</p>
                    <p>Fecha: {contrato.fecha}</p>
                  </div>
                ))}
                <button
                  className={estilos.tarjetaCliente.botonCrearContrato}
                  onClick={handleCrearContrato}
                >
                  Agregar Nuevo Contrato
                </button>
              </div>
            )}
          </div>
        </div>
      </SidePanel>

      {mostrarFichaEnganche && (
        <FichaEnganche
          clienteId={clienteId}
          telefono={telefono}
          nombreCliente={nombre}
          rutCliente={rut}
          direccion={direccion}
          email={email}
          contrato={contratoSeleccionado}
          onCerrar={handleCerrarFichaEnganche}
          onContratoGuardado={handleCerrarFichaEnganche}
        />
      )}
    </>
  );
};

export default TarjetaCliente;
