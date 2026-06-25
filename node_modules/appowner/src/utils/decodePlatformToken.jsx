import { jwtDecode } from "jwt-decode";

export function getPlatformTokenPayload() {
  const token = localStorage.getItem("platformToken");
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp != null && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("platformToken");
      return null;
    }
    if (!decoded.platformOwner) {
      localStorage.removeItem("platformToken");
      return null;
    }
    return decoded;
  } catch {
    localStorage.removeItem("platformToken");
    return null;
  }
}
