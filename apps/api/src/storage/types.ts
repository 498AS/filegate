export type SessionStatus = 'pending' | 'picked' | 'archived';

export type FileEntry = {
  name: string;
  size: number;
  mime: string;
  uploaded: string;
};

export type Session = {
  id: string;
  created: string;
  label: string | null;
  status: SessionStatus;
  files: FileEntry[];
};
