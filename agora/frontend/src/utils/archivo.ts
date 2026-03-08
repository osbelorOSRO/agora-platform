// utils/archivo.ts

// Subida simple (notas de voz o casos especiales)
export const subirArchivo = async (archivo: File, token: string): Promise<string> => {
  const formData = new FormData();
  formData.append("archivo", archivo);

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error al subir archivo:", res.status, errorText);
      throw new Error(`Error al subir archivo (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    if (!data?.url) {
      console.error("⚠️ El backend no devolvió una URL válida:", data);
      throw new Error("El backend no devolvió una URL válida del archivo.");
    }

    return data.url;

} catch (error) {
  if (error instanceof Error) {
    console.error("🚨 Excepción en subirArchivo:", error.message);
  } else {
    console.error("🚨 Excepción en subirArchivo:", error);
  }
  throw new Error("No se pudo subir el archivo.");
}
};


export const enviarArchivoConMensaje = async (
  archivo: File,
  tipo: 'imagen' | 'documento' | 'video',
  procesoId: number,
  usuario: string,
  token: string,
  tipoId: string
): Promise<void> => {
  const formData = new FormData();
  formData.append('archivo', archivo);
  formData.append('tipo', tipo);      // lo lee @Body('tipo')
  formData.append('usuario', usuario);
  formData.append('tipoId', tipoId);  // lo lee @Body('tipoId')

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/procesos-pg/${procesoId}/archivo`, // <-- SIN /${tipo}
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ Error al enviar archivo como mensaje:", res.status, errorText);
    throw new Error(`Error al enviar archivo (${res.status}): ${errorText}`);
  }

  console.log("✅ Archivo enviado correctamente como mensaje");
};


// Función unificada: decide si subir o enviar directo
export const manejarEnvioArchivo = async (
  archivo: File,
  procesoId: number,
  usuario: string,
  token: string,
  tipoId: string
): Promise<void> => {
  const mime = archivo.type;

  // Multimedia general: enviar directo como mensaje
  let tipo: 'imagen' | 'documento' | 'video' = 'documento';
  if (mime.startsWith('image/')) tipo = 'imagen';
  else if (mime.startsWith('video/')) tipo = 'video';

  console.log(`📦 Detected ${tipo}, enviando como mensaje multimedia`);
  await enviarArchivoConMensaje(archivo, tipo, procesoId, usuario, token, tipoId);
};
