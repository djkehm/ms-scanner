import { useStore, type ServerResult } from "../store";
import { Modal, Button, Chip, Card } from "@heroui/react";
import {
  Users,
  Wifi,
  Clock,
  Gamepad2,
  Server,
  Heart,
  Copy,
  Check,
  Globe,
} from "lucide-react";
import { useState } from "react";

function stripMinecraftCodes(text: string): string {
  return text.replace(/§[0-9a-fk-or]/gi, "");
}

interface ServerModalProps {
  address: string;
  onClose: () => void;
}

export default function ServerModal({ address, onClose }: ServerModalProps) {
  const recentScans = useStore((state) => state.recentScans);
  const favorites = useStore((state) => state.favorites);
  const addFavorite = useStore((state) => state.addFavorite);
  const removeFavorite = useStore((state) => state.removeFavorite);

  const [copied, setCopied] = useState(false);

  const [ip, portStr] = address.split(":");
  const port = parseInt(portStr, 10);

  const server: ServerResult | undefined = [...recentScans, ...favorites].find(
    (s) => s.ip === ip && s.port === port,
  );

  const fav = favorites.some((f) => f.ip === ip && f.port === port);

  const handleFavorite = () => {
    if (fav && server) {
      removeFavorite(ip, port);
    } else if (server) {
      addFavorite(server);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${ip}:${port}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanMotd = server?.motd
    ? stripMinecraftCodes(server.motd)
    : "No MOTD available";

  return (
    <Modal.Backdrop
      isOpen={true}
      onOpenChange={(open) => !open && onClose()}
      variant="blur"
    >
      <Modal.Container size="lg" placement="center">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <div className="flex items-center gap-3 w-full">
              <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-default flex items-center justify-center">
                {server?.favicon ? (
                  <img
                    src={server.favicon}
                    alt="Server icon"
                    className="w-full h-full object-cover"
                    style={{ imageRendering: "pixelated" }}
                  />
                ) : (
                  <Server className="w-5 h-5 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Modal.Heading className="text-base">
                  {ip}:{port}
                </Modal.Heading>
                <p className="text-xs text-muted mt-0.5">
                  {server?.version || "Unknown version"}
                </p>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {!server ? (
              <div className="text-center py-8">
                <p className="text-muted">
                  No data found for this server. Try scanning it first.
                </p>
                <Button variant="secondary" className="mt-4" onPress={onClose}>
                  Go to Scanner
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <Chip
                    color={server.online ? "success" : "danger"}
                    variant="soft"
                  >
                    {server.online ? "Online" : "Offline"}
                  </Chip>
                  <Chip color="accent" variant="soft">
                    {server.type.toUpperCase()}
                  </Chip>
                  {server.latency !== undefined && server.latency > 0 && (
                    <Chip variant="secondary">
                      {server.latency.toLocaleString()}ms
                    </Chip>
                  )}
                </div>

                <Card variant="secondary">
                  <Card.Header>
                    <Card.Title className="text-xs uppercase tracking-wider text-muted">
                      MOTD
                    </Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <p className="text-sm whitespace-pre-wrap">{cleanMotd}</p>
                  </Card.Content>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  {server.playersOnline !== undefined && (
                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-default/50">
                      <Users className="w-4 h-4 text-accent shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wider leading-none">
                          Players
                        </p>
                        <p className="text-sm font-semibold mt-0.5">
                          {server.playersOnline}/{server.playersMax}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-default/50">
                    <Globe className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider leading-none">
                        Version
                      </p>
                      <p className="text-sm font-semibold mt-0.5 truncate">
                        {server.version || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {server.protocol !== undefined && (
                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-default/50">
                      <Wifi className="w-4 h-4 text-accent shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wider leading-none">
                          Protocol
                        </p>
                        <p className="text-sm font-semibold mt-0.5">
                          {server.protocol}
                        </p>
                      </div>
                    </div>
                  )}

                  {server.gameMode && (
                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-default/50">
                      <Gamepad2 className="w-4 h-4 text-accent shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted uppercase tracking-wider leading-none">
                          Game Mode
                        </p>
                        <p className="text-sm font-semibold mt-0.5">
                          {server.gameMode}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-default/50">
                    <Clock className="w-4 h-4 text-accent shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider leading-none">
                        Scanned
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        {new Date(server.scannedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>

                {server.playerList && server.playerList.length > 0 && (
                  <Card variant="secondary">
                    <Card.Header>
                      <Card.Title className="text-xs uppercase tracking-wider text-muted">
                        Online Players
                      </Card.Title>
                    </Card.Header>
                    <Card.Content>
                      <div className="flex flex-wrap gap-1.5">
                        {server.playerList.map((name) => (
                          <Chip key={name} size="sm" variant="secondary">
                            {name}
                          </Chip>
                        ))}
                      </div>
                    </Card.Content>
                  </Card>
                )}
              </>
            )}
          </Modal.Body>

          {server && (
            <Modal.Footer className="gap-2">
              <Button variant="secondary" onPress={handleCopy} size="sm">
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy Address"}
              </Button>
              <Button
                variant={fav ? "danger" : "secondary"}
                onPress={handleFavorite}
                size="sm"
              >
                <Heart
                  className="w-4 h-4"
                  fill={fav ? "currentColor" : "none"}
                />
                {fav ? "Remove" : "Favorite"}
              </Button>
              <Button slot="close" size="sm">
                Close
              </Button>
            </Modal.Footer>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
