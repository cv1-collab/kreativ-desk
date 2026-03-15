import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { Server } from 'socket.io';
import http from 'http';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as admin from 'firebase-admin';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
});
const upload = multer({ storage: storage });

const db = new Database('kreativ-desk.db');

// Initialize Stripe lazily to prevent crashes if the key is missing
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn('STRIPE_SECRET_KEY environment variable is missing. Using mock Stripe mode.');
      return null;
    }
    stripeClient = new Stripe(key, { apiVersion: '2025-02-24.acacia' as any });
  }
  return stripeClient;
}

// Initialize Firebase Admin lazily
let firebaseAdminApp: admin.app.App | null = null;
function getFirebaseAdmin(): admin.app.App | null {
  if (!firebaseAdminApp) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing. Firebase Admin features will be disabled.');
      return null;
    }
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize Firebase Admin:', error);
      return null;
    }
  }
  return firebaseAdminApp;
}

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    budget REAL NOT NULL,
    createdAt TEXT NOT NULL,
    ownerId TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS company_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    hourlyRate REAL NOT NULL,
    ownerId TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS project_members (
    projectId TEXT NOT NULL,
    userId TEXT NOT NULL,
    projectRole TEXT NOT NULL,
    PRIMARY KEY (projectId, userId)
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    projectId TEXT NOT NULL,
    date TEXT NOT NULL,
    hours REAL NOT NULL,
    description TEXT NOT NULL,
    hourlyRate REAL NOT NULL,
    ownerId TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    projectId TEXT,
    uploadedAt TEXT NOT NULL,
    ownerId TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    ownerId TEXT DEFAULT 'anonymous'
  );
  
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    ownerId TEXT DEFAULT 'anonymous'
  );
  
  CREATE TABLE IF NOT EXISTS defects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    assignee TEXT NOT NULL,
    date TEXT NOT NULL,
    trade TEXT,
    location TEXT,
    description TEXT,
    imageUrl TEXT,
    ownerId TEXT DEFAULT 'anonymous'
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 0,
    ownerId TEXT DEFAULT 'anonymous'
  );

  CREATE TABLE IF NOT EXISTS slides (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    imageUrl TEXT,
    order_index INTEGER NOT NULL,
    ownerId TEXT DEFAULT 'anonymous'
  );

  CREATE TABLE IF NOT EXISTS audio_notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    time TEXT NOT NULL,
    duration TEXT NOT NULL,
    aiSummary TEXT NOT NULL,
    transcription TEXT NOT NULL,
    ownerId TEXT DEFAULT 'anonymous'
  );

  CREATE TABLE IF NOT EXISTS whiteboard_exports (
    id TEXT PRIMARY KEY,
    imageUrl TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    ownerId TEXT DEFAULT 'anonymous'
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    plan TEXT NOT NULL DEFAULT 'free',
    storage_used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    user_email TEXT
  );
`);

// Migration: Add ownerId to existing tables if they don't have it
const tablesToMigrate = ['events', 'transactions', 'defects', 'contacts', 'slides', 'audio_notes', 'whiteboard_exports'];
for (const table of tablesToMigrate) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ownerId TEXT DEFAULT 'anonymous'`).run();
    console.log(`Added ownerId column to ${table}`);
  } catch (e: any) {
    // Ignore error if column already exists
  }
}

// Migration: Add missing columns to slides table if it was created in an older version
try {
  db.exec("ALTER TABLE slides ADD COLUMN type TEXT NOT NULL DEFAULT 'text'");
} catch (e) { /* ignore */ }
try {
  db.exec("ALTER TABLE slides ADD COLUMN imageUrl TEXT");
} catch (e) { /* ignore */ }

// Insert initial data if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, name, email, role, status, plan, storage_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertUser.run(uuidv4(), 'Admin User', 'admin@kreativ-desk.com', 'superadmin', 'active', 'enterprise', 1024 * 1024 * 500, new Date(Date.now() - 86400000 * 30).toISOString());
  insertUser.run(uuidv4(), 'John Doe', 'john@example.com', 'user', 'active', 'pro', 1024 * 1024 * 150, new Date(Date.now() - 86400000 * 15).toISOString());
  insertUser.run(uuidv4(), 'Jane Smith', 'jane@example.com', 'user', 'blocked', 'free', 1024 * 1024 * 10, new Date(Date.now() - 86400000 * 5).toISOString());
}

