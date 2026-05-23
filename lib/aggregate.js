// aggregate.js — the heart of the data layer.
//
// Takes an address, runs the whole pipeline, returns ONE object shaped
// exactly like what the results page needs.

const { geocode, suggest } = require('./sources/geocode');
const { getComplaints } = require('./sources/complaints311');
const { getViolations } = require('./sources/hpdViolations');
const { getCrime } = require('./sources/crime');
const { nearestSubway, nearestCitiBike } = require('./sources/transitPOI');
const { getNearbyPlaces } = require('./sources/places');
const { CACHE_TTL_HOURS } = require('./config');

// --- a dead-simple in-memory cache, keyed by BBL ---------------------------
const cache = new Map();

function cacheGet(bbl) {
  const hit = cache.get(bbl);
  if (!hit) return null;
  const ageHours = (Date.now() - hit.fetchedAt) / 3600000;
  if (ageHours > CACHE_TTL_HOURS) {
    cache.delete(bbl);
    return null;
  }
  return hit.value;
}
function cacheSet(bbl, value) {
  cache.set(bbl, { value, fetchedAt: Date.now() });
}

// --- the main entry point --------------------------------------------------
async function getBuildingReport(address) {
  const geo = await geocode(address);
  if (!geo.ok) {
    return {
      ok: false,
      reason: geo.reason,
      alternatives: geo.alternatives || [],
    };
  }

  const cached = cacheGet(geo.building.bbl);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const b = geo.building;
  const [complaints, violations, crime, subway, citibike, places] =
    await Promise.allSettled([
      getComplaints(b),
      getViolations(b),
      getCrime(b),
      nearestSubway(b.lat, b.lng),
      nearestCitiBike(b.lat, b.lng),
      getNearbyPlaces(b),
    ]);

  const unwrap = (settled, name) =>
    settled.status === 'fulfilled'
      ? settled.value
      : { ok: false, reason: 'source_error', error: String(settled.reason), source: name };

  const report = {
    ok: true,
    building: b,
    confident: geo.confident,
    fetchedAt: new Date().toISOString(),
    refreshedLabel: new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
    data: {
      complaints311: unwrap(complaints, '311'),
      hpdViolations: unwrap(violations, 'HPD'),
      crime:         unwrap(crime, 'NYPD'),
      subway:        unwrap(subway, 'subway'),
      citibike:      unwrap(citibike, 'citibike'),
      places:        unwrap(places, 'places'),
    },
  };

  cacheSet(b.bbl, report);
  return report;
}

module.exports = { getBuildingReport, suggest };