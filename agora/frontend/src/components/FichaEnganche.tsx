import React, { useState, useEffect } from "react";
import type { Contrato, Abonado } from "@/types/contratos";
import { Pencil, Save, Trash2 } from "lucide-react";
import { estilos } from "@/theme/estilos";
import SidePanel from "@/components/SidePanel";
import { crearContrato, actualizarContrato } from "@/services/contratos.service";
import { TarjetaClienteService } from "@/services/tarjetas/tarjeta.cliente.service";

// Listas para selects
const planes = [
  { plan: "Plan 5G Libre Inicia", cod_plan: "2WS" },
  { plan: "Plan 5G Libre Full", cod_plan: "2WT" },
  { plan: "Plan 5G Libre Pro", cod_plan: "3EX" },
  { plan: "Plan 5G Libre Ultra", cod_plan: "2WU" },
  { plan: "Plan 5G Libre Inicia", cod_plan: "2WY" },
  { plan: "Plan 5G Libre Full", cod_plan: "2XX" },
  { plan: "Plan 5G Libre Pro", cod_plan: "3FJ" },
  { plan: "Plan 5G Libre Inicia", cod_plan: "3MA" },
  { plan: "Plan 5G Libre Full", cod_plan: "3LF" },
  { plan: "Plan 5G Libre Pro", cod_plan: "3LG" },
  { plan: "Plan 5G Libre Ultra", cod_plan: "3LH" },
  { plan: "Plan 5G Libre Inicia", cod_plan: "3MD" },
  { plan: "Plan 5G Libre Full", cod_plan: "3LP" },
  { plan: "Plan 5G Libre Pro", cod_plan: "3LQ" },
  { plan: "Plan 5G Libre Ultra", cod_plan: "3LR" },
  { plan: "Plan Salta Primer Plan", cod_plan: "3GG" },
  { plan: "Plan 5G Libre Inicia", cod_plan: "2YP" },
  { plan: "Plan 5G Libre Full", cod_plan: "2YV" },
  { plan: "Plan 5G Libre Full", cod_plan: "3JC" },
  { plan: "Plan 5G Libre Pro", cod_plan: "3JD" },
  { plan: "Plan 5G Libre Ultra", cod_plan: "3JE" },
  { plan: "Plan 5G Libre Pro", cod_plan: "3HB" }
];
const ciclos = ["1", "12", "19"];
const tipos = ["Portabilidad", "Alta", "Migración"];
const modos = ["No aplica", "Post a Post", "Pre a Post"];

function formatDateToDMY(date: Date = new Date()) {
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }).split("/").join("-");
}

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
  inputType?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  onChange,
  readOnly = false,
  inputType = "text",
}) => {
  const [editable, setEditable] = useState(false);
  return (
    <div className="flex items-center gap-1 mb-1">
      <label
        className={estilos.fichaEnganche.label}
        style={{ width: 160 }}
      >
        {label}:
      </label>
      <input
        className={estilos.fichaEnganche.input}
        type={inputType}
        value={value}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly || !editable}
      />
      {!readOnly && (
        <button
          className="ml-1 text-gray-500"
          type="button"
          tabIndex={-1}
          onClick={() => setEditable(v => !v)}
          style={{ background: "none", border: "none" }}
        >
          <Pencil size={18} />
        </button>
      )}
    </div>
  );
};

interface Props {
  clienteId: string;
  nombreCliente?: string;
  rutCliente?: string;
  direccion?: string;
  email?: string;
  contrato?: Contrato | null;
  onCerrar: () => void;
  onContratoGuardado: () => void;
}

