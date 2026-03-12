import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Ativo, Padrao } from "../backend.d";
import { useActor } from "./useActor";

export function useGetAtivos() {
  const { actor, isFetching } = useActor();
  return useQuery<Ativo[]>({
    queryKey: ["ativos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAtivos();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPadroes() {
  const { actor, isFetching } = useActor();
  return useQuery<Padrao[]>({
    queryKey: ["padroes"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPadroes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSalvarAtivos() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: Ativo[]) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.salvarAtivos(dados);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ativos"] }),
  });
}

export function useSalvarPadrao() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Padrao) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.salvarPadrao(p);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["padroes"] }),
  });
}

export function useCalcularScore() {
  const { actor } = useActor();
  return {
    calcularScore: async (p: Padrao): Promise<number> => {
      if (!actor) return 0;
      return actor.calcularScore(p);
    },
  };
}
