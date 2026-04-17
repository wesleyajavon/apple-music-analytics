"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { listeningKeys } from "@/lib/hooks/query-keys";
import type { PaletteMode, PaletteSessionDto, PaletteSuggestionDto } from "@/lib/dto/palette";
import type {
  PaletteMapArtistResponseDto,
  PaletteSkipArtistResponseDto,
} from "@/lib/dto/palette";

async function fetchPaletteSession(mode: PaletteMode): Promise<PaletteSessionDto> {
  const query = mode === "tracks" ? "?mode=tracks" : "";
  return apiClient.get<PaletteSessionDto>(`/palette/session${query}`);
}

async function fetchPaletteSuggestions(params: {
  mode: PaletteMode;
  artistId?: string;
  trackId?: string;
}): Promise<PaletteSuggestionDto[]> {
  const q = new URLSearchParams();
  q.set("mode", params.mode);
  if (params.artistId) q.set("artistId", params.artistId);
  if (params.trackId) q.set("trackId", params.trackId);
  const response = await apiClient.get<{ ok: true; suggestions: PaletteSuggestionDto[] }>(
    `/palette/suggestions?${q.toString()}`
  );
  return response.suggestions ?? [];
}

type OptimisticMapInput = {
  mode: PaletteMode;
  artistId?: string;
  trackId?: string;
  genre: string;
  suggestionId?: string;
};

type OptimisticSkipInput = {
  mode: PaletteMode;
  artistId?: string;
  trackId?: string;
  suggestionId?: string;
};

type PaletteMutationContext = {
  previous?: PaletteSessionDto;
  mode: PaletteMode;
};

function getNextQueueItem(session: PaletteSessionDto) {
  return session.mode === "tracks" ? session.nextTrack : session.nextArtist;
}

function applyOptimisticStep(
  session: PaletteSessionDto,
  action: "map" | "skip"
): PaletteSessionDto {
  const next = getNextQueueItem(session);
  if (!next) return session;
  const nextStep = (session.compactTrends[session.compactTrends.length - 1]?.step ?? 0) + 1;
  const unknownDelta = action === "map" ? next.unknownListens : 0;
  const last = session.compactTrends[session.compactTrends.length - 1] ?? {
    step: 0,
    unknownListens: session.unknownListensTotal,
    mappedListens: session.mappedListensTotal,
  };
  return {
    ...session,
    progress: {
      ...session.progress,
      mapped: session.progress.mapped + (action === "map" ? 1 : 0),
      skipped: session.progress.skipped + (action === "skip" ? 1 : 0),
      remaining: Math.max(0, session.progress.remaining - 1),
      completionRatio:
        session.progress.totalInQueue === 0
          ? 1
          : Math.min(
              1,
              (session.progress.mapped + session.progress.skipped + 1) /
                session.progress.totalInQueue
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

export function usePaletteSession(mode: PaletteMode = "artists") {
  return useQuery<PaletteSessionDto, Error>({
    queryKey: listeningKeys.paletteSession(mode),
    queryFn: () => fetchPaletteSession(mode),
    staleTime: 0,
  });
}

export function usePaletteSuggestions(params: {
  mode: PaletteMode;
  artistId?: string;
  trackId?: string;
  enabled?: boolean;
}) {
  return useQuery<PaletteSuggestionDto[], Error>({
    queryKey: listeningKeys.paletteSuggestions({
      mode: params.mode,
      artistId: params.artistId,
      trackId: params.trackId,
    }),
    queryFn: () =>
      fetchPaletteSuggestions({
        mode: params.mode,
        artistId: params.artistId,
        trackId: params.trackId,
      }),
    enabled: params.enabled ?? true,
    staleTime: 15_000,
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
    mutationFn: (payload) => {
      if (payload.mode === "tracks") {
        return apiClient.post<PaletteMapArtistResponseDto>("/palette/map", {
          mode: "tracks",
          trackId: payload.trackId,
          genre: payload.genre,
          suggestionId: payload.suggestionId,
        });
      }
      return apiClient.post<PaletteMapArtistResponseDto>("/palette/map", {
        mode: "artists",
        artistId: payload.artistId,
        genre: payload.genre,
        suggestionId: payload.suggestionId,
      });
    },
    onMutate: async (variables) => {
      const mode = variables.mode;
      await queryClient.cancelQueries({ queryKey: listeningKeys.paletteSession(mode) });
      const previous = queryClient.getQueryData<PaletteSessionDto>(
        listeningKeys.paletteSession(mode)
      );
      if (previous) {
        queryClient.setQueryData<PaletteSessionDto>(
          listeningKeys.paletteSession(mode),
          applyOptimisticStep(previous, "map")
        );
      }
      return { previous, mode };
    },
    onError: (_error, _variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(listeningKeys.paletteSession(ctx.mode), ctx.previous);
      }
    },
    onSuccess: (response) => {
      const m = response.session.mode;
      queryClient.setQueryData(listeningKeys.paletteSession(m), response.session);
      queryClient.invalidateQueries({
        queryKey: listeningKeys.paletteSuggestions({ mode: m }),
      });
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
    mutationFn: (payload) => {
      if (payload.mode === "tracks") {
        return apiClient.post<PaletteSkipArtistResponseDto>("/palette/skip", {
          mode: "tracks",
          trackId: payload.trackId,
          suggestionId: payload.suggestionId,
        });
      }
      return apiClient.post<PaletteSkipArtistResponseDto>("/palette/skip", {
        mode: "artists",
        artistId: payload.artistId,
        suggestionId: payload.suggestionId,
      });
    },
    onMutate: async (variables) => {
      const mode = variables.mode;
      await queryClient.cancelQueries({ queryKey: listeningKeys.paletteSession(mode) });
      const previous = queryClient.getQueryData<PaletteSessionDto>(
        listeningKeys.paletteSession(mode)
      );
      if (previous) {
        queryClient.setQueryData<PaletteSessionDto>(
          listeningKeys.paletteSession(mode),
          applyOptimisticStep(previous, "skip")
        );
      }
      return { previous, mode };
    },
    onError: (_error, _variables, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(listeningKeys.paletteSession(ctx.mode), ctx.previous);
      }
    },
    onSuccess: (response) => {
      const m = response.session.mode;
      queryClient.setQueryData(listeningKeys.paletteSession(m), response.session);
      queryClient.invalidateQueries({
        queryKey: listeningKeys.paletteSuggestions({ mode: m }),
      });
    },
  });
}
