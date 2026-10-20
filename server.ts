import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { storage } from './src/server/storage.ts';
import type { User } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const app = express();

// Multer memory storage for admin document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB maximum file size
  },
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Extend Express Request type to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      authToken?: string;
    }
  }
}

// Authentication middleware
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  let token = '';

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token.trim();
  }

  if (token) {
    const user = storage.getUserByToken(token);
    if (user) {
      req.user = user;
      req.authToken = token;
    }
  }

  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Sessão expirada ou não autenticado. Faça login novamente.' });
    return;
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito à equipe administrativa.' });
    return;
  }
  next();
}

app.use(authMiddleware);

// --- Auth Routes ---
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, email, password } = req.body;
  const loginId = identifier || email;
  if (!loginId || !password) {
    res.status(400).json({ error: 'Informe seu CPF ou e-mail e a senha.' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  try {
    const result = storage.authenticate(String(loginId), String(password), ip);
    if (!result) {
      res.status(401).json({ error: 'CPF/E-mail ou senha incorretos, ou conta desativada.' });
      return;
    }

    const properties = result.user.role === 'client' ? storage.getProperties(result.user.id) : [];

    res.json({
      token: result.token,
      user: result.user,
      properties,
      mustChangePassword: result.mustChangePassword,
    });
  } catch (err: any) {
    res.status(429).json({ error: err.message || 'Erro ao realizar login.' });
  }
});

app.post('/api/auth/change-first-password', requireAuth, (req: Request, res: Response) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || !confirmPassword) {
      res.status(400).json({ error: 'Preencha a nova senha e a confirmação.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'A confirmação de senha não confere com a nova senha digitada.' });
      return;
    }
    if (String(newPassword).length < 6) {
      res.status(400).json({ error: 'A nova senha deve possuir no mínimo 6 caracteres.' });
      return;
    }

    const updatedUser = storage.changeFirstPassword(req.user!.id, String(newPassword));
    res.json({
      success: true,
      user: updatedUser,
      message: 'Sua nova senha foi cadastrada com sucesso! Você já pode acessar seus documentos.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao alterar senha.' });
  }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const properties = req.user.role === 'client' ? storage.getProperties(req.user.id) : [];
  res.json({
    user: req.user,
    properties,
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  if (req.authToken) {
    storage.logout(req.authToken);
  }
  res.json({ success: true });
});

app.post('/api/auth/request-reset', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Informe seu e-mail cadastrado.' });
    return;
  }

  const token = storage.createResetToken(String(email));
  // Note: For privacy and security, do not disclose if email exists
  res.json({
    success: true,
    message: 'Se o e-mail estiver cadastrado, as instruções e o código de redefinição foram gerados.',
    // In local / development environment, we return the token directly so the user can test password reset
    debugToken: token || undefined,
  });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || String(newPassword).length < 4) {
    res.status(400).json({ error: 'Código inválido ou senha com menos de 4 caracteres.' });
    return;
  }

  const success = storage.resetPasswordWithToken(String(token), String(newPassword));
  if (!success) {
    res.status(400).json({ error: 'Código de redefinição inválido ou expirado.' });
    return;
  }

  res.json({ success: true, message: 'Senha atualizada com sucesso. Você já pode entrar com sua nova senha.' });
});

// --- Client Routes ---
// Retrieve only the logged-in client's authorized documents
app.get('/api/client/documents', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role === 'client' && user.mustChangePassword) {
    res.status(403).json({
      error: 'Troca de senha obrigatória no primeiro acesso antes de visualizar seus documentos.',
      code: 'MUST_CHANGE_PASSWORD',
    });
    return;
  }
  // Strict authorization check: a client can ONLY see their own documents
  const documents = storage.getClientDocuments(user.id);
  res.json({ documents });
});

app.get('/api/client/properties', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const properties = storage.getProperties(user.id);
  res.json({ properties });
});

// Direct authenticated file download
app.get('/api/client/documents/:id/download', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role === 'client' && user.mustChangePassword) {
    res.status(403).json({
      error: 'Troca de senha obrigatória no primeiro acesso antes de baixar documentos.',
      code: 'MUST_CHANGE_PASSWORD',
    });
    return;
  }
  const docId = req.params.id;
  const doc = storage.getDocumentById(docId);

  if (!doc) {
    res.status(404).json({ error: 'Documento não encontrado.' });
    return;
  }

  // Strict IDOR prevention: Client can only download their own documents
  if (user.role !== 'admin' && doc.clientId !== user.id) {
    res.status(403).json({ error: 'Acesso negado. Este documento não pertence à sua conta.' });
    return;
  }

  if (!fs.existsSync(doc.storagePath)) {
    res.status(404).json({ error: 'Arquivo físico não encontrado no armazenamento seguro.' });
    return;
  }

  // Register in download audit log
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Desconhecido';
  storage.logDownload(doc, user, ip, userAgent);

  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(doc.filename)}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`
  );

  const fileStream = fs.createReadStream(doc.storagePath);
  fileStream.pipe(res);
});

// Inline authenticated preview (for PDFs & images)
app.get('/api/client/documents/:id/view', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const docId = req.params.id;
  const doc = storage.getDocumentById(docId);

  if (!doc) {
    res.status(404).json({ error: 'Documento não encontrado.' });
    return;
  }

  // Strict IDOR prevention
  if (user.role !== 'admin' && doc.clientId !== user.id) {
    res.status(403).json({ error: 'Acesso negado.' });
    return;
  }

  if (!fs.existsSync(doc.storagePath)) {
    res.status(404).json({ error: 'Arquivo físico não encontrado.' });
    return;
  }

  res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.filename)}"`);

  const fileStream = fs.createReadStream(doc.storagePath);
  fileStream.pipe(res);
});

