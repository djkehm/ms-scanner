import { useState, useMemo } from "react";
import { useStore, useHydrated } from "../store";
import { Card, Pagination, SearchField, Select, ListBox } from "@heroui/react";
import ServerCard, { ServerCardSkeleton } from "../components/server-card";
import { Heart, Search } from "lucide-react";
import type { Key } from "react-aria-components";

const PAGE_SIZE = 12;

type SortOption = "newest" | "oldest" | "players-desc" | "players-asc";

function stripMinecraftCodes(text: string): string {
  return text.replace(/§[0-9a-fk-or]/gi, "");
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<Key>("newest");

  const filteredFavorites = useMemo(() => {
    let filtered = [...favorites];

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
  }, [favorites, searchQuery, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFavorites.length / PAGE_SIZE),
  );
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const paginatedFavorites = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredFavorites.slice(start, start + PAGE_SIZE);
  }, [filteredFavorites, page]);

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, filteredFavorites.length);

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

      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <SearchField
          className="w-full sm:w-80"
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            setPage(1);
          }}
          aria-label="Search favorites"
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
          className="w-full sm:w-48 ml-auto"
          aria-label="Sort by"
          selectedKey={sortOrder}
          onSelectionChange={(key) => setSortOrder(key || "newest")}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="newest" textValue="Newest">
                Newest Added
              </ListBox.Item>
              <ListBox.Item id="oldest" textValue="Oldest">
                Oldest Added
              </ListBox.Item>
              <ListBox.Item id="players-desc" textValue="Most Players">
                Most Players
              </ListBox.Item>
              <ListBox.Item id="players-asc" textValue="Least Players">
                Least Players
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {filteredFavorites.length === 0 && !searchQuery ? (
        <Card>
          <Card.Content className="text-center py-12">
            <Heart className="w-10 h-10 text-muted mx-auto mb-3 opacity-30" />
            <p className="text-muted text-sm">
              No favorites yet. Scan servers and click the heart icon to save
              them.
            </p>
          </Card.Content>
        </Card>
      ) : filteredFavorites.length === 0 && searchQuery ? (
        <Card>
          <Card.Content className="text-center py-12">
            <Search className="w-10 h-10 text-muted mx-auto mb-3 opacity-30" />
            <p className="text-muted text-sm">
              No favorites found matching "{searchQuery}"
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
