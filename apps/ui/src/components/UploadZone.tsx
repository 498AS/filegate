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
import { Label } from "@/components/ui/label";
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

  /* ── Success card ── */
  if (state.phase === "done") {
    const clipboardText = `Codi: ${state.session.id}\n${UPLOAD_URL}`;
    return (
      <div className="rounded-2xl bg-white border border-emerald-200/60 shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-7 text-emerald-500" />
          </div>
          <p className="font-semibold text-lg text-foreground">
            Arxius pujats correctament!
          </p>
          <p className="text-muted-foreground text-sm">
            {state.session.files.length} arxiu(s)
          </p>
        </div>

        {/* Copyable block */}
        <div className="rounded-xl bg-slate-50 border border-border/60 p-4 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Codi:</span>
            <span className="font-semibold text-foreground">
              {state.session.id}
            </span>
          </div>
          <div className="text-muted-foreground text-xs">{UPLOAD_URL}</div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Button
            className="w-full h-11 rounded-xl"
            onClick={() => handleCopy(clipboardText)}
          >
            {copied ? (
              <ClipboardCheck className="size-4 mr-2" />
            ) : (
              <Copy className="size-4 mr-2" />
            )}
            {copied ? "Copiat!" : "Copiar"}
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
      {/* Drop zone */}
      <div
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/40 hover:bg-primary/[0.02]"
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
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
          <CloudUpload className="size-6 text-primary" />
        </div>
        <p className="text-sm text-foreground/70">
          Arrossega els arxius aquí
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          o{" "}
          <span className="text-primary font-medium">
            fes clic per seleccionar-los
          </span>
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 text-sm bg-white rounded-xl border border-border/60 px-3.5 py-3 group shadow-sm"
            >
              <FileIcon fileName={file.name} className="size-5" />
              <span className="truncate flex-1 text-foreground/80">
                {file.name}
              </span>
              <span className="text-muted-foreground text-xs shrink-0">
                {formatBytes(file.size)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="text-muted-foreground/40 hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Label */}
      <div className="space-y-1.5">
        <Label htmlFor="label" className="text-xs text-muted-foreground">
          Nom (opcional)
        </Label>
        <Input
          id="label"
          placeholder="ex: Factures gener"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={state.phase === "uploading"}
          className="h-10 rounded-xl"
        />
      </div>

      {/* Upload progress / button */}
      {state.phase === "uploading" ? (
        <div className="space-y-3 py-2">
          <Progress value={state.progress} className="h-2 rounded-full" />
          <p className="text-xs text-muted-foreground text-center">
            Pujant arxius…
          </p>
        </div>
      ) : (
        <Button
          className="w-full h-11 rounded-xl"
          disabled={files.length === 0}
          onClick={handleUpload}
        >
          <CloudUpload className="size-4 mr-2" />
          {files.length > 0
            ? `Pujar ${files.length} arxiu(s)`
            : "Pujar"}
        </Button>
      )}
    </div>
  );
}
