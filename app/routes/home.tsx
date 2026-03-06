import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  Button,
  TextField,
  Label,
  Input,
  Description,
  Chip,
  Card,
  Tabs,
  Spinner,
  Pagination,
  SearchField,
  Select,
  ListBox,
} from "@heroui/react";
import {
  Search,
  Radar,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useStore, useHydrated, type ServerResult } from "../store";
import ServerCard, { ServerCardSkeleton } from "../components/server-card";
import type { Key } from "react-aria-components";

export function meta({ location }: { location: any }) {
  const searchParams = new URLSearchParams(location.search);
  const server = searchParams.get("server");

  const title = server
    ? `Status for ${server} — MS Scanner`
    : "MS Scanner — Minecraft Server Scanner";
  const description = server
    ? `Check the live status, MOTD, player count, and latency for the Minecraft server ${server} instantly using MS Scanner.`
    : "MS Scanner is a free open-source tool to scan Minecraft Java and Bedrock servers instantly. Check live status, online players, MOTD, network latency, and more without opening the game. Supports concurrent multi-threading.";

  const baseUrl =
    import.meta.env.VITE_PUBLIC_URL || "https://ms-scanner.vercel.app";
  const ogUrl = server
    ? `${baseUrl}/api/og?server=${server}`
    : `${baseUrl}/api/og`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:image", content: ogUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogUrl },
  ];
}

function parsePorts(portStr: string): number[] {
  const ports: Set<number> = new Set();
  const parts = portStr.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end && i <= 65535; i++) {
          ports.add(i);
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= 65535) {
        ports.add(p);
      }
    }
  }

  return Array.from(ports);
}

async function scanBatch(
  ip: string,
  ports: number[],
  type: "java" | "bedrock",
  timeout: number,
  onResult: (result: ServerResult, port: number) => void,
  concurrency: number,
  signal?: AbortSignal,
): Promise<void> {
  let index = 0;

  async function next(): Promise<void> {
    if (index >= ports.length || signal?.aborted) return;
    const port = ports[index++];
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, port, type, timeout }),
        signal,
      });
      const data = await res.json();
      if (!signal?.aborted) onResult(data, port);
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError" && !signal?.aborted) {
        onResult(
          { ip, port, type, online: false, scannedAt: Date.now() },
          port,
        );
      }
    }
    // Small delay between sequential scans to reduce server pressure
    if (index < ports.length && !signal?.aborted) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return next();
  }

  const workerCount = Math.min(concurrency, ports.length);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i++) {
    if (signal?.aborted) break;
    workers.push(next());
    if (i < workerCount - 1 && !signal?.aborted) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  await Promise.all(workers);
}