const FichaEnganche: React.FC<Props> = ({
  clienteId,
  nombreCliente = "",
  rutCliente = "",
  direccion = "",
  email = "",
  contrato = null,
  onCerrar,
  onContratoGuardado,
}) => {
  const [fecha, setFecha] = useState<string>(contrato?.fecha || formatDateToDMY());
  const [nombreEjecutivo, setNombreEjecutivo] = useState<string>(
    contrato?.nombre_ejecutivo || "OSCAR BELTRAN"
  );
  const [rutEjecutivo, setRutEjecutivo] = useState<string>(
    contrato?.rut_ejecutivo || "28503235-0"
  );
  const [nombreClienteState, setNombreClienteState] = useState<string>(
    contrato?.biometria?.nombre_cliente || nombreCliente
  );
  const [rutClienteState, setRutClienteState] = useState<string>(
    contrato?.biometria?.rut_cliente || rutCliente
  );
  const [codigoBiometria, setCodigoBiometria] = useState<string>(
    contrato?.biometria?.codigo_BO || ""
  );
  const [direccionState, setDireccionState] = useState<string>(
    contrato?.direccion || direccion
  );
  const [emailState, setEmailState] = useState<string>(contrato?.email || email);
  const [telefonoState, setTelefonoState] = useState<string>("");
  const [ciclo, setCiclo] = useState<string>(contrato?.ciclo || ciclos[0]);
  const [tipo, setTipo] = useState<string>(contrato?.tipo || tipos[0]);
  const [modo, setModo] = useState<string>(contrato?.modo || modos[0]);
  const [planSeleccionado, setPlanSeleccionado] = useState<{ plan: string; cod_plan: string }>(
    contrato
      ? { plan: contrato.plan || planes[0].plan, cod_plan: contrato.cod_plan || planes[0].cod_plan }
      : planes[0]
  );
  const [cantidadLineas, setCantidadLineas] = useState<number>(contrato?.cantidad_lineas || 1);
  const [abonados, setAbonados] = useState<Abonado[]>(contrato?.abonados || []);

  useEffect(() => {
    const cargarTelefono = async () => {
      try {
        const data = await TarjetaClienteService.obtenerCliente(clienteId);
        setTelefonoState(data?.telefono || "");
      } catch (err) {
        console.error("❌ Error al cargar teléfono del cliente:", err);
      }
    };
    cargarTelefono();
  }, [clienteId]);

  const agregarAbonado = () => {
    const nuevoAbonado: Abonado = {
      id_abonado: "",
      numero: "",
      cap: "",
      compania_donante: "",
      sim_cards: [{ iccid: "", estado_sim: "" }],
    };
    setAbonados(prev => [...prev, nuevoAbonado]);
    setCantidadLineas(prev => prev + 1);
  };

  const handleGuardar = async () => {
    const payload: Partial<Contrato> = {
      cliente_id: clienteId,
      fecha,
      nombre_ejecutivo: nombreEjecutivo,
      rut_ejecutivo: rutEjecutivo,
      biometria: {
        nombre_cliente: nombreClienteState,
        rut_cliente: rutClienteState,
        codigo_BO: codigoBiometria,
      },
      direccion: direccionState,
      email: emailState,
      telefono: telefonoState,
      ciclo,
      tipo,
      modo,
      plan: planSeleccionado.plan,
      cod_plan: planSeleccionado.cod_plan,
      cantidad_lineas: cantidadLineas,
      abonados,
    };
    try {
      if (contrato?.contrato_id) {
        await actualizarContrato(clienteId, contrato.contrato_id, payload);
      } else {
        await crearContrato(clienteId, payload);
      }
      await TarjetaClienteService.actualizarCampo(clienteId, "telefono", telefonoState);
      onContratoGuardado();
      onCerrar();
    } catch (err) {
      console.error("Error al guardar contrato:", err);
    }
  };

  return (
<SidePanel
  open={open}
  onClose={onCerrar}
  className={estilos.fichaEnganche.lateral}  // solo color al texto del panel y título
  title="Ficha de Enganche Manual"
  width={800}
>
  <form
    onSubmit={e => {
      e.preventDefault();
      handleGuardar();
    }}
    className={estilos.fichaEnganche.form}
  >
        <EditableField label="Fecha" value={fecha} onChange={setFecha} readOnly />
        <EditableField label="Nombre Ejecutivo" value={nombreEjecutivo} onChange={setNombreEjecutivo} />
        <EditableField label="RUT Ejecutivo" value={rutEjecutivo} onChange={setRutEjecutivo} />
        <EditableField label="Nombre Cliente" value={nombreClienteState} onChange={setNombreClienteState} />
        <EditableField label="RUT Cliente" value={rutClienteState} onChange={setRutClienteState} />
        <EditableField label="Código Biometría" value={codigoBiometria} onChange={setCodigoBiometria} />
        <EditableField label="Dirección" value={direccionState} onChange={setDireccionState} />
        <EditableField label="Email" value={emailState} onChange={setEmailState} inputType="email" />
        <EditableField label="Contacto" value={telefonoState} onChange={setTelefonoState} />

        <div className={estilos.fichaEnganche.flexSelect}>
          <label className={estilos.fichaEnganche.label}>Ciclo:</label>
          <select value={ciclo} onChange={e => setCiclo(e.target.value)} className={estilos.fichaEnganche.input}>
            {ciclos.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className={estilos.fichaEnganche.flexSelect}>
          <label className={estilos.fichaEnganche.label}>Plan:</label>
          <select
            value={`${planSeleccionado.plan}|||${planSeleccionado.cod_plan}`}
            onChange={e => {
              const [plan, cod] = e.target.value.split("|||");
              setPlanSeleccionado({ plan, cod_plan: cod });
            }}
            className={estilos.fichaEnganche.input}
          >
            {planes.map(p => (
              <option key={p.cod_plan} value={`${p.plan}|||${p.cod_plan}`}>
                {p.plan} - {p.cod_plan}
              </option>
            ))}
          </select>
        </div>
        <div className={estilos.fichaEnganche.flexSelect}>
          <label className={estilos.fichaEnganche.label}>Tipo:</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className={estilos.fichaEnganche.input}>
            {tipos.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className={estilos.fichaEnganche.flexSelect}>
          <label className={estilos.fichaEnganche.label}>Modo:</label>
          <select value={modo} onChange={e => setModo(e.target.value)} className={estilos.fichaEnganche.input}>
            {modos.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className={estilos.fichaEnganche.flexInput}>
          <label className={estilos.fichaEnganche.label}>Cantidad Líneas:</label>
          <input
            type="number"
            min={1}
            value={cantidadLineas}
            onChange={e => setCantidadLineas(Number(e.target.value))}
            className={estilos.fichaEnganche.input}
          />
          <button type="button" className={estilos.fichaEnganche.botonSecundario} onClick={agregarAbonado}>
            Agregar abonado
          </button>
        </div>

        {/* Contenedor de la tabla de abonados con padding */}
        <div className={estilos.fichaEnganche.contenedorAbonados}>
          <div className="grid grid-cols-6 gap-4 font-bold mb-2">
            <span>Número</span>
            <span>Empresa Donante</span>
            <span>CAP</span>
            <span className="min-w-[120px]">Serial SIM</span>
            <span className="min-w-[90px]">Estado SIM</span>
            <span>Acción</span>
          </div>
          {abonados.map((ab, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-4 mb-2">
              <input type="hidden" value={ab.id_abonado || ""} />
              <input className={estilos.fichaEnganche.input} value={ab.numero || ""} placeholder="Número"
                onChange={e => {
                  const nuevos = [...abonados];
                  nuevos[idx].numero = e.target.value;
                  setAbonados(nuevos);
                }} />
              <input className={estilos.fichaEnganche.input} value={ab.compania_donante || ""} placeholder="Empresa"
                onChange={e => {
                  const nuevos = [...abonados];
                  nuevos[idx].compania_donante = e.target.value;
                  setAbonados(nuevos);
                }} />
              <input className={estilos.fichaEnganche.input} value={ab.cap || ""} placeholder="CAP"
                onChange={e => {
                  const nuevos = [...abonados];
                  nuevos[idx].cap = e.target.value;
                  setAbonados(nuevos);
                }} />
              <input className={estilos.fichaEnganche.input}
                value={ab.sim_cards && ab.sim_cards[0]?.iccid ? ab.sim_cards[0].iccid : ""}
                placeholder="Serial SIM"
                onChange={e => {
                  const nuevos = [...abonados];
                  if (!nuevos[idx].sim_cards) nuevos[idx].sim_cards = [{ iccid: "", estado_sim: "" }];
                  nuevos[idx].sim_cards[0].iccid = e.target.value;
                  setAbonados(nuevos);
                }} />
              <input className={estilos.fichaEnganche.input}
                value={ab.sim_cards && ab.sim_cards[0]?.estado_sim ? ab.sim_cards[0].estado_sim : ""}
                placeholder="Estado"
                onChange={e => {
                  const nuevos = [...abonados];
                  if (!nuevos[idx].sim_cards) nuevos[idx].sim_cards = [{ iccid: "", estado_sim: "" }];
                  nuevos[idx].sim_cards[0].estado_sim = e.target.value;
                  setAbonados(nuevos);
                }} />
              <button type="button" className="mx-auto text-red-500" title="Eliminar"
                onClick={() => setAbonados(a => a.filter((_, i) => i !== idx))}>
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <div className={estilos.fichaEnganche.botonesContainer}>
          <button type="button" onClick={onCerrar} className={estilos.fichaEnganche.botonSecundario}>Cancelar edición</button>
          <button type="submit" className={estilos.fichaEnganche.botonPrincipal}>
            <Save size={16} /> Guardar formulario
          </button>
        </div>
      </form>
    </SidePanel>
  );
};

export default FichaEnganche;
