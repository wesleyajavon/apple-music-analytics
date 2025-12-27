/**
 * Data Transfer Objects (DTOs) for Apple Music Replay import
 * These DTOs define the expected structure for yearly Replay summaries
 */

/**
 * Represents a top artist entry in Replay data
 */
export interface ReplayTopArtistInput {
  name: string;
  playCount: number;
  rank: number;
  imageUrl?: string;
}

/**
 * Represents a top track entry in Replay data
 */
export interface ReplayTopTrackInput {
  title: string;
  artistName: string;
  playCount: number;
  rank: number;
  duration?: number; // Duration in seconds
}

/**
 * Represents a top album entry in Replay data
 */
export interface ReplayTopAlbumInput {
  name: string;
  artistName: string;
  playCount: number;
  rank: number;
  imageUrl?: string;
}

/**
 * Complete yearly Replay summary input
 */
export interface ReplayYearlyInput {
  year: number;
  totalPlayTime: number; // Total play time in seconds
  totalPlays: number;
  topArtists: ReplayTopArtistInput[];
  topTracks: ReplayTopTrackInput[];
  topAlbums: ReplayTopAlbumInput[];
}

/**
 * Validation errors for Replay import
 */
export interface ReplayValidationError {
  field: string;
  message: string;
}

/**
 * Result of Replay data validation
 */
export interface ReplayValidationResult {
  isValid: boolean;
  errors: ReplayValidationError[];
}

/**
 * Response DTO for Replay yearly summary (from API)
 */
export interface ReplayYearlySummaryDto {
  id: string;
  userId: string;
  year: number;
  totalPlayTime: number; // Total play time in seconds
  totalPlays: number;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
  topArtists: Array<{
    id: string;
    rank: number;
    playCount: number;
    artist: {
      id: string;
      name: string;
      imageUrl: string | null;
    };
  }>;
  topTracks: Array<{
    id: string;
    rank: number;
    playCount: number;
    track: {
      id: string;
      title: string;
      duration: number | null;
      artist: {
        id: string;
        name: string;
      };
    };
  }>;
  topAlbums: Array<{
    id: string;
    albumName: string;
    artistName: string;
    rank: number;
    playCount: number;
  }>;
}

/**
 * Validates a Replay yearly input
 */