const logCount = db.prepare('SELECT COUNT(*) as count FROM system_logs').get() as { count: number };
if (logCount.count === 0) {
  const insertLog = db.prepare('INSERT INTO system_logs (id, timestamp, level, message, user_email) VALUES (?, ?, ?, ?, ?)');
  insertLog.run(uuidv4(), new Date().toISOString(), 'info', 'User logged in successfully', 'john@example.com');
  insertLog.run(uuidv4(), new Date(Date.now() - 3600000).toISOString(), 'error', 'Failed to generate AI presentation: API timeout', 'admin@kreativ-desk.com');
  insertLog.run(uuidv4(), new Date(Date.now() - 7200000).toISOString(), 'warn', 'Storage quota approaching limit (85%)', 'john@example.com');
  insertLog.run(uuidv4(), new Date(Date.now() - 86400000).toISOString(), 'info', 'New project "Campus Phase 2" created', 'john@example.com');
}

const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
if (eventCount.count === 0) {
  const insertEvent = db.prepare('INSERT INTO events (id, title, date, type, description) VALUES (?, ?, ?, ?, ?)');
  insertEvent.run(uuidv4(), 'Client Pitch', new Date().toISOString().split('T')[0], 'Meeting', 'Review phase 1');
  insertEvent.run(uuidv4(), 'HVAC Install', new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], 'Construction', 'Level 2 HVAC');
  insertEvent.run(uuidv4(), 'Site Inspection', new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0], 'Inspection', 'Safety check');
}

