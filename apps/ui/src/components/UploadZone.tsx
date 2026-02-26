import { useState, useRef, useCallback } from "react";
import { Upload, File as FileIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
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

export function UploadZone({ onUploaded }: Props) {
  const client = useClient();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [label, setLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>({ phase: "idle" });

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
      toast.success(`Uploaded ${files.length} file(s) to ${session.id}`);
      onUploaded();
    } catch (err: any) {
      if (err?.status === 401) {
        toast.error("Token expired or invalid");
        logout();
        return;
      }
      toast.error(err?.message ?? "Upload failed");
      setState({ phase: "idle" });
    }
  }

  function reset() {
    setFiles([]);
    setLabel("");
    setState({ phase: "idle" });
  }

  if (state.phase === "done") {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <div className="text-4xl">✓</div>
          <div>
            <p className="font-semibold text-lg">Upload complete</p>
            <p className="text-muted-foreground text-sm">
              Session{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                {state.session.id}
              </code>{" "}
              — {state.session.files.length} file(s)
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(state.session.id);
                toast.success("Copied!");
              }}
            >
              Copy ID
            </Button>
            <Button size="sm" onClick={reset}>
              New upload
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
        <Upload className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag & drop files here or{" "}
          <span className="text-primary underline">browse</span>
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2"
            >
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1">{file.name}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {formatBytes(file.size)}
              </span>
              <button
                onClick={() => removeFile(i)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Label */}
      <div className="space-y-1.5">
        <Label htmlFor="label">Session label (optional)</Label>
        <Input
          id="label"
          placeholder="e.g. batch-2024-01"
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
            Uploading…
          </p>
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={files.length === 0}
          onClick={handleUpload}
        >
          <Upload className="size-4 mr-2" />
          Upload {files.length > 0 ? `${files.length} file(s)` : ""}
        </Button>
      )}
    </div>
  );
}
