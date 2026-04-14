export type PaletteProgressDto = {
  totalArtists: number;
  mappedArtists: number;
  skippedArtists: number;
  remainingArtists: number;
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

export type PaletteSessionDto = {
  progress: PaletteProgressDto;
  nextArtist: PaletteArtistCardDto | null;
  existingGenres: string[];
  compactTrends: PaletteCompactTrendPointDto[];
  unknownListensTotal: number;
  mappedListensTotal: number;
};

export type PaletteMapArtistPayload = {
  artistId: string;
  genre: string;
};

export type PaletteSkipArtistPayload = {
  artistId: string;
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
