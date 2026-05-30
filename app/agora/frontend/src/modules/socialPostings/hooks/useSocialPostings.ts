import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCalendario,
  crearPosteo,
  actualizarPosteo,
  eliminarPosteo,
} from "../services/socialPostings.service";
import type { CreatePosteoDto, UpdatePosteoDto } from "../types";

export function useSocialPostings(mes: string) {
  const qc = useQueryClient();
  const key = ["social-postings", mes];

  const { data: posteos = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => getCalendario(mes),
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const { mutateAsync: crear, isPending: creando } = useMutation({
    mutationFn: (dto: CreatePosteoDto) => crearPosteo(dto),
    onSuccess: invalidate,
  });

  const { mutateAsync: actualizar, isPending: actualizando } = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdatePosteoDto }) =>
      actualizarPosteo(id, dto),
    onSuccess: invalidate,
  });

  const { mutateAsync: eliminar } = useMutation({
    mutationFn: (id: number) => eliminarPosteo(id),
    onSuccess: invalidate,
  });

  return {
    posteos,
    isLoading,
    creando,
    actualizando,
    crear,
    actualizar,
    eliminar,
  };
}
