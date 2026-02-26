import {
  File,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  FileAudio,
  FileCode,
  FileJson,
} from "lucide-react";
import { getFileIconInfo } from "@/lib/file-icon";
import { cn } from "@/lib/utils";

const ICON_COMPONENTS: Record<string, typeof File> = {
  File,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  FileAudio,
  FileCode,
  FileJson,
};

interface Props {
  fileName: string;
  className?: string;
}

export function FileIcon({ fileName, className }: Props) {
  const { icon, color } = getFileIconInfo(fileName);
  const Icon = ICON_COMPONENTS[icon] ?? File;
  return <Icon className={cn("size-4", color, className)} />;
}
