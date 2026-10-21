/**
 * Utility for checking 7-Day Post-BAST / Handover Expiration
 * on Public Progress Tracking (/tracking/:spk_no).
 *
 * Protects proprietary karoseri fabrication techniques and internal WBS documentation
 * from prolonged public exposure after vehicle handover.
 */

export const TRACKING_EXPIRATION_DAYS = 7;
export const TRACKING_EXPIRATION_MS = TRACKING_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

export interface TrackingExpirationInfo {
  isReleased: boolean;
  isExpired: boolean;
  releasedAt: Date | null;
  expiresAt: Date | null;
  daysRemaining: number;
  formattedReleasedDate?: string;
  formattedExpiresDate?: string;
}

export function checkTrackingExpiration(
  releasedAtStr?: string | null,
  currentDate: Date = new Date()
): TrackingExpirationInfo {
  if (!releasedAtStr || typeof releasedAtStr !== 'string' || releasedAtStr.trim() === '') {
    return {
      isReleased: false,
      isExpired: false,
      releasedAt: null,
      expiresAt: null,
      daysRemaining: TRACKING_EXPIRATION_DAYS,
    };
  }

  const releasedAt = new Date(releasedAtStr);
  if (isNaN(releasedAt.getTime())) {
    return {
      isReleased: false,
      isExpired: false,
      releasedAt: null,
      expiresAt: null,
      daysRemaining: TRACKING_EXPIRATION_DAYS,
    };
  }

  const expiresAt = new Date(releasedAt.getTime() + TRACKING_EXPIRATION_MS);
  const diffMs = expiresAt.getTime() - currentDate.getTime();
  const isExpired = diffMs <= 0;
  
  // Calculate remaining full days (0 if already expired)
  const daysRemaining = isExpired 
    ? 0 
    : Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

  return {
    isReleased: true,
    isExpired,
    releasedAt,
    expiresAt,
    daysRemaining,
    formattedReleasedDate: releasedAt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    formattedExpiresDate: expiresAt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  };
}