const contactCount = db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number };
if (contactCount.count === 0) {
  const insertContact = db.prepare('INSERT INTO contacts (id, name, role, company, email, phone, active) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertContact.run(uuidv4(), 'Sarah Jenkins', 'Client Representative', 'TechCorp GmbH', 's.jenkins@techcorp.de', '+49 89 1234 5678', 1);
  insertContact.run(uuidv4(), 'Michael Chang', 'Lead Structural Engineer', 'BuildRight Inc.', 'm.chang@buildright.com', '+1 555 0198', 0);
}

const slideCount = db.prepare('SELECT COUNT(*) as count FROM slides').get() as { count: number };
if (slideCount.count === 0) {
  const insertSlide = db.prepare('INSERT INTO slides (id, title, content, type, order_index) VALUES (?, ?, ?, ?, ?)');
  insertSlide.run(uuidv4(), 'Munich Tech Campus', 'Project Overview & Status Update\nQ3 2026', 'title', 0);
  insertSlide.run(uuidv4(), 'Financial Overview', 'Current expenditure is tracking slightly below the projected curve.', 'budget', 1);
  insertSlide.run(uuidv4(), 'BIM Model Progress', 'Structural framing for Level 1 and 2 is 100% modeled and clash-detected.', '3d_model', 2);
}

const defectCount = db.prepare('SELECT COUNT(*) as count FROM defects').get() as { count: number };
if (defectCount.count === 0) {
  const insertDefect = db.prepare('INSERT INTO defects (id, title, status, priority, assignee, date, trade, location, description, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertDefect.run('DEF-142', 'HVAC Duct Clash Level 2', 'In Progress', 'Critical', 'Mark Smith', new Date().toISOString().split('T')[0], 'HVAC', 'Level 2, Grid C4', 'Duct reduces corridor clearance to 2.1m.', 'https://picsum.photos/seed/defect1/600/400');
  insertDefect.run('DEF-141', 'Water Leakage in Basement', 'To Do', 'High', 'Jane Doe', new Date(Date.now() - 86400000).toISOString().split('T')[0], 'Plumbing', 'Basement, North Wall', 'Minor leakage detected after heavy rain.', 'https://picsum.photos/seed/defect2/600/400');
}

const audioNoteCount = db.prepare('SELECT COUNT(*) as count FROM audio_notes').get() as { count: number };
if (audioNoteCount.count === 0) {
  const insertNote = db.prepare('INSERT INTO audio_notes (id, title, time, duration, aiSummary, transcription) VALUES (?, ?, ?, ?, ?, ?)');
  insertNote.run(uuidv4(), 'Site Visit Notes - Level 2', '10 mins ago', '2:15', 'The client requested a change to the HVAC routing on level 2. Need to check DIN 18232 compliance.', 'So I am walking through level 2 right now and the client just mentioned they want to change the HVAC routing. We need to make sure this still complies with DIN 18232 fire safety regulations before we proceed.');
  insertNote.run(uuidv4(), 'Client Feedback Call', 'Yesterday', '15:30', 'Approved the new facade materials. Budget needs slight adjustment for the premium panels.', 'Great call with the client today. They officially approved the new facade materials we proposed. However, we will need to do a slight budget adjustment to accommodate the premium panels they selected.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
    });

    socket.on('draw', (data) => {
      socket.to(data.roomId).emit('draw', data);
    });

    socket.on('clear-board', (roomId) => {
      socket.to(roomId).emit('clear-board');
    });

    socket.on('chat-message', (data) => {
      socket.to(data.roomId).emit('chat-message', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Stripe Webhook (Must be before express.json())
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const stripe = getStripe();
    const adminApp = getFirebaseAdmin();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !endpointSecret || !adminApp) {
      console.warn('Stripe webhook called but Stripe, Webhook Secret, or Firebase Admin is not configured.');
      return res.status(400).send('Webhook Error: Missing configuration');
    }

    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email;
        const uid = session.client_reference_id; // We will pass the UID here

        if (uid && customerEmail) {
          try {
            const db = adminApp.firestore();
            await db.collection('users').doc(uid).update({
              hasActiveSubscription: true,
              subscriptionId: session.subscription as string,
            });
            console.log(`Successfully updated subscription for user ${uid}`);
          } catch (error) {
            console.error('Error updating Firebase:', error);
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription cancellation
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.send();
  });

  app.use(express.json());
  
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // --- API Routes ---
  
  // File Upload
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { projectId, ownerId } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    const id = uuidv4();
    
    db.prepare('INSERT INTO documents (id, name, url, type, size, projectId, uploadedAt, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.file.originalname, fileUrl, req.file.mimetype, req.file.size, projectId || null, new Date().toISOString(), ownerId || 'anonymous');
      
    res.json({
      id,
      name: req.file.originalname,
      url: fileUrl,
      type: req.file.mimetype,
      size: req.file.size,
      projectId: projectId || null,
      uploadedAt: new Date().toISOString(),
      ownerId: ownerId || 'anonymous'
    });
  });

  app.get('/api/documents', (req, res) => {
    try {
      const ownerId = req.query.ownerId as string;
      if (!ownerId) return res.json([]);
      const docs = db.prepare('SELECT * FROM documents WHERE ownerId = ? ORDER BY uploadedAt DESC').all(ownerId);
      res.json(docs);
    } catch (e: any) {
      console.error('Error in /api/documents:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Projects
  app.get('/api/projects', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    const projects = db.prepare('SELECT * FROM projects WHERE ownerId = ? ORDER BY createdAt DESC').all(ownerId);
    res.json(projects);
  });

  app.post('/api/projects', (req, res) => {
    const { id, name, status, budget, createdAt, ownerId } = req.body;
    db.prepare('INSERT INTO projects (id, name, status, budget, createdAt, ownerId) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, name, status, budget, createdAt, ownerId);
    res.json({ success: true });
  });

  // Company Users
  app.get('/api/company-users', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    const users = db.prepare('SELECT * FROM company_users WHERE ownerId = ?').all(ownerId);
    res.json(users);
  });

  app.post('/api/company-users', (req, res) => {
    const { id, name, email, role, department, hourlyRate, ownerId } = req.body;
    db.prepare('INSERT INTO company_users (id, name, email, role, department, hourlyRate, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, email, role, department || '', hourlyRate || 0, ownerId);
    res.json({ success: true });
  });

  app.put('/api/company-users/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, role, department, hourlyRate, ownerId } = req.body;
    db.prepare('UPDATE company_users SET name = ?, email = ?, role = ?, department = ?, hourlyRate = ? WHERE id = ? AND ownerId = ?')
      .run(name, email, role, department || '', hourlyRate || 0, id, ownerId);
    res.json({ success: true });
  });

  app.delete('/api/company-users/:id', (req, res) => {
    const { id } = req.params;
    const ownerId = req.query.ownerId as string;
    db.prepare('DELETE FROM company_users WHERE id = ? AND ownerId = ?').run(id, ownerId);
    res.json({ success: true });
  });

  // Project Members
  app.get('/api/project-members', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    // Join to ensure we only get members for projects owned by this ownerId
    const members = db.prepare(`
      SELECT pm.* FROM project_members pm
      JOIN projects p ON pm.projectId = p.id
      WHERE p.ownerId = ?
    `).all(ownerId);
    res.json(members);
  });

  app.post('/api/project-members', (req, res) => {
    const { projectId, userId, projectRole, ownerId } = req.body;
    
    // Verify ownership
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND ownerId = ?').get(projectId, ownerId);
    if (!project) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('INSERT OR REPLACE INTO project_members (projectId, userId, projectRole) VALUES (?, ?, ?)')
      .run(projectId, userId, projectRole);
    res.json({ success: true });
  });

  app.delete('/api/project-members', (req, res) => {
    const { projectId, userId, ownerId } = req.query;
    
    // Verify ownership
    const project = db.prepare('SELECT id FROM projects WHERE id = ? AND ownerId = ?').get(projectId, ownerId);
    if (!project) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM project_members WHERE projectId = ? AND userId = ?').run(projectId, userId);
    res.json({ success: true });
  });

  // Time Entries
  app.get('/api/time-entries', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    const entries = db.prepare('SELECT * FROM time_entries WHERE ownerId = ? ORDER BY date DESC').all(ownerId);
    res.json(entries);
  });

  app.post('/api/time-entries', (req, res) => {
    const { id, userId, projectId, date, hours, description, hourlyRate, ownerId } = req.body;
    db.prepare('INSERT INTO time_entries (id, userId, projectId, date, hours, description, hourlyRate, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, userId, projectId, date, hours, description, hourlyRate || 0, ownerId);
    res.json({ success: true });
  });

  // Events (Calendar)
  app.get('/api/events', (req, res) => {
    try {
      const ownerId = req.query.ownerId as string;
      if (!ownerId) return res.json([]);
      const events = db.prepare('SELECT * FROM events WHERE ownerId = ? ORDER BY date ASC').all(ownerId);
      res.json(events);
    } catch (e: any) {
      console.error('Error in /api/events:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/events', (req, res) => {
    const { title, date, type, description, ownerId } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO events (id, title, date, type, description, ownerId) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, title, date, type, description || '', ownerId || 'anonymous');
    res.json({ id, title, date, type, description, ownerId });
  });

  // Transactions (Finance)
  app.get('/api/transactions', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    const txs = db.prepare('SELECT * FROM transactions WHERE ownerId = ? ORDER BY date DESC').all(ownerId);
    res.json(txs);
  });

  app.post('/api/transactions', (req, res) => {
    const { date, description, category, amount, status, ownerId } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO transactions (id, date, description, category, amount, status, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, date, description, category, amount, status, ownerId || 'anonymous');
    res.json({ id, date, description, category, amount, status, ownerId });
  });

  // Defects
  app.get('/api/defects', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    const defects = db.prepare('SELECT * FROM defects WHERE ownerId = ? ORDER BY date DESC').all(ownerId);
    res.json(defects);
  });

  app.post('/api/defects', (req, res) => {
    const { title, status, priority, assignee, date, trade, location, description, imageUrl, ownerId } = req.body;
    const id = 'DEF-' + Math.floor(Math.random() * 1000);
    db.prepare('INSERT INTO defects (id, title, status, priority, assignee, date, trade, location, description, imageUrl, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, title, status, priority, assignee, date, trade || '', location || '', description || '', imageUrl || '', ownerId || 'anonymous');
    res.json({ id, title, status, priority, assignee, date, trade, location, description, imageUrl, ownerId });
  });

  app.put('/api/defects/:id', (req, res) => {
    const { id } = req.params;
    const { status, ownerId } = req.body;
    db.prepare('UPDATE defects SET status = ? WHERE id = ? AND ownerId = ?').run(status, id, ownerId);
    res.json({ success: true });
  });

  // Contacts (CRM)
  app.get('/api/contacts', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    const contacts = db.prepare('SELECT * FROM contacts WHERE ownerId = ? ORDER BY name ASC').all(ownerId);
    res.json(contacts);
  });

  app.post('/api/contacts', (req, res) => {
    const { name, role, company, email, phone, ownerId } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO contacts (id, name, role, company, email, phone, active, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, role, company, email, phone, 0, ownerId || 'anonymous');
    res.json({ id, name, role, company, email, phone, active: 0, ownerId });
  });

  // Slides (Pitch Deck)
  app.get('/api/slides', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    const slides = db.prepare('SELECT * FROM slides WHERE ownerId = ? ORDER BY order_index ASC').all(ownerId);
    res.json(slides);
  });

  app.post('/api/slides', (req, res) => {
    const { title, content, type, imageUrl, ownerId } = req.body;
    const id = uuidv4();
    const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM slides WHERE ownerId = ?').get(ownerId || 'anonymous') as { max: number };
    const order_index = (maxOrder.max || 0) + 1;
    db.prepare('INSERT INTO slides (id, title, content, type, imageUrl, order_index, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, title, content, type || 'text', imageUrl || null, order_index, ownerId || 'anonymous');
    res.json({ id, title, content, type, imageUrl, order_index, ownerId });
  });

  app.put('/api/slides/:id', (req, res) => {
    const { id } = req.params;
    const { title, content, type, imageUrl, ownerId } = req.body;
    db.prepare('UPDATE slides SET title = ?, content = ?, type = ?, imageUrl = ? WHERE id = ? AND ownerId = ?')
      .run(title, content, type, imageUrl || null, id, ownerId || 'anonymous');
    res.json({ success: true });
  });

  app.delete('/api/slides', (req, res) => {
    const ownerId = req.query.ownerId as string;
    db.prepare('DELETE FROM slides WHERE ownerId = ?').run(ownerId || 'anonymous');
    res.json({ success: true });
  });

  // Audio Notes
  app.get('/api/audio-notes', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    const notes = db.prepare('SELECT * FROM audio_notes WHERE ownerId = ? ORDER BY time DESC').all(ownerId);
    res.json(notes);
  });

  app.post('/api/audio-notes', (req, res) => {
    const { title, time, duration, aiSummary, transcription, ownerId } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO audio_notes (id, title, time, duration, aiSummary, transcription, ownerId) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, title, time, duration, aiSummary, transcription, ownerId || 'anonymous');
    res.json({ id, title, time, duration, aiSummary, transcription, ownerId });
  });

  // Whiteboard Exports
  app.get('/api/whiteboard-exports', (req, res) => {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.json([]);
    const exports = db.prepare('SELECT * FROM whiteboard_exports WHERE ownerId = ? ORDER BY createdAt DESC').all(ownerId);
    res.json(exports);
  });

  app.post('/api/whiteboard-exports', (req, res) => {
    const { imageUrl, ownerId } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    db.prepare('INSERT INTO whiteboard_exports (id, imageUrl, createdAt, ownerId) VALUES (?, ?, ?, ?)')
      .run(id, imageUrl, createdAt, ownerId || 'anonymous');
    res.json({ id, imageUrl, createdAt, ownerId });
  });

  // --- Admin API Routes ---
  
  app.get('/api/admin/stats', (req, res) => {
    const timeframe = (req.query.timeframe as string) || 'year';
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const proUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE plan = ?').get('pro') as { count: number };
    const entUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE plan = ?').get('enterprise') as { count: number };
    const totalStorage = db.prepare('SELECT SUM(storage_used) as total FROM users').get() as { total: number };
    
    const chartData: any[] = [];
    const revenueBreakdown = { abos: 0, miete: 0, kauf: 0 };
    let newUsersTotal = 0;

    if (timeframe === 'day') {
      const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
      hours.forEach((h, i) => {
        const abos = 150 + i * 5;
        const miete = 40 + i * 2;
        const kauf = i === 3 ? 2500 : (i === 5 ? 800 : 0);
        const newUsers = Math.floor(Math.random() * 4);
        chartData.push({ date: h, abos, miete, kauf, newUsers });
        revenueBreakdown.abos += abos;
        revenueBreakdown.miete += miete;
        revenueBreakdown.kauf += kauf;
        newUsersTotal += newUsers;
      });
    } else if (timeframe === 'month') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      weeks.forEach((w, i) => {
        const abos = 1200 + i * 50;
        const miete = 400 + i * 20;
        const kauf = 2500 + (i % 2) * 1500;
        const newUsers = 12 + Math.floor(Math.random() * 8);
        chartData.push({ date: w, abos, miete, kauf, newUsers });
        revenueBreakdown.abos += abos;
        revenueBreakdown.miete += miete;
        revenueBreakdown.kauf += kauf;
        newUsersTotal += newUsers;
      });
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let baseAbos = 4000;
      months.forEach((m, i) => {
        baseAbos += 300 + Math.floor(Math.random() * 200);
        const miete = 1200 + i * 150;
        const kauf = 6000 + (i % 3) * 3000;
        const newUsers = 35 + i * 4 + Math.floor(Math.random() * 10);
        chartData.push({ date: m, abos: baseAbos, miete, kauf, newUsers });
        revenueBreakdown.abos += baseAbos;
        revenueBreakdown.miete += miete;
        revenueBreakdown.kauf += kauf;
        newUsersTotal += newUsers;
      });
    }

    res.json({
      totalUsers: userCount.count,
      activePro: proUsers.count,
      activeEnterprise: entUsers.count,
      mrr: revenueBreakdown.abos, // Using abos as MRR equivalent for the period
      totalStorageBytes: totalStorage.total || 0,
      aiRequestsToday: 142,
      revenueBreakdown,
      newUsersTotal,
      chartData
    });
  });

  app.get('/api/admin/users', (req, res) => {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json(users);
  });

  app.put('/api/admin/users/:id', (req, res) => {
    const { id } = req.params;
    const { status, role, plan } = req.body;
    
    // Build dynamic update query based on provided fields
    const updates = [];
    const values = [];
    if (status) { updates.push('status = ?'); values.push(status); }
    if (role) { updates.push('role = ?'); values.push(role); }
    if (plan) { updates.push('plan = ?'); values.push(plan); }
    
    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    
    res.json({ success: true });
  });

  app.get('/api/admin/logs', (req, res) => {
    const logs = db.prepare('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 100').all();
    res.json(logs);
  });

  // --- Stripe Billing API Routes ---
  
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const stripe = getStripe();
      const { email, planName, uid, amount, interval } = req.body;
      const domainURL = req.headers.origin || 'http://localhost:3000';

      if (!stripe) {
        // Mock mode: Redirect directly to success URL
        return res.json({ url: `${domainURL}/?session_id=mock_session_${Date.now()}&plan=${planName}` });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: email, // Pre-fill email
        client_reference_id: uid, // Use UID to identify user in webhook
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Kreativ-Desk ${planName} Plan`,
                description: `Subscription for Kreativ-Desk OS (${planName})`,
              },
              unit_amount: amount * 100, // Convert to cents
              recurring: {
                interval: interval, // 'month' or 'year'
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${domainURL}/?session_id={CHECKOUT_SESSION_ID}&plan=${planName}`,
        cancel_url: `${domainURL}/?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Stripe Checkout Error:', error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  app.post('/api/create-portal-session', async (req, res) => {
    try {
      const stripe = getStripe();
      const { customerId } = req.body;
      const domainURL = req.headers.origin || 'http://localhost:3000';
      const returnUrl = `${domainURL}/`;

      if (!stripe) {
        // Mock mode: Redirect directly to return URL
        return res.json({ url: returnUrl });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error('Stripe Portal Error:', error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
