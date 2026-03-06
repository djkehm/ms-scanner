import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("favorites", "routes/favorites.tsx"),
    route("history", "routes/history.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
  route("api/scan", "routes/api.scan.ts"),
  route("api/og", "routes/api.og.tsx"),
] satisfies RouteConfig;
