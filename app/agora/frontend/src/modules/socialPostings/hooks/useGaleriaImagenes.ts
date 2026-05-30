import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGaleria,
  subirImagenes,
  eliminarImagenGaleria,
} from "../services/socialPostings.service";

const KEY = ["galeria-ofertas"];

export function useGaleriaImagenes() {
  const qc = useQueryClient();

  const { data: imagenes = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: getGaleria,
    staleTime: 5 * 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const { mutateAsync: subir, isPending: subiendo } = useMutation({
    mutationFn: (files: File[]) => subirImagenes(files),
    onSuccess: invalidate,
  });

  const { mutateAsync: eliminar } = useMutation({
    mutationFn: (id: number) => eliminarImagenGaleria(id),
    onSuccess: invalidate,
  });

  return { imagenes, isLoading, subiendo, subir, eliminar };
}
