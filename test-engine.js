// test-engine.js — run this to check the data engine works on its own,
// before worrying about the website. Usage:
//
//   node test-engine.js
//   node test-engine.js "350 5th Avenue, Manhattan"

const { getBuildingReport } = require('./lib/aggregate');

const address = process.argv[2] || '415 Third Avenue, Manhattan';

(async () => {
  console.log(`\nLooking up: ${address}\n${'='.repeat(50)}`);
  const r = await getBuildingReport(address);

  if (!r.ok) {
    console.log(`\n  Could not resolve address. Reason: ${r.reason}`);
    if (r.alternatives?.length) {
      console.log('  Did you mean:');
      r.alternatives.forEach(a => console.log(`    - ${a}`));
    }
    return;
  }

  const b = r.building;
  console.log(`\n  ${b.label}`);
  console.log(`  BBL ${b.bbl} | BIN ${b.bin} | confidence ${b.confidence}`);
  console.log(`  data refreshed: ${r.refreshedLabel}\n`);

  const d = r.data;
  const show = (name, obj, fn) => {
    console.log(`  -- ${name} --`);
    if (obj && obj.ok) fn(obj);
    else console.log(`     unavailable (${obj ? obj.reason : 'no data'})`);
    console.log('');
  };

  show('311 COMPLAINTS', d.complaints311, x => {
    console.log(`     ${x.total12mo} in last 12mo, ${x.open} open`);
    x.breakdown.slice(0, 5).forEach(t => console.log(`     ${t.type}: ${t.count}`));
  });
  show('HPD VIOLATIONS', d.hpdViolations, x => {
    console.log(`     ${x.openTotal} open (A:${x.openByClass.A} B:${x.openByClass.B} C:${x.openByClass.C})`);
  });
  show('CRIME (block level)', d.crime, x => {
    console.log(`     ${x.total12mo} incidents within ${x.radiusMeters}m`);
    x.breakdown.slice(0, 5).forEach(t => console.log(`     ${t.offense}: ${t.count}`));
  });
  show('GETTING AROUND', { ok: true }, () => {
    if (d.subway.ok) console.log(`     Subway: ${d.subway.name} - ${d.subway.walkMinutes} min`);
    else console.log(`     Subway: unavailable (${d.subway.reason})`);
    if (d.citibike.ok) console.log(`     Citi Bike: ${d.citibike.name} - ${d.citibike.walkMinutes} min`);
    else console.log(`     Citi Bike: unavailable`);
    if (d.places.ok && !d.places.live) console.log('     Places: SAMPLE data (no API key set)');
  });

  console.log(`${'='.repeat(50)}\nDone.\n`);
})().catch(e => {
  console.error('\n  ERROR:', e.message, '\n');
});
