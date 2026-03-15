import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  Mic, 
  MicOff, 
  MonitorUp, 
  PhoneOff, 
  MessageSquare, 
  Send, 
  Sparkles,
  Paperclip,
  MoreVertical,
  Loader2,
  PenTool,
  Box,
  FileText,
  ChevronRight,
  FileCheck,
  Subtitles,
  X,
  Trash2,
  Eraser,
  Phone,
  Calendar
} from 'lucide-react';
import { cn } from '../utils';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, setDoc, doc, where, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { JitsiMeeting } from '@jitsi/react-sdk';

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  time: string;
  text: string;
  isAI?: boolean;
  reference?: string;
  createdAt?: Timestamp;
}

import { useLanguage } from '../contexts/LanguageContext';

export default function MeetChat() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [isMuted, setIsMuted] = useState(false);
  const [activeView, setActiveView] = useState<'video' | 'whiteboard' | '3d'>('video');
  const [showChat, setShowChat] = useState(() => window.innerWidth >= 768);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [meetingSummary, setMeetingSummary] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newCallEvent, setNewCallEvent] = useState({ title: 'Weekly Coordination', date: '', time: '10:00', type: 'Video Call', description: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Firestore Real-time Listener
  useEffect(() => {
    if (!db || !currentUser || currentUser.uid === 'demo-user') return;
    
    const q = query(collection(db, 'chatMessages'), where('projectId', '==', 'global'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          sender: data.sender || 'Unknown',
          avatar: data.avatar || 'U',
          time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: data.text,
          isAI: data.isAI,
          reference: data.reference,
          createdAt: data.createdAt
        });
      });
      setMessages(fetchedMessages);
    }, (error) => {
      console.error("Firestore subscription error:", error);
      // Fallback to empty messages or handle gracefully
      if (error.code === 'permission-denied') {
        console.warn("Please update your Firestore Security Rules to allow read/write access.");
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Whiteboard State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#fafafa');
  const [strokeWidth, setStrokeWidth] = useState(3);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAITyping]);

  // Initialize Canvas Size
  useEffect(() => {
    if (activeView === 'whiteboard' && canvasRef.current && canvasContainerRef.current) {
      const canvas = canvasRef.current;
      const container = canvasContainerRef.current;
      // Set actual internal canvas resolution to match display size
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Set default styles
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeView]);

  // Drawing Functions
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !db) return;
    
    const userMessage = newMessage;
    const senderName = currentUser?.email?.split('@')[0] || 'User';
    const avatarInitials = senderName.substring(0, 2).toUpperCase();
    
    setNewMessage('');
    
    try {
      // Save user message to Firestore
      const msgId = `msg-${Date.now()}`;
      await setDoc(doc(db, 'chatMessages', msgId), {
        id: msgId,
        sender: senderName,
        avatar: avatarInitials,
        senderId: currentUser.uid,
        projectId: 'global',
        timestamp: Date.now(),
        text: userMessage,
        createdAt: serverTimestamp()
      });
      
      // Check if message is directed at AI or asks a question
      if (userMessage.toLowerCase().includes('@ai') || userMessage.includes('?')) {
        setIsAITyping(true);
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Fetch knowledge docs for RAG
        let knowledgeContext = '';
        try {
          // Embed the user query
          const queryEmbeddingResult = await ai.models.embedContent({
            model: 'gemini-embedding-2-preview',
            contents: [userMessage],
          });
          const queryEmbedding = queryEmbeddingResult.embeddings?.[0]?.values;

          const q = query(collection(db, 'knowledgeDocs'), where('ownerId', '==', currentUser.uid));
          const querySnapshot = await getDocs(q);
          const docs = querySnapshot.docs.map(doc => doc.data());
          
          if (docs.length > 0 && queryEmbedding) {
            // Calculate cosine similarity for all chunks
            const allChunks: { text: string, title: string, score: number }[] = [];
            
            docs.forEach(doc => {
              if (doc.chunks && Array.isArray(doc.chunks)) {
                doc.chunks.forEach((chunk: any) => {
                  if (chunk.embedding) {
                    // Simple cosine similarity
                    let dotProduct = 0;
                    let normA = 0;
                    let normB = 0;
                    for (let i = 0; i < queryEmbedding.length; i++) {
                      dotProduct += queryEmbedding[i] * chunk.embedding[i];
                      normA += queryEmbedding[i] * queryEmbedding[i];
                      normB += chunk.embedding[i] * chunk.embedding[i];
                    }
                    const score = (normA === 0 || normB === 0) ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                    allChunks.push({ text: chunk.text, title: doc.title, score });
                  }
                });
              } else if (doc.content) {
                // Fallback for non-chunked docs
                allChunks.push({ text: doc.content.substring(0, 1500), title: doc.title, score: 0.5 });
              }
            });

            // Sort by score and take top 3 chunks
            allChunks.sort((a, b) => b.score - a.score);
            const topChunks = allChunks.slice(0, 3);
            
            if (topChunks.length > 0) {
              knowledgeContext = `\n\nRelevant Knowledge Base Excerpts:\n${topChunks.map(c => `--- Document: ${c.title} ---\n${c.text}\n`).join('\n')}`;
            }
          }
        } catch (err) {
          console.error("Error fetching knowledge docs:", err);
        }

        // Construct context from previous messages
        const context = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
        const prompt = `You are the "AI Concierge" for Kreativ-Desk OS, an architecture and construction management platform. 
        You are participating in a live project chat.
        ${knowledgeContext}
        
        Recent chat history:
        ${context}
        You: ${userMessage}
        
        Provide a helpful, concise response relevant to construction, architecture, or project management. 
        If you reference a regulation, document, or budget, include a reference tag at the end of your message in this exact format: [REF: Document Name].
        Example: "The corridor must be 1.2m wide. [REF: DIN 18232 - Fire Safety]"`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        let responseText = response.text || 'I am here to help with your project.';
        let reference = undefined;
        
        // Extract [REF: ...]
        const refMatch = responseText.match(/\[REF:\s*(.*?)\]/);
        if (refMatch) {
          reference = refMatch[1];
          responseText = responseText.replace(refMatch[0], '').trim();
        }

        // Save AI response to Firestore
        const aiMsgId = `msg-${Date.now()}`;
        await setDoc(doc(db, 'chatMessages', aiMsgId), {
          id: aiMsgId,
          sender: 'AI Concierge',
          avatar: 'AI',
          senderId: currentUser.uid,
          projectId: 'global',
          timestamp: Date.now(),
          text: responseText,
          isAI: true,
          reference: reference || null,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error sending message or calling AI:", error);
      if (isAITyping) {
        try {
          const errMsgId = `msg-${Date.now()}`;
          await setDoc(doc(db, 'chatMessages', errMsgId), {
            id: errMsgId,
            sender: 'AI Concierge',
            avatar: 'AI',
            senderId: currentUser.uid,
            projectId: 'global',
            timestamp: Date.now(),
            text: 'I encountered an error connecting to my knowledge base. Please try again later.',
            isAI: true,
            createdAt: serverTimestamp()
          });
        } catch (innerError) {
          console.error("Failed to save error message to Firestore:", innerError);
        }
      }
    } finally {
      setIsAITyping(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const context = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      const prompt = `Based on the following meeting chat transcript, generate a concise meeting summary with 3 bullet points of Action Items. 
      Format as clean text without markdown asterisks if possible, just use bullet points (-).
      
      Transcript:
      ${context}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      setMeetingSummary(response.text || 'Summary generated.');
      setShowChat(true);
    } catch (error) {
      console.error("Error generating summary:", error);
      setMeetingSummary("Failed to generate summary.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleScheduleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCallEvent.title || !newCallEvent.date || !currentUser || !db) return;

    try {
      const eventId = `evt-${Date.now()}`;
      await setDoc(doc(db, 'events', eventId), {
        ...newCallEvent,
        id: eventId,
        ownerId: currentUser.uid
      });
      setIsScheduleModalOpen(false);
      setNewCallEvent({ title: 'Weekly Coordination', date: '', time: '10:00', type: 'Video Call', description: '' });
      
      // Optionally add a message to the chat
      const msgId = `msg-${Date.now()}`;
      await setDoc(doc(db, 'chatMessages', msgId), {
        id: msgId,
        sender: 'System',
        avatar: 'SYS',
        senderId: currentUser.uid,
        projectId: 'global',
        timestamp: Date.now(),
        text: `A new video call "${newCallEvent.title}" has been scheduled for ${newCallEvent.date} at ${newCallEvent.time}.`,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to schedule call', err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col min-h-0 space-y-4 h-full"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('live_collaboration')}</h1>
          <p className="text-text-muted text-sm mt-1">{t('weekly_coordination')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-4 py-2 bg-surface border border-border text-text-primary rounded-md text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Calendar size={16} />
            {t('schedule_call')}
          </button>
          <button 
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className="px-4 py-2 bg-surface border border-accent-ai/50 text-accent-ai rounded-md text-sm font-medium hover:bg-accent-ai/10 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isGeneratingSummary ? <Loader2 size={16} className="animate-spin" /> : <FileCheck size={16} />}
            {t('ai_summary')}
          </button>
          {isInCall ? (
            <button 
              onClick={() => setIsInCall(false)}
              className="px-4 py-2 bg-accent-error text-text-primary rounded-md text-sm font-medium hover:bg-accent-error/90 transition-colors shadow-lg shadow-accent-error/20 flex items-center gap-2"
            >
              <PhoneOff size={16} />
              {t('leave_call')}
            </button>
          ) : (
            <button 
              onClick={() => {
                setIsInCall(true);
                setActiveView('video');
              }}
              className="px-4 py-2 bg-accent-success text-text-primary rounded-md text-sm font-medium hover:bg-accent-success/90 transition-colors shadow-lg shadow-accent-success/20 flex items-center gap-2"
            >
              <Phone size={16} />
              {t('join_call')}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 relative">
        {/* Main Stage */}
        <div className="flex-1 bg-black border border-border rounded-xl relative overflow-hidden flex flex-col shadow-2xl min-h-[50vh] md:min-h-0">
          
          {/* Top Glassmorphism Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
            <div className="flex gap-1 bg-surface/60 backdrop-blur-md p-1 rounded-lg border border-white/10 pointer-events-auto">
              <button onClick={() => setActiveView('video')} className={cn("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors", activeView === 'video' ? "bg-white/10 text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary")}>
                <Video size={16} /> {t('video')}
              </button>
              <button onClick={() => setActiveView('whiteboard')} className={cn("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors", activeView === 'whiteboard' ? "bg-white/10 text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary")}>
                <PenTool size={16} /> {t('whiteboard')}
              </button>
              <button onClick={() => setActiveView('3d')} className={cn("px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors", activeView === '3d' ? "bg-white/10 text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary")}>
                <Box size={16} /> {t('3d_model')}
              </button>
            </div>
            
            <div className="flex gap-2 pointer-events-auto">
              <button 
                onClick={() => {
                  setShowTranscript(!showTranscript);
                  if (!showTranscript) {
                    alert('Live Transcript aktiviert. Die KI hört nun mit und protokolliert das Gespräch.');
                  }
                }}
                className={cn("p-2 rounded-lg border backdrop-blur-md transition-colors", showTranscript ? "bg-accent-ai/20 border-accent-ai/30 text-accent-ai" : "bg-surface/60 border-white/10 text-text-muted hover:text-text-primary")}
                title="Live Transcript"
              >
                <Subtitles size={18} />
              </button>
              <button 
                onClick={() => setShowChat(!showChat)}
                className={cn("p-2 rounded-lg border backdrop-blur-md transition-colors", showChat ? "bg-white/10 border-white/20 text-text-primary" : "bg-surface/60 border-white/10 text-text-muted hover:text-text-primary")}
              >
                <MessageSquare size={18} />
              </button>
            </div>
          </div>

          {/* Views */}
          <div className="flex-1 relative">
            {/* Jitsi Meeting Container */}
            {isInCall && (
              <div className={cn("absolute inset-0 flex flex-col", activeView === 'video' ? "z-10" : "opacity-0 pointer-events-none")}>
                <div className="flex-1 relative bg-surface">
                  <JitsiMeeting
                    domain="meet.jit.si"
                    roomName="KreativDesk-Weekly-Coordination-12345"
                    configOverwrite={{
                      startWithAudioMuted: true,
                      disableModeratorIndicator: true,
                      startScreenSharing: true,
                      enableEmailInStats: false,
                      disableDeepLinking: true,
                      prejoinPageEnabled: false,
                      hideConferenceSubject: true,
                      hideConferenceTimer: true,
                      hideParticipantsStats: true,
                      disableThirdPartyRequests: true,
                    }}
                    interfaceConfigOverwrite={{
                      DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                      SHOW_JITSI_WATERMARK: false,
                      SHOW_WATERMARK_FOR_GUESTS: false,
                      SHOW_BRAND_WATERMARK: false,
                      SHOW_POWERED_BY: false,
                      SHOW_PROMO: false,
                      SHOW_PROMOTIONAL_CLOSE_PAGE: false,
                      HIDE_INVITE_MORE_HEADER: true,
                      MOBILE_APP_PROMO: false,
                      SHOW_CHROME_EXTENSION_BANNER: false,
                      DEFAULT_LOGO_URL: '',
                      DEFAULT_WELCOME_PAGE_LOGO_URL: '',
                      JITSI_WATERMARK_LINK: ''
                    }}
                    userInfo={{
                      displayName: currentUser?.email?.split('@')[0] || 'Guest',
                      email: currentUser?.email || ''
                    }}
                    onApiReady={(externalApi) => {
                      // here you can attach custom event listeners to the Jitsi Meet External API
                      // you can also store it locally to execute commands
                    }}
                    getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; iframeRef.style.border = 'none'; }}
                  />
                </div>
              </div>
            )}

            {/* Video Placeholder (when not in call) */}
            {activeView === 'video' && !isInCall && (
              <div className="absolute inset-0 flex flex-col z-10">
                <div className="flex-1 relative bg-surface/50 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-6">
                    <Video size={40} className="text-text-muted" />
                  </div>
                  <h2 className="text-xl font-medium text-text-primary mb-2">{t('ready_to_join')}</h2>
                  <p className="text-text-muted mb-6">{t('join_weekly_meeting')}</p>
                  <button 
                    onClick={() => setIsInCall(true)}
                    className="px-6 py-3 bg-accent-success text-text-primary rounded-lg font-medium hover:bg-accent-success/90 transition-colors shadow-lg shadow-accent-success/20 flex items-center gap-2"
                  >
                    <Phone size={20} />
                    {t('join_call')}
                  </button>
                </div>
              </div>
            )}

            {activeView === 'whiteboard' && (
              <div ref={canvasContainerRef} className="absolute inset-0 bg-surface bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden">
                {/* Whiteboard Toolbar */}
                <div className="absolute top-20 left-4 z-30 bg-surface/80 backdrop-blur-md border border-white/10 rounded-lg p-2 flex flex-col gap-2 shadow-xl">
                  <div className="flex flex-col gap-2 border-b border-white/10 pb-2">
                    {['#fafafa', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(color => (
                      <button
                        key={color}
                        onClick={() => { setStrokeColor(color); setStrokeWidth(3); }}
                        className={cn("w-6 h-6 rounded-full border-2 transition-transform hover:scale-110", strokeColor === color && strokeWidth !== 20 ? "border-white scale-110" : "border-transparent")}
                        style={{ backgroundColor: color }}
                        title="Pen Color"
                      />
                    ))}
                  </div>
                  <button 
                    onClick={() => { setStrokeColor('#18181b'); setStrokeWidth(20); }} // Eraser matches background roughly, or use composite operation
                    className={cn("p-2 rounded-md transition-colors flex items-center justify-center", strokeWidth === 20 ? "bg-white/20 text-text-primary" : "text-text-muted hover:bg-white/10 hover:text-text-primary")}
                    title="Eraser"
                  >
                    <Eraser size={18} />
                  </button>
                  <button 
                    onClick={clearCanvas}
                    className="p-2 rounded-md text-text-muted hover:bg-accent-error/20 hover:text-accent-error transition-colors flex items-center justify-center"
                    title="Clear Canvas"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Drawing Canvas */}
                <canvas
                  ref={canvasRef}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerOut={stopDrawing}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                />
              </div>
            )}

            {activeView === '3d' && (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <div className="text-center text-text-muted">
                  <Box size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium text-text-primary">{t('3d_model_sync')}</p>
                  <p className="text-sm mt-2 max-w-sm">{t('bim_viewer_sync')}</p>
                </div>
              </div>
            )}

            {/* Live Transcript Overlay */}
            {showTranscript && (
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 pointer-events-none z-20">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center shadow-2xl">
                  <p className="text-sm text-text-primary/90 font-medium">
                    <span className="text-accent-success mr-2">Mark Smith:</span>
                    "So if we look at the HVAC clash on level 2, we need to ensure we still meet the 1.2m corridor width requirement."
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Floating Controls (Glassmorphism) */}
          {!isInCall && activeView === 'video' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl z-30">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                  isMuted ? "bg-accent-error/20 text-accent-error hover:bg-accent-error/30" : "bg-white/10 hover:bg-white/20 text-text-primary"
                )}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-text-primary transition-all">
                <Video size={20} />
              </button>
              <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-text-primary transition-all">
                <MonitorUp size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <div className={cn(
          "bg-surface border border-border rounded-xl flex flex-col shrink-0 transition-all duration-300 relative z-40 shadow-2xl md:shadow-none",
          showChat ? "h-[40vh] md:h-auto md:w-96 opacity-100" : "h-0 md:w-0 opacity-0 overflow-hidden border-none"
        )}>
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
            <h3 className="font-medium flex items-center gap-2">
              <MessageSquare size={18} className="text-text-muted" />
              {t('project_chat')}
            </h3>
            <button onClick={() => setShowChat(false)} className="text-text-muted hover:text-text-primary transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {meetingSummary && (
            <div className="m-4 p-4 bg-accent-ai/10 border border-accent-ai/30 rounded-xl relative animate-in fade-in slide-in-from-top-2">
              <div className="absolute -top-3 left-4 bg-surface px-2 text-xs font-medium text-accent-ai flex items-center gap-1">
                <Sparkles size={12} /> {t('ai_summary')}
              </div>
              <button onClick={() => setMeetingSummary(null)} className="absolute top-2 right-2 text-text-muted hover:text-text-primary">
                <X size={14} />
              </button>
              <div className="text-sm text-text-primary whitespace-pre-wrap mt-2">{meetingSummary}</div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-3 animate-in fade-in slide-in-from-bottom-2", msg.isAI ? "bg-accent-ai/5 border border-accent-ai/20 p-3 rounded-xl" : "")}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-medium shadow-sm",
                  msg.isAI ? "bg-accent-ai/20 text-accent-ai" : "bg-white/10 border border-white/5"
                )}>
                  {msg.isAI ? <Sparkles size={14} /> : msg.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-sm font-medium", msg.isAI ? "text-accent-ai" : "text-text-primary")}>{msg.sender}</span>
                    <span className="text-xs text-text-muted">{msg.time}</span>
                  </div>
                  <p className="text-sm text-text-muted mt-1 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  
                  {/* Smart Context / RAG Reference Chip */}
                  {msg.reference && (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-surface border border-border rounded-md px-2 py-1 text-xs font-medium text-text-primary hover:bg-white/10 transition-colors cursor-pointer shadow-sm">
                      <FileText size={12} className="text-accent-ai" />
                      {msg.reference}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isAITyping && (
              <div className="flex gap-3 bg-accent-ai/5 border border-accent-ai/20 p-3 rounded-xl animate-in fade-in">
                <div className="w-8 h-8 rounded-full bg-accent-ai/20 text-accent-ai flex items-center justify-center shrink-0">
                  <Sparkles size={14} />
                </div>
                <div className="flex-1 flex items-center">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-accent-ai rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-accent-ai rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-accent-ai rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border bg-surface">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <button type="button" className="absolute left-3 text-text-muted hover:text-text-primary transition-colors">
                <Paperclip size={18} />
              </button>
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('type_message')} 
                className="w-full bg-black border border-border rounded-lg py-2.5 pl-10 pr-12 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all placeholder:text-text-muted shadow-inner"
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim() || isAITyping}
                className="absolute right-2 p-1.5 bg-accent-ai text-text-primary rounded-md hover:bg-accent-ai/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
      {/* Schedule Call Modal */}
      {isScheduleModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t('schedule_video_call')}</h2>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleScheduleCall} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">{t('meeting_title')}</label>
                <input 
                  type="text" 
                  value={newCallEvent.title}
                  onChange={e => setNewCallEvent({...newCallEvent, title: e.target.value})}
                  className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">{t('date')}</label>
                  <input 
                    type="date" 
                    value={newCallEvent.date}
                    onChange={e => setNewCallEvent({...newCallEvent, date: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">{t('time')}</label>
                  <input 
                    type="time" 
                    value={newCallEvent.time}
                    onChange={e => setNewCallEvent({...newCallEvent, time: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">{t('description')}</label>
                <textarea 
                  value={newCallEvent.description}
                  onChange={e => setNewCallEvent({...newCallEvent, description: e.target.value})}
                  className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50 resize-none h-20"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors"
                >
                  {t('schedule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}