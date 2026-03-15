import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, Users, AlertTriangle, ArrowRight, Video, Plus, X, LayoutList, CalendarDays, Download, Shapes, Circle, Square, Triangle, ArrowRight as ArrowRightIcon, GripVertical, Printer, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../utils';
import { printElementToPdf } from '../utils/pdfHelper';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';
import { GoogleGenAI, Type } from '@google/genai';

interface Event {
  id: string;
  title: string;
  date: string;
  type: string;
  description: string;
  time?: string;
  ownerId?: string;
}

interface Track {
  id: string;
  name: string;
}

interface Task {
  id: string;
  trackId: string;
  name: string;
  start: number;
  duration: number;
  color: string;
}

interface Shape {
  id: string;
  type: 'circle' | 'square' | 'triangle' | 'arrow';
  trackId: string;
  start: number;
  color: string;
}

interface AIInsight {
  title: string;
  description: string;
  type: 'warning' | 'info';
  suggestedAction?: string;
}

export default function Calendar() {
  const { currentUser } = useAuth();
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');
  const [calendarMode, setCalendarMode] = useState<'year' | 'month' | 'day'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '10:00', type: 'Meeting', description: '' });

  // Timeline State (Annual Gantt)
  const [tracks, setTracks] = useState<Track[]>([
    { id: '1', name: 'Phase 1: Konzeption' },
    { id: '2', name: 'Phase 2: Prototyping' },
    { id: '3', name: 'Phase 3: Realisation' },
    { id: '4', name: 'Rollout & Event' },
  ]);
  const [tasks, setTasks] = useState<Task[]>([
    { id: 't1', trackId: '1', name: 'Projekt Setup', start: 1, duration: 4, color: 'bg-blue-500' },
    { id: 't2', trackId: '1', name: 'Design & Entwurf', start: 5, duration: 6, color: 'bg-purple-500' },
    { id: 't3', trackId: '2', name: 'Engineering', start: 11, duration: 8, color: 'bg-orange-500' },
    { id: 't4', trackId: '3', name: 'Produktion Trailer', start: 19, duration: 12, color: 'bg-emerald-500' },
    { id: 't5', trackId: '4', name: 'Roadshow Start', start: 31, duration: 4, color: 'bg-rose-500' },
  ]);
  
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draggedTool, setDraggedTool] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ trackId: '', name: 'Neuer Meilenstein', start: 1, duration: 4, color: 'bg-blue-500' });

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    size: 'A4',
    orientation: 'landscape',
    scale: 100
  });

  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);

  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const colors = [
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Emerald', value: 'bg-emerald-500' },
    { name: 'Orange', value: 'bg-orange-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Rose', value: 'bg-rose-500' },
    { name: 'Zinc', value: 'bg-zinc-500' },
  ];

  const analyzeSchedule = async () => {
    if (!currentUser || !db) return;
    setIsAnalyzing(true);
    try {
      // Fetch some context data (e.g., transactions to simulate financial delay detection)
      const transactionsSnapshot = await getDocs(query(collection(db, 'transactions'), where('ownerId', '==', currentUser.uid)));
      const transactions = transactionsSnapshot.docs.map(doc => doc.data());

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const prompt = `
        Analyze the following project schedule and financial data to identify potential scheduling conflicts or risks.
        
        Tasks (Gantt Chart):
        ${JSON.stringify(tasks, null, 2)}
        
        Events (Calendar):
        ${JSON.stringify(events, null, 2)}
        
        Recent Financial Transactions (for context on material delays or budget issues):
        ${JSON.stringify(transactions.slice(0, 5), null, 2)}
        
        Generate ONE critical insight or warning about the schedule. For example, if a task seems too short, or if there's a potential delay based on typical construction/event planning risks.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Short title of the conflict or insight" },
              description: { type: Type.STRING, description: "Detailed description of the issue and its impact" },
              type: { type: Type.STRING, enum: ['warning', 'info'], description: "Type of insight" },
              suggestedAction: { type: Type.STRING, description: "Suggested action to resolve the issue (e.g., 'Move task by 3 days')" }
            },
            required: ["title", "description", "type"]
          }
        }
      });

      if (response.text) {
        setAiInsight(JSON.parse(response.text));
      }
    } catch (error) {
      console.error("Error analyzing schedule:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !db || currentUser.uid === 'demo-user') return;
    const q = query(collection(db, 'events'), where('ownerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => doc.data() as Event));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'events'));
    return () => unsubscribe();
  }, [currentUser]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date || !currentUser || !db) return;

    const id = `evt-${Date.now()}`;
    const eventPayload: Event = {
      ...newEvent,
      id,
      ownerId: currentUser.uid
    };

    try {
      await setDoc(doc(db, 'events', id), eventPayload);
      setIsModalOpen(false);
      setNewEvent({ title: '', date: '', time: '10:00', type: 'Meeting', description: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `events/${id}`);
    }
  };

  const handleExportPDF = () => {
    setIsPrintModalOpen(true);
  };

  const executePrint = async () => {
    const element = document.getElementById('calendar-pdf-content');
    if (!element) return;

    // Temporarily add a class to ensure white background for PDF generation
    element.classList.add('pdf-preview');
    
    try {
      printElementToPdf(element, 'Calendar_Export');
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      element.classList.remove('pdf-preview');
      setIsPrintModalOpen(false);
    }
  };

  // Calendar logic
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dates = Array.from({ length: 35 }, (_, i) => i - startOffset + 1);

  // Timeline Handlers (Annual Gantt)
  const months = [
    { name: 'Jan', weeks: 4 }, { name: 'Feb', weeks: 4 }, { name: 'Mar', weeks: 5 },
    { name: 'Apr', weeks: 4 }, { name: 'May', weeks: 5 }, { name: 'Jun', weeks: 4 },
    { name: 'Jul', weeks: 4 }, { name: 'Aug', weeks: 5 }, { name: 'Sep', weeks: 4 },
    { name: 'Oct', weeks: 4 }, { name: 'Nov', weeks: 5 }, { name: 'Dec', weeks: 4 },
  ];
  const totalWeeks = 52;
  const timelineWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const weekWidth = rect.width / totalWeeks;
      const deltaX = e.clientX - dragState.startX;
      const deltaWeeks = Math.round(deltaX / weekWidth);

      setTasks(prev => prev.map(t => {
        if (t.id !== dragState.taskId) return t;
        let newStart = t.start;
        let newDuration = t.duration;

        if (dragState.type === 'move') {
          newStart = Math.max(1, Math.min(totalWeeks - t.duration + 1, dragState.initialStart + deltaWeeks));
        } else if (dragState.type === 'resize-right') {
          newDuration = Math.max(1, Math.min(totalWeeks - t.start + 1, dragState.initialDuration + deltaWeeks));
        } else if (dragState.type === 'resize-left') {
          const maxDelta = dragState.initialDuration - 1;
          const boundedDelta = Math.min(maxDelta, deltaWeeks);
          newStart = Math.max(1, dragState.initialStart + boundedDelta);
          newDuration = dragState.initialDuration - (newStart - dragState.initialStart);
        }
        return { ...t, start: newStart, duration: newDuration };
      }));
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, totalWeeks]);

  const handleAddTrack = () => {
    const newTrack = { id: Date.now().toString(), name: `Neue Spur ${tracks.length + 1}` };
    setTracks([...tracks, newTrack]);
  };

  const handleRemoveTrack = (id: string) => {
    setTracks(tracks.filter(t => t.id !== id));
    setTasks(tasks.filter(t => t.trackId !== id));
    setShapes(shapes.filter(s => s.trackId !== id));
  };

  const updateTrackName = (id: string, name: string) => {
    setTracks(tracks.map(t => t.id === id ? { ...t, name } : t));
  };

  const handleTrackClick = (e: React.MouseEvent, trackId: string) => {
    if (draggedTool) {
      // Drop shape
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const startWeek = Math.max(1, Math.min(totalWeeks, Math.floor(percentage * totalWeeks) + 1));
      
      setShapes([...shapes, {
        id: Date.now().toString(),
        type: draggedTool as any,
        trackId,
        start: startWeek,
        color: 'text-text-primary'
      }]);
      setDraggedTool(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const startWeek = Math.max(1, Math.min(totalWeeks, Math.floor(percentage * totalWeeks) + 1));
    
    setEditingTask(null);
    setTaskForm({ trackId, name: 'Neuer Meilenstein', start: startWeek, duration: 4, color: 'bg-blue-500' });
    setIsTaskModalOpen(true);
  };

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    setTaskForm({ ...task });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...taskForm } : t));
    } else {
      setTasks([...tasks, { id: Date.now().toString(), ...taskForm }]);
    }
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = () => {
    if (editingTask) {
      setTasks(tasks.filter(t => t.id !== editingTask.id));
      setIsTaskModalOpen(false);
    }
  };

  const removeShape = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setShapes(shapes.filter(s => s.id !== id));
  };

  const handleExportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Kreativ Desk//Calendar//EN\n";
    events.forEach(event => {
      const dateStr = event.date.replace(/-/g, '');
      const timeStr = event.time ? event.time.replace(':', '') + '00' : '000000';
      const dtStart = `${dateStr}T${timeStr}`;
      
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:${event.id}@kreativdesk.com\n`;
      icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      icsContent += `DTSTART:${dtStart}\n`;
      icsContent += `SUMMARY:${event.title}\n`;
      icsContent += `DESCRIPTION:${event.description}\n`;
      icsContent += "END:VEVENT\n";
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'kreativ-desk-calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCalendarContent = (isPreview = false) => (
    <div className={cn("flex-1 flex flex-col overflow-hidden min-h-0", isPreview ? "pdf-preview" : "")}>
      {view === 'calendar' ? (
        <div className={cn("flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden min-h-0 animate-in fade-in print:border-none print:bg-white", isPreview ? "border-gray-200 bg-white text-black" : "")}>
          <div className={cn("p-4 border-b border-border bg-surface flex justify-between items-center print:hidden", isPreview ? "bg-white border-gray-200 text-black" : "")}>
            <div className={cn("flex bg-white/5 rounded-md p-1", isPreview ? "bg-gray-100" : "")}>
              <button onClick={() => !isPreview && setCalendarMode('year')} className={cn("px-3 py-1 rounded text-xs font-medium", calendarMode === 'year' ? (isPreview ? "bg-gray-300 text-black" : "bg-white/10 text-text-primary") : (isPreview ? "text-gray-600" : "text-text-muted"))}>Year</button>
              <button onClick={() => !isPreview && setCalendarMode('month')} className={cn("px-3 py-1 rounded text-xs font-medium", calendarMode === 'month' ? (isPreview ? "bg-gray-300 text-black" : "bg-white/10 text-text-primary") : (isPreview ? "text-gray-600" : "text-text-muted"))}>Month</button>
              <button onClick={() => !isPreview && setCalendarMode('day')} className={cn("px-3 py-1 rounded text-xs font-medium", calendarMode === 'day' ? (isPreview ? "bg-gray-300 text-black" : "bg-white/10 text-text-primary") : (isPreview ? "text-gray-600" : "text-text-muted"))}>Day</button>
            </div>
            <h2 className={cn("text-lg font-medium", isPreview ? "text-black" : "")}>
              {calendarMode === 'year' ? currentYear : calendarMode === 'month' ? `${months[currentMonth].name} ${currentYear}` : `Today, ${today.toLocaleDateString()}`}
            </h2>
          </div>

          {calendarMode === 'month' && (
            <>
              <div className={cn("grid grid-cols-7 border-b border-border bg-surface print:bg-transparent print:border-black/20", isPreview ? "bg-gray-50 border-gray-200 text-black" : "")}>
                {days.map(day => (
                  <div key={day} className={cn("p-3 text-center text-sm font-medium text-text-muted print:text-black", isPreview ? "text-gray-600" : "")}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-5 print:border-l print:border-t print:border-black/20">
                {dates.map((date, i) => {
                  const isCurrentMonth = date > 0 && date <= daysInMonth;
                  const displayDate = isCurrentMonth ? date : (date <= 0 ? new Date(currentYear, currentMonth, 0).getDate() + date : date - daysInMonth);
                  const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(displayDate).padStart(2, '0')}`;
                  
                  const dayEvents = events.filter(e => e.date === dateString);
                  const isToday = displayDate === today.getDate() && isCurrentMonth;

                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        if (!isPreview) {
                          setNewEvent({ ...newEvent, date: dateString });
                          setIsModalOpen(true);
                        }
                      }}
                      className={cn(
                        "border-b border-r border-border/50 p-2 min-h-[100px] transition-colors hover:bg-white/5 print:border-black/20 print:bg-transparent cursor-pointer",
                        !isCurrentMonth && "opacity-30 bg-surface/20 print:opacity-50",
                        isPreview ? "border-gray-200" : ""
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                        isToday ? "bg-accent-ai text-text-primary print:bg-black print:text-text-primary" : "text-text-primary print:text-black",
                        isPreview && isToday ? "bg-blue-600 text-text-primary" : (isPreview && !isToday ? "text-black" : "")
                      )}>
                        {displayDate}
                      </span>
                      
                      <div className="mt-1 space-y-1">
                        {dayEvents.map(evt => (
                          <div 
                            key={evt.id} 
                            className={cn(
                              "px-2 py-1 border rounded text-xs truncate flex items-center gap-1 print:border-black/30 print:bg-transparent print:text-black",
                              evt.type === 'Video Call' ? "bg-purple-500/20 border-purple-500/30 text-purple-400" :
                              evt.type === 'Meeting' ? "bg-blue-500/20 border-blue-500/30 text-blue-400" :
                              "bg-orange-500/20 border-orange-500/30 text-orange-400",
                              isPreview && evt.type === 'Video Call' ? "bg-purple-100 border-purple-200 text-purple-800" : "",
                              isPreview && evt.type === 'Meeting' ? "bg-blue-100 border-blue-200 text-blue-800" : "",
                              isPreview && evt.type !== 'Video Call' && evt.type !== 'Meeting' ? "bg-orange-100 border-orange-200 text-orange-800" : ""
                            )}
                            title={evt.title}
                          >
                            {evt.type === 'Video Call' && <Video size={10} className="shrink-0" />}
                            {evt.time} {evt.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {calendarMode === 'year' && (
            <div className="flex-1 p-6 grid grid-cols-3 md:grid-cols-4 gap-6 overflow-y-auto">
              {months.map((month, idx) => (
                <div key={idx} className={cn("border border-border rounded-lg p-4 bg-surface/20", isPreview ? "border-gray-200 bg-gray-50" : "")}>
                  <h3 className={cn("font-medium text-sm mb-3", isPreview ? "text-black" : "")}>{month.name}</h3>
                  <div className="grid grid-cols-7 gap-1 text-[10px] text-center">
                    {['M','T','W','T','F','S','S'].map(d => <div key={d} className={cn("text-text-muted", isPreview ? "text-gray-500" : "")}>{d}</div>)}
                    {Array.from({length: 31}).map((_, i) => (
                      <div key={i} className={cn("bg-white/5 rounded cursor-pointer", isPreview ? "text-black" : "")}>{i+1}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {calendarMode === 'day' && (
            <div className="flex-1 flex overflow-hidden">
              <div className={cn("w-20 border-r border-border bg-surface flex flex-col", isPreview ? "border-gray-200 bg-gray-50" : "")}>
                {Array.from({length: 24}).map((_, i) => (
                  <div key={i} className={cn("h-16 border-b border-border/50 text-xs text-text-muted text-right pr-2 pt-1", isPreview ? "border-gray-200 text-gray-500" : "")}>
                    {i}:00
                  </div>
                ))}
              </div>
              <div className="flex-1 relative overflow-y-auto">
                {Array.from({length: 24}).map((_, i) => (
                  <div key={i} className={cn("h-16 border-b border-border/20", isPreview ? "border-gray-100" : "")}></div>
                ))}
                {events.filter(e => e.date === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`).map(evt => {
                  const hour = parseInt(evt.time?.split(':')[0] || '10');
                  return (
                    <div 
                      key={evt.id}
                      className={cn("absolute left-2 right-4 rounded-md p-2 border bg-blue-500/20 border-blue-500/30 text-blue-400", isPreview ? "bg-blue-100 border-blue-200 text-blue-800" : "")}
                      style={{ top: `${hour * 64}px`, height: '60px' }}
                    >
                      <div className="text-xs font-bold">{evt.time}</div>
                      <div className="text-sm">{evt.title}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex gap-4 min-h-0 animate-in fade-in">
          {/* Library Sidebar */}
          {!isPreview && (
            <div className="w-16 shrink-0 bg-surface border border-border rounded-xl flex flex-col items-center py-4 gap-4 print:hidden">
              <div className="text-text-muted text-xs font-medium mb-2"><Shapes size={20}/></div>
              
              <button 
                className={cn("p-2 rounded-md hover:bg-white/5 transition-colors", draggedTool === 'circle' && "bg-white/5 text-accent-ai")}
                onClick={() => setDraggedTool(draggedTool === 'circle' ? null : 'circle')}
                title="Add Circle"
              >
                <Circle size={20} />
              </button>
              <button 
                className={cn("p-2 rounded-md hover:bg-white/5 transition-colors", draggedTool === 'square' && "bg-white/5 text-accent-ai")}
                onClick={() => setDraggedTool(draggedTool === 'square' ? null : 'square')}
                title="Add Square"
              >
                <Square size={20} />
              </button>
              <button 
                className={cn("p-2 rounded-md hover:bg-white/5 transition-colors", draggedTool === 'triangle' && "bg-white/5 text-accent-ai")}
                onClick={() => setDraggedTool(draggedTool === 'triangle' ? null : 'triangle')}
                title="Add Triangle"
              >
                <Triangle size={20} />
              </button>
              <button 
                className={cn("p-2 rounded-md hover:bg-white/5 transition-colors", draggedTool === 'arrow' && "bg-white/5 text-accent-ai")}
                onClick={() => setDraggedTool(draggedTool === 'arrow' ? null : 'arrow')}
                title="Add Arrow"
              >
                <ArrowRightIcon size={20} />
              </button>
              
              <div className="mt-auto p-2 text-text-muted">
                <GripVertical size={20} className="opacity-50" />
              </div>
            </div>
          )}

          <div className={cn(
            "flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden print:border-none print:bg-white",
            draggedTool && !isPreview && "ring-2 ring-accent-ai/50",
            isPreview ? "border-gray-200 bg-white" : ""
          )}>
            {/* Timeline Header (Gantt) */}
            <div className={cn("flex border-b border-border bg-surface/80 sticky top-0 z-10 print:bg-transparent print:border-black/20", isPreview ? "bg-gray-50 border-gray-200" : "")}>
              <div className={cn("w-64 shrink-0 border-r border-border p-4 flex items-center justify-between bg-surface/90 backdrop-blur-sm sticky left-0 z-20 print:bg-transparent print:border-black/20", isPreview ? "bg-gray-50 border-gray-200" : "")}>
                <span className={cn("text-sm font-medium text-text-primary print:text-black", isPreview ? "text-black" : "")}>Spuren / Phasen</span>
                {!isPreview && (
                  <button onClick={handleAddTrack} className="text-text-muted hover:text-text-primary bg-white/10 p-1.5 rounded transition-colors print:hidden" title="Neue Spur">
                    <Plus size={16}/>
                  </button>
                )}
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Months Row */}
                <div className={cn("flex border-b border-border/50 print:border-black/20", isPreview ? "border-gray-200" : "")}>
                  {months.map((month, i) => (
                    <div 
                      key={i} 
                      className={cn("py-2 text-center text-xs font-medium text-text-primary border-r border-border/30 bg-surface print:bg-transparent print:border-black/20 print:text-black", isPreview ? "bg-gray-50 border-gray-200 text-black" : "")}
                      style={{ width: `${(month.weeks / totalWeeks) * 100}%` }}
                    >
                      {month.name}
                    </div>
                  ))}
                </div>
                {/* Weeks Row */}
                <div className="flex">
                  {timelineWeeks.map(week => (
                    <div 
                      key={week} 
                      className={cn("flex-1 min-w-[28px] border-r border-border/20 py-1 text-center text-[10px] text-text-muted print:border-black/10 print:text-black/70", isPreview ? "border-gray-200 text-gray-500" : "")}
                    >
                      W{week}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Timeline Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative" ref={isPreview ? null : timelineRef}>
              {tracks.map(track => (
                <div key={track.id} className={cn("flex border-b border-border/40 group min-h-[72px] relative print:border-black/20", isPreview ? "border-gray-200" : "")}>
                  {/* Track Label (Sticky Left) */}
                  <div className={cn("w-64 shrink-0 border-r border-border p-3 flex items-center justify-between bg-surface sticky left-0 z-10 group-hover:bg-surface transition-colors print:bg-transparent print:border-black/20", isPreview ? "bg-white border-gray-200" : "")}>
                    <input 
                      value={track.name}
                      onChange={(e) => !isPreview && updateTrackName(track.id, e.target.value)}
                      readOnly={isPreview}
                      className={cn("bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-accent-ai text-sm font-medium text-text-primary w-full hover:bg-white/5 px-2 py-1.5 rounded transition-colors print:text-black", isPreview ? "text-black hover:bg-transparent" : "")}
                    />
                    {!isPreview && (
                      <button 
                        onClick={() => handleRemoveTrack(track.id)}
                        className="text-text-muted hover:text-accent-warning opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-2 print:hidden"
                        title="Spur löschen"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  {/* Track Grid & Bars */}
                  <div 
                    className={cn(
                      "flex-1 flex relative bg-black/20 hover:bg-surface/20 transition-colors print:bg-transparent",
                      draggedTool && !isPreview ? "cursor-crosshair" : "cursor-default",
                      isPreview ? "bg-gray-50 hover:bg-gray-50" : ""
                    )}
                    onClick={(e) => !isPreview && handleTrackClick(e, track.id)}
                  >
                    {/* Grid lines (Weeks) */}
                    {timelineWeeks.map(week => (
                      <div 
                        key={week} 
                        className={cn(
                          "flex-1 min-w-[28px] border-r border-border/10 pointer-events-none print:border-black/10",
                          week % 4 === 0 ? "border-r-border/30 print:border-black/30" : "",
                          isPreview ? "border-gray-200" : ""
                        )}
                      ></div>
                    ))}
                    
                    {/* Tasks / Bars */}
                    {tasks.filter(t => t.trackId === track.id).map(task => {
                      const leftPercent = ((task.start - 1) / totalWeeks) * 100;
                      const widthPercent = (task.duration / totalWeeks) * 100;
                      return (
                        <div 
                          key={task.id}
                          className={cn(
                            "absolute top-3 bottom-3 rounded-md flex items-center px-3 shadow-lg hover:brightness-110 transition-all border border-white/10 group/bar print:border-black/20 print:shadow-none",
                            task.color,
                            dragState?.taskId === task.id && !isPreview ? "z-50 cursor-grabbing opacity-90 scale-[1.02]" : (isPreview ? "" : "cursor-grab")
                          )}
                          style={{ 
                            left: `${leftPercent}%`, 
                            width: `${widthPercent}%`,
                            minWidth: '24px'
                          }}
                          onMouseDown={(e) => {
                            if (isPreview) return;
                            e.stopPropagation();
                            setDragState({ taskId: task.id, type: 'move', startX: e.clientX, initialStart: task.start, initialDuration: task.duration });
                          }}
                          onClick={(e) => {
                            if (isPreview) return;
                            if (dragState) return;
                            handleTaskClick(e, task);
                          }}
                        >
                          <span className="text-xs font-semibold text-text-primary truncate drop-shadow-md pointer-events-none">{task.name}</span>
                          {/* Drag handles */}
                          {!isPreview && (
                            <>
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover/bar:opacity-100 print:hidden"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDragState({ taskId: task.id, type: 'resize-left', startX: e.clientX, initialStart: task.start, initialDuration: task.duration });
                                }}
                              >
                                <div className="w-1 h-4 bg-white/50 rounded-full pointer-events-none"></div>
                              </div>
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover/bar:opacity-100 print:hidden"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDragState({ taskId: task.id, type: 'resize-right', startX: e.clientX, initialStart: task.start, initialDuration: task.duration });
                                }}
                              >
                                <div className="w-1 h-4 bg-white/50 rounded-full pointer-events-none"></div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Shapes */}
                    {shapes.filter(s => s.trackId === track.id).map(shape => {
                      const leftPercent = ((shape.start - 1) / totalWeeks) * 100;
                      return (
                        <div 
                          key={shape.id}
                          className="absolute top-1/2 -translate-y-1/2 z-20 group/shape cursor-pointer print:text-black"
                          style={{ left: `calc(${leftPercent}% + 14px)` }}
                          onClick={(e) => !isPreview && removeShape(e, shape.id)}
                          title={isPreview ? "" : "Click to remove"}
                        >
                          {shape.type === 'circle' && <Circle size={24} className={shape.color} fill="currentColor" fillOpacity={0.2} />}
                          {shape.type === 'square' && <Square size={24} className={shape.color} fill="currentColor" fillOpacity={0.2} />}
                          {shape.type === 'triangle' && <Triangle size={24} className={shape.color} fill="currentColor" fillOpacity={0.2} />}
                          {shape.type === 'arrow' && <ArrowRightIcon size={24} className={shape.color} />}
                          
                          {!isPreview && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-text-primary rounded-full p-0.5 opacity-0 group-hover/shape:opacity-100 transition-opacity print:hidden">
                              <X size={10} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {!isPreview && (
              <div className="p-3 border-t border-border bg-surface/80 text-xs text-text-muted flex items-center gap-2 shrink-0 print:hidden">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
                {draggedTool ? 'Klicke in eine Spur, um die Form zu platzieren.' : 'Klicke in eine Spur (Zeile), um einen neuen Balken (Meilenstein) zu platzieren. Klicke auf einen Balken, um ihn zu bearbeiten.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 flex-1 flex flex-col min-h-0 relative print:bg-white print:text-black"
    >
      <style>
        {`
          @media print {
            @page {
              size: ${printSettings.size} ${printSettings.orientation};
              margin: 1cm;
            }
          }
        `}
      </style>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Smart Calendar & Planning</h1>
          <p className="text-text-muted text-sm mt-1">Milestones, Video Calls, and Team Matrix</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={analyzeSchedule}
            disabled={isAnalyzing}
            className="px-3 py-1.5 border border-accent-ai/30 text-accent-ai rounded-md text-sm font-medium hover:bg-accent-ai/10 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            AI Analysis
          </button>
          <button 
            onClick={handleExportICS}
            className="px-3 py-1.5 border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 text-text-muted hover:text-text-primary"
          >
            <Download size={16} />
            Export ICS
          </button>
          <button 
            onClick={handleExportPDF}
            className="px-3 py-1.5 border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 text-text-muted hover:text-text-primary"
          >
            <Printer size={16} />
            Export PDF
          </button>
          <div className="flex bg-surface border border-border rounded-md p-1 mr-2">
            <button 
              onClick={() => setView('timeline')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2", view === 'timeline' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              <LayoutList size={16} />
              Timeline
            </button>
            <button 
              onClick={() => setView('calendar')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2", view === 'calendar' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              <CalendarDays size={16} />
              Calendar
            </button>
          </div>
          {view === 'calendar' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2"
            >
              <Plus size={16} />
              New Event
            </button>
          )}
        </div>
      </header>

      {/* AI Conflict Warning */}
      {aiInsight && (
        <div className={cn("bg-surface border rounded-xl p-4 flex items-start gap-4 relative overflow-hidden shrink-0 print:hidden", aiInsight.type === 'warning' ? "border-accent-warning/30" : "border-blue-500/30")}>
          <div className={cn("absolute top-0 left-0 w-1 h-full", aiInsight.type === 'warning' ? "bg-accent-warning" : "bg-blue-500")}></div>
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", aiInsight.type === 'warning' ? "bg-accent-warning/10" : "bg-blue-500/10")}>
            {aiInsight.type === 'warning' ? <AlertTriangle className="text-accent-warning" size={20} /> : <Sparkles className="text-blue-500" size={20} />}
          </div>
          <div className="flex-1">
            <h3 className={cn("font-medium text-sm", aiInsight.type === 'warning' ? "text-accent-warning" : "text-blue-400")}>{aiInsight.title}</h3>
            <p className="text-text-muted text-sm mt-1 leading-relaxed">
              {aiInsight.description}
            </p>
            {aiInsight.suggestedAction && (
              <button className={cn("mt-3 text-sm font-medium flex items-center gap-1 transition-colors", aiInsight.type === 'warning' ? "text-accent-warning hover:text-accent-warning/80" : "text-blue-400 hover:text-blue-300")}>
                {aiInsight.suggestedAction} <ArrowRight size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setAiInsight(null)} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
      )}

      <div id="calendar-pdf-content" className="flex-1 flex flex-col min-h-0">
        {renderCalendarContent(false)}
      </div>

      {/* Add/Edit Task Modal for Timeline */}
      {isTaskModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{editingTask ? 'Edit Milestone' : 'New Milestone'}</h2>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Name</label>
                <input 
                  type="text" 
                  value={taskForm.name}
                  onChange={e => setTaskForm({...taskForm, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Start (Woche 1-52)</label>
                  <input 
                    type="number" 
                    min="1"
                    max={totalWeeks}
                    value={taskForm.start}
                    onChange={e => setTaskForm({...taskForm, start: parseInt(e.target.value) || 1})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Dauer (Wochen)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={taskForm.duration}
                    onChange={e => setTaskForm({...taskForm, duration: parseInt(e.target.value) || 1})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">Color</label>
                <div className="flex gap-2">
                  {colors.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setTaskForm({...taskForm, color: c.value})}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        c.value,
                        taskForm.color === c.value ? "border-white scale-110" : "border-transparent hover:scale-105"
                      )}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
              <div className="pt-4 flex justify-between gap-3">
                {editingTask ? (
                  <button 
                    type="button" 
                    onClick={handleDeleteTask}
                    className="px-4 py-2 border border-accent-error/50 text-accent-error rounded-md text-sm font-medium hover:bg-accent-error/10 transition-colors"
                  >
                    Delete
                  </button>
                ) : <div></div>}
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal (Calendar View) */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Schedule New Event</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Event Title</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Date</label>
                  <input 
                    type="date" 
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Time</label>
                  <input 
                    type="time" 
                    value={newEvent.time}
                    onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Type</label>
                <select 
                  value={newEvent.type}
                  onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                  className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                >
                  <option>Meeting</option>
                  <option>Video Call</option>
                  <option>Construction</option>
                  <option>Inspection</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
                <textarea 
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
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
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                className="bg-white shadow-2xl transition-all duration-300 ease-in-out origin-top flex flex-col"
                style={{ 
                  width: printSettings.orientation === 'portrait' ? '794px' : '1123px',
                  minHeight: printSettings.orientation === 'portrait' ? '1123px' : '794px',
                  transform: `scale(${Math.min(1, (window.innerWidth > 768 ? window.innerWidth - 320 - 64 : window.innerWidth - 32) / (printSettings.orientation === 'portrait' ? 794 : 1123))})`,
                  marginBottom: '100px' // Space for scrolling
                }}
              >
                {/* Scaled Content inside Paper */}
                <div 
                  className="origin-top-left w-full h-full p-10"
                  style={{
                    transform: `scale(${printSettings.scale / 100})`,
                    width: `${100 / (printSettings.scale / 100)}%`,
                  }}
                >
                  {renderCalendarContent(true)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
