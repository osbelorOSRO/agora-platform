import axios from "axios";
import { getAuthHeaders } from "@/utils/getAuthHeaders";

const SCRAPING_API = import.meta.env.VITE_API_URL_RUT;
const API_URL = import.meta.env.VITE_API_URL;

export const TarjetaClienteService = {
  async buscarNombrePorRut(rut: string) {
    const res = await axios.post(`${SCRAPING_API}/rutificar`, { rut }, {
      headers: getAuthHeaders(),
    });
    return res.data;
  },

  async actualizarCampo(cliente_id: string, campo: string, valor: any) {
    const res = await axios.patch(`${API_URL}/clientes-mongo`, {
      cliente_id,
      campo,
      valor,
    });
    return res.data;
  },

  async actualizarDatos(cliente_id: string, datos: Record<string, any>) {
    const res = await axios.patch(`${API_URL}/clientes-mongo/${cliente_id}`, datos);
    return res.data;
  },

  async obtenerCliente(cliente_id: string) {
    const res = await axios.get(`${API_URL}/clientes-mongo/${cliente_id}`);
    return res.data;
  },
};
