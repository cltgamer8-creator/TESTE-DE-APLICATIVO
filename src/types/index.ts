export type UserRole = 'client' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  cpf?: string; // Normalized 11 digits
  cpfFormatted?: string; // Formatted 000.000.000-00
  phone?: string;
  role: UserRole;
  active: boolean;
  mustChangePassword?: boolean; // True on first access with temporary password
  notes?: string;
  propertyIds?: string[];
  createdAt: string;
}

export interface RuralProperty {
  id: string;
  name: string;
  clientId: string;
  municipality: string;
  state: string;
  carNumber?: string;
  areaHa?: number;
  nirf?: string;
  incraCode?: string;
  notes?: string;
  createdAt: string;
}

export interface RuralDocument {
  id: string;
  clientId: string;
  propertyId?: string;
  propertyName?: string;
  title: string;
  filename: string;
  fileType: 'PDF' | 'JPG' | 'PNG' | 'DOCX';
  mimeType: string;
  fileSizeFormatted: string;
  fileSizeBytes: number;
  availableDate: string;
  storagePath: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DownloadLog {
  id: string;
  documentId: string;
  documentTitle: string;
  clientId: string;
  clientName: string;
  userRole: string;
  downloadedAt: string;
  ipAddress?: string;
  device?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  properties?: RuralProperty[];
}
