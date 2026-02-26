import { useState } from "react";
import { LogOut, CloudUpload } from "lucide-react";
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
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-60 shrink-0 bg-white border-r border-border/50 flex flex-col">
            {/* Logo */}
            <div className="px-5 py-5 flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
                <CloudUpload className="size-4" />
              </div>
              <span className="font-semibold text-[15px] tracking-tight">
                Filegate
              </span>
            </div>

            {/* Nav */}
            <nav className="px-3 flex-1">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/8 text-primary text-sm font-medium">
                <CloudUpload className="size-4" />
                Puja arxius
              </button>
            </nav>

            {/* Bottom */}
            <div className="px-3 pb-4">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted text-sm transition-colors"
              >
                <LogOut className="size-4" />
                Sortir
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 overflow-y-auto">
            {/* Top area — upload */}
            <div className="px-8 pt-8 pb-6">
              <h1 className="text-2xl font-semibold tracking-tight mb-6">
                Puja els teus arxius
              </h1>
              <UploadZone
                onUploaded={() => setRefreshKey((k) => k + 1)}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-border/50" />

            {/* Sessions */}
            <div className="px-8 py-6">
              <SessionList refreshKey={refreshKey} />
            </div>
          </main>
        </div>
      )}

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
