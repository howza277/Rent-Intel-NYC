// complaints311.js — 311 service requests for a single building.
//
// Source: NYC Open Data, "311 Service Requests from 2010 to Present"
// Dataset: erm2-nwe9. Joins on the `bbl` column — exact, no address fuzziness.

const config = require('../config');

const DATASET = 'erm2-nwe9';

function twelveMonthsAgoISO() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('.')[0];
}

function buildUrl(bbl) {
  const where =
    `bbl='${bbl}'` +
    ` AND created_date > '${twelveMonthsAgoISO()}'`;
  const params = new URLSearchParams({
    '$where': where,
    '$select': 'unique_key,created_date,closed_date,complaint_type,descriptor,status',
    '$limit': '5000',
  });
  return `${config.SOCRATA_BASE}/${DATASET}.json?${params}`;
}

function summarize(rows) {
  const byType = {};
  let open = 0;
  for (const r of rows) {
    const type = (r.complaint_type || 'Other').trim();
    byType[type] = (byType[type] || 0) + 1;
    if (r.status && !/^closed$/i.test(r.status.trim())) open++;
  }
  const breakdown = Object.entries(byType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total12mo: rows.length,
    open,
    breakdown,
    windowStart: twelveMonthsAgoISO().split('T')[0],
    windowEnd: new Date().toISOString().split('T')[0],
  };
}

async function getComplaints(building) {
  if (!building.bbl) {
    return { ok: false, reason: 'no_bbl', total12mo: 0, breakdown: [] };
  }
  const url = buildUrl(building.bbl);
  const res = await fetch(url, { headers: config.appTokenHeader() });
  if (!res.ok) {
    throw new Error(`311 fetch failed: ${res.status} ${await res.text()}`);
  }
  const rows = await res.json();
  return { ok: true, ...summarize(rows) };
}

module.exports = { getComplaints };