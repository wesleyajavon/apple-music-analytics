"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DuetShareScope } from "@prisma/client";
import { apiClient } from "@/lib/api-client";
import { duetKeys } from "@/lib/hooks/query-keys";
import type {
  CompareEntityResponse,
  CompareMetadataResponse,
  CompareSharedArtistsResponse,
  CompareTimelineResponse,
  DuetShareSettingsDto,
  FriendshipsListResponse,
  FriendshipDto,
} from "@/lib/dto/duet";
import type { PeriodType } from "@/lib/components/period-selector";

function buildCompareQuery(
  friendUserId: string,
  params?: { startDate?: string; endDate?: string; period?: PeriodType }
) {
  const q = new URLSearchParams({ friendUserId });
  if (params?.startDate) q.set("startDate", params.startDate);
  if (params?.endDate) q.set("endDate", params.endDate);
  if (params?.period) q.set("period", params.period);
  return q.toString();
}

export function useDuetFriends(
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
  }
) {
  return useQuery<FriendshipsListResponse, Error>({
    queryKey: duetKeys.friends(),
    queryFn: () => apiClient.get<FriendshipsListResponse>("/duet/friends"),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    staleTime: options?.staleTime,
  });
}

export function useDuetSettings() {
  return useQuery<DuetShareSettingsDto, Error>({
    queryKey: duetKeys.settings(),
    queryFn: () => apiClient.get<DuetShareSettingsDto>("/duet/settings"),
  });
}

export function useDuetCompareTimeline(params: {
  friendUserId?: string;
  startDate?: string;
  endDate?: string;
  period?: PeriodType;
}) {
  const enabled = !!params.friendUserId;
  return useQuery<CompareTimelineResponse, Error>({
    queryKey: duetKeys.compareTimeline(params),
    enabled,
    queryFn: () =>
      apiClient.get<CompareTimelineResponse>(
        `/duet/compare/timeline?${buildCompareQuery(params.friendUserId!, params)}`
      ),
  });
}

export function useDuetCompareMetadata(friendUserId?: string) {
  return useQuery<CompareMetadataResponse, Error>({
    queryKey: duetKeys.compareMetadata(friendUserId),
    enabled: !!friendUserId,
    queryFn: () =>
      apiClient.get<CompareMetadataResponse>(
        `/duet/compare/metadata?friendUserId=${encodeURIComponent(friendUserId!)}`
      ),
  });
}

export function useDuetCompareEntity(params: {
  friendUserId?: string;
  type?: "artist" | "track" | "genre";
  entityId?: string;
  startDate?: string;
  endDate?: string;
  period?: PeriodType;
}) {
  const entityType = params.type ?? "artist";
  const enabled = !!params.friendUserId && !!params.entityId;
  return useQuery<CompareEntityResponse, Error>({
    queryKey: duetKeys.compareEntity({ ...params, type: entityType }),
    enabled,
    queryFn: () => {
      const q = new URLSearchParams({
        friendUserId: params.friendUserId!,
        type: entityType,
        entityId: params.entityId!,
      });
      if (params.startDate) q.set("startDate", params.startDate);
      if (params.endDate) q.set("endDate", params.endDate);
      if (params.period) q.set("period", params.period);
      return apiClient.get<CompareEntityResponse>(`/duet/compare/entity?${q.toString()}`);
    },
  });
}

export function useDuetCompareSharedArtists(params: {
  friendUserId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const enabled = !!params.friendUserId;
  return useQuery<CompareSharedArtistsResponse, Error>({
    queryKey: duetKeys.compareSharedArtists(params),
    enabled,
    queryFn: () =>
      apiClient.get<CompareSharedArtistsResponse>(
        `/duet/compare/shared-artists?${buildCompareQuery(params.friendUserId!, params)}`
      ),
  });
}

export function useDuetMutations() {
  const queryClient = useQueryClient();

  const invalidateFriends = () =>
    queryClient.invalidateQueries({ queryKey: duetKeys.friends() });

  const invite = useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ ok: boolean; message: string; friendship?: FriendshipDto }>(
        "/duet/friends/invite",
        { email }
      ),
    onSuccess: invalidateFriends,
  });

  const patchFriendship = useMutation({
    mutationFn: (input: {
      id: string;
      action: "accept" | "decline" | "revoke" | "updateShareScope";
      shareScope?: "aggregates" | "full";
    }) =>
      apiClient.patch<{ friendship?: FriendshipDto; ok?: boolean }>(
        `/duet/friends/${input.id}`,
        input.action === "accept" || input.action === "updateShareScope"
          ? { action: input.action, shareScope: input.shareScope }
          : { action: input.action }
      ),
    onSuccess: () => {
      void invalidateFriends();
      void queryClient.invalidateQueries({ queryKey: duetKeys.all });
    },
  });

  const blockFriendship = useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ friendship: FriendshipDto }>(`/duet/friends/${id}/block`, {}),
    onSuccess: invalidateFriends,
  });

  const updateSettings = useMutation({
    mutationFn: (input: Partial<Pick<DuetShareSettingsDto, "allowFriendRequests" | "defaultShareScope">>) =>
      apiClient.patch<DuetShareSettingsDto>("/duet/settings", input),
    onSuccess: (data) => {
      queryClient.setQueryData(duetKeys.settings(), data);
    },
  });

  const createInviteLink = useMutation({
    mutationFn: () =>
      apiClient.post<{
        ok: boolean;
        url: string;
        acceptPath: string;
        expiresAt: string;
      }>("/duet/friends/invite-link", {}),
    onSuccess: invalidateFriends,
  });

  const redeemInviteLink = useMutation({
    mutationFn: (input: { token: string; shareScope: DuetShareScopeOption }) =>
      apiClient.post<{ ok: boolean }>("/duet/friends/invite-link/redeem", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: duetKeys.all });
    },
  });

  return { invite, patchFriendship, blockFriendship, updateSettings, createInviteLink, redeemInviteLink };
}

export type DuetShareScopeOption = Extract<DuetShareScope, "aggregates" | "full">;
