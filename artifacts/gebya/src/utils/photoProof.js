// Users can attach up to 3 proof photos per transaction.
export const MAX_PROOF_PHOTOS = 3;

export function createPhotoProof(dataUrl, takenAt = Date.now()) {
  if (!dataUrl) return null;
  return {
    id: `photo-${takenAt}-${Math.random().toString(36).slice(2, 8)}`,
    dataUrl,
    taken_at: takenAt,
  };
}

export function normalizePhotos(input) {
  const source = Array.isArray(input)
    ? input
    : Array.isArray(input?.photos)
      ? input.photos
      : [];

  const photos = source
    .map((entry, index) => {
      if (typeof entry === 'string') {
        return { id: `photo-${index}`, dataUrl: entry, taken_at: null };
      }
      if (!entry?.dataUrl) return null;
      return {
        id: entry.id || `photo-${index}`,
        dataUrl: entry.dataUrl,
        taken_at: entry.taken_at || null,
      };
    })
    .filter(Boolean);

  if (photos.length > 0) return photos;

  const legacyPhoto = Array.isArray(input) ? null : input?.photo;
  if (!legacyPhoto) return [];

  return [{
    id: 'legacy-photo',
    dataUrl: legacyPhoto,
    taken_at: input?.photo_taken_at || input?.created_at || input?.updated_at || null,
  }];
}

export function buildPhotoFields(photosInput) {
  const photos = normalizePhotos(photosInput);
  const first = photos[0] || null;
  return {
    photos,
    photo: first?.dataUrl || null,
    photo_taken_at: first?.taken_at || null,
  };
}

/** Whether more photos can be added (max 3) */
export function canAddPhoto(photosInput) {
  const count = Array.isArray(photosInput) ? photosInput.length : 0;
  return count < MAX_PROOF_PHOTOS;
}

/** Human-friendly label for photo count badge. Supports English and Amharic. */
export function photoCountLabel(count, lang = 'en') {
  if (count === 0) return '';
  if (lang === 'am') return `${count} ፎቶ${count === 1 ? '' : 'ዎች'}`;
  return `${count} photo${count === 1 ? '' : 's'}`;
}
