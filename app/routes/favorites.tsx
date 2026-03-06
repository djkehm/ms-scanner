import { useState, useMemo } from "react";
import { useStore, useHydrated } from "../store";
import { Card, Pagination } from "@heroui/react";
import ServerCard, { ServerCardSkeleton } from "../components/server-card";
import { Heart } from "lucide-react";

const PAGE_SIZE = 12;

export function meta() {
  return [
    { title: "Favorites — MS Scanner" },
    { name: "description", content: "Your saved favorite Minecraft servers." },
  ];
}

export default function Favorites() {
  const isHydrated = useHydrated();
  const { favorites } = useStore();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(favorites.length / PAGE_SIZE));
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const paginatedFavorites = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return favorites.slice(start, start + PAGE_SIZE);
  }, [favorites, page]);

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, favorites.length);

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Favorites</h1>
          <div className="h-5 w-32 bg-default rounded mt-1 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ServerCardSkeleton />
          <ServerCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Favorites</h1>
        <p className="text-sm text-muted">
          {favorites.length} saved server{favorites.length !== 1 ? "s" : ""}
        </p>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <Card.Content className="text-center py-12">
            <Heart className="w-10 h-10 text-muted mx-auto mb-3 opacity-30" />
            <p className="text-muted text-sm">
              No favorites yet. Scan servers and click the heart icon to save
              them.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paginatedFavorites.map((server) => (
              <ServerCard key={`${server.ip}:${server.port}`} server={server} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination size="sm">
              <Pagination.Summary>
                {start} to {end} of {favorites.length} servers
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
