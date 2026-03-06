import { pingJava, pingBedrock } from "@minescope/mineping";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile } from "fs/promises";
import { join } from "path";

// Recursively parse MOTD JSON
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

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const server = url.searchParams.get("server");

  // Read Fonts from stable fontsource node module
  const interRegular = await readFile(
    join(
      process.cwd(),
      "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
    ),
  );
  const interBold = await readFile(
    join(
      process.cwd(),
      "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
    ),
  );

  let title = "Minecraft Server Scanner";
  let subtitle = "Check live status, MOTD, and players instantly.";
  let statusColor = "#6366f1"; // Primary accent
  let online = false;
  let players = "";
  let latency = "";
  let serverFavicon = "";

  if (server) {
    const [ip, portStr] = server.split(":");
    const port = portStr ? parseInt(portStr, 10) : 25565;

    title = `${ip}${port !== 25565 && port !== 19132 ? `:${port}` : ""}`;

    // First try Java ping
    try {
      const start = Date.now();
      const result = await pingJava(ip, { port, timeout: 3000 });
      const pingTime = Date.now() - start;
      online = true;
      statusColor = "#22c55e"; // success
      players = `${result.players?.online || 0}/${result.players?.max || 0}`;
      latency = `${pingTime}ms`;
      subtitle = parseMinecraftChat(result.description);

      if (result.favicon) {
        serverFavicon = result.favicon;
      }
    } catch {
      // Fallback Bedrock
      try {
        const start = Date.now();
        const result = await pingBedrock(ip, { port, timeout: 3000 });
        const pingTime = Date.now() - start;
        online = true;
        statusColor = "#22c55e";
        players = `${result.players?.online || 0}/${result.players?.max || 0}`;
        latency = `${pingTime.toLocaleString()}ms`;
        subtitle = parseMinecraftChat(result.name);
      } catch {
        online = false;
        statusColor = "#ef4444"; // danger
        subtitle = "Server is completely offline or unreachable.";
        players = "0/0";
      }
    }
  }

  // Remove trailing newlines
  subtitle = subtitle.replace(/\n/g, " ");

  const svg = await satori(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0a0f",
        padding: "60px 80px",
        fontFamily: '"Inter"',
        color: "white",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "linear-gradient(to bottom right, rgba(99, 102, 241, 0.1), transparent)",
        }}
      />

      {/* Main Content Area that pushes footer down */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: server ? "flex-start" : "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            width: "100%",
          }}
        >
          <div
            style={{
              padding: "16px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "16px",
              marginRight: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "80px",
              height: "80px",
            }}
          >
            {serverFavicon ? (
              <img
                src={serverFavicon}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "8px",
                  display: "flex",
                  objectFit: "cover",
                }}
              />
            ) : (
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke={server ? statusColor : "#6366f1"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                {server ? (
                  online ? (
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke={statusColor}
                      fill={statusColor}
                      fillOpacity="0.2"
                    />
                  ) : (
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  )
                ) : (
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity="0.2"
                  />
                )}
              </svg>
            )}
          </div>
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <h1
              style={{
                fontSize: "64px",
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-0.05em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              {title}
            </h1>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "100%",
            maxHeight: "150px",
            overflow: "hidden",
            marginBottom: server ? "auto" : 0,
          }}
        >
          <p
            style={{
              fontSize: "32px",
              color: "#a1a1aa",
              lineHeight: "1.4",
              margin: 0,
              maxWidth: "100%",
              display: "-webkit-box",
              whiteSpace: "pre-wrap",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subtitle}
          </p>
        </div>

        {server && (
          <div style={{ display: "flex", gap: "24px", marginTop: "32px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "20px 24px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "16px",
                minWidth: "200px",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  color: "#a1a1aa",
                  marginBottom: "8px",
                }}
              >
                Status
              </span>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "8px",
                    backgroundColor: statusColor,
                    marginRight: "12px",
                    boxShadow: `0 0 12px ${statusColor}`,
                  }}
                />
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    color: statusColor,
                  }}
                >
                  {online ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "20px 24px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "16px",
                minWidth: "200px",
              }}
            >
              <span
                style={{
                  fontSize: "20px",
                  color: "#a1a1aa",
                  marginBottom: "8px",
                }}
              >
                Players
              </span>
              <span style={{ fontSize: "32px", fontWeight: 700 }}>
                {players}
              </span>
            </div>

            {online && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px 24px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: "16px",
                  minWidth: "200px",
                }}
              >
                <span
                  style={{
                    fontSize: "20px",
                    color: "#a1a1aa",
                    marginBottom: "8px",
                  }}
                >
                  Latency
                </span>
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    color: "#e2e8f0",
                  }}
                >
                  {latency}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "32px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", marginRight: "16px" }}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="#e2e8f0"
              strokeWidth="2"
              strokeOpacity="0.15"
            />
            <circle
              cx="16"
              cy="16"
              r="10"
              stroke="#e2e8f0"
              strokeWidth="1.5"
              strokeOpacity="0.1"
            />
            <path
              d="M16 2a14 14 0 0 1 14 14"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <rect
              x="14"
              y="6"
              width="4"
              height="4"
              rx="0.5"
              fill="#e2e8f0"
              fillOpacity="0.7"
            />
            <rect
              x="14"
              y="22"
              width="4"
              height="4"
              rx="0.5"
              fill="#e2e8f0"
              fillOpacity="0.7"
            />
            <rect
              x="6"
              y="14"
              width="4"
              height="4"
              rx="0.5"
              fill="#e2e8f0"
              fillOpacity="0.7"
            />
            <rect
              x="22"
              y="14"
              width="4"
              height="4"
              rx="0.5"
              fill="#e2e8f0"
              fillOpacity="0.7"
            />
            <circle cx="16" cy="16" r="2.5" fill="#3b82f6" />
          </svg>
        </div>
        <span
          style={{
            fontSize: "24px",
            color: "#e2e8f0",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          MS Scanner
        </span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: interRegular,
          weight: 400,
          style: "normal",
        },
        {
          name: "Inter",
          data: interBold,
          weight: 700,
          style: "normal",
        },
      ],
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const pngData = resvg.render().asPng();

  return new Response(new Uint8Array(pngData), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
