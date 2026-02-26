import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AuthDialog } from "./AuthDialog";
import { UploadZone } from "./UploadZone";
import { SessionList } from "./SessionList";
import { useAuth } from "@/hooks/use-auth";

export function App() {
  const { isAuthed, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <AuthDialog />

      {isAuthed && (
        <>
          {/* Topbar */}
          <header className="border-b">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-bold tracking-tight">filegate</h1>
                <span className="text-xs text-muted-foreground font-mono">
                  upload
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="size-4 mr-1.5" />
                Logout
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="mx-auto max-w-6xl px-4 py-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* Left: Upload */}
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-4">
                  Upload files
                </h2>
                <UploadZone
                  onUploaded={() => setRefreshKey((k) => k + 1)}
                />
              </div>

              {/* Right: Sessions */}
              <div>
                <SessionList refreshKey={refreshKey} />
              </div>
            </div>
          </main>
        </>
      )}

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
