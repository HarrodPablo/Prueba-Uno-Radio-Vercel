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
