const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * URL absoluta al backend para iframes (el navegador no usa el baseURL de axios).
 */
export function backendOrigin() {
  return apiBase.replace(/\/+$/, "");
}

/**
 * Añade ?token= o &token= para rutas del proxy Orthanc (img, iframe sin header Authorization).
 */
export function withOrthancProxyAuth(pathOrUrl, token) {
  if (!pathOrUrl || !token) return pathOrUrl || "";
  const sep = pathOrUrl.includes("?") ? "&" : "?";
  return `${pathOrUrl}${sep}token=${encodeURIComponent(token)}`;
}
