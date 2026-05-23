// app/api/suggest/route.js
//
// GET /api/suggest?q=...  ->  address autocomplete suggestions.

const { suggest } = require('../../../lib/aggregate');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 3) {
    return Response.json({ suggestions: [] });
  }

  try {
    const results = await suggest(q);
    return Response.json({ suggestions: results });
  } catch (err) {
    console.error('suggest error:', err);
    return Response.json({ suggestions: [] });
  }
}