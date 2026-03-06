import { useState, useCallback, useMemo } from "react";
import { useStore, useHydrated, type ServerResult } from "../store";
import { Button, Card, Chip, Pagination } from "@heroui/react";
import {
  History as HistoryIcon,
  RefreshCw,
  Download,
  Trash2,
  Heart,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useNavigate } from "react-router";
import { ServerCardSkeleton } from "../components/server-card";

const PAGE_SIZE = 12;

export function meta() {
  return [
    { title: "History — MS Scanner" },
    {
      name: "description",
      content: "View all your previously scanned Minecraft servers.",
    },
  ];
}

function stripMinecraftCodes(text: string): string {
  return text.replace(/§[0-9a-fk-or]/gi, "");
}

export default function History() {
  const isHydrated = useHydrated();
  const navigate = useNavigate();
  const {
    recentScans,
    clearRecentScans,
    settings,
    isFavorite,
    addFavorite,
    removeFavorite,
    addRecentScan,
  } = useStore();

  const [pingStatus, setPingStatus] = useState<
    Record<string, "checking" | "online" | "offline">
  >({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [page, setPage] = useState(1);

  const onlineHistory = recentScans.filter((s) => s.online);
  const totalPages = Math.max(1, Math.ceil(onlineHistory.length / PAGE_SIZE));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const paginatedServers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return onlineHistory.slice(start, start + PAGE_SIZE);
  }, [onlineHistory, page]);

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, onlineHistory.length);

  const serverKey = (s: ServerResult) => `${s.ip}:${s.port}`;

  const pingServer = useCallback(
    async (server: ServerResult) => {
      const key = serverKey(server);
      setPingStatus((prev) => ({ ...prev, [key]: "checking" }));

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip: server.ip,
            port: server.port,
            type: server.type,
            timeout: settings.timeout,
          }),
        });
        const data = await res.json();
        setPingStatus((prev) => ({
          ...prev,
          [key]: data.online ? "online" : "offline",
        }));

        if (data.online) {
          addRecentScan(data);
        }
      } catch {
        setPingStatus((prev) => ({ ...prev, [key]: "offline" }));
      }
    },
    [settings.timeout, addRecentScan],
  );

  const refreshAll = useCallback(async () => {
    setIsRefreshingAll(true);

    const servers = [...onlineHistory];
    let index = 0;

    async function next(): Promise<void> {
      if (index >= servers.length) return;
      const server = servers[index++];
      await pingServer(server);
      return next();
    }

    const workerCount = Math.min(settings.concurrency, servers.length);
    const workers: Promise<void>[] = [];
    for (let i = 0; i < workerCount; i++) {
      workers.push(next());
      if (i < workerCount - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    await Promise.all(workers);

    setIsRefreshingAll(false);
  }, [onlineHistory, pingServer, settings.concurrency]);

  const exportToTxt = useCallback(() => {
    const lines = onlineHistory.map((s) => `${s.ip}:${s.port}`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mc-servers-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [onlineHistory]);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <div className="h-5 w-48 bg-default rounded mt-1 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <ServerCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-sm text-muted">
            {onlineHistory.length} server
            {onlineHistory.length !== 1 ? "s" : ""} in scan history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onPress={refreshAll}
            isDisabled={onlineHistory.length === 0 || isRefreshingAll}
            isPending={isRefreshingAll}
          >
            <RefreshCw className="w-4 h-4" />
            {isRefreshingAll ? "Checking..." : "Refresh All"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onPress={exportToTxt}
            isDisabled={onlineHistory.length === 0}
          >
            <Download className="w-4 h-4" />
            Export .txt
          </Button>

          <Button
            variant="danger"
            size="sm"
            onPress={clearRecentScans}
            isDisabled={onlineHistory.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </div>

      {onlineHistory.length === 0 ? (
        <Card>
          <Card.Content className="text-center py-12">
            <HistoryIcon className="w-10 h-10 text-muted mx-auto mb-3 opacity-30" />
            <p className="text-muted text-sm">
              No scan history yet. Go to the Home page and scan some servers to
              start building your history.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paginatedServers.map((server) => {
              const key = serverKey(server);
              const status = pingStatus[key];
              const fav = isFavorite(server.ip, server.port);
              const cleanMotd = server.motd
                ? stripMinecraftCodes(server.motd)
                : "No MOTD";

              return (
                <Card key={key} className="cursor-pointer">
                  <div
                    onClick={() =>
                      navigate(`?server=${server.ip}:${server.port}`)
                    }
                    className="space-y-3"
                  >
                    <Card.Header className="flex-row items-center gap-3">
                      <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-default flex items-center justify-center">
                        {server.favicon ? (
                          <img
                            src={server.favicon}
                            alt="Server icon"
                            className="w-full h-full object-cover"
                            style={{ imageRendering: "pixelated" }}
                          />
                        ) : (
                          <span className="text-accent text-base font-bold">
                            {server.type === "java" ? "J" : "B"}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <Card.Title>
                          {server.ip}
                          <span className="text-muted font-normal">
                            :{server.port}
                          </span>
                        </Card.Title>
                        <Card.Description className="line-clamp-1">
                          {cleanMotd}
                        </Card.Description>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          isIconOnly
                          variant="secondary"
                          size="sm"
                          onPress={() => {
                            pingServer(server);
                          }}
                          isDisabled={status === "checking"}
                          aria-label="Re-ping server"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${status === "checking" ? "animate-spin" : ""}`}
                          />
                        </Button>
                        <Button
                          isIconOnly
                          variant={fav ? "danger" : "secondary"}
                          size="sm"
                          onPress={() => {
                            if (fav) removeFavorite(server.ip, server.port);
                            else addFavorite(server);
                          }}
                          aria-label={
                            fav ? "Remove from favorites" : "Add to favorites"
                          }
                        >
                          <Heart
                            className="w-4 h-4"
                            fill={fav ? "currentColor" : "none"}
                          />
                        </Button>
                      </div>
                    </Card.Header>

                    <Card.Content>
                      <div className="flex items-center gap-2 flex-wrap">
                        {status === "online" && (
                          <Chip size="sm" color="success" variant="soft">
                            <Wifi className="w-3 h-3 mr-1" />
                            Online
                          </Chip>
                        )}
                        {status === "offline" && (
                          <Chip size="sm" color="danger" variant="soft">
                            <WifiOff className="w-3 h-3 mr-1" />
                            Offline
                          </Chip>
                        )}
                        {status === "checking" && (
                          <Chip size="sm" color="warning" variant="soft">
                            Checking...
                          </Chip>
                        )}
                        {!status && (
                          <Chip size="sm" color="success" variant="soft">
                            <Wifi className="w-3 h-3 mr-1" />
                            Online
                          </Chip>
                        )}

                        <Chip size="sm" color="accent" variant="soft">
                          {server.type.toUpperCase()}
                        </Chip>
                        {server.version && (
                          <Chip size="sm" variant="secondary">
                            {server.version}
                          </Chip>
                        )}
                      </div>
                    </Card.Content>

                    <Card.Footer>
                      <div className="flex items-center justify-between w-full text-xs text-muted">
                        <span>
                          {server.playersOnline !== undefined && (
                            <>
                              <span className="font-semibold text-foreground">
                                {server.playersOnline}
                              </span>
                              /{server.playersMax} players
                            </>
                          )}
                        </span>
                        <span>
                          {new Date(server.scannedAt).toLocaleString()}
                        </span>
                      </div>
                    </Card.Footer>
                  </div>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <Pagination size="sm">
              <Pagination.Summary>
                {start} to {end} of {onlineHistory.length} servers
              </Pagination.Summary>
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous
                    isDisabled={page === 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <Pagination.PreviousIcon />
                    Prev
                  </Pagination.Previous>
                </Pagination.Item>
                {pages.map((p) => (
                  <Pagination.Item key={p}>
                    <Pagination.Link
                      isActive={p === page}
                      onPress={() => setPage(p)}
                    >
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                ))}
                <Pagination.Item>
                  <Pagination.Next
                    isDisabled={page === totalPages}
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
