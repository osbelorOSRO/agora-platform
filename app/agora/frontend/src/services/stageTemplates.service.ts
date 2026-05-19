import { getAuthHeaders } from "@/utils/getAuthHeaders";
import type {
  CreateStageTemplateInput,
  StageTemplate,
  UpdateStageTemplateInput,
} from "@/types/stageTemplates";

const API_URL = import.meta.env.VITE_API_URL as string;

export const listStageTemplates = async (stageActual?: string): Promise<StageTemplate[]> => {
  const params = stageActual ? `?stageActual=${encodeURIComponent(stageActual)}` : "";
  const res = await fetch(`${API_URL}/stage-templates${params}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("No se pudieron cargar los stage templates");
  return res.json();
};

export const getStageTemplate = async (id: string): Promise<StageTemplate> => {
  const res = await fetch(`${API_URL}/stage-templates/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Stage template no encontrado");
  return res.json();
};

export const createStageTemplate = async (
  payload: CreateStageTemplateInput,
): Promise<StageTemplate> => {
  const res = await fetch(`${API_URL}/stage-templates`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? "Error al crear stage template");
  }
  return res.json();
};

export const updateStageTemplate = async (
  id: string,
  payload: UpdateStageTemplateInput,
): Promise<StageTemplate> => {
  const res = await fetch(`${API_URL}/stage-templates/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? "Error al actualizar stage template");
  }
  return res.json();
};

export const deleteStageTemplate = async (id: string): Promise<void> => {
  const res = await fetch(`${API_URL}/stage-templates/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al eliminar stage template");
};
