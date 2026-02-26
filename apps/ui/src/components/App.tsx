import { useState } from "react";
import { LogOut, CloudUpload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { AuthDialog } from "./AuthDialog";
import { UploadDialog } from "./UploadDialog";
import { SessionList } from "./SessionList";
import { useAuth } from "@/hooks/use-auth";

export function App() {
  const { isAuthed, logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AuthDialog />

      {isAuthed && (
        <>
          {/* Topbar */}
          <header className="sticky top-0 z-10 bg-white border-b border-border/50">
            <div className="mx-auto max-w-4xl flex items-center gap-3 px-6 h-14">
              {/* Logo */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-white">
                  <CloudUpload className="size-3.5" />
                </div>
                <span className="font-semibold text-sm tracking-tight">
                  Filegate
                </span>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Upload button */}
              <Button
                size="sm"
                onClick={() => setUploadOpen(true)}
                className="rounded-lg shadow-sm shadow-primary/20"
              >
                <Plus className="size-3.5 mr-1.5" />
                Nova pujada
              </Button>

              {/* Sortir */}
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <LogOut className="size-3.5 mr-1.5" />
                Sortir
              </Button>
            </div>
          </header>

          {/* Upload dialog */}
          <UploadDialog
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            onUploaded={() => setRefreshKey((k) => k + 1)}
          />

          {/* Content */}
          <main className="mx-auto max-w-4xl px-6 py-6">
            <SessionList refreshKey={refreshKey} />
          </main>
        </>
      )}

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
