import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const SIGMA_BASE_URL =
  "https://app.sigmacomputing.com/commerce-control-center-fiserv-cat";

export function mintEmbedJwt(client: string = "dnkn"): string {
  const clientId = process.env.JWT_CLIENT_ID;
  const secret = process.env.JWT_SECRET;
  if (!clientId || !secret) {
    throw new Error("JWT_CLIENT_ID and JWT_SECRET must be set");
  }

  const teamName = client.replace(/'/g, "");
  // dnkn-delete: identical to dnkn except email
  const isDnknDelete = client === "dnkn-delete";
  const team = isDnknDelete ? "dnkn" : teamName;
  const sub = isDnknDelete
    ? "jon+guest+dnkn+delete@sigmacomputing.com"
    : `jon+guest+${teamName}@sigmacomputing.com`;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour

  const payload = {
    sub,
    aud: "sigmacomputing",
    ver: "1.1",
    jti: uuidv4(),
    iat: now,
    exp,
    user_attributes: {
      client_id: `'${team}'`,
    },
    account_type: "Embed - Build",
    teams: [team],
    iss: clientId,
  };

  const token = jwt.sign(payload, secret, {
    algorithm: "HS256",
    header: {
      alg: "HS256",
      typ: "JWT",
      kid: clientId,
    },
  });

  return token;
}

export function buildEmbedUrl(client: string = "dnkn"): string {
  const token = mintEmbedJwt(client);
  return `${SIGMA_BASE_URL}?:jwt=${encodeURIComponent(token)}`;
}
