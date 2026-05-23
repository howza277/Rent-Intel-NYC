// app/api/report/route.js
//
// The backend endpoint the results page calls.
// GET /api/report?address=...  ->  full aggregated building report.

const { getBuildingReport } = require('../../../lib/aggregate');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address || !address.trim()) {
    return Response.json(
      { ok: false, reason: 'no_address' },
      { status: 400 }
    );
  }

  try {
    const report = await getBuildingReport(address);
    return Response.json(report);
  } catch (err) {
    console.error('report error:', err);
    return Response.json(
      { ok: false, reason: 'server_error', message: String(err.message) },
      { status: 500 }
    );
  }
}