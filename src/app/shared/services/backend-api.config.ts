// Relative on purpose. In production the container nginx proxies /api/ to
// backend:3000; in local development `ng serve` uses proxy.conf.json for the
// same path. Keeping it relative means host and port never enter the bundle, so
// one image works behind the VPS IP today and behind a domain later.
export const BACKEND_API_URL = '/api';
