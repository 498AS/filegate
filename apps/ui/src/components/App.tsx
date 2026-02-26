import { useState } from "react";
import { LogOut, CloudUpload, FolderOpen } from "lucide-react";
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
    <div className="min-h-screen bg-background text-foreground">
      <AuthDialog />

      {isAuthed && (
        <>
          {/* Topbar — light, minimal */}
          <header className="bg-white/70 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <CloudUpload className="size-[18px] text-primary" />
                </div>
                <div>
                  <h1 className="text-base font-semibold tracking-tight leading-none">
                    Filegate
                  </h1>
                  <span className="text-[11px] text-muted-foreground leading-none">
                    Pujada d'arxius
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-3.5 mr-1.5" />
                Sortir
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="mx-auto max-w-5xl px-5 py-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
              {/* Left: Upload */}
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <CloudUpload className="size-4 text-primary" />
                  <h2 className="text-sm font-medium text-foreground/70">
                    Puja els teus arxius
                  </h2>
                </div>
                <UploadZone
                  onUploaded={() => setRefreshKey((k) => k + 1)}
                />
              </div>

              {/* Right: Sessions */}
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <FolderOpen className="size-4 text-primary" />
                  <h2 className="text-sm font-medium text-foreground/70">
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
