import React from 'react';
import { Network, CheckCircle2, XCircle, Clock, ArrowRight, Database, Cloud, Lock, AlertCircle } from 'lucide-react';
import { cn } from '../utils';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function API() {
  const { userRole } = useAuth();

  if (userRole && !['Internal', 'Admin'].includes(userRole)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold">Access Denied</h2>
          <p className="text-text-secondary mt-2">You do not have permission to view the API module.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 flex-1 flex flex-col min-h-0"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API & Roadmap</h1>
          <p className="text-text-muted text-sm mt-1">Integration status panels for external industry standards</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
            <Database size={16} />
            View Logs
          </button>
          <button className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2">
            <Network size={16} />
            Add Integration
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Integrations Grid */}
        <div className="flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden p-6">
          <h3 className="font-medium mb-6 flex items-center gap-2">
            <Cloud size={18} className="text-text-muted" />
            Active Integrations
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'DATEV', type: 'Finance & Accounting', status: 'Connected', icon: 'D', color: 'bg-green-600' },
              { name: 'Vectorworks', type: 'CAD / BIM', status: 'Connected', icon: 'V', color: 'bg-blue-600' },
              { name: 'Dropbox', type: 'File Storage', status: 'Syncing', icon: 'Db', color: 'bg-blue-400' },
              { name: 'Zoom', type: 'Video Conferencing', status: 'Disconnected', icon: 'Z', color: 'bg-blue-500' },
              { name: 'Stripe', type: 'Payments', status: 'Connected', icon: 'S', color: 'bg-indigo-500' },
              { name: 'Slack', type: 'Messaging', status: 'Connected', icon: 'Sl', color: 'bg-purple-500' },
            ].map((integration, i) => (
              <div key={i} className="p-5 border border-border rounded-xl bg-surface hover:bg-white/5 transition-colors flex flex-col gap-4 relative overflow-hidden group">
                <div className={cn(
                  "absolute top-0 left-0 w-full h-1",
                  integration.status === 'Connected' ? "bg-emerald-500" :
                  integration.status === 'Syncing' ? "bg-blue-500" : "bg-red-500"
                )}></div>
                
                <div className="flex items-start justify-between">
                  <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold text-text-primary shadow-inner", integration.color)}>
                    {integration.icon}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-white/5 border border-border">
                    {integration.status === 'Connected' && <CheckCircle2 size={12} className="text-emerald-500" />}
                    {integration.status === 'Syncing' && <Clock size={12} className="text-blue-500 animate-spin" />}
                    {integration.status === 'Disconnected' && <XCircle size={12} className="text-red-500" />}
                    {integration.status}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-text-primary">{integration.name}</h4>
                  <p className="text-sm text-text-muted">{integration.type}</p>
                </div>
                
                <div className="mt-auto pt-4 border-t border-border/50 flex justify-between items-center">
                  <span className="text-xs text-text-muted">Last sync: 2 mins ago</span>
                  <button className="text-text-muted hover:text-accent-ai transition-colors">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap Sidebar */}
        <div className="w-full lg:w-80 bg-surface border border-border rounded-xl flex flex-col shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Lock size={18} className="text-text-muted" />
              API Roadmap
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="relative pl-6 border-l-2 border-zinc-800 space-y-8">
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-surface"></div>
                <h4 className="text-sm font-semibold text-text-primary">Q4 2023 (Current)</h4>
                <p className="text-xs text-text-muted mt-1">Core RAG AI Integration, DATEV Sync, Vectorworks Plugin v1.0.</p>
              </div>
              
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-surface"></div>
                <h4 className="text-sm font-semibold text-text-primary">Q1 2024</h4>
                <p className="text-xs text-text-muted mt-1">Revit Native Support, Advanced Financial Forecasting API, Custom Webhooks.</p>
              </div>
              
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white/10 border-4 border-surface"></div>
                <h4 className="text-sm font-semibold text-text-primary">Q2 2024</h4>
                <p className="text-xs text-text-muted mt-1">Public GraphQL API, Zapier Integration, SSO (SAML/OAuth2).</p>
              </div>
              
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white/10 border-4 border-surface"></div>
                <h4 className="text-sm font-semibold text-text-primary">Q3 2024</h4>
                <p className="text-xs text-text-muted mt-1">IoT Sensor Integration (Site Monitoring), Automated Drone Survey Sync.</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-surface text-center">
            <button className="w-full py-2 bg-white/10 border border-border rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Network size={16} />
              View API Docs
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
