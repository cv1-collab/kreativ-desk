import React, { useState, useEffect } from 'react';
import { 
  Moon, Sun, LayoutDashboard, Calculator, Trello, Box, Video, 
  CheckCircle, Wallet, Clock, AlertTriangle, CheckCircle2, 
  MoreHorizontal, Calendar, FileText, ChevronDown, Sparkles, 
  Plus, Minus, Layers, Mic, MicOff, Send, MonitorUp, PhoneOff, Check, ArrowRight,
  Users, CalendarDays, MessageSquare, FolderOpen, Camera, PenTool, Presentation, Network,
  Monitor, Smartphone, ChevronRight, Zap, Shield, Globe
} from 'lucide-react';
import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './Dashboard';
import Finance from './Finance';
import ProjectTeam from './ProjectTeam';
import CalendarComponent from './Calendar';
import BIMViewer from './BIMViewer';
import MeetChat from './MeetChat';
import CRM from './CRM';
import Documents from './Documents';
import SiteMonitoring from './SiteMonitoring';
import Whiteboard from './Whiteboard';
import PitchDeck from './PitchDeck';
import Defects from './Defects';
import API from './API';
import { ProjectContext, Project } from '../contexts/ProjectContext';
import { AuthContext, useAuth } from '../contexts/AuthContext';
import DemoApp from './DemoApp';