export default function Home() {
  const isHydrated = useHydrated();
  const [ip, setIp] = useState("");
  const [portInput, setPortInput] = useState("");
  const [serverType, setServerType] = useState<"java" | "bedrock">("java");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ServerResult[]>([]);
  const [totalPortsToScan, setTotalPortsToScan] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);
  const [scanLog, setScanLog] = useState<{ port: number; online: boolean }[]>(
    [],
  );
  const [historyPage, setHistoryPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<Key>("newest");
  const [currentScanPage, setCurrentScanPage] = useState(1);
  const [currentScanSearchQuery, setCurrentScanSearchQuery] = useState("");
  const [currentScanSortOrder, setCurrentScanSortOrder] =
    useState<Key>("newest");

  const { recentScans, addRecentScan, settings } = useStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // Abort any ongoing scans on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleScan = useCallback(async () => {
    if (!ip.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const signal = abortController.signal;

    const currentSettings = useStore.getState().settings;

    const defaultPort = serverType === "java" ? "25565" : "19132";
    const portStr = portInput.trim() || defaultPort;
    const ports = parsePorts(portStr);

    if (ports.length === 0) return;

    setIsScanning(true);
    setScanResults([]);
    setScanLog([]);
    setTotalPortsToScan(ports.length);
    setScannedCount(0);

    await scanBatch(
      ip.trim(),
      ports,
      serverType,
      currentSettings.timeout,
      (result, port) => {
        setScanResults((prev) => [...prev, result]);
        setScannedCount((prev) => prev + 1);
        setScanLog((prev) => [{ port, online: result.online }, ...prev]);
        addRecentScan(result);
      },
      currentSettings.concurrency,
      signal,
    );

    if (!signal.aborted) {
      setIsScanning(false);
    }
  }, [ip, portInput, serverType, addRecentScan]);

  const onlineResults = useMemo(() => {
    function stripMinecraftCodes(text: string): string {
      return text.replace(/§[0-9a-fk-or]/gi, "");
    }

    let filtered = scanResults.filter((s) => s.online);

    if (currentScanSearchQuery) {
      const q = currentScanSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.ip.toLowerCase().includes(q) ||
          s.port.toString().includes(q) ||
          (s.motd && stripMinecraftCodes(s.motd).toLowerCase().includes(q)),
      );
    }

    return filtered.sort((a, b) => {
      switch (currentScanSortOrder) {
        case "newest":
          return (
            new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
          );
        case "players-desc":
          return (b.playersOnline || 0) - (a.playersOnline || 0);
        case "players-asc":
          return (a.playersOnline || 0) - (b.playersOnline || 0);
        default:
          return 0;
      }
    });
  }, [scanResults, currentScanSearchQuery, currentScanSortOrder]);

  const recentExcludingCurrent = useMemo(() => {
    function stripMinecraftCodes(text: string): string {
      return text.replace(/§[0-9a-fk-or]/gi, "");
    }

    let filtered = recentScans.filter(
      (s) =>
        s.online &&
        !onlineResults.find(
          (r) =>
            r.ip === s.ip && r.port === s.port && r.scannedAt === s.scannedAt,
        ),
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.ip.toLowerCase().includes(q) ||
          s.port.toString().includes(q) ||
          (s.motd && stripMinecraftCodes(s.motd).toLowerCase().includes(q)),
      );
    }

    return filtered.sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return (
            new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
          );
        case "players-desc":
          return (b.playersOnline || 0) - (a.playersOnline || 0);
        case "players-asc":
          return (a.playersOnline || 0) - (b.playersOnline || 0);
        default:
          return 0;
      }
    });
  }, [recentScans, onlineResults, searchQuery, sortOrder]);

  const stats = useMemo(() => {
    const onlineServers = recentScans.filter((s) => s.online);
    const withLatency = onlineServers.filter(
      (s) => s.latency !== undefined && s.latency > 0,
    );

    return {
      totalScans: recentScans.length,
      onlineServers: onlineServers.length,
      avgLatency:
        withLatency.length > 0
          ? Math.round(
              withLatency.reduce((sum, s) => sum + (s.latency || 0), 0) /
                withLatency.length,
            )
          : 0,
    };
  }, [recentScans]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-surface/50 border border-separator/50 p-8 sm:p-12 text-center">
        <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
          <Chip color="accent" variant="soft" size="sm" className="mb-2">
            v1.0.0 Beta
          </Chip>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Minecraft Server Scanner
          </h1>
          <p className="text-muted text-sm sm:text-base">
            Scan Java & Bedrock servers instantly. Check live status, online
            players, MOTD, latency, and more without opening the game.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card variant="secondary">
          <Card.Content>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Radar className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted font-medium mb-1">
                  Total Scans
                </p>
                <p className="text-2xl font-bold leading-none">
                  {!isHydrated ? (
                    <span className="text-muted/50">N/A</span>
                  ) : (
                    stats.totalScans.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
        <Card variant="secondary">
          <Card.Content>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/10">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted font-medium mb-1">
                  Online Servers
                </p>
                <p className="text-2xl font-bold leading-none text-success">
                  {!isHydrated ? (
                    <span className="text-muted/50">N/A</span>
                  ) : (
                    stats.onlineServers.toLocaleString()
                  )}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
        <Card variant="secondary">
          <Card.Content>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Zap className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted font-medium mb-1">
                  Average Ping
                </p>
                <p className="text-2xl font-bold leading-none">
                  {!isHydrated ? (
                    <span className="text-muted/50">N/A</span>
                  ) : (
                    <>
                      {stats.avgLatency.toLocaleString()}
                      <span className="text-sm text-muted font-normal ml-1">
                        ms
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Scanner</Card.Title>
          <Card.Description>
            Enter server address and port to scan
          </Card.Description>
        </Card.Header>
        <Card.Content className="space-y-4">
          <Tabs
            selectedKey={serverType}
            onSelectionChange={(key) =>
              setServerType(key as "java" | "bedrock")
            }
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Server Type">
                <Tabs.Tab id="java">
                  Java Edition
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="bedrock">
                  Bedrock Edition
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>

          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
            <TextField value={ip} onChange={setIp} variant="secondary">
              <Label>Server IP / Hostname</Label>
              <Input
                placeholder="e.g. mc.hypixel.net"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isScanning && isHydrated)
                    handleScan();
                }}
              />
            </TextField>

            <TextField
              value={portInput}
              onChange={setPortInput}
              variant="secondary"
            >
              <Label>Port(s)</Label>
              <Input
                placeholder={serverType === "java" ? "25565" : "19132"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isScanning && isHydrated)
                    handleScan();
                }}
              />
              <Description>Single, list, or range</Description>
            </TextField>
          </div>

          {/* Scan Button */}
          <Button
            fullWidth
            onPress={handleScan}
            isDisabled={!ip.trim() || isScanning || !isHydrated}
            isPending={isScanning}
          >
            {isScanning ? (
              <>
                <Spinner color="current" size="sm" />
                Scanning {scannedCount} of {totalPortsToScan}
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Scan Server
              </>
            )}
          </Button>
        </Card.Content>
      </Card>

      {isScanning && totalPortsToScan > 1 && (
        <Card>
          <Card.Header>
            <Card.Title>Scan Progress</Card.Title>
            <Card.Description>
              {scannedCount} of {totalPortsToScan} ports scanned (
              {settings.concurrency} concurrent threads)
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div className="w-full h-2 rounded-full bg-default overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-200"
                style={{
                  width: `${(scannedCount / totalPortsToScan) * 100}%`,
                }}
              />
            </div>

            <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
              {scanLog.map((entry, i) => (
                <div
                  key={`${entry.port}-${i}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-surface font-mono text-sm border border-separator/50"
                  style={{ animation: "fadeIn 0.2s ease-out" }}
                >
                  {entry.online ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-danger shrink-0" />
                  )}
                  <span className="text-muted">Port</span>
                  <span className="font-semibold text-foreground">
                    {entry.port}
                  </span>
                  <span
                    className={
                      entry.online
                        ? "text-success ml-auto"
                        : "text-danger ml-auto"
                    }
                  >
                    {entry.online ? "Open" : "Closed"}
                  </span>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {(!isHydrated || isScanning) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h2 className="text-lg font-semibold animate-pulse text-muted">
              {isScanning ? "Scanning Server..." : "Loading Data..."}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({
              length: isScanning ? Math.min(totalPortsToScan, 4) : 2,
            }).map((_, i) => (
              <ServerCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {isHydrated && (
        <>
          {!isScanning &&
            scanResults.length > 0 &&
            (() => {
              const CURRENT_SCAN_PAGE_SIZE = 12;
              const currentScanTotalPages = Math.max(
                1,
                Math.ceil(onlineResults.length / CURRENT_SCAN_PAGE_SIZE),
              );
              const currentScanPages = Array.from(
                { length: currentScanTotalPages },
                (_, i) => i + 1,
              );
              const paginatedCurrentScans = onlineResults.slice(
                (currentScanPage - 1) * CURRENT_SCAN_PAGE_SIZE,
                currentScanPage * CURRENT_SCAN_PAGE_SIZE,
              );
              const cStart = (currentScanPage - 1) * CURRENT_SCAN_PAGE_SIZE + 1;
              const cEnd = Math.min(
                currentScanPage * CURRENT_SCAN_PAGE_SIZE,
                onlineResults.length,
              );

              return (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center justify-between sm:justify-start w-full gap-4">
                        <h2 className="text-lg font-semibold border-b-2 border-accent pb-1">
                          Current Scan Results
                        </h2>
                        <Chip color="accent" variant="soft" size="sm">
                          {onlineResults.length} online / {scanResults.length}{" "}
                          scanned
                        </Chip>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto mt-2 sm:mt-0">
                        <SearchField
                          className="w-full sm:w-64"
                          value={currentScanSearchQuery}
                          onChange={(val) => {
                            setCurrentScanSearchQuery(val);
                            setCurrentScanPage(1);
                          }}
                          aria-label="Search current results"
                        >
                          <SearchField.Group>
                            <SearchField.SearchIcon>
                              <Search className="w-4 h-4" />
                            </SearchField.SearchIcon>
                            <SearchField.Input placeholder="Search IP, motd..." />
                            <SearchField.ClearButton />
                          </SearchField.Group>
                        </SearchField>

                        <Select
                          className="w-full sm:w-48"
                          aria-label="Sort by"
                          selectedKey={currentScanSortOrder}
                          onSelectionChange={(key) =>
                            setCurrentScanSortOrder(key || "newest")
                          }
                        >
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id="newest" textValue="Newest">
                                Newest
                              </ListBox.Item>
                              <ListBox.Item id="oldest" textValue="Oldest">
                                Oldest
                              </ListBox.Item>
                              <ListBox.Item
                                id="players-desc"
                                textValue="Most Players"
                              >
                                Most Players
                              </ListBox.Item>
                              <ListBox.Item
                                id="players-asc"
                                textValue="Least Players"
                              >
                                Least Players
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    </div>

                    {onlineResults.length === 0 && currentScanSearchQuery ? (
                      <Card variant="secondary">
                        <Card.Content className="text-center py-8">
                          <Search className="w-8 h-8 text-muted mx-auto mb-2 opacity-30" />
                          <p className="text-muted text-sm">
                            No results matching "{currentScanSearchQuery}"
                          </p>
                        </Card.Content>
                      </Card>
                    ) : onlineResults.length === 0 ? (
                      <Card variant="secondary">
                        <Card.Content className="text-center py-8">
                          <p className="text-muted text-sm">
                            No online servers found on the scanned ports.
                          </p>
                        </Card.Content>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {paginatedCurrentScans.map((server) => (
                          <ServerCard
                            key={`current-${server.ip}:${server.port}`}
                            server={server}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {currentScanTotalPages > 1 && (
                    <Pagination size="sm">
                      <Pagination.Summary>
                        {cStart} to {cEnd} of {onlineResults.length} servers
                      </Pagination.Summary>
                      <Pagination.Content>
                        <Pagination.Item>
                          <Pagination.Previous
                            isDisabled={currentScanPage === 1}
                            onPress={() =>
                              setCurrentScanPage((p) => Math.max(1, p - 1))
                            }
                          >
                            <Pagination.PreviousIcon />
                            Prev
                          </Pagination.Previous>
                        </Pagination.Item>
                        {currentScanPages.map((p) => (
                          <Pagination.Item key={p}>
                            <Pagination.Link
                              isActive={p === currentScanPage}
                              onPress={() => setCurrentScanPage(p)}
                            >
                              {p}
                            </Pagination.Link>
                          </Pagination.Item>
                        ))}
                        <Pagination.Item>
                          <Pagination.Next
                            isDisabled={
                              currentScanPage === currentScanTotalPages
                            }
                            onPress={() =>
                              setCurrentScanPage((p) =>
                                Math.min(currentScanTotalPages, p + 1),
                              )
                            }
                          >
                            Next
                            <Pagination.NextIcon />
                          </Pagination.Next>
                        </Pagination.Item>
                      </Pagination.Content>
                    </Pagination>
                  )}
                </div>
              );
            })()}

          {recentExcludingCurrent.length > 0 &&
            (() => {
              const HISTORY_PAGE_SIZE = 12;
              const totalHistoryPages = Math.max(
                1,
                Math.ceil(recentExcludingCurrent.length / HISTORY_PAGE_SIZE),
              );
              const historyPages = Array.from(
                { length: totalHistoryPages },
                (_, i) => i + 1,
              );
              const paginatedHistory = recentExcludingCurrent.slice(
                (historyPage - 1) * HISTORY_PAGE_SIZE,
                historyPage * HISTORY_PAGE_SIZE,
              );
              const hStart = (historyPage - 1) * HISTORY_PAGE_SIZE + 1;
              const hEnd = Math.min(
                historyPage * HISTORY_PAGE_SIZE,
                recentExcludingCurrent.length,
              );

              return (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-muted">
                          History
                        </h2>
                        <span className="text-xs text-muted">
                          {recentExcludingCurrent.length} previous online
                          servers
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
                        <SearchField
                          className="w-full sm:w-64"
                          value={searchQuery}
                          onChange={(val) => {
                            setSearchQuery(val);
                            setHistoryPage(1);
                          }}
                          aria-label="Search recent scans"
                        >
                          <SearchField.Group>
                            <SearchField.SearchIcon>
                              <Search className="w-4 h-4" />
                            </SearchField.SearchIcon>
                            <SearchField.Input placeholder="Search IP, motd..." />
                            <SearchField.ClearButton />
                          </SearchField.Group>
                        </SearchField>

                        <Select
                          className="w-full sm:w-48"
                          aria-label="Sort by"
                          selectedKey={sortOrder}
                          onSelectionChange={(key) =>
                            setSortOrder(key || "newest")
                          }
                        >
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id="newest" textValue="Newest">
                                Newest
                              </ListBox.Item>
                              <ListBox.Item id="oldest" textValue="Oldest">
                                Oldest
                              </ListBox.Item>
                              <ListBox.Item
                                id="players-desc"
                                textValue="Most Players"
                              >
                                Most Players
                              </ListBox.Item>
                              <ListBox.Item
                                id="players-asc"
                                textValue="Least Players"
                              >
                                Least Players
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    </div>

                    {recentExcludingCurrent.length === 0 && searchQuery ? (
                      <Card variant="secondary">
                        <Card.Content className="text-center py-8">
                          <Search className="w-8 h-8 text-muted mx-auto mb-2 opacity-30" />
                          <p className="text-muted text-sm">
                            No history matching "{searchQuery}"
                          </p>
                        </Card.Content>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-80">
                        {paginatedHistory.map((server) => (
                          <ServerCard
                            key={`recent-${server.ip}:${server.port}:${server.scannedAt}`}
                            server={server}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {totalHistoryPages > 1 && (
                    <Pagination size="sm">
                      <Pagination.Summary>
                        {hStart} to {hEnd} of {recentExcludingCurrent.length}{" "}
                        servers
                      </Pagination.Summary>
                      <Pagination.Content>
                        <Pagination.Item>
                          <Pagination.Previous
                            isDisabled={historyPage === 1}
                            onPress={() =>
                              setHistoryPage((p) => Math.max(1, p - 1))
                            }
                          >
                            <Pagination.PreviousIcon />
                            Prev
                          </Pagination.Previous>
                        </Pagination.Item>
                        {historyPages.map((p) => (
                          <Pagination.Item key={p}>
                            <Pagination.Link
                              isActive={p === historyPage}
                              onPress={() => setHistoryPage(p)}
                            >
                              {p}
                            </Pagination.Link>
                          </Pagination.Item>
                        ))}
                        <Pagination.Item>
                          <Pagination.Next
                            isDisabled={historyPage === totalHistoryPages}
                            onPress={() =>
                              setHistoryPage((p) =>
                                Math.min(totalHistoryPages, p + 1),
                              )
                            }
                          >
                            Next
                            <Pagination.NextIcon />
                          </Pagination.Next>
                        </Pagination.Item>
                      </Pagination.Content>
                    </Pagination>
                  )}
                </div>
              );
            })()}
        </>
      )}
    </div>
  );
}
