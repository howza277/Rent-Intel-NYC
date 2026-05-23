'use client';
// app/page.js — the whole user-facing app: search + results.

import { useState, useRef } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('idle'); // idle|loading|error
  const [errorMsg, setErrorMsg] = useState('');
  const debounceRef = useRef(null);

  // --- autocomplete as the user types --------------------------------------
  function onType(value) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  // --- run the full lookup -------------------------------------------------
  async function runSearch(address) {
    const addr = (address || query).trim();
    if (addr.length < 3) return;
    setSuggestions([]);
    setStatus('loading');
    setReport(null);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/report?address=${encodeURIComponent(addr)}`);
      const data = await res.json();
      if (!data.ok) {
        setStatus('error');
        if (data.reason === 'no_match' || data.reason === 'no_bbl') {
          setErrorMsg(
            "We couldn't find that exact building." +
            (data.alternatives?.length
              ? ' Try one of these: ' + data.alternatives.join('; ')
              : ' Try adding the borough, e.g. "415 Third Avenue, Manhattan".')
          );
        } else {
          setErrorMsg('Something went wrong looking that up. Please try again.');
        }
        return;
      }
      setReport(data);
      setStatus('idle');
    } catch {
      setStatus('error');
      setErrorMsg('Could not reach the server. Please try again.');
    }
  }

  function pickSuggestion(s) {
    setQuery(s.label);
    setSuggestions([]);
    runSearch(s.label);
  }

  return (
    <>
      <header>
        <div className="wrap">
          <div className="brand">Rent<span>Intel</span> NYC</div>
          <div className="tagline">Public records for any NYC address — in one place</div>
        </div>
      </header>

      <div className="wrap">
        <div className="search-block">
          <div className="search-row">
            <input
              type="text"
              value={query}
              placeholder="Enter a NYC apartment address…"
              autoComplete="off"
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
            />
            <button
              onClick={() => runSearch()}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? '…' : 'Search'}
            </button>
          </div>

          {suggestions.length > 0 && (
            <div className="suggest">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => pickSuggestion(s)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {status === 'loading' && (
          <div className="status">Gathering public records…</div>
        )}
        {status === 'error' && (
          <div className="status error">{errorMsg}</div>
        )}
        {status === 'idle' && !report && (
          <div className="note">— Enter an address above to see public records —</div>
        )}

        {report && <Results report={report} />}
      </div>
    </>
  );
}

// ===========================================================================
function Results({ report }) {
  const b = report.building;
  const d = report.data;

  return (
    <div>
      <div className="addr-head">
        <h1>{b.houseNumber} {b.street}</h1>
        <div className="addr-meta">
          {b.borough} · {b.zip} &nbsp;|&nbsp; BBL {b.bbl}
          {b.bin ? ` · BIN ${b.bin}` : ''}
        </div>
      </div>

      <div className="pulled">◷ Public records last refreshed — {report.refreshedLabel}</div>

      {!report.confident && (
        <div className="confirm">
          This was our best match for what you typed. If it&apos;s not the
          right building, search again with the borough included.
        </div>
      )}

      <GettingAround subway={d.subway} citibike={d.citibike} places={d.places} />
      <Complaints data={d.complaints311} />
      <Violations data={d.hpdViolations} />
      <Crime data={d.crime} />

      <div className="disclaimer">
        RentIntel NYC aggregates public records from NYC Open Data, the MTA,
        and Citi Bike. We display what the records say — we do not rate, score,
        or rank buildings. Records may be incomplete, delayed, or matched to the
        wrong address; always verify with official sources and your own visit
        before making a rental decision. Crime data is reported at block level.
        Data last refreshed {report.refreshedLabel}.
      </div>
    </div>
  );
}

function GettingAround({ subway, citibike, places }) {
  return (
    <section className="block">
      <div className="block-head">
        <h3>Getting around</h3>
        <span className="src">MTA · Citi Bike · Places</span>
      </div>
      <div className="block-body">
        {subway?.ok ? (
          <div className="poi">
            <div className="label">Subway — {subway.line}
              <small>{subway.name}</small></div>
            <div className="dist"><b>{subway.walkMinutes} min</b><br />{subway.miles} mi</div>
          </div>
        ) : (
          <div className="poi"><span className="unavailable">Subway data unavailable</span></div>
        )}

        {citibike?.ok ? (
          <div className="poi">
            <div className="label">Citi Bike dock
              <small>{citibike.name}
                {citibike.bikesAvailable != null && (
                  <span className="live"> · {citibike.bikesAvailable} bikes / {citibike.docksAvailable} docks free now</span>
                )}
              </small></div>
            <div className="dist"><b>{citibike.walkMinutes} min</b><br />{citibike.miles} mi</div>
          </div>
        ) : (
          <div className="poi"><span className="unavailable">Citi Bike data unavailable</span></div>
        )}

        {places?.ok && places.places.map((p) => (
          p.walkMinutes != null ? (
            <div className="poi" key={p.key}>
              <div className="label">{p.label}
                {p.isMock && <small>sample location — add a Places API key for real data</small>}
                {p.address && <small>{p.address}</small>}
              </div>
              <div className="dist"><b>{p.walkMinutes} min</b><br />{p.miles} mi</div>
            </div>
          ) : null
        ))}
      </div>
    </section>
  );
}

function Complaints({ data }) {
  if (!data?.ok) {
    return (
      <section className="block">
        <div className="block-head"><h3>311 complaints — this building</h3>
          <span className="src">NYC 311 · Open Data</span></div>
        <div className="block-body"><span className="unavailable">
          311 data unavailable for this building.</span></div>
      </section>
    );
  }
  return (
    <section className="block">
      <div className="block-head">
        <h3>311 complaints — this building</h3>
        <span className="src">NYC 311 · Open Data</span>
      </div>
      <div className="block-body">
        <div className="countgrid">
          <div className="cell">
            <div className={'num' + (data.total12mo > 0 ? ' flag' : '')}>{data.total12mo}</div>
            <div className="cap">last 12 mo</div></div>
          <div className="cell"><div className="num">{data.open}</div>
            <div className="cap">still open</div></div>
          <div className="cell"><div className="num">{data.breakdown.length}</div>
            <div className="cap">types</div></div>
        </div>
        {data.breakdown.slice(0, 8).map((x) => (
          <div className="bd" key={x.type}>
            <span>{x.type}</span><span className="ct">{x.count}</span>
          </div>
        ))}
        <div className="ctx">Counts cover {data.windowStart} to {data.windowEnd}.</div>
      </div>
    </section>
  );
}

function Violations({ data }) {
  if (!data?.ok) {
    return (
      <section className="block">
        <div className="block-head"><h3>HPD housing violations</h3>
          <span className="src">NYC HPD</span></div>
        <div className="block-body"><span className="unavailable">
          HPD data unavailable for this building.</span></div>
      </section>
    );
  }
  const c = data.openByClass || {};
  return (
    <section className="block">
      <div className="block-head">
        <h3>HPD housing violations</h3>
        <span className="src">NYC Housing Preservation &amp; Dev.</span>
      </div>
      <div className="block-body">
        <div className="countgrid">
          <div className="cell">
            <div className={'num' + (data.openTotal > 0 ? ' flag' : '')}>{data.openTotal}</div>
            <div className="cap">open total</div></div>
          <div className="cell"><div className="num">{data.closed12mo}</div>
            <div className="cap">closed (12mo)</div></div>
          <div className="cell"><div className="num">{(c.C || 0)}</div>
            <div className="cap">hazardous open</div></div>
        </div>
        <div className="bd"><span>Immediately hazardous
          <span className="sevtag sev-c">Class C</span></span>
          <span className="ct">{c.C || 0} open</span></div>
        <div className="bd"><span>Hazardous
          <span className="sevtag sev-b">Class B</span></span>
          <span className="ct">{c.B || 0} open</span></div>
        <div className="bd"><span>Non-hazardous
          <span className="sevtag sev-a">Class A</span></span>
          <span className="ct">{c.A || 0} open</span></div>
        <div className="ctx">
          NYC classifies violations A (least urgent) to C (immediately
          hazardous — e.g. no heat, lead, pests).
          {data.oldestOpenDate && ` Oldest open violation cited ${data.oldestOpenDate}.`}
        </div>
      </div>
    </section>
  );
}

function Crime({ data }) {
  if (!data?.ok) {
    return (
      <section className="block">
        <div className="block-head"><h3>Reported incidents — this block</h3>
          <span className="src">NYPD · Open Data</span></div>
        <div className="block-body"><span className="unavailable">
          NYPD data unavailable for this location.</span></div>
      </section>
    );
  }
  return (
    <section className="block">
      <div className="block-head">
        <h3>Reported incidents — this block</h3>
        <span className="src">NYPD · Open Data</span>
      </div>
      <div className="block-body">
        <div className="countgrid">
          <div className="cell"><div className="num">{data.total12mo}</div>
            <div className="cap">reported</div></div>
          <div className="cell"><div className="num">{data.categories}</div>
            <div className="cap">categories</div></div>
          <div className="cell">
            <div className="num">{data.mostRecent ? data.mostRecent.slice(5) : '—'}</div>
            <div className="cap">most recent</div></div>
        </div>
        {data.breakdown.slice(0, 8).map((x) => (
          <div className="bd" key={x.offense}>
            <span>{x.offense}</span><span className="ct">{x.count}</span>
          </div>
        ))}
        <div className="ctx">
          NYPD geocodes incidents to the block, not the building — these are
          reports within about {data.radiusMeters} m of this address, not at it.
        </div>
      </div>
    </section>
  );
}