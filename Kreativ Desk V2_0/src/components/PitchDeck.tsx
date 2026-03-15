import React, { useState, useEffect, useRef } from 'react';
import { Presentation, LayoutTemplate, Sparkles, Download, Play, Image as ImageIcon, Wallet, Box, Plus, Loader2, FileText, ChevronRight, ChevronLeft, Maximize2, Upload, Trash2, Printer, X, PieChart, ListTodo, Grid, Table, BarChart3, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { cn } from '../utils';
import { GoogleGenAI, Type } from '@google/genai';
import { printElementToPdf } from '../utils/pdfHelper';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';

interface Slide {
  id: string;
  title: string;
  content: string;
  type: 'title' | 'budget' | '3d_model' | 'notes' | 'text' | 'image' | 'gallery' | 'chart' | 'table';
  order_index: number;
  imageUrl?: string;
  images?: string[];
  tableData?: any[];
  ownerId?: string;
}

export default function PitchDeck() {
  const { currentUser, userRole } = useAuth();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    size: 'A4',
    orientation: 'landscape',
    scale: 100
  });

  useEffect(() => {
    if (!currentUser || !db || currentUser.uid === 'demo-user') return;
    const q = query(collection(db, 'slides'), where('ownerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSlides = snapshot.docs.map(doc => doc.data() as Slide).sort((a, b) => a.order_index - b.order_index);
      setSlides(fetchedSlides);
      if (fetchedSlides.length > 0 && !activeSlideId) {
        setActiveSlideId(fetchedSlides[0].id);
      }
    }, (error) => console.error("Slides error:", error));
    return () => unsubscribe();
  }, [currentUser, activeSlideId]);

  if (userRole && !['Internal', 'Admin'].includes(userRole)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold">Access Denied</h2>
          <p className="text-text-secondary mt-2">You do not have permission to view the Pitch Deck module.</p>
        </div>
      </div>
    );
  }

  const handleAddSlide = async () => {
    if (!currentUser || !db) return;
    const id = `sld-${Date.now()}`;
    const newSlide: Slide = {
      id,
      title: 'New Slide',
      content: 'Click to edit content...',
      type: 'text',
      order_index: slides.length,
      ownerId: currentUser.uid
    };
    
    try {
      await setDoc(doc(db, 'slides', id), newSlide);
      setActiveSlideId(id);
    } catch (err) {
      console.error('Failed to add slide', err);
    }
  };

  const updateSlide = async (id: string, updates: Partial<Slide>) => {
    if (!currentUser || !db) return;
    
    try {
      await updateDoc(doc(db, 'slides', id), updates);
    } catch (err) {
      console.error('Failed to update slide', err);
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!currentUser || !db) return;
    try {
      await deleteDoc(doc(db, 'slides', id));
      const newSlides = slides.filter(s => s.id !== id);
      if (activeSlideId === id) {
        setActiveSlideId(newSlides.length > 0 ? newSlides[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete slide', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, slideId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        updateSlide(slideId, { imageUrl: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportPDF = () => {
    setIsPrintModalOpen(true);
  };

  const executePrint = async () => {
    const element = document.getElementById('pitchdeck-pdf-content');
    if (!element) return;

    // Remove preview-only styles for PDF generation
    const pages = element.querySelectorAll('.pitchdeck-page');
    pages.forEach(p => {
      p.classList.remove('mb-8', 'border', 'border-gray-200', 'shadow-sm');
    });

    try {
      printElementToPdf(element, 'Pitch_Deck_Export');
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      // Restore preview-only styles
      pages.forEach(p => {
        p.classList.add('mb-8', 'border', 'border-gray-200', 'shadow-sm');
      });
      setIsPrintModalOpen(false);
    }
  };

  const handleAIGenerateFullDeck = async () => {
    if (!currentUser || !db) return;
    setIsGenerating(true);
    try {
      // Fetch real data to feed the AI
      const txQuery = query(collection(db, 'transactions'), where('ownerId', '==', currentUser.uid));
      const defectQuery = query(collection(db, 'defects'), where('ownerId', '==', currentUser.uid));
      const notesQuery = query(collection(db, 'audioNotes'), where('ownerId', '==', currentUser.uid));
      const wbQuery = query(collection(db, 'whiteboardExports'), where('ownerId', '==', currentUser.uid));

      const [txSnap, defectSnap, notesSnap, wbSnap] = await Promise.all([
        getDocs(txQuery),
        getDocs(defectQuery),
        getDocs(notesQuery),
        getDocs(wbQuery)
      ]);
      
      const transactions = txSnap.docs.map(d => d.data());
      const defects = defectSnap.docs.map(d => d.data());
      const notes = notesSnap.docs.map(d => d.data());
      const whiteboards = wbSnap.docs.map(d => d.data());

      const totalSpend = transactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
      const criticalDefects = defects.filter((d: any) => d.priority === 'Critical' || d.priority === 'High');
      const latestNote = notes.length > 0 ? notes[0].aiSummary : 'No recent notes.';
      const latestWhiteboard = whiteboards.length > 0 ? whiteboards[0].imageUrl : '';

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `You are an AI assistant for "Kreativ-Desk OS", an architecture and construction management platform.
      Generate a 5-slide pitch deck/status report for a project.
      
      Context data to include:
      - Budget: Total Spend is CHF ${totalSpend.toLocaleString()}.
      - Defects: ${criticalDefects.length} critical/high priority defects open.
      - Recent Notes: ${latestNote}
      
      Return a JSON array of slide objects. Each object must have:
      - title: string
      - content: string (2-3 sentences max)
      - type: string (must be exactly one of: 'title', 'budget', '3d_model', 'notes', 'text', 'image')
      - imageUrl: string (only if type is 'image', provide a descriptive placeholder like 'https://picsum.photos/seed/architecture/800/600')`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                type: { type: Type.STRING },
                imageUrl: { type: Type.STRING }
              },
              required: ["title", "content", "type"]
            }
          }
        }
      });

      let text = response.text?.trim() || '';
      
      // Try to extract JSON array if there's conversational text
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        text = match[0];
      } else {
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      }

      if (text) {
        const generatedSlides = JSON.parse(text);
        
        // Clear existing slides in DB
        const batch = writeBatch(db);
        const existingSlidesQuery = query(collection(db, 'slides'), where('ownerId', '==', currentUser.uid));
        const existingSlidesSnap = await getDocs(existingSlidesQuery);
        existingSlidesSnap.forEach(doc => batch.delete(doc.ref));
        
        const newSlides: Slide[] = [];
        for (let i = 0; i < generatedSlides.length; i++) {
          const s = generatedSlides[i];
          let imgUrl = s.imageUrl;
          // If the AI generated an image slide and we have a whiteboard export, use it!
          if (s.type === 'image' && latestWhiteboard && i === generatedSlides.length - 1) {
             imgUrl = latestWhiteboard;
          }

          const id = `sld-${Date.now()}-${i}`;
          const newSlide: Slide = {
            id,
            title: s.title,
            content: s.content,
            type: ['title', 'budget', '3d_model', 'notes', 'text', 'image', 'gallery', 'chart', 'table'].includes(s.type) ? s.type : 'text' as any,
            imageUrl: imgUrl,
            order_index: i,
            ownerId: currentUser.uid
          };
          
          batch.set(doc(db, 'slides', id), newSlide);
          newSlides.push(newSlide);
        }
        
        await batch.commit();
        if (newSlides.length > 0) setActiveSlideId(newSlides[0].id);
      }
    } catch (err) {
      console.error('Failed to generate slides', err);
      alert("AI Generation failed. Check API key and console.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeSlide = slides.find(s => s.id === activeSlideId);
  const activeIndex = slides.findIndex(s => s.id === activeSlideId);

  const nextSlide = () => {
    if (activeIndex < slides.length - 1) setActiveSlideId(slides[activeIndex + 1].id);
  };

  const prevSlide = () => {
    if (activeIndex > 0) setActiveSlideId(slides[activeIndex - 1].id);
  };

  const EditableTitle = ({ slide, className, isPrintView }: { slide: Slide, className?: string, isPrintView?: boolean }) => {
    if (isPrintView) {
      return <div className={cn("w-full", className)}>{slide.title}</div>;
    }
    return (
      <input 
        value={slide.title} 
        onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
        className={cn("bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-blue-500 outline-none transition-colors w-full", className)}
        placeholder="Slide Title"
      />
    );
  };

  const EditableContent = ({ slide, className, isPrintView }: { slide: Slide, className?: string, isPrintView?: boolean }) => {
    if (isPrintView) {
      return <div className={cn("w-full whitespace-pre-wrap", className)}>{slide.content}</div>;
    }
    return (
      <textarea 
        value={slide.content} 
        onChange={(e) => updateSlide(slide.id, { content: e.target.value })}
        className={cn("bg-transparent border border-transparent hover:border-zinc-200 focus:border-blue-500 outline-none transition-colors w-full resize-none", className)}
        placeholder="Slide Content..."
        rows={5}
      />
    );
  };

  const renderSlideContent = (slide: Slide, isPrintView = false) => {
    switch (slide.type) {
      case 'title':
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <EditableTitle slide={slide} isPrintView={isPrintView} className="text-6xl font-bold text-zinc-900 tracking-tight mb-6 text-center" />
            <div className="w-24 h-1.5 bg-blue-600 mb-8 mx-auto"></div>
            <EditableContent slide={slide} isPrintView={isPrintView} className="text-2xl text-zinc-600 max-w-2xl text-center" />
          </div>
        );
      case 'budget':
        return (
          <div className="flex-1 flex flex-col">
            <EditableTitle slide={slide} isPrintView={isPrintView} className="text-4xl font-bold text-zinc-900 tracking-tight mb-8" />
            <div className="grid grid-cols-2 gap-12 flex-1">
              <EditableContent slide={slide} isPrintView={isPrintView} className="text-xl text-zinc-700 leading-relaxed" />
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-200 flex flex-col justify-center shadow-inner">
                <h3 className="text-xl font-semibold text-zinc-800 mb-6 flex items-center gap-2"><Wallet className="text-blue-600"/> Budget Overview</h3>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className="text-5xl font-bold text-zinc-900">CHF 4.2M</div>
                    <div className="text-base text-text-muted font-medium mt-1">Current Spend</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-zinc-700">CHF 5.0M</div>
                    <div className="text-base text-text-muted font-medium mt-1">Total Limit</div>
                  </div>
                </div>
                <div className="w-full h-4 bg-zinc-200 rounded-full mt-6 overflow-hidden shadow-inner">
                  <div className="h-full bg-blue-600 w-[84%] rounded-full"></div>
                </div>
                <div className="mt-4 text-right text-sm font-bold text-emerald-600">On Track (84%)</div>
              </div>
            </div>
          </div>
        );
      case '3d_model':
        return (
          <div className="flex-1 flex flex-col">
            <EditableTitle slide={slide} isPrintView={isPrintView} className="text-4xl font-bold text-zinc-900 tracking-tight mb-8" />
            <div className="grid grid-cols-2 gap-12 flex-1">
              <EditableContent slide={slide} isPrintView={isPrintView} className="text-xl text-zinc-700 leading-relaxed" />
              <div className="bg-zinc-100 rounded-2xl border border-zinc-200 overflow-hidden relative shadow-inner flex items-center justify-center">
                <img src="https://picsum.photos/seed/bim/800/600" alt="3D Model Render" className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-multiply" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-text-primary">
                  <div className="flex items-center gap-2 mb-1">
                    <Box size={18} className="text-blue-400" />
                    <span className="font-semibold tracking-wide">BIM VIEWER EXPORT</span>
                  </div>
                  <p className="text-sm text-text-primary">Level 2 - Structural & HVAC</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="flex-1 flex flex-col">
            <EditableTitle slide={slide} isPrintView={isPrintView} className="text-4xl font-bold text-zinc-900 tracking-tight mb-8" />
            <div className="grid grid-cols-2 gap-12 flex-1">
              <EditableContent slide={slide} isPrintView={isPrintView} className="text-xl text-zinc-700 leading-relaxed" />
              <div className="bg-zinc-100 rounded-2xl border border-zinc-200 overflow-hidden relative shadow-inner flex items-center justify-center group">
                {slide.imageUrl ? (
                  <img src={slide.imageUrl} alt="Slide Image" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex flex-col items-center text-text-muted">
                    <ImageIcon size={48} className="mb-2 opacity-50" />
                    <p className="text-sm font-medium">No Image Uploaded</p>
                  </div>
                )}
                {!isPrintView && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => handleImageUpload(e, slide.id)} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white text-black rounded-md text-sm font-medium flex items-center gap-2">
                      <Upload size={16} /> Upload Image
                    </button>
                    <button onClick={() => {
                      const newUrl = prompt('Or enter image URL:', slide.imageUrl || '');
                      if (newUrl) updateSlide(slide.id, { imageUrl: newUrl });
                    }} className="px-4 py-2 bg-white text-black rounded-md text-sm font-medium">
                      URL
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'notes':
        return (
          <div className="flex-1 flex flex-col">
            <EditableTitle slide={slide} isPrintView={isPrintView} className="text-4xl font-bold text-zinc-900 tracking-tight mb-8" />
            <div className="grid grid-cols-2 gap-12 flex-1">
              <EditableContent slide={slide} isPrintView={isPrintView} className="text-xl text-zinc-700 leading-relaxed" />
              <div className="bg-yellow-50 p-8 rounded-2xl border border-yellow-200 shadow-sm relative">
                <div className="absolute top-0 right-8 w-12 h-4 bg-yellow-200/50 -translate-y-1/2 rounded-full"></div>
                <h3 className="text-xl font-semibold text-yellow-900 mb-6 flex items-center gap-2"><FileText className="text-yellow-600"/> Recent Field Notes</h3>
                <ul className="space-y-4 text-yellow-800 text-lg">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 shrink-0"></div>
                    <p>Client approved premium facade panels yesterday.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 shrink-0"></div>
                    <p>HVAC routing clash on Level 2 identified and assigned to engineering.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );
      case 'gallery':
        return (
          <div className="flex-1 flex flex-col">
            <EditableTitle slide={slide} isPrintView={isPrintView} className="text-4xl font-bold text-zinc-900 tracking-tight mb-8" />
            <div className="grid grid-cols-2 gap-4 flex-1">
              {(slide.images || []).map((img, idx) => (
                <div key={idx} className="bg-zinc-100 rounded-xl border border-zinc-200 overflow-hidden relative shadow-inner aspect-video">
                  <img src={img} alt={`Gallery ${idx}`} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {!isPrintView && (
                    <button 
                      onClick={() => {
                        const newImages = [...(slide.images || [])];
                        newImages.splice(idx, 1);
                        updateSlide(slide.id, { images: newImages });
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-text-primary rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {(!slide.images || slide.images.length < 4) && !isPrintView && (
                <div className="bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-text-muted hover:bg-zinc-100 hover:border-blue-400 transition-colors cursor-pointer aspect-video"
                     onClick={() => {
                       const newUrl = prompt('Enter image URL for gallery (e.g., https://picsum.photos/seed/arch/800/600):');
                       if (newUrl) {
                         const currentImages = slide.images || [];
                         updateSlide(slide.id, { images: [...currentImages, newUrl] });
                       }
                     }}>
                  <Plus size={32} className="mb-2" />
                  <span className="text-sm font-medium">Add Image</span>
                </div>
              )}
            </div>
          </div>
        );
      case 'chart': {
        const mockChartData = [
          { name: 'Jan', cost: 4000 },
          { name: 'Feb', cost: 3000 },
          { name: 'Mar', cost: 5000 },
          { name: 'Apr', cost: 2780 },
          { name: 'May', cost: 1890 },
          { name: 'Jun', cost: 2390 },
        ];
        return (
          <div className="flex-1 flex flex-col">
            <EditableTitle slide={slide} isPrintView={isPrintView} className="text-4xl font-bold text-zinc-900 tracking-tight mb-8" />
            <div className="flex-1 bg-zinc-50 rounded-2xl border border-zinc-200 p-8 shadow-inner flex flex-col">
              <h3 className="text-xl font-semibold text-zinc-800 mb-6 flex items-center gap-2"><BarChart3 className="text-blue-600"/> Financial Projection</h3>
              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} dx={-10} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      }
      case 'table': {
        const tableData = slide.tableData || [
          { task: 'Foundation Check', status: 'Completed', date: '2023-10-01' },
          { task: 'HVAC Installation', status: 'In Progress', date: '2023-10-15' },
          { task: 'Electrical Wiring', status: 'Pending', date: '2023-11-01' },
          { task: 'Fire Safety Inspection', status: 'Pending', date: '2023-11-10' },
        ];
        return (
          <div className="flex-1 flex flex-col">
            <EditableTitle slide={slide} isPrintView={isPrintView} className="text-4xl font-bold text-zinc-900 tracking-tight mb-8" />
            <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-800 flex items-center gap-2"><ListTodo className="text-emerald-600"/> Project Checklist / Form</h3>
                {!isPrintView && <button className="text-sm text-blue-600 hover:underline font-medium">Edit Template</button>}
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-text-muted text-sm uppercase tracking-wider">
                      <th className="px-6 py-4 font-medium">Task / Item</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Target Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {tableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4 text-zinc-800 font-medium">{row.task}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-semibold",
                            row.status === 'Completed' ? "bg-emerald-100 text-emerald-700" :
                            row.status === 'In Progress' ? "bg-blue-100 text-blue-700" :
                            "bg-zinc-100 text-zinc-600"
                          )}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-text-muted">{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="flex-1 flex flex-col">
            <EditableTitle slide={slide} isPrintView={isPrintView} className="text-4xl font-bold text-zinc-900 tracking-tight mb-8" />
            <EditableContent slide={slide} isPrintView={isPrintView} className="text-xl text-zinc-700 leading-relaxed max-w-3xl" />
          </div>
        );
    }
  };

  const renderPitchDeckContent = () => (
    <div id="pitchdeck-pdf-content" className="flex flex-col bg-white pdf-preview">
      {slides.map((slide, index) => (
        <div key={slide.id} className="pitchdeck-page flex items-center justify-center bg-white mb-8 border border-gray-200 shadow-sm html2pdf__page-break" 
          style={{
            width: printSettings.orientation === 'portrait' ? '794px' : '1123px',
            height: printSettings.orientation === 'portrait' ? '1123px' : '794px',
            pageBreakAfter: 'always'
          }}>
          <div className="bg-white p-12 relative flex flex-col w-full h-full">
            {slide.type !== 'title' && (
              <div className="flex justify-between items-center mb-10 pb-4 border-b border-zinc-200">
                <div className="text-text-muted font-bold tracking-widest text-sm uppercase">Kreativ-Desk OS</div>
                <div className="text-text-muted font-medium text-sm">Munich Tech Campus</div>
              </div>
            )}
            {renderSlideContent(slide, true)}
            <div className="absolute bottom-6 right-12 text-text-muted font-medium text-sm">
              {index + 1} / {slides.length}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 h-full flex flex-col relative print:block print:h-auto print:space-y-0 print:bg-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Presentation Generator</h1>
          <p className="text-text-muted text-sm mt-1">Auto-layout slides combining 3D renders, budget stats, and whiteboard sketches</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export PDF
          </button>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2"
          >
            {isFullscreen ? <Maximize2 size={16} /> : <Play size={16} />}
            {isFullscreen ? 'Exit Fullscreen' : 'Present'}
          </button>
        </div>
      </header>

      <div className={cn("flex-1 flex gap-6 min-h-0 transition-all print:hidden", isFullscreen ? "fixed inset-0 z-50 bg-black p-4" : "flex-col lg:flex-row")}>
        {/* Slide Preview */}
        <div className={cn("flex-1 bg-black border border-border rounded-xl relative flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden", isFullscreen && "border-none rounded-none")}>
          {/* Toolbar */}
          {!isFullscreen && activeSlide && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-surface/80 backdrop-blur-md border border-border rounded-lg p-1.5 flex items-center gap-1 z-10">
              <button onClick={() => updateSlide(activeSlide.id, { type: 'text' })} className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="Text Layout">
                <LayoutTemplate size={18} />
              </button>
              <div className="w-px h-4 bg-border mx-1"></div>
              <button onClick={() => updateSlide(activeSlide.id, { type: '3d_model' })} className="bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="Add 3D Render">
                <Box size={18} />
              </button>
              <button onClick={() => updateSlide(activeSlide.id, { type: 'budget' })} className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="Add Budget Chart">
                <Wallet size={18} />
              </button>
              <button onClick={() => updateSlide(activeSlide.id, { type: 'image' })} className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="Add Image">
                <ImageIcon size={18} />
              </button>
              <button onClick={() => updateSlide(activeSlide.id, { type: 'gallery' })} className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="Image Gallery">
                <Grid size={18} />
              </button>
              <div className="w-px h-4 bg-border mx-1"></div>
              <button onClick={() => updateSlide(activeSlide.id, { type: 'chart' })} className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="Data Chart">
                <BarChart3 size={18} />
              </button>
              <button onClick={() => updateSlide(activeSlide.id, { type: 'table' })} className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="Form / Table">
                <Table size={18} />
              </button>
              <div className="w-px h-4 bg-border mx-1"></div>
              <button onClick={() => handleDeleteSlide(activeSlide.id)} className="p-2 hover:bg-red-500/20 rounded-md text-red-500 transition-colors" title="Delete Slide">
                <Trash2 size={18} />
              </button>
            </div>
          )}

          {/* Slide Canvas */}
          {activeSlide ? (
            <div className={cn(
              "w-full max-w-5xl aspect-video bg-white rounded-lg shadow-2xl relative flex flex-col p-12 transition-transform",
              isFullscreen ? "scale-100" : "scale-90 md:scale-100"
            )}>
              {/* Header */}
              {activeSlide.type !== 'title' && (
                <div className="flex justify-between items-center mb-10 pb-4 border-b border-zinc-200">
                  <div className="text-text-muted font-bold tracking-widest text-sm uppercase">Kreativ-Desk OS</div>
                  <div className="text-text-muted font-medium text-sm">Munich Tech Campus</div>
                </div>
              )}
              
              {renderSlideContent(activeSlide)}
              
              <div className="absolute bottom-6 right-12 text-text-muted font-medium text-sm">
                {activeIndex + 1} / {slides.length}
              </div>

              {/* Navigation Controls (Overlay) */}
              <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button onClick={prevSlide} disabled={activeIndex === 0} className="p-2 hover:bg-black/20 rounded-full text-black/50 disabled:opacity-0">
                  <ChevronLeft size={32} />
                </button>
              </div>
              <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <button onClick={nextSlide} disabled={activeIndex === slides.length - 1} className="p-2 hover:bg-black/20 rounded-full text-black/50 disabled:opacity-0">
                  <ChevronRight size={32} />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-text-muted flex flex-col items-center">
              <Presentation size={48} className="mb-4 opacity-50" />
              <p className="mb-6">No slides available. Create one to get started.</p>
              <div className="flex gap-4">
                <button 
                  onClick={handleAddSlide}
                  className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Slide
                </button>
                <button 
                  onClick={handleAIGenerateFullDeck}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Auto-Generate Deck
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Slide Navigator */}
        {!isFullscreen && (
          <div className="w-full lg:w-72 bg-surface border border-border rounded-xl flex flex-col shrink-0">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <h3 className="font-medium flex items-center gap-2">
                <LayoutTemplate size={18} className="text-text-muted" />
                Deck Overview
              </h3>
            </div>

            <div className="p-4 border-b border-border bg-black/30">
              <button 
                onClick={handleAIGenerateFullDeck}
                disabled={isGenerating}
                className="w-full py-2.5 bg-accent-ai/10 text-accent-ai hover:bg-accent-ai/20 border border-accent-ai/30 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2" 
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'Generating Deck...' : 'Auto-Generate Deck'}
              </button>
              <p className="text-xs text-text-muted mt-2 text-center">Pulls data from Budget, BIM & Audio Hub</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/30">
              {slides.map((slide, i) => (
                <div 
                  key={slide.id} 
                  onClick={() => setActiveSlideId(slide.id)}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all flex gap-3 group",
                    activeSlideId === slide.id ? "bg-white/5 border-accent-ai/50 shadow-md" : "bg-surface border-border hover:bg-white/5 hover:border-zinc-700"
                  )}
                >
                  <div className="w-5 text-center text-xs font-bold text-text-muted mt-0.5">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="aspect-video bg-white rounded-md border border-border/50 mb-2 flex items-center justify-center overflow-hidden relative">
                      {slide.type === 'title' && <div className="text-[8px] font-bold text-black">TITLE</div>}
                      {slide.type === 'budget' && <Wallet size={16} className="text-blue-500" />}
                      {slide.type === '3d_model' && <Box size={16} className="text-blue-500" />}
                      {slide.type === 'notes' && <FileText size={16} className="text-yellow-500" />}
                      {slide.type === 'image' && <ImageIcon size={16} className="text-emerald-500" />}
                      {slide.type === 'gallery' && <Grid size={16} className="text-emerald-500" />}
                      {slide.type === 'chart' && <BarChart3 size={16} className="text-indigo-500" />}
                      {slide.type === 'table' && <Table size={16} className="text-orange-500" />}
                      {slide.type === 'text' && <LayoutTemplate size={16} className="text-text-muted" />}
                    </div>
                    <p className={cn("text-xs font-medium truncate", activeSlideId === slide.id ? "text-text-primary" : "text-text-primary")}>{slide.title}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border bg-surface">
              <button 
                onClick={handleAddSlide}
                className="w-full py-2 hover:bg-white/10 border border-border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Blank Slide
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Print Settings & Preview Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in print:hidden">
          <div className="bg-surface border border-border rounded-xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col md:flex-row overflow-hidden">
            {/* Left: Settings Panel */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border flex flex-col bg-surface shrink-0">
              <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Printer className="text-accent-ai" />
                  PDF Export
                </h2>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-3">Paper Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPrintSettings({...printSettings, size: 'A4'})}
                      className={cn("py-2.5 rounded-md border text-sm font-medium transition-colors", printSettings.size === 'A4' ? "bg-accent-ai/20 border-accent-ai text-accent-ai" : "border-border hover:bg-white/5")}
                    >
                      A4
                    </button>
                    <button 
                      onClick={() => setPrintSettings({...printSettings, size: 'A3'})}
                      className={cn("py-2.5 rounded-md border text-sm font-medium transition-colors", printSettings.size === 'A3' ? "bg-accent-ai/20 border-accent-ai text-accent-ai" : "border-border hover:bg-white/5")}
                    >
                      A3
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-3">Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPrintSettings({...printSettings, orientation: 'portrait'})}
                      className={cn("py-2.5 rounded-md border text-sm font-medium transition-colors", printSettings.orientation === 'portrait' ? "bg-accent-ai/20 border-accent-ai text-accent-ai" : "border-border hover:bg-white/5")}
                    >
                      Portrait
                    </button>
                    <button 
                      onClick={() => setPrintSettings({...printSettings, orientation: 'landscape'})}
                      className={cn("py-2.5 rounded-md border text-sm font-medium transition-colors", printSettings.orientation === 'landscape' ? "bg-accent-ai/20 border-accent-ai text-accent-ai" : "border-border hover:bg-white/5")}
                    >
                      Landscape
                    </button>
                  </div>
                </div>
                <div>
                  <label className="flex justify-between text-sm font-medium text-text-muted mb-3">
                    <span>Scale</span>
                    <span className="text-text-primary bg-white/5 px-2 py-0.5 rounded text-xs">{printSettings.scale}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="30" max="200" step="5"
                    value={printSettings.scale}
                    onChange={(e) => setPrintSettings({...printSettings, scale: parseInt(e.target.value)})}
                    className="w-full accent-accent-ai"
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-2">
                    <span>Fit More</span>
                    <span>Larger Text</span>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border flex flex-col gap-3 bg-surface">
                <button 
                  onClick={executePrint}
                  className="w-full py-2.5 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent-ai/20"
                >
                  <Printer size={16} />
                  Print / Save PDF
                </button>
                <button 
                  onClick={() => setIsPrintModalOpen(false)}
                  className="w-full py-2.5 border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            
            {/* Right: Live Preview Pane */}
            <div className="flex-1 bg-black overflow-auto p-4 md:p-8 flex items-start justify-center relative">
              <div className="absolute top-4 right-4 bg-surface/80 text-text-muted text-xs px-3 py-1.5 rounded-full border border-border backdrop-blur-md z-10">
                Live Print Preview
              </div>
              {/* Paper Container */}
              <div 
                className="transition-all duration-300 ease-in-out origin-top flex flex-col items-center"
                style={{ 
                  transform: `scale(${Math.min(1, (window.innerWidth > 768 ? window.innerWidth - 320 - 64 : window.innerWidth - 32) / (printSettings.orientation === 'portrait' ? 794 : 1123))})`,
                  marginBottom: '100px' // Space for scrolling
                }}
              >
                {/* Scaled Content inside Paper */}
                <div 
                  className="origin-top flex flex-col items-center"
                  style={{
                    transform: `scale(${printSettings.scale / 100})`,
                  }}
                >
                  {renderPitchDeckContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
