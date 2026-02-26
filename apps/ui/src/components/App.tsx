import { useState } from "react";
import { LogOut, Upload, FolderOpen } from "lucide-react";
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
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Upload className="size-4 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight leading-none">
                    Filegate
                  </h1>
                  <span className="text-[11px] text-muted-foreground">
                    Pujada d'arxius
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="size-4 mr-1.5" />
                Sortir
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="mx-auto max-w-6xl px-4 py-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              {/* Left: Upload */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Upload className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Puja els teus arxius
                  </h2>
                </div>
                <UploadZone
                  onUploaded={() => setRefreshKey((k) => k + 1)}
                />
              </div>

              {/* Right: Sessions */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FolderOpen className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Les teves pujades
                  </h2>
                </div>
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
