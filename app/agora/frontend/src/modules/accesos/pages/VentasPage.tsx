import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  obtenerVentas,
  crearVenta,
  actualizarVenta,
  eliminarVenta,
  obtenerPuntosMes,
  obtenerCatalogo,
  crearOferta,
  actualizarOferta,
  eliminarOferta,
  obtenerMatrizPrecios,
  crearPrecioNivel,
  actualizarPrecioNivel,
  eliminarPrecioNivel,
} from "../services/salesRecordService";
import type {
  SaleRecord,
  SaleMonthlyPoints,
  Offer,
  PriceLevel,
  CreateSaleDto,
  ModalidadVenta,
} from "../types/salesRecord";
import { MODALIDADES, MODALIDAD_LABELS, PUNTOS_VALIDOS, RANGO_LABELS } from "../types/salesRecord";

// ─── Constantes ───────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full min-w-[70px] bg-transparent border border-[#3D3D3D] rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";
const SELECT_CLS =
  "bg-background border border-[#3D3D3D] rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";
const MODAL_INPUT_CLS =
  "w-full bg-[#0A0A0A] border border-[#3D3D3D] rounded-xl px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]";
const MODAL_SELECT_CLS =
  "w-full bg-[#0A0A0A] border border-[#3D3D3D] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const FORM_INICIAL: CreateSaleDto = {
  fecha: "",
  run: "",
  full_name: "",
  phone: "",
  address: "",
  city: "",
  province: "",
  country: "Chile",
  contract_number: "",
  modality: "POST_A_POST",
  offers_code: "",
};

type Tab = "ventas" | "catalogo" | "precios";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatPrecio(n: number): string {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 });
}