// --- Admin / Staff Routes ---
// Client management
app.get('/api/admin/clients', requireAdmin, (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q : undefined;
  const clients = storage.getClients(query);
  res.json({ clients });
});

app.post('/api/admin/clients', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, cpf, email, phone, propertyName, municipality, state, notes } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Nome completo é obrigatório.' });
      return;
    }
    if (!cpf || !cpf.trim()) {
      res.status(400).json({ error: 'CPF é obrigatório para cadastrar o cliente.' });
      return;
    }

    const result = storage.createClient({
      name,
      cpf,
      email,
      phone,
      propertyName,
      municipality,
      state,
      notes,
    });

    res.status(201).json({
      client: result.client,
      tempPasswordUsed: result.tempPasswordUsed,
      propertyCreated: result.propertyCreated,
      message: 'Cliente cadastrado com sucesso!',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao cadastrar cliente.' });
  }
});

app.put('/api/admin/clients/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { name, email, phone, notes, active, newPassword } = req.body;

    const updated = storage.updateClient(id, {
      name,
      email,
      phone,
      notes,
      active,
      newPassword,
    });

    res.json({ client: updated, message: 'Dados do cliente atualizados com sucesso.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao atualizar cliente.' });
  }
});

// Property management
app.get('/api/admin/properties', requireAdmin, (req: Request, res: Response) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
  const properties = storage.getProperties(clientId);
  res.json({ properties });
});

app.post('/api/admin/properties', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, clientId, municipality, state, carNumber, areaHa, nirf, incraCode, notes } =
      req.body;
    if (!name || !clientId || !municipality || !state) {
      res
        .status(400)
        .json({ error: 'Nome da propriedade, cliente, município e UF são obrigatórios.' });
      return;
    }

    const prop = storage.createProperty({
      name,
      clientId,
      municipality,
      state,
      carNumber,
      areaHa,
      nirf,
      incraCode,
      notes,
    });

    res.status(201).json({ property: prop, message: 'Propriedade rural vinculada com sucesso.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao cadastrar propriedade.' });
  }
});

// Documents management (Upload, Edit display name, Replace file, Delete)
app.get('/api/admin/documents', requireAdmin, (_req: Request, res: Response) => {
  const docs = storage.getAllDocuments();
  res.json({ documents: docs });
});

app.post(
  '/api/admin/documents',
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { clientId, propertyId, title, description } = req.body;
      const file = req.file;

      if (!clientId) {
        res.status(400).json({ error: 'Selecione o cliente destinatário.' });
        return;
      }
      if (!title || !title.trim()) {
        res.status(400).json({ error: 'Informe o nome de exibição do documento.' });
        return;
      }
      if (!file) {
        res.status(400).json({ error: 'Selecione o arquivo do documento para envio.' });
        return;
      }

      const newDoc = await storage.addDocument({
        clientId: String(clientId),
        propertyId: propertyId ? String(propertyId) : undefined,
        title: String(title),
        description: description ? String(description) : undefined,
        fileBuffer: file.buffer,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
      });

      res.status(201).json({
        document: newDoc,
        message: 'Documento arquivado e disponibilizado com sucesso na conta do cliente!',
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao enviar documento.' });
    }
  }
);

app.put('/api/admin/documents/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { title, propertyId, description } = req.body;

    const updated = await storage.updateDocument(id, {
      title,
      propertyId,
      description,
    });

    res.json({ document: updated, message: 'Documento atualizado com sucesso.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Erro ao atualizar documento.' });
  }
});

app.post(
  '/api/admin/documents/:id/replace',
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Nenhum novo arquivo selecionado para substituição.' });
        return;
      }

      const updated = await storage.replaceDocumentFile(
        id,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      res.json({ document: updated, message: 'Arquivo substituído com sucesso.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao substituir arquivo.' });
    }
  }
);

app.delete('/api/admin/documents/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const ok = await storage.deleteDocument(id);
    if (!ok) {
      res.status(404).json({ error: 'Documento não encontrado.' });
      return;
    }
    res.json({ success: true, message: 'Documento removido com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao remover documento.' });
  }
});

// Download and activity logs
app.get('/api/admin/logs', requireAdmin, (_req: Request, res: Response) => {
  const logs = storage.getDownloadLogs();
  res.json({ logs });
});

// System health check
app.get('/api/system/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    portal: 'Portal de Documentos Rurais',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

async function startServer() {
  await storage.init();

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rural Documents Portal server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
