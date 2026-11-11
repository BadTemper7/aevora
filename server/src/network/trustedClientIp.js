import { isIP } from "node:net";

const validIp = (value) => typeof value === "string" && isIP(value.trim()) !== 0;

/** Choose a validated Express client IP after `trust proxy` resolves hops. */
export function clientIpFromRequest(req) {
  if (validIp(req.ip)) return req.ip.trim();
  if (validIp(req.socket?.remoteAddress)) return req.socket.remoteAddress.trim();
  return null;
}

/** Socket.IO bypasses Express's normal middleware. Apply the same hop count. */
export function clientIpFromSocket(socket, proxyHops = 0) {
  const headers = socket.handshake?.headers || {};
  const remote = socket.handshake?.address;
  const forwarded = typeof headers["x-forwarded-for"] === "string"
    ? headers["x-forwarded-for"].split(",").map((ip) => ip.trim())
    : [];
  const chain = [...forwarded, remote];
  const candidate = chain[chain.length - 1 - proxyHops];
  if (validIp(candidate)) return candidate.trim();
  if (validIp(remote)) return remote.trim();
  return null;
}
