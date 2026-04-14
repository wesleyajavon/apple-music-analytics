"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { listeningKeys } from "@/lib/hooks/query-keys";
import type {
  PaletteMapArtistResponseDto,
  PaletteSessionDto,
  PaletteSkipArtistResponseDto,
} from "@/lib/dto/palette";

async function fetchPaletteSession(): Promise<PaletteSessionDto> {
  return apiClient.get<PaletteSessionDto>("/palette/session");
}

type OptimisticMapInput = {
  artistId: string;
  genre: string;
};

type OptimisticSkipInput = {
  artistId: string;
};

type PaletteMutationContext = {
  previous?: PaletteSessionDto;
};

function applyOptimisticStep(
  session: PaletteSessionDto,
  mode: "map" | "skip"
): PaletteSessionDto {
  if (!session.nextArtist) return session;
  const nextStep = (session.compactTrends[session.compactTrends.length - 1]?.step ?? 0) + 1;
  const unknownDelta = mode === "map" ? session.nextArtist.unknownListens : 0;
  const last = session.compactTrends[session.compactTrends.length - 1] ?? {
    step: 0,
    unknownListens: session.unknownListensTotal,
    mappedListens: session.mappedListensTotal,
  };
  return {
    ...session,
    progress: {
      ...session.progress,
      mappedArtists: session.progress.mappedArtists + (mode === "map" ? 1 : 0),
      skippedArtists: session.progress.skippedArtists + (mode === "skip" ? 1 : 0),
      remainingArtists: Math.max(0, session.progress.remainingArtists - 1),
      completionRatio:
        session.progress.totalArtists === 0
          ? 1
          : Math.min(
              1,
              (session.progress.mappedArtists +
                session.progress.skippedArtists +
                1) /
                session.progress.totalArtists
            ),
    },
    unknownListensTotal: Math.max(0, session.unknownListensTotal - unknownDelta),
    mappedListensTotal: session.mappedListensTotal + unknownDelta,
    compactTrends: [
      ...session.compactTrends.slice(-11),
      {
        step: nextStep,
        unknownListens: Math.max(0, last.unknownListens - unknownDelta),
        mappedListens: last.mappedListens + unknownDelta,
      },
    ],
  };
}

export function usePaletteSession() {
  return useQuery<PaletteSessionDto, Error>({
    queryKey: listeningKeys.paletteSession(),
    queryFn: fetchPaletteSession,
    staleTime: 0,
  });
}

export function useMapPaletteArtist() {
  const queryClient = useQueryClient();
  return useMutation<
    PaletteMapArtistResponseDto,
    Error,
    OptimisticMapInput,
    PaletteMutationContext
  >({
    mutationFn: (payload) => apiClient.post<PaletteMapArtistResponseDto>("/palette/map", payload),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: listeningKeys.paletteSession() });
      const previous = queryClient.getQueryData<PaletteSessionDto>(
        listeningKeys.paletteSession()
      );
      if (previous) {
        queryClient.setQueryData<PaletteSessionDto>(
          listeningKeys.paletteSession(),
          applyOptimisticStep(previous, "map")
        );
      }
      return { previous };
    },
    onError: (_error, _variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(listeningKeys.paletteSession(), ctx.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(listeningKeys.paletteSession(), response.session);
      queryClient.invalidateQueries({ queryKey: listeningKeys.genres() });
      queryClient.invalidateQueries({ queryKey: listeningKeys.genreTrends() });
      queryClient.invalidateQueries({ queryKey: listeningKeys.overview() });
    },
  });
}

export function useSkipPaletteArtist() {
  const queryClient = useQueryClient();
  return useMutation<
    PaletteSkipArtistResponseDto,
    Error,
    OptimisticSkipInput,
    PaletteMutationContext
  >({
    mutationFn: (payload) =>
      apiClient.post<PaletteSkipArtistResponseDto>("/palette/skip", payload),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: listeningKeys.paletteSession() });
      const previous = queryClient.getQueryData<PaletteSessionDto>(
        listeningKeys.paletteSession()
      );
      if (previous) {
        queryClient.setQueryData<PaletteSessionDto>(
          listeningKeys.paletteSession(),
          applyOptimisticStep(previous, "skip")
        );
      }
      return { previous };
    },
    onError: (_error, _variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(listeningKeys.paletteSession(), ctx.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData(listeningKeys.paletteSession(), response.session);
    },
  });
}