const translations = {
  DE: {
    nav: {
      demo: 'Software Live-Demo',
      roi: 'ROI Rechner',
      pricing: 'Preise',
      login: 'Login',
      start: 'Workspace starten'
    },
    hero: {
      badge: 'Echte Software. Keine Fake-Bilder.',
      title1: 'Probier es aus.',
      title2: 'Hier und Jetzt.',
      subtitle: 'Klicke dich durch das echte Dashboard von Kreativ Desk direkt hier auf der Seite. Erlebe Live-Budgets, das Aufgaben-Board und den 3D-BIM Scanner, ohne dich registrieren zu müssen.'
    },
    roi: {
      title: 'Was kostet das App-Chaos?',
      subtitle: 'Berechne, wie viel Lizenzgebühren dein Team pro Jahr spart.',
      teamSize: 'Teamgröße (Nutzer)',
      oldTools: 'Bisherige Tools (Monatlich pro Nutzer)',
      assumedCost: 'Angenommene monatliche Kosten pro Nutzer (z.B. Dropbox, Microsoft, Software Abos)',
      totalOld: 'Gesamt für',
      users: 'Nutzer:',
      kd: 'Kreativ Desk (Monatlich)',
      allIncluded: 'Alle Tools inklusive',
      proPlan: 'Pro Abo (Flat)',
      savings: 'Deine jährliche Ersparnis'
    },
    pricing: {
      title: 'Einfache, transparente Preise',
      subtitle: 'Jeder Nutzer erhält bei Registrierung ein 30-tägiges kostenloses Testabo. Danach wählst du dein passendes Paket.',
      perMonth: ' / Monat',
      starter: {
        title: 'Starter',
        desc: 'Perfekt für Freelancer und kleine Studios.',
        price: 'CHF 39',
        features: ['Bis zu 3 aktive Projekte', '50 GB Cloud Storage', 'Basis 3D Viewer (BIM)', 'Standard Finanzen', 'Kein AI Concierge'],
        cta: 'Kostenlos testen'
      },
      pro: {
        badge: 'Beliebtestes Abo',
        title: 'Pro',
        desc: 'Für wachsende Agenturen mit AI-Power.',
        price: 'CHF 79',
        features: ['Unlimitierte Projekte', '250 GB Cloud Storage', 'Advanced 3D Viewer (BIM)', 'Volle Finanzen & Cashflow', 'AI Concierge & Audits', 'Pitch Deck Generator'],
        cta: 'Workspace starten'
      },
      business: {
        title: 'Business',
        desc: 'Enterprise Security und Custom Workflows.',
        price: 'CHF 159',
        features: ['Alles aus Pro', '1 TB Cloud Storage', 'Custom Branding', 'Dedicated Account Manager', 'SSO & Advanced Security'],
        cta: 'Kontakt aufnehmen'
      }
    },
    faq: {
      title: 'Häufig gestellte Fragen',
      items: [
        {
          q: 'Wie kann ich bezahlen?',
          a: 'Wir akzeptieren alle gängigen Kreditkarten (Visa, Mastercard, American Express) sowie Apple Pay und Google Pay. Die Zahlungsabwicklung erfolgt sicher über Stripe.'
        },
        {
          q: 'Kann ich mein Abo jederzeit kündigen?',
          a: 'Ja, du kannst dein Abonnement jederzeit zum Ende der aktuellen Abrechnungsperiode kündigen. Es gibt keine versteckten Kündigungsfristen.'
        },
        {
          q: 'Was passiert nach der 30-tägigen Testphase?',
          a: 'Nach 30 Tagen wirst du gebeten, eine Zahlungsmethode zu hinterlegen, um Kreativ-Desk OS weiterhin nutzen zu können. Deine Daten bleiben in jedem Fall erhalten.'
        },
        {
          q: 'Sind meine Daten sicher?',
          a: 'Absolut. Wir nutzen modernste Verschlüsselung und hosten unsere Infrastruktur auf sicheren europäischen Servern in Übereinstimmung mit der DSGVO.'
        }
      ]
    },
    footer: {
      description: 'Das All-in-One Ökosystem für Projektentwicklung und Baumanagement.',
      madeIn: 'Made in Switzerland.',
      product: 'Produkt',
      legal: 'Rechtliches',
      privacy: 'Datenschutzerklärung',
      imprint: 'Impressum',
      adminLogin: 'Admin Login'
    }
  },
  EN: {
    nav: {
      demo: 'Software Live-Demo',
      roi: 'ROI Calculator',
      pricing: 'Pricing',
      login: 'Login',
      start: 'Start Workspace'
    },
    hero: {
      badge: 'Real Software. No Fake Images.',
      title1: 'Try it out.',
      title2: 'Right here, right now.',
      subtitle: 'Click through the real Kreativ Desk dashboard directly on this page. Experience live budgets, the task board, and the 3D BIM scanner without having to register.'
    },
    roi: {
      title: 'What does app chaos cost?',
      subtitle: 'Calculate how much your team saves on license fees per year.',
      teamSize: 'Team Size (Users)',
      oldTools: 'Previous Tools (Monthly per User)',
      assumedCost: 'Assumed monthly cost per user (e.g., Dropbox, Microsoft, Software Subscriptions)',
      totalOld: 'Total for',
      users: 'Users:',
      kd: 'Kreativ Desk (Monthly)',
      allIncluded: 'All tools included',
      proPlan: 'Pro Plan (Flat)',
      savings: 'Your annual savings'
    },
    pricing: {
      title: 'Simple, transparent pricing',
      subtitle: 'Every user gets a 30-day free trial upon registration. After that, choose the plan that fits your needs.',
      perMonth: ' / month',
      starter: {
        title: 'Starter',
        desc: 'Perfect for freelancers and small studios.',
        price: 'CHF 39',
        features: ['Up to 3 active projects', '50 GB Cloud Storage', 'Basic 3D Viewer (BIM)', 'Standard Finance', 'No AI Concierge'],
        cta: 'Try for free'
      },
      pro: {
        badge: 'Most Popular',
        title: 'Pro',
        desc: 'For growing agencies with AI power.',
        price: 'CHF 79',
        features: ['Unlimited projects', '250 GB Cloud Storage', 'Advanced 3D Viewer (BIM)', 'Full Finance & Cashflow', 'AI Concierge & Audits', 'Pitch Deck Generator'],
        cta: 'Start Workspace'
      },
      business: {
        title: 'Business',
        desc: 'Enterprise security and custom workflows.',
        price: 'CHF 159',
        features: ['Everything in Pro', '1 TB Cloud Storage', 'Custom Branding', 'Dedicated Account Manager', 'SSO & Advanced Security'],
        cta: 'Contact Us'
      }
    },
    faq: {
      title: 'Frequently Asked Questions',
      items: [
        {
          q: 'How can I pay?',
          a: 'We accept all major credit cards (Visa, Mastercard, American Express) as well as Apple Pay and Google Pay. Payments are securely processed via Stripe.'
        },
        {
          q: 'Can I cancel my subscription at any time?',
          a: 'Yes, you can cancel your subscription at any time effective at the end of the current billing period. There are no hidden cancellation periods.'
        },
        {
          q: 'What happens after the 30-day trial?',
          a: 'After 30 days, you will be asked to provide a payment method to continue using Kreativ-Desk OS. Your data will be preserved in any case.'
        },
        {
          q: 'Is my data secure?',
          a: 'Absolutely. We use state-of-the-art encryption and host our infrastructure on secure European servers in compliance with GDPR.'
        }
      ]
    },
    footer: {
      description: 'The all-in-one ecosystem for project development and construction management.',
      madeIn: 'Made in Switzerland.',
      product: 'Product',
      legal: 'Legal',
      privacy: 'Privacy Policy',
      imprint: 'Imprint',
      adminLogin: 'Admin Login'
    }
  }
};

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('overview');
    const [language, setLanguage] = useState<'DE' | 'EN'>('DE');
  const [roiUsers, setRoiUsers] = useState(10);
  const { currentUser } = useAuth();
  
  // Custom ROI Inputs
  const [assumedCostPerUser, setAssumedCostPerUser] = useState(150);

  const avgOldCostPerUser = assumedCostPerUser; 

  const monthlyOld = roiUsers * avgOldCostPerUser;
  const monthlyNew = 79; // Flat Pro Abo
  const yearlySavings = (monthlyOld - monthlyNew) * 12;

  const formatCHF = (num: number) => new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(num);

  const t = translations[language];

  
  
  return (
    <div className="bg-navy-960 text-slate-200 font-sans antialiased overflow-x-hidden transition-theme selection:bg-brand-500 selection:text-text-primary bg-tech-grid min-h-screen">
      <nav className="fixed w-full z-50 bg-navy-960/80 backdrop-blur-xl border-b border-white/5 transition-theme">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 flex justify-between items-center h-20">
              <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-text-primary font-bold text-lg shadow-neon-brand">K</div>
                  <span className="font-bold text-xl tracking-tight text-text-primary text-glow">Kreativ Desk</span>
              </div>
              <div className="hidden md:flex items-center space-x-8 text-sm font-semibold">
                  <a href="#live-demo" className="text-slate-300 hover:text-brand-400 transition-colors">{t.nav.demo}</a>
                  <a href="#roi" className="text-slate-300 hover:text-brand-400 transition-colors">{t.nav.roi}</a>
                  <a href="#pricing" className="text-slate-300 hover:text-brand-400 transition-colors">{t.nav.pricing}</a>
              </div>
              <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setLanguage(lang => lang === 'DE' ? 'EN' : 'DE')} 
                    className="text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors flex items-center gap-1"
                  >
                    <span className={language === 'DE' ? 'text-brand-400' : ''}>DE</span>
                    <span className="text-slate-600">/</span>
                    <span className={language === 'EN' ? 'text-brand-400' : ''}>EN</span>
                  </button>
                                    <Link to="/login" className="hidden sm:block text-sm font-semibold text-text-primary hover:text-brand-600 transition-colors">{t.nav.login}</Link>
                  <Link to="/signup" className="px-5 py-2.5 text-sm font-bold bg-brand-500 text-text-primary rounded-xl hover:bg-brand-700 transition-all shadow-lg hover:-translate-y-0.5 shadow-neon-brand">
                      {t.nav.start}
                  </Link>
              </div>
          </div>
      </nav>

      <section className="relative pt-40 pb-20 overflow-hidden z-10 text-center flex flex-col justify-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/15 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="max-w-4xl mx-auto px-6 relative z-10 mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-900 border border-brand-500/30 shadow-neon-brand text-brand-400 text-sm font-semibold mb-8 transition-theme">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
                  {t.hero.badge}
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-text-primary mb-6 text-glow">
                  {t.hero.title1}<br />
                  <span className="text-brand-400">{t.hero.title2}</span>
              </h1>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed font-normal">
                  {t.hero.subtitle}
              </p>
          </div>
      </section>

      <section id="live-demo" className="pb-32 relative z-20 px-4 md:px-12">
        <div className="max-w-[1400px] mx-auto mb-6 flex items-center justify-between">
            <div className="flex flex-col">
                <h2 className="text-2xl font-bold text-text-primary">Live Workspace Demo</h2>
                <p className="text-sm text-slate-400">Experience the OS in real-time</p>
            </div>
        </div>

        <div className="mx-auto max-w-[1400px] h-[650px] md:h-[800px] border border-brand-500/30 rounded-2xl shadow-2xl app-container bg-background flex flex-col md:flex-row overflow-hidden transition-theme text-left relative">
            {/* Browser/Phone Notch */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-navy-900 border-b border-border hidden md:flex items-center px-4 gap-2 z-30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/50"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400/50"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400/50"></div>
              </div>
              <div className="mx-auto bg-white/5 px-4 py-1 rounded text-[10px] text-slate-400 font-mono w-64 text-center">kreativ-desk.os/demo</div>
            </div>

            <div className="bg-surface border-border flex shrink-0 z-20 overflow-x-auto no-scrollbar w-full md:w-64 border-b md:border-r flex-row md:flex-col pt-4 md:pt-14 pb-2 md:pb-4">
                <div className="px-6 mb-8 hidden md:flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center text-text-primary font-bold text-sm">K</div>
                    <span className="font-bold text-text-primary">Kreativ Desk</span>
                </div>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-6 mb-3 hidden md:block">Workspace</div>
                
                <nav className="flex gap-1 px-3 min-w-max md:min-w-0 flex-row md:flex-col">
                    <button 
                      onClick={() => setActiveTab('overview')}
                      className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> <span className="md:inline">Dashboard</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('team')}
                      className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'team' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <Users className="w-4 h-4" /> <span className="md:inline">Team</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('calendar')}
                      className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'calendar' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <CalendarDays className="w-4 h-4" /> <span className="md:inline">Calendar</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('finance')}
                      className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'finance' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <Wallet className="w-4 h-4" /> <span className="md:inline">Finance</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('bim')}
                      className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'bim' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        <Box className="w-4 h-4" /> <span className="md:inline">3D BIM</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('meet')}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'meet' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                          <MessageSquare className="w-4 h-4" /> <span className="md:inline">Meet</span>
                      </button>
                      <button 
                        onClick={() => setActiveTab('crm')}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'crm' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                          <Users className="w-4 h-4" /> <span className="md:inline">CRM</span>
                      </button>
                      <button 
                        onClick={() => setActiveTab('documents')}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'documents' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                          <FolderOpen className="w-4 h-4" /> <span className="md:inline">Docs</span>
                      </button>
                      <button 
                        onClick={() => setActiveTab('site')}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'site' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                          <Camera className="w-4 h-4" /> <span className="md:inline">Site</span>
                      </button>
                      <button 
                        onClick={() => setActiveTab('whiteboard')}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'whiteboard' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                          <PenTool className="w-4 h-4" /> <span className="md:inline">Whiteboard</span>
                      </button>
                      <button 
                        onClick={() => setActiveTab('pitch')}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'pitch' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                          <Presentation className="w-4 h-4" /> <span className="md:inline">Pitch</span>
                      </button>
                      <button 
                        onClick={() => setActiveTab('defects')}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'defects' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                          <AlertTriangle className="w-4 h-4" /> <span className="md:inline">Defects</span>
                      </button>
                      <button 
                        onClick={() => setActiveTab('api')}
                        className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm text-left transition-colors whitespace-nowrap ${activeTab === 'api' ? 'bg-brand-500/10 text-brand-400 font-semibold border-b-2 md:border-b-0 md:border-r-2 border-brand-500' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                          <Network className="w-4 h-4" /> <span className="md:inline">API</span>
                      </button>
                  </nav>
              </div>

              <div className="flex-1 bg-background relative overflow-hidden h-full w-full md:pt-14">
                  <DemoApp activeTab={activeTab} />
              </div>
          </div>
      </section>

      <section id="roi" className="py-24 bg-navy-960/50 border-y border-white/5 transition-theme">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
              <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-5xl font-extrabold text-text-primary text-glow">{t.roi.title}</h2>
                  <p className="text-lg font-medium text-slate-400">{t.roi.subtitle}</p>
              </div>

              <div className="bg-navy-900 rounded-3xl p-8 md:p-12 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                  <div className="mb-12">
                      <div className="flex justify-between items-center mb-4">
                          <label className="font-bold text-text-primary text-lg">{t.roi.teamSize}</label>
                          <span className="font-bold text-brand-400 text-glow">{roiUsers}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        value={roiUsers} 
                        onChange={(e) => setRoiUsers(parseInt(e.target.value))}
                        className="w-full"
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                      <div className="p-6 bg-navy-950 rounded-2xl border border-white/5 shadow-sm">
                          <h4 className="font-bold text-slate-400 mb-4">{t.roi.oldTools}</h4>
                          <div className="space-y-4 text-sm font-medium text-slate-400 mb-6">
                              <div className="flex flex-col gap-2">
                                <label className="flex justify-between items-center">
                                  <span>{t.roi.assumedCost}</span>
                                </label>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold">CHF</span>
                                  <input 
                                    type="range" 
                                    min="50" 
                                    max="500" 
                                    step="10"
                                    value={assumedCostPerUser} 
                                    onChange={(e) => setAssumedCostPerUser(Number(e.target.value) || 0)} 
                                    className="flex-1" 
                                  />
                                  <span className="w-16 text-right font-bold text-text-primary">{assumedCostPerUser}.-</span>
                                </div>
                              </div>
                          </div>
                          <div className="border-t border-white/10 pt-4 flex justify-between font-bold text-text-primary">
                              <span>{t.roi.totalOld} <span className="roi-user-count">{roiUsers}</span> {t.roi.users}</span>
                              <span className="text-slate-400 line-through">{formatCHF(monthlyOld)}</span>
                          </div>
                      </div>

                      <div className="p-6 bg-brand-500/10 rounded-2xl border border-brand-500/30">
                          <h4 className="font-bold text-brand-400 mb-4">{t.roi.kd}</h4>
                          <ul className="space-y-3 text-sm font-semibold text-slate-300 mb-6">
                              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-500" /> {t.roi.allIncluded}</li>
                              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-500" /> {t.roi.proPlan}</li>
                          </ul>
                          <div className="border-t border-brand-500/30 pt-4 flex justify-between font-bold text-text-primary">
                              <span>Kreativ Desk Pro</span>
                              <span className="text-emerald-400">{formatCHF(monthlyNew)}<span className="text-sm font-normal text-slate-400">{t.pricing.perMonth}</span></span>
                          </div>
                      </div>
                  </div>

                  <div className="text-center">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{t.roi.savings}</p>
                      <div className="text-5xl md:text-6xl font-extrabold text-brand-400 text-glow">{formatCHF(yearlySavings)}</div>
                  </div>
              </div>
          </div>
      </section>

      <section id="pricing" className="py-24 relative z-20 px-4 md:px-12 bg-navy-960 transition-theme">
          <div className="max-w-7xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold text-text-primary text-glow">{t.pricing.title}</h2>
              <p className="text-lg font-medium text-slate-400">{t.pricing.subtitle}</p>
          </div>
          
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Starter Plan */}
              <div className="bg-navy-900 rounded-3xl p-8 border border-white/10 shadow-lg flex flex-col transition-theme">
                  <h3 className="text-xl font-bold text-text-primary mb-2">{t.pricing.starter.title}</h3>
                  <p className="text-sm text-slate-400 mb-6">{t.pricing.starter.desc}</p>
                  <div className="mb-6">
                      <span className="text-4xl font-extrabold text-text-primary">{t.pricing.starter.price}</span>
                      <span className="text-slate-400">{t.pricing.perMonth}</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                      {t.pricing.starter.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                          {i === 4 ? <Minus className="w-5 h-5 text-slate-400" /> : <Check className="w-5 h-5 text-emerald-500" />} 
                          <span className={i === 4 ? "text-slate-400" : ""}>{feature}</span>
                        </li>
                      ))}
                  </ul>
                  <Link to="/signup" className="w-full py-3 rounded-xl font-bold text-center bg-white/5 text-text-primary hover:bg-white/10 transition-colors">
                      {t.pricing.starter.cta}
                  </Link>
              </div>

              {/* Pro Plan */}
              <div className="bg-brand-500 rounded-3xl p-8 border border-brand-500 shadow-neon-brand-strong flex flex-col relative transform md:-translate-y-4">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-brand-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">{t.pricing.pro.badge}</div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">{t.pricing.pro.title}</h3>
                  <p className="text-sm text-brand-100 mb-6">{t.pricing.pro.desc}</p>
                  <div className="mb-6">
                      <span className="text-4xl font-extrabold text-text-primary">{t.pricing.pro.price}</span>
                      <span className="text-brand-100">{t.pricing.perMonth}</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                      {t.pricing.pro.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-text-primary">
                          <Check className="w-5 h-5 text-text-primary" /> {feature}
                        </li>
                      ))}
                  </ul>
                  <Link to="/signup" className="w-full py-3 rounded-xl font-bold text-center bg-white text-brand-600 hover:bg-white/10 transition-colors shadow-lg">
                      {t.pricing.pro.cta}
                  </Link>
              </div>

              {/* Business Plan */}
              <div className="bg-navy-900 rounded-3xl p-8 border border-white/10 shadow-lg flex flex-col transition-theme">
                  <h3 className="text-xl font-bold text-text-primary mb-2">{t.pricing.business.title}</h3>
                  <p className="text-sm text-slate-400 mb-6">{t.pricing.business.desc}</p>
                  <div className="mb-6">
                      <span className="text-4xl font-extrabold text-text-primary">{t.pricing.business.price}</span>
                      <span className="text-slate-400">{t.pricing.perMonth}</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                      {t.pricing.business.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                          <Check className="w-5 h-5 text-emerald-500" /> {feature}
                        </li>
                      ))}
                  </ul>
                  <Link to="/signup" className="w-full py-3 rounded-xl font-bold text-center bg-white/5 text-text-primary hover:bg-white/10 transition-colors">
                      {t.pricing.business.cta}
                  </Link>
              </div>
          </div>
      </section>

      <section className="py-24 relative z-20 px-4 md:px-12 bg-navy-950 transition-theme">
          <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-5xl font-extrabold text-text-primary text-glow">{t.faq.title}</h2>
              </div>
              <div className="space-y-6">
                  {t.faq.items.map((item, i) => (
                      <div key={i} className="p-6 bg-navy-900 rounded-2xl border border-white/10 transition-theme">
                          <h3 className="text-lg font-bold text-text-primary mb-2">{item.q}</h3>
                          <p className="text-slate-400">{item.a}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      <footer className="bg-navy-960 pt-16 pb-8 border-t border-white/10 transition-theme relative z-10">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                  <div className="col-span-1 md:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-text-primary font-bold text-sm shadow-md">K</div>
                          <span className="font-extrabold text-xl text-text-primary">Kreativ Desk</span>
                      </div>
                      <p className="text-slate-500 text-sm max-w-sm mb-6">
                          {t.footer.description}<br />
                          <strong>{t.footer.madeIn}</strong>
                      </p>
                  </div>
                  <div>
                      <h4 className="text-text-primary font-bold mb-4">{t.footer.product}</h4>
                      <ul className="space-y-2 text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors cursor-pointer"><li>{t.nav.pricing}</li><li>{t.nav.roi}</li></ul>
                  </div>
                  <div>
                      <h4 className="text-text-primary font-bold mb-4">{t.footer.legal}</h4>
                      <ul className="space-y-2 text-sm font-medium text-slate-500 transition-colors">
                          <li><Link to="/privacy" className="hover:text-brand-600 transition-colors">{t.footer.privacy}</Link></li>
                          <li><Link to="/imprint" className="hover:text-brand-600 transition-colors">{t.footer.imprint}</Link></li>
                          <li><Link to="/admin" className="text-slate-500 hover:text-brand-600 transition-colors">{t.footer.adminLogin}</Link></li>
                      </ul>
                  </div>
              </div>
          </div>
      </footer>
    </div>
  );
}
