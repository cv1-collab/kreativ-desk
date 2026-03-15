import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import { printElementToPdf } from '../utils/pdfHelper';
import NotificationCenter from './NotificationCenter';
import { motion } from 'motion/react';
import { 
  Building2, 
  Plus, 
  Users, 
  Settings, 
  Search,
  MoreVertical,
  LogOut,
  Briefcase,
  UserPlus,
  X,
  Shield,
  Moon,
  Sun,
  FolderOpen,
  FileText,
  Megaphone,
  Upload,
  Clock,
  Edit2,
  Trash2,
  DollarSign,
  LayoutDashboard,
  Command,
  Sparkles,
  ArrowRight,
  Activity,
  Bell,
  HelpCircle
} from 'lucide-react';
import { cn } from '../utils';

import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function CompanyDashboard() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { 
    projects, 
    companyUsers, 
    projectMembers,
    timeEntries,
    setActiveProject, 
    addProject, 
    addCompanyUser,
    updateCompanyUser,
    removeCompanyUser,
    addTimeEntry
  } = useProject();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'team' | 'documents' | 'templates' | 'leads' | 'timesheets' | 'settings'>('dashboard');
  
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: '',
    status: 'planning' as const,
    role: 'owner' as const
  });

  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'Internal' as const,
    department: '',
    hourlyRate: 0
  });

  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const [timeEntryForm, setTimeEntryForm] = useState({
    userId: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    hours: 0,
    hourlyRate: 0,
    description: ''
  });

  const [isTimesheetPrintModalOpen, setIsTimesheetPrintModalOpen] = useState(false);
  const [timesheetPrintSettings, setTimesheetPrintSettings] = useState({
    format: 'a4',
    orientation: 'portrait',
    scale: 1
  });
  const timesheetPreviewRef = useRef<HTMLDivElement>(null);

  const [leadForm, setLeadForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    zipCode: '',
    city: '',
    projectType: 'Residential',
    message: ''
  });

  const [collectedLeads, setCollectedLeads] = useState(() => [
    { id: '1', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', projectType: 'Residential', date: new Date(Date.now() - 86400000).toLocaleDateString(), status: 'New' },
    { id: '2', firstName: 'Anna', lastName: 'Schmidt', email: 'anna@example.com', projectType: 'Commercial', date: new Date(Date.now() - 172800000).toLocaleDateString(), status: 'Contacted' }
  ]);
  const [leadTab, setLeadTab] = useState<'form' | 'leads'>('form');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.firstName || !leadForm.email) return;
    
    const newLead = {
      id: Date.now().toString(),
      firstName: leadForm.firstName,
      lastName: leadForm.lastName,
      email: leadForm.email,
      projectType: leadForm.projectType,
      date: new Date().toLocaleDateString(),
      status: 'New'
    };
    
    setCollectedLeads([newLead, ...collectedLeads]);
    setLeadForm({
      firstName: '',
      lastName: '',
      email: '',
      zipCode: '',
      city: '',
      projectType: 'Residential',
      message: ''
    });
    setLeadTab('leads');
  };

  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'Document' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateOrEditTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name) return;
    
    if (editingTemplate) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? { ...t, name: templateForm.name, type: templateForm.type, lastUpdated: 'Just now' } : t));
    } else {
      setTemplates([...templates, { id: Date.now().toString(), name: templateForm.name, type: templateForm.type, lastUpdated: 'Just now' }]);
    }
    
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
    setTemplateForm({ name: '', type: 'Document' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, this would upload the file to a server
      setTemplates([...templates, { 
        id: Date.now().toString(), 
        name: file.name.replace(/\.[^/.]+$/, ""), 
        type: file.name.split('.').pop()?.toUpperCase() || 'File', 
        lastUpdated: 'Just now' 
      }]);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Add company logo / header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Kreativ-Desk OS', 20, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text('Lead Generation Report', 20, 30);
    
    // Add line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 35, 190, 35);
    
    // Add content
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    
    let yPos = 50;
    const addRow = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value || '-', 70, yPos);
      yPos += 10;
    };
    
    addRow('First Name', leadForm.firstName);
    addRow('Last Name', leadForm.lastName);
    addRow('Email', leadForm.email);
    addRow('ZIP Code', leadForm.zipCode);
    addRow('City', leadForm.city);
    addRow('Project Type', leadForm.projectType);
    
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Message / Details:', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    
    const splitMessage = doc.splitTextToSize(leadForm.message || 'No message provided.', 170);
    doc.text(splitMessage, 20, yPos);
    
    // Save the PDF
    doc.save(`Lead_${leadForm.lastName || 'Export'}.pdf`);
  };

  const handleProjectClick = (projectId: string) => {
    setActiveProject(projectId);
    navigate(`/project/${projectId}`);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectData.name) return;
    addProject(newProjectData);
    setIsNewProjectModalOpen(false);
    setNewProjectData({ name: '', description: '', status: 'planning', role: 'owner' });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email) return;
    addCompanyUser(newUserData);
    setIsNewUserModalOpen(false);
    setNewUserData({ name: '', email: '', role: 'Internal', department: '', hourlyRate: 0 });
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateCompanyUser(editingUser.id, {
      role: editingUser.role,
      department: editingUser.department,
      hourlyRate: editingUser.hourlyRate
    });
    setIsEditUserModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to remove this user?')) {
      removeCompanyUser(id);
      setActiveDropdownId(null);
    }
  };

  const handleLogTime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeEntryForm.userId || !timeEntryForm.projectId || timeEntryForm.hours <= 0) return;
    addTimeEntry({
      userId: timeEntryForm.userId,
      projectId: timeEntryForm.projectId,
      date: timeEntryForm.date,
      hours: timeEntryForm.hours,
      description: timeEntryForm.description,
      hourlyRate: timeEntryForm.hourlyRate
    });
    setTimeEntryForm({
      ...timeEntryForm,
      hours: 0,
      description: ''
    });
  };

  const executeTimesheetPrint = async () => {
    const element = document.getElementById('timesheet-pdf-content');
    if (!element) return;

    // Temporarily apply print styles
    element.classList.add('printing');
    
    try {
      printElementToPdf(element, 'Timesheet_Export');
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      element.classList.remove('printing');
      setIsTimesheetPrintModalOpen(false);
    }
  };

  const renderTimesheetContent = (isPreview = false) => {
    return (
      <div id="timesheet-pdf-content" className={cn("bg-surface text-text-primary", isPreview ? "p-4" : "p-8")}>
        <div className="mb-8 border-b border-border pb-4">
          <h1 className="text-2xl font-bold mb-2">Timesheet Report</h1>
          <p className="text-text-muted">Generated on {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="space-y-8">
          {projects.map(project => {
            const projectEntries = timeEntries.filter(e => e.projectId === project.id);
            if (projectEntries.length === 0) return null;
            
            const totalHours = projectEntries.reduce((sum, e) => sum + e.hours, 0);
            const totalCost = projectEntries.reduce((sum, e) => {
              const user = companyUsers.find(u => u.id === e.userId);
              const rate = e.hourlyRate !== undefined ? e.hourlyRate : (user?.hourlyRate || 0);
              return sum + (e.hours * rate);
            }, 0);

            return (
              <div key={project.id} className="mb-8 page-break-inside-avoid">
                <h2 className="text-xl font-semibold mb-4 text-accent-ai">{project.name}</h2>
                <table className="w-full text-sm text-left mb-4 border-collapse">
                  <thead className="bg-surface text-xs text-text-muted uppercase border-b border-border">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">User</th>
                      <th className="px-4 py-2 font-medium">Description</th>
                      <th className="px-4 py-2 font-medium">Rate</th>
                      <th className="px-4 py-2 font-medium text-right">Hours</th>
                      <th className="px-4 py-2 font-medium text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {projectEntries.map(entry => {
                      const user = companyUsers.find(u => u.id === entry.userId);
                      const rate = entry.hourlyRate !== undefined ? entry.hourlyRate : (user?.hourlyRate || 0);
                      const cost = rate * entry.hours;
                      return (
                        <tr key={entry.id} className="hover:bg-white/5">
                          <td className="px-4 py-2 text-text-muted">{entry.date}</td>
                          <td className="px-4 py-2 font-medium">{user?.name || 'Unknown'}</td>
                          <td className="px-4 py-2 text-text-muted">{entry.description}</td>
                          <td className="px-4 py-2 font-mono text-text-muted">CHF {rate}</td>
                          <td className="px-4 py-2 font-mono text-right">{entry.hours}h</td>
                          <td className="px-4 py-2 font-mono text-emerald-400 text-right">CHF {cost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-surface font-semibold border-t border-border">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right">Total:</td>
                      <td className="px-4 py-3 font-mono text-right">{totalHours}h</td>
                      <td className="px-4 py-3 font-mono text-emerald-400 text-right">CHF {totalCost.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-surface to-background border border-border flex items-center justify-center shadow-inner">
            <span className="font-bold text-sm tracking-tighter">KD</span>
          </div>
          <h1 className="font-semibold text-lg tracking-tight">Kreativ-Desk OS</h1>
          <span className="px-2 py-0.5 ml-2 text-xs font-medium bg-white/5 text-text-muted rounded-full border border-border">
            Company Workspace
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLanguage}
            className="px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary rounded-md hover:bg-white/5 transition-colors uppercase"
            title="Toggle Language"
          >
            {language}
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-full hover:bg-white/5 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <button 
            onClick={() => navigate('/help')}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors hover:bg-white/5"
            title="Help Center"
          >
            <HelpCircle size={18} />
          </button>

          <button 
            onClick={() => setIsNotificationOpen(true)}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded-md hover:bg-surface relative"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-surface"></span>
          </button>

          {currentUser?.email?.toLowerCase() === 'cv1@gmx.ch' && (
            <button 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm font-medium"
              title="Super Admin Dashboard"
            >
              <Shield size={16} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-surface border border-border">
            <button 
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="User Settings"
            >
              <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center shrink-0">
                <span className="text-xs font-medium">{currentUser?.email?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
              <span className="text-sm font-medium truncate max-w-[120px]">{currentUser?.email || 'User'}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="p-1 text-text-muted hover:text-accent-error transition-colors rounded-md hover:bg-surface ml-2"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        <NotificationCenter isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

        {/* Left Sidebar (Company Level Navigation) */}
        <aside className="lg:col-span-1 space-y-6">
          <nav className="space-y-1 relative">
            {[
              { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
              { id: 'projects', label: t('projects'), icon: Briefcase },
              { id: 'documents', label: t('documents'), icon: FolderOpen },
              { id: 'templates', label: t('templates'), icon: FileText },
              { id: 'leads', label: t('leads'), icon: Megaphone },
              { id: 'team', label: t('team'), icon: Users },
              { id: 'timesheets', label: t('timesheets'), icon: Clock },
              { id: 'settings', label: t('settings'), icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative z-10",
                    isActive 
                      ? "text-text-primary" 
                      : "text-text-muted hover:text-text-primary hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCompanyNav"
                      className="absolute inset-0 bg-white/5 border border-border/50 shadow-sm rounded-md -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon size={18} className={isActive ? "text-accent-ai" : ""} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 rounded-xl border border-border bg-surface space-y-4">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Company Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-muted">Active Projects</span>
                <span className="text-sm font-medium">{projects.filter(p => p.status === 'active').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-muted">Total Team Members</span>
                <span className="text-sm font-medium">{companyUsers.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-text-muted">Storage Used</span>
                <span className="text-sm font-medium">45 GB</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <motion.div 
          className="lg:col-span-3 space-y-6"
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Good morning, {currentUser?.email?.split('@')[0] || 'Visionary'}</h2>
                  <p className="text-sm text-text-muted mt-1">Here is your daily briefing and workspace overview.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setActiveTab('projects');
                      setIsNewProjectModalOpen(true);
                    }}
                    className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={16} />
                    New Project
                  </button>
                </div>
              </div>

              {/* AI Briefing Card */}
              <div className="p-6 rounded-xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles size={120} />
                </div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Sparkles size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-blue-400 mb-2">AI Concierge Briefing</h3>
                    <div className="space-y-2 text-sm text-text-primary">
                      <p>• <strong className="text-text-primary">System Status:</strong> All modules are synced and operational.</p>
                      <p>• <strong className="text-text-primary">Schedule:</strong> You have 3 meetings today. Next meeting in 45 minutes.</p>
                      <p>• <strong className="text-text-primary text-red-400">Alert:</strong> Project 'Campus Phase 1' has a pending budget review (5% variance detected).</p>
                    </div>
                    <button className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                      Review Budget Variance <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-border bg-surface hover:border-accent-ai/50 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-border flex items-center justify-center mb-4 group-hover:bg-accent-ai/10 group-hover:border-accent-ai/20 transition-colors">
                    <Building2 size={20} className="text-text-muted group-hover:text-accent-ai transition-colors" />
                  </div>
                  <h3 className="font-medium text-base mb-1">Active Projects</h3>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-semibold">{projects.filter(p => p.status === 'active').length}</span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1"><Activity size={12} /> +2 this month</span>
                  </div>
                </div>
                
                <div className="p-5 rounded-xl border border-border bg-surface hover:border-accent-ai/50 transition-all cursor-pointer group" onClick={() => setActiveTab('leads')}>
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-border flex items-center justify-center mb-4 group-hover:bg-accent-ai/10 group-hover:border-accent-ai/20 transition-colors">
                    <Megaphone size={20} className="text-text-muted group-hover:text-accent-ai transition-colors" />
                  </div>
                  <h3 className="font-medium text-base mb-1">New Leads</h3>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-semibold">{collectedLeads.length}</span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1"><Activity size={12} /> +5 this week</span>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-border bg-surface hover:border-accent-ai/50 transition-all cursor-pointer group" onClick={() => setActiveTab('timesheets')}>
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-border flex items-center justify-center mb-4 group-hover:bg-accent-ai/10 group-hover:border-accent-ai/20 transition-colors">
                    <Clock size={20} className="text-text-muted group-hover:text-accent-ai transition-colors" />
                  </div>
                  <h3 className="font-medium text-base mb-1">Hours Logged</h3>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-semibold">{timeEntries.reduce((sum, e) => sum + e.hours, 0)}h</span>
                    <span className="text-xs text-text-muted">This month</span>
                  </div>
                </div>
              </div>

              {/* Recent Projects */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Recent Projects</h3>
                  <button onClick={() => setActiveTab('projects')} className="text-sm text-accent-ai hover:text-accent-ai/80 transition-colors">View all</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.slice(0, 4).map(project => (
                    <div 
                      key={project.id}
                      onClick={() => handleProjectClick(project.id)}
                      className="group p-4 rounded-xl border border-border bg-surface hover:border-accent-ai/50 hover:shadow-lg hover:shadow-accent-ai/5 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-border flex items-center justify-center shrink-0 group-hover:bg-accent-ai/10 group-hover:border-accent-ai/20 transition-colors">
                          <Building2 size={20} className="text-text-muted group-hover:text-accent-ai transition-colors" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm group-hover:text-accent-ai transition-colors">{project.name}</h4>
                          <p className="text-xs text-text-muted mt-0.5">{project.status}</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-zinc-600 group-hover:text-accent-ai transition-colors" />
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <div className="col-span-2 p-8 border border-dashed border-border rounded-xl text-center">
                      <p className="text-sm text-text-muted">No projects yet. Create your first project to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
                <div className="flex items-center gap-3">
                  <button 
                    className="relative flex items-center w-full sm:w-64 pl-3 pr-2 py-2 bg-surface border border-border rounded-md text-sm text-text-muted hover:border-accent-ai/50 hover:text-text-primary transition-all group"
                  >
                    <Search size={16} className="mr-2" />
                    <span className="flex-1 text-left">Search or jump to...</span>
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-white/5 text-[10px] font-mono text-text-muted group-hover:text-accent-ai transition-colors">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </button>
                  <button 
                    onClick={() => setIsNewProjectModalOpen(true)}
                    className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={16} />
                    New Project
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(project => (
                  <div 
                    key={project.id}
                    onClick={() => handleProjectClick(project.id)}
                    className="group p-5 rounded-xl border border-border bg-surface hover:border-accent-ai/50 hover:shadow-lg hover:shadow-accent-ai/5 transition-all cursor-pointer flex flex-col h-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-border flex items-center justify-center shrink-0 group-hover:bg-accent-ai/10 group-hover:border-accent-ai/20 transition-colors">
                          <Building2 size={20} className="text-text-muted group-hover:text-accent-ai transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-medium text-base group-hover:text-accent-ai transition-colors">{project.name}</h3>
                          <p className="text-xs text-text-muted mt-0.5">Created {new Date(project.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button className="p-1.5 text-text-muted hover:text-text-primary rounded-md hover:bg-white/5 transition-colors" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical size={16} />
                      </button>
                    </div>
                    
                    <p className="text-sm text-text-muted line-clamp-2 mb-6 flex-1">
                      {project.description || 'No description provided.'}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
                          project.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          project.status === 'planning' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          "bg-white/5 text-text-muted border border-border"
                        )}>
                          {project.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-white/5 text-text-muted border border-border">
                          {project.role}
                        </span>
                      </div>
                      
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="w-6 h-6 rounded-full hover:bg-white/10 border-2 border-surface flex items-center justify-center text-[10px] font-medium z-10">
                            U{i}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Company Documents</h2>
                  <p className="text-sm text-text-muted mt-1">Central repository for all company-wide files.</p>
                </div>
                <button className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 whitespace-nowrap">
                  <Plus size={16} />
                  Upload Document
                </button>
              </div>
              <div className="p-12 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-surface">
                <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4 border border-border">
                  <FolderOpen size={24} className="text-text-muted" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">No documents uploaded</h3>
                <p className="text-sm text-text-muted max-w-md">Upload general company documents, guidelines, and assets here to make them available across all projects.</p>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Business Templates</h2>
                  <p className="text-sm text-text-muted mt-1">Manage templates for quotes, contracts, and reports.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white/5 text-text-primary rounded-md text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <Upload size={16} />
                    Upload File
                  </button>
                  <button 
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateForm({ name: '', type: 'Document' });
                      setIsTemplateModalOpen(true);
                    }}
                    className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={16} />
                    New Template
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="p-5 rounded-xl border border-border bg-surface hover:border-accent-ai/50 transition-all flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-border flex items-center justify-center">
                        <FileText size={20} className="text-text-muted" />
                      </div>
                      <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-text-muted border border-border">
                        {template.type}
                      </span>
                    </div>
                    <h3 className="font-medium text-base mb-1">{template.name}</h3>
                    <p className="text-xs text-text-muted mb-4">Last updated {template.lastUpdated}</p>
                    <div className="mt-auto pt-4 border-t border-border/50 flex justify-between items-center text-xs font-medium">
                      <button 
                        onClick={() => {
                          setEditingTemplate(template);
                          setTemplateForm({ name: template.name, type: template.type });
                          setIsTemplateModalOpen(true);
                        }}
                        className="text-accent-ai hover:text-accent-ai/80 transition-colors"
                      >
                        Edit Template
                      </button>
                      <button className="text-text-muted hover:text-text-primary transition-colors">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Lead Generation</h2>
                  <p className="text-sm text-text-muted mt-1">Manage your public inquiry forms and collected leads.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-surface border border-border rounded-md p-1">
                    <button 
                      onClick={() => setLeadTab('form')}
                      className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors", leadTab === 'form' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
                    >
                      Form Preview
                    </button>
                    <button 
                      onClick={() => setLeadTab('leads')}
                      className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2", leadTab === 'leads' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
                    >
                      Collected Leads
                      <span className="bg-accent-ai text-text-primary text-[10px] px-1.5 py-0.5 rounded-full">{collectedLeads.length}</span>
                    </button>
                  </div>
                  {leadTab === 'form' && (
                    <button 
                      onClick={() => setIsShareModalOpen(true)}
                      className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Megaphone size={16} />
                      Share Form
                    </button>
                  )}
                  {leadTab === 'leads' && (
                    <button 
                      onClick={handleExportPDF}
                      className="px-4 py-2 bg-surface border border-border text-text-primary rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <FileText size={16} />
                      Export PDF
                    </button>
                  )}
                </div>
              </div>
              
              {leadTab === 'form' ? (
                <div className="bg-surface border border-border rounded-xl p-6 md:p-8 max-w-3xl mx-auto w-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-400 text-xs px-3 py-1 rounded-bl-lg border-b border-l border-blue-500/20 font-medium flex items-center gap-1">
                    <LogOut size={12} className="rotate-180" /> Live Preview
                  </div>
                  <h3 className="text-xl font-semibold mb-2">New Project Inquiry</h3>
                  <p className="text-sm text-text-muted mb-6">This is how the form will appear to your clients on your website or via the shared link.</p>
                  <form onSubmit={handleSubmitLead} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">First Name *</label>
                        <input 
                          type="text" 
                          required
                          value={leadForm.firstName}
                          onChange={e => setLeadForm({...leadForm, firstName: e.target.value})}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50" 
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">Last Name</label>
                        <input 
                          type="text" 
                          value={leadForm.lastName}
                          onChange={e => setLeadForm({...leadForm, lastName: e.target.value})}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50" 
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Email Address *</label>
                      <input 
                        type="email" 
                        required
                        value={leadForm.email}
                        onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50" 
                        placeholder="john@example.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">Postal Code (PLZ)</label>
                        <input 
                          type="text" 
                          value={leadForm.zipCode}
                          onChange={e => setLeadForm({...leadForm, zipCode: e.target.value})}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50" 
                          placeholder="10115"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">City (Ort)</label>
                        <input 
                          type="text" 
                          value={leadForm.city}
                          onChange={e => setLeadForm({...leadForm, city: e.target.value})}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50" 
                          placeholder="Berlin"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Project Type</label>
                      <select 
                        value={leadForm.projectType}
                        onChange={e => setLeadForm({...leadForm, projectType: e.target.value})}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                      >
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Renovation">Renovation</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Message / Project Details</label>
                      <textarea 
                        value={leadForm.message}
                        onChange={e => setLeadForm({...leadForm, message: e.target.value})}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 h-32 resize-none" 
                        placeholder="Tell us about your project..."
                      />
                    </div>
                    
                    <div className="pt-4 border-t border-border">
                      <button type="submit" className="w-full py-2.5 bg-white text-black rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                        Submit Inquiry (Test)
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-surface text-xs text-text-muted uppercase">
                      <tr>
                        <th className="px-6 py-3 font-medium">Name</th>
                        <th className="px-6 py-3 font-medium">Email</th>
                        <th className="px-6 py-3 font-medium">Type</th>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {collectedLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-text-primary">{lead.firstName} {lead.lastName}</td>
                          <td className="px-6 py-4 text-text-muted">{lead.email}</td>
                          <td className="px-6 py-4 text-text-muted">{lead.projectType}</td>
                          <td className="px-6 py-4 text-text-muted">{lead.date}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium border",
                              lead.status === 'New' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-text-muted hover:text-text-primary transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {collectedLeads.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-text-muted">
                            No leads collected yet. Share your form to get started!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'team' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-tight">Team & Users</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      className="pl-9 pr-4 py-2 bg-surface border border-border rounded-md text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all w-full sm:w-64"
                    />
                  </div>
                  <button 
                    onClick={() => setIsNewUserModalOpen(true)}
                    className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2 whitespace-nowrap"
                  >
                    <UserPlus size={16} />
                    Invite User
                  </button>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-xs text-text-muted uppercase">
                    <tr>
                      <th className="px-6 py-3 font-medium">User</th>
                      <th className="px-6 py-3 font-medium">Role</th>
                      <th className="px-6 py-3 font-medium">Department</th>
                      <th className="px-6 py-3 font-medium">Rate / Hr</th>
                      <th className="px-6 py-3 font-medium">Workload</th>
                      <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {companyUsers.map((user) => {
                      const activeProjectsCount = projectMembers.filter(m => m.userId === user.id).length;
                      let workloadColor = "bg-emerald-500";
                      if (activeProjectsCount > 3) workloadColor = "bg-orange-500";
                      if (activeProjectsCount > 5) workloadColor = "bg-red-500";
                      
                      return (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium">{user.name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="font-medium text-text-primary">{user.name}</div>
                              <div className="text-xs text-text-muted">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium border",
                            user.role === 'Admin' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            user.role === 'External Planner' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                            user.role === 'Client' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                            "bg-white/5 text-text-primary border-border"
                          )}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-text-muted">
                          {user.department || '-'}
                        </td>
                        <td className="px-6 py-4 text-text-muted font-mono">
                          {user.hourlyRate ? `CHF ${user.hourlyRate}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", workloadColor)} />
                            <span className="text-xs text-text-muted">{activeProjectsCount} Projects</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === user.id ? null : user.id);
                            }}
                            className="p-1.5 text-text-muted hover:text-text-primary rounded-md hover:bg-white/5 transition-colors"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {activeDropdownId === user.id && (
                            <div className="absolute right-6 top-10 w-48 bg-surface border border-border rounded-md shadow-xl z-20 py-1 animate-in fade-in zoom-in-95">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingUser(user);
                                  setIsEditUserModalOpen(true);
                                  setActiveDropdownId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-white/5 flex items-center gap-2"
                              >
                                <Edit2 size={14} /> Edit Role & Rate
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(user.id);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Remove User
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'timesheets' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Time Tracking</h2>
                  <p className="text-sm text-text-muted mt-1">Log hours and view aggregated project timesheets.</p>
                </div>
                <button 
                  onClick={() => setIsTimesheetPrintModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 text-text-primary rounded-md text-sm font-medium transition-colors"
                >
                  <FileText size={16} /> Export PDF
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Log Time Form */}
                <div className="lg:col-span-1 bg-surface border border-border rounded-xl p-6 h-fit">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-accent-ai" /> Log Hours
                  </h3>
                  <form onSubmit={handleLogTime} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">User</label>
                      <select 
                        required
                        value={timeEntryForm.userId}
                        onChange={e => {
                          const userId = e.target.value;
                          const user = companyUsers.find(u => u.id === userId);
                          setTimeEntryForm({
                            ...timeEntryForm, 
                            userId,
                            hourlyRate: user?.hourlyRate || 0
                          });
                        }}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                      >
                        <option value="">Select User...</option>
                        {companyUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Project</label>
                      <select 
                        required
                        value={timeEntryForm.projectId}
                        onChange={e => setTimeEntryForm({...timeEntryForm, projectId: e.target.value})}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                      >
                        <option value="">Select Project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Date</label>
                      <input 
                        type="date" 
                        required
                        value={timeEntryForm.date}
                        onChange={e => setTimeEntryForm({...timeEntryForm, date: e.target.value})}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">Hours</label>
                        <input 
                          type="number" 
                          step="0.5"
                          min="0.5"
                          required
                          value={timeEntryForm.hours || ''}
                          onChange={e => setTimeEntryForm({...timeEntryForm, hours: parseFloat(e.target.value)})}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-primary">Rate (CHF)</label>
                        <input 
                          type="number" 
                          step="1"
                          min="0"
                          required
                          value={timeEntryForm.hourlyRate || ''}
                          onChange={e => setTimeEntryForm({...timeEntryForm, hourlyRate: parseFloat(e.target.value)})}
                          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Description</label>
                      <input 
                        type="text" 
                        required
                        value={timeEntryForm.description}
                        onChange={e => setTimeEntryForm({...timeEntryForm, description: e.target.value})}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                        placeholder="What did you work on?"
                      />
                    </div>
                    <button type="submit" className="w-full py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors">
                      Save Entry
                    </button>
                  </form>
                </div>

                {/* Timesheet Summary */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-border bg-surface">
                      <h3 className="font-semibold">Recent Entries</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface text-xs text-text-muted uppercase">
                        <tr>
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 font-medium">User</th>
                          <th className="px-6 py-3 font-medium">Project</th>
                          <th className="px-6 py-3 font-medium">Hours</th>
                          <th className="px-6 py-3 font-medium">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {timeEntries.map(entry => {
                          const user = companyUsers.find(u => u.id === entry.userId);
                          const project = projects.find(p => p.id === entry.projectId);
                          const rate = entry.hourlyRate !== undefined ? entry.hourlyRate : (user?.hourlyRate || 0);
                          const cost = rate * entry.hours;
                          return (
                            <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-3 text-text-muted">{entry.date}</td>
                              <td className="px-6 py-3 font-medium">{user?.name || 'Unknown'}</td>
                              <td className="px-6 py-3 text-text-muted">{project?.name || 'Unknown'}</td>
                              <td className="px-6 py-3 font-mono">{entry.hours}h</td>
                              <td className="px-6 py-3 font-mono text-emerald-400">CHF {cost.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        {timeEntries.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-text-muted">No time entries found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Aggregated view per project */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {projects.map(project => {
                      const projectEntries = timeEntries.filter(e => e.projectId === project.id);
                      if (projectEntries.length === 0) return null;
                      
                      const totalHours = projectEntries.reduce((sum, e) => sum + e.hours, 0);
                      const totalCost = projectEntries.reduce((sum, e) => {
                        const user = companyUsers.find(u => u.id === e.userId);
                        const rate = e.hourlyRate !== undefined ? e.hourlyRate : (user?.hourlyRate || 0);
                        return sum + (e.hours * rate);
                      }, 0);

                      return (
                        <div key={project.id} className="bg-surface border border-border rounded-xl p-5">
                          <h4 className="font-medium mb-4 truncate">{project.name}</h4>
                          <div className="flex justify-between items-end">
                            <div>
                              <div className="text-xs text-text-muted mb-1">Total Hours</div>
                              <div className="text-2xl font-light font-mono">{totalHours}h</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-text-muted mb-1">Total Cost</div>
                              <div className="text-xl font-medium font-mono text-emerald-400">CHF {totalCost.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-xl font-semibold tracking-tight mb-6">Company Settings</h2>
                <p className="text-text-muted text-sm mb-6">Manage your company profile and general preferences.</p>
                
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Company Name</label>
                    <input type="text" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50" defaultValue="Kreativ-Desk" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Contact Email</label>
                    <input type="email" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50" defaultValue="hello@kreativ-desk.com" />
                  </div>
                  <button className="px-4 py-2 bg-white/5 text-text-primary rounded-md text-sm font-medium hover:bg-white/10 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <h2 className="text-xl font-semibold tracking-tight mb-6">Appearance & Screensaver</h2>
                <p className="text-text-muted text-sm mb-6">Customize the idle screen that appears after a period of inactivity.</p>
                
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Screensaver Timeout (Minutes)</label>
                    <select defaultValue="5" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50">
                      <option value="1">1 Minute</option>
                      <option value="5">5 Minutes</option>
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Welcome Message</label>
                    <input type="text" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50" defaultValue="Kreativ-Desk OS" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Background Image URL</label>
                    <input type="text" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50" defaultValue="https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop" />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="showClock" defaultChecked className="rounded border-border bg-background text-accent-ai focus:ring-accent-ai/50" />
                    <label htmlFor="showClock" className="text-sm font-medium text-text-primary">Show Clock</label>
                  </div>
                  <button className="px-4 py-2 bg-white/5 text-text-primary rounded-md text-sm font-medium hover:bg-white/10 transition-colors mt-2">
                    Save Appearance Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Create Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <h3 className="font-semibold text-lg">Create New Project</h3>
              <button 
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Project Name</label>
                <input 
                  type="text" 
                  required
                  value={newProjectData.name}
                  onChange={e => setNewProjectData({...newProjectData, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                  placeholder="e.g., Berlin Central Station"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Description</label>
                <textarea 
                  value={newProjectData.description}
                  onChange={e => setNewProjectData({...newProjectData, description: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all resize-none h-24"
                  placeholder="Brief description of the project..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Status</label>
                  <select 
                    value={newProjectData.status}
                    onChange={e => setNewProjectData({...newProjectData, status: e.target.value as any})}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Your Role</label>
                  <select 
                    value={newProjectData.role}
                    onChange={e => setNewProjectData({...newProjectData, role: e.target.value as any})}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <h3 className="font-semibold text-lg">Invite Team Member</h3>
              <button 
                onClick={() => setIsNewUserModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newUserData.name}
                  onChange={e => setNewUserData({...newUserData, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                  placeholder="e.g., Jane Doe"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newUserData.email}
                  onChange={e => setNewUserData({...newUserData, email: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                  placeholder="jane@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Company Role</label>
                <select 
                  value={newUserData.role}
                  onChange={e => setNewUserData({...newUserData, role: e.target.value as any})}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                >
                  <option value="Internal">Internal Employee</option>
                  <option value="External Planner">External Planner</option>
                  <option value="Admin">Company Admin</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <h3 className="font-semibold text-lg">{editingTemplate ? 'Edit Template' : 'Create New Template'}</h3>
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrEditTemplate} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Template Name</label>
                <input 
                  type="text" 
                  required
                  value={templateForm.name}
                  onChange={e => setTemplateForm({...templateForm, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                  placeholder="e.g., Standard Contract 2024"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Type</label>
                <select 
                  value={templateForm.type}
                  onChange={e => setTemplateForm({...templateForm, type: e.target.value})}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all"
                >
                  <option value="Document">Document</option>
                  <option value="Form">Form</option>
                  <option value="Spreadsheet">Spreadsheet</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20"
                >
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Share Form Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <h3 className="font-semibold text-lg">Share Lead Form</h3>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Public Link</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value="https://kreativ-desk.os/f/new-project-inquiry" 
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-text-muted focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("https://kreativ-desk.os/f/new-project-inquiry");
                      alert("Link copied to clipboard!");
                    }}
                    className="px-4 py-2 bg-white/5 text-text-primary rounded-md text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Embed Code (Website)</label>
                <div className="relative">
                  <textarea 
                    readOnly 
                    value={`<iframe src="https://kreativ-desk.os/f/new-project-inquiry?embed=true" width="100%" height="600" frameborder="0"></iframe>`}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-text-muted focus:outline-none h-24 font-mono text-xs resize-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="https://kreativ-desk.os/f/new-project-inquiry?embed=true" width="100%" height="600" frameborder="0"></iframe>`);
                      alert("Embed code copied to clipboard!");
                    }}
                    className="absolute bottom-2 right-2 px-3 py-1 bg-white/5 text-text-primary rounded text-xs font-medium hover:bg-white/10 transition-colors"
                  >
                    Copy Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Timesheet Print Modal */}
      {isTimesheetPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Settings Sidebar */}
            <div className="w-80 border-r border-border bg-surface flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText size={18} className="text-accent-ai" />
                  PDF Export Settings
                </h3>
                <button 
                  onClick={() => setIsTimesheetPrintModalOpen(false)}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-text-primary">Paper Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setTimesheetPrintSettings({...timesheetPrintSettings, format: 'a4'})}
                      className={cn(
                        "py-2 px-3 text-sm rounded-md border transition-colors",
                        timesheetPrintSettings.format === 'a4' 
                          ? "bg-accent-ai/10 border-accent-ai text-accent-ai" 
                          : "bg-background border-border text-text-muted hover:border-zinc-600"
                      )}
                    >
                      A4
                    </button>
                    <button 
                      onClick={() => setTimesheetPrintSettings({...timesheetPrintSettings, format: 'a3'})}
                      className={cn(
                        "py-2 px-3 text-sm rounded-md border transition-colors",
                        timesheetPrintSettings.format === 'a3' 
                          ? "bg-accent-ai/10 border-accent-ai text-accent-ai" 
                          : "bg-background border-border text-text-muted hover:border-zinc-600"
                      )}
                    >
                      A3
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-text-primary">Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setTimesheetPrintSettings({...timesheetPrintSettings, orientation: 'portrait'})}
                      className={cn(
                        "py-2 px-3 text-sm rounded-md border transition-colors",
                        timesheetPrintSettings.orientation === 'portrait' 
                          ? "bg-accent-ai/10 border-accent-ai text-accent-ai" 
                          : "bg-background border-border text-text-muted hover:border-zinc-600"
                      )}
                    >
                      Portrait
                    </button>
                    <button 
                      onClick={() => setTimesheetPrintSettings({...timesheetPrintSettings, orientation: 'landscape'})}
                      className={cn(
                        "py-2 px-3 text-sm rounded-md border transition-colors",
                        timesheetPrintSettings.orientation === 'landscape' 
                          ? "bg-accent-ai/10 border-accent-ai text-accent-ai" 
                          : "bg-background border-border text-text-muted hover:border-zinc-600"
                      )}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-text-primary">Scale</label>
                    <span className="text-xs text-text-muted font-mono">{Math.round(timesheetPrintSettings.scale * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="1.5" 
                    step="0.05"
                    value={timesheetPrintSettings.scale}
                    onChange={(e) => setTimesheetPrintSettings({...timesheetPrintSettings, scale: parseFloat(e.target.value)})}
                    className="w-full accent-accent-ai"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border bg-surface">
                <button 
                  onClick={executeTimesheetPrint}
                  className="w-full py-2.5 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={16} /> Generate PDF
                </button>
              </div>
            </div>

            {/* Live Preview Pane */}
            <div className="flex-1 bg-black overflow-y-auto p-8 flex justify-center">
              <div 
                className="bg-white text-black shadow-2xl transition-all duration-300 origin-top"
                style={{ 
                  width: timesheetPrintSettings.orientation === 'portrait' 
                    ? (timesheetPrintSettings.format === 'a4' ? '210mm' : '297mm') 
                    : (timesheetPrintSettings.format === 'a4' ? '297mm' : '420mm'),
                  minHeight: timesheetPrintSettings.orientation === 'portrait' 
                    ? (timesheetPrintSettings.format === 'a4' ? '297mm' : '420mm') 
                    : (timesheetPrintSettings.format === 'a4' ? '210mm' : '297mm'),
                  transform: `scale(${timesheetPrintSettings.scale})`,
                  marginBottom: `${(timesheetPrintSettings.scale - 1) * 100}%`
                }}
              >
                {renderTimesheetContent(true)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
              <h3 className="font-semibold text-lg">Edit User: {editingUser.name}</h3>
              <button 
                onClick={() => setIsEditUserModalOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Role</label>
                  <select 
                    value={editingUser.role}
                    onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                  >
                    <option value="Internal">Internal</option>
                    <option value="Admin">Admin</option>
                    <option value="External Planner">External Planner</option>
                    <option value="Client">Client</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Department</label>
                  <input 
                    type="text" 
                    value={editingUser.department || ''}
                    onChange={e => setEditingUser({...editingUser, department: e.target.value})}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Hourly Rate (CHF)</label>
                <div className="relative">
                  <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="number" 
                    value={editingUser.hourlyRate || ''}
                    onChange={e => setEditingUser({...editingUser, hourlyRate: parseFloat(e.target.value)})}
                    className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent-ai/50"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
