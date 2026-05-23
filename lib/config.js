// config.js — central settings for the data layer.

module.exports = {
  // ---- NYC Open Data (Socrata) --------------------------------------------
  SOCRATA_BASE: 'https://data.cityofnewyork.us/resource',

  // OPTIONAL: a free Socrata "app token" raises rate limits.
  // For modest traffic you can leave this null. Get one at:
  //   https://data.cityofnewyork.us/profile/app_tokens
  SOCRATA_APP_TOKEN: null,

  // ---- Places provider (the ONLY paid piece) ------------------------------
  // 'mock'   -> no key needed, returns sample data (default)
  // 'google' -> live data, requires PLACES_API_KEY below
  PLACES_PROVIDER: 'mock',
  PLACES_API_KEY: null,

  // ---- Cache --------------------------------------------------------------
  // Hours to keep a building's results before re-fetching. Weekly = 168.
  CACHE_TTL_HOURS: 168,

  appTokenHeader() {
    return this.SOCRATA_APP_TOKEN
      ? { 'X-App-Token': this.SOCRATA_APP_TOKEN }
      : {};
  },
};