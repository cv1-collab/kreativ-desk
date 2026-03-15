import React, { useState, useEffect, useRef } from 'react';
import { Users, FileText, Search, Plus, Sparkles, Download, X, Loader2, Building, Mail, Phone, FileSignature, ChevronRight, FileOutput, Upload, BookOpen, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '../utils';
import { GoogleGenAI } from '@google/genai';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { printElementToPdf } from '../utils/pdfHelper';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

// Helper to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface Contact {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  active: number;
  ownerId?: string;
}

interface Document {
  id: string;
  title: string;
  type: string;
  date: string;
  content: string;
}

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: number;
}

export default function CRM() {
  const { currentUser, userRole } = useAuth();
  const { activeProjectId, projects } = useProject();
  const activeProject = projects.find(p => p.id === activeProjectId);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'knowledge'>('documents');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', role: '', company: '', email: '', phone: '' });
  
  // Document Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([
    { id: '1', title: 'Project Quote (Offerte)', type: 'Quote', date: 'Oct 15, 2023', content: '# Project Quote\n\n**Client:** TechCorp GmbH\n**Project:** Munich Tech Campus\n\n## Scope of Work\n- Architectural Design Phase 1\n- Structural Engineering Consultation\n\n**Total Estimated Cost:** CHF 45,000.00' },
    { id: '2', title: 'NDA - Munich Campus', type: 'Contract', date: 'Oct 12, 2023', content: '# Non-Disclosure Agreement\n\nThis agreement is entered into by and between Kreativ-Desk OS and the Client.' }
  ]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Knowledge Base State
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser || !db || currentUser.uid === 'demo-user') return;
    const q = query(collection(db, 'contacts'), where('ownerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedContacts = snapshot.docs.map(doc => doc.data() as Contact);
      setContacts(fetchedContacts);
      if (fetchedContacts.length > 0 && !activeContactId) {
        setActiveContactId(fetchedContacts[0].id);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'contacts'));
    return () => unsubscribe();
  }, [activeProject?.id, currentUser, activeContactId]);

  useEffect(() => {
    if (!currentUser || !db || currentUser.uid === 'demo-user') return;
    const q = query(collection(db, 'knowledgeDocs'), where('ownerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDocs = snapshot.docs.map(doc => doc.data() as KnowledgeDoc);
      setKnowledgeDocs(fetchedDocs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'knowledgeDocs'));
    return () => unsubscribe();
  }, [currentUser]);

  if (userRole && !['Internal', 'Admin'].includes(userRole)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold">Access Denied</h2>
          <p className="text-text-secondary mt-2">You do not have permission to view the CRM module.</p>
        </div>
      </div>
    );
  }

  const handleImportContacts = () => {
    // Mock import functionality
    const mockImportedContacts: Contact[] = [
      { id: `imp-${Date.now()}-1`, name: 'Anna Schmidt', role: 'Architect', company: 'Schmidt Design', email: 'anna@schmidt-design.de', phone: '+49 123 456789', active: 1 },
      { id: `imp-${Date.now()}-2`, name: 'Marcus Weber', role: 'Structural Engineer', company: 'Weber Engineering', email: 'm.weber@weber-eng.com', phone: '+49 987 654321', active: 1 }
    ];
    setContacts(prev => [...mockImportedContacts, ...prev]);
    alert('Successfully imported 2 contacts.');
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !currentUser || !db) return;

    const id = `cnt-${Date.now()}`;
    const contactPayload: Contact = {
      ...newContact,
      id,
      active: 1,
      ownerId: currentUser.uid
    };

    try {
      await setDoc(doc(db, 'contacts', id), contactPayload);
      setIsModalOpen(false);
      setNewContact({ name: '', role: '', company: '', email: '', phone: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `contacts/${id}`);
    }
  };

  const activeContact = contacts.find(c => c.id === activeContactId);

  const handleGenerateDocument = async (type: 'Quote' | 'Contract' | 'Brochure') => {
    if (!activeContact) return;
    setIsGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      let knowledgeContext = '';
      if (knowledgeDocs.length > 0) {
        knowledgeContext = `\n\nReference the following knowledge base documents if relevant:\n${knowledgeDocs.map(d => `--- Document: ${d.title} ---\n${d.content}\n`).join('\n')}`;
      }

      const prompt = `Generate a professional ${type} for a construction/architecture project.
      Client Name: ${activeContact.name}
      Client Company: ${activeContact.company}
      Project: ${activeProject?.name || 'Munich Tech Campus'} (High-tech office building)
      ${knowledgeContext}
      
      If it's a Quote (Offerte), include a breakdown of costs (e.g., Architecture, TGA, Structural) totaling around CHF 120,000.
      If it's a Contract, include standard legal boilerplate for architectural services.
      If it's a Brochure, write a persuasive marketing text about the sustainable, modern design of the campus.
      
      Format the output in clean Markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const newDoc: Document = {
        id: Date.now().toString(),
        title: `AI ${type} - ${activeContact.company || 'Client'}`,
        type: type,
        date: new Date().toLocaleDateString(),
        content: response.text || 'Failed to generate content.'
      };

      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
    } catch (error) {
      console.error("Error generating document:", error);
      alert("Failed to generate document. Please check API key and console.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = () => {
    if (printRef.current && selectedDoc) {
      printElementToPdf(printRef.current, selectedDoc.title);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !db) return;

    setIsUploading(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          text += pageText + '\n';
        }
      } else {
        text = await file.text();
      }

      // Generate embeddings for chunks
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const chunks = text.match(/[\s\S]{1,1500}/g) || [];
      
      const embeddedChunks = [];
      for (const chunk of chunks) {
        try {
          const result = await ai.models.embedContent({
            model: 'gemini-embedding-2-preview',
            contents: [chunk],
          });
          const embedding = result.embeddings?.[0]?.values;
          if (embedding) {
            embeddedChunks.push({
              text: chunk,
              embedding
            });
          }
        } catch (err) {
          console.error("Embedding error for chunk:", err);
        }
      }

      const id = `kdoc-${Date.now()}`;
      await setDoc(doc(db, 'knowledgeDocs', id), {
        id,
        title: file.name,
        content: text, // Store full text for reference if needed
        chunks: embeddedChunks, // Store embedded chunks for RAG
        ownerId: currentUser.uid,
        createdAt: Date.now()
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document. Please ensure it is a valid file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteKnowledgeDoc = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'knowledgeDocs', id));
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 flex-1 flex flex-col min-h-0 relative"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM, Docs & Auto-Templates</h1>
          <p className="text-text-muted text-sm mt-1">Address book, contact lists, and dynamic lead forms</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleImportContacts}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Upload size={16} />
            Import CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Contact
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Contacts List */}
        <div className="w-full lg:w-1/3 bg-surface border border-border rounded-xl flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-border bg-surface">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Search contacts..." 
                className="w-full bg-black border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent-ai/50 transition-colors shadow-inner"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-black/30">
            {contacts.map((contact) => (
              <button 
                key={contact.id} 
                onClick={() => setActiveContactId(contact.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl flex items-center gap-4 transition-all duration-200",
                  activeContactId === contact.id 
                    ? "bg-white/5 border border-white/10 shadow-md" 
                    : "bg-surface border bg-white/5 hover:border-white/5"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium shrink-0 shadow-inner",
                  activeContactId === contact.id ? "bg-accent-ai/20 text-accent-ai" : "bg-surface text-text-muted"
                )}>
                  {contact.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", activeContactId === contact.id ? "text-text-primary" : "text-text-primary")}>{contact.name}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5">{contact.role}</p>
                  <p className="text-xs text-text-muted truncate mt-0.5 flex items-center gap-1">
                    <Building size={10} /> {contact.company}
                  </p>
                </div>
                <ChevronRight size={16} className={cn("transition-transform", activeContactId === contact.id ? "text-accent-ai translate-x-1" : "text-transparent")} />
              </button>
            ))}
          </div>
        </div>

        {/* Document Generation / Details */}
        <div className="flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden relative">
          {activeContact ? (
            <>
              {/* Header Profile */}
              <div className="p-6 border-b border-border bg-surface flex items-center justify-between shrink-0">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center text-xl font-medium shadow-lg">
                    {activeContact.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">{activeContact.name}</h2>
                    <p className="text-text-muted flex items-center gap-2 mt-1">
                      <Building size={14} /> {activeContact.company} <span className="text-border">•</span> {activeContact.role}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2.5 bg-surface border border-border rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary">
                    <Mail size={18} />
                  </button>
                  <button className="p-2.5 bg-surface border border-border rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary">
                    <Phone size={18} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border px-6 shrink-0 bg-surface">
                <button 
                  onClick={() => setActiveTab('documents')}
                  className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2", activeTab === 'documents' ? "border-accent-ai text-accent-ai" : "border-transparent text-text-muted hover:text-text-primary")}
                >
                  <FileSignature size={16} /> Documents & Templates
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2", activeTab === 'profile' ? "border-white text-text-primary" : "border-transparent text-text-muted hover:text-text-primary")}
                >
                  <Users size={16} /> Contact Profile
                </button>
                <button 
                  onClick={() => setActiveTab('knowledge')}
                  className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2", activeTab === 'knowledge' ? "border-blue-500 text-blue-400" : "border-transparent text-text-muted hover:text-text-primary")}
                >
                  <BookOpen size={16} /> Knowledge Base
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-black/30">
                {activeTab === 'knowledge' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium flex items-center gap-2">
                        <BookOpen size={18} className="text-blue-400" />
                        Project Knowledge Base
                      </h3>
                      <div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileUpload} 
                          className="hidden" 
                          accept=".txt,.md,.csv,.json"
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-md text-xs font-medium hover:bg-blue-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          Upload Document
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-text-muted">Upload text-based documents (norms, regulations, meeting notes) to allow the AI Concierge to answer questions based on them.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {knowledgeDocs.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-text-muted border border-dashed border-border rounded-xl">
                          No documents uploaded yet.
                        </div>
                      ) : (
                        knowledgeDocs.map((doc) => (
                          <div 
                            key={doc.id} 
                            className="p-4 border border-border rounded-xl bg-surface hover:bg-white/5 transition-all group flex flex-col shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                                  <FileText size={14} />
                                </div>
                                <span className="text-xs font-medium text-text-muted bg-surface px-2 py-0.5 rounded-full">Knowledge</span>
                              </div>
                              <button 
                                onClick={() => handleDeleteKnowledgeDoc(doc.id)}
                                className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <h4 className="text-sm font-semibold text-text-primary mb-1 truncate" title={doc.title}>{doc.title}</h4>
                            <p className="text-xs text-text-muted mt-auto pt-4">{new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {activeTab === 'documents' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium flex items-center gap-2">
                        <Sparkles size={18} className="text-accent-ai" />
                        AI Auto-Templates
                      </h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleGenerateDocument('Quote')}
                          disabled={isGenerating}
                          className="px-3 py-1.5 bg-accent-ai/10 border border-accent-ai/30 text-accent-ai rounded-md text-xs font-medium hover:bg-accent-ai/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <FileOutput size={12} />}
                          Quote
                        </button>
                        <button 
                          onClick={() => handleGenerateDocument('Contract')}
                          disabled={isGenerating}
                          className="px-3 py-1.5 bg-white/5 border border-border text-text-primary rounded-md text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <FileSignature size={12} />}
                          Contract
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documents.map((doc) => (
                        <div 
                          key={doc.id} 
                          onClick={() => setSelectedDoc(doc)}
                          className="p-4 border border-border rounded-xl bg-surface hover:bg-white/5 transition-all cursor-pointer group flex flex-col shadow-sm hover:shadow-md hover:border-white/10"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <div className={cn("p-1.5 rounded-md", doc.type === 'Quote' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500")}>
                                <FileText size={14} />
                              </div>
                              <span className="text-xs font-medium text-text-muted bg-surface px-2 py-0.5 rounded-full">{doc.type}</span>
                            </div>
                            <button className="text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              <Download size={16} />
                            </button>
                          </div>
                          <h4 className="text-sm font-semibold text-text-primary mb-1">{doc.title}</h4>
                          <p className="text-xs text-text-muted mt-auto pt-4">{doc.date}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div className="space-y-6 animate-in fade-in max-w-2xl">
                    <h3 className="font-medium">Contact Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-surface border border-border rounded-xl shadow-sm">
                        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1 flex items-center gap-2"><Mail size={12}/> Email</p>
                        <p className="text-sm font-medium">{activeContact.email || 'N/A'}</p>
                      </div>
                      <div className="p-4 bg-surface border border-border rounded-xl shadow-sm">
                        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1 flex items-center gap-2"><Phone size={12}/> Phone</p>
                        <p className="text-sm font-medium">{activeContact.phone || 'N/A'}</p>
                      </div>
                      <div className="p-4 bg-surface border border-border rounded-xl shadow-sm md:col-span-2">
                        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1 flex items-center gap-2"><Building size={12}/> Company Address</p>
                        <p className="text-sm font-medium">Munich Tech Campus, Building A<br/>80331 Munich, Germany</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Document Preview Modal / Overlay */}
              {selectedDoc && (
                <div className="absolute inset-0 z-20 bg-surface flex flex-col animate-in slide-in-from-bottom-8 duration-300">
                  <div className="p-4 border-b border-border flex items-center justify-between bg-surface/80 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedDoc(null)} className="p-1.5 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors">
                        <X size={18} />
                      </button>
                      <h3 className="font-semibold">{selectedDoc.title}</h3>
                      <span className="text-xs font-medium text-text-muted bg-white/5 px-2 py-0.5 rounded-full">{selectedDoc.type}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleExportPDF} className="px-3 py-1.5 hover:bg-white/10 border border-border rounded-md text-xs font-medium transition-colors flex items-center gap-2">
                        <Download size={14} /> PDF
                      </button>
                      <button className="px-3 py-1.5 bg-accent-ai text-text-primary rounded-md text-xs font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20">
                        Send to Client
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 bg-black flex justify-center">
                    <div ref={printRef} className="w-full max-w-3xl bg-white text-black p-12 rounded-sm shadow-2xl min-h-[800px]">
                      <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-blue-600">
                        {selectedDoc.content.split('\n').map((line, i) => {
                          if (line.startsWith('# ')) return <h1 key={i} className="text-3xl mb-6">{line.substring(2)}</h1>;
                          if (line.startsWith('## ')) return <h2 key={i} className="text-xl mt-8 mb-4 border-b pb-2">{line.substring(3)}</h2>;
                          if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.substring(2)}</li>;
                          if (line.startsWith('**') && line.includes('**', 2)) {
                            const parts = line.split('**');
                            return <p key={i} className="mb-2"><strong>{parts[1]}</strong>{parts[2]}</p>;
                          }
                          if (line.trim() === '') return <br key={i} />;
                          return <p key={i} className="mb-2">{line}</p>;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-text-muted bg-black/30">
              <Users size={48} className="opacity-20 mb-4" />
              <p className="font-medium text-text-primary">No Contact Selected</p>
              <p className="text-sm mt-1">Select a contact from the list to view their profile and documents.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">New Contact</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={newContact.name}
                  onChange={e => setNewContact({...newContact, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Role</label>
                  <input 
                    type="text" 
                    value={newContact.role}
                    onChange={e => setNewContact({...newContact, role: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Company</label>
                  <input 
                    type="text" 
                    value={newContact.company}
                    onChange={e => setNewContact({...newContact, company: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
                  <input 
                    type="email" 
                    value={newContact.email}
                    onChange={e => setNewContact({...newContact, email: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Phone</label>
                  <input 
                    type="text" 
                    value={newContact.phone}
                    onChange={e => setNewContact({...newContact, phone: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
