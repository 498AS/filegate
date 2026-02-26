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
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const stepTransition = {
  x: { type: "spring", stiffness: 400, damping: 35 },
  opacity: { duration: 0.15 },
};

export function UploadDialog({ open, onOpenChange, onUploaded }: Props) {
  const client = useClient();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [label, setLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  function goTo(next: Step) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function reset() {
    setStep(1);
    setDirection(0);
    setFiles([]);
    setLabel("");
    setUploading(false);
    setUploadProgress(0);
    setSession(null);
    setCopied(false);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 200);
  }

  async function handleUpload() {
    if (!client || files.length === 0) return;
    setUploading(true);
    setUploadProgress(10);

    try {
      const s = await client.sessions.create(
        label.trim() ? { label: label.trim() } : undefined,
      );
      setUploadProgress(30);

      await client.files.upload(s.id, files);
      setUploadProgress(90);

      const updated = await client.sessions.get(s.id);
      setUploadProgress(100);
      setSession(updated);
      goTo(3);
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
    <Dialog
      open={open}
      onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}
    >
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 overflow-hidden"
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
                  <motion.div
                    className={`size-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                    }`}
                    animate={{
                      scale: active ? 1.1 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {done ? (
                      <motion.span
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 15,
                        }}
                      >
                        ✓
                      </motion.span>
                    ) : (
                      n
                    )}
                  </motion.div>
                  <span
                    className={`text-xs font-medium ${
                      active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-3 bg-border overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-400"
                      initial={{ width: "0%" }}
                      animate={{ width: done ? "100%" : "0%" }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Animated steps */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 1: Select files */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="px-6 pb-6 pt-4 space-y-4"
              >
                <DialogHeader>
                  <DialogTitle className="text-base">
                    Selecciona els arxius
                  </DialogTitle>
                  <DialogDescription>
                    Arrossega'ls aquí o fes clic per seleccionar-los
                  </DialogDescription>
                </DialogHeader>

                {/* Drop zone */}
                <Card
                  className={`border-2 border-dashed transition-all cursor-pointer ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                  onClick={() =>
                    files.length === 0 && fileInputRef.current?.click()
                  }
                  onDragOver={(e: React.DragEvent) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e: React.DragEvent) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files.length)
                      addFiles(e.dataTransfer.files);
                  }}
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

                  <CardContent
                    className={files.length > 0 ? "p-4" : "py-10 px-4"}
                  >
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
                        <AnimatePresence>
                          {files.map((file, i) => (
                            <motion.div
                              key={`${file.name}-${file.size}`}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2.5 group"
                            >
                              <FileIcon
                                fileName={file.name}
                                className="size-5"
                              />
                              <span className="text-sm truncate flex-1">
                                {file.name}
                              </span>
                              <Badge variant="secondary" className="shrink-0">
                                {formatBytes(file.size)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(i);
                                }}
                              >
                                <X className="size-3" />
                              </Button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          <Plus className="size-3.5 mr-1.5" />
                          Afegir més arxius
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => goTo(2)} disabled={files.length === 0}>
                    Següent
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Name + confirm */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="px-6 pb-6 pt-4 space-y-5"
              >
                <DialogHeader>
                  <DialogTitle className="text-base">
                    Detalls de la pujada
                  </DialogTitle>
                  <DialogDescription>
                    {files.length} arxiu(s) seleccionat(s)
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  <Label htmlFor="upload-label">Nom (opcional)</Label>
                  <Input
                    id="upload-label"
                    placeholder="ex: Factures gener"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    disabled={uploading}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Posa un nom per identificar aquesta pujada fàcilment
                  </p>
                </div>

                {/* File summary */}
                <div className="flex flex-wrap gap-1.5">
                  {files.map((file, i) => (
                    <Badge key={`${file.name}-${i}`} variant="outline">
                      <FileIcon fileName={file.name} className="size-3" />
                      <span className="truncate max-w-[100px]">
                        {file.name}
                      </span>
                    </Badge>
                  ))}
                </div>

                {/* Upload progress */}
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <Progress value={uploadProgress} />
                    <p className="text-xs text-muted-foreground text-center">
                      Pujant arxius…
                    </p>
                  </motion.div>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => goTo(1)}
                    disabled={uploading}
                  >
                    <ArrowLeft className="size-4 mr-1.5" />
                    Enrere
                  </Button>
                  <Button onClick={handleUpload} disabled={uploading}>
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
              </motion.div>
            )}

            {/* Step 3: Done */}
            {step === 3 && session && (
              <motion.div
                key="step3"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={stepTransition}
                className="px-6 pb-6 pt-4 space-y-5"
              >
                <div className="text-center space-y-3 pt-2">
                  <motion.div
                    className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                      delay: 0.1,
                    }}
                  >
                    <CheckCircle2 className="size-7 text-emerald-500" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <DialogTitle className="text-base">
                      Pujada completada!
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {session.files.length} arxiu(s) pujat(s) correctament
                    </DialogDescription>
                  </motion.div>
                </div>

                {/* Copyable block */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Enganxa això al correu:
                      </Label>
                      <Card>
                        <CardContent className="p-3 font-mono text-sm leading-relaxed select-all">
                          Codi: {session.id}
                          <br />
                          {UPLOAD_URL}
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  className="flex flex-col gap-2.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    className="w-full"
                    size="lg"
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
                    variant="outline"
                    className="w-full"
                    onClick={reset}
                  >
                    <Plus className="size-4 mr-2" />
                    Nova pujada
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleClose}
                  >
                    Tancar
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
