import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  importarVentasCSV,
} from "@/modules/accesos/services/salesRecordService";
import type { BulkImportResult } from "@/modules/accesos/services/salesRecordService";
import type {
  SaleRecord,
  Offer,
  PriceLevel,
  CreateSaleDto,
  ModalidadVenta,
} from "@/modules/accesos/types/salesRecord";
import { FORM_INICIAL, MESES, type Tab } from "../constants";

export function useVentasPage() {
  const qc = useQueryClient();
  const now = new Date();

  const [tab, setTab] = useState<Tab>("ventas");
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [editandoVentaId, setEditandoVentaId] = useState<number | null>(null);
  const [formVenta, setFormVenta] = useState<Partial<SaleRecord>>({});
  const [modalVenta, setModalVenta] = useState(false);
  const [nuevaVenta, setNuevaVenta] = useState<CreateSaleDto>(FORM_INICIAL);
  const [resultadoImport, setResultadoImport] = useState<BulkImportResult | null>(null);
  const [editandoCatId, setEditandoCatId] = useState<number | null>(null);
  const [formCat, setFormCat] = useState<Partial<Offer>>({});
  const [editandoPrecioId, setEditandoPrecioId] = useState<number | null>(null);
  const [formPrecio, setFormPrecio] = useState<Partial<PriceLevel>>({});
  const csvInputRef = useRef<HTMLInputElement>(null);

  const mesNombre = `${MESES[viewMonth - 1]} ${viewYear}`;

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: ventas = [] } = useQuery({
    queryKey: ["ventas", viewYear, viewMonth],
    queryFn: () => obtenerVentas(viewYear, viewMonth),
  });

  const { data: puntos = null } = useQuery({
    queryKey: ["puntos", viewYear, viewMonth],
    queryFn: () => obtenerPuntosMes(viewYear, viewMonth),
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ["catalogo"],
    queryFn: obtenerCatalogo,
    enabled: tab === "catalogo",
  });

  const { data: precios = [] } = useQuery({
    queryKey: ["precios"],
    queryFn: obtenerMatrizPrecios,
    enabled: tab === "precios",
  });

  // ── Navegación mensual ───────────────────────────────────────────────────────

  const goPrev = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  };

  const goNext = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  };

  // ── Mutations: ventas ────────────────────────────────────────────────────────

  const invalidateVentas = () => qc.invalidateQueries({ queryKey: ["ventas", viewYear, viewMonth] });
  const invalidatePuntos = () => qc.invalidateQueries({ queryKey: ["puntos", viewYear, viewMonth] });

  const { mutateAsync: guardarVenta, isPending: guardandoVenta } = useMutation({
    mutationFn: () => actualizarVenta(editandoVentaId!, {
      run: formVenta.run, full_name: formVenta.full_name, phone: formVenta.phone,
      address: formVenta.address, city: formVenta.city, province: formVenta.province,
      country: formVenta.country, contract_number: formVenta.contract_number,
    }),
    onSuccess: () => { invalidateVentas(); setEditandoVentaId(null); setFormVenta({}); },
  });

  const { mutateAsync: eliminarVentaMut } = useMutation({
    mutationFn: (id: number) => eliminarVenta(id),
    onSuccess: () => { invalidateVentas(); invalidatePuntos(); },
  });

  const { mutateAsync: crearVentaMut, isPending: cargandoVenta } = useMutation({
    mutationFn: () => crearVenta(nuevaVenta),
    onSuccess: () => {
      invalidateVentas();
      invalidatePuntos();
      setModalVenta(false);
      setNuevaVenta(FORM_INICIAL);
    },
  });

  const { mutateAsync: importarCSV, isPending: importando } = useMutation({
    mutationFn: (file: File) => importarVentasCSV(file),
    onSuccess: (result) => {
      setResultadoImport(result);
      invalidateVentas();
      invalidatePuntos();
    },
  });

  // ── Mutations: catálogo ──────────────────────────────────────────────────────

  const invalidateCatalogo = () => qc.invalidateQueries({ queryKey: ["catalogo"] });

  const { mutateAsync: guardarCat } = useMutation({
    mutationFn: async () => {
      if (!formCat.code || !formCat.modality || !formCat.level || formCat.points === undefined) return;
      if (editandoCatId === 0) {
        await crearOferta({ code: formCat.code, modality: formCat.modality as ModalidadVenta, level: Number(formCat.level), points: Number(formCat.points) });
      } else if (editandoCatId !== null) {
        await actualizarOferta(editandoCatId, { level: Number(formCat.level), points: Number(formCat.points) });
      }
    },
    onSuccess: () => { invalidateCatalogo(); setEditandoCatId(null); setFormCat({}); },
  });

  const { mutateAsync: eliminarCatMut } = useMutation({
    mutationFn: (id: number) => eliminarOferta(id),
    onSuccess: invalidateCatalogo,
  });

  // ── Mutations: precios ───────────────────────────────────────────────────────

  const invalidatePrecios = () => qc.invalidateQueries({ queryKey: ["precios"] });

  const { mutateAsync: guardarPrecio } = useMutation({
    mutationFn: async () => {
      if (formPrecio.price === undefined) return;
      if (editandoPrecioId === 0) {
        await crearPrecioNivel({ level: Number(formPrecio.level), range: Number(formPrecio.range), price: Number(formPrecio.price) });
      } else if (editandoPrecioId !== null) {
        await actualizarPrecioNivel(editandoPrecioId, { price: Number(formPrecio.price) });
      }
    },
    onSuccess: () => { invalidatePrecios(); setEditandoPrecioId(null); setFormPrecio({}); },
  });

  const { mutateAsync: eliminarPrecioMut } = useMutation({
    mutationFn: (id: number) => eliminarPrecioNivel(id),
    onSuccess: invalidatePrecios,
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleEditVenta = (v: SaleRecord) => { setEditandoVentaId(v.id); setFormVenta(v); };
  const handleCancelVenta = () => { setEditandoVentaId(null); setFormVenta({}); };
  const handleGuardarVenta = () => guardarVenta();

  const handleEliminarVenta = async (id: number) => {
    if (!confirm("¿Eliminar esta venta? Se recalcularán los puntos del mes.")) return;
    await eliminarVentaMut(id);
  };

  const handleCrearVenta = async () => {
    const required: (keyof CreateSaleDto)[] = [
      "fecha", "run", "full_name", "phone", "address", "city", "province", "country", "contract_number", "modality", "offers_code",
    ];
    if (required.some((k) => !nuevaVenta[k])) { alert("Completa todos los campos obligatorios."); return; }
    try {
      await crearVentaMut();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Error al registrar la venta.";
      alert(Array.isArray(msg) ? msg.join("\n") : msg);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setResultadoImport(null);
    try { await importarCSV(file); }
    catch (err) { alert(err instanceof Error ? err.message : "Error al importar el archivo"); }
  };

  const handleAgregarCat = () => {
    const nuevo: Offer = { id: 0, code: "", modality: "POST_A_POST", level: 5, points: "1" };
    qc.setQueryData(["catalogo"], (old: Offer[] = []) => [...old, nuevo]);
    setEditandoCatId(0);
    setFormCat(nuevo);
  };

  const handleEditCat = (o: Offer) => { setEditandoCatId(o.id); setFormCat(o); };
  const handleCancelCat = () => {
    setEditandoCatId(null);
    setFormCat({});
    qc.setQueryData(["catalogo"], (old: Offer[] = []) => old.filter((o) => o.id !== 0));
  };
  const handleGuardarCat = () => guardarCat();
  const handleEliminarCat = async (id: number) => {
    if (!confirm("¿Eliminar esta oferta del catálogo?")) return;
    await eliminarCatMut(id);
  };

  const handleAgregarPrecio = () => {
    const nuevo: PriceLevel = { id: 0, level: 1, range: 1, price: 0 };
    qc.setQueryData(["precios"], (old: PriceLevel[] = []) => [...old, nuevo]);
    setEditandoPrecioId(0);
    setFormPrecio(nuevo);
  };

  const handleEditPrecio = (p: PriceLevel) => { setEditandoPrecioId(p.id); setFormPrecio(p); };
  const handleCancelPrecio = () => {
    setEditandoPrecioId(null);
    setFormPrecio({});
    qc.setQueryData(["precios"], (old: PriceLevel[] = []) => old.filter((p) => p.id !== 0));
  };
  const handleGuardarPrecio = () => guardarPrecio();
  const handleEliminarPrecio = async (id: number) => {
    if (!confirm("¿Eliminar esta entrada de precio?")) return;
    await eliminarPrecioMut(id);
  };

  return {
    tab, setTab,
    viewYear, viewMonth, mesNombre,
    ventas, puntos,
    editandoVentaId, formVenta, setFormVenta,
    modalVenta, setModalVenta,
    nuevaVenta, setNuevaVenta,
    cargandoVenta,
    importando, resultadoImport, setResultadoImport,
    csvInputRef,
    catalogo: catalogo.concat(),  // copia para mutación optimista local
    editandoCatId, formCat, setFormCat,
    precios: precios.concat(),
    editandoPrecioId, formPrecio, setFormPrecio,
    goPrev, goNext,
    handleEditVenta, handleCancelVenta, handleGuardarVenta, handleEliminarVenta,
    handleCrearVenta, handleImportCSV,
    handleAgregarCat, handleEditCat, handleCancelCat, handleGuardarCat, handleEliminarCat,
    handleAgregarPrecio, handleEditPrecio, handleCancelPrecio, handleGuardarPrecio, handleEliminarPrecio,
  };
}
