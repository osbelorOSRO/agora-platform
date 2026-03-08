// src/services/tarjetas/tarjeta.cierre.proceso.service.ts
import { getTokenData } from "@/utils/getTokenData";
import { getAuthHeaders as getTokenHeader } from "@/utils/getAuthHeaders";

const BASE_URL = import.meta.env.VITE_API_URL;

const tarjetaCierreProcesoService = {
  async obtenerProcesoActivo(clienteId: string) {
    const res = await fetch(`${BASE_URL}/procesos/cliente/${clienteId}`, {
      headers: getTokenHeader(),
    });

    if (!res.ok) throw new Error("Error al obtener proceso activo");

    return await res.json();
  },

  async cerrarProceso(payload: {
    proceso_id: string;
    tipo_proceso: string;
    tipo_cierre: string;
    abandono: boolean;
    cerrado_por_id: string | number;
    fuente?: string;
  }) {
    const res = await fetch(`${BASE_URL}/procesos-pg/cerrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getTokenHeader(), // 🔥 AGREGAR: Headers de autenticación
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(errorText || "Error al cerrar el proceso");
    }

    return await res.json();
  },
};

export default tarjetaCierreProcesoService;
