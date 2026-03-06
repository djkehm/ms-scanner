import { NavLink, Outlet, useSearchParams } from "react-router";
import { Button } from "@heroui/react";
import { Home, Heart, Settings, Menu, X, History, Github } from "lucide-react";
import { useState } from "react";
import ServerModal from "../components/server-modal";
import Logo from "../components/logo";

const navItems = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const serverAddress = searchParams.get("server");

  const handleCloseModal = () => {
    searchParams.delete("server");
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-separator bg-surface">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            <NavLink to="/" className="flex items-center gap-2">
              <Logo size={28} />
              <span className="text-base font-bold tracking-tight">
                MC Server Scanner
              </span>
            </NavLink>

            <div className="flex items-center gap-2">
              {/* Desktop nav */}
              <div className="hidden sm:flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted hover:text-foreground hover:bg-default"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
              </div>

              {/* GitHub Button */}
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onPress={() =>
                  window.open("https://github.com/ItsAzni/ms-scanner", "_blank")
                }
                aria-label="GitHub Repository"
                className="text-muted hover:text-foreground"
              >
                <Github className="w-5 h-5" />
              </Button>

              {/* Mobile hamburger */}
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onPress={() => setMobileOpen(!mobileOpen)}
                className="sm:hidden"
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile nav */}
          {mobileOpen && (
            <div className="sm:hidden pb-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted hover:text-foreground hover:bg-default"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Server Detail Modal — overlays on current page */}
      {serverAddress && (
        <ServerModal address={serverAddress} onClose={handleCloseModal} />
      )}
    </div>
  );
}