export function validateReplayYearlyInput(
  data: unknown
): ReplayValidationResult {
  const errors: ReplayValidationError[] = [];

  // Check if data is an object
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      isValid: false,
      errors: [
        {
          field: "root",
          message: "Data must be an object",
        },
      ],
    };
  }

  const input = data as Partial<ReplayYearlyInput>;

  // Validate year
  if (typeof input.year !== "number") {
    errors.push({
      field: "year",
      message: "Year must be a number",
    });
  } else if (input.year < 2000 || input.year > 2100) {
    errors.push({
      field: "year",
      message: "Year must be between 2000 and 2100",
    });
  }

  // Validate totalPlayTime
  if (typeof input.totalPlayTime !== "number") {
    errors.push({
      field: "totalPlayTime",
      message: "totalPlayTime must be a number",
    });
  } else if (input.totalPlayTime < 0) {
    errors.push({
      field: "totalPlayTime",
      message: "totalPlayTime must be non-negative",
    });
  }

  // Validate totalPlays
  if (typeof input.totalPlays !== "number") {
    errors.push({
      field: "totalPlays",
      message: "totalPlays must be a number",
    });
  } else if (input.totalPlays < 0 || !Number.isInteger(input.totalPlays)) {
    errors.push({
      field: "totalPlays",
      message: "totalPlays must be a non-negative integer",
    });
  }

  // Validate topArtists
  if (!Array.isArray(input.topArtists)) {
    errors.push({
      field: "topArtists",
      message: "topArtists must be an array",
    });
  } else {
    input.topArtists?.forEach((artist, index) => {
      if (typeof artist.name !== "string" || artist.name.trim() === "") {
        errors.push({
          field: `topArtists[${index}].name`,
          message: "Artist name must be a non-empty string",
        });
      }
      if (
        typeof artist.playCount !== "number" ||
        artist.playCount < 0 ||
        !Number.isInteger(artist.playCount)
      ) {
        errors.push({
          field: `topArtists[${index}].playCount`,
          message: "playCount must be a non-negative integer",
        });
      }
      if (
        typeof artist.rank !== "number" ||
        artist.rank < 1 ||
        !Number.isInteger(artist.rank)
      ) {
        errors.push({
          field: `topArtists[${index}].rank`,
          message: "rank must be a positive integer",
        });
      }
      if (
        artist.imageUrl !== undefined &&
        (typeof artist.imageUrl !== "string" || artist.imageUrl.trim() === "")
      ) {
        errors.push({
          field: `topArtists[${index}].imageUrl`,
          message: "imageUrl must be a non-empty string if provided",
        });
      }
    });

    // Check for duplicate ranks
    const ranks = input.topArtists?.map((a) => a.rank) || [];
    const duplicateRanks = ranks.filter(
      (r, i) => ranks.indexOf(r) !== i
    );
    if (duplicateRanks.length > 0) {
      errors.push({
        field: "topArtists",
        message: `Duplicate ranks found: ${duplicateRanks.join(", ")}`,
      });
    }
  }

  // Validate topTracks
  if (!Array.isArray(input.topTracks)) {
    errors.push({
      field: "topTracks",
      message: "topTracks must be an array",
    });
  } else {
    input.topTracks?.forEach((track, index) => {
      if (typeof track.title !== "string" || track.title.trim() === "") {
        errors.push({
          field: `topTracks[${index}].title`,
          message: "Track title must be a non-empty string",
        });
      }
      if (
        typeof track.artistName !== "string" ||
        track.artistName.trim() === ""
      ) {
        errors.push({
          field: `topTracks[${index}].artistName`,
          message: "Artist name must be a non-empty string",
        });
      }
      if (
        typeof track.playCount !== "number" ||
        track.playCount < 0 ||
        !Number.isInteger(track.playCount)
      ) {
        errors.push({
          field: `topTracks[${index}].playCount`,
          message: "playCount must be a non-negative integer",
        });
      }
      if (
        typeof track.rank !== "number" ||
        track.rank < 1 ||
        !Number.isInteger(track.rank)
      ) {
        errors.push({
          field: `topTracks[${index}].rank`,
          message: "rank must be a positive integer",
        });
      }
      if (
        track.duration !== undefined &&
        (typeof track.duration !== "number" ||
          track.duration < 0 ||
          !Number.isInteger(track.duration))
      ) {
        errors.push({
          field: `topTracks[${index}].duration`,
          message: "duration must be a non-negative integer if provided",
        });
      }
    });

    // Check for duplicate ranks
    const ranks = input.topTracks?.map((t) => t.rank) || [];
    const duplicateRanks = ranks.filter(
      (r, i) => ranks.indexOf(r) !== i
    );
    if (duplicateRanks.length > 0) {
      errors.push({
        field: "topTracks",
        message: `Duplicate ranks found: ${duplicateRanks.join(", ")}`,
      });
    }
  }

  // Validate topAlbums
  if (!Array.isArray(input.topAlbums)) {
    errors.push({
      field: "topAlbums",
      message: "topAlbums must be an array",
    });
  } else {
    input.topAlbums?.forEach((album, index) => {
      if (typeof album.name !== "string" || album.name.trim() === "") {
        errors.push({
          field: `topAlbums[${index}].name`,
          message: "Album name must be a non-empty string",
        });
      }
      if (
        typeof album.artistName !== "string" ||
        album.artistName.trim() === ""
      ) {
        errors.push({
          field: `topAlbums[${index}].artistName`,
          message: "Artist name must be a non-empty string",
        });
      }
      if (
        typeof album.playCount !== "number" ||
        album.playCount < 0 ||
        !Number.isInteger(album.playCount)
      ) {
        errors.push({
          field: `topAlbums[${index}].playCount`,
          message: "playCount must be a non-negative integer",
        });
      }
      if (
        typeof album.rank !== "number" ||
        album.rank < 1 ||
        !Number.isInteger(album.rank)
      ) {
        errors.push({
          field: `topAlbums[${index}].rank`,
          message: "rank must be a positive integer",
        });
      }
      if (
        album.imageUrl !== undefined &&
        (typeof album.imageUrl !== "string" || album.imageUrl.trim() === "")
      ) {
        errors.push({
          field: `topAlbums[${index}].imageUrl`,
          message: "imageUrl must be a non-empty string if provided",
        });
      }
    });

    // Check for duplicate ranks
    const ranks = input.topAlbums?.map((a) => a.rank) || [];
    const duplicateRanks = ranks.filter(
      (r, i) => ranks.indexOf(r) !== i
    );
    if (duplicateRanks.length > 0) {
      errors.push({
        field: "topAlbums",
        message: `Duplicate ranks found: ${duplicateRanks.join(", ")}`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
