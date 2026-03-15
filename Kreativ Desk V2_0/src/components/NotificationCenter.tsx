import React from 'react';
import { X, AlertTriangle, FileText, CheckCircle, MessageSquare, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'alert', title: 'Budget Variance Detected', desc: 'Structural steel costs in Campus Phase 1 exceed estimate by 5%.', time: '10 min ago', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  { id: 2, type: 'document', title: 'New DWG Uploaded', desc: 'Anna Schmidt uploaded "FloorPlan_v3.dwg". AI analysis complete.', time: '1 hour ago', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  { id: 3, type: 'success', title: 'Pitch Deck Generated', desc: 'The AI has finished generating the Q3 Client Presentation.', time: '2 hours ago', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  { id: 4, type: 'message', title: 'New Team Message', desc: 'Marcus: "Can we review the HVAC plans tomorrow?"', time: '3 hours ago', icon: MessageSquare, color: 'text-text-muted', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20' },
];

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-80 bg-[#18181b] border-l border-[#27272a] shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#09090b]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#a1a1aa]" />
                <h2 className="font-semibold text-[#fafafa]">Activity Feed</h2>
              </div>
              <button onClick={onClose} className="p-2 text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {MOCK_NOTIFICATIONS.map((notif, i) => {
                const Icon = notif.icon;
                return (
                  <motion.div 
                    key={notif.id} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-xl border border-[#27272a] bg-[#09090b] hover:border-[#3f3f46] transition-colors group cursor-pointer"
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${notif.bg} ${notif.color} ${notif.border}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-[#fafafa] group-hover:text-blue-400 transition-colors">{notif.title}</h4>
                        <p className="text-xs text-[#a1a1aa] mt-1 leading-relaxed">{notif.desc}</p>
                        <span className="text-[10px] font-medium text-[#a1a1aa] mt-2 block uppercase tracking-wider">{notif.time}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
