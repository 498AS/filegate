export type FileWithPath = File & { relativePath?: string };

export function tagRelativePath(file: File, path: string): FileWithPath {
  return Object.assign(file, { relativePath: path });
}

export async function traverseEntry(
  entry: FileSystemEntry,
): Promise<FileWithPath[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((f) => {
        resolve([tagRelativePath(f, entry.fullPath.replace(/^\//, ""))]);
      });
    });
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      const all: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) return resolve(all);
          all.push(...batch);
          readBatch();
        });
      };
      readBatch();
    });
    const nested = await Promise.all(entries.map(traverseEntry));
    return nested.flat();
  }
  return [];
}

export function handleFileSelect(
  e: React.ChangeEvent<HTMLInputElement>,
  addFiles: (files: FileWithPath[]) => void,
) {
  if (e.target.files?.length) {
    addFiles(
      Array.from(e.target.files).map((f) =>
        f.webkitRelativePath
          ? tagRelativePath(f, f.webkitRelativePath)
          : f,
      ),
    );
  }
  e.target.value = "";
}

export async function handleFolderDrop(
  e: React.DragEvent,
  addFiles: (files: FileWithPath[]) => void,
): Promise<boolean> {
  const items = e.dataTransfer.items;
  if (items?.length) {
    const entries = Array.from(items)
      .map((item) => item.webkitGetAsEntry?.())
      .filter((e): e is FileSystemEntry => e != null);
    if (entries.length > 0) {
      const nested = await Promise.all(entries.map(traverseEntry));
      addFiles(nested.flat());
      return true;
    }
  }
  return false;
}

export function fileDedupKey(f: FileWithPath): string {
  return `${f.relativePath ?? f.name}:${f.size}`;
}

export function fileDisplayDir(f: FileWithPath): string {
  const rel = f.relativePath;
  return rel ? rel.replace(/[/\\][^/\\]*$/, "") : "";
}
