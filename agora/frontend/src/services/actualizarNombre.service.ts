// src/services/clientes/actualizarNombre.service.ts

import { getAuthHeaders } from "@/utils/getAuthHeaders";

export const actualizarNombrePostgres = async (
  clienteId: string,
  nuevoNombre: string
): Promise<boolean> => {
  try {
    const res = await fetch(`${import.meta.env.VITE_MEDIA_BASE_URL}/clientes/actualizar-nombre`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        cliente_id: clienteId,
        nuevo_nombre: nuevoNombre,
      }),
    });

    const data = await res.json();
    return data.success === true;
  } catch (error) {
    console.error("❌ Error al actualizar nombre en PostgreSQL:", error);
    return false;
  }
};
