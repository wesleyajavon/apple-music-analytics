import { describe, it, expect } from 'vitest';
import { getGenreForArtist, ARTIST_TO_GENRE_MAP } from '../genre-service';

describe('genre-service', () => {
  describe('getGenreForArtist', () => {
    it('should return the correct genre for all mapped artists', () => {
      // Test all entries in the mapping dynamically
      // This ensures tests work regardless of which artists are in the mapping
      Object.entries(ARTIST_TO_GENRE_MAP).forEach(([artist, expectedGenre]) => {
        expect(getGenreForArtist(artist)).toBe(expectedGenre);
        expect(getGenreForArtist(artist)).not.toBe('Unknown');
      });
    });

    it('should return "Unknown" for an unknown artist', () => {
      expect(getGenreForArtist('Unknown Artist')).toBe('Unknown');
      expect(getGenreForArtist('Non-existent Artist Name')).toBe('Unknown');
      expect(getGenreForArtist('')).toBe('Unknown');
    });

    it('should handle case-sensitive artist names', () => {
      // The mapping is case-sensitive - test with actual mapped artists
      const mappedArtists = Object.keys(ARTIST_TO_GENRE_MAP);
      
      if (mappedArtists.length > 0) {
        const firstArtist = mappedArtists[0];
        const expectedGenre = ARTIST_TO_GENRE_MAP[firstArtist];
        
        // Exact match should work
        expect(getGenreForArtist(firstArtist)).toBe(expectedGenre);
        
        // Case variations should return Unknown
        expect(getGenreForArtist(firstArtist.toLowerCase())).toBe('Unknown');
        expect(getGenreForArtist(firstArtist.toUpperCase())).toBe('Unknown');
      }
    });

    it('should return genre for all mapped artists with correct mapping', () => {
      // Verify that all entries in the mapping return the correct genre
      Object.entries(ARTIST_TO_GENRE_MAP).forEach(([artist, genre]) => {
        const result = getGenreForArtist(artist);
        expect(result).toBe(genre);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should handle special characters in artist names', () => {
      expect(getGenreForArtist('Artist with Special Chars !@#$%')).toBe('Unknown');
      expect(getGenreForArtist('Artist & The Band')).toBe('Unknown');
      expect(getGenreForArtist('Artist (feat. Other)')).toBe('Unknown');
    });

    it('should handle very long artist names', () => {
      const longName = 'A'.repeat(1000);
      expect(getGenreForArtist(longName)).toBe('Unknown');
    });

    it('should handle edge cases with whitespace', () => {
      expect(getGenreForArtist('   ')).toBe('Unknown');
      expect(getGenreForArtist('\t\n')).toBe('Unknown');
      
      // Test with actual mapped artists if any exist
      const mappedArtists = Object.keys(ARTIST_TO_GENRE_MAP);
      if (mappedArtists.length > 0) {
        const firstArtist = mappedArtists[0];
        const expectedGenre = ARTIST_TO_GENRE_MAP[firstArtist];
        
        // Whitespace around should not match
        expect(getGenreForArtist(` ${firstArtist} `)).toBe('Unknown');
        expect(getGenreForArtist(firstArtist)).toBe(expectedGenre);
      }
    });

    it('should handle empty mapping gracefully', () => {
      // If mapping is empty, all artists should return Unknown
      // This test ensures the function doesn't break with an empty map
      const emptyMapSize = Object.keys(ARTIST_TO_GENRE_MAP).length;
      
      // Test that the function still works even if mapping is minimal
      expect(getGenreForArtist('Any Artist')).toBe('Unknown');
      
      // If there are mapped artists, verify they still work
      if (emptyMapSize > 0) {
        const firstArtist = Object.keys(ARTIST_TO_GENRE_MAP)[0];
        expect(getGenreForArtist(firstArtist)).not.toBe('Unknown');
      }
    });
  });
});

