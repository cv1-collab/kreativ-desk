import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, CreditCard, Activity, Terminal, Search, MoreVertical, Lock, Unlock, UserCheck, AlertTriangle, ArrowUpRight, HardDrive, Zap, ShoppingCart, Key, ArrowLeft, Moon, Sun, ListTodo, FileText, LogOut } from 'lucide-react';
import { cn } from '../utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  plan: string;
  storage_used: number;
  created_at: string;
}

interface Log {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  user_email: string;
}

interface Stats {
  totalUsers: number;
  activePro: number;
  activeEnterprise: number;
  mrr: number;
  totalStorageBytes: number;
  aiRequestsToday: number;
  revenueBreakdown: {
    abos: number;
    miete: number;
    kauf: number;
  };
  newUsersTotal: number;
  chartData: any[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };
  const { language, toggleLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'billing' | 'logs' | 'orders' | 'quotes' | 'tasks' | 'permissions'>('overview');
  const [timeframe, setTimeframe] = useState<'day' | 'month' | 'year'>('month');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [orders, setOrders] = useState<any[]>([]); // Neu
  const [quotes, setQuotes] = useState<any[]>([]); // Neu
  const [tasks, setTasks] = useState<any[]>([]);   // Neu
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentUser || currentUser.email?.toLowerCase() !== 'cv1@gmx.ch') {
      navigate('/app');
    }
  }, [currentUser, navigate]);


  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Mock data since there is no backend
        setStats({
          totalUsers: 124,
          activePro: 45,
          activeEnterprise: 12,
          mrr: 15000,
          totalStorageBytes: 1024 * 1024 * 1024 * 50, // 50 GB
          aiRequestsToday: 1200,
          revenueBreakdown: {
            abos: 15000,
            miete: 5000,
            kauf: 25000
          },
          newUsersTotal: 12,
          chartData: [
            { name: 'Jan', users: 100, revenue: 40000 },
            { name: 'Feb', users: 110, revenue: 42000 },
            { name: 'Mar', users: 124, revenue: 45000 }
          ]
        });
        setUsers([
          { id: '1', name: 'John Doe', email: 'john@example.com', plan: 'Pro', role: 'admin', status: 'active', storage_used: 1024 * 1024 * 500, created_at: new Date().toISOString() },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', plan: 'Enterprise', role: 'user', status: 'active', storage_used: 1024 * 1024 * 200, created_at: new Date().toISOString() }
        ]);
        setLogs([
          { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'User Login', user_email: 'john@example.com' },
          { id: '2', timestamp: new Date().toISOString(), level: 'info', message: 'Project Created', user_email: 'jane@example.com' }
        ]);
      } catch (err) {
        console.error("Failed to fetch admin data", err);
      }
    };
    fetchData();
  }, [timeframe]);

  const refreshData = async () => {
    // Mock refresh
    console.log("Refreshing data...");
  };

  const updateUserStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      refreshData();
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background text-text-primary overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="font-semibold text-sm">Super Admin</h1>
              <p className="text-xs text-text-muted">Kreativ-Desk OS</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          {[
            { id: 'overview', icon: Activity, label: t('analytics_overview') },
            { id: 'users', icon: Users, label: t('user_management') },
            { id: 'orders', icon: ShoppingCart, label: t('orders') },
            { id: 'quotes', icon: FileText, label: t('quotes') },
            { id: 'tasks', icon: ListTodo, label: t('tasks') },
            { id: 'permissions', icon: Shield, label: t('permissions') },
            { id: 'billing', icon: CreditCard, label: t('billing_subscriptions') },
            { id: 'logs', icon: Terminal, label: t('system_logs') },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === item.id 
                  ? "bg-surface text-text-primary" 
                  : "text-text-muted hover:text-text-primary hover:bg-surface/50"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between px-3 py-2 mb-2 border-b border-border/50">
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
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
          <button
            onClick={() => navigate('/app')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-text-muted hover:text-text-primary hover:bg-surface/50 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Workspace
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'overview' && stats && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Platform Analytics</h2>
                <p className="text-text-muted text-sm mt-1">High-level metrics across all organizations.</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/app')}
                  className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-white/10 text-text-primary text-sm font-medium rounded-md transition-colors border border-border"
                >
                  <ArrowLeft size={16} />
                  Back to Workspace
                </button>
                <div className="flex bg-surface border border-border rounded-md p-1">
                  {(['day', 'month', 'year'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTimeframe(t)}
                      className={cn(
                        "px-4 py-1.5 rounded text-xs font-medium capitalize transition-colors",
                        timeframe === t ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Activity size={20} />
                  </div>
                  <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                    <ArrowUpRight size={12} /> +12%
                  </span>
                </div>
                <h3 className="text-text-muted text-sm font-medium">Total Revenue ({timeframe})</h3>
                <div className="text-3xl font-semibold mt-1">
                  CHF {(stats.revenueBreakdown.abos + stats.revenueBreakdown.miete + stats.revenueBreakdown.kauf).toLocaleString()}
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                </div>
                <h3 className="text-text-muted text-sm font-medium">Subscriptions (Abos)</h3>
                <div className="text-3xl font-semibold mt-1">CHF {stats.revenueBreakdown.abos.toLocaleString()}</div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Key size={20} />
                  </div>
                </div>
                <h3 className="text-text-muted text-sm font-medium">Rentals (Miete)</h3>
                <div className="text-3xl font-semibold mt-1">CHF {stats.revenueBreakdown.miete.toLocaleString()}</div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <ShoppingCart size={20} />
                  </div>
                </div>
                <h3 className="text-text-muted text-sm font-medium">Purchases (Kauf)</h3>
                <div className="text-3xl font-semibold mt-1">CHF {stats.revenueBreakdown.kauf.toLocaleString()}</div>
              </div>
            </div>

            {/* System KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="text-text-muted text-sm font-medium">Total Users</h3>
                  <div className="text-2xl font-semibold">{stats.totalUsers}</div>
                  <div className="text-xs text-emerald-500 mt-1">+{stats.newUsersTotal} new this {timeframe}</div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                  <HardDrive size={24} />
                </div>
                <div>
                  <h3 className="text-text-muted text-sm font-medium">Storage Used</h3>
                  <div className="text-2xl font-semibold">{formatBytes(stats.totalStorageBytes)}</div>
                  <div className="text-xs text-text-muted mt-1">Across all organizations</div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-text-muted text-sm font-medium">AI Requests</h3>
                  <div className="text-2xl font-semibold">{stats.aiRequestsToday}</div>
                  <div className="text-xs text-text-muted mt-1">Today</div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-surface border border-border rounded-xl p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold mb-6">Cashflow Breakdown</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAbos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorMiete" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorKauf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `CHF ${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                        itemStyle={{ color: '#fafafa' }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="abos" name="Subscriptions" stackId="1" stroke="#3b82f6" fill="url(#colorAbos)" />
                      <Area type="monotone" dataKey="miete" name="Rentals" stackId="1" stroke="#a855f7" fill="url(#colorMiete)" />
                      <Area type="monotone" dataKey="kauf" name="Purchases" stackId="1" stroke="#f97316" fill="url(#colorKauf)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-6">New User Accounts</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#27272a', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      />
                      <Bar dataKey="newUsers" name="New Users" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">User Management</h2>
                <p className="text-text-muted text-sm mt-1">Manage all registered users and organizations.</p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-accent-ai/50"
                />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-border text-text-muted">
                  <tr>
                    <th className="px-6 py-4 font-medium">User</th>
                    <th className="px-6 py-4 font-medium">Plan</th>
                    <th className="px-6 py-4 font-medium">Storage</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-surface transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-medium text-xs border border-border">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.name}
                              {user.role === 'superadmin' && <Shield size={12} className="text-red-500" />}
                            </div>
                            <div className="text-text-muted text-xs">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wider",
                          user.plan === 'enterprise' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          user.plan === 'pro' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          "bg-white/5 text-text-muted border border-border"
                        )}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {formatBytes(user.storage_used)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "flex items-center gap-1.5 text-xs font-medium",
                          user.status === 'active' ? "text-emerald-500" : "text-red-500"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", user.status === 'active' ? "bg-emerald-500" : "bg-red-500")}></span>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/5 rounded transition-colors" title="Impersonate User">
                            <UserCheck size={16} />
                          </button>
                          {user.status === 'active' ? (
                            <button onClick={() => updateUserStatus(user.id, 'blocked')} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Block User">
                              <Lock size={16} />
                            </button>
                          ) : (
                            <button onClick={() => updateUserStatus(user.id, 'active')} className="p-1.5 text-text-muted hover:text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors" title="Unblock User">
                              <Unlock size={16} />
                            </button>
                          )}
                          <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/5 rounded transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Billing & Subscriptions</h2>
              <p className="text-text-muted text-sm mt-1">Manage plans, invoices, and Stripe integration.</p>
            </div>
            
            <div className="bg-surface border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
                <CreditCard size={24} className="text-text-muted" />
              </div>
              <h3 className="text-lg font-medium mb-2">Stripe Integration Active</h3>
              <p className="text-text-muted max-w-md mb-6">Your Stripe account is connected. You can now manage real subscriptions, view invoices, and handle payouts directly from this dashboard.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-8 text-left">
                <div className="bg-surface border border-border rounded-lg p-6">
                  <h4 className="font-medium text-text-primary mb-2">Pro Plan</h4>
                  <p className="text-sm text-text-muted mb-4">CHF 49/month</p>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/create-checkout-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ amount: 49, interval: 'month', email: 'admin@kreativ-desk.com', planName: 'Pro' })
                        });
                        const data = await res.json();
                        if (data.url) {
                          window.location.href = data.url;
                        } else {
                          alert(`Checkout error: ${data.error?.message || 'Unknown error'}`);
                        }
                      } catch (e: any) {
                        alert(`Network error: ${e.message}`);
                      }
                    }}
                    className="w-full px-4 py-2 bg-blue-500/10 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-500/20 transition-colors"
                  >
                    Test Checkout
                  </button>
                </div>
                
                <div className="bg-surface border border-border rounded-lg p-6">
                  <h4 className="font-medium text-text-primary mb-2">Enterprise Plan</h4>
                  <p className="text-sm text-text-muted mb-4">CHF 199/month</p>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/create-checkout-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ amount: 199, interval: 'month', email: 'admin@kreativ-desk.com', planName: 'Enterprise' })
                        });
                        const data = await res.json();
                        if (data.url) {
                          window.location.href = data.url;
                        } else {
                          alert(`Checkout error: ${data.error?.message || 'Unknown error'}`);
                        }
                      } catch (e: any) {
                        alert(`Network error: ${e.message}`);
                      }
                    }}
                    className="w-full px-4 py-2 bg-purple-500/10 text-purple-500 rounded-md text-sm font-medium hover:bg-purple-500/20 transition-colors"
                  >
                    Test Checkout
                  </button>
                </div>

                <div className="bg-surface border border-border rounded-lg p-6">
                  <h4 className="font-medium text-text-primary mb-2">Customer Portal</h4>
                  <p className="text-sm text-text-muted mb-4">Manage active subscriptions</p>
                  <button 
                    onClick={async () => {
                      const res = await fetch('/api/create-portal-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ customerId: 'cus_mock' })
                      });
                      const { url } = await res.json();
                      if (url) window.location.href = url;
                    }}
                    className="w-full px-4 py-2 bg-white text-black rounded-md text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Open Portal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Bestellungen (Orders)</h2>
                <p className="text-text-muted text-sm mt-1">Manage all customer orders and transactions.</p>
              </div>
              <button className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors">
                Export CSV
              </button>
            </div>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-border text-text-muted">
                  <tr>
                    <th className="px-6 py-4 font-medium">Order ID</th>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { id: 'ORD-2026-001', customer: 'Architekturbüro Meier', date: '2026-03-12', amount: 'CHF 1,200.00', status: 'completed' },
                    { id: 'ORD-2026-002', customer: 'Bau GmbH', date: '2026-03-11', amount: 'CHF 4,500.00', status: 'pending' },
                    { id: 'ORD-2026-003', customer: 'Design Studio X', date: '2026-03-10', amount: 'CHF 850.00', status: 'completed' },
                  ].map((order, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{order.id}</td>
                      <td className="px-6 py-4 font-medium">{order.customer}</td>
                      <td className="px-6 py-4 text-text-muted">{order.date}</td>
                      <td className="px-6 py-4">{order.amount}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wider",
                          order.status === 'completed' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        )}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/5 rounded transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'quotes' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Offerten (Quotes)</h2>
                <p className="text-text-muted text-sm mt-1">Review and approve system-generated quotes.</p>
              </div>
              <button className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors">
                Create Quote
              </button>
            </div>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-border text-text-muted">
                  <tr>
                    <th className="px-6 py-4 font-medium">Quote ID</th>
                    <th className="px-6 py-4 font-medium">Client</th>
                    <th className="px-6 py-4 font-medium">Value</th>
                    <th className="px-6 py-4 font-medium">Valid Until</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { id: 'QT-2026-089', client: 'Stadt Zürich', value: 'CHF 125,000', date: '2026-04-15', status: 'sent' },
                    { id: 'QT-2026-090', client: 'Implenia AG', value: 'CHF 45,000', date: '2026-04-20', status: 'draft' },
                    { id: 'QT-2026-091', client: 'Swiss Prime Site', value: 'CHF 210,000', date: '2026-03-30', status: 'accepted' },
                  ].map((quote, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{quote.id}</td>
                      <td className="px-6 py-4 font-medium">{quote.client}</td>
                      <td className="px-6 py-4">{quote.value}</td>
                      <td className="px-6 py-4 text-text-muted">{quote.date}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wider",
                          quote.status === 'accepted' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                          quote.status === 'sent' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          "bg-white/5 text-text-muted border border-border"
                        )}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/5 rounded transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Aufgaben (Admin Tasks)</h2>
                <p className="text-text-muted text-sm mt-1">System maintenance and manual review tasks.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Review new Enterprise signups', desc: '3 pending accounts require manual verification.', priority: 'high' },
                { title: 'Update Terms of Service', desc: 'Legal department provided new ToS for Q2.', priority: 'medium' },
                { title: 'Check failed Stripe webhooks', desc: '2 webhooks failed in the last 24 hours.', priority: 'high' },
                { title: 'Approve API rate limit increase', desc: 'User "Architekturbüro Meier" requested 10k req/day.', priority: 'low' },
              ].map((task, i) => (
                <div key={i} className="bg-surface border border-border rounded-xl p-6 flex items-start gap-4">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-2 shrink-0",
                    task.priority === 'high' ? "bg-red-500" : task.priority === 'medium' ? "bg-orange-500" : "bg-blue-500"
                  )} />
                  <div>
                    <h3 className="font-medium text-text-primary mb-1">{task.title}</h3>
                    <p className="text-sm text-text-muted mb-4">{task.desc}</p>
                    <button className="text-sm font-medium text-accent-ai hover:text-accent-ai/80 transition-colors">
                      Resolve Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'permissions' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Berechtigungen (Permissions)</h2>
                <p className="text-text-muted text-sm mt-1">Manage global roles and access control lists.</p>
              </div>
              <button className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors">
                Add Role
              </button>
            </div>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-border text-text-muted">
                  <tr>
                    <th className="px-6 py-4 font-medium">Role Name</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Users</th>
                    <th className="px-6 py-4 font-medium">Access Level</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { role: 'Super Admin', desc: 'Full system access including billing and user management', users: 2, level: 'All' },
                    { role: 'Company Admin', desc: 'Can manage company settings and users', users: 45, level: 'Company-wide' },
                    { role: 'Project Manager', desc: 'Can create projects and invite team members', users: 128, level: 'Project-wide' },
                    { role: 'Viewer', desc: 'Read-only access to assigned projects', users: 892, level: 'Restricted' },
                  ].map((role, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium flex items-center gap-2">
                        {role.role === 'Super Admin' && <Shield size={14} className="text-red-500" />}
                        {role.role}
                      </td>
                      <td className="px-6 py-4 text-text-muted">{role.desc}</td>
                      <td className="px-6 py-4">{role.users}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/5 text-text-muted border border-border">
                          {role.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/5 rounded transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">System Logs</h2>
              <p className="text-text-muted text-sm mt-1">Real-time system events, errors, and audit trails.</p>
            </div>

            <div className="bg-background border border-border rounded-xl overflow-hidden font-mono text-sm">
              <div className="p-3 border-b border-border bg-surface flex items-center gap-2 text-text-muted">
                <Terminal size={14} />
                <span>server.log</span>
              </div>
              <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-4 hover:bg-white/5 p-1 rounded">
                    <span className="text-text-muted shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                    <span className={cn(
                      "shrink-0 w-12",
                      log.level === 'error' ? "text-red-500" :
                      log.level === 'warn' ? "text-yellow-500" : "text-blue-500"
                    )}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-text-primary flex-1">{log.message}</span>
                    <span className="text-text-muted shrink-0 text-xs">{log.user_email}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
