import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, AlertCircle, Plus, X, Wallet, ArrowRight, PieChart, Calculator, FileText, Download, Sparkles, Loader2, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Printer } from 'lucide-react';
import { cn } from '../utils';
import { GoogleGenAI } from '@google/genai';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/errorHandlers';

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  status: string;
  ownerId?: string;
  projectId?: string;
}

interface BudgetItem {
  id: string;
  pos: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  option: number;
  total: number;
}

interface BudgetGroup {
  id: string;
  pos: string;
  title: string;
  items: BudgetItem[];
}

const initialBudgetGroups: BudgetGroup[] = [
  {
    id: 'g1', pos: '100', title: 'Phase 1',
    items: [
      { id: 'i1', pos: '101', description: 'Item 1', qty: 0, unit: 'Stk.', unitPrice: 0.00, option: 0, total: 0.00 },
    ]
  }
];

const initialQuotes = [
  { id: 'OFF-001', date: 'TBD', client: 'Client A', project: 'Project Alpha', amount: 0.00, status: 'Draft', type: 'Quote' },
];

import { printElementToPdf } from '../utils/pdfHelper';
import * as XLSX from 'xlsx';

export default function Finance() {
  const { currentUser, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'quotes'>('budget');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({ date: '', description: '', category: initialBudgetGroups[0].title, amount: '', status: 'Pending' });
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);
  const invoiceInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser || !db || currentUser.uid === 'demo-user') return;
    
    const q = query(collection(db, 'transactions'), where('ownerId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => doc.data() as Transaction));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    return () => unsubscribe();
  }, [currentUser]);

  // AI Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCADAuditing, setIsCADAuditing] = useState(false);
  const [aiInsight, setAiInsight] = useState<{ title: string; description: string; action: string } | null>(null);

  // Budget State
  const [budgetGroups, setBudgetGroups] = useState<BudgetGroup[]>(initialBudgetGroups);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [includeOptions, setIncludeOptions] = useState(false);
  const [editingCell, setEditingCell] = useState<{groupId: string, itemId: string, field: string} | null>(null);
  const [vatRate, setVatRate] = useState<number>(8.1);

  
  // Print State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    size: 'A4',
    orientation: 'portrait',
    scale: 100
  });
  
  // Project Header State
  const [projectHeader, setProjectHeader] = useState({
    project: 'Roadshow 2026',
    client: 'TechNova Inc.',
    status: 'Phase 1.1 Projektanalyse',
    date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })
  });
  const [editingHeader, setEditingHeader] = useState<string | null>(null);

  // Quote State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [newQuote, setNewQuote] = useState({
    client: '',
    project: '',
    type: 'Quote' as 'Quote' | 'Invoice' | 'Order',
    date: new Date().toISOString().split('T')[0],
    isRecurring: false,
    recurringInterval: 'monthly',
    items: [{ id: '1', description: '', qty: 1, unitPrice: 0, total: 0 }]
  });

  if (userRole && !['Internal', 'Admin'].includes(userRole)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold">Access Denied</h2>
          <p className="text-text-secondary mt-2">You do not have permission to view the Finance module.</p>
        </div>
      </div>
    );
  }

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const calculateGroupTotal = (group: BudgetGroup) => {
    return group.items.reduce((sum, item) => sum + item.total + (includeOptions ? item.option : 0), 0);
  };

  const calculateGrandTotal = () => {
    return budgetGroups.reduce((sum, group) => sum + calculateGroupTotal(group), 0);
  };

  const calculateTotalSpent = () => {
    return transactions
      .filter(tx => tx.status === 'Completed' || tx.status === 'Paid')
      .reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);
  };

  const calculateTotalIncome = () => {
    return transactions
      .filter(tx => tx.status === 'Completed' || tx.status === 'Paid')
      .reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0);
  };

  const totalBudget = calculateGrandTotal();
  const totalSpent = calculateTotalSpent();
  const remainingBudget = totalBudget - totalSpent;
  const budgetUsagePercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getBenchmarkColor = (price: number, description: string) => {
    // Mock AI Benchmarking logic based on keywords
    const desc = description.toLowerCase();
    if (desc.includes('projektleitung') || desc.includes('koordination')) {
      if (price > 160) return 'text-red-500'; // Too expensive
      if (price < 100) return 'text-emerald-500'; // Very cheap
      return 'text-text-muted'; // Average
    }
    if (desc.includes('gestaltung') || desc.includes('design')) {
      if (price > 150) return 'text-red-500';
      if (price < 90) return 'text-emerald-500';
      return 'text-text-muted';
    }
    return 'text-transparent'; // No benchmark data
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.description || !newTx.amount || !newTx.date || !currentUser || !db) return;

    const id = `tx-${Date.now()}`;
    const addedTx: Transaction = {
      id,
      date: newTx.date,
      description: newTx.description,
      category: newTx.category,
      amount: parseFloat(newTx.amount),
      status: newTx.status,
      ownerId: currentUser.uid,
      projectId: 'global' // Or get from context if available
    };
    
    try {
      await setDoc(doc(db, 'transactions', id), addedTx);
      setIsModalOpen(false);
      setNewTx({ date: '', description: '', category: budgetGroups[0]?.title || 'Other', amount: '', status: 'Pending' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions/' + id);
    }
  };

  const handleExportExcel = () => {
    // Export Budget
    const budgetData = budgetGroups.flatMap(group => 
      group.items.map(item => ({
        Gruppe: group.title,
        Pos: `${group.pos}.${item.pos}`,
        Beschreibung: item.description,
        Menge: item.qty,
        Einheit: item.unit,
        Einzelpreis: item.unitPrice,
        Option: item.option,
        Total: item.total
      }))
    );
    const wsBudget = XLSX.utils.json_to_sheet(budgetData);

    // Export Transactions
    const txData = transactions.map(tx => ({
      Datum: tx.date,
      Beschreibung: tx.description,
      Kategorie: tx.category,
      Betrag: tx.amount,
      Status: tx.status
    }));
    const wsTx = XLSX.utils.json_to_sheet(txData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsBudget, "Budget");
    XLSX.utils.book_append_sheet(wb, wsTx, "Transaktionen");
    
    XLSX.writeFile(wb, `Finanzen_${projectHeader.project.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningInvoice(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Extract the following information from this invoice image and return it as a JSON object:
        - date: The date of the invoice (YYYY-MM-DD format).
        - description: A short description of the goods or services (e.g., "Steel Delivery", "Plumbing Services").
        - amount: The total amount as a negative number (e.g., -1500.50).
        - category: The most likely category (must be one of: Materials, Services, Income, TGA, Architecture, Structural).
        
        Do not include markdown formatting like \`\`\`json, just return the raw JSON string.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { inlineData: { data: base64Data, mimeType: file.type } },
            { text: prompt }
          ]
        });

        let text = response.text?.trim() || '';
        
        // Try to extract JSON object if there's conversational text
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          text = match[0];
        } else {
          text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        }

        if (text) {
          const aiData = JSON.parse(text);
          setNewTx({
            date: aiData.date || new Date().toISOString().split('T')[0],
            description: aiData.description || 'Scanned Invoice',
            amount: aiData.amount ? String(aiData.amount) : '',
            category: aiData.category || 'Materials',
            status: 'Pending'
          });
          setIsModalOpen(true);
        }
        setIsScanningInvoice(false);
        if (invoiceInputRef.current) invoiceInputRef.current.value = '';
      };
    } catch (error) {
      console.error("AI Invoice Scan failed:", error);
      setIsScanningInvoice(false);
      alert("AI scan failed. Please enter the details manually.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(amount);
  };

  const formatCHF = (amount: number) => {
    return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 2 }).format(amount);
  };

  // Budget Functions
  const handleBudgetChange = (groupId: string, itemId: string, field: keyof BudgetItem, value: string | number) => {
    setBudgetGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        items: group.items.map(item => {
          if (item.id !== itemId) return item;
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate total
          if (field === 'qty' || field === 'unitPrice') {
            const qty = field === 'qty' ? Number(value) : item.qty;
            const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
            updatedItem.total = qty * price;
          }
          return updatedItem;
        })
      };
    }));
  };

  const handleGroupTitleChange = (groupId: string, newTitle: string) => {
    setBudgetGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      return { ...group, title: newTitle };
    }));
  };

  const handleAddBudgetRow = (groupId: string) => {
    setBudgetGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      const newPos = `${group.pos.substring(0, 1)}0${group.items.length + 1}`;
      const newItem: BudgetItem = {
        id: `new-${Date.now()}`,
        pos: newPos,
        description: '',
        qty: 1,
        unit: 'Stk.',
        unitPrice: 0,
        option: 0,
        total: 0
      };
      return { ...group, items: [...group.items, newItem] };
    }));
  };

  const handleAddSection = () => {
    const newGroupId = `g${Date.now()}`;
    const newPos = `${(budgetGroups.length + 1)}00`;
    const newGroup: BudgetGroup = {
      id: newGroupId,
      pos: newPos,
      title: 'Neue Phase',
      items: [
        {
          id: `i-${Date.now()}`,
          pos: `${(budgetGroups.length + 1)}01`,
          description: '',
          qty: 1,
          unit: 'Std.',
          unitPrice: 0,
          option: 0,
          total: 0
        }
      ]
    };
    setBudgetGroups([...budgetGroups, newGroup]);
  };

  const handleRemoveBudgetRow = (groupId: string, itemId: string) => {
    setBudgetGroups(prev => prev.map(group => {
      if (group.id !== groupId) return group;
      return { ...group, items: group.items.filter(item => item.id !== itemId) };
    }));
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Pos,Description,Qty,Unit,Unit Price,Option,Total\n";
    
    budgetGroups.forEach(group => {
      csvContent += `${group.pos},${group.title},,,,,${group.items.reduce((sum, i) => sum + i.total, 0)}\n`;
      group.items.forEach(item => {
        csvContent += `${item.pos},${item.description},${item.qty},${item.unit},${item.unitPrice},${item.option},${item.total}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "budget_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    setIsPrintModalOpen(true);
  };

  const handleExportQuotesExcel = () => {
    const data = quotes.map(q => ({
      ID: q.id,
      Typ: q.type,
      Datum: q.date,
      Kunde: q.client,
      Projekt: q.project,
      Betrag: q.amount,
      Status: q.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Angebote");
    XLSX.writeFile(wb, `Angebote_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const executePrint = async () => {
    const element = document.getElementById('pdf-content-container');
    if (!element) return;

    // Temporarily add a class to ensure white background for PDF generation
    element.classList.add('pdf-preview');
    
    try {
      printElementToPdf(element, 'Finance_Export');
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      element.classList.remove('pdf-preview');
      setIsPrintModalOpen(false);
    }
  };

  const renderBudgetContent = (isPreview = false) => (
    <div className={cn("flex-1 flex flex-col min-h-0", isPreview ? "pdf-preview" : "")}>
      {/* Project Header Info */}
      <div className={cn("p-4 border-b grid grid-cols-2 md:grid-cols-4 gap-4 text-sm shrink-0", isPreview ? "border-gray-200 bg-white text-black" : "border-border bg-surface print:bg-white print:border-black/20")}>
        <div className={cn(!isPreview && "cursor-text")} onClick={() => !isPreview && setEditingHeader('project')}>
          <span className={cn("block text-xs uppercase tracking-wider mb-1", isPreview ? "text-gray-500" : "text-text-muted print:text-gray-500")}>Projekt</span>
          {editingHeader === 'project' && !isPreview ? (
            <input 
              type="text" autoFocus value={projectHeader.project} 
              onChange={(e) => setProjectHeader({...projectHeader, project: e.target.value})}
              onBlur={() => setEditingHeader(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingHeader(null)}
              className="bg-surface border border-accent-ai focus:outline-none rounded px-2 py-1 w-full"
            />
          ) : <span className={cn("font-medium transition-colors", isPreview ? "text-black" : "hover:text-text-primary")}>{projectHeader.project}</span>}
        </div>
        <div className={cn(!isPreview && "cursor-text")} onClick={() => !isPreview && setEditingHeader('client')}>
          <span className={cn("block text-xs uppercase tracking-wider mb-1", isPreview ? "text-gray-500" : "text-text-muted print:text-gray-500")}>Kunde</span>
          {editingHeader === 'client' && !isPreview ? (
            <input 
              type="text" autoFocus value={projectHeader.client} 
              onChange={(e) => setProjectHeader({...projectHeader, client: e.target.value})}
              onBlur={() => setEditingHeader(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingHeader(null)}
              className="bg-surface border border-accent-ai focus:outline-none rounded px-2 py-1 w-full"
            />
          ) : <span className={cn("font-medium transition-colors", isPreview ? "text-black" : "hover:text-text-primary")}>{projectHeader.client}</span>}
        </div>
        <div className={cn(!isPreview && "cursor-text")} onClick={() => !isPreview && setEditingHeader('status')}>
          <span className={cn("block text-xs uppercase tracking-wider mb-1", isPreview ? "text-gray-500" : "text-text-muted print:text-gray-500")}>Status</span>
          {editingHeader === 'status' && !isPreview ? (
            <input 
              type="text" autoFocus value={projectHeader.status} 
              onChange={(e) => setProjectHeader({...projectHeader, status: e.target.value})}
              onBlur={() => setEditingHeader(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingHeader(null)}
              className="bg-surface border border-accent-ai focus:outline-none rounded px-2 py-1 w-full"
            />
          ) : <span className={cn("font-medium transition-colors", isPreview ? "text-black" : "hover:text-text-primary")}>{projectHeader.status}</span>}
        </div>
        <div className={cn(!isPreview && "cursor-text")} onClick={() => !isPreview && setEditingHeader('date')}>
          <span className={cn("block text-xs uppercase tracking-wider mb-1", isPreview ? "text-gray-500" : "text-text-muted print:text-gray-500")}>Datum</span>
          {editingHeader === 'date' && !isPreview ? (
            <input 
              type="text" autoFocus value={projectHeader.date} 
              onChange={(e) => setProjectHeader({...projectHeader, date: e.target.value})}
              onBlur={() => setEditingHeader(null)} onKeyDown={(e) => e.key === 'Enter' && setEditingHeader(null)}
              className="bg-surface border border-accent-ai focus:outline-none rounded px-2 py-1 w-full"
            />
          ) : <span className={cn("font-medium transition-colors", isPreview ? "text-black" : "hover:text-text-primary")}>{projectHeader.date}</span>}
        </div>
      </div>

      {/* Budget Table */}
      <div className={cn(isPreview ? "" : "flex-1 overflow-auto")}>
        <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
          <thead className={cn("text-xs uppercase sticky top-0 z-10 shadow-sm backdrop-blur-md", isPreview ? "text-gray-600 bg-gray-100" : "text-text-muted bg-surface/80")}>
            <tr>
              <th className="px-4 py-3 font-medium w-16">Pos</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right w-20">Anz</th>
              <th className="px-4 py-3 font-medium w-20">Einheit</th>
              <th className="px-4 py-3 font-medium text-right w-32">Stückpreis</th>
              <th className="px-4 py-3 font-medium text-right w-32">Option</th>
              <th className="px-4 py-3 font-medium text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", isPreview ? "divide-gray-200" : "divide-border/30")}>
            {budgetGroups.map(group => {
              const groupTotal = calculateGroupTotal(group);
              const groupOptionTotal = group.items.reduce((sum, item) => sum + item.option, 0);
              const isCollapsed = collapsedGroups[group.id] && !isPreview; // Never collapse in preview
              const grandTotal = calculateGrandTotal();
              const percentOfTotal = grandTotal > 0 ? (groupTotal / grandTotal) * 100 : 0;
              
              return (
                <React.Fragment key={group.id}>
                  {/* Group Header */}
                  <tr className={cn("group/header transition-colors", isPreview ? "bg-green-50/50 border-y border-green-200" : "bg-[#65833b]/10 border-y border-[#65833b]/30 cursor-pointer hover:bg-[#65833b]/20")} onClick={() => !isPreview && toggleGroupCollapse(group.id)}>
                    <td className={cn("px-4 py-3 font-semibold flex items-center gap-2", isPreview ? "text-green-800" : "text-[#84cc16]")}>
                      {!isPreview && (isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />)}
                      {group.pos}
                    </td>
                    <td className={cn("px-4 py-3 font-semibold", isPreview ? "text-green-800" : "text-[#84cc16]")} colSpan={6}>
                      <div className="flex items-center justify-between">
                        {editingCell?.groupId === group.id && editingCell?.itemId === 'title' && !isPreview ? (
                          <input
                            type="text"
                            autoFocus
                            value={group.title}
                            onChange={(e) => handleGroupTitleChange(group.id, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                            className="bg-surface border border-accent-ai focus:outline-none focus:ring-1 focus:ring-accent-ai rounded px-2 py-1 text-[#84cc16]"
                          />
                        ) : (
                          <span 
                            className={cn(!isPreview && "cursor-text hover:text-text-primary transition-colors")}
                            onClick={() => !isPreview && setEditingCell({ groupId: group.id, itemId: 'title', field: 'title' })}
                          >
                            {group.title}
                          </span>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-32">
                            <div className={cn("w-full h-1.5 rounded-full overflow-hidden", isPreview ? "bg-green-200" : "bg-black/40")}>
                              <div className={cn("h-full rounded-full", isPreview ? "bg-green-600" : "bg-[#84cc16]")} style={{ width: `${percentOfTotal}%` }}></div>
                            </div>
                            <span className={cn("text-xs font-mono", isPreview ? "text-green-700" : "text-[#84cc16]/80")}>{percentOfTotal.toFixed(0)}%</span>
                          </div>
                          <span className="font-mono">{formatCHF(groupTotal)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* Items */}
                  {!isCollapsed && group.items.map(item => {
                    const isEditingDesc = editingCell?.groupId === group.id && editingCell?.itemId === item.id && editingCell?.field === 'description' && !isPreview;
                    const isEditingQty = editingCell?.groupId === group.id && editingCell?.itemId === item.id && editingCell?.field === 'qty' && !isPreview;
                    const isEditingPrice = editingCell?.groupId === group.id && editingCell?.itemId === item.id && editingCell?.field === 'unitPrice' && !isPreview;
                    const isEditingOption = editingCell?.groupId === group.id && editingCell?.itemId === item.id && editingCell?.field === 'option' && !isPreview;
                    const benchmarkColor = getBenchmarkColor(item.unitPrice, item.description);

                    return (
                      <tr key={item.id} className={cn("transition-colors group/row", isPreview ? "" : "hover:bg-white/5")}>
                        <td className={cn("px-4 py-2 font-mono text-xs", isPreview ? "text-gray-500" : "text-text-muted")}>{item.pos}</td>
                        <td 
                          className={cn("px-4 py-2", !isPreview && "cursor-text")}
                          onClick={() => !isPreview && setEditingCell({ groupId: group.id, itemId: item.id, field: 'description' })}
                        >
                          {isEditingDesc ? (
                            <input 
                              type="text" 
                              autoFocus
                              value={item.description} 
                              onChange={(e) => handleBudgetChange(group.id, item.id, 'description', e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                              className="bg-surface border border-accent-ai focus:outline-none focus:ring-1 focus:ring-accent-ai rounded w-full px-2 py-1"
                            />
                          ) : (
                            <span className={cn("block w-full", isPreview ? "text-black" : "hover:text-text-primary transition-colors")}>{item.description || (!isPreview && <span className="text-zinc-600 italic">Add description...</span>)}</span>
                          )}
                        </td>
                        <td 
                          className={cn("px-4 py-2 text-right font-mono", !isPreview && "cursor-text", isPreview ? "text-gray-700" : "text-text-muted")}
                          onClick={() => !isPreview && setEditingCell({ groupId: group.id, itemId: item.id, field: 'qty' })}
                        >
                          {isEditingQty ? (
                            <input 
                              type="number" 
                              autoFocus
                              value={item.qty} 
                              onChange={(e) => handleBudgetChange(group.id, item.id, 'qty', e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                              className="bg-surface border border-accent-ai focus:outline-none focus:ring-1 focus:ring-accent-ai rounded w-full text-right px-2 py-1"
                            />
                          ) : (
                            <span className={cn("block w-full", isPreview ? "" : "hover:text-text-primary transition-colors")}>{item.qty}</span>
                          )}
                        </td>
                        <td className={cn("px-4 py-2 text-xs relative group/unit", isPreview ? "text-gray-600" : "text-text-muted hover:bg-white/5 transition-colors cursor-pointer")}>
                          {isPreview ? (
                            <span>{item.unit}</span>
                          ) : (
                            <>
                              <select 
                                value={item.unit}
                                onChange={(e) => handleBudgetChange(group.id, item.id, 'unit', e.target.value)}
                                className="bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-accent-ai rounded w-full appearance-none cursor-pointer"
                              >
                                <option value="Std.">Std.</option>
                                <option value="Stk.">Stk.</option>
                                <option value="Pauschal">Pauschal</option>
                                <option value="m2">m2</option>
                                <option value="lfm">lfm</option>
                              </select>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 group-hover/unit:opacity-100">
                                <ChevronDown size={12} />
                              </div>
                            </>
                          )}
                        </td>
                        <td 
                          className={cn("px-4 py-2 text-right font-mono relative group/price", !isPreview && "cursor-text", isPreview ? "text-gray-700" : "text-text-muted")}
                          onClick={() => !isPreview && setEditingCell({ groupId: group.id, itemId: item.id, field: 'unitPrice' })}
                        >
                          <div className="flex items-center justify-end gap-2">
                            {!isPreview && (
                              <div title="AI Benchmark">
                                <Sparkles size={12} className={cn("transition-opacity opacity-0 group-hover/price:opacity-100", benchmarkColor)} />
                              </div>
                            )}
                            {isEditingPrice ? (
                              <input 
                                type="number" 
                                autoFocus
                                value={item.unitPrice} 
                                onChange={(e) => handleBudgetChange(group.id, item.id, 'unitPrice', e.target.value)}
                                onBlur={() => setEditingCell(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                                className="bg-surface border border-accent-ai focus:outline-none focus:ring-1 focus:ring-accent-ai rounded w-24 text-right px-2 py-1"
                              />
                            ) : (
                              <span className={cn(isPreview ? "" : "hover:text-text-primary transition-colors")}>{formatCHF(item.unitPrice)}</span>
                            )}
                          </div>
                        </td>
                        <td 
                          className={cn("px-4 py-2 text-right font-mono", !isPreview && "cursor-text", isPreview ? "text-gray-700" : "text-text-muted")}
                          onClick={() => !isPreview && setEditingCell({ groupId: group.id, itemId: item.id, field: 'option' })}
                        >
                          {isEditingOption ? (
                            <input 
                              type="number" 
                              autoFocus
                              value={item.option} 
                              onChange={(e) => handleBudgetChange(group.id, item.id, 'option', e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                              className="bg-surface border border-accent-ai focus:outline-none focus:ring-1 focus:ring-accent-ai rounded w-full text-right px-2 py-1"
                            />
                          ) : (
                            <span className={cn("block w-full", isPreview ? (includeOptions && item.option > 0 ? "text-blue-600 font-medium" : "") : (includeOptions && item.option > 0 ? "text-accent-ai font-medium hover:text-text-primary transition-colors" : "hover:text-text-primary transition-colors"))}>
                              {item.option > 0 ? formatCHF(item.option) : '-'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-medium relative">
                          <span className={cn(includeOptions && item.option > 0 ? (isPreview ? "text-blue-600" : "text-accent-ai") : (isPreview ? "text-black" : "text-text-primary"))}>
                            {formatCHF(item.total + (includeOptions ? item.option : 0))}
                          </span>
                          {!isPreview && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRemoveBudgetRow(group.id, item.id); }}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-accent-warning opacity-0 group-hover/row:opacity-100 transition-opacity p-1 hover:bg-accent-warning/20 rounded"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Group Add Row */}
                  {!isCollapsed && !isPreview && (
                    <tr className="bg-surface border-y border-border hide-in-preview">
                      <td colSpan={7} className="px-4 py-2">
                        <button 
                          onClick={() => handleAddBudgetRow(group.id)}
                          className="text-xs font-medium text-text-muted hover:text-accent-ai flex items-center gap-1 transition-colors"
                        >
                          <Plus size={14} /> Add Row
                        </button>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {/* Add Section Button */}
            {!isPreview && (
              <tr className="bg-surface border-y border-border hide-in-preview">
                <td colSpan={7} className="px-4 py-4">
                  <button 
                    onClick={handleAddSection}
                    className="text-sm font-medium text-accent-ai hover:text-accent-ai/80 flex items-center gap-2 transition-colors w-full justify-center border border-dashed border-accent-ai/30 rounded-lg py-2 hover:bg-accent-ai/5"
                  >
                    <Plus size={16} /> Add New Phase / Section
                  </button>
                </td>
              </tr>
            )}
            {/* Total 1 */}
            <tr className={cn("border-t", isPreview ? "bg-gray-50 border-gray-300 text-black" : "bg-white/5 border-border")}>
              <td className={cn("px-4 py-3 font-semibold text-right", isPreview ? "text-black" : "text-text-primary")} colSpan={5}>Total 1 (exkl. MwSt) {includeOptions && <span className={cn("text-xs ml-2 font-normal", isPreview ? "text-gray-500" : "text-accent-ai")}>(inkl. Optionen)</span>}</td>
              <td className={cn("px-4 py-3 text-right font-mono font-semibold", isPreview ? "text-black" : "text-text-primary")}>
                {formatCHF(budgetGroups.reduce((sum, group) => sum + group.items.reduce((s, item) => s + item.option, 0), 0))}
              </td>
              <td className={cn("px-4 py-3 text-right font-mono font-semibold", isPreview ? "text-black" : "text-text-primary")}>
                {formatCHF(calculateGrandTotal())}
              </td>
            </tr>
            {/* VAT Input Row */}
            <tr className={cn("border-y", isPreview ? "bg-gray-50 border-gray-300 text-black" : "bg-white/5 border-border")}>
              <td className={cn("px-4 py-3 font-semibold text-right flex items-center justify-end gap-2", isPreview ? "text-black" : "text-text-primary")} colSpan={6}>
                <span>MwSt</span>
                {!isPreview ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      value={vatRate} 
                      onChange={(e) => setVatRate(Number(e.target.value))}
                      className="bg-surface border border-border focus:outline-none focus:border-accent-ai rounded w-16 text-right px-2 py-1 text-sm font-mono"
                      step="0.1"
                    />
                    <span className="text-sm">%</span>
                  </div>
                ) : (
                  <span className="font-mono text-sm">{vatRate}%</span>
                )}
              </td>
              <td className={cn("px-4 py-3 text-right font-mono", isPreview ? "text-black" : "text-text-muted")}>
                {formatCHF(calculateGrandTotal() * (vatRate / 100))}
              </td>
            </tr>
            {/* Total 2 */}
            <tr className={cn("border-b", isPreview ? "bg-gray-100 border-gray-300 text-black" : "bg-white/5 border-border")}>
              <td className={cn("px-4 py-4 font-bold text-right text-lg", isPreview ? "text-black" : "text-text-primary")} colSpan={6}>Total 2 (inkl. MwSt)</td>
              <td className={cn("px-4 py-4 text-right font-mono font-bold text-lg", isPreview ? "text-green-600" : "text-accent-success")}>
                {formatCHF(calculateGrandTotal() * (1 + vatRate / 100))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const dynamicCategoryData = budgetGroups.map((group, i) => {
    const colors = ['bg-orange-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];
    const budget = calculateGroupTotal(group) * (1 + vatRate / 100);
    const spent = Math.abs(transactions
      .filter(tx => tx.category === group.title && tx.amount < 0)
      .reduce((sum, tx) => sum + tx.amount, 0));
    return {
      name: group.title,
      spent,
      budget,
      color: colors[i % colors.length]
    };
  });

  const dynamicChartData = [
    { name: 'Jan', target: 0, actual: 0 },
    { name: 'Feb', target: 0, actual: 0 },
    { name: 'Mar', target: 0, actual: 0 },
    { name: 'Apr', target: 0, actual: 0 },
    { name: 'May', target: 0, actual: 0 },
    { name: 'Jun', target: 0, actual: 0 },
    { name: 'Jul', target: 0, actual: 0 },
  ];

  transactions.forEach(tx => {
    const monthIndex = new Date(tx.date).getMonth();
    if (monthIndex >= 0 && monthIndex < 7) {
      dynamicChartData[monthIndex].actual += Math.abs(tx.amount < 0 ? tx.amount : 0);
    }
  });
  
  // Mock target data
  const totalBudgetWithVat = calculateGrandTotal() * (1 + vatRate / 100);
  dynamicChartData.forEach((data, i) => {
    data.target = (totalBudgetWithVat / 7) * (i + 1);
  });
  
  // Accumulate actuals
  let accumulatedActual = 0;
  dynamicChartData.forEach((data) => {
    if (data.actual > 0 || accumulatedActual > 0) {
      accumulatedActual += data.actual;
      data.actual = accumulatedActual;
    }
  });

  const runAIAudit = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze this construction project financial data and provide a short, critical insight.
      
      Category Data: ${JSON.stringify(dynamicCategoryData)}
      Recent Transactions: ${JSON.stringify(transactions.slice(0, 5))}
      
      Respond in JSON format with exactly these fields:
      - title: A short warning or status title (e.g. "Budget Variance Detected")
      - description: 2-3 sentences explaining the biggest risk or observation.
      - action: A short suggested action button text (e.g. "Auto-Reallocate Funds")`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      let text = response.text?.trim() || '';
      
      // Try to extract JSON object if there's conversational text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        text = match[0];
      } else {
        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      }

      if (text) {
        setAiInsight(JSON.parse(text));
      }
    } catch (err) {
      console.error("AI Audit failed", err);
      setAiInsight({
        title: "System Status",
        description: "No critical variances detected. Budget is currently empty or within expected parameters.",
        action: "View Logs"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runCADBudgetAudit = async () => {
    setIsCADAuditing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are an AI assistant for Kreativ-Desk OS. 
      Compare the following simulated CAD parts list with the current budget.
      
      Simulated CAD Parts List:
      - 40x Steel Beams (Stahlträger)
      - 120x Concrete Slabs (Betonplatten)
      - 15x HVAC Units (Lüftungsanlagen)
      
      Current Budget Data:
      ${JSON.stringify(budgetGroups.map(g => ({ title: g.title, items: g.items.map(i => ({ desc: i.description, qty: i.qty })) })))}
      
      Identify discrepancies where the CAD model requires more items than budgeted.
      Return a JSON object with:
      - title: A short warning title (e.g., "CAD vs Budget Discrepancy")
      - description: A 1-2 sentence explanation (e.g., "Achtung: Im CAD-Plan sind 40 Stahlträger eingezeichnet, im Budget sind aber nur 35 kalkuliert.")
      - action: A short suggested action text (e.g. "Update Budget")`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      let text = response.text?.trim() || '{}';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) text = match[0];
      
      setAiInsight(JSON.parse(text));
    } catch (error) {
      console.error("CAD Audit failed:", error);
    } finally {
      setIsCADAuditing(false);
    }
  };

  // Quote Functions
  const handleQuoteItemChange = (id: string, field: string, value: string | number) => {
    setNewQuote(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'unitPrice') {
          const qty = field === 'qty' ? Number(value) : item.qty;
          const price = field === 'unitPrice' ? Number(value) : item.unitPrice;
          updated.total = qty * price;
        }
        return updated;
      })
    }));
  };

  const handleAddQuoteItem = () => {
    setNewQuote(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), description: '', qty: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const handleRemoveQuoteItem = (id: string) => {
    setNewQuote(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = newQuote.items.reduce((sum, item) => sum + item.total, 0);
    
    let prefix = 'OFF';
    if (newQuote.type === 'Invoice') prefix = 'INV';
    if (newQuote.type === 'Order') prefix = 'ORD';

    const newDoc = {
      id: `${prefix}-2026-00${quotes.length + 1}`,
      date: newQuote.date,
      client: newQuote.client || 'Unknown Client',
      project: newQuote.project || 'Unknown Project',
      amount: totalAmount,
      status: newQuote.type === 'Invoice' ? 'Pending' : 'Draft',
      type: newQuote.type,
      isRecurring: newQuote.isRecurring,
      recurringInterval: newQuote.recurringInterval
    };
    setQuotes([newDoc, ...quotes]);
    
    // Trigger print dialog
    setTimeout(() => {
      window.print();
      setIsQuoteModalOpen(false);
      setNewQuote({
        client: '',
        project: '',
        type: 'Quote',
        date: new Date().toISOString().split('T')[0],
        isRecurring: false,
        recurringInterval: 'monthly',
        items: [{ id: '1', description: '', qty: 1, unitPrice: 0, total: 0 }]
      });
    }, 100);
  };

  const toggleDocStatus = (id: string, currentStatus: string, type: string) => {
    setQuotes(prev => prev.map(doc => {
      if (doc.id !== id) return doc;
      
      let nextStatus = currentStatus;
      if (type === 'Quote') {
        nextStatus = currentStatus === 'Draft' ? 'Sent' : currentStatus === 'Sent' ? 'Accepted' : 'Draft';
      } else if (type === 'Invoice') {
        nextStatus = currentStatus === 'Pending' ? 'Paid' : currentStatus === 'Paid' ? 'Overdue' : 'Pending';
      } else if (type === 'Order') {
        nextStatus = currentStatus === 'Draft' ? 'Sent' : currentStatus === 'Sent' ? 'Fulfilled' : 'Draft';
      }
      
      return { ...doc, status: nextStatus };
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 relative flex-1 flex flex-col min-h-0 print:block print:h-auto print:space-y-0"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance & Budgeting</h1>
          <p className="text-text-muted text-sm mt-1">Real-time calculation, budget plans, and orders</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-surface border border-border rounded-md p-1 mr-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'overview' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              <TrendingUp size={16} />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('budget')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'budget' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              <Calculator size={16} />
              Budget Plan
            </button>
            <button 
              onClick={() => setActiveTab('quotes')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'quotes' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              <FileText size={16} />
              Quotes & Invoices
            </button>
          </div>
          
          {activeTab === 'overview' && (
            <div className="flex gap-2">
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                ref={invoiceInputRef}
                onChange={handleInvoiceUpload}
              />
              <button 
                onClick={() => invoiceInputRef.current?.click()}
                disabled={isScanningInvoice}
                className="px-4 py-2 bg-surface border border-border text-text-primary rounded-md text-sm bg-white/5 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isScanningInvoice ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-accent-ai" />}
                {isScanningInvoice ? 'Scanning...' : 'Scan Invoice'}
              </button>
              <button 
                onClick={runAIAudit}
                disabled={isAnalyzing || isCADAuditing}
                className="px-4 py-2 bg-surface border border-border text-accent-ai rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                AI Audit
              </button>
              <button 
                onClick={runCADBudgetAudit}
                disabled={isAnalyzing || isCADAuditing}
                className="px-4 py-2 bg-surface border border-border text-accent-warning rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                {isCADAuditing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                CAD vs Budget
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2"
              >
                <Plus size={16} />
                New Transaction
              </button>
            </div>
          )}
          {activeTab === 'budget' && (
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setIncludeOptions(!includeOptions)}
                className={cn(
                  "px-3 py-1.5 border rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                  includeOptions ? "bg-accent-ai/20 border-accent-ai text-accent-ai" : "bg-surface border-border text-text-muted hover:text-text-primary"
                )}
              >
                {includeOptions ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                Include Options
              </button>
              <button onClick={handleExportCSV} className="px-3 py-1.5 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
                <Download size={16} />
                CSV
              </button>
              <button 
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-surface border border-border text-text-primary rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Excel
              </button>
              <button 
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3 py-1.5 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2"
              >
                <Printer size={16} />
                PDF
              </button>
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="flex gap-2 items-center">
              <button 
                onClick={handleExportQuotesExcel}
                className="px-3 py-1.5 bg-surface border border-border text-text-primary rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Excel
              </button>
              <button 
                onClick={() => setIsQuoteModalOpen(true)}
                className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2"
              >
                <Plus size={16} />
                Create Document
              </button>
            </div>
          )}
        </div>
      </header>

      {activeTab === 'overview' && (
        <div className="print:hidden flex-1 flex flex-col min-h-0 gap-6">
          {/* AI Warning */}
          {(aiInsight || isAnalyzing || isCADAuditing) && (
            <div className="bg-surface border border-accent-warning/30 rounded-xl p-4 flex items-start gap-4 relative overflow-hidden shrink-0 animate-in fade-in">
              <div className="absolute top-0 left-0 w-1 h-full bg-accent-warning"></div>
              <div className="w-10 h-10 rounded-full bg-accent-warning/10 flex items-center justify-center shrink-0">
                {(isAnalyzing || isCADAuditing) ? <Loader2 className="text-accent-warning animate-spin" size={20} /> : <AlertCircle className="text-accent-warning" size={20} />}
              </div>
              <div className="flex-1">
                <h3 className="text-accent-warning font-medium text-sm">
                  {(isAnalyzing || isCADAuditing) ? "Analyzing Data..." : aiInsight?.title}
                </h3>
                <p className="text-text-muted text-sm mt-1 leading-relaxed">
                  {(isAnalyzing || isCADAuditing) ? "AI is reviewing data for discrepancies." : aiInsight?.description}
                </p>
                {!(isAnalyzing || isCADAuditing) && aiInsight?.action && (
                  <button className="mt-3 text-sm font-medium text-accent-warning hover:text-accent-warning/80 flex items-center gap-1 transition-colors">
                    {aiInsight.action} <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 animate-in fade-in">
            <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-sm font-medium">Total Budget Limit</span>
                <Wallet size={16} className="text-text-muted" />
              </div>
              <div className="text-2xl font-semibold tracking-tight">{formatCHF(totalBudget * (1 + vatRate / 100))}</div>
              <div className="text-xs text-text-muted mt-1">Based on Budget Plan (incl. VAT)</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-sm font-medium">Current Spend (Ist)</span>
                <TrendingUp size={16} className="text-blue-500" />
              </div>
              <div className="text-2xl font-semibold tracking-tight">
                {formatCHF(totalSpent)}
              </div>
              <div className="text-xs text-text-muted mt-1">
                {budgetUsagePercent.toFixed(1)}% of total budget
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-sm font-medium">Target Spend (Soll)</span>
                <PieChart size={16} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-semibold tracking-tight">
                {formatCHF((totalBudget * (1 + vatRate / 100)) * 0.65)}
              </div>
              <div className="text-xs text-text-muted mt-1">Based on timeline (65%)</div>
            </div>
            <div className="bg-surface border border-accent-ai/30 rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-accent-ai"></div>
              <div className="flex items-center justify-between">
                <span className="text-accent-ai text-sm font-medium">Variance</span>
                <AlertCircle size={16} className="text-accent-ai" />
              </div>
              <div className="text-2xl font-semibold tracking-tight text-accent-ai">
                {formatCHF((totalBudget * (1 + vatRate / 100)) - totalSpent)}
              </div>
              <div className="text-xs text-accent-ai/80 mt-1">Remaining budget</div>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-y-auto animate-in fade-in">
            {/* Left Column: Charts & Categories */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6 shrink-0">
              {/* Category Breakdown */}
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-medium mb-6">Budget by Category</h3>
                <div className="space-y-6">
                  {budgetGroups.map((group, i) => {
                    const colors = ['bg-orange-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'];
                    const budget = calculateGroupTotal(group) * (1 + vatRate / 100);
                    const spent = Math.abs(transactions
                      .filter(tx => tx.category === group.title && tx.amount < 0)
                      .reduce((sum, tx) => sum + tx.amount, 0));
                    const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                    const isOver = spent > budget;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{group.title}</span>
                          <span className={cn("font-mono", isOver ? "text-accent-warning" : "text-text-muted")}>
                            {formatCurrency(spent)} <span className="text-zinc-600">/ {formatCurrency(budget)}</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex">
                          <div 
                            className={cn("h-full rounded-full transition-all duration-1000", isOver ? "bg-accent-warning" : colors[i % colors.length])} 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cashflow Monitor */}
              <div className="bg-surface border border-border rounded-xl p-6 flex-1 flex flex-col min-h-[300px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-medium">Cashflow-Monitor</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                      <span className="text-text-muted">Soll</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-accent-ai"></div>
                      <span className="text-text-primary">Ist</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dynamicChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `CHF ${value/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: '#fafafa' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
                      <Line type="monotone" dataKey="target" stroke="#52525b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Column: Ledger */}
            <div className="flex-1 bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
                <h3 className="font-medium">Transaction Ledger</h3>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search ledger..." 
                    className="bg-background border border-border rounded-md py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:border-accent-ai/50 w-64"
                  />
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium">Category</th>
                      <th className="px-6 py-3 font-medium text-right">Amount</th>
                      <th className="px-6 py-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-text-muted">No transactions found. Add one to get started.</td>
                      </tr>
                    ) : (
                      transactions.map((row) => (
                        <tr key={row.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-text-muted whitespace-nowrap">{row.date}</td>
                          <td className="px-6 py-4 font-medium">{row.description}</td>
                          <td className="px-6 py-4 text-text-muted">
                            <span className="px-2 py-1 rounded-md bg-white/5 text-xs border border-border">{row.category}</span>
                          </td>
                          <td className={cn("px-6 py-4 text-right font-mono", row.amount > 0 ? "text-accent-success" : "")}>
                            {row.amount > 0 ? '+' : ''}{formatCurrency(row.amount)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium border",
                              row.status === 'Completed' ? "bg-accent-success/10 text-accent-success border-accent-success/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                            )}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'budget' && (
        <div id="pdf-content-container" className="print-container flex-1 flex flex-col min-h-0 overflow-hidden bg-surface border border-border rounded-xl animate-in fade-in print:border-none print:bg-white print:text-black">
          {renderBudgetContent(false)}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-surface border border-border rounded-xl animate-in fade-in print:hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
            <h3 className="font-medium">Quotes, Orders & Invoices</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search documents..." 
                  className="bg-background border border-border rounded-md py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:border-accent-ai/50 w-64"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-3 font-medium">ID</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Client / Vendor</th>
                  <th className="px-6 py-3 font-medium">Project</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {quotes.map((doc, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-medium text-accent-ai">{doc.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-xs border", 
                          doc.type === 'Quote' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : 
                          doc.type === 'Invoice' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        )}>
                          {doc.type}
                        </span>
                        {(doc as any).isRecurring && (
                          <span className="px-2 py-1 rounded-md text-xs border bg-white/5 text-text-muted border-zinc-700 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            {(doc as any).recurringInterval}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{doc.date}</td>
                    <td className="px-6 py-4 font-medium">{doc.client}</td>
                    <td className="px-6 py-4 text-text-muted">{doc.project}</td>
                    <td className="px-6 py-4 text-right font-mono">{formatCHF(doc.amount)}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => toggleDocStatus(doc.id, doc.status, doc.type)}
                        className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80",
                        (doc.status === 'Sent' || doc.status === 'Pending') ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                        (doc.status === 'Draft' || doc.status === 'Overdue') ? "bg-white/5 text-text-muted border-zinc-700" :
                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      )}>
                        {doc.status}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">New Transaction</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
                <input 
                  type="text" 
                  value={newTx.description}
                  onChange={e => setNewTx({...newTx, description: e.target.value})}
                  className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Amount (CHF)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newTx.amount}
                    onChange={e => setNewTx({...newTx, amount: e.target.value})}
                    placeholder="-1500.00"
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Date</label>
                  <input 
                    type="date" 
                    value={newTx.date}
                    onChange={e => setNewTx({...newTx, date: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Category (Budget Phase)</label>
                  <select 
                    value={newTx.category}
                    onChange={e => setNewTx({...newTx, category: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  >
                    {budgetGroups.map(group => (
                      <option key={group.id} value={group.title}>{group.title}</option>
                    ))}
                    <option value="Income">Income</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Status</label>
                  <select 
                    value={newTx.status}
                    onChange={e => setNewTx({...newTx, status: e.target.value})}
                    className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50"
                  >
                    <option>Pending</option>
                    <option>Completed</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Quote Modal */}
      {isQuoteModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:static print:bg-white print:p-0 print:block">
          <div className="bg-surface border border-border rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-full print:shadow-none print:border-none print:bg-white print:text-black">
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0 print:border-zinc-200">
              <div className="flex flex-col">
                <h2 className="text-xl font-semibold print:text-black">
                  {newQuote.type === 'Quote' ? 'Quote' : newQuote.type === 'Invoice' ? 'Invoice' : 'Purchase Order'}
                </h2>
                {newQuote.type === 'Invoice' && newQuote.isRecurring && (
                  <span className="text-xs text-text-muted print:text-text-muted mt-1">
                    Recurring: {newQuote.recurringInterval.charAt(0).toUpperCase() + newQuote.recurringInterval.slice(1)}
                  </span>
                )}
              </div>
              <button onClick={() => setIsQuoteModalOpen(false)} className="text-text-muted hover:text-text-primary print:hidden">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 print:overflow-visible">
              <form id="quote-form" onSubmit={handleSaveQuote} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="print:hidden">
                    <label className="block text-sm font-medium text-text-muted mb-1 print:text-text-muted">Document Type</label>
                    <select 
                      value={newQuote.type}
                      onChange={e => setNewQuote({...newQuote, type: e.target.value as 'Quote' | 'Invoice' | 'Order'})}
                      className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50 print:bg-white print:border-zinc-200 print:text-black appearance-none"
                    >
                      <option value="Quote">Quote</option>
                      <option value="Invoice">Invoice</option>
                      <option value="Order">Purchase Order</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1 print:text-text-muted">Client Name</label>
                    <input 
                      type="text" 
                      value={newQuote.client}
                      onChange={e => setNewQuote({...newQuote, client: e.target.value})}
                      className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50 print:bg-white print:border-zinc-200 print:text-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1 print:text-text-muted">Project Name</label>
                    <input 
                      type="text" 
                      value={newQuote.project}
                      onChange={e => setNewQuote({...newQuote, project: e.target.value})}
                      className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50 print:bg-white print:border-zinc-200 print:text-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1 print:text-text-muted">Date</label>
                    <input 
                      type="date" 
                      value={newQuote.date}
                      onChange={e => setNewQuote({...newQuote, date: e.target.value})}
                      className="w-full bg-background border border-border rounded-md py-2 px-3 text-sm focus:outline-none focus:border-accent-ai/50 print:bg-white print:border-zinc-200 print:text-black"
                      required
                    />
                  </div>
                </div>

                {newQuote.type === 'Invoice' && (
                  <div className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border print:hidden">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newQuote.isRecurring}
                        onChange={e => setNewQuote({...newQuote, isRecurring: e.target.checked})}
                        className="rounded border-border bg-background text-accent-ai focus:ring-accent-ai"
                      />
                      <span className="text-sm font-medium">Recurring Invoice</span>
                    </label>
                    
                    {newQuote.isRecurring && (
                      <select 
                        value={newQuote.recurringInterval}
                        onChange={e => setNewQuote({...newQuote, recurringInterval: e.target.value})}
                        className="bg-background border border-border rounded-md py-1 px-3 text-sm focus:outline-none focus:border-accent-ai/50 appearance-none"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium print:text-black">Line Items</h3>
                    <button 
                      type="button"
                      onClick={handleAddQuoteItem}
                      className="text-sm font-medium text-accent-ai hover:text-accent-ai/80 flex items-center gap-1 transition-colors print:hidden"
                    >
                      <Plus size={16} /> Add Item
                    </button>
                  </div>
                  <div className="bg-background border border-border rounded-lg overflow-hidden print:border-zinc-200 print:bg-white">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface border-b border-border text-text-muted print:bg-zinc-100 print:text-zinc-600 print:border-zinc-200">
                        <tr>
                          <th className="px-4 py-2 font-medium">Description</th>
                          <th className="px-4 py-2 font-medium w-24">Qty</th>
                          <th className="px-4 py-2 font-medium w-32">Unit Price</th>
                          <th className="px-4 py-2 font-medium w-32 text-right">Total</th>
                          <th className="px-4 py-2 font-medium w-10 print:hidden"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 print:divide-zinc-200">
                        {newQuote.items.map((item, index) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2">
                              <input 
                                type="text" 
                                value={item.description}
                                onChange={e => handleQuoteItemChange(item.id, 'description', e.target.value)}
                                placeholder="Item description..."
                                className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-accent-ai rounded px-2 py-1 print:text-black"
                                required
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                min="1"
                                value={item.qty}
                                onChange={e => handleQuoteItemChange(item.id, 'qty', e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-accent-ai rounded px-2 py-1 print:text-black"
                                required
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                step="0.01"
                                value={item.unitPrice}
                                onChange={e => handleQuoteItemChange(item.id, 'unitPrice', e.target.value)}
                                className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-accent-ai rounded px-2 py-1 print:text-black"
                                required
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-mono print:text-black">
                              {formatCHF(item.total)}
                            </td>
                            <td className="px-4 py-2 text-center print:hidden">
                              <button 
                                type="button"
                                onClick={() => handleRemoveQuoteItem(item.id)}
                                className="text-text-muted hover:text-accent-warning transition-colors"
                                disabled={newQuote.items.length === 1}
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end pt-4">
                    <div className="bg-surface border border-border rounded-lg p-4 w-64 print:bg-zinc-50 print:border-zinc-200 print:text-black">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-text-muted print:text-zinc-600">Subtotal</span>
                        <span className="font-mono">{formatCHF(newQuote.items.reduce((sum, item) => sum + item.total, 0))}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-text-muted print:text-zinc-600">VAT (8.1%)</span>
                        <span className="font-mono">{formatCHF(newQuote.items.reduce((sum, item) => sum + item.total, 0) * 0.081)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2 print:border-zinc-300">
                        <span>Total</span>
                        <span className="font-mono text-accent-success print:text-black">
                          {formatCHF(newQuote.items.reduce((sum, item) => sum + item.total, 0) * 1.081)}
                        </span>
                      </div>
                      {newQuote.type === 'Invoice' && (
                        <div className="mt-4 pt-4 border-t border-border print:border-zinc-300 text-xs text-text-muted print:text-text-muted hidden print:block">
                          <p>Please pay within 30 days.</p>
                          <p>Bank Details: CH93 0000 0000 0000 0000 0</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3 shrink-0 bg-surface rounded-b-xl print:hidden">
              <button 
                type="button" 
                onClick={() => setIsQuoteModalOpen(false)}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="quote-form"
                className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors"
              >
                Save & Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Settings & Preview Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in print:hidden">
          <div className="bg-surface border border-border rounded-xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col md:flex-row overflow-hidden">
            {/* Left: Settings Panel */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border flex flex-col bg-surface shrink-0">
              <div className="p-6 border-b border-border flex justify-between items-center bg-surface">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Printer className="text-accent-ai" />
                  PDF Export
                </h2>
                <button onClick={() => setIsPrintModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-8 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-3">Paper Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPrintSettings({...printSettings, size: 'A4'})}
                      className={cn("py-2.5 rounded-md border text-sm font-medium transition-colors", printSettings.size === 'A4' ? "bg-accent-ai/20 border-accent-ai text-accent-ai" : "border-border hover:bg-white/5")}
                    >
                      A4
                    </button>
                    <button 
                      onClick={() => setPrintSettings({...printSettings, size: 'A3'})}
                      className={cn("py-2.5 rounded-md border text-sm font-medium transition-colors", printSettings.size === 'A3' ? "bg-accent-ai/20 border-accent-ai text-accent-ai" : "border-border hover:bg-white/5")}
                    >
                      A3
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-3">Orientation</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setPrintSettings({...printSettings, orientation: 'portrait'})}
                      className={cn("py-2.5 rounded-md border text-sm font-medium transition-colors", printSettings.orientation === 'portrait' ? "bg-accent-ai/20 border-accent-ai text-accent-ai" : "border-border hover:bg-white/5")}
                    >
                      Portrait
                    </button>
                    <button 
                      onClick={() => setPrintSettings({...printSettings, orientation: 'landscape'})}
                      className={cn("py-2.5 rounded-md border text-sm font-medium transition-colors", printSettings.orientation === 'landscape' ? "bg-accent-ai/20 border-accent-ai text-accent-ai" : "border-border hover:bg-white/5")}
                    >
                      Landscape
                    </button>
                  </div>
                </div>
                <div>
                  <label className="flex justify-between text-sm font-medium text-text-muted mb-3">
                    <span>Scale</span>
                    <span className="text-text-primary bg-white/5 px-2 py-0.5 rounded text-xs">{printSettings.scale}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="30" max="200" step="5"
                    value={printSettings.scale}
                    onChange={(e) => setPrintSettings({...printSettings, scale: parseInt(e.target.value)})}
                    className="w-full accent-accent-ai"
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-2">
                    <span>Fit More</span>
                    <span>Larger Text</span>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-border flex flex-col gap-3 bg-surface">
                <button 
                  onClick={executePrint}
                  className="w-full py-2.5 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent-ai/20"
                >
                  <Printer size={16} />
                  Print / Save PDF
                </button>
                <button 
                  onClick={() => setIsPrintModalOpen(false)}
                  className="w-full py-2.5 border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            
            {/* Right: Live Preview Pane */}
            <div className="flex-1 bg-black overflow-auto p-4 md:p-8 flex items-start justify-center relative">
              <div className="absolute top-4 right-4 bg-surface/80 text-text-muted text-xs px-3 py-1.5 rounded-full border border-border backdrop-blur-md z-10">
                Live Print Preview
              </div>
              {/* Paper Container */}
              <div 
                className="bg-white shadow-2xl transition-all duration-300 ease-in-out origin-top flex flex-col"
                style={{ 
                  width: printSettings.orientation === 'portrait' ? '794px' : '1123px',
                  minHeight: printSettings.orientation === 'portrait' ? '1123px' : '794px',
                  transform: `scale(${Math.min(1, (window.innerWidth > 768 ? window.innerWidth - 320 - 64 : window.innerWidth - 32) / (printSettings.orientation === 'portrait' ? 794 : 1123))})`,
                  marginBottom: '100px' // Space for scrolling
                }}
              >
                {/* Scaled Content inside Paper */}
                <div 
                  className="origin-top-left w-full h-full p-10"
                  style={{
                    transform: `scale(${printSettings.scale / 100})`,
                    width: `${100 / (printSettings.scale / 100)}%`,
                  }}
                >
                  {renderBudgetContent(true)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
