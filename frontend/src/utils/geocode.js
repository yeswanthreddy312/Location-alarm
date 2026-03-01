const NOMINATIM = 'https://nominatim.openstreetmap.org';

export async function searchPlaces(query, userLat, userLon) {
  const params = new URLSearchParams({
    format: 'json', q: query, limit: '5', addressdetails: '1', countrycodes: 'in',
  });
  if (userLat && userLon) {
    params.set('viewbox', `${userLon - 1},${userLat + 1},${userLon + 1},${userLat - 1}`);
    params.set('bounded', '0');
  }
  const res = await fetch(`${NOMINATIM}/search?${params}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data;
}

export async function reverseGeocode(lat, lon) {
  const res = await fetch(`${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
  if (!res.ok) throw new Error('Reverse geocode failed');
  return res.json();
}
