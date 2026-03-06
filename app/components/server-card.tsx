import { useStore, type ServerResult } from "../store";
import { Heart, Wifi, WifiOff } from "lucide-react";
import { Card, Chip, Button, Skeleton } from "@heroui/react";
import { useNavigate } from "react-router";

interface ServerCardProps {
  server: ServerResult;
}

function stripMinecraftCodes(text: string): string {
  return text.replace(/§[0-9a-fk-or]/gi, "");
}

export default function ServerCard({ server }: ServerCardProps) {
  const navigate = useNavigate();
  const isFavorite = useStore(
    (state) => !!state.favoritesKeys[`${server.ip}:${server.port}`],
  );
  const addFavorite = useStore((state) => state.addFavorite);
  const removeFavorite = useStore((state) => state.removeFavorite);

  const fav = isFavorite;

  const handleCardClick = () => {
    navigate(`?server=${server.ip}:${server.port}`);
  };

  const cleanMotd = server.motd ? stripMinecraftCodes(server.motd) : "No MOTD";

  return (
    <Card className="cursor-pointer">
      <div onClick={handleCardClick} className="space-y-3">
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
              <span className="text-muted font-normal">:{server.port}</span>
            </Card.Title>
            <Card.Description className="line-clamp-2">
              {cleanMotd}
            </Card.Description>
          </div>

          <Button
            isIconOnly
            variant={fav ? "danger" : "secondary"}
            size="sm"
            onPress={() => {
              if (fav) removeFavorite(server.ip, server.port);
              else addFavorite(server);
            }}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className="w-4 h-4" fill={fav ? "currentColor" : "none"} />
          </Button>
        </Card.Header>

        <Card.Content>
          <div className="flex items-center gap-2 flex-wrap">
            {server.online ? (
              <Chip size="sm" color="success" variant="soft">
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </Chip>
            ) : (
              <Chip size="sm" color="danger" variant="soft">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
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
          <div className="flex items-center justify-between w-full">
            {server.playersOnline !== undefined && (
              <span className="text-sm text-muted">
                <span className="font-semibold text-foreground">
                  {server.playersOnline}
                </span>
                /{server.playersMax} players
              </span>
            )}
            {server.latency !== undefined && server.latency > 0 && (
              <span className="text-xs text-muted ml-auto">
                {server.latency.toLocaleString()}ms
              </span>
            )}
          </div>
        </Card.Footer>
      </div>
    </Card>
  );
}

export function ServerCardSkeleton() {
  return (
    <Card>
      <div className="space-y-3">
        <Card.Header className="flex-row items-center gap-3">
          <Skeleton className="shrink-0 w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <Skeleton className="w-8 h-8 rounded-lg" />
        </Card.Header>
        <Card.Content>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </Card.Content>
        <Card.Footer>
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-12 rounded ml-auto" />
        </Card.Footer>
      </div>
    </Card>
  );
}
