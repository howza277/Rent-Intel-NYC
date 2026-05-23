// geocode.js — resolve a typed NYC address to BBL, BIN, and coordinates.
//
// Uses NYC Planning Labs GeoSearch (Pelias). Free, no API key.

const GEOSEARCH = 'https://geosearch.planninglabs.nyc/v1/search';
const AUTOCOMPLETE = 'https://geosearch.planninglabs.nyc/v1/autocomplete';

// --- typeahead suggestions for the search bar ------------------------------
async function suggest(text) {
  if (!text || text.trim().length < 3) return [];
  const url = `${AUTOCOMPLETE}?text=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GeoSearch autocomplete failed: ${res.status}`);
  const data = await res.json();
  return (data.features || []).map(f => ({
    label: f.properties.label,
    bbl: f.properties.pad_bbl || null,
    bin: f.properties.pad_bin || null,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

// --- resolve a single chosen/typed address to a definite building ----------
async function geocode(address) {
  if (!address || !address.trim()) {
    return { ok: false, reason: 'empty_address' };
  }
  const url = `${GEOSEARCH}?text=${encodeURIComponent(address)}&size=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GeoSearch failed: ${res.status}`);
  const data = await res.json();
  const feats = data.features || [];

  if (feats.length === 0) {
    return { ok: false, reason: 'no_match' };
  }

  const top = feats[0];
  const p = top.properties;
  const confident = (p.confidence ?? 0) >= 0.8 && feats.length >= 1;

  const building = {
    label: p.label,
    bbl: p.pad_bbl || null,
    bin: p.pad_bin || null,
    houseNumber: p.housenumber || null,
    street: p.street || null,
    borough: p.borough || null,
    zip: p.postalcode || null,
    lat: top.geometry.coordinates[1],
    lng: top.geometry.coordinates[0],
    confidence: p.confidence ?? null,
  };

  if (!building.bbl) {
    return {
      ok: false,
      reason: 'no_bbl',
      building,
      alternatives: feats.slice(0, 5).map(f => f.properties.label),
    };
  }

  return {
    ok: true,
    confident,
    building,
    alternatives: feats.slice(0, 5).map(f => f.properties.label),
  };
}

// BBL is "B BBBBB LLLL" — borough digit, 5-digit block, 4-digit lot.
function splitBBL(bbl) {
  if (!bbl || bbl.length !== 10) return null;
  return {
    borough: bbl[0],
    block: bbl.slice(1, 6),
    lot: bbl.slice(6, 10),
  };
}

module.exports = { suggest, geocode, splitBBL };