function progressInfo(totalPoints: number, activeRange: number): { percent: number; label: string } {
  if (activeRange >= 3) return { percent: 100, label: `${totalPoints} pts — Rango máximo alcanzado` };
  if (activeRange === 2) {
    return {
      percent: Math.min(((totalPoints - 20) / 15) * 100, 100),
      label: `${totalPoints} / 35 pts para Rango 3`,
    };
  }
  return {
    percent: Math.min((totalPoints / 20) * 100, 100),
    label: `${totalPoints} / 20 pts para Rango 2`,
  };
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function VentasPage() {
  const now = new Date();

  // ── Tab ──────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("ventas");

  // ── Ventas ───────────────────────────────────────────────────
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [ventas, setVentas] = useState<SaleRecord[]>([]);
  const [puntos, setPuntos] = useState<SaleMonthlyPoints | null>(null);
  const [editandoVentaId, setEditandoVentaId] = useState<number | null>(null);
  const [formVenta, setFormVenta] = useState<Partial<SaleRecord>>({});
  const [modalVenta, setModalVenta] = useState(false);
  const [nuevaVenta, setNuevaVenta] = useState<CreateSaleDto>(FORM_INICIAL);
  const [cargandoVenta, setCargandoVenta] = useState(false);

  // ── Catálogo ─────────────────────────────────────────────────
  const [catalogo, setCatalogo] = useState<Offer[]>([]);
  const [editandoCatId, setEditandoCatId] = useState<number | null>(null);
  const [formCat, setFormCat] = useState<Partial<Offer>>({});

  // ── Precios ──────────────────────────────────────────────────
  const [precios, setPrecios] = useState<PriceLevel[]>([]);
  const [editandoPrecioId, setEditandoPrecioId] = useState<number | null>(null);
  const [formPrecio, setFormPrecio] = useState<Partial<PriceLevel>>({});

  // ─── Carga de datos ───────────────────────────────────────────────────────

  useEffect(() => {
    cargarVentas();
  }, [viewYear, viewMonth]);

  useEffect(() => {
    if (tab === "catalogo" && catalogo.length === 0) cargarCatalogo();
    if (tab === "precios" && precios.length === 0) cargarPrecios();
  }, [tab]);

  const cargarVentas = async () => {
    const [v, p] = await Promise.all([
      obtenerVentas(viewYear, viewMonth),
      obtenerPuntosMes(viewYear, viewMonth),
    ]);
    setVentas(v);
    setPuntos(p);
  };

  const cargarCatalogo = async () => {
    setCatalogo(await obtenerCatalogo());
  };

  const cargarPrecios = async () => {
    setPrecios(await obtenerMatrizPrecios());
  };

  // ─── Navegación mensual ───────────────────────────────────────────────────

  const goPrev = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  };

  const goNext = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  };

  const mesNombre = `${MESES[viewMonth - 1]} ${viewYear}`;

  // ─── Handlers: ventas ─────────────────────────────────────────────────────

  const handleEditVenta = (v: SaleRecord) => { setEditandoVentaId(v.id); setFormVenta(v); };
  const handleCancelVenta = () => { setEditandoVentaId(null); setFormVenta({}); };

  const handleGuardarVenta = async () => {
    if (!editandoVentaId) return;
    await actualizarVenta(editandoVentaId, {
      run: formVenta.run,
      full_name: formVenta.full_name,
      phone: formVenta.phone,
      address: formVenta.address,
      city: formVenta.city,
      province: formVenta.province,
      country: formVenta.country,
      contract_number: formVenta.contract_number,
    });
    await cargarVentas();
    setEditandoVentaId(null);
    setFormVenta({});
  };

  const handleEliminarVenta = async (id: number) => {
    if (!confirm("¿Eliminar esta venta? Se recalcularán los puntos del mes.")) return;
    await eliminarVenta(id);
    await cargarVentas();
  };

  const handleCrearVenta = async () => {
    const required: (keyof CreateSaleDto)[] = [
      "fecha", "run", "full_name", "phone", "address",
      "city", "province", "country", "contract_number", "modality", "offers_code",
    ];
    if (required.some((k) => !nuevaVenta[k])) {
      alert("Completa todos los campos obligatorios.");
      return;
    }
    setCargandoVenta(true);
    try {
      await crearVenta(nuevaVenta);
      setModalVenta(false);
      setNuevaVenta(FORM_INICIAL);
      await cargarVentas();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al registrar la venta.";
      alert(Array.isArray(msg) ? msg.join("\n") : msg);
    } finally {
      setCargandoVenta(false);
    }
  };

  // ─── Handlers: catálogo ───────────────────────────────────────────────────

  const handleAgregarCat = () => {
    const nuevo: Offer = { id: 0, code: "", modality: "POST_A_POST", level: 5, points: "1" };
    setCatalogo([...catalogo, nuevo]);
    setEditandoCatId(0);
    setFormCat(nuevo);
  };

  const handleEditCat = (o: Offer) => { setEditandoCatId(o.id); setFormCat(o); };
  const handleCancelCat = () => {
    setEditandoCatId(null);
    setFormCat({});
    setCatalogo((prev) => prev.filter((o) => o.id !== 0));
  };

  const handleGuardarCat = async () => {
    if (!formCat.code || !formCat.modality || !formCat.level || formCat.points === undefined) return;
    if (editandoCatId === 0) {
      await crearOferta({
        code: formCat.code,
        modality: formCat.modality as ModalidadVenta,
        level: Number(formCat.level),
        points: Number(formCat.points),
      });
    } else if (editandoCatId !== null) {
      await actualizarOferta(editandoCatId, {
        level: Number(formCat.level),
        points: Number(formCat.points),
      });
    }
    await cargarCatalogo();
    setEditandoCatId(null);
    setFormCat({});
  };

  const handleEliminarCat = async (id: number) => {
    if (!confirm("¿Eliminar esta oferta del catálogo?")) return;
    await eliminarOferta(id);
    await cargarCatalogo();
  };

  // ─── Handlers: precios ────────────────────────────────────────────────────

  const handleAgregarPrecio = () => {
    const nuevo: PriceLevel = { id: 0, level: 1, range: 1, price: 0 };
    setPrecios([...precios, nuevo]);
    setEditandoPrecioId(0);
    setFormPrecio(nuevo);
  };

  const handleEditPrecio = (p: PriceLevel) => { setEditandoPrecioId(p.id); setFormPrecio(p); };
  const handleCancelPrecio = () => {
    setEditandoPrecioId(null);
    setFormPrecio({});
    setPrecios((prev) => prev.filter((p) => p.id !== 0));
  };

  const handleGuardarPrecio = async () => {
    if (formPrecio.price === undefined) return;
    if (editandoPrecioId === 0) {
      await crearPrecioNivel({
        level: Number(formPrecio.level),
        range: Number(formPrecio.range),
        price: Number(formPrecio.price),
      });
    } else if (editandoPrecioId !== null) {
      await actualizarPrecioNivel(editandoPrecioId, { price: Number(formPrecio.price) });
    }
    await cargarPrecios();
    setEditandoPrecioId(null);
    setFormPrecio({});
  };

  const handleEliminarPrecio = async (id: number) => {
    if (!confirm("¿Eliminar esta entrada de precio?")) return;
    await eliminarPrecioNivel(id);
    await cargarPrecios();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const { percent: progressPct, label: progressLabel } = progressInfo(
    puntos?.total_points ?? 0,
    puntos?.active_range ?? 1,
  );

  return (
    <section className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-white">Ventas</h1>
        <p className="mt-2 text-sm text-[#999999]">
          Registro manual de ventas, catálogo de ofertas y matriz de precios.
        </p>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-xl border border-[#2D2D2D] bg-[#0A0A0A] p-1 w-fit">
        {(["ventas", "catalogo", "precios"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              tab === t
                ? "bg-[#1A1A1A] text-white"
                : "text-[#666666] hover:text-[#B3B3B3]"
            }`}
          >
            {t === "ventas" ? "Ventas" : t === "catalogo" ? "Catálogo" : "Matriz de Precios"}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: VENTAS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "ventas" && (
        <>
          {/* Tarjeta de puntos + navegación mensual */}
          <div className="rounded-2xl border border-[#2D2D2D] bg-[#141414] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={goPrev}
                className="flex items-center gap-1 text-sm text-[#666666] hover:text-white transition"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-lg font-bold text-white tracking-tight">{mesNombre}</h2>
              <button
                onClick={goNext}
                className="flex items-center gap-1 text-sm text-[#666666] hover:text-white transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-white tabular-nums">
                {puntos?.total_points ?? 0}
              </span>
              <span className="text-sm text-[#666666] mb-1">puntos acumulados</span>
              <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1A1A1A] border border-[#2D2D2D] text-primary">
                {RANGO_LABELS[puntos?.active_range ?? 1]}
              </span>
            </div>

            <div>
              <div className="w-full bg-[#1A1A1A] rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[#555555]">{progressLabel}</p>
            </div>
          </div>

          {/* Cabecera + botón agregar */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#4D4D4D]">
              {ventas.length} venta{ventas.length !== 1 ? "s" : ""} en {mesNombre}
            </p>
            <button
              type="button"
              onClick={() => setModalVenta(true)}
              className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#141414] px-4 py-2 text-sm font-medium text-[#B3B3B3] transition hover:bg-[#1A1A1A] hover:text-white"
            >
              <CirclePlus size={15} />
              Registrar venta
            </button>
          </div>

          {/* Tabla de ventas */}
          <div className="overflow-x-auto rounded-2xl border border-[#2D2D2D] scrollbar-custom">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D2D2D] bg-[#141414] text-left text-xs font-semibold uppercase tracking-wider text-[#666666]">
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">RUN</th>
                  <th className="px-3 py-3">Nombre</th>
                  <th className="px-3 py-3">Teléfono</th>
                  <th className="px-3 py-3">Ciudad</th>
                  <th className="px-3 py-3">Provincia</th>
                  <th className="px-3 py-3">N° Contrato</th>
                  <th className="px-3 py-3">Modalidad</th>
                  <th className="px-3 py-3">Código</th>
                  <th className="px-3 py-3 text-right">Nivel</th>
                  <th className="px-3 py-3 text-right">Pts</th>
                  <th className="px-3 py-3 text-right">Precio</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B1B1B]">
                {ventas.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-8 text-center text-sm text-[#555555]">
                      Sin ventas en {mesNombre}.
                    </td>
                  </tr>
                )}
                {ventas.map((v) => (
                  <tr key={v.id} className="transition hover:bg-[#141414]">
                    <td className="px-3 py-3 text-xs text-[#999999] whitespace-nowrap">
                      {formatFecha(v.fecha)}
                    </td>

                    <td className="px-3 py-3">
                      {editandoVentaId === v.id
                        ? <input className={INPUT_CLS} value={formVenta.run ?? ""} onChange={(e) => setFormVenta({ ...formVenta, run: e.target.value })} />
                        : <span className="font-mono text-xs text-[#B3B3B3]">{v.run}</span>}
                    </td>

                    <td className="px-3 py-3">
                      {editandoVentaId === v.id
                        ? <input className={INPUT_CLS} value={formVenta.full_name ?? ""} onChange={(e) => setFormVenta({ ...formVenta, full_name: e.target.value })} />
                        : <span className="text-white font-medium">{v.full_name}</span>}
                    </td>

                    <td className="px-3 py-3">
                      {editandoVentaId === v.id
                        ? <input className={INPUT_CLS} value={formVenta.phone ?? ""} onChange={(e) => setFormVenta({ ...formVenta, phone: e.target.value })} />
                        : <span className="text-[#B3B3B3]">{v.phone}</span>}
                    </td>

                    <td className="px-3 py-3">
                      {editandoVentaId === v.id
                        ? <input className={INPUT_CLS} value={formVenta.city ?? ""} onChange={(e) => setFormVenta({ ...formVenta, city: e.target.value })} />
                        : <span className="text-[#B3B3B3]">{v.city}</span>}
                    </td>

                    <td className="px-3 py-3">
                      {editandoVentaId === v.id
                        ? <input className={INPUT_CLS} value={formVenta.province ?? ""} onChange={(e) => setFormVenta({ ...formVenta, province: e.target.value })} />
                        : <span className="text-[#B3B3B3]">{v.province}</span>}
                    </td>

                    <td className="px-3 py-3">
                      {editandoVentaId === v.id
                        ? <input className={INPUT_CLS} value={formVenta.contract_number ?? ""} onChange={(e) => setFormVenta({ ...formVenta, contract_number: e.target.value })} />
                        : <span className="font-mono text-xs text-[#B3B3B3]">{v.contract_number}</span>}
                    </td>

                    <td className="px-3 py-3">
                      <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#B3B3B3]">
                        {MODALIDAD_LABELS[v.modality]}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-[#B3B3B3]">{v.offers_code}</span>
                    </td>

                    <td className="px-3 py-3 text-right text-xs text-[#999999]">{v.level_price}</td>
                    <td className="px-3 py-3 text-right text-xs text-[#999999]">{v.points}</td>

                    <td className="px-3 py-3 text-right font-semibold text-white whitespace-nowrap">
                      {formatPrecio(v.offers_price)}
                    </td>

                    <td className="px-3 py-3">
                      {editandoVentaId === v.id ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={handleGuardarVenta} className="text-emerald-400 hover:text-emerald-300 transition"><Save size={15} /></button>
                          <button type="button" onClick={handleCancelVenta} className="text-[#666666] hover:text-[#B3B3B3] transition"><X size={15} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleEditVenta(v)} className="text-[#808080] hover:text-white transition"><Pencil size={14} /></button>
                          <button type="button" onClick={() => handleEliminarVenta(v.id)} className="text-[#666666] hover:text-red-400 transition"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CATÁLOGO
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "catalogo" && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Catálogo de ofertas</h2>
              <p className="mt-1 text-sm text-[#999999]">Códigos de oferta, modalidad, nivel y puntos por venta.</p>
            </div>
            <button
              type="button"
              onClick={handleAgregarCat}
              disabled={editandoCatId !== null}
              className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#141414] px-4 py-2 text-sm font-medium text-[#B3B3B3] transition hover:bg-[#1A1A1A] hover:text-white disabled:opacity-40"
            >
              <CirclePlus size={15} />
              Agregar
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#2D2D2D] scrollbar-custom">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D2D2D] bg-[#141414] text-left text-xs font-semibold uppercase tracking-wider text-[#666666]">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Modalidad</th>
                  <th className="px-4 py-3">Nivel (1–9)</th>
                  <th className="px-4 py-3">Puntos</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B1B1B]">
                {catalogo.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#555555]">
                      Sin ofertas en el catálogo.
                    </td>
                  </tr>
                )}
                {catalogo.map((o) => (
                  <tr key={o.id} className="transition hover:bg-[#141414]">
                    <td className="px-4 py-3 text-[#999999]">{o.id || "—"}</td>

                    <td className="px-4 py-3">
                      {editandoCatId === o.id
                        ? <input className={INPUT_CLS} value={formCat.code ?? ""} onChange={(e) => setFormCat({ ...formCat, code: e.target.value })} placeholder="4FU" disabled={o.id !== 0} />
                        : <span className="font-mono font-bold text-white">{o.code}</span>}
                    </td>

                    <td className="px-4 py-3">
                      {editandoCatId === o.id && o.id === 0
                        ? (
                          <select className={SELECT_CLS} value={formCat.modality ?? "POST_A_POST"} onChange={(e) => setFormCat({ ...formCat, modality: e.target.value as ModalidadVenta })}>
                            {MODALIDADES.map((m) => <option key={m} value={m}>{MODALIDAD_LABELS[m]}</option>)}
                          </select>
                        )
                        : <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#B3B3B3]">{MODALIDAD_LABELS[o.modality]}</span>}
                    </td>

                    <td className="px-4 py-3">
                      {editandoCatId === o.id
                        ? <input className={INPUT_CLS} type="number" min={1} max={9} value={formCat.level ?? ""} onChange={(e) => setFormCat({ ...formCat, level: Number(e.target.value) })} />
                        : <span className="text-[#CCCCCC]">{o.level}</span>}
                    </td>

                    <td className="px-4 py-3">
                      {editandoCatId === o.id
                        ? (
                          <select className={SELECT_CLS} value={formCat.points ?? "1"} onChange={(e) => setFormCat({ ...formCat, points: e.target.value })}>
                            {PUNTOS_VALIDOS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        )
                        : <span className="text-[#CCCCCC]">{o.points}</span>}
                    </td>

                    <td className="px-4 py-3">
                      {editandoCatId === o.id ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={handleGuardarCat} className="text-emerald-400 hover:text-emerald-300 transition"><Save size={15} /></button>
                          <button type="button" onClick={handleCancelCat} className="text-[#666666] hover:text-[#B3B3B3] transition"><X size={15} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleEditCat(o)} className="text-[#808080] hover:text-white transition"><Pencil size={14} /></button>
                          <button type="button" onClick={() => handleEliminarCat(o.id)} className="text-[#666666] hover:text-red-400 transition"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#4D4D4D]">Total: {catalogo.filter((o) => o.id !== 0).length} oferta{catalogo.filter((o) => o.id !== 0).length !== 1 ? "s" : ""}</p>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: MATRIZ DE PRECIOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "precios" && (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Matriz de precios</h2>
              <p className="mt-1 text-sm text-[#999999]">
                Precio por nivel (1–9) y rango de puntos. El rango se asigna automáticamente según los puntos del mes.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAgregarPrecio}
              disabled={editandoPrecioId !== null}
              className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#141414] px-4 py-2 text-sm font-medium text-[#B3B3B3] transition hover:bg-[#1A1A1A] hover:text-white disabled:opacity-40"
            >
              <CirclePlus size={15} />
              Agregar
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#2D2D2D] scrollbar-custom">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2D2D2D] bg-[#141414] text-left text-xs font-semibold uppercase tracking-wider text-[#666666]">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3">Rango</th>
                  <th className="px-4 py-3 text-right">Precio (CLP)</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B1B1B]">
                {precios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#555555]">
                      Sin entradas de precio configuradas.
                    </td>
                  </tr>
                )}
                {precios.map((p) => (
                  <tr key={p.id} className="transition hover:bg-[#141414]">
                    <td className="px-4 py-3 text-[#999999]">{p.id || "—"}</td>

                    <td className="px-4 py-3">
                      {editandoPrecioId === p.id && p.id === 0
                        ? <input className={INPUT_CLS} type="number" min={1} max={9} value={formPrecio.level ?? ""} onChange={(e) => setFormPrecio({ ...formPrecio, level: Number(e.target.value) })} />
                        : <span className="text-white font-semibold">{p.level}</span>}
                    </td>

                    <td className="px-4 py-3">
                      {editandoPrecioId === p.id && p.id === 0
                        ? (
                          <select className={SELECT_CLS} value={formPrecio.range ?? 1} onChange={(e) => setFormPrecio({ ...formPrecio, range: Number(e.target.value) })}>
                            <option value={1}>Rango 1 (&lt; 20 pts)</option>
                            <option value={2}>Rango 2 (20–34 pts)</option>
                            <option value={3}>Rango 3 (≥ 35 pts)</option>
                          </select>
                        )
                        : <span className="text-[#CCCCCC]">{RANGO_LABELS[p.range]}</span>}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {editandoPrecioId === p.id
                        ? <input className={`${INPUT_CLS} text-right`} type="number" min={0} value={formPrecio.price ?? ""} onChange={(e) => setFormPrecio({ ...formPrecio, price: Number(e.target.value) })} />
                        : <span className="font-semibold text-white">{formatPrecio(p.price)}</span>}
                    </td>

                    <td className="px-4 py-3">
                      {editandoPrecioId === p.id ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={handleGuardarPrecio} className="text-emerald-400 hover:text-emerald-300 transition"><Save size={15} /></button>
                          <button type="button" onClick={handleCancelPrecio} className="text-[#666666] hover:text-[#B3B3B3] transition"><X size={15} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleEditPrecio(p)} className="text-[#808080] hover:text-white transition"><Pencil size={14} /></button>
                          <button type="button" onClick={() => handleEliminarPrecio(p.id)} className="text-[#666666] hover:text-red-400 transition"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#4D4D4D]">Total: {precios.filter((p) => p.id !== 0).length} entrada{precios.filter((p) => p.id !== 0).length !== 1 ? "s" : ""}</p>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Registrar venta
      ══════════════════════════════════════════════════════════════════════ */}
      {modalVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/90 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#2D2D2D] bg-[#141414] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2D2D2D] px-6 py-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                Registrar venta
              </h3>
              <button
                onClick={() => { setModalVenta(false); setNuevaVenta(FORM_INICIAL); }}
                className="text-[#666666] hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Fila 1: fecha + modalidad + código */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">Fecha</label>
                  <input
                    type="date"
                    className={MODAL_INPUT_CLS}
                    value={nuevaVenta.fecha}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, fecha: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">Modalidad</label>
                  <select
                    className={MODAL_SELECT_CLS}
                    value={nuevaVenta.modality}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, modality: e.target.value as ModalidadVenta })}
                  >
                    {MODALIDADES.map((m) => (
                      <option key={m} value={m}>{MODALIDAD_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">Código oferta</label>
                  <input
                    className={MODAL_INPUT_CLS}
                    placeholder="4FU"
                    value={nuevaVenta.offers_code}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, offers_code: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              {/* Fila 2: RUN + nombre */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">RUN</label>
                  <input
                    className={MODAL_INPUT_CLS}
                    placeholder="12345678-9"
                    value={nuevaVenta.run}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, run: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">Nombre completo</label>
                  <input
                    className={MODAL_INPUT_CLS}
                    placeholder="Juan Pérez"
                    value={nuevaVenta.full_name}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, full_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Fila 3: teléfono + N° contrato */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">Teléfono</label>
                  <input
                    className={MODAL_INPUT_CLS}
                    placeholder="912345678"
                    value={nuevaVenta.phone}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">N° Contrato</label>
                  <input
                    className={MODAL_INPUT_CLS}
                    placeholder="C-001"
                    value={nuevaVenta.contract_number}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, contract_number: e.target.value })}
                  />
                </div>
              </div>

              {/* Fila 4: dirección */}
              <div className="space-y-1">
                <label className="text-xs text-[#666666] uppercase tracking-wider">Dirección</label>
                <input
                  className={MODAL_INPUT_CLS}
                  placeholder="Av. Principal 123"
                  value={nuevaVenta.address}
                  onChange={(e) => setNuevaVenta({ ...nuevaVenta, address: e.target.value })}
                />
              </div>

              {/* Fila 5: ciudad + provincia + país */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">Ciudad</label>
                  <input
                    className={MODAL_INPUT_CLS}
                    placeholder="Santiago"
                    value={nuevaVenta.city}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">Provincia</label>
                  <input
                    className={MODAL_INPUT_CLS}
                    placeholder="Santiago"
                    value={nuevaVenta.province}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, province: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#666666] uppercase tracking-wider">País</label>
                  <input
                    className={MODAL_INPUT_CLS}
                    placeholder="Chile"
                    value={nuevaVenta.country}
                    onChange={(e) => setNuevaVenta({ ...nuevaVenta, country: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-[#2D2D2D] px-6 py-4">
              <button
                type="button"
                onClick={() => { setModalVenta(false); setNuevaVenta(FORM_INICIAL); }}
                className="rounded-xl border border-[#2D2D2D] bg-[#0A0A0A] px-4 py-2 text-sm text-[#B3B3B3] hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCrearVenta}
                disabled={cargandoVenta}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
              >
                {cargandoVenta ? "Guardando…" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
