import React, { useState } from 'react';
import { Camera, CloudRain, Thermometer, Wind, Activity, Truck, AlertTriangle, CheckCircle2, Maximize2, Users, HardHat, MapPin, ShieldAlert, Zap, Plane, Scan, Badge, Scale, FileWarning, ArrowRightLeft } from 'lucide-react';
import { cn } from '../utils';

export default function SiteMonitoring() {
  const [activeTab, setActiveTab] = useState<'overview' | 'safety' | 'logistics' | 'drones' | 'access'>('overview');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex-1 flex flex-col min-h-0">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Site Monitoring & IoT</h1>
          <p className="text-text-muted text-sm mt-1">Live feeds, weather, and sensor data from Munich Tech Campus</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-surface border border-border rounded-md p-1 mr-2 overflow-x-auto max-w-[60vw] md:max-w-none hide-scrollbar">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap", activeTab === 'overview' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('safety')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap", activeTab === 'safety' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              AI Safety
            </button>
            <button 
              onClick={() => setActiveTab('logistics')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap", activeTab === 'logistics' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              Logistics
            </button>
            <button 
              onClick={() => setActiveTab('drones')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5", activeTab === 'drones' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              <Plane size={14} /> Drone Scans
            </button>
            <button 
              onClick={() => setActiveTab('access')}
              className={cn("px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5", activeTab === 'access' ? "bg-white/5 text-text-primary" : "text-text-muted hover:text-text-primary")}
            >
              <Scan size={14} /> RFID Access
            </button>
          </div>
          <div className="px-3 py-1.5 bg-surface border border-border rounded-md text-sm font-medium flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse"></span>
            Sensors Online
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Cameras & Sensors */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
                  <h3 className="font-medium flex items-center gap-2">
                    <Camera size={18} className="text-text-muted" />
                    Live Camera Feeds
                  </h3>
                  <span className="text-xs text-text-muted">Updated 2s ago</span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative group rounded-lg overflow-hidden border border-border">
                    <img src="https://images.unsplash.com/photo-1541888086425-d81bb19240f5?auto=format&fit=crop&q=80&w=800" alt="Site View 1" className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-text-primary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      CAM 01 - Crane A
                    </div>
                  </div>
                  <div className="relative group rounded-lg overflow-hidden border border-border">
                    <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=800" alt="Site View 2" className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-text-primary flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      CAM 02 - Foundation
                    </div>
                  </div>
                </div>
              </div>

              {/* IoT Sensors */}
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-medium mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-text-muted" />
                  IoT Sensor Data
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-surface border border-border">
                    <div className="text-text-muted text-xs mb-2 flex justify-between items-center">
                      Temperature
                      <Thermometer size={14} className="text-orange-400" />
                    </div>
                    <div className="text-2xl font-semibold">14°C</div>
                    <div className="text-xs text-text-muted mt-1">Normal</div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface border border-border">
                    <div className="text-text-muted text-xs mb-2 flex justify-between items-center">
                      Wind Speed
                      <Wind size={14} className="text-blue-400" />
                    </div>
                    <div className="text-2xl font-semibold">12 km/h</div>
                    <div className="text-xs text-text-muted mt-1">Safe for crane ops</div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface border border-border">
                    <div className="text-text-muted text-xs mb-2 flex justify-between items-center">
                      Noise Level
                      <Activity size={14} className="text-emerald-400" />
                    </div>
                    <div className="text-2xl font-semibold">68 dB</div>
                    <div className="text-xs text-text-muted mt-1">Within city limits</div>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="text-red-400 text-xs mb-2 flex justify-between items-center">
                      Air Quality (PM2.5)
                      <CloudRain size={14} />
                    </div>
                    <div className="text-2xl font-semibold text-red-500">85 µg/m³</div>
                    <div className="text-xs text-red-400 mt-1">High dust levels</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Worker Attendance */}
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Users size={18} className="text-text-muted" />
                  Site Attendance
                </h3>
                <div className="flex items-end gap-3 mb-6">
                  <div className="text-4xl font-semibold">142</div>
                  <div className="text-sm text-text-muted mb-1">workers on site</div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">Structural (Steel & Concrete)</span>
                      <span className="font-medium">85</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[60%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">MEP (Mechanical, Electrical)</span>
                      <span className="font-medium">42</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 w-[30%]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-muted">Management & Safety</span>
                      <span className="font-medium">15</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[10%]"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weather */}
              <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden">
                <div className="absolute -right-6 -top-6 text-zinc-800/50">
                  <CloudRain size={120} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-medium mb-1 text-sm text-text-muted">Current Weather</h3>
                  <div className="text-4xl font-semibold mb-2">14°C</div>
                  <p className="text-sm font-medium">Light Rain</p>
                  <p className="text-xs text-text-muted mt-4">Forecast: Rain stopping around 14:00. Concrete pouring schedule may be affected.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
                  <h3 className="font-medium flex items-center gap-2">
                    <ShieldAlert size={18} className="text-accent-warning" />
                    AI Safety Detection (Live)
                  </h3>
                  <span className="px-2 py-1 bg-accent-warning/10 text-accent-warning border border-accent-warning/20 rounded text-xs font-medium animate-pulse">
                    Monitoring Active
                  </span>
                </div>
                <div className="relative">
                  <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1200" alt="Construction Workers" className="w-full h-[400px] object-cover" />
                  
                  {/* Simulated AI Bounding Boxes */}
                  <div className="absolute top-[30%] left-[20%] w-24 h-32 border-2 border-emerald-500 bg-emerald-500/10 rounded-sm">
                    <div className="absolute -top-6 left-0 bg-emerald-500 text-text-primary text-[10px] px-1 py-0.5 font-mono">PPE: OK (98%)</div>
                  </div>
                  <div className="absolute top-[40%] left-[45%] w-20 h-28 border-2 border-emerald-500 bg-emerald-500/10 rounded-sm">
                    <div className="absolute -top-6 left-0 bg-emerald-500 text-text-primary text-[10px] px-1 py-0.5 font-mono">PPE: OK (95%)</div>
                  </div>
                  <div className="absolute top-[35%] left-[70%] w-24 h-32 border-2 border-red-500 bg-red-500/20 rounded-sm animate-pulse">
                    <div className="absolute -top-6 left-0 bg-red-500 text-text-primary text-[10px] px-1 py-0.5 font-mono">NO HELMET (89%)</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-text-muted" />
                  Safety Violation Log
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start pb-4 border-b border-border/50">
                    <div className="mt-0.5"><HardHat size={16} className="text-red-500" /></div>
                    <div>
                      <p className="text-sm font-medium text-red-400">Missing Hardhat Detected</p>
                      <p className="text-xs text-text-muted mt-0.5">Zone C - Level 2 • 2 mins ago</p>
                      <button className="mt-2 text-xs hover:bg-white/10 px-2 py-1 rounded border border-border transition-colors">View Snapshot</button>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start pb-4 border-b border-border/50">
                    <div className="mt-0.5"><Zap size={16} className="text-orange-500" /></div>
                    <div>
                      <p className="text-sm font-medium text-orange-400">Unauthorized Access</p>
                      <p className="text-xs text-text-muted mt-0.5">Electrical Room B • 15 mins ago</p>
                      <button className="mt-2 text-xs hover:bg-white/10 px-2 py-1 rounded border border-border transition-colors">View Snapshot</button>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5"><CheckCircle2 size={16} className="text-emerald-500" /></div>
                    <div>
                      <p className="text-sm font-medium">Safety Briefing Completed</p>
                      <p className="text-xs text-text-muted mt-0.5">All Subcontractors • 08:00 AM</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-accent-ai/5 border border-accent-ai/20 rounded-xl p-5">
                <h3 className="text-sm font-medium text-accent-ai mb-2 flex items-center gap-2">
                  <Activity size={16} />
                  AI Safety Insights
                </h3>
                <p className="text-xs text-text-primary leading-relaxed">
                  Helmet compliance has dropped by 12% in Zone C over the last 48 hours. AI recommends scheduling a targeted safety toolbox talk for the framing crew.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logistics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
                  <h3 className="font-medium flex items-center gap-2">
                    <MapPin size={18} className="text-text-muted" />
                    Live Equipment Map
                  </h3>
                </div>
                <div className="relative h-[400px] bg-black flex items-center justify-center overflow-hidden">
                  {/* Placeholder for a map/floorplan */}
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#3f3f46 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  {/* Equipment Markers */}
                  <div className="absolute top-[20%] left-[30%] flex flex-col items-center group cursor-pointer">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse"></div>
                    <span className="mt-1 text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity">Crane A (Active)</span>
                  </div>
                  
                  <div className="absolute top-[60%] left-[50%] flex flex-col items-center group cursor-pointer">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <span className="mt-1 text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity">Excavator 1 (Idle)</span>
                  </div>

                  <div className="absolute top-[40%] left-[70%] flex flex-col items-center group cursor-pointer">
                    <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(249,115,22,0.5)] animate-bounce"></div>
                    <span className="mt-1 text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded border border-border opacity-0 group-hover:opacity-100 transition-opacity">Delivery Truck (Arriving)</span>
                  </div>

                  <div className="z-10 text-center">
                    <MapPin size={32} className="mx-auto text-zinc-600 mb-2" />
                    <p className="text-sm text-text-muted font-medium">Interactive GIS Map Integration</p>
                    <p className="text-xs text-zinc-600">GPS tracking for heavy machinery and materials</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Truck size={18} className="text-text-muted" />
                  Today's Deliveries
                </h3>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5"><CheckCircle2 size={16} className="text-emerald-500" /></div>
                    <div>
                      <p className="text-sm font-medium">Structural Steel (Batch A)</p>
                      <p className="text-xs text-text-muted">Arrived 08:30 AM • Gate 1</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div></div>
                    <div>
                      <p className="text-sm font-medium text-orange-400">Concrete Mix (3 Trucks)</p>
                      <p className="text-xs text-text-muted">Arriving in 5 mins • Gate 2</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-2 border-zinc-600"></div></div>
                    <div>
                      <p className="text-sm font-medium">HVAC Units (Level 1)</p>
                      <p className="text-xs text-text-muted">Expected 14:30 PM • Gate 3</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-text-muted" />
                  Equipment Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 rounded bg-surface border border-border">
                    <span className="text-sm font-medium">Tower Crane A</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-surface border border-border">
                    <span className="text-sm font-medium">Tower Crane B</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">Idle</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-surface border border-border">
                    <span className="text-sm font-medium">Excavator 01</span>
                    <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20">Maintenance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'drones' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
                  <h3 className="font-medium flex items-center gap-2">
                    <Plane size={18} className="text-text-muted" />
                    Automated Drone Scan vs. BIM (As-Built vs. As-Designed)
                  </h3>
                  <span className="text-xs text-text-muted">Scan completed: Today, 06:30 AM</span>
                </div>
                <div className="relative h-[450px] bg-black overflow-hidden group">
                  {/* Base Image (Simulated BIM Model) */}
                  <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=1200" alt="BIM Model" className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale" />
                  
                  {/* Overlay Image (Simulated Point Cloud / Drone Scan) */}
                  <div className="absolute inset-0 w-full h-full" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}>
                    <img src="https://images.unsplash.com/photo-1541888086425-d81bb19240f5?auto=format&fit=crop&q=80&w=1200" alt="Drone Scan" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-blue-500/20 mix-blend-overlay"></div>
                  </div>

                  {/* Slider Line */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-accent-ai cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                    <div className="w-8 h-8 bg-surface border border-accent-ai rounded-full flex items-center justify-center text-accent-ai shadow-lg">
                      <ArrowRightLeft size={14} />
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded text-xs font-medium text-text-primary border border-white/10">
                    Point Cloud (As-Built)
                  </div>
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded text-xs font-medium text-text-primary border border-white/10">
                    BIM Model (As-Designed)
                  </div>

                  {/* Deviation Highlight */}
                  <div className="absolute top-[40%] left-[60%] w-32 h-32 border-2 border-red-500 bg-red-500/20 rounded-sm animate-pulse">
                    <div className="absolute -top-6 left-0 bg-red-500 text-text-primary text-[10px] px-1 py-0.5 font-mono whitespace-nowrap">DEVIATION: -15cm</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Scale size={18} className="text-text-muted" />
                  AI Deviation Report
                </h3>
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <FileWarning size={16} className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Structural Shift Detected</p>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          Column C4 on Level 1 is poured 15cm off-axis compared to the BIM model. This may affect HVAC duct routing.
                        </p>
                        <button className="mt-2 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded border border-red-500/30 transition-colors">Create Defect Ticket</button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-orange-400">Volume Mismatch</p>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          Concrete slab pour in Sector 2 is 5% less volume than calculated. Check thickness tolerances.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-400">Facade Alignment</p>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          North facade glass panels are perfectly aligned within 2mm tolerance.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-text-muted" />
                  Scan Metrics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-surface border border-border rounded-lg">
                    <p className="text-xs text-text-muted mb-1">Points Captured</p>
                    <p className="text-lg font-mono font-semibold">42.5M</p>
                  </div>
                  <div className="p-3 bg-surface border border-border rounded-lg">
                    <p className="text-xs text-text-muted mb-1">Coverage</p>
                    <p className="text-lg font-mono font-semibold">98.2%</p>
                  </div>
                  <div className="p-3 bg-surface border border-border rounded-lg">
                    <p className="text-xs text-text-muted mb-1">Accuracy</p>
                    <p className="text-lg font-mono font-semibold">± 2mm</p>
                  </div>
                  <div className="p-3 bg-surface border border-border rounded-lg">
                    <p className="text-xs text-text-muted mb-1">Flight Time</p>
                    <p className="text-lg font-mono font-semibold">24m</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
                  <h3 className="font-medium flex items-center gap-2">
                    <Scan size={18} className="text-text-muted" />
                    Live Gate Activity (RFID)
                  </h3>
                  <span className="px-2 py-1 bg-accent-success/10 text-accent-success border border-accent-success/20 rounded text-xs font-medium animate-pulse">
                    Turnstiles Active
                  </span>
                </div>
                <div className="p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-text-muted bg-surface border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">Worker Name</th>
                        <th className="px-4 py-3 font-medium">Company</th>
                        <th className="px-4 py-3 font-medium">Trade</th>
                        <th className="px-4 py-3 font-medium">Gate</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-surface hover:bg-surface transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary">Markus Weber</td>
                        <td className="px-4 py-3 text-text-muted">Stahlbau Müller GmbH</td>
                        <td className="px-4 py-3 text-text-muted">Steel Worker</td>
                        <td className="px-4 py-3 text-text-muted">Gate 1 (Main)</td>
                        <td className="px-4 py-3 font-mono text-xs">08:14:22</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-medium uppercase">Entry</span></td>
                      </tr>
                      <tr className="bg-surface hover:bg-surface transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary">Elena Rossi</td>
                        <td className="px-4 py-3 text-text-muted">ElektroTech AG</td>
                        <td className="px-4 py-3 text-text-muted">Electrician</td>
                        <td className="px-4 py-3 text-text-muted">Gate 2 (South)</td>
                        <td className="px-4 py-3 font-mono text-xs">08:05:11</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-medium uppercase">Entry</span></td>
                      </tr>
                      <tr className="bg-surface hover:bg-surface transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary">Thomas Schmidt</td>
                        <td className="px-4 py-3 text-text-muted">Stahlbau Müller GmbH</td>
                        <td className="px-4 py-3 text-text-muted">Foreman</td>
                        <td className="px-4 py-3 text-text-muted">Gate 1 (Main)</td>
                        <td className="px-4 py-3 font-mono text-xs">07:55:03</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-medium uppercase">Entry</span></td>
                      </tr>
                      <tr className="bg-surface hover:bg-surface transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary">Jan Kowalski</td>
                        <td className="px-4 py-3 text-text-muted">BauLogistik GmbH</td>
                        <td className="px-4 py-3 text-text-muted">Driver</td>
                        <td className="px-4 py-3 text-text-muted">Gate 3 (Logistics)</td>
                        <td className="px-4 py-3 font-mono text-xs">07:42:19</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-[10px] font-medium uppercase">Exit</span></td>
                      </tr>
                      <tr className="bg-red-500/5 hover:bg-red-500/10 transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary">Unknown Badge</td>
                        <td className="px-4 py-3 text-text-muted">-</td>
                        <td className="px-4 py-3 text-text-muted">-</td>
                        <td className="px-4 py-3 text-text-muted">Gate 2 (South)</td>
                        <td className="px-4 py-3 font-mono text-xs">07:30:45</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-[10px] font-medium uppercase">Denied</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-text-muted text-xs mb-1 flex justify-between items-center">
                    Total On-Site
                    <Users size={14} />
                  </div>
                  <div className="text-2xl font-semibold">142</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-text-muted text-xs mb-1 flex justify-between items-center">
                    Active Companies
                    <Badge size={14} />
                  </div>
                  <div className="text-2xl font-semibold">12</div>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-text-muted text-xs mb-1 flex justify-between items-center">
                    Denied Entries
                    <ShieldAlert size={14} className="text-red-400" />
                  </div>
                  <div className="text-2xl font-semibold text-red-400">3</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-text-muted" />
                  AI Billing Reconciliation
                </h3>
                <p className="text-xs text-text-muted mb-4">
                  The AI automatically compares RFID gate logs with subcontractor invoices in the Finance module.
                </p>
                
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Discrepancy Detected</p>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          <strong>Stahlbau Müller GmbH</strong> invoiced 420 hours for last week, but RFID logs show only 385 hours on site.
                        </p>
                        <button className="mt-2 text-xs bg-white/10 px-3 py-1.5 rounded border border-border transition-colors w-full">Review Invoice #INV-204</button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-400">Invoice Verified</p>
                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                          <strong>ElektroTech AG</strong> invoice #INV-205 matches RFID logs (120h). Auto-approved for payment.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-accent-ai/5 border border-accent-ai/20 rounded-xl p-5">
                <h3 className="text-sm font-medium text-accent-ai mb-2 flex items-center gap-2">
                  <Zap size={16} />
                  Compliance Alert
                </h3>
                <p className="text-xs text-text-primary leading-relaxed">
                  Worker "Thomas Schmidt" (Foreman) has an expiring safety certification in 3 days. An automated email has been sent to Stahlbau Müller GmbH.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
