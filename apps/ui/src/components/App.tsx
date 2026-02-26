import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthDialog } from "./AuthDialog";
import { UploadBar } from "./UploadBar";
import { SessionList } from "./SessionList";
import { useAuth } from "@/hooks/use-auth";

export function App() {
  const { isAuthed } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AuthDialog />

      {isAuthed && (
        <>
          <UploadBar onUploaded={() => setRefreshKey((k) => k + 1)} />

          <main className="mx-auto max-w-4xl px-6 py-6">
            <SessionList refreshKey={refreshKey} />
          </main>
        </>
      )}

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
