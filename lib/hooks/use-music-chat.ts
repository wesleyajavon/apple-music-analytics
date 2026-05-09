"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient, type ParsedRateLimitHeaders } from "@/lib/api-client";
import type {
  MusicChatDateRangeContext,
  MusicChatMessage,
  MusicChatPresetQuestionId,
  MusicChatResponse,
} from "@/lib/dto/music-chat";

export type MusicChatUiResponse = MusicChatResponse & {
  rateLimit?: ParsedRateLimitHeaders;
};

export type SendMusicChatInput = {
  messages: MusicChatMessage[];
  locale: string;
  userId?: string;
  presetQuestionId?: MusicChatPresetQuestionId;
  dateRange?: MusicChatDateRangeContext;
};

function withUserIdQuery(path: string, userId?: string): string {
  if (!userId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}userId=${encodeURIComponent(userId)}`;
}

async function sendMusicChatMessage({
  messages,
  locale,
  userId,
  presetQuestionId,
  dateRange,
}: SendMusicChatInput): Promise<MusicChatUiResponse> {
  const result = await apiClient.postWithMeta<MusicChatResponse>(
    withUserIdQuery("/ai/music-chat", userId),
    {
      messages,
      locale,
      presetQuestionId,
      dateRange,
    },
    {
      timeout: 45_000,
      retries: 0,
    }
  );

  return {
    ...result.data,
    rateLimit: result.rateLimit,
  };
}

export function useMusicChat() {
  return useMutation({
    mutationFn: sendMusicChatMessage,
  });
}
