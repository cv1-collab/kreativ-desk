import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Minimize2, Loader2, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function AIConcierge() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: 'Hello! I am your Kreativ-Desk AI. I am monitoring your workspace. How can I assist you today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [projectContext, setProjectContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Fetch project context when opened
  useEffect(() => {
    if (isOpen && currentUser && currentUser.uid !== 'demo-user' && !projectContext && db) {
      const fetchContext = async () => {
        try {
          const txQuery = query(collection(db, 'transactions'), where('ownerId', '==', currentUser.uid));
          const eventsQuery = query(collection(db, 'events'), where('ownerId', '==', currentUser.uid));
          const defectsQuery = query(collection(db, 'defects'), where('ownerId', '==', currentUser.uid));

          const [txSnap, eventsSnap, defectsSnap] = await Promise.all([
            getDocs(txQuery),
            getDocs(eventsQuery),
            getDocs(defectsQuery)
          ]);
          
          const transactions = txSnap.docs.map(d => d.data());
          const events = eventsSnap.docs.map(d => d.data());
          const defects = defectsSnap.docs.map(d => d.data());
          
          const totalSpent = transactions.filter((t: any) => t.amount < 0).reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
          const criticalDefects = defects.filter((d: any) => d.priority === 'Critical').length;
          
          setProjectContext({
            transactions,
            events,
            defects,
            summary: `Total Spent: CHF ${totalSpent}. Critical Defects: ${criticalDefects}. Total Events: ${events.length}.`
          });

          // Proactive Warning Check
          if (totalSpent > 50000 || criticalDefects > 0) {
            setMessages(prev => [...prev, { 
              id: Date.now(), 
              role: 'ai', 
              text: `⚠️ **Proactive Alert:** I noticed you have ${criticalDefects} critical defects open, and your current spend is CHF ${totalSpent}. Would you like me to analyze the budget vs. CAD plan discrepancies?` 
            }]);
          }

        } catch (err) {
          console.error("Failed to fetch AI context", err);
        }
      };
      fetchContext();
    }
  }, [isOpen, currentUser, projectContext]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is missing");
      
      const ai = new GoogleGenAI({ apiKey });
      
      let systemContext = `You are the AI Concierge for Kreativ-Desk OS, an all-in-one platform for architecture, construction, event, and scenic design. 
      You help users with project management, 3D BIM models, finance, and team collaboration. Keep your answers concise, professional, and helpful.
      Current Project Data Context: ${projectContext?.summary || 'Loading...'}`;
      
      if (location.pathname.includes('finance')) {
        systemContext += " The user is currently looking at the Finance & Budgeting module. You can assist with cost calculations, budget tracking, and financial analysis.";
      } else if (location.pathname.includes('bim')) {
        systemContext += " The user is currently looking at the 3D Viewer (BIM) module. You can assist with architectural questions, clash detection, and building regulations.";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMsg,
        config: {
          systemInstruction: systemContext,
        }
      });

      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: response.text || "I couldn't process that request." }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: "I'm sorry, I'm having trouble connecting to my neural network right now. Please check your API key configuration." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl flex items-center gap-3 bg-accent-ai hover:bg-accent-ai/90 text-text-primary border border-accent-ai/30"
          >
            <Sparkles className="w-6 h-6 animate-pulse" />
            <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isHovered ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}>
              Ask AI
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] max-h-[80vh] bg-[#18181b]/95 backdrop-blur-xl border border-[#27272a] rounded-2xl shadow-2xl flex flex-col origin-bottom-right"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#09090b]/50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#fafafa] text-sm">AI Concierge</h3>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online & Syncing
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] rounded-xl transition-colors">
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'ai' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' : 'bg-[#27272a] border border-[#3f3f46] text-[#fafafa]'
                  }`}>
                    {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                    msg.role === 'ai' 
                      ? 'bg-[#27272a]/50 text-[#fafafa] rounded-tl-none border border-[#27272a]' 
                      : 'bg-blue-600 text-text-primary rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-[#27272a]/50 rounded-tl-none border border-[#27272a] flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a1a1aa] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a1a1aa] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a1a1aa] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#27272a] bg-[#09090b]/50 rounded-b-2xl">
              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about budgets, plans, or schedules..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-4 pr-12 py-3 text-sm text-[#fafafa] placeholder:text-[#a1a1aa] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-text-primary rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
