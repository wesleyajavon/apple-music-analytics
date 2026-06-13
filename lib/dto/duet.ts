import type { DuetShareScope, FriendshipStatus } from "@prisma/client";

export type DuetUserSummaryDto = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type FriendshipDto = {
  id: string;
  status: FriendshipStatus;
  shareScope: DuetShareScope;
  createdAt: string;
  respondedAt: string | null;
  requester: DuetUserSummaryDto;
  addressee: DuetUserSummaryDto;
  direction: "outgoing" | "incoming" | "friend";
};

export type FriendshipsListResponse = {
  friends: FriendshipDto[];
  pendingIncoming: FriendshipDto[];
  pendingOutgoing: FriendshipDto[];
};

export type DuetShareSettingsDto = {
  userId: string;
  allowFriendRequests: boolean;
  defaultShareScope: DuetShareScope;
};

export type CompareTimelinePoint = {
  date: string;
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
};

export type CompareMergedPoint = {
  date: string;
  self: number;
  friend: number;
};

export type CompareTimelineResponse = {
  period: "day" | "week" | "month";
  startDate: string;
  endDate: string;
  rangeClamped: boolean;
  self: CompareTimelinePoint[];
  friend: CompareTimelinePoint[];
  merged: CompareMergedPoint[];
};

type CompareEntityResponseBase = {
  entityId: string;
  period: "day" | "week" | "month";
  startDate: string;
  endDate: string;
  rangeClamped: boolean;
  selfCount: number;
  friendCount: number;
  winner: "self" | "friend" | "tie";
  merged: CompareMergedPoint[];
};

export type CompareArtistEntityResponse = CompareEntityResponseBase & {
  type: "artist";
  artistName: string | null;
  imageUrl: string | null;
};

export type CompareTrackEntityResponse = CompareEntityResponseBase & {
  type: "track";
  trackTitle: string | null;
  artistName: string | null;
};

export type CompareGenreEntityResponse = CompareEntityResponseBase & {
  type: "genre";
  genreName: string;
};

export type CompareEntityResponse =
  | CompareArtistEntityResponse
  | CompareTrackEntityResponse
  | CompareGenreEntityResponse;

export type CompareUserMetadata = {
  minDate: string | null;
  maxDate: string | null;
  totalListens: number;
  sources: string[];
};

export type CompareMetadataResponse = {
  self: CompareUserMetadata;
  friend: CompareUserMetadata;
};

export type CompareSharedArtistItem = {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  selfCount: number;
  friendCount: number;
  selfRank: number;
  friendRank: number;
  combinedCount: number;
  winner: "self" | "friend" | "tie";
};

export type CompareSharedArtistsResponse = {
  startDate: string;
  endDate: string;
  rangeClamped: boolean;
  topPool: number;
  totalShared: number;
  artists: CompareSharedArtistItem[];
};
