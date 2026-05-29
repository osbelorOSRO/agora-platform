import type { CreateSaleDto } from "@/modules/accesos/types/salesRecord";

export const INPUT_CLS =
  "w-full min-w-[70px] bg-transparent border border-[#3D3D3D] rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";
export const SELECT_CLS =
  "bg-background border border-[#3D3D3D] rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";
export const MODAL_INPUT_CLS =
  "w-full bg-[#0A0A0A] border border-[#3D3D3D] rounded-xl px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-primary [color-scheme:dark]";
export const MODAL_SELECT_CLS =
  "w-full bg-[#0A0A0A] border border-[#3D3D3D] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary";

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const FORM_INICIAL: CreateSaleDto = {
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

export type Tab = "ventas" | "catalogo" | "precios";
