// API utility to communicate with the Django PostGIS backend
const BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Builds a query string from filter options.
 * Filters out empty or null values.
 */
function buildQueryString(filters = {}) {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    const val = filters[key];
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, val);
    }
  });
  
  const str = params.toString();
  return str ? `?${str}` : '';
}

export async function fetchPlots(filters = {}) {
  const url = `${BASE_URL}/api/plots/${buildQueryString(filters)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch plots: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchStats(filters = {}) {
  const url = `${BASE_URL}/api/plots/stats/${buildQueryString(filters)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch statistics: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchMetadata(filters = {}) {
  const url = `${BASE_URL}/api/plots/metadata/${buildQueryString(filters)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch filter metadata: ${response.statusText}`);
  }
  return response.json();
}
