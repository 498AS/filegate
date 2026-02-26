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
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="size-5 animate-spin text-primary/50" />
        <p className="text-sm">Carregant…</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
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
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={fetchSessions}
          className="text-muted-foreground"
        >
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {sessions.map((session) => {
        const isOpen = expanded.has(session.id);
        const displayName = session.label || formatDate(session.created);

        return (
          <div
            key={session.id}
            className="rounded-xl bg-white border border-border/60 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(session.id)}
                      className="text-muted-foreground/50 hover:text-foreground transition-colors"
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                    <FolderOpen className="size-4 text-amber-400 shrink-0" />
                    <span className="font-medium text-sm truncate text-foreground/80">
                      {displayName}
                    </span>
                    <StatusBadge status={session.status} />
                  </div>
                  <div className="text-[11px] text-muted-foreground pl-6 flex items-center gap-1.5">
                    <span>{session.files.length} arxiu(s)</span>
                    <span className="text-border">·</span>
                    <span>{formatDate(session.created)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground/50 hover:text-foreground"
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
                    className="text-muted-foreground/50 hover:text-destructive"
                    onClick={() => handleDelete(session.id)}
                    title="Eliminar"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>

            {/* File list */}
            {isOpen && session.files.length > 0 && (
              <div className="border-t border-border/40 bg-slate-50/50 px-4 py-3">
                <div className="space-y-1.5">
                  {session.files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center gap-2.5 text-xs py-1.5 group"
                    >
                      <FileIcon fileName={file.name} />
                      <span className="truncate flex-1 text-foreground/70">
                        {file.name}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {formatBytes(file.size)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDownload(session.id, file.name)}
                        title="Descarregar"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                      >
                        <Download />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
