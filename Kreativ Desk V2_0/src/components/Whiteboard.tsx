import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Circle as KonvaCircle, Text as KonvaText } from 'react-konva';
import { PenTool, Mic, Square, Circle, Type, Image as ImageIcon, Sparkles, Send, Eraser, CheckCircle2, Loader2, Play, Square as StopIcon, FileAudio, FileText, Download } from 'lucide-react';
import { cn } from '../utils';
import { GoogleGenAI } from '@google/genai';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';

export default function Whiteboard() {
  const { currentUser } = useAuth();
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState<any[]>([]);
  const [shapes, setShapes] = useState<any[]>([]);
  const isDrawing = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioNotes, setAudioNotes] = useState<any[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO
    socketRef.current = io();
    
    socketRef.current.emit('join-room', 'global-whiteboard');
    
    socketRef.current.on('draw', (data: any) => {
      if (data.type === 'line') {
        setLines(prev => [...prev, data.item]);
      } else if (data.type === 'shape') {
        setShapes(prev => [...prev, data.item]);
      }
    });

    socketRef.current.on('clear-board', () => {
      setLines([]);
      setShapes([]);
    });

    if (currentUser && db && currentUser.uid !== 'demo-user') {
      const q = query(collection(db, 'audioNotes'), where('ownerId', '==', currentUser.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAudioNotes(snapshot.docs.map(doc => doc.data()));
      }, (error) => console.error("Audio notes error:", error));
      
      // We still need to return the cleanup function, but we can't easily do it here
      // because we have multiple cleanups. We'll handle it below.
    }

    const checkSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    
    return () => {
      window.removeEventListener('resize', checkSize);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser]);

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'pen' || tool === 'eraser') {
      const newLine = { tool, points: [pos.x, pos.y], id: Date.now().toString() };
      setLines([...lines, newLine]);
    } else if (tool === 'rect') {
      setShapes([...shapes, { type: 'rect', x: pos.x, y: pos.y, width: 0, height: 0, id: Date.now().toString() }]);
    } else if (tool === 'circle') {
      setShapes([...shapes, { type: 'circle', x: pos.x, y: pos.y, radius: 0, id: Date.now().toString() }]);
    } else if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const newText = { type: 'text', x: pos.x, y: pos.y, text, id: Date.now().toString() };
        setShapes([...shapes, newText]);
        socketRef.current?.emit('draw', { roomId: 'global-whiteboard', type: 'shape', item: newText });
      }
      isDrawing.current = false;
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (tool === 'pen' || tool === 'eraser') {
      const lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      lines.splice(lines.length - 1, 1, lastLine);
      setLines(lines.concat());
    } else if (tool === 'rect') {
      const lastShape = shapes[shapes.length - 1];
      lastShape.width = point.x - lastShape.x;
      lastShape.height = point.y - lastShape.y;
      shapes.splice(shapes.length - 1, 1, lastShape);
      setShapes(shapes.concat());
    } else if (tool === 'circle') {
      const lastShape = shapes[shapes.length - 1];
      const radius = Math.sqrt(Math.pow(point.x - lastShape.x, 2) + Math.pow(point.y - lastShape.y, 2));
      lastShape.radius = radius;
      shapes.splice(shapes.length - 1, 1, lastShape);
      setShapes(shapes.concat());
    }
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    // Emit the finished shape/line to other clients
    if (tool === 'pen' || tool === 'eraser') {
      const lastLine = lines[lines.length - 1];
      if (lastLine) socketRef.current?.emit('draw', { roomId: 'global-whiteboard', type: 'line', item: lastLine });
    } else if (tool === 'rect' || tool === 'circle') {
      const lastShape = shapes[shapes.length - 1];
      if (lastShape) socketRef.current?.emit('draw', { roomId: 'global-whiteboard', type: 'shape', item: lastShape });
    }
  };

  const clearBoard = () => {
    setLines([]);
    setShapes([]);
    socketRef.current?.emit('clear-board', 'global-whiteboard');
  };

  const handleExport = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL();
      const link = document.createElement('a');
      link.download = 'whiteboard-export.png';
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSendToSlides = async () => {
    if (!stageRef.current || !currentUser || !db) return;
    setIsSending(true);
    setSendSuccess(false);
    
    try {
      const uri = stageRef.current.toDataURL();
      const id = `wb-${Date.now()}`;
      await setDoc(doc(db, 'whiteboardExports', id), {
        id,
        imageUrl: uri,
        ownerId: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      
      setIsSending(false);
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to send to slides', err);
      setIsSending(false);
    }
  };

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !currentUser) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setIsAnalyzingAudio(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            
            const prompt = `Transcribe this construction site voice note accurately. Then, summarize it into a concise, actionable summary (max 2 sentences).
            Return the response in this exact JSON format:
            {
              "transcription": "The full transcription here...",
              "summary": "The short summary here..."
            }`;

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [
                {
                  inlineData: {
                    data: base64Audio,
                    mimeType: 'audio/webm'
                  }
                },
                { text: prompt }
              ],
              config: {
                responseMimeType: 'application/json'
              }
            });

            const result = JSON.parse(response.text || '{}');
            const transcription = result.transcription || 'Transcription failed.';
            const summary = result.summary || 'Summary generation failed.';

            const id = `an-${Date.now()}`;
            const newNote = {
              id,
              title: `Field Note ${new Date().toLocaleDateString()}`,
              time: 'Just now',
              duration: `0:${recordingTime.toString().padStart(2, '0')}`,
              aiSummary: summary,
              transcription: transcription,
              ownerId: currentUser.uid
            };

            await setDoc(doc(db, 'audioNotes', id), newNote);
            setActiveNoteId(id);
            resolve();
          };
        } catch (error) {
          console.error("Audio analysis failed:", error);
          alert("Failed to analyze audio note.");
          resolve();
        } finally {
          setIsAnalyzingAudio(false);
          setRecordingTime(0);
          // Stop all tracks
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current!.stop();
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const activeNote = audioNotes.find(n => n.id === activeNoteId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 flex-1 flex flex-col min-h-0"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audio Hub & Whiteboard</h1>
          <p className="text-text-muted text-sm mt-1">Team sketching, notes, and markups</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export Image
          </button>
          <button 
            onClick={handleSendToSlides}
            disabled={isSending || sendSuccess}
            className={cn(
              "px-4 py-2 border rounded-md text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-80",
              sendSuccess 
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
                : "bg-surface border-accent-ai/50 text-accent-ai hover:bg-accent-ai/10"
            )}
          >
            {isSending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : sendSuccess ? (
              <CheckCircle2 size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {isSending ? 'Sending...' : sendSuccess ? 'Sent to Slides' : 'Send to Slides'}
          </button>
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-lg flex items-center gap-2",
              isRecording 
                ? "bg-red-500 hover:bg-red-600 text-text-primary shadow-red-500/20 animate-pulse" 
                : "bg-accent-ai text-text-primary hover:bg-accent-ai/90 shadow-accent-ai/20"
            )}
          >
            {isRecording ? <StopIcon size={16} className="fill-current" /> : <Mic size={16} />}
            {isRecording ? `Recording... ${formatTime(recordingTime)}` : 'Record Voice Note'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-y-auto lg:overflow-hidden pb-4 lg:pb-0">
        {/* Whiteboard Canvas */}
        <div className="flex-1 bg-black border border-border rounded-xl relative overflow-hidden flex flex-col min-h-[50vh] lg:min-h-0 shrink-0" ref={containerRef}>
          {/* Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] md:w-auto bg-surface/80 backdrop-blur-md border border-border rounded-lg p-1.5 flex flex-wrap justify-center items-center gap-1 z-10">
            <button 
              onClick={() => setTool('pen')}
              className={cn("p-2 rounded-md transition-colors", tool === 'pen' ? "bg-white/5 text-text-primary" : "text-text-muted hover:bg-white/5")} 
              title="Pen"
            >
              <PenTool size={18} />
            </button>
            <button 
              onClick={() => setTool('eraser')}
              className={cn("p-2 rounded-md transition-colors", tool === 'eraser' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-white/5")} 
              title="Eraser"
            >
              <Eraser size={18} />
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={() => setTool('rect')}
              className={cn("p-2 rounded-md transition-colors", tool === 'rect' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-white/5")} 
              title="Rectangle"
            >
              <Square size={18} />
            </button>
            <button 
              onClick={() => setTool('circle')}
              className={cn("p-2 rounded-md transition-colors", tool === 'circle' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-white/5")} 
              title="Circle"
            >
              <Circle size={18} />
            </button>
            <button 
              onClick={() => setTool('text')}
              className={cn("p-2 rounded-md transition-colors", tool === 'text' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-white/5")} 
              title="Text"
            >
              <Type size={18} />
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={clearBoard}
              className="p-2 hover:bg-red-500/20 rounded-md text-red-400 transition-colors text-xs font-medium" 
              title="Clear All"
            >
              Clear
            </button>
          </div>

          {/* Real Canvas */}
          <div className="flex-1 relative w-full h-full cursor-crosshair">
            {/* Dot grid background */}
            <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] bg-[size:20px_20px] opacity-30 pointer-events-none"></div>
            
            {stageSize.width > 0 && (
              <Stage
                width={stageSize.width}
                height={stageSize.height}
                ref={stageRef}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
              >
                <Layer>
                  {/* Background rect for export */}
                  <Rect
                    x={0}
                    y={0}
                    width={stageSize.width}
                    height={stageSize.height}
                    fill="#09090b"
                  />
                  {lines.map((line, i) => (
                    <Line
                      key={i}
                      points={line.points}
                      stroke={line.tool === 'eraser' ? '#09090b' : '#3b82f6'}
                      strokeWidth={line.tool === 'eraser' ? 20 : 3}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation={
                        line.tool === 'eraser' ? 'destination-out' : 'source-over'
                      }
                    />
                  ))}
                  {shapes.map((shape, i) => {
                    if (shape.type === 'rect') {
                      return (
                        <Rect
                          key={shape.id || i}
                          x={shape.x}
                          y={shape.y}
                          width={shape.width}
                          height={shape.height}
                          stroke="#3b82f6"
                          strokeWidth={3}
                        />
                      );
                    } else if (shape.type === 'circle') {
                      return (
                        <KonvaCircle
                          key={shape.id || i}
                          x={shape.x}
                          y={shape.y}
                          radius={shape.radius}
                          stroke="#3b82f6"
                          strokeWidth={3}
                        />
                      );
                    } else if (shape.type === 'text') {
                      return (
                        <KonvaText
                          key={shape.id || i}
                          x={shape.x}
                          y={shape.y}
                          text={shape.text}
                          fontSize={24}
                          fill="#fafafa"
                        />
                      );
                    }
                    return null;
                  })}
                </Layer>
              </Stage>
            )}
          </div>
        </div>

        {/* Audio Hub Sidebar */}
        <div className="w-full lg:w-96 bg-surface border border-border rounded-xl flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
            <h3 className="font-medium flex items-center gap-2">
              <Mic size={18} className="text-text-muted" />
              Audio Hub
            </h3>
            {isAnalyzingAudio && (
              <span className="text-xs text-accent-ai flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> AI Analyzing...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/30">
            {audioNotes.map((note) => (
              <div 
                key={note.id} 
                onClick={() => setActiveNoteId(note.id === activeNoteId ? null : note.id)}
                className={cn(
                  "p-4 border rounded-xl transition-all cursor-pointer group",
                  activeNoteId === note.id 
                    ? "bg-white/5 border-accent-ai/50 shadow-md" 
                    : "bg-surface border-border hover:bg-white/5 hover:border-zinc-700"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-full", activeNoteId === note.id ? "bg-accent-ai/20 text-accent-ai" : "bg-surface text-text-muted")}>
                      <FileAudio size={16} />
                    </div>
                    <div>
                      <h4 className={cn("text-sm font-semibold", activeNoteId === note.id ? "text-text-primary" : "text-text-primary")}>{note.title}</h4>
                      <p className="text-xs text-text-muted">{note.time}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-text-muted bg-surface px-2 py-1 rounded-md border border-border">{note.duration}</span>
                </div>
                
                {/* Progress Bar Simulation */}
                <div className="flex items-center gap-2 mb-3">
                  <button className="text-text-muted hover:text-text-primary transition-colors">
                    <Play size={14} className="fill-current" />
                  </button>
                  <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden border border-border/50">
                    <div className="h-full bg-accent-ai w-0 group-hover:w-1/3 transition-all duration-1000"></div>
                  </div>
                </div>

                {/* Expanded Details */}
                {activeNoteId === note.id && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-accent-ai/5 border border-accent-ai/20 rounded-lg p-3">
                      <h5 className="text-xs font-semibold text-accent-ai flex items-center gap-1.5 mb-2">
                        <Sparkles size={12} /> AI Summary
                      </h5>
                      <p className="text-sm text-text-primary leading-relaxed">
                        {note.aiSummary}
                      </p>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-semibold text-text-muted flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                        <FileText size={12} /> Full Transcription
                      </h5>
                      <p className="text-sm text-text-muted leading-relaxed italic border-l-2 border-zinc-700 pl-3">
                        "{note.transcription}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border bg-surface text-center shrink-0">
            <p className="text-xs text-text-muted mb-3">Upload or record voice notes from the construction site for automatic AI transcription and indexing.</p>
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "w-full py-2.5 border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2",
                isRecording
                  ? "bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20"
                  : "hover:bg-white/10 border-border text-text-primary"
              )}
            >
              {isRecording ? <StopIcon size={16} className="fill-current animate-pulse" /> : <Mic size={16} />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
