import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Inbox,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./StatusBadge";
import { FileIcon } from "./FileIcon";
import { useClient } from "@/hooks/use-client";
import { useAuth } from "@/hooks/use-auth";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import type { Session } from "@filegate/sdk";

const POLL_INTERVAL = 30_000;

interface Props {
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
      toast.error("Error en carregar les pujades");
    } finally {
      setLoading(false);
    }
  }, [client, logout]);

  useEffect(() => {
    fetchSessions();
    const id = setInterval(fetchSessions, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchSessions]);

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
    if (!window.confirm("Segur que vols eliminar aquesta pujada?")) return;
    try {
      await client.sessions.remove(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Eliminat");
    } catch (err: any) {
      if (err?.status === 401) {
        logout();
        return;
      }
      toast.error("Error en eliminar");
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
      toast.error("Error en descarregar");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">Carregant pujades…</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Inbox className="size-6" />
        </div>
        <p className="text-sm">Encara no hi ha pujades</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {sessions.length} pujada(es)
        </span>
        <Button variant="ghost" size="icon-sm" onClick={fetchSessions}>
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {sessions.map((session) => {
        const isOpen = expanded.has(session.id);
        const displayName = session.label || formatDate(session.created);

        return (
          <Card key={session.id} className="overflow-hidden">
            <CardHeader className="p-4 pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1.5">
                  {/* Expand + title row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(session.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                    <FolderOpen className="size-4 text-yellow-400 shrink-0" />
                    <span className="font-medium text-sm truncate">
                      {displayName}
                    </span>
                    <StatusBadge status={session.status} />
                  </div>
                  {/* Meta info */}
                  <div className="text-xs text-muted-foreground pl-6 flex items-center gap-1.5">
                    <span>{session.files.length} arxiu(s)</span>
                    <span>·</span>
                    <span>{formatDate(session.created)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(session.id);
                      toast.success("Copiat!");
                    }}
                    title="Copiar codi"
                  >
                    <Copy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(session.id)}
                    title="Eliminar"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isOpen && session.files.length > 0 && (
              <CardContent className="p-4 pt-2">
                <Separator className="mb-3" />
                <div className="space-y-1.5">
                  {session.files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center gap-2.5 text-xs bg-muted/40 rounded-md px-3 py-2 group"
                    >
                      <FileIcon fileName={file.name} />
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-muted-foreground shrink-0">
                        {formatBytes(file.size)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDownload(session.id, file.name)}
                        title="Descarregar"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
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
