import React, { useState, useEffect, useRef } from 'react';
import { FileText, Image as ImageIcon, File, Folder, Search, Upload, MoreVertical, Sparkles, Download, Trash2, FileArchive, Loader2, FolderPlus, Link as LinkIcon, Check } from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { db, storage } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI } from '@google/genai';

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  projectId: string | null;
  uploadedAt: string;
  ownerId: string;
  isFolder?: boolean;
}

export default function Documents() {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (!currentUser || !db || currentUser.uid === 'demo-user') return;
    const q = query(collection(db, 'documents'), where('ownerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDocuments(snapshot.docs.map(doc => doc.data() as Document));
    }, (error) => console.error("Documents error:", error));
    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName || !currentUser || !db) return;
    
    const id = `folder-${Date.now()}`;
    const newFolder: Document = {
      id,
      name: folderName,
      url: '#',
      type: 'folder',
      size: 0,
      projectId: null,
      uploadedAt: new Date().toISOString(),
      ownerId: currentUser.uid,
      isFolder: true
    };
    
    try {
      await setDoc(doc(db, 'documents', id), newFolder);
    } catch (err) {
      console.error('Failed to create folder', err);
    }
  };

  const handleCopyLink = (doc: Document) => {
    // In a real app, this would be a real URL
    const link = `https://kreativ-desk.app/share/${doc.id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !db || !storage) return;

    setIsUploading(true);
    try {
      const id = `doc-${Date.now()}`;
      const storageRef = ref(storage, `documents/${currentUser.uid}/${id}-${file.name}`);
      console.log('Starting upload to:', storageRef.fullPath);
      await uploadBytes(storageRef, file);
      console.log('Upload successful, getting download URL...');
      const url = await getDownloadURL(storageRef);
      console.log('Download URL:', url);

      const newDoc: Document = {
        id,
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        projectId: null,
        uploadedAt: new Date().toISOString(),
        ownerId: currentUser.uid,
        isFolder: false
      };

      console.log('Saving to Firestore:', newDoc);
      await setDoc(doc(db, 'documents', id), newDoc);
      console.log('Saved to Firestore successfully');
    } catch (error: any) {
      console.error('Upload error details:', error);
      alert(`Upload error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !currentUser) return;
    
    setIsAiSearch(true);
    setAiResult('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Find PDF documents
      const pdfDocs = documents.filter(d => d.type.includes('pdf') && d.url !== '#');
      
      const parts: any[] = [{ text: `User Query: ${searchQuery}\n\nPlease answer the query based on the provided documents.` }];
      
      // For prototype, just take the first PDF to avoid huge payloads
      if (pdfDocs.length > 0) {
        const docToRead = pdfDocs[0];
        try {
          const response = await fetch(docToRead.url);
          const blob = await response.blob();
          const reader = new FileReader();
          const base64data = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          const base64 = base64data.split(',')[1];
          parts.push({
            inlineData: {
              data: base64,
              mimeType: 'application/pdf'
            }
          });
          parts[0].text += `\n\nDocument Name: ${docToRead.name}`;
        } catch (err) {
          console.error("Failed to load PDF for AI", err);
        }
      } else {
        parts[0].text += `\n\n(No PDF documents found in the hub. Please answer generally or state that no documents are available.)`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts }
      });
      
      setAiResult(response.text || 'No answer generated.');
    } catch (error) {
      console.error('AI Search error:', error);
      setAiResult('Sorry, I encountered an error while searching your documents.');
    }
  };

  const getIcon = (type: string, isFolder?: boolean) => {
    if (isFolder) return <Folder className="text-accent-ai" size={20} fill="currentColor" fillOpacity={0.2} />;
    if (type.includes('pdf')) return <FileText className="text-red-400" size={20} />;
    if (type.includes('image')) return <ImageIcon className="text-emerald-400" size={20} />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchive className="text-blue-400" size={20} />;
    return <File className="text-text-muted" size={20} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 flex-1 flex flex-col min-h-0"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Document Hub</h1>
          <p className="text-text-muted text-sm mt-1">AI-indexed files, plans, and contracts</p>
        </div>
        <div className="flex gap-2 relative">
          <button 
            onClick={handleCreateFolder}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <FolderPlus size={16} />
            New Folder
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 disabled:opacity-70"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Main Content */}
        <div className="flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b border-border bg-surface">
            <form onSubmit={handleAiSearch} className="relative flex items-center">
              <div className="absolute left-3 text-accent-ai">
                <Sparkles size={18} />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask AI about your documents (e.g., 'What is the required corridor width?')" 
                className="w-full bg-background border border-border rounded-md py-3 pl-10 pr-24 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all placeholder:text-text-muted"
              />
              <button 
                type="submit" 
                className="absolute right-2 px-3 py-1.5 hover:bg-white/10 text-text-primary rounded text-xs font-medium transition-colors"
              >
                AI Search
              </button>
            </form>
          </div>

          {/* AI Result Area */}
          {isAiSearch && (
            <div className="p-4 border-b border-border bg-accent-ai/5">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-ai/20 flex items-center justify-center shrink-0">
                  <Sparkles size={16} className="text-accent-ai" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-accent-ai mb-1">AI Document Analysis</h4>
                  {aiResult ? (
                    <p className="text-sm text-text-primary leading-relaxed">{aiResult}</p>
                  ) : (
                    <div className="flex gap-1 items-center h-5">
                      <div className="w-1.5 h-1.5 bg-accent-ai rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-accent-ai rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-accent-ai rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border/50 mb-2">
              <div className="col-span-6">Name</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            
            <div className="space-y-1">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-text-muted">No documents uploaded yet.</div>
              ) : (
                documents.map(doc => (
                  <div key={doc.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-border/50">
                    <div className="col-span-6 flex items-center gap-3">
                      {getIcon(doc.type, doc.isFolder)}
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-medium truncate hover:text-accent-ai transition-colors">{doc.name}</a>
                    </div>
                    <div className="col-span-2 text-sm text-text-muted">{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                    <div className="col-span-2 text-sm text-text-muted">{doc.isFolder ? '--' : formatSize(doc.size)}</div>
                    <div className="col-span-2 flex items-center justify-end gap-3">
                      <span className="text-xs font-medium px-2 py-1 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        {doc.isFolder ? 'folder' : 'indexed'}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleCopyLink(doc); }}
                        className="text-text-muted hover:text-accent-ai opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy Share Link"
                      >
                        {copiedId === doc.id ? <Check size={16} className="text-emerald-500" /> : <LinkIcon size={16} />}
                      </button>
                      <button className="text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex flex-col gap-6 shrink-0">
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="font-medium mb-4 text-sm">Folders</h3>
            <div className="space-y-1">
              {['01_Architecture', '02_Engineering', '03_Contracts', '04_Permits', '05_Site_Photos'].map((folder, i) => (
                <button key={i} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-sm text-text-muted hover:text-text-primary text-left">
                  <Folder size={16} className="text-text-muted" />
                  {folder}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="font-medium mb-4 text-sm">Storage</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-muted">
                <span>45 GB used</span>
                <span>100 GB</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-accent-ai w-[45%] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
