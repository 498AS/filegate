import { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  CheckCircle2,
  Copy,
  ClipboardCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
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

  if (state.phase === "done") {
    const clipboardText = `Codi: ${state.session.id}\n${UPLOAD_URL}`;
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6 space-y-5">
          {/* Success header */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-500/15">
              <CheckCircle2 className="size-7 text-green-400" />
            </div>
            <p className="font-semibold text-lg">Arxius pujats correctament!</p>
            <p className="text-muted-foreground text-sm">
              {state.session.files.length} arxiu(s)
            </p>
          </div>

          {/* Copyable block */}
          <div className="rounded-lg bg-muted/70 border p-4 font-mono text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Codi:</span>
              <span className="font-semibold">{state.session.id}</span>
            </div>
            <div className="text-muted-foreground text-xs">{UPLOAD_URL}</div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              size="lg"
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
              variant="outline"
              className="w-full"
              onClick={reset}
            >
              <RotateCcw className="size-4 mr-2" />
              Pujar més arxius
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
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
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Upload className="size-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Arrossega els arxius aquí o{" "}
          <span className="text-primary underline">fes clic per seleccionar-los</span>
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-2.5 text-sm bg-muted/50 rounded-lg px-3 py-2.5 group"
            >
              <FileIcon fileName={file.name} />
              <span className="truncate flex-1">{file.name}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {formatBytes(file.size)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Label */}
      <div className="space-y-1.5">
        <Label htmlFor="label">Nom (opcional)</Label>
        <Input
          id="label"
          placeholder="ex: Factures gener"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={state.phase === "uploading"}
        />
      </div>

      {/* Upload progress / button */}
      {state.phase === "uploading" ? (
        <div className="space-y-2">
          <Progress value={state.progress} />
          <p className="text-xs text-muted-foreground text-center">
            Pujant arxius…
          </p>
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={files.length === 0}
          onClick={handleUpload}
        >
          <Upload className="size-4 mr-2" />
          {files.length > 0
            ? `Pujar ${files.length} arxiu(s)`
            : "Pujar"}
        </Button>
      )}
    </div>
  );
}
