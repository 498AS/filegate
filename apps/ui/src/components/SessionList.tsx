import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Download,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Cloud,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="size-5 animate-spin text-primary/40" />
        <p className="text-sm">Carregant…</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/70">
          <Cloud className="size-7" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground/60">
            Encara no hi ha pujades
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Selecciona arxius des de la barra superior
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          Les teves pujades
        </h2>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Session rows */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden divide-y divide-border/50">
        {sessions.map((session) => {
          const isOpen = expanded.has(session.id);
          const displayName = session.label || formatDate(session.created);

          return (
            <div key={session.id}>
              <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                <button
                  onClick={() => toggleExpand(session.id)}
                  className="text-muted-foreground/40 hover:text-foreground transition-colors shrink-0"
                >
                  {isOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>

                <FolderOpen className="size-5 text-amber-400 shrink-0" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {session.files.length} arxiu(s) ·{" "}
                    {formatDate(session.created)}
                  </p>
                </div>

                <StatusBadge status={session.status} />

                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground/40 hover:text-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(session.id);
                      toast.success("Copiat!");
                    }}
                    title="Copiar codi"
                  >
                    <Copy />
                  </Button>

                  {/* Delete with AlertDialog */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground/40 hover:text-destructive"
                        title="Eliminar"
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm" className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar pujada?</AlertDialogTitle>
                        <AlertDialogDescription>
                          S'eliminaran tots els arxius d'aquesta pujada. Aquesta
                          acció no es pot desfer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => handleDelete(session.id)}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {isOpen && session.files.length > 0 && (
                <div className="bg-muted/20 px-4 py-3 pl-14">
                  <div className="space-y-0.5">
                    {session.files.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/60 transition-colors group"
                      >
                        <FileIcon fileName={file.name} />
                        <span className="text-sm truncate flex-1">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatBytes(file.size)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            handleDownload(session.id, file.name)
                          }
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
    </div>
  );
}
