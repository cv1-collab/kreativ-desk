import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Filter, Plus, Smartphone, MessageSquare, X, Camera, MapPin, User, ChevronRight, LayoutGrid, List, Sparkles, Loader2, Upload, ChevronsUp, ChevronUp, Equal, ChevronDown, Circle, CircleDashed, CheckCircle, Download, FileOutput, Mic, Square } from 'lucide-react';
import { cn } from '../utils';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { printElementToPdf } from '../utils/pdfHelper';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';
import { storage } from '../firebase';

interface Defect {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  date: string;
  trade: string;
  location: string;
  description: string;
  imageUrl?: string;
  ownerId?: string;
}

export default function Defects() {
  const { currentUser } = useAuth();
  const [defects, setDefects] = useState<Defect[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [newDefect, setNewDefect] = useState({ title: '', priority: 'Medium', assignee: 'Unassigned', trade: 'Architecture', location: '', description: '', imageUrl: '' });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsAnalyzing(true);
        
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
            const prompt = `Analyze this voice note from a construction site manager reporting a defect.
            Return a JSON object with the following keys:
            - title: A short, descriptive title (max 5 words).
            - trade: The most likely trade responsible (must be one of: Architecture, HVAC, Electrical, Plumbing, Structural).
            - priority: Estimated priority (Low, Medium, High, Critical).
            - description: A brief professional description of the issue mentioned in the audio.
            - location: The location mentioned in the audio (e.g. "2. OG", "Keller").
            
            Do not include markdown formatting like \`\`\`json, just return the raw JSON string.`;

            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [
                { inlineData: { data: base64Audio, mimeType: 'audio/webm' } },
                { text: prompt }
              ]
            });

            let text = response.text?.trim() || '';
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
              text = match[0];
            } else {
              text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
            }

            if (text) {
              const aiData = JSON.parse(text);
              setNewDefect(prev => ({
                ...prev,
                title: aiData.title || prev.title,
                trade: aiData.trade || prev.trade,
                priority: aiData.priority || prev.priority,
                description: aiData.description || prev.description,
                location: aiData.location || prev.location
              }));
              setIsModalOpen(true);
            }
            setIsAnalyzing(false);
          };
        } catch (error) {
          console.error("Audio AI Analysis failed:", error);
          setIsAnalyzing(false);
          alert("Audio analysis failed. Please try again or fill manually.");
        }
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const handleStopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleExportExcel = () => {
    const data = defects.map(d => ({
      ID: d.id,
      Titel: d.title,
      Status: d.status,
      Priorität: d.priority,
      Gewerk: d.trade,
      Ort: d.location,
      Datum: d.date,
      Zuständig: d.assignee,
      Beschreibung: d.description
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mängel");
    XLSX.writeFile(wb, `Maengelbericht_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    if (printRef.current) {
      printElementToPdf(printRef.current, `Maengelbericht_${new Date().toISOString().split('T')[0]}`);
    }
  };

  useEffect(() => {
    if (!currentUser || !db || currentUser.uid === 'demo-user') return;
    const q = query(collection(db, 'defects'), where('ownerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDefects(snapshot.docs.map(doc => doc.data() as Defect));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'defects'));
    return () => unsubscribe();
  }, [currentUser]);

  const handleAddDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDefect.title || !currentUser || !db) return;

    const id = `def-${Date.now()}`;
    let finalImageUrl = newDefect.imageUrl;

    try {
      if (imageFile && storage) {
        const storageRef = ref(storage, `defects/${id}/${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      }

      const defectPayload: Defect = {
        ...newDefect,
        imageUrl: finalImageUrl,
        id,
        status: 'To Do',
        date: new Date().toISOString().split('T')[0],
        ownerId: currentUser.uid
      };
      
      await setDoc(doc(db, 'defects', id), defectPayload);
      
      // Proactive AI Check: If critical, check budget and notify
      if (defectPayload.priority === 'Critical' || defectPayload.priority === 'High') {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        const prompt = `A new critical defect has been reported: "${defectPayload.title}" (${defectPayload.trade}). 
        Description: ${defectPayload.description}.
        Analyze if this defect could impact the project budget or timeline. 
        Return a short, urgent warning message (max 2 sentences) that will be sent to the project manager's dashboard.`;
        
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          
          if (response.text) {
            // Create a notification
            const notifId = `notif-${Date.now()}`;
            await setDoc(doc(db, 'notifications', notifId), {
              id: notifId,
              title: 'AI Warning: Budget Risk',
              message: response.text,
              type: 'warning',
              read: false,
              createdAt: Date.now(),
              ownerId: currentUser.uid
            });
          }
        } catch (aiErr) {
          console.error("Proactive AI check failed:", aiErr);
        }
      }

      setIsModalOpen(false);
      setNewDefect({ title: '', priority: 'Medium', assignee: 'Unassigned', trade: 'Architecture', location: '', description: '', imageUrl: '' });
      setImageFile(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'defects/' + id);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedDefect || !currentUser || !db) return;
    
    try {
      await updateDoc(doc(db, 'defects', selectedDefect.id), { status: newStatus });
      setSelectedDefect({ ...selectedDefect, status: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'defects/' + selectedDefect.id);
    }
  };

  const handleImageUploadAndAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setIsAnalyzing(true);
    try {
      // Create local URL for preview
      const imageUrl = URL.createObjectURL(file);
      setNewDefect(prev => ({ ...prev, imageUrl }));

      // Convert file to base64 for Gemini
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Analyze this construction site defect photo. 
        Return a JSON object with the following keys:
        - title: A short, descriptive title (max 5 words).
        - trade: The most likely trade responsible (must be one of: Architecture, HVAC, Electrical, Plumbing, Structural).
        - priority: Estimated priority (Low, Medium, High, Critical).
        - description: A brief professional description of the issue seen in the photo.
        
        Do not include markdown formatting like \`\`\`json, just return the raw JSON string.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: prompt }
          ]
        });

        let text = response.text?.trim() || '';
        
        // Try to extract JSON object if there's conversational text
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          text = match[0];
        } else {
          text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        }

        if (text) {
          const aiData = JSON.parse(text);
          setNewDefect(prev => ({
            ...prev,
            title: aiData.title || prev.title,
            trade: aiData.trade || prev.trade,
            priority: aiData.priority || prev.priority,
            description: aiData.description || prev.description
          }));
        }
        setIsAnalyzing(false);
      };
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setIsAnalyzing(false);
      alert("AI analysis failed. Please fill the details manually.");
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical': return <ChevronsUp size={16} className="text-red-500" />;
      case 'High': return <ChevronUp size={16} className="text-orange-500" />;
      case 'Medium': return <Equal size={16} className="text-yellow-500" />;
      case 'Low': return <ChevronDown size={16} className="text-blue-500" />;
      default: return <Equal size={16} className="text-text-muted" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Done': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'In Progress': return <Circle size={16} className="text-blue-500 fill-blue-500/20" />;
      case 'In Review': return <Circle size={16} className="text-purple-500 fill-purple-500/20" />;
      default: return <CircleDashed size={16} className="text-text-muted" />;
    }
  };

  const renderDefectCard = (defect: Defect) => {
    if (viewMode === 'list') {
      return (
        <div 
          key={defect.id} 
          onClick={() => setSelectedDefect(defect)}
          className={cn(
            "group flex items-center gap-3 p-2.5 border-b border-border/50 transition-all cursor-pointer",
            selectedDefect?.id === defect.id 
              ? "bg-white/5 border-zinc-600 shadow-sm rounded-lg" 
              : "hover:bg-white/5 rounded-lg border-transparent"
          )}
        >
          <div className="shrink-0" title={`Priority: ${defect.priority}`}>
            {getPriorityIcon(defect.priority)}
          </div>
          <span className="text-[11px] font-mono text-text-muted w-16 shrink-0">{defect.id}</span>
          <div className="flex items-center gap-1.5 w-32 shrink-0" title={`Status: ${defect.status}`}>
            {getStatusIcon(defect.status)}
            <span className="text-xs text-text-muted truncate">{defect.status}</span>
          </div>
          <h4 className="text-sm font-medium text-text-primary flex-1 truncate">{defect.title}</h4>
          <span className="text-[11px] font-medium text-text-muted border border-border px-1.5 py-0.5 rounded-sm shrink-0 w-24 truncate text-center">
            {defect.trade}
          </span>
          <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-medium border border-border text-text-primary shrink-0" title={defect.assignee}>
            {defect.assignee !== 'Unassigned' ? defect.assignee.split(' ').map(n => n[0]).join('') : '?'}
          </div>
        </div>
      );
    }

    return (
      <div 
        key={defect.id} 
        onClick={() => setSelectedDefect(defect)}
        className={cn(
          "group p-3 border rounded-lg transition-all cursor-pointer flex flex-col gap-2",
          selectedDefect?.id === defect.id 
            ? "bg-white/5 border-zinc-600 shadow-md" 
            : "bg-surface bg-white/5 hover:border-zinc-700"
        )}
      >
        {defect.imageUrl && (
          <div className="w-full h-32 rounded-md overflow-hidden mb-1 border border-border/50">
            <img src={defect.imageUrl} alt="Defect" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        )}
        <div className="flex items-start gap-3 w-full">
          <div className="mt-0.5 shrink-0" title={`Priority: ${defect.priority}`}>
            {getPriorityIcon(defect.priority)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-text-muted">{defect.id}</span>
            </div>
            <h4 className="text-sm font-medium text-text-primary truncate">{defect.title}</h4>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="text-[10px] font-medium border border-border px-1.5 py-0.5 rounded-sm">{defect.trade}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-medium border border-border text-text-primary" title={defect.assignee}>
              {defect.assignee !== 'Unassigned' ? defect.assignee.split(' ').map(n => n[0]).join('') : '?'}
            </div>
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-semibold tracking-tight">Defect Management</h1>
          <p className="text-text-muted text-sm mt-1">Construction site defects and acceptance protocols</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-surface border border-border rounded-md p-1 mr-2">
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn("p-1.5 rounded-sm transition-colors", viewMode === 'kanban' ? "bg-white/5 text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary")}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded-sm transition-colors", viewMode === 'list' ? "bg-white/5 text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary")}
            >
              <List size={16} />
            </button>
          </div>
          <button 
            onClick={handleExportExcel}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Excel Export
          </button>
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <FileOutput size={16} />
            PDF Export
          </button>
          <button className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
            <Filter size={16} />
            Filter
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            New Defect
          </button>
          {isRecordingAudio ? (
            <button 
              onClick={handleStopAudioRecording}
              className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/50 rounded-md text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2 animate-pulse"
            >
              <Square size={16} fill="currentColor" />
              Stop Recording
            </button>
          ) : (
            <button 
              onClick={handleStartAudioRecording}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
              Audio-to-Ticket
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Task Tracker List / Kanban */}
        <div ref={printRef} className="flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle size={18} className="text-text-muted" />
              {viewMode === 'kanban' ? 'Defect Board' : 'Open Issues'}
            </h3>
            <div className="flex gap-2 text-sm">
              <span className="px-2 py-1 bg-white/5 rounded-md border border-border">All ({defects.length})</span>
              <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded-md border border-orange-500/20">
                Critical ({defects.filter(d => d.priority === 'Critical').length})
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {defects.length === 0 ? (
              <div className="p-8 text-center text-text-muted flex flex-col items-center justify-center h-full">
                <CheckCircle2 size={48} className="mb-4 text-zinc-700" />
                <p>No open defects. Great job!</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 p-2.5 border-b border-border/50 text-xs font-medium text-text-muted">
                  <div className="w-4 shrink-0"></div>
                  <span className="w-16 shrink-0">ID</span>
                  <span className="w-32 shrink-0">Status</span>
                  <span className="flex-1">Title</span>
                  <span className="w-24 shrink-0 text-center">Trade</span>
                  <span className="w-5 shrink-0"></span>
                </div>
                <div className="space-y-0.5 overflow-y-auto pt-1">
                  {defects.map(renderDefectCard)}
                </div>
              </div>
            ) : (
              <div className="flex gap-4 h-full overflow-x-auto pb-2">
                {['To Do', 'In Progress', 'In Review', 'Done'].map(status => (
                  <div key={status} className="flex-1 min-w-[300px] bg-black/30 rounded-lg border border-border/50 flex flex-col">
                    <div className="p-3 border-b border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <h4 className="font-medium text-sm text-text-primary">{status}</h4>
                      </div>
                      <span className="text-xs font-mono text-text-muted">{defects.filter(d => d.status === status).length}</span>
                    </div>
                    <div className="p-2 space-y-2 overflow-y-auto flex-1">
                      {defects.filter(d => d.status === status).map(renderDefectCard)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Details Panel (Slide-out or side panel) */}
        {selectedDefect ? (
          <div className="w-full lg:w-[400px] bg-surface border border-border rounded-xl flex flex-col shrink-0 overflow-hidden animate-in slide-in-from-right-8 duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <h3 className="font-medium flex items-center gap-2">
                Defect Details
              </h3>
              <button onClick={() => setSelectedDefect(null)} className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-text-muted bg-black px-2 py-1 rounded">{selectedDefect.id}</span>
                  <div className="flex items-center gap-1.5 text-xs font-medium" title={`Priority: ${selectedDefect.priority}`}>
                    {getPriorityIcon(selectedDefect.priority)}
                    <span className={cn(
                      selectedDefect.priority === 'Critical' ? "text-red-500" :
                      selectedDefect.priority === 'High' ? "text-orange-500" :
                      selectedDefect.priority === 'Medium' ? "text-yellow-500" : "text-blue-500"
                    )}>{selectedDefect.priority}</span>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-text-primary leading-tight">{selectedDefect.title}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface p-3 rounded-lg border border-border">
                  <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5"><User size={14}/> Assignee</p>
                  <p className="text-sm font-medium">{selectedDefect.assignee}</p>
                </div>
                <div className="bg-surface p-3 rounded-lg border border-border">
                  <p className="text-xs text-text-muted mb-1 flex items-center gap-1.5"><MapPin size={14}/> Location</p>
                  <p className="text-sm font-medium">{selectedDefect.location || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Description</h4>
                <p className="text-sm text-text-primary leading-relaxed bg-surface p-3 rounded-lg border border-border/50">
                  {selectedDefect.description || 'No description provided.'}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-text-muted mb-2">Photo / Evidence</h4>
                {selectedDefect.imageUrl ? (
                  <div className="bg-surface rounded-lg border border-border overflow-hidden">
                    <img src={selectedDefect.imageUrl} alt="Defect Evidence" className="w-full h-auto" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="aspect-video bg-surface rounded-lg border border-dashed border-zinc-700 flex flex-col items-center justify-center text-text-muted">
                    <Camera size={32} className="mb-2 opacity-50" />
                    <span className="text-xs font-medium">No photo provided</span>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-text-muted mb-3">Update Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['To Do', 'In Progress', 'In Review', 'Done'].map(status => (
                    <button 
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={cn(
                        "py-2 px-3 rounded-lg text-sm font-medium transition-colors border flex items-center gap-2",
                        selectedDefect.status === status 
                          ? "bg-white/5 text-text-primary border-zinc-600" 
                          : "bg-surface text-text-muted border-border hover:bg-white/5 hover:text-text-primary"
                      )}
                    >
                      {getStatusIcon(status)}
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex w-[400px] bg-surface border border-border rounded-xl flex-col shrink-0 items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4 border border-border">
              <CheckCircle2 size={24} className="text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">No Defect Selected</h3>
            <p className="text-sm text-text-muted">Select a defect from the list to view its details, update status, or add photos.</p>
          </div>
        )}
      </div>

      {/* Add Defect Modal (Desktop) */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Report New Defect</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddDefect} className="space-y-4">
              {/* AI Image Upload */}
              <div className="mb-6">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUploadAndAnalyze}
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative",
                    newDefect.imageUrl ? "border-accent-ai/50 bg-accent-ai/5" : "border-zinc-700 bg-surface hover:bg-white/5 hover:border-zinc-600"
                  )}
                >
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center text-accent-ai">
                      <Loader2 size={24} className="animate-spin mb-2" />
                      <span className="text-sm font-medium">AI is analyzing photo...</span>
                    </div>
                  ) : newDefect.imageUrl ? (
                    <>
                      <img src={newDefect.imageUrl} alt="Preview" className="w-full h-full object-cover opacity-50" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-text-primary">
                        <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
                        <span className="text-sm font-medium shadow-black drop-shadow-md">Photo Analyzed</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-text-muted">
                      <div className="p-3 bg-white/5 rounded-full mb-2">
                        <Sparkles size={20} className="text-accent-ai" />
                      </div>
                      <span className="text-sm font-medium text-text-primary mb-1">Upload Photo for AI Analysis</span>
                      <span className="text-xs">Auto-fills details based on image</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Title</label>
                <input 
                  type="text" 
                  value={newDefect.title}
                  onChange={e => setNewDefect({...newDefect, title: e.target.value})}
                  className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Trade</label>
                  <select 
                    value={newDefect.trade}
                    onChange={e => setNewDefect({...newDefect, trade: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  >
                    <option>Architecture</option>
                    <option>HVAC</option>
                    <option>Electrical</option>
                    <option>Plumbing</option>
                    <option>Structural</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Location</label>
                  <input 
                    type="text" 
                    value={newDefect.location}
                    onChange={e => setNewDefect({...newDefect, location: e.target.value})}
                    placeholder="e.g. Level 2, Room 204"
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Priority</label>
                  <select 
                    value={newDefect.priority}
                    onChange={e => setNewDefect({...newDefect, priority: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Assignee</label>
                  <select 
                    value={newDefect.assignee}
                    onChange={e => setNewDefect({...newDefect, assignee: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  >
                    <option>Unassigned</option>
                    <option>Mark Smith</option>
                    <option>Jane Doe</option>
                    <option>Alex Johnson</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
                <textarea 
                  value={newDefect.description}
                  onChange={e => setNewDefect({...newDefect, description: e.target.value})}
                  className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50 resize-none h-20"
                />
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
                  Submit Defect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
