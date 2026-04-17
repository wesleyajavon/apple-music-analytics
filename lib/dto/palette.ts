export type PaletteMode = "artists" | "tracks";

export type PaletteProgressDto = {
  totalInQueue: number;
  mapped: number;
  skipped: number;
  remaining: number;
  completionRatio: number;
};

export type PaletteCompactTrendPointDto = {
  step: number;
  unknownListens: number;
  mappedListens: number;
};

export type PaletteArtistCardDto = {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  unknownListens: number;
  impactedTracks: number;
};

export type PaletteTrackCardDto = {
  trackId: string;
  trackTitle: string;
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  unknownListens: number;
  impactedTracks: number;
};

export type PaletteSessionDto = {
  mode: PaletteMode;
  progress: PaletteProgressDto;
  nextArtist: PaletteArtistCardDto | null;
  nextTrack: PaletteTrackCardDto | null;
  existingGenres: string[];
  compactTrends: PaletteCompactTrendPointDto[];
  unknownListensTotal: number;
  mappedListensTotal: number;
};

/** POST /api/palette/map — default mode is artists when omitted */
export type PaletteMapRequestBody = {
  genre: string;
  mode?: PaletteMode;
  artistId?: string;
  trackId?: string;
  suggestionId?: string;
};

/** POST /api/palette/skip — default mode is artists when omitted */
export type PaletteSkipRequestBody = {
  mode?: PaletteMode;
  artistId?: string;
  trackId?: string;
  suggestionId?: string;
};

export type PaletteMapArtistResponseDto = {
  ok: true;
  updatedTracks: number;
  unknownListensRemoved: number;
  normalizedGenre: string;
  session: PaletteSessionDto;
};

export type PaletteSkipArtistResponseDto = {
  ok: true;
  session: PaletteSessionDto;
};

export type PaletteSuggestionDto = {
  id: string;
  provider: string;
  genre: string;
  confidence: number;
  reason: string;
};
