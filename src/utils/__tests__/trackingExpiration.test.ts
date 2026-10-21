import { describe, it, expect } from 'vitest';
import { 
  checkTrackingExpiration, 
  TRACKING_EXPIRATION_DAYS, 
  TRACKING_EXPIRATION_MS 
} from '../trackingExpiration';

describe('Utility: trackingExpiration (7-Day Post-BAST Expiration)', () => {
  it('has correct constant values for 7-day expiration', () => {
    expect(TRACKING_EXPIRATION_DAYS).toBe(7);
    expect(TRACKING_EXPIRATION_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('handles null, undefined, empty string, and invalid date formats gracefully', () => {
    const resNull = checkTrackingExpiration(null);
    expect(resNull.isReleased).toBe(false);
    expect(resNull.isExpired).toBe(false);
    expect(resNull.releasedAt).toBeNull();
    expect(resNull.expiresAt).toBeNull();
    expect(resNull.daysRemaining).toBe(7);

    const resUndefined = checkTrackingExpiration(undefined);
    expect(resUndefined.isReleased).toBe(false);
    expect(resUndefined.isExpired).toBe(false);

    const resEmpty = checkTrackingExpiration('   ');
    expect(resEmpty.isReleased).toBe(false);
    expect(resEmpty.isExpired).toBe(false);

    const resInvalid = checkTrackingExpiration('invalid-date-string');
    expect(resInvalid.isReleased).toBe(false);
    expect(resInvalid.isExpired).toBe(false);
  });

  it('identifies an active tracking link within the 7-day grace period', () => {
    const releasedDate = new Date('2026-10-20T10:00:00.000Z');
    // Checked 2 days later: 2026-10-22T10:00:00.000Z
    const currentDate = new Date('2026-10-22T10:00:00.000Z');

    const result = checkTrackingExpiration(releasedDate.toISOString(), currentDate);

    expect(result.isReleased).toBe(true);
    expect(result.isExpired).toBe(false);
    expect(result.releasedAt).toEqual(releasedDate);
    expect(result.expiresAt).toEqual(new Date(releasedDate.getTime() + TRACKING_EXPIRATION_MS));
    expect(result.daysRemaining).toBe(5);
    expect(result.formattedReleasedDate).toContain('2026');
  });

  it('identifies 1 day remaining when checked on the 6th day', () => {
    const releasedDate = new Date('2026-10-20T10:00:00.000Z');
    // Checked 6 days and 1 hour later
    const currentDate = new Date('2026-10-26T11:00:00.000Z');

    const result = checkTrackingExpiration(releasedDate.toISOString(), currentDate);

    expect(result.isReleased).toBe(true);
    expect(result.isExpired).toBe(false);
    expect(result.daysRemaining).toBe(1);
  });

  it('marks as expired at exact expiration boundary (7 * 24h)', () => {
    const releasedDate = new Date('2026-10-20T10:00:00.000Z');
    const exactExpiration = new Date(releasedDate.getTime() + TRACKING_EXPIRATION_MS);

    const result = checkTrackingExpiration(releasedDate.toISOString(), exactExpiration);

    expect(result.isReleased).toBe(true);
    expect(result.isExpired).toBe(true);
    expect(result.daysRemaining).toBe(0);
  });

  it('marks as expired when beyond 7 days', () => {
    const releasedDate = new Date('2026-10-10T10:00:00.000Z');
    // Checked 11 days later: 2026-10-21T10:00:00.000Z
    const currentDate = new Date('2026-10-21T10:00:00.000Z');

    const result = checkTrackingExpiration(releasedDate.toISOString(), currentDate);

    expect(result.isReleased).toBe(true);
    expect(result.isExpired).toBe(true);
    expect(result.daysRemaining).toBe(0);
    expect(result.formattedExpiresDate).toContain('2026');
  });
});
