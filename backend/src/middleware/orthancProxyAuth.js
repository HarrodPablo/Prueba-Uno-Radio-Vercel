import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

/**
 * Misma validación JWT que authMiddleware, pero acepta:
 * - Authorization: Bearer
 * - ?token= (iframes e <img> no envían headers)
 * - cookie orthanc_proxy_jwt (si cookie-parser está activo)
 */
export const orthancProxyAuth = async (req, res, next) => {
  try {
    // Assets estáticos del Stone Viewer no requieren token en la request
    // (el browser los carga desde CSS sin poder adjuntar credenciales)
    const STONE_STATIC_RE = /\.(js|mjs|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|map|wasm|json)(\?|$)/i;
    const requestPath = req.originalUrl || req.path || req.url || "";
    if (requestPath.includes("/stone-webviewer/") && STONE_STATIC_RE.test(requestPath)) {
      // Crear un user mínimo para que los middlewares siguientes no fallen
      req.user = { id: "static-asset", role: "STATIC", dni: null, name: null };
      return next();
    }
    const tokenFromReferer = (() => {
      try {
        const ref = req.headers?.referer;
        if (!ref) return null;
        const u = new URL(ref);
        return u.searchParams.get("token");
      } catch {
        return null;
      }
    })();

    const token =
      req.header("Authorization")?.replace("Bearer ", "") ||
      req.query.token ||
      tokenFromReferer ||
      req.cookies?.orthanc_proxy_jwt;

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, dni: true, name: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid token." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token." });
  }
};
