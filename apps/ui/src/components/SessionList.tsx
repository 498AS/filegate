import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./StatusBadge";
import { useClient } from "@/hooks/use-client";
import { useAuth } from "@/hooks/use-auth";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import type { Session } from "@filegate/sdk";

const POLL_INTERVAL = 30_000;

interface Props {
  /** Incremented to trigger a refetch */
  refreshKey: number;
}

export function SessionList({ refreshKey }: Props) {
  const client = useClient();
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchSessions = useCallback(async () => {
    if (!client) return;
    try {
      const data = await client.sessions.list();
      setSessions(data);
    } catch (err: any) {
      if (err?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [client, logout]);

  // Initial load + polling
  useEffect(() => {
    fetchSessions();
    const id = setInterval(fetchSessions, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchSessions]);

  // Refetch on upload
  useEffect(() => {
    if (refreshKey > 0) fetchSessions();
  }, [refreshKey, fetchSessions]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!client) return;
    try {
      await client.sessions.remove(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success(`Deleted ${id}`);
    } catch (err: any) {
      if (err?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to delete session");
    }
  }

  async function handleDownload(sessionId: string, fileName: string) {
    if (!client) return;
    try {
      const buffer = await client.files.download(sessionId, fileName);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.status === 401) {
        logout();
        return;
      }
      toast.error("Download failed");
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Loading sessions…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No sessions yet. Upload some files!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {sessions.length} session(s)
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={fetchSessions}>
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {sessions.map((session) => {
        const isOpen = expanded.has(session.id);

        return (
          <Card key={session.id}>
            <CardHeader className="p-4 pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(session.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                    <CardTitle className="text-sm font-mono">
                      {session.id}
                    </CardTitle>
                    <StatusBadge status={session.status} />
                  </div>
                  {session.label && (
                    <p className="text-xs text-muted-foreground pl-6">
                      {session.label}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(session.id);
                      toast.success("Copied!");
                    }}
                  >
                    <Copy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(session.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground pl-6">
                {session.files.length} file(s) · {formatDate(session.created)}
              </div>
            </CardHeader>

            {isOpen && session.files.length > 0 && (
              <CardContent className="p-4 pt-2">
                <Separator className="mb-3" />
                <div className="space-y-1.5">
                  {session.files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center gap-2 text-xs"
                    >
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {formatBytes(file.size)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDownload(session.id, file.name)}
                      >
                        <Download />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
