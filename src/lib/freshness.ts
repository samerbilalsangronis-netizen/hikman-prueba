import { FREQUENCY_STALE_DAYS } from '../data/indicators';
import type { Frequency, FreshnessInfo, SeriesPoint } from '../types';

export function getFreshness(points: SeriesPoint[], frequency: Frequency, now: Date = new Date()): FreshnessInfo {
  if (points.length === 0) {
    return { level: 'stale', daysSince: Infinity, lastDate: null };
  }
  const lastDate = points[points.length - 1][0];
  const days = Math.floor((now.getTime() - new Date(lastDate + 'T00:00:00').getTime()) / 86400000);
  const thresholds = FREQUENCY_STALE_DAYS[frequency];
  let level: FreshnessInfo['level'] = 'ok';
  if (days > thresholds.stale) level = 'stale';
  else if (days > thresholds.warn) level = 'warning';
  return { level, daysSince: days, lastDate };
}
