import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateValidRuralPdf } from './pdf-generator.ts';
import type { User, RuralProperty, RuralDocument, DownloadLog } from '../types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'documents');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// --- CPF Validation & Normalization ---
export function isValidCPF(cpfRaw: string): boolean {
  if (!cpfRaw) return false;
  const cpf = cpfRaw.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  let rest: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(10, 11), 10)) return false;

  return true;
}

export function normalizeCPF(cpfRaw: string): string {
  return (cpfRaw || '').replace(/\D/g, '');
}

export function formatCPF(cpfRaw: string): string {
  const clean = normalizeCPF(cpfRaw);
  if (clean.length !== 11) return cpfRaw;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

// Sequence based on MEYER with secure individual suffix
export function generateMeyerTempPassword(): string {
  const symbols = ['@', '#', '$', '%'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `MEYER${symbol}${randomDigits}`;
}

// --- Brute-force & Rate Limiting ---
interface LoginAttemptRecord {
  attempts: number;
  lockedUntil?: number;
}
const loginAttempts = new Map<string, LoginAttemptRecord>();

function checkRateLimit(key: string): { allowed: boolean; remainingSeconds?: number } {
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true };
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { allowed: false, remainingSeconds };
  }
  if (record.lockedUntil && record.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFailedAttempt(key: string) {
  const record = loginAttempts.get(key) || { attempts: 0 };
  record.attempts += 1;
  if (record.attempts >= 5) {
    // Lock for 5 minutes
    record.lockedUntil = Date.now() + 5 * 60 * 1000;
  }
  loginAttempts.set(key, record);
}

function clearFailedAttempts(key: string) {
  loginAttempts.delete(key);
}

interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

interface ResetToken {
  token: string;
  identifier: string;
  expiresAt: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  properties: RuralProperty[];
  documents: RuralDocument[];
  downloadLogs: DownloadLog[];
  resetTokens: ResetToken[];
  sessions: { token: string; userId: string; createdAt: string }[];
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export class StorageManager {
  private db: DatabaseSchema = {
    users: [],
    properties: [],
    documents: [],
    downloadLogs: [],
    resetTokens: [],
    sessions: [],
  };

  private initialized = false;

  public async init() {
    if (this.initialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading db.json, re-initializing database', err);
        await this.seedInitialData();
      }
    } else {
      await this.seedInitialData();
    }

    this.initialized = true;
  }

  private async save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save db.json', err);
    }
  }

  private async seedInitialData() {
    const adminSalt = crypto.randomBytes(16).toString('hex');
    const client1Salt = crypto.randomBytes(16).toString('hex');
    const client2Salt = crypto.randomBytes(16).toString('hex');
    const client3Salt = crypto.randomBytes(16).toString('hex');

    const adminUser: StoredUser = {
      id: 'admin_1',
      name: 'Equipe Técnica Meyer Engenharia',
      email: 'admin@meyerengenharia.com.br',
      phone: '(63) 3213-1121',
      role: 'admin',
      active: true,
      mustChangePassword: false,
      notes: 'Administrador central de arquivos técnicos e regularização fundiária - Meyer Engenharia',
      salt: adminSalt,
      passwordHash: hashPassword('admin123', adminSalt),
      createdAt: '2026-01-10T08:00:00Z',
    };

    // Client 1: José Eduardo Silveira (Already completed initial password change)
    // Valid CPF: 716.027.331-12
    const client1: StoredUser = {
      id: 'client_1',
      name: 'José Eduardo Silveira',
      cpf: '71602733112',
      cpfFormatted: '716.027.331-12',
      email: 'jose.silveira@fazendasaopedro.com.br',
      phone: '(16) 99842-1205',
      role: 'client',
      active: true,
      mustChangePassword: false,
      notes: 'Proprietário de terras no interior de SP (Cravinhos e Ribeirão Preto)',
      salt: client1Salt,
      passwordHash: hashPassword('cliente123', client1Salt),
      createdAt: '2026-02-15T09:30:00Z',
    };

    // Client 2: Ana Maria de Albuquerque
    // Valid CPF: 154.761.687-37
    const client2: StoredUser = {
      id: 'client_2',
      name: 'Ana Maria de Albuquerque',
      cpf: '15476168737',
      cpfFormatted: '154.761.687-37',
      email: 'anamaria.terras@gmail.com',
      phone: '(62) 99124-7733',
      role: 'client',
      active: true,
      mustChangePassword: false,
      notes: 'Produtora rural na região de Rio Verde - GO',
      salt: client2Salt,
      passwordHash: hashPassword('cliente123', client2Salt),
      createdAt: '2026-03-01T14:00:00Z',
    };

    // Client 3: Carlos Henrique Prado (New client with temporary password sequence based on MEYER)
    // Valid CPF: 017.462.110-83
    // mustChangePassword = true (Must change password on first access!)
    const client3: StoredUser = {
      id: 'client_3',
      name: 'Carlos Henrique Prado',
      cpf: '01746211083',
      cpfFormatted: '017.462.110-83',
      email: 'carlos.prado@agroeste.com.br',
      phone: '(67) 98412-5566',
      role: 'client',
      active: true,
      mustChangePassword: true,
      notes: 'Novo cliente cadastrado com senha temporária - Primeiro acesso pendente',
      salt: client3Salt,
      passwordHash: hashPassword('MEYER@4821', client3Salt),
      createdAt: '2026-04-12T11:20:00Z',
    };

    const properties: RuralProperty[] = [
      {
        id: 'prop_1',
        name: 'Fazenda São Pedro',
        clientId: 'client_1',
        municipality: 'Ribeirão Preto',
        state: 'SP',
        carNumber: 'SP-3543402-E938F48C8B1C4B82A82939D8C12A3490',
        areaHa: 840,
        nirf: '4.821.903-2',
        incraCode: '950.082.114.390-1',
        notes: 'Cultura de cana-de-açúcar e preservação permanente com nascentes protegidas',
        createdAt: '2026-02-15T09:35:00Z',
      },
      {
        id: 'prop_2',
        name: 'Gleba Boa Vista',
        clientId: 'client_1',
        municipality: 'Cravinhos',
        state: 'SP',
        carNumber: 'SP-3513108-A4839B7C1298442E8B991F2447A22189',
        areaHa: 160,
        nirf: '3.119.840-7',
        incraCode: '950.082.008.120-9',
        notes: 'Área com reserva legal averbada e matrícula individualizada',
        createdAt: '2026-02-15T09:40:00Z',
      },
      {
        id: 'prop_3',
        name: 'Estância Recanto Verde',
        clientId: 'client_2',
        municipality: 'Rio Verde',
        state: 'GO',
        carNumber: 'GO-5218805-4B812C9F8A1237D2883491823901B824',
        areaHa: 1250,
        nirf: '7.942.100-5',
        incraCode: '921.144.529.011-4',
        notes: 'Área de grãos (soja e milho safrinha) com pivô central',
        createdAt: '2026-03-01T14:10:00Z',
      },
      {
        id: 'prop_4',
        name: 'Fazenda Vale do Sol',
        clientId: 'client_3',
        municipality: 'Dourados',
        state: 'MS',
        carNumber: 'MS-5003702-88F9A1B2C3D4E5F6A7B8C9D0E1F2A3B4',
        areaHa: 420,
        nirf: '5.620.311-9',
        incraCode: '915.220.891.400-3',
        notes: 'Propriedade cadastrada para o cliente Carlos Henrique',
        createdAt: '2026-04-12T11:25:00Z',
      },
    ];

    const initialDocsConfig = [
      {
        id: 'doc_1',
        clientId: 'client_1',
        propertyId: 'prop_1',
        propertyName: 'Fazenda São Pedro',
        title: 'Certidão de Inscrição no CAR - Cadastro Ambiental Rural',
        filename: 'CAR_Fazenda_Sao_Pedro_2026.pdf',
        fileType: 'PDF' as const,
        mimeType: 'application/pdf',
        protocol: 'CAR-SP-3543402-9981',
        issuedDate: '12/03/2026',
        availableDate: '15/03/2026',
        description: 'Recibo oficial emitido pela Secretaria de Meio Ambiente e Infraestrutura',
      },
      {
        id: 'doc_2',
        clientId: 'client_1',
        propertyId: 'prop_1',
        propertyName: 'Fazenda São Pedro',
        title: 'CCIR 2024 - Certificado de Cadastro de Imóvel Rural (INCRA)',
        filename: 'CCIR_2024_Fazenda_Sao_Pedro_INCRA.pdf',
        fileType: 'PDF' as const,
        mimeType: 'application/pdf',
        protocol: 'INCRA-CCIR-950082114',
        issuedDate: '28/01/2026',
        availableDate: '02/02/2026',
        description: 'Certificado de quitação de taxa cadastral emitido pelo INCRA',
      },
      {
        id: 'doc_3',
        clientId: 'client_1',
        propertyId: 'prop_1',
        propertyName: 'Fazenda São Pedro',
        title: 'Recibo de Entrega da Declaração do ITR 2024',
        filename: 'Recibo_ITR_2024_Fazenda_Sao_Pedro.pdf',
        fileType: 'PDF' as const,
        mimeType: 'application/pdf',
        protocol: 'RFB-DITR-2024-88419',
        issuedDate: '24/09/2025',
        availableDate: '25/09/2025',
        description: 'Comprovante oficial de entrega da Declaração do ITR junto à Receita Federal',
      },
      {
        id: 'doc_4',
        clientId: 'client_1',
        propertyId: 'prop_1',
        propertyName: 'Fazenda São Pedro',
        title: 'Certidão Negativa de Débitos da Receita Federal e PGFN',
        filename: 'CND_Receita_Federal_Fazenda_Sao_Pedro.pdf',
        fileType: 'PDF' as const,
        mimeType: 'application/pdf',
        protocol: 'CND-PGFN-771928-SP',
        issuedDate: '05/04/2026',
        availableDate: '06/04/2026',
        description: 'Certidão de regularidade fiscal relativa a tributos federais e dívida ativa da união',
      },
      {
        id: 'doc_5',
        clientId: 'client_1',
        propertyId: 'prop_2',
        propertyName: 'Gleba Boa Vista',
        title: 'Matrícula Imobiliária Atualizada nº 48.912 - Registro de Imóveis',
        filename: 'Matricula_48912_Gleba_Boa_Vista.pdf',
        fileType: 'PDF' as const,
        mimeType: 'application/pdf',
        protocol: 'CRI-CRAVINHOS-48912',
        issuedDate: '10/02/2026',
        availableDate: '11/02/2026',
        description: 'Certidão de inteiro teor com memorial descritivo e limites georreferenciados',
      },
      {
        id: 'doc_6',
        clientId: 'client_1',
        propertyId: 'prop_1',
        propertyName: 'Fazenda São Pedro',
        title: 'Planta Topográfica e Memorial Descritivo - Voo Drone RTK (SIGEF)',
        filename: 'Memorial_Georreferenciamento_Meyer.pdf',
        fileType: 'PDF' as const,
        mimeType: 'application/pdf',
        protocol: 'SIGEF-GEO-884102-MEYER',
        issuedDate: '18/11/2025',
        availableDate: '20/11/2025',
        description: 'Certificação técnica de georreferenciamento elaborada pela Meyer Engenharia',
      },
      {
        id: 'doc_7',
        clientId: 'client_2',
        propertyId: 'prop_3',
        propertyName: 'Estância Recanto Verde',
        title: 'CAR - Cadastro Ambiental Rural Oficial',
        filename: 'CAR_Estancia_Recanto_Verde_GO.pdf',
        fileType: 'PDF' as const,
        mimeType: 'application/pdf',
        protocol: 'CAR-GO-5218805-4B812',
        issuedDate: '14/01/2026',
        availableDate: '15/01/2026',
        description: 'Inscrição homologada no Sistema Integrado de Meio Ambiente',
      },
      {
        id: 'doc_8',
        clientId: 'client_2',
        propertyId: 'prop_3',
        propertyName: 'Estância Recanto Verde',
        title: 'CCIR 2024 Quitante INCRA',
        filename: 'CCIR_2024_Recanto_Verde_INCRA.pdf',
        fileType: 'PDF' as const,
        mimeType: 'application/pdf',
        protocol: 'INCRA-CCIR-921144529',
        issuedDate: '02/02/2026',
        availableDate: '04/02/2026',
        description: 'Certificado de cadastro rural com área total e módulo fiscal',
      },
    ];

    const documents: RuralDocument[] = [];

    for (const doc of initialDocsConfig) {
      const clientUser = [client1, client2].find((c) => c.id === doc.clientId);
      const clientName = clientUser ? clientUser.name : 'Proprietário';

      const pdfBuffer = generateValidRuralPdf(
        doc.title,
        doc.propertyName,
        clientName,
        'Documentação Técnica Meyer',
        doc.protocol,
        doc.issuedDate
      );

      const filePath = path.join(STORAGE_DIR, doc.filename);
      fs.writeFileSync(filePath, pdfBuffer);

      const sizeBytes = pdfBuffer.length;
      const sizeFormatted = `${(sizeBytes / 1024).toFixed(1)} KB`;

      documents.push({
        id: doc.id,
        clientId: doc.clientId,
        propertyId: doc.propertyId,
        propertyName: doc.propertyName,
        title: doc.title,
        filename: doc.filename,
        fileType: doc.fileType,
        mimeType: doc.mimeType,
        fileSizeBytes: sizeBytes,
        fileSizeFormatted: sizeFormatted,
        availableDate: doc.availableDate,
        storagePath: filePath,
        description: doc.description,
        createdAt: '2026-03-15T10:00:00Z',
        updatedAt: '2026-03-15T10:00:00Z',
      });
    }

    const downloadLogs: DownloadLog[] = [
      {
        id: 'log_seed_1',
        documentId: 'doc_1',
        documentTitle: 'Certidão de Inscrição no CAR - Cadastro Ambiental Rural',
        clientId: 'client_1',
        clientName: 'José Eduardo Silveira',
        userRole: 'client',
        downloadedAt: '2026-03-16T14:22:10Z',
        ipAddress: '177.18.92.40',
        device: 'Chrome Mobile / Android',
      },
    ];

    this.db = {
      users: [adminUser, client1, client2, client3],
      properties,
      documents,
      downloadLogs,
      resetTokens: [],
      sessions: [],
    };

    await this.save();
  }

  // --- Auth methods (CPF and Email support + Brute-force protection) ---
  public authenticate(
    identifierRaw: string,
    passwordPlain: string,
    ipAddress?: string
  ): { user: User; token: string; mustChangePassword: boolean } | null {
    const raw = (identifierRaw || '').trim();
    const rateKey = ipAddress || raw;

    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      throw new Error(
        `Muitas tentativas incorretas. Conta bloqueada temporariamente. Tente novamente em ${rateCheck.remainingSeconds} segundos.`
      );
    }

    const digitsOnly = normalizeCPF(raw);
    const isCpfFormat = digitsOnly.length === 11;
    const cleanLower = raw.toLowerCase();

    const user = this.db.users.find((u) => {
      // 1. Try matching by normalized CPF
      if (isCpfFormat && u.cpf === digitsOnly) {
        return true;
      }
      // 2. Try matching by email
      if (u.email.toLowerCase().trim() === cleanLower) {
        return true;
      }
      // 3. Admin alias
      if (
        u.role === 'admin' &&
        (cleanLower === 'admin' ||
          cleanLower === 'admin@meyerengenharia.com.br' ||
          cleanLower === 'admin@agrodoc.com.br')
      ) {
        return true;
      }
      return false;
    });

    if (!user) {
      recordFailedAttempt(rateKey);
      return null;
    }

    if (!user.active) {
      throw new Error('Esta conta está desativada. Entre em contato com a Meyer Engenharia.');
    }

    const hash = hashPassword(passwordPlain, user.salt);
    if (hash !== user.passwordHash) {
      recordFailedAttempt(rateKey);
      return null;
    }

    // Success -> Clear rate limit count
    clearFailedAttempts(rateKey);

    const token = crypto.randomBytes(32).toString('hex');
    this.db.sessions.push({
      token,
      userId: user.id,
      createdAt: new Date().toISOString(),
    });
    this.save();

    const { passwordHash, salt, ...safeUser } = user;
    return {
      user: safeUser,
      token,
      mustChangePassword: !!user.mustChangePassword,
    };
  }

  public getUserByToken(token: string): User | null {
    const session = this.db.sessions.find((s) => s.token === token);
    if (!session) return null;

    const user = this.db.users.find((u) => u.id === session.userId);
    if (!user || !user.active) return null;

    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  public logout(token: string) {
    this.db.sessions = this.db.sessions.filter((s) => s.token !== token);
    this.save();
  }

  // --- Mandatory First Password Change ---
  public changeFirstPassword(userId: string, newPasswordPlain: string): User {
    const user = this.db.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      throw new Error('A nova senha deve possuir no mínimo 6 caracteres.');
    }

    // Reject using CPF as password
    if (user.cpf && normalizeCPF(newPasswordPlain) === user.cpf) {
      throw new Error('Por segurança, a senha não pode ser igual ao seu CPF.');
    }

    // Update password hash and invalidate temporary password state
    user.salt = crypto.randomBytes(16).toString('hex');
    user.passwordHash = hashPassword(newPasswordPlain, user.salt);
    user.mustChangePassword = false;

    this.save();

    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  public createResetToken(identifierRaw: string): string | null {
    const raw = (identifierRaw || '').trim();
    const digitsOnly = normalizeCPF(raw);
    const isCpf = digitsOnly.length === 11;
    const cleanLower = raw.toLowerCase();

    const user = this.db.users.find((u) => {
      if (isCpf && u.cpf === digitsOnly) return true;
      if (u.email.toLowerCase().trim() === cleanLower) return true;
      return false;
    });

    if (!user) return null;

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    this.db.resetTokens = this.db.resetTokens.filter((r) => r.identifier !== user.id);
    this.db.resetTokens.push({ token, identifier: user.id, expiresAt });
    this.save();

    return token;
  }

  public resetPasswordWithToken(token: string, newPasswordPlain: string): boolean {
    const record = this.db.resetTokens.find((r) => r.token === token);
    if (!record) return false;

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return false;
    }

    const user = this.db.users.find((u) => u.id === record.identifier);
    if (!user) return false;

    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    user.salt = crypto.randomBytes(16).toString('hex');
    user.passwordHash = hashPassword(newPasswordPlain, user.salt);
    user.mustChangePassword = false;

    this.db.resetTokens = this.db.resetTokens.filter((r) => r.token !== token);
    this.db.sessions = this.db.sessions.filter((s) => s.userId !== user.id);
    this.save();

    return true;
  }

  // --- Document queries ---
  public getClientDocuments(clientId: string): RuralDocument[] {
    return this.db.documents
      .filter((d) => d.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllDocuments(): RuralDocument[] {
    return [...this.db.documents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getDocumentById(id: string): RuralDocument | null {
    return this.db.documents.find((d) => d.id === id) || null;
  }

  public logDownload(
    doc: RuralDocument,
    user: User,
    ipAddress?: string,
    device?: string
  ) {
    const log: DownloadLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      documentId: doc.id,
      documentTitle: doc.title,
      clientId: doc.clientId,
      clientName: user.name,
      userRole: user.role,
      downloadedAt: new Date().toISOString(),
      ipAddress: ipAddress || '127.0.0.1',
      device: device || 'Navegador Web',
    };
    this.db.downloadLogs.unshift(log);
    if (this.db.downloadLogs.length > 500) {
      this.db.downloadLogs = this.db.downloadLogs.slice(0, 500);
    }
    this.save();
  }

  public getDownloadLogs(): DownloadLog[] {
    return this.db.downloadLogs;
  }

  // --- Client Management (Admin only) ---
  public getClients(query?: string): (User & { documentCount: number; propertyCount: number })[] {
    const cleanQuery = (query || '').toLowerCase().trim();
    const queryDigits = cleanQuery.replace(/\D/g, '');

    return this.db.users
      .filter((u) => u.role === 'client')
      .filter((u) => {
        if (!cleanQuery) return true;
        return (
          u.name.toLowerCase().includes(cleanQuery) ||
          u.email.toLowerCase().includes(cleanQuery) ||
          (u.cpf && u.cpf.includes(queryDigits)) ||
          (u.phone && u.phone.includes(cleanQuery))
        );
      })
      .map((u) => {
        const { passwordHash, salt, ...safe } = u;
        const documentCount = this.db.documents.filter((d) => d.clientId === u.id).length;
        const propertyCount = this.db.properties.filter((p) => p.clientId === u.id).length;
        return {
          ...safe,
          documentCount,
          propertyCount,
        };
      });
  }

  public getClientById(id: string): User | null {
    const user = this.db.users.find((u) => u.id === id && u.role === 'client');
    if (!user) return null;
    const { passwordHash, salt, ...safe } = user;
    return safe;
  }

  // Client registration with CPF validation, normalization, and temporary credentials
  public createClient(params: {
    name: string;
    cpf: string;
    email?: string;
    phone?: string;
    propertyId?: string;
    propertyName?: string;
    municipality?: string;
    state?: string;
    notes?: string;
  }): { client: User; tempPasswordUsed: string; propertyCreated?: RuralProperty } {
    if (!params.name || !params.name.trim()) {
      throw new Error('Nome completo do cliente é obrigatório.');
    }

    if (!params.cpf || !params.cpf.trim()) {
      throw new Error('CPF do cliente é obrigatório.');
    }

    // CPF validation
    if (!isValidCPF(params.cpf)) {
      throw new Error('CPF inválido. Verifique os números digitados.');
    }

    const normCpf = normalizeCPF(params.cpf);
    const fmtCpf = formatCPF(normCpf);

    // Duplicate CPF check
    const existingCpf = this.db.users.find((u) => u.cpf === normCpf);
    if (existingCpf) {
      throw new Error(`Já existe um cliente cadastrado com o CPF ${fmtCpf}.`);
    }

    const emailNorm = params.email ? params.email.toLowerCase().trim() : `${normCpf}@cliente.meyerengenharia.com.br`;
    if (params.email) {
      const existingEmail = this.db.users.find((u) => u.email.toLowerCase().trim() === emailNorm);
      if (existingEmail) {
        throw new Error('Já existe um cliente cadastrado com este e-mail.');
      }
    }

    // Generate individual temporary password starting with "MEYER"
    const tempPassword = generateMeyerTempPassword();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(tempPassword, salt);

    const newClientId = 'client_' + Date.now();

    const newClient: StoredUser = {
      id: newClientId,
      name: params.name.trim(),
      cpf: normCpf,
      cpfFormatted: fmtCpf,
      email: emailNorm,
      phone: params.phone?.trim() || '',
      role: 'client',
      active: true,
      mustChangePassword: true, // Mandatory change on first login!
      notes: params.notes?.trim() || '',
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    this.db.users.push(newClient);

    let createdProp: RuralProperty | undefined = undefined;
    if (params.propertyName && params.propertyName.trim()) {
      createdProp = {
        id: 'prop_' + Date.now(),
        name: params.propertyName.trim(),
        clientId: newClientId,
        municipality: params.municipality?.trim() || 'Município não informado',
        state: params.state?.trim().toUpperCase() || 'TO',
        createdAt: new Date().toISOString(),
      };
      this.db.properties.push(createdProp);
    }

    this.save();

    const { passwordHash: _, salt: __, ...safe } = newClient;
    return { client: safe, tempPasswordUsed: tempPassword, propertyCreated: createdProp };
  }

  public updateClient(
    id: string,
    updates: {
      name?: string;
      cpf?: string;
      email?: string;
      phone?: string;
      notes?: string;
      active?: boolean;
      newPassword?: string;
    }
  ): User {
    const client = this.db.users.find((u) => u.id === id && u.role === 'client');
    if (!client) {
      throw new Error('Cliente não encontrado.');
    }

    if (updates.cpf) {
      if (!isValidCPF(updates.cpf)) {
        throw new Error('CPF informado é inválido.');
      }
      const norm = normalizeCPF(updates.cpf);
      const existing = this.db.users.find((u) => u.cpf === norm && u.id !== id);
      if (existing) {
        throw new Error('Este CPF já pertence a outro cliente cadastrado.');
      }
      client.cpf = norm;
      client.cpfFormatted = formatCPF(norm);
    }

    if (updates.email && updates.email.toLowerCase().trim() !== client.email) {
      const emailNorm = updates.email.toLowerCase().trim();
      const existing = this.db.users.find(
        (u) => u.email.toLowerCase().trim() === emailNorm && u.id !== id
      );
      if (existing) {
        throw new Error('Este e-mail já pertence a outro usuário.');
      }
      client.email = emailNorm;
    }

    if (updates.name !== undefined) client.name = updates.name.trim();
    if (updates.phone !== undefined) client.phone = updates.phone.trim();
    if (updates.notes !== undefined) client.notes = updates.notes.trim();
    if (updates.active !== undefined) client.active = updates.active;

    if (updates.newPassword && updates.newPassword.trim().length >= 6) {
      client.salt = crypto.randomBytes(16).toString('hex');
      client.passwordHash = hashPassword(updates.newPassword.trim(), client.salt);
      client.mustChangePassword = false;
      this.db.sessions = this.db.sessions.filter((s) => s.userId !== id);
    }

    this.save();
    const { passwordHash, salt, ...safe } = client;
    return safe;
  }

  // --- Rural Properties ---
  public getProperties(clientId?: string): RuralProperty[] {
    if (clientId) {
      return this.db.properties.filter((p) => p.clientId === clientId);
    }
    return this.db.properties;
  }

  public getPropertyById(id: string): RuralProperty | null {
    return this.db.properties.find((p) => p.id === id) || null;
  }

  public createProperty(params: {
    name: string;
    clientId: string;
    municipality: string;
    state: string;
    carNumber?: string;
    areaHa?: number;
    nirf?: string;
    incraCode?: string;
    notes?: string;
  }): RuralProperty {
    const client = this.db.users.find((u) => u.id === params.clientId && u.role === 'client');
    if (!client) {
      throw new Error('Cliente selecionado não existe.');
    }

    const newProp: RuralProperty = {
      id: 'prop_' + Date.now(),
      name: params.name.trim(),
      clientId: params.clientId,
      municipality: params.municipality.trim(),
      state: params.state.trim().toUpperCase(),
      carNumber: params.carNumber?.trim(),
      areaHa: params.areaHa ? Number(params.areaHa) : undefined,
      nirf: params.nirf?.trim(),
      incraCode: params.incraCode?.trim(),
      notes: params.notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    this.db.properties.push(newProp);
    this.save();
    return newProp;
  }

  // --- Document Storage & Administration ---
  public async addDocument(params: {
    clientId: string;
    propertyId?: string;
    title: string;
    fileBuffer: Buffer;
    originalFilename: string;
    mimeType: string;
    description?: string;
  }): Promise<RuralDocument> {
    const client = this.db.users.find((u) => u.id === params.clientId && u.role === 'client');
    if (!client) {
      throw new Error('Cliente não encontrado.');
    }

    let propertyName: string | undefined = undefined;
    if (params.propertyId) {
      const prop = this.db.properties.find((p) => p.id === params.propertyId);
      if (prop) propertyName = prop.name;
    }

    const ext = path.extname(params.originalFilename).toLowerCase();
    let fileType: 'PDF' | 'JPG' | 'PNG' | 'DOCX' = 'PDF';
    if (ext === '.jpg' || ext === '.jpeg') fileType = 'JPG';
    else if (ext === '.png') fileType = 'PNG';
    else if (ext === '.docx' || ext === '.doc') fileType = 'DOCX';

    const docId = 'doc_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const safeFilename = `${docId}_${params.originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = path.join(STORAGE_DIR, safeFilename);

    fs.writeFileSync(storagePath, params.fileBuffer);

    const sizeBytes = params.fileBuffer.length;
    let sizeFormatted = '';
    if (sizeBytes >= 1024 * 1024) {
      sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      sizeFormatted = `${Math.round(sizeBytes / 1024)} KB`;
    }

    const today = new Intl.DateTimeFormat('pt-BR').format(new Date());

    const newDoc: RuralDocument = {
      id: docId,
      clientId: params.clientId,
      propertyId: params.propertyId || undefined,
      propertyName,
      title: params.title.trim(),
      filename: params.originalFilename,
      fileType,
      mimeType: params.mimeType,
      fileSizeBytes: sizeBytes,
      fileSizeFormatted: sizeFormatted,
      availableDate: today,
      storagePath,
      description: params.description?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.documents.push(newDoc);
    await this.save();
    return newDoc;
  }

  public async updateDocument(
    id: string,
    updates: {
      title?: string;
      propertyId?: string;
      description?: string;
    }
  ): Promise<RuralDocument> {
    const doc = this.db.documents.find((d) => d.id === id);
    if (!doc) {
      throw new Error('Documento não encontrado.');
    }

    if (updates.title !== undefined) doc.title = updates.title.trim();
    if (updates.description !== undefined) doc.description = updates.description.trim();
    if (updates.propertyId !== undefined) {
      doc.propertyId = updates.propertyId || undefined;
      if (doc.propertyId) {
        const prop = this.db.properties.find((p) => p.id === doc.propertyId);
        doc.propertyName = prop ? prop.name : undefined;
      } else {
        doc.propertyName = undefined;
      }
    }
    doc.updatedAt = new Date().toISOString();

    await this.save();
    return doc;
  }

  public async replaceDocumentFile(
    id: string,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<RuralDocument> {
    const doc = this.db.documents.find((d) => d.id === id);
    if (!doc) {
      throw new Error('Documento não encontrado.');
    }

    if (fs.existsSync(doc.storagePath)) {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch (err) {
        console.warn('Could not remove previous file', err);
      }
    }

    const ext = path.extname(originalFilename).toLowerCase();
    let fileType: 'PDF' | 'JPG' | 'PNG' | 'DOCX' = 'PDF';
    if (ext === '.jpg' || ext === '.jpeg') fileType = 'JPG';
    else if (ext === '.png') fileType = 'PNG';
    else if (ext === '.docx' || ext === '.doc') fileType = 'DOCX';

    const safeFilename = `${doc.id}_${originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = path.join(STORAGE_DIR, safeFilename);

    fs.writeFileSync(storagePath, fileBuffer);

    const sizeBytes = fileBuffer.length;
    let sizeFormatted = '';
    if (sizeBytes >= 1024 * 1024) {
      sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    } else {
      sizeFormatted = `${Math.round(sizeBytes / 1024)} KB`;
    }

    doc.filename = originalFilename;
    doc.fileType = fileType;
    doc.mimeType = mimeType;
    doc.fileSizeBytes = sizeBytes;
    doc.fileSizeFormatted = sizeFormatted;
    doc.storagePath = storagePath;
    doc.updatedAt = new Date().toISOString();

    await this.save();
    return doc;
  }

  public async deleteDocument(id: string): Promise<boolean> {
    const idx = this.db.documents.findIndex((d) => d.id === id);
    if (idx === -1) return false;

    const doc = this.db.documents[idx];
    if (fs.existsSync(doc.storagePath)) {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch (err) {
        console.warn('Failed to delete file on disk', err);
      }
    }

    this.db.documents.splice(idx, 1);
    await this.save();
    return true;
  }
}

export const storage = new StorageManager();
