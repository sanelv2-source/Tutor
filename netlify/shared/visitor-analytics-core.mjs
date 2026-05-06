const MAX_TEXT_LENGTH = 120;

const clipText = (value, maxLength = MAX_TEXT_LENGTH) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : null;
};

const normalizeCode = (value, maxLength = 16) => {
  const code = clipText(value, maxLength);
  return code ? code.toUpperCase() : null;
};

const normalizeRoute = (value) => {
  const route = clipText(value, 160) || '/';
  if (!route.startsWith('/')) return '/';
  return route;
};

const normalizeArea = (value) => {
  const area = clipText(value, 40);
  if (['public_site', 'public_invoice', 'student_app', 'tutor_app'].includes(area)) {
    return area;
  }
  return 'public_site';
};

const normalizeVisitorId = (value) => {
  const visitorId = clipText(value, 80);
  if (!visitorId || !/^[a-zA-Z0-9:_-]+$/.test(visitorId)) return null;
  return visitorId;
};

const headerValue = (headers, key) => {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(key);

  const lowerKey = key.toLowerCase();
  const foundKey = Object.keys(headers).find((name) => name.toLowerCase() === lowerKey);
  const value = foundKey ? headers[foundKey] : null;
  return Array.isArray(value) ? value[0] : value;
};

export function getGeoFromHeaders(headers) {
  const countryCode = headerValue(headers, 'x-nf-country') || headerValue(headers, 'cf-ipcountry');

  return {
    country: {
      code: countryCode,
      name: null,
    },
    subdivision: {
      code: headerValue(headers, 'x-nf-subdivision-code'),
      name: headerValue(headers, 'x-nf-subdivision-name'),
    },
    timezone: headerValue(headers, 'x-nf-timezone'),
  };
}

export function normalizePageViewPayload(payload = {}, geo = {}) {
  const metadata = {
    route: normalizeRoute(payload.route),
    area: normalizeArea(payload.area),
    visitor_id: normalizeVisitorId(payload.visitor_id),
  };

  const countryCode = normalizeCode(geo?.country?.code);
  const countryName = clipText(geo?.country?.name);
  const regionCode = normalizeCode(geo?.subdivision?.code, 32);
  const regionName = clipText(geo?.subdivision?.name);
  const timezone = clipText(geo?.timezone, 80);

  if (countryCode) metadata.country_code = countryCode;
  if (countryName) metadata.country_name = countryName;
  if (regionCode) metadata.region_code = regionCode;
  if (regionName) metadata.region_name = regionName;
  if (timezone) metadata.timezone = timezone;

  return metadata;
}

export async function recordPageViewEvent(supabaseAdmin, payload, geo) {
  if (!supabaseAdmin) {
    throw new Error('Supabase Admin client mangler.');
  }

  const metadata = normalizePageViewPayload(payload, geo);

  const { error } = await supabaseAdmin
    .from('analytics_events')
    .insert({
      user_id: null,
      event_name: 'page_view',
      metadata,
    });

  if (error) throw error;

  return metadata;
}
