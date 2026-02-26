import { useState, useRef, useCallback } from "react";
import {
  CloudUpload,
  X,
  Plus,
  CheckCircle2,
  Copy,
  ClipboardCheck,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileIcon } from "./FileIcon";
import { useClient } from "@/hooks/use-client";
import { useAuth } from "@/hooks/use-auth";
import { formatBytes } from "@/lib/format";
import { toast } from "sonner";
import type { Session } from "@filegate/sdk";

type Step = 1 | 2 | 3;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

const UPLOAD_URL = "https://upload.498as.com";

export function UploadDialog({ open, onOpenChange, onUploaded }: Props) {
  const client = useClient();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [label, setLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
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

  function reset() {
    setStep(1);
    setFiles([]);
    setLabel("");
    setUploading(false);
    setSession(null);
    setCopied(false);
  }

  function handleClose() {
    onOpenChange(false);
    // reset after animation
    setTimeout(reset, 200);
  }

  async function handleUpload() {
    if (!client || files.length === 0) return;
    setUploading(true);

    try {
      const s = await client.sessions.create(
        label.trim() ? { label: label.trim() } : undefined,
      );
      await client.files.upload(s.id, files);
      const updated = await client.sessions.get(s.id);
      setSession(updated);
      setStep(3);
      toast.success(`S'han pujat ${files.length} arxiu(s)`);
      onUploaded();
    } catch (err: any) {
      if (err?.status === 401) {
        toast.error("La clau ha caducat");
        logout();
        return;
      }
      toast.error(err?.message ?? "Error en pujar els arxius");
    } finally {
      setUploading(false);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiat!");
    setTimeout(() => setCopied(false), 2000);
  }

  const STEPS = ["Arxius", "Nom", "Llest"] as const;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent
        className="sm:max-w-lg rounded-2xl p-0 gap-0 overflow-hidden"
        onInteractOutside={(e) => {
          if (uploading) e.preventDefault();
        }}
      >
        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 pt-5 pb-2">
          {STEPS.map((s, i) => {
            const n = (i + 1) as Step;
            const active = step === n;
            const done = step > n;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div
                    className={`size-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      active
                        ? "bg-primary text-white"
                        : done
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : n}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-3 ${
                      done ? "bg-emerald-300" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Select files */}
        {step === 1 && (
          <div className="px-6 pb-6 pt-3 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base">
                Selecciona els arxius
              </DialogTitle>
              <DialogDescription>
                Arrossega'ls aquí o fes clic per seleccionar-los
              </DialogDescription>
            </DialogHeader>

            {/* Drop zone */}
            <div
              className={`rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              } ${files.length > 0 ? "p-4" : "py-12 px-4"}`}
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
              onClick={() => files.length === 0 && fileInputRef.current?.click()}
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
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/8">
                    <CloudUpload className="size-5 text-primary" />
                  </div>
                  <p className="text-sm text-foreground/70">
                    Arrossega els arxius aquí
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    o{" "}
                    <span className="text-primary font-medium">
                      fes clic per seleccionar
                    </span>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-3 bg-white rounded-lg border border-border/50 px-3 py-2.5 group"
                    >
                      <FileIcon fileName={file.name} className="size-5" />
                      <span className="text-sm truncate flex-1">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatBytes(file.size)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(i);
                        }}
                        className="size-5 flex items-center justify-center rounded-full text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors w-full"
                  >
                    <Plus className="size-3.5" />
                    Afegir més arxius
                  </button>
                </div>
              )}
            </div>

            {/* Next */}
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={files.length === 0}
                className="rounded-xl"
              >
                Següent
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Name + confirm upload */}
        {step === 2 && (
          <div className="px-6 pb-6 pt-3 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-base">
                Detalls de la pujada
              </DialogTitle>
              <DialogDescription>
                {files.length} arxiu(s) seleccionat(s)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nom (opcional)</label>
              <Input
                placeholder="ex: Factures gener"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={uploading}
                className="h-11 rounded-xl"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Posa un nom per identificar aquesta pujada fàcilment
              </p>
            </div>

            {/* Summary chips */}
            <div className="flex flex-wrap gap-1.5">
              {files.map((file, i) => (
                <span
                  key={`${file.name}-${i}`}
                  className="inline-flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1 text-[11px]"
                >
                  <FileIcon fileName={file.name} className="size-3" />
                  <span className="truncate max-w-[100px]">{file.name}</span>
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={uploading}
                className="rounded-xl"
              >
                <ArrowLeft className="size-4 mr-1.5" />
                Enrere
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="rounded-xl shadow-sm shadow-primary/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                    Pujant…
                  </>
                ) : (
                  <>
                    <CloudUpload className="size-4 mr-1.5" />
                    Pujar {files.length} arxiu(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Done — copy text */}
        {step === 3 && session && (
          <div className="px-6 pb-6 pt-3 space-y-5">
            <div className="text-center space-y-3 pt-2">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="size-7 text-emerald-500" />
              </div>
              <div>
                <DialogTitle className="text-base">
                  Pujada completada!
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {session.files.length} arxiu(s) pujat(s) correctament
                </DialogDescription>
              </div>
            </div>

            {/* Copyable block */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Enganxa això al correu:
              </p>
              <div className="bg-white rounded-lg border p-3 text-sm font-mono leading-relaxed select-all">
                Codi: {session.id}
                <br />
                {UPLOAD_URL}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button
                className="w-full h-11 rounded-xl shadow-sm shadow-primary/20"
                onClick={() =>
                  handleCopy(`Codi: ${session.id}\n${UPLOAD_URL}`)
                }
              >
                {copied ? (
                  <ClipboardCheck className="size-4 mr-2" />
                ) : (
                  <Copy className="size-4 mr-2" />
                )}
                {copied ? "Copiat!" : "Copiar al porta-retalls"}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  reset();
                }}
              >
                <Plus className="size-4 mr-2" />
                Nova pujada
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleClose}
              >
                Tancar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
