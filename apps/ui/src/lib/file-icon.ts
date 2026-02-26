/** Map file extension → lucide icon name + color class for visual file types */

type FileIconInfo = { icon: string; color: string };

const EXT_MAP: Record<string, FileIconInfo> = {
  // Images
  jpg: { icon: "FileImage", color: "text-pink-400" },
  jpeg: { icon: "FileImage", color: "text-pink-400" },
  png: { icon: "FileImage", color: "text-pink-400" },
  gif: { icon: "FileImage", color: "text-pink-400" },
  svg: { icon: "FileImage", color: "text-pink-400" },
  webp: { icon: "FileImage", color: "text-pink-400" },
  // PDFs
  pdf: { icon: "FileText", color: "text-red-400" },
  // Spreadsheets
  xls: { icon: "FileSpreadsheet", color: "text-green-400" },
  xlsx: { icon: "FileSpreadsheet", color: "text-green-400" },
  csv: { icon: "FileSpreadsheet", color: "text-green-400" },
  // Documents
  doc: { icon: "FileText", color: "text-blue-400" },
  docx: { icon: "FileText", color: "text-blue-400" },
  txt: { icon: "FileText", color: "text-blue-400" },
  rtf: { icon: "FileText", color: "text-blue-400" },
  // Archives
  zip: { icon: "FileArchive", color: "text-yellow-400" },
  rar: { icon: "FileArchive", color: "text-yellow-400" },
  "7z": { icon: "FileArchive", color: "text-yellow-400" },
  tar: { icon: "FileArchive", color: "text-yellow-400" },
  gz: { icon: "FileArchive", color: "text-yellow-400" },
  // Video
  mp4: { icon: "FileVideo", color: "text-purple-400" },
  mov: { icon: "FileVideo", color: "text-purple-400" },
  avi: { icon: "FileVideo", color: "text-purple-400" },
  mkv: { icon: "FileVideo", color: "text-purple-400" },
  // Audio
  mp3: { icon: "FileAudio", color: "text-orange-400" },
  wav: { icon: "FileAudio", color: "text-orange-400" },
  ogg: { icon: "FileAudio", color: "text-orange-400" },
  // Code
  js: { icon: "FileCode", color: "text-yellow-300" },
  ts: { icon: "FileCode", color: "text-blue-300" },
  json: { icon: "FileJson", color: "text-yellow-300" },
  html: { icon: "FileCode", color: "text-orange-300" },
  css: { icon: "FileCode", color: "text-blue-300" },
};

export function getFileIconInfo(fileName: string): FileIconInfo {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MAP[ext] ?? { icon: "File", color: "text-muted-foreground" };
}
