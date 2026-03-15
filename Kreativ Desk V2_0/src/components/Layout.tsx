import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Wallet, 
  Box, 
  MessageSquare, 
  Users, 
  PenTool, 
  Presentation, 
  AlertTriangle, 
  Network,
  Menu,
  X,
  FolderOpen,
  Camera,
  LogOut,
  ArrowLeft,
  Bell,
  Search,
  HelpCircle,
  Settings,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationCenter from './NotificationCenter';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { currentUser, userRole, logout } = useAuth();
  const { projects, activeProjectId, setActiveProject } = useProject();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const location = useLocation();

  const navItems = [
    { path: '', icon: LayoutDashboard, label: t('dashboard'), end: true },
    { path: 'team', icon: Users, label: t('project_team') },
    { path: 'calendar', icon: CalendarDays, label: t('smart_calendar') },
    { path: 'finance', icon: Wallet, label: t('finance_budget'), roles: ['Internal', 'Admin'] },
    { path: 'bim', icon: Box, label: t('3d_viewer') },
    { path: 'meet', icon: MessageSquare, label: t('meet_chat') },
    { path: 'crm', icon: Users, label: t('crm_docs'), roles: ['Internal', 'Admin'] },
    { path: 'documents', icon: FolderOpen, label: t('document_hub') },
    { path: 'site', icon: Camera, label: t('site_monitoring') },
    { path: 'whiteboard', icon: PenTool, label: t('audio_whiteboard') },
    { path: 'pitch', icon: Presentation, label: t('pitch_deck'), roles: ['Internal', 'Admin'] },
    { path: 'defects', icon: AlertTriangle, label: t('defects') },
    { path: 'api', icon: Network, label: t('api_roadmap'), roles: ['Internal', 'Admin'] },
  ].filter(item => !item.roles || item.roles.includes(userRole || 'Internal'));

  const activeProject = projects.find(p => p.id === (projectId || activeProjectId));

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
      setActiveProject(projectId);
    }
  }, [projectId, activeProjectId, setActiveProject]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="flex h-screen bg-background text-text-primary overflow-hidden">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-ai rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Kreativ-Desk</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-2 text-text-muted hover:text-text-primary rounded-md hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto app-scrollbar py-4">
          <div className="px-4 mb-4">
            <button 
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              Back to Projects
            </button>
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Active Project
            </div>
            <div className="bg-white/5 border border-border rounded-lg p-3">
              <div className="font-medium truncate">{activeProject?.name || 'Select Project'}</div>
              <div className="text-xs text-text-muted truncate">{activeProject?.status || 'No status'}</div>
            </div>
          </div>

          <nav className="px-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-accent-ai/10 text-accent-ai" 
                    : "text-text-muted hover:text-text-primary hover:bg-white/5"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-accent-ai/20 flex items-center justify-center text-accent-ai font-bold shrink-0">
              {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium truncate">{currentUser?.email}</div>
              <div className="text-xs text-text-muted truncate">Pro Plan</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent-error hover:bg-accent-error/10 rounded-md transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-text-muted hover:text-text-primary rounded-md hover:bg-white/5"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md text-sm text-text-muted w-64">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search project..." 
                className="bg-transparent border-none focus:outline-none w-full text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary rounded-md hover:bg-white/5 transition-colors uppercase"
              title="Toggle Language"
            >
              {language}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-white/5 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={() => navigate('/help')}
              className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-white/5 transition-colors"
              title="Help Center"
            >
              <HelpCircle size={20} />
            </button>
            
            <button 
              onClick={() => navigate('/settings')}
              className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-white/5 transition-colors"
              title="Settings"
            >
              <Settings size={20} />
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-white/5 transition-colors relative"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-error rounded-full"></span>
              </button>
              
              <NotificationCenter isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-background p-4 md:p-6 app-scrollbar relative flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
