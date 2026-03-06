import { pingJava, pingBedrock } from "@minescope/mineping";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMinecraftChat(component: any): string {
  if (typeof component === "string") return component;
  if (Array.isArray(component)) {
    return component.map(parseMinecraftChat).join("");
  }
  if (!component) return "";

  let result = component.text || "";
  if (Array.isArray(component.extra)) {
    for (const extra of component.extra) {
      result += parseMinecraftChat(extra);
    }
  }
  return result;
}

async function pingWithRetry(
  ip: string,
  port: number,
  type: "java" | "bedrock",
  timeout: number,
): Promise<any> {
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (type === "java") {
        return await pingJava(ip, { port, timeout });
      } else {
        return await pingBedrock(ip, { port, timeout });
      }
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        // Wait before retrying, with increasing delay
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError;
}

export async function action({ request }: { request: Request }) {
  const body = await request.json();
  const { ip, port, type, timeout = 5000 } = body;

  if (!ip || !port || !type) {
    return Response.json(
      { error: "Missing required fields: ip, port, type" },
      { status: 400 },
    );
  }

  // Basic Server-Side Request Forgery (SSRF) Protection
  const privateRegex =
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|::1|fd[0-9a-f]{2}:|fe80:|fc00:|localhost)/i;
  if (privateRegex.test(ip.trim())) {
    return Response.json(
      {
        error:
          "Scanning local or private networks is disabled for security reasons.",
      },
      { status: 403 },
    );
  }

  const portNum = parseInt(String(port), 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return Response.json({ error: "Invalid port number" }, { status: 400 });
  }

  try {
    const start = Date.now();
    const result = await pingWithRetry(ip, portNum, type, timeout);
    const latency = Date.now() - start;

    if (type === "java") {
      const motd = parseMinecraftChat(result.description);

      return Response.json({
        ip,
        port: portNum,
        type: "java",
        online: true,
        motd,
        motdRaw: result.description,
        favicon: result.favicon || null,
        version: result.version?.name || "Unknown",
        protocol: result.version?.protocol,
        playersOnline: result.players?.online || 0,
        playersMax: result.players?.max || 0,
        playerList: result.players?.sample?.map((p: any) => p.name) || [],
        latency,
        scannedAt: Date.now(),
      });
    } else {
      return Response.json({
        ip,
        port: portNum,
        type: "bedrock",
        online: true,
        motd: result.name || "",
        levelName: result.levelName || "",
        version: result.version?.minecraft || "Unknown",
        protocol: result.version?.protocol,
        playersOnline: result.players?.online || 0,
        playersMax: result.players?.max || 0,
        gameMode: result.gamemode || "",
        serverGUID: result.guid ? String(result.guid) : "",
        latency,
        scannedAt: Date.now(),
      });
    }
  } catch (error: any) {
    return Response.json({
      ip,
      port: portNum,
      type,
      online: false,
      error: error?.message || "Connection failed",
      scannedAt: Date.now(),
    });
  }
}
