import { apiRequest, backendEnabled } from './api.js';
import { normalizePlace } from '../data/itinerary.js';

export async function findPlaces(query, signal, city = '') {
  if (!backendEnabled) throw new Error('离线模式无法查询地图，请联网后确认实际地点。');
  const result = await apiRequest('places', { keywords: query, city }, { signal, timeoutMs: 20000 });
  if (!Array.isArray(result.places)) throw new Error('地图未返回有效地点。');
  return result.places.map((place) => normalizePlace({ ...place, checkedAt: result.checkedAt })).filter(Boolean);
}
export function normalizeRoute(result) {
  if (!Array.isArray(result?.paths) || !result.checkedAt || !Number.isFinite(Date.parse(result.checkedAt))) throw new Error('路线资料不完整，耗时保持未知。');
  if (!result.paths.length) return { status: 'unreachable', checkedAt: result.checkedAt, provider: '高德地图', minutes: null };
  const path = result.paths[0], seconds = path.duration === '' || path.duration == null ? NaN : Number(path.duration);
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('地图未提供有效路线耗时，时间保持未知。');
  return { status: 'ok', provider: '高德地图', checkedAt: result.checkedAt, minutes: Math.ceil(seconds / 60), distance: path.distance == null || path.distance === '' || !Number.isFinite(Number(path.distance)) ? null : Number(path.distance), steps: Array.isArray(path.steps) ? path.steps.filter((step) => typeof step === 'string').slice(0, 20) : [], buses: Array.isArray(path.segments) ? path.segments.flatMap((segment) => Array.isArray(segment.buses) ? segment.buses.filter((bus) => typeof bus === 'string') : []).slice(0, 12) : [] };
}
export async function queryLeg(leg, mode, signal) {
  if (!backendEnabled) throw new Error('离线模式无法查询实时路线。');
  return normalizeRoute(await apiRequest('route', { origin: leg.from.place.location, destination: leg.to.place.location, mode, originCity: leg.from.place.citycode, destinationCity: leg.to.place.citycode }, { signal, timeoutMs: 20000 }));
}
