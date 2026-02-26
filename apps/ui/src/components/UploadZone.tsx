import { useState, useRef, useCallback } from "react";
import {
  CloudUpload,
  X,
  CheckCircle2,
  Copy,
  ClipboardCheck,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileIcon } from "./FileIcon";
import { useClient } from "@/hooks/use-client";
import { useAuth } from "@/hooks/use-auth";
import { formatBytes } from "@/lib/format";
import { toast } from "sonner";
import type { Session } from "@filegate/sdk";

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; progress: number }
  | { phase: "done"; session: Session };

interface Props {
  onUploaded: () => void;
}

const UPLOAD_URL = "https://upload.498as.com";

export function UploadZone({ onUploaded }: Props) {
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
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function handleUpload() {
    if (!client || files.length === 0) return;
    setState({ phase: "uploading", progress: 0 });

    try {
      const session = await client.sessions.create(
        label.trim() ? { label: label.trim() } : undefined,
      );
      setState({ phase: "uploading", progress: 30 });

      await client.files.upload(session.id, files);
      setState({ phase: "uploading", progress: 90 });

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

  /* ── Success ── */
  if (state.phase === "done") {
    const clipboardText = `Codi: ${state.session.id}\n${UPLOAD_URL}`;
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="size-8 text-emerald-500" />
        </div>

        <div>
          <p className="text-lg font-semibold">Arxius pujats correctament!</p>
          <p className="text-sm text-muted-foreground mt-1">
            {state.session.files.length} arxiu(s) pujat(s)
          </p>
        </div>

        {/* Copyable card */}
        <div className="bg-white rounded-xl border p-4 text-left space-y-1 shadow-sm">
          <p className="text-xs text-muted-foreground">Codi de pujada</p>
          <p className="font-mono text-sm font-semibold">{state.session.id}</p>
          <p className="text-xs text-muted-foreground">{UPLOAD_URL}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button
            className="w-full h-11 rounded-xl shadow-sm shadow-primary/20"
            onClick={() => handleCopy(clipboardText)}
          >
            {copied ? (
              <ClipboardCheck className="size-4 mr-2" />
            ) : (
              <Copy className="size-4 mr-2" />
            )}
            {copied ? "Copiat!" : "Copiar codi i URL"}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={reset}
          >
            <Plus className="size-4 mr-2" />
            Pujar més arxius
          </Button>
        </div>
      </div>
    );
  }

  /* ── Upload form ── */
  return (
    <div className="space-y-5">
      {/* Drop zone — Drive-style large area */}
      <div
        className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.005]"
            : "border-border hover:border-primary/30 hover:bg-white/60"
        } ${files.length > 0 ? "p-6" : "py-16 px-6"}`}
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
        onClick={() => fileInputRef.current?.click()}
      >
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

        {files.length === 0 ? (
          /* Empty state */
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/8">
              <CloudUpload className="size-7 text-primary" />
            </div>
            <p className="text-[15px] font-medium text-foreground/80">
              Arrossega els arxius aquí
            </p>
            <p className="text-sm text-muted-foreground mt-1.5">
              o{" "}
              <span className="text-primary font-medium">
                fes clic per seleccionar-los
              </span>
            </p>
          </div>
        ) : (
          /* File grid — Drive-style cards */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative bg-white rounded-xl border border-border/60 p-3 shadow-sm group"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Remove */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="absolute top-2 right-2 size-5 flex items-center justify-center rounded-full bg-foreground/5 text-muted-foreground hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="size-3" />
                </button>

                {/* Icon */}
                <div className="flex items-center justify-center py-4">
                  <FileIcon fileName={file.name} className="size-10" />
                </div>

                {/* Info */}
                <div className="pt-2 border-t border-border/40">
                  <p className="text-xs font-medium truncate text-foreground/80">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
            ))}

            {/* Add more */}
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border/60 hover:border-primary/30 transition-colors min-h-[120px]">
              <div className="text-center">
                <Plus className="size-5 text-muted-foreground/50 mx-auto" />
                <p className="text-[10px] text-muted-foreground mt-1">Afegir</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Label + upload row */}
      {files.length > 0 && (
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Nom (opcional)
            </label>
            <Input
              placeholder="ex: Factures gener"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={state.phase === "uploading"}
              className="h-11 rounded-xl bg-white"
            />
          </div>

          {state.phase === "uploading" ? (
            <div className="flex-1 space-y-2 pb-1">
              <Progress value={state.progress} className="h-2 rounded-full" />
              <p className="text-xs text-muted-foreground text-center">
                Pujant…
              </p>
            </div>
          ) : (
            <Button
              className="h-11 rounded-xl px-6 shadow-sm shadow-primary/20"
              disabled={files.length === 0}
              onClick={handleUpload}
            >
              <CloudUpload className="size-4 mr-2" />
              Pujar {files.length} arxiu(s)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
