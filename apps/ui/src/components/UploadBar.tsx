import { useState, useRef, useCallback } from "react";
import {
  CloudUpload,
  LogOut,
  X,
  CheckCircle2,
  Copy,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileIcon } from "./FileIcon";
import { useClient } from "@/hooks/use-client";
import { useAuth } from "@/hooks/use-auth";
import { formatBytes } from "@/lib/format";
import { toast } from "sonner";
import type { Session } from "@filegate/sdk";

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "done"; session: Session };

interface Props {
  onUploaded: () => void;
}

const UPLOAD_URL = "https://upload.498as.com";

export function UploadBar({ onUploaded }: Props) {
  const client = useClient();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [label, setLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const [copied, setCopied] = useState(false);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const deduped = arr.filter((f) => !existing.has(`${f.name}:${f.size}`));
      return [...prev, ...deduped];
    });
    setState({ phase: "idle" });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function handleUpload() {
    if (!client || files.length === 0) return;
    setState({ phase: "uploading" });

    try {
      const session = await client.sessions.create(
        label.trim() ? { label: label.trim() } : undefined,
      );
      await client.files.upload(session.id, files);
      const updated = await client.sessions.get(session.id);
      setState({ phase: "done", session: updated });
      toast.success(`S'han pujat ${files.length} arxiu(s)`);
      onUploaded();
    } catch (err: any) {
      if (err?.status === 401) {
        toast.error("La clau ha caducat");
        logout();
        return;
      }
      toast.error(err?.message ?? "Error en pujar els arxius");
      setState({ phase: "idle" });
    }
  }

  function reset() {
    setFiles([]);
    setLabel("");
    setState({ phase: "idle" });
    setCopied(false);
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiat!");
    setTimeout(() => setCopied(false), 2000);
  }

  const hasFiles = files.length > 0;
  const isDone = state.phase === "done";
  const isUploading = state.phase === "uploading";

  return (
    <>
      {/* Top bar */}
      <header
        className={`sticky top-0 z-10 bg-white border-b transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
      >
        <div className="mx-auto max-w-4xl flex items-center gap-3 px-6 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0 mr-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-white">
              <CloudUpload className="size-3.5" />
            </div>
            <span className="font-semibold text-sm tracking-tight">
              Filegate
            </span>
          </div>

          {/* Label input */}
          <Input
            placeholder="Nom de la pujada (opcional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={isUploading || isDone}
            className="h-8 rounded-lg bg-muted/50 border-0 text-sm max-w-[200px]"
          />

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {isUploading ? (
            <Button size="sm" disabled className="rounded-lg shrink-0">
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              Pujant…
            </Button>
          ) : hasFiles ? (
            <Button
              size="sm"
              onClick={handleUpload}
              className="rounded-lg shrink-0 shadow-sm shadow-primary/20"
            >
              <CloudUpload className="size-3.5 mr-1.5" />
              Pujar {files.length}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg shrink-0"
            >
              <CloudUpload className="size-3.5 mr-1.5" />
              Seleccionar arxius
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

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

      {/* File tray — shown below topbar when files selected */}
      {hasFiles && !isDone && (
        <div className="bg-white border-b border-border/40">
          <div className="mx-auto max-w-4xl px-6 py-3">
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-2 bg-muted/40 rounded-lg pl-2.5 pr-1.5 py-1.5 text-xs group"
                >
                  <FileIcon fileName={file.name} className="size-3.5" />
                  <span className="truncate max-w-[140px]">{file.name}</span>
                  <span className="text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    className="size-4 flex items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50 transition-colors"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 px-2.5 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
              >
                + Afegir més
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success banner */}
      {isDone && state.phase === "done" && (
        <div className="bg-emerald-50 border-b border-emerald-200/60">
          <div className="mx-auto max-w-4xl px-6 py-3 flex items-center gap-4">
            <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800">
                Arxius pujats correctament!
              </p>
              <p className="text-xs text-emerald-600 font-mono mt-0.5">
                {state.session.id}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 rounded-lg border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              onClick={() =>
                handleCopy(`Codi: ${state.session.id}\n${UPLOAD_URL}`)
              }
            >
              {copied ? (
                <ClipboardCheck className="size-3.5 mr-1.5" />
              ) : (
                <Copy className="size-3.5 mr-1.5" />
              )}
              {copied ? "Copiat!" : "Copiar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-emerald-600"
              onClick={reset}
            >
              Nova pujada
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
