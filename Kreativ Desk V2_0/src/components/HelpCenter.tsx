import React, { useState } from 'react';
import { Search, Book, PlayCircle, HelpCircle, MessageSquare, ChevronRight, FileText, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const categories = [
  { id: 'getting-started', title: 'Getting Started', icon: Book, description: 'Learn the basics of Kreativ-Desk OS.' },
  { id: 'bim-viewer', title: '3D Viewer (BIM)', icon: PlayCircle, description: 'Navigate models, run AI audits, and check compliance.' },
  { id: 'finance', title: 'Finance & Budget', icon: FileText, description: 'Manage ledgers, track cashflow, and export reports.' },
  { id: 'ai-concierge', title: 'AI Concierge', icon: Sparkles, description: 'How to use AI for scheduling, generating pitches, and more.' },
];

const faqs = [
  { question: 'How do I run an AI Model Audit on my 3D plan?', answer: 'Navigate to the BIM Viewer, upload your DWG or IFC file, and click the "Run AI Audit" button. The AI will cross-reference your model with uploaded regulations.' },
  { question: 'Can I connect my bank account to the Finance module?', answer: 'Yes, you can import CSV ledgers or use our API integration (coming soon) to sync real-time transactions.' },
  { question: 'How does the Pitch Deck Generator work?', answer: 'The Pitch Deck Generator automatically pulls the latest 3D renders, budget charts, and project milestones to create a client-ready presentation.' },
  { question: 'Where do I find my field notes?', answer: 'Field notes and voice memos are automatically transcribed and stored in the "Site Monitoring" and "Documents" sections.' },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-background text-text-primary p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <HelpCircle size={16} />
            <span>Help Center</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 py-12">
          <h1 className="text-4xl font-semibold tracking-tight">How can we help you?</h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Search our knowledge base or browse categories to learn how to master Kreativ-Desk OS.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search for articles, tutorials, or FAQs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-surface border border-border rounded-xl text-base focus:outline-none focus:border-accent-ai/50 focus:ring-1 focus:ring-accent-ai/50 transition-all shadow-lg"
            />
          </div>
        </div>

        {/* Categories Grid */}
        {!searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <button 
                key={category.id}
                className="flex items-start gap-4 p-6 bg-surface border border-border rounded-xl hover:border-accent-ai/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-accent-ai/10 transition-colors">
                  <category.icon size={20} className="text-text-muted group-hover:text-accent-ai transition-colors" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium text-base">{category.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{category.description}</p>
                </div>
                <ChevronRight size={20} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}

        {/* FAQs Section */}
        <div className="space-y-6 pt-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            {searchQuery ? 'Search Results' : 'Frequently Asked Questions'}
          </h2>
          
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-border rounded-xl">
              <MessageSquare size={32} className="mx-auto text-text-muted mb-4" />
              <h3 className="font-medium text-lg mb-2">No results found</h3>
              <p className="text-text-muted text-sm mb-6">We couldn't find any articles matching "{searchQuery}".</p>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-concierge'))}
                className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 inline-flex items-center gap-2"
              >
                <Sparkles size={16} />
                Ask AI Concierge
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <div key={index} className="p-6 bg-surface border border-border rounded-xl space-y-3">
                  <h3 className="font-medium text-base flex items-start gap-3">
                    <HelpCircle size={18} className="text-accent-ai shrink-0 mt-0.5" />
                    {faq.question}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed pl-7">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Support */}
        {!searchQuery && (
          <div className="mt-12 p-8 bg-gradient-to-br from-zinc-900 to-zinc-800 border border-border rounded-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
              <MessageSquare size={24} className="text-text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Still need help?</h3>
            <p className="text-text-muted text-sm max-w-md mx-auto">
              Our support team is available 24/7 to help you with any technical issues or questions about your projects.
            </p>
            <div className="pt-4 flex items-center justify-center gap-4">
              <button className="px-6 py-2.5 bg-white text-black rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors">
                Contact Support
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-concierge'))}
                className="px-6 py-2.5 bg-white/5 text-text-primary border border-border rounded-md text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <Sparkles size={16} className="text-accent-ai" />
                Ask AI
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
