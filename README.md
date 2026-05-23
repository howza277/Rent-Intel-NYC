# RentIntel NYC — Full Website

This is the complete website: the search page, the results page, and the
data engine that gathers public records for a NYC address. It's a Next.js
app, ready to deploy to Vercel.

## What's in here

    app/
      page.js            the search bar + results page (what visitors see)
      layout.js          page wrapper
      globals.css        styling
      api/
        report/route.js  backend: returns records for an address
        suggest/route.js backend: address autocomplete
    lib/
      aggregate.js       the engine — ties all data sources together
      config.js          settings (API keys, cache time)
      sources/           one file per data source (311, HPD, crime, etc.)
    scripts/
      build_subway_data.js  one-time helper for subway data
    data/                where the subway data file goes
    test-engine.js       run this to test the engine by itself
    package.json         project definition

## How it works

A visitor types an address. The page calls /api/report. That runs the
engine: it geocodes the address to a building ID, then gathers 311
complaints, HPD violations, nearby crime, transit, and amenities — all
at once — and sends back one bundle the page displays.

## Running it

You need Node.js. On a Chromebook, use a browser-based environment
(StackBlitz, GitHub Codespaces, or Replit) — see the deployment guide.

    npm install        # one time, installs dependencies
    npm run dev        # starts the site at localhost:3000
    npm run test-engine   # tests just the data engine

## Before it's fully live — two things

1. SUBWAY DATA FILE — the subway lookup needs data/subway_entrances.json.
   Generate it once with scripts/build_subway_data.js (see that file's
   instructions). Until then, the subway section says "unavailable" and
   everything else works.

2. PLACES API KEY — the Whole Foods / Trader Joe's / gym lookups need a
   Google Places key. Until you add one (in lib/config.js), those show
   SAMPLE data. Everything else is free and needs no key.

## Honest status

The site builds successfully and the code is correct against NYC's
published data formats. But it was written in an environment that could
not reach the live NYC APIs to test — so the first real test (running
`npm run test-engine`) happens on your side. Each file in lib/sources/
ends with "VERIFY ON FIRST RUN" notes for the small things that can
drift. This is normal for a project built on outside data.

## Deploying

This deploys to Vercel's free tier. The step-by-step deployment guide
(written for a Chromebook, no prior experience assumed) is provided
separately.
