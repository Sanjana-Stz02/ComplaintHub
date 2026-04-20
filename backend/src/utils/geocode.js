/**
 * Resolve a free-text address to coordinates using OpenStreetMap Nominatim.
 * @see https://nominatim.org/release-docs/latest/api/Search/
 */

/** Strip Plus Codes (e.g. RCCG+VX3) and leading unit numbers so Nominatim can parse the street/city part. */
function simplifyAddressQuery(address) {
  let s = address.replace(/\b[a-z0-9]{4,8}\+[a-z0-9]{2,4}\b/gi, " ");
  s = s.replace(/^\s*\d+\s*,\s*/i, "");
  s = s.replace(/,/g, ", ").replace(/\s+/g, " ").replace(/,\s*,/g, ",").trim();
  return s;
}

function shouldBiasBangladesh(query) {
  const lower = query.toLowerCase();
  return (
    lower.includes("bangladesh") ||
    lower.includes("dhaka") ||
    lower.includes("chattogram") ||
    lower.includes("chittagong") ||
    lower.includes("sylhet") ||
    lower.includes("rajshahi") ||
    lower.includes("khulna") ||
    lower.includes("barishal") ||
    lower.includes("rangpur") ||
    lower.includes("mymensingh") ||
    lower.includes("kuratoli")
  );
}

async function nominatimSearch(query, signal) {
  const trimmed = typeof query === "string" ? query.trim() : "";

  if (trimmed.length < 3) {
    return null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  if (shouldBiasBangladesh(trimmed)) {
    url.searchParams.set("countrycodes", "bd");
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "ComplaintHub/1.0 (local education project)"
    },
    signal
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return { lat, lng };
}

export async function geocodeAddressToLatLng(address) {
  const trimmed = typeof address === "string" ? address.trim() : "";

  if (trimmed.length < 3) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const attempts = [trimmed];
  const simplified = simplifyAddressQuery(trimmed);

  if (simplified.length >= 3 && simplified !== trimmed) {
    attempts.push(simplified);
  }

  try {
    for (const query of attempts) {
      const result = await nominatimSearch(query, controller.signal);

      if (result) {
        return result;
      }
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
