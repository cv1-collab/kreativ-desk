import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  Wallet,
  Box,
  ArrowRight,
  Calendar,
  User,
  MoreHorizontal,
  CheckCircle,
  Users,
  Briefcase,
  PieChart,
  Sparkles,
  Loader2
} from 'lucide-react';
import { cn } from '../utils';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { useLanguage } from '../contexts/LanguageContext';

export default function Dashboard() {
  const { projectId } = useParams();
  const { projects, activeProjectId } = useProject();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const activeProject = projects.find(p => p.id === (projectId || activeProjectId));

  const [aiInsights, setAiInsights] = useState<{title: string, description: string, type: 'warning' | 'info'}[] | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    if (!currentUser || !db || currentUser.uid === 'demo-user') return;
    
    const fetchInsights = async () => {
      setIsGeneratingInsights(true);
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

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are the AI Concierge for Kreativ-Desk OS. Analyze the following project data:
        Transactions: ${JSON.stringify(transactions.slice(0, 5))}
        Events: ${JSON.stringify(events.slice(0, 5))}
        Defects: ${JSON.stringify(defects.slice(0, 5))}
        
        Generate exactly 2 critical insights or warnings based on this data.
        Return a JSON array of objects with 'title', 'description', and 'type' ('warning' or 'info').`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const insights = JSON.parse(response.text || '[]');
        setAiInsights(insights);
      } catch (error) {
        console.error("Failed to generate insights:", error);
      } finally {
        setIsGeneratingInsights(false);
      }
    };

    fetchInsights();
  }, [currentUser]);

  // Empty state for daily tasks
  const [dailyTasks, setDailyTasks] = React.useState<any[]>([]);

  const toggleTaskStatus = (id: string) => {
    setDailyTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'Done' ? 'To Do' : 'Done' };
      }
      return t;
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('project_overview')}</h1>
          <p className="text-text-muted text-sm mt-1">{activeProject?.name || t('loading_project')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-accent-success/10 text-accent-success border border-accent-success/20 text-xs font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse"></span>
            {t('on_track')}
          </span>
          <span className="text-sm font-medium text-text-muted">0% {t('completed_percent')}</span>
        </div>
      </header>

      {/* AI Concierge Insights */}
      <div className="bg-surface border border-blue-500/20 rounded-xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:bg-blue-500/10 transition-colors"></div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Sparkles size={20} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              {t('ai_concierge_insights')}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 uppercase tracking-wider">{t('live_analysis')}</span>
            </h3>
            <div className="mt-4 space-y-3">
              {isGeneratingInsights ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={24} className="animate-spin text-blue-400" />
                </div>
              ) : aiInsights ? (
                aiInsights.map((insight, idx) => (
                  <div key={idx} className={cn("flex items-start gap-3 p-3 rounded-lg border", insight.type === 'warning' ? "bg-red-500/5 border-red-500/10" : "bg-orange-500/5 border-orange-500/10")}>
                    {insight.type === 'warning' ? <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" /> : <Clock size={16} className="text-orange-400 mt-0.5 shrink-0" />}
                    <div>
                      <p className={cn("text-sm font-medium", insight.type === 'warning' ? "text-red-200" : "text-orange-200")}>{insight.title}</p>
                      <p className={cn("text-xs mt-1", insight.type === 'warning' ? "text-red-300/70" : "text-orange-300/70")}>{insight.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-200">{t('budget_discrepancy')}</p>
                      <p className="text-xs text-red-300/70 mt-1">The current CAD plan (v2.4) requires 15% more premium facade panels than allocated in the financial ledger. Projected overrun: CHF 12,500.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                    <Clock size={16} className="text-orange-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-200">{t('schedule_shift')}</p>
                      <p className="text-xs text-orange-300/70 mt-1">Material delay detected in recent supplier email. The "HVAC Installation" milestone may be delayed by 4 days. Would you like me to adjust the dependent tasks?</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <button className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
              {t('review_ai_suggestions')} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Daily Tasks (Tagestasks) - Moved to top */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <CheckCircle2 size={18} className="text-accent-ai" />
            {t('daily_tasks')}
          </h2>
          <button className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
            {t('view_all_tasks')}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dailyTasks.map((task, i) => (
            <div 
              key={i} 
              onClick={() => toggleTaskStatus(task.id)}
              className={cn(
                "group bg-surface border rounded-xl p-4 flex flex-col gap-3 transition-all cursor-pointer",
                task.status === 'Done' ? "border-emerald-500/30 bg-emerald-500/5 opacity-70" : "border-border hover:border-accent-ai/50 hover:shadow-lg hover:shadow-accent-ai/5"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border/50">{task.id}</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border",
                    task.priority === 'Critical' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    task.priority === 'High' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                    "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                  )}>
                    {task.priority}
                  </span>
                </div>
                <button className="text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal size={14} />
                </button>
              </div>
              
              <h3 className={cn("font-medium text-sm leading-snug", task.status === 'Done' ? "text-text-muted line-through" : "text-text-primary")}>{task.title}</h3>
              
              <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Calendar size={12} className={task.dueDate.includes('Today') ? 'text-orange-400' : ''} />
                  <span className={task.dueDate.includes('Today') ? 'text-orange-400 font-medium' : ''}>{task.dueDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-[10px] font-medium border border-border text-text-primary" title={task.assignee}>
                    {task.assignee.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Grid (Budget & Hours Overview) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('budget_overview'), value: 'CHF 45,000', sub: 'of CHF 120,000 Limit', icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: t('hours_overview'), value: '142 Std.', sub: 'of 300 Std. Planned', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: t('open_defects'), value: '3', sub: '1 Critical', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: t('bim_revisions'), value: 'v2.4', sub: 'Updated 2h ago', icon: Box, color: 'text-text-muted', bg: 'bg-white/5' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-border/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-sm font-medium">{stat.label}</span>
              <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", stat.bg)}>
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
              <div className="text-xs text-text-muted mt-1">{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Project Participants & Freelancers */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <Users size={16} className="text-text-muted" />
            {t('project_participants')}
          </h3>
          <button className="text-xs font-medium text-accent-ai hover:text-accent-ai/80 transition-colors">
            {t('manage_team')}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Anna Schmidt', role: 'Lead Architect', type: 'Internal', status: 'Active' },
            { name: 'Marcus Weber', role: 'Structural Engineer', type: 'Freelancer', status: 'Active' },
            { name: 'Julia Koch', role: 'TGA Planner', type: 'Partner', status: 'Away' },
            { name: 'Tom Builder', role: 'Site Manager', type: 'Internal', status: 'Active' },
          ].map((person, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-surface hover:bg-surface/80 transition-colors cursor-pointer">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-sm font-medium border border-border">
                  {person.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className={cn(
                  "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface",
                  person.status === 'Active' ? "bg-emerald-500" : "bg-orange-500"
                )}></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{person.name}</p>
                <p className="text-xs text-text-muted truncate">{person.role}</p>
              </div>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-sm border",
                person.type === 'Freelancer' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                person.type === 'Partner' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                "bg-white/10 text-text-muted border-border"
              )}>
                {person.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity, Upcoming Deadlines & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-text-muted" />
            {t('recent_activity')}
          </h3>
          <div className="space-y-4">
            {[
              { text: t('project_initialized'), time: t('just_now'), type: 'info' },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-3 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                <div className="mt-0.5">
                  {activity.type === 'success' && <CheckCircle2 size={16} className="text-accent-success" />}
                  {activity.type === 'info' && <Box size={16} className="text-accent-ai" />}
                  {activity.type === 'warning' && <AlertTriangle size={16} className="text-accent-warning" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{activity.text}</p>
                  <p className="text-xs text-text-muted mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Clock size={16} className="text-text-muted" />
            {t('upcoming_deadlines')}
          </h3>
          <div className="space-y-4">
            {[
              { title: t('project_kickoff'), date: t('tbd'), type: 'Meeting' },
            ].map((event, i) => (
              <div key={i} className="flex items-start justify-between pb-4 border-b border-border/50 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{event.date}</p>
                </div>
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                  event.type === 'Meeting' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                  event.type === 'Milestone' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                  "bg-orange-500/10 text-orange-500 border-orange-500/20"
                )}>
                  {event.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="font-medium mb-4">{t('quick_actions')}</h3>
          <div className="space-y-2">
            {[
              t('upload_floor_plan'),
              t('generate_client_pitch_deck'),
              t('schedule_site_meeting'),
              t('review_budget_variance')
            ].map((action, i) => (
              <button key={i} className="w-full text-left px-4 py-3 rounded-lg border border-border bg-surface hover:bg-surface/80 transition-colors text-sm font-medium text-text-muted hover:text-text-primary flex items-center justify-between group">
                {action}
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}