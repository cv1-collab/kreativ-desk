import React, { useState, Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Box as DreiBox, Environment, Grid, Cylinder, Line, Html, Center } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { GoogleGenAI } from '@google/genai';
import { motion } from 'motion/react';
import { 
  Box, 
  Layers, 
  Eye, 
  EyeOff, 
  Maximize, 
  ZoomIn, 
  ZoomOut, 
  Rotate3D,
  ShieldAlert,
  Sparkles,
  ArrowUp,
  ArrowDown,
  SplitSquareVertical,
  Ruler,
  Camera,
  Loader2,
  Image as ImageIcon,
  X,
  Upload,
  Video,
  Download
} from 'lucide-react';
import { cn } from '../utils';

import { IFCLoader } from 'web-ifc-three/IFCLoader';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { storage, isConfigured, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

// Custom Model Loaders
function IfcModel({ url }: { url: string }) {
  const [model, setModel] = useState<any>(null);
  useEffect(() => {
    const loader = new IFCLoader();
    loader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.36/');
    loader.load(url, (ifcModel) => {
      setModel(ifcModel);
    });
  }, [url]);

  if (!model) return null;
  return <Center><primitive object={model} /></Center>;
}

function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  return <Center><primitive object={obj} /></Center>;
}

function GltfModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <Center><primitive object={gltf.scene} /></Center>;
}

function DaeModel({ url }: { url: string }) {
  const dae = useLoader(ColladaLoader, url);
  return <Center><primitive object={dae.scene} /></Center>;
}

function UploadedModelViewer({ url, type }: { url: string, type: string }) {
  if (type === 'ifc') return <IfcModel url={url} />;
  if (type === 'obj') return <ObjModel url={url} />;
  if (type === 'gltf' || type === 'glb') return <GltfModel url={url} />;
  if (type === 'dae') return <DaeModel url={url} />;
  return null;
}

// Complex 3D Building Component
function CameraRig({ isTouring }: { isTouring: boolean }) {
  useFrame((state, delta) => {
    if (isTouring) {
      const t = state.clock.getElapsedTime() * 0.2;
      const x = Math.sin(t) * 25;
      const z = Math.cos(t) * 25;
      const y = 10 + Math.sin(t * 2) * 5;
      state.camera.position.lerp(new THREE.Vector3(x, y, z), delta * 2);
      state.camera.lookAt(0, 4, 0);
    }
  });
  return null;
}

function Building({ layers, activeFloor, selectedId, onSelect, auditMode, isExploded, measureMode, onMeasureClick, defectMode, onDefectClick }: { layers: any[], activeFloor: number | null, selectedId: string | null, onSelect: (id: string) => void, auditMode: boolean, isExploded: boolean, measureMode: boolean, onMeasureClick: (point: THREE.Vector3) => void, defectMode: boolean, onDefectClick: (point: THREE.Vector3) => void }) {
  const isArchVisible = layers.find(l => l.id === 'arch')?.visible;
  const isTgaVisible = layers.find(l => l.id === 'tga')?.visible;
  const isStructVisible = layers.find(l => l.id === 'struct')?.visible;
  const isFireVisible = layers.find(l => l.id === 'fire')?.visible;

  const floors = [0, 1, 2]; // Ground, Level 1, Level 2

  const floorRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((state, delta) => {
    floors.forEach((floor, i) => {
      const ref = floorRefs.current[i];
      if (ref) {
        const targetY = (floor * 4) + (isExploded ? floor * 5 : 0);
        ref.position.y = THREE.MathUtils.lerp(ref.position.y, targetY, delta * 5);
      }
    });
  });

  const handlePointerDown = (e: any, id: string) => {
    e.stopPropagation();
    if (measureMode) {
      onMeasureClick(e.point);
    } else if (defectMode) {
      onDefectClick(e.point);
    } else {
      onSelect(id);
    }
  };

  return (
    <group position={[0, -1, 0]}>
      {floors.map((floor, i) => {
        // If activeFloor is set, only show that floor
        if (activeFloor !== null && activeFloor !== floor) return null;

        return (
          <group 
            key={floor} 
            ref={(el) => (floorRefs.current[i] = el)}
            position={[0, floor * 4, 0]}
          >
            {/* Foundation / Slab */}
            {isStructVisible && (
              <DreiBox 
                args={[12, 0.4, 12]} 
                position={[0, 0.2, 0]}
                onPointerDown={(e) => handlePointerDown(e, `slab-${floor}`)}
              >
                <meshStandardMaterial 
                  color={selectedId === `slab-${floor}` ? "#fcd34d" : "#f97316"} 
                  transparent 
                  opacity={0.8} 
                />
              </DreiBox>
            )}

            {/* Columns */}
            {isStructVisible && (
              <group>
                {[[-5, -5], [5, -5], [-5, 5], [5, 5], [0, 0]].map((pos, i) => (
                  <Cylinder 
                    key={i} 
                    args={[0.3, 0.3, 3.6]} 
                    position={[pos[0], 2.2, pos[1]]}
                    onPointerDown={(e) => handlePointerDown(e, `col-${floor}-${i}`)}
                  >
                    <meshStandardMaterial color={selectedId === `col-${floor}-${i}` ? "#fcd34d" : "#ea580c"} />
                  </Cylinder>
                ))}
              </group>
            )}

            {/* Architecture (Walls & Glass) */}
            {isArchVisible && (
              <group>
                {/* Core Wall */}
                <DreiBox 
                  args={[4, 3.6, 4]} 
                  position={[0, 2.2, 0]}
                  onPointerDown={(e) => handlePointerDown(e, `core-${floor}`)}
                >
                  <meshStandardMaterial color={selectedId === `core-${floor}` ? "#fcd34d" : "#a1a1aa"} />
                </DreiBox>
                
                {/* Glass Facade */}
                <DreiBox args={[11.6, 3.6, 0.1]} position={[0, 2.2, -5.8]} onPointerDown={(e) => handlePointerDown(e, `glass-n-${floor}`)}>
                  <meshStandardMaterial color="#38bdf8" transparent opacity={0.2} metalness={0.9} roughness={0.1} />
                </DreiBox>
                <DreiBox args={[11.6, 3.6, 0.1]} position={[0, 2.2, 5.8]} onPointerDown={(e) => handlePointerDown(e, `glass-s-${floor}`)}>
                  <meshStandardMaterial color="#38bdf8" transparent opacity={0.2} metalness={0.9} roughness={0.1} />
                </DreiBox>
                <DreiBox args={[0.1, 3.6, 11.6]} position={[-5.8, 2.2, 0]} onPointerDown={(e) => handlePointerDown(e, `glass-w-${floor}`)}>
                  <meshStandardMaterial color="#38bdf8" transparent opacity={0.2} metalness={0.9} roughness={0.1} />
                </DreiBox>
                <DreiBox args={[0.1, 3.6, 11.6]} position={[5.8, 2.2, 0]} onPointerDown={(e) => handlePointerDown(e, `glass-e-${floor}`)}>
                  <meshStandardMaterial color="#38bdf8" transparent opacity={0.2} metalness={0.9} roughness={0.1} />
                </DreiBox>
              </group>
            )}

            {/* TGA / MEP (HVAC Ducts) */}
            {isTgaVisible && (
              <group>
                <DreiBox 
                  args={[8, 0.4, 0.6]} 
                  position={[0, 3.6, 2]}
                  onPointerDown={(e) => handlePointerDown(e, `hvac-main-${floor}`)}
                >
                  <meshStandardMaterial 
                    color={selectedId === `hvac-main-${floor}` ? "#fcd34d" : (auditMode && floor === 2 ? "#ef4444" : "#3b82f6")} 
                    metalness={0.8} 
                    roughness={0.2} 
                  />
                </DreiBox>
                <DreiBox 
                  args={[0.4, 0.4, 6]} 
                  position={[2, 3.6, -1]}
                  onPointerDown={(e) => handlePointerDown(e, `hvac-branch-${floor}`)}
                >
                  <meshStandardMaterial 
                    color={selectedId === `hvac-branch-${floor}` ? "#fcd34d" : "#3b82f6"} 
                    metalness={0.8} 
                    roughness={0.2} 
                  />
                </DreiBox>
              </group>
            )}

            {/* Fire Safety (Sprinklers / Extinguishers) */}
            {isFireVisible && (
              <group>
                <DreiBox args={[0.3, 0.5, 0.3]} position={[-2, 1, -2]} onPointerDown={(e) => handlePointerDown(e, `fire-1-${floor}`)}>
                  <meshStandardMaterial color="#ef4444" />
                </DreiBox>
                <DreiBox args={[0.3, 0.5, 0.3]} position={[2, 1, 2]} onPointerDown={(e) => handlePointerDown(e, `fire-2-${floor}`)}>
                  <meshStandardMaterial color="#ef4444" />
                </DreiBox>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function BIMViewer() {
  const [layers, setLayers] = useState([
    { id: 'arch', name: 'Architecture', visible: true, color: 'bg-zinc-400' },
    { id: 'tga', name: 'TGA (MEP)', visible: true, color: 'bg-blue-500' },
    { id: 'fire', name: 'Fire Safety', visible: false, color: 'bg-red-500' },
    { id: 'struct', name: 'Structural', visible: true, color: 'bg-orange-500' },
  ]);
  
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auditMode, setAuditMode] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<string | null>(null);
  const [isExploded, setIsExploded] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [defectMode, setDefectMode] = useState(false);
  const [defectPins, setDefectPins] = useState<{position: THREE.Vector3, id: string, description: string}[]>([]);
  const [isTouring, setIsTouring] = useState(false);
  const { currentUser } = useAuth();
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedModel, setUploadedModel] = useState<{url: string, type: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rendering State
  const [isRendering, setIsRendering] = useState(false);
  const [renderPrompt, setRenderPrompt] = useState('Photorealistic architectural rendering, daylight, clear sky, high quality, 8k resolution, cinematic composition');
  const [activeStyle, setActiveStyle] = useState('realistic');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showRenderModal, setShowRenderModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const toggleLayer = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const handleMeasureClick = (point: THREE.Vector3) => {
    if (measurePoints.length >= 2) {
      setMeasurePoints([point]);
    } else {
      setMeasurePoints([...measurePoints, point]);
    }
  };

  const handleDefectClick = async (point: THREE.Vector3) => {
    const desc = window.prompt("Describe the defect:", "Crack in the wall");
    if (desc) {
      const newPin = { position: point, id: `DEF-${Date.now()}`, description: desc };
      setDefectPins([...defectPins, newPin]);
      
      // Auto-create ticket in Defects module
      if (currentUser && db && canvasRef.current) {
        try {
          // Capture screenshot
          const canvas = canvasRef.current;
          const base64DataUrl = canvas.toDataURL('image/png');
          const base64Data = base64DataUrl.split(',')[1];
          
          // Convert base64 to blob
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {type: 'image/png'});
          
          let imageUrl = '';
          if (storage) {
            const storageRef = ref(storage, `defects/${newPin.id}/screenshot.png`);
            await uploadBytes(storageRef, blob);
            imageUrl = await getDownloadURL(storageRef);
          }
          
          await setDoc(doc(db, 'defects', newPin.id), {
            id: newPin.id,
            title: desc,
            status: 'To Do',
            priority: 'High',
            assignee: 'Unassigned',
            date: new Date().toISOString().split('T')[0],
            trade: 'Architecture',
            location: `3D Model (X:${point.x.toFixed(1)}, Y:${point.y.toFixed(1)}, Z:${point.z.toFixed(1)})`,
            description: `Auto-generated from BIM Viewer. Coordinates: X:${point.x.toFixed(2)}, Y:${point.y.toFixed(2)}, Z:${point.z.toFixed(2)}`,
            imageUrl: imageUrl,
            ownerId: currentUser.uid
          });
          
          alert('Defect ticket automatically created in the Defects module.');
        } catch (err) {
          console.error('Failed to create defect ticket:', err);
        }
      }
    }
  };

  const handleAudit = async () => {
    setAuditMode(true);
    setSelectedId('hvac-main-2');
    setActiveFloor(2);
    // Ensure TGA layer is visible for the audit
    setLayers(layers.map(l => l.id === 'tga' ? { ...l, visible: true } : l));
    
    if (!canvasRef.current) return;
    setIsAuditing(true);
    setAuditReport(null);

    try {
      // Small delay to let the canvas update with the new layer/selection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = canvasRef.current;
      const base64DataUrl = canvas.toDataURL('image/png');
      const base64Data = base64DataUrl.split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `You are an expert BIM auditor and construction inspector. Analyze this 3D model screenshot.
      Identify any potential clashes, missing elements, or safety compliance issues (e.g. fire safety, HVAC routing).
      Provide a concise, professional audit report in 3 bullet points.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png'
            }
          },
          { text: prompt }
        ]
      });

      setAuditReport(response.text || 'Audit completed with no findings.');
    } catch (error) {
      console.error("Audit failed:", error);
      setAuditReport("Failed to generate audit report. Please try again.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleGenerateRender = async () => {
    if (!canvasRef.current) return;
    
    setIsRendering(true);
    try {
      // Capture current canvas state
      const canvas = canvasRef.current;
      const base64DataUrl = canvas.toDataURL('image/png');
      const base64Data = base64DataUrl.split(',')[1];

      // Initialize Gemini API
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/png',
              },
            },
            {
              text: `Transform this 3D building model view into a high-end architectural rendering. Style: ${renderPrompt}`,
            },
          ],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imgUrl = `data:image/png;base64,${part.inlineData.data}`;
          setGeneratedImage(imgUrl);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to generate render:", error);
      alert("Failed to generate rendering. Check console for details.");
    } finally {
      setIsRendering(false);
    }
  };

  const handleScreenshot = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'KreativDesk-BIM-Screenshot.png';
      link.href = url;
      link.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'fbx') {
      alert(`Das Format .${extension} ist ein komplexes Industrieformat. In einer echten Produktionsumgebung würde diese Datei nun an den Server gesendet und dort in ein web-optimiertes Format (GLTF) konvertiert werden (z.B. via Autodesk Forge oder web-ifc).\n\nFür diese Live-Vorschau im Browser werden aktuell .ifc, .obj, .glb/.gltf und .dae direkt unterstützt.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (extension !== 'obj' && extension !== 'gltf' && extension !== 'glb' && extension !== 'dae' && extension !== 'ifc') {
      alert('Bitte lade eine .ifc, .obj, .gltf, .glb oder .dae Datei hoch.');
      return;
    }

    setIsUploading(true);
    
    try {
      let url = '';
      if (isConfigured && storage && currentUser) {
        const storageRef = ref(storage, `models/${currentUser.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        url = await getDownloadURL(snapshot.ref);
      } else {
        url = URL.createObjectURL(file);
      }
      
      setUploadedModel({ url, type: extension });
    } catch (error) {
      console.error("Error uploading model:", error);
      alert("Fehler beim Hochladen des Modells.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getObjectDetails = (id: string | null) => {
    if (!id) return null;
    if (id.startsWith('hvac')) {
      return { type: 'HVAC Duct - Rectangular', material: 'Galvanized Steel', cost: 'CHF 4,200', status: 'Installed' };
    }
    if (id.startsWith('slab')) {
      return { type: 'Concrete Slab', material: 'Reinforced Concrete (C30/37)', cost: 'CHF 18,500', status: 'Curing' };
    }
    if (id.startsWith('col')) {
      return { type: 'Structural Column', material: 'Steel (S355)', cost: 'CHF 2,100', status: 'Installed' };
    }
    if (id.startsWith('core')) {
      return { type: 'Elevator Core', material: 'Concrete', cost: 'CHF 45,000', status: 'In Progress' };
    }
    return { type: 'Unknown Object', material: 'N/A', cost: 'N/A', status: 'N/A' };
  };

  const details = getObjectDetails(selectedId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col min-h-0 space-y-4"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">3D Viewer & Plans (BIM)</h1>
          <p className="text-text-muted text-sm mt-1">Munich Tech Campus - Main Building v2.4</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".ifc,.obj,.fbx,.gltf,.glb,.dae" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-surface border border-border rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isUploading ? 'Uploading...' : 'Upload Model'}
          </button>
          <button 
            onClick={handleAudit}
            className={cn(
              "px-4 py-2 border rounded-md text-sm font-medium transition-colors flex items-center gap-2",
              auditMode ? "bg-accent-warning/20 border-accent-warning text-accent-warning" : "bg-surface border-accent-ai/50 text-accent-ai hover:bg-accent-ai/10"
            )}
          >
            {auditMode ? <ShieldAlert size={16} /> : <Sparkles size={16} />}
            {auditMode ? 'Audit Running' : 'AI Model Audit'}
          </button>
          <button 
            onClick={() => setShowRenderModal(true)}
            className="px-4 py-2 bg-accent-ai text-text-primary rounded-md text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center gap-2"
          >
            <Camera size={16} />
            AI Render
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-y-auto md:overflow-hidden pb-4 md:pb-0">
        {/* 3D Canvas Area */}
        <div className="flex-1 bg-black border border-border rounded-xl relative overflow-hidden flex flex-col min-h-[50vh] md:min-h-0 shrink-0">
          {/* Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] md:w-auto bg-surface/80 backdrop-blur-md border border-border rounded-lg p-1.5 flex flex-wrap justify-center items-center gap-1 z-10">
            <button 
              onClick={() => {
                setDefectMode(!defectMode);
                if (!defectMode) setMeasureMode(false);
                setSelectedId(null);
              }}
              className={cn("p-2 rounded-md transition-colors", defectMode ? "bg-red-500/20 text-red-500" : "text-text-muted hover:bg-white/5 hover:text-text-primary")} 
              title="Mängel-Pin setzen"
            >
              <ShieldAlert size={18} />
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={() => {
                setMeasureMode(!measureMode);
                if (!measureMode) setDefectMode(false);
                setMeasurePoints([]);
                setSelectedId(null);
              }}
              className={cn("p-2 rounded-md transition-colors", measureMode ? "bg-accent-ai/20 text-accent-ai" : "bg-white/5 hover:text-text-primary")} 
              title="Messwerkzeug (Distanz)"
            >
              <Ruler size={18} />
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={() => setIsExploded(!isExploded)}
              className={cn("p-2 rounded-md transition-colors", isExploded ? "bg-accent-ai/20 text-accent-ai" : "text-text-muted hover:bg-white/5 hover:text-text-primary")} 
              title="Exploded View (Stockwerke trennen)"
            >
              <SplitSquareVertical size={18} />
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={() => setIsTouring(!isTouring)}
              className={cn("p-2 rounded-md transition-colors", isTouring ? "bg-accent-ai/20 text-accent-ai" : "text-text-muted hover:bg-white/5 hover:text-text-primary")} 
              title="AI Site Tour (Automated Fly-through)"
            >
              <Video size={18} />
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={() => setActiveFloor(prev => prev === null ? 2 : (prev < 2 ? prev + 1 : null))}
              className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" 
              title="Floor Up"
            >
              <ArrowUp size={18} />
            </button>
            <div className="px-2 text-xs font-medium text-text-muted w-16 text-center">
              {activeFloor === null ? 'ALL' : `LVL ${activeFloor}`}
            </div>
            <button 
              onClick={() => setActiveFloor(prev => prev === null ? 0 : (prev > 0 ? prev - 1 : null))}
              className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" 
              title="Floor Down"
            >
              <ArrowDown size={18} />
            </button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <button 
              onClick={handleScreenshot}
              className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" 
              title="Download Screenshot"
            >
              <Download size={18} />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-md text-text-muted hover:text-text-primary transition-colors" title="Fullscreen">
              <Maximize size={18} />
            </button>
          </div>

          {/* Real 3D Canvas */}
          <div className="flex-1 relative w-full h-full" onClick={() => !measureMode && setSelectedId(null)}>
            <Canvas 
              camera={{ position: [15, 12, 15], fov: 50 }} 
              gl={{ preserveDrawingBuffer: true }} // Required for taking screenshots
              ref={canvasRef}
            >
              <CameraRig isTouring={isTouring} />
              <color attach="background" args={['#09090b']} />
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 20, 5]} intensity={1.5} />
              <Suspense fallback={<Html center><Loader2 className="animate-spin text-accent-ai" size={32} /></Html>}>
                {uploadedModel ? (
                  <UploadedModelViewer url={uploadedModel.url} type={uploadedModel.type} />
                ) : (
                  <Building 
                    layers={layers} 
                    activeFloor={activeFloor} 
                    selectedId={selectedId} 
                    onSelect={setSelectedId}
                    auditMode={auditMode}
                    isExploded={isExploded}
                    measureMode={measureMode}
                    onMeasureClick={handleMeasureClick}
                    defectMode={defectMode}
                    onDefectClick={handleDefectClick}
                  />
                )}
                
                {/* Measurement Visuals */}
                {measurePoints.map((p, i) => (
                  <mesh key={i} position={p}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshBasicMaterial color="#fcd34d" />
                  </mesh>
                ))}
                {measurePoints.length === 2 && (
                  <>
                    <Line points={[measurePoints[0], measurePoints[1]]} color="#fcd34d" lineWidth={3} />
                    <Html position={measurePoints[0].clone().lerp(measurePoints[1], 0.5)} center>
                      <div className="bg-surface text-text-primary px-2 py-1 rounded border border-zinc-700 font-mono text-xs whitespace-nowrap shadow-lg">
                        {measurePoints[0].distanceTo(measurePoints[1]).toFixed(2)} m
                      </div>
                    </Html>
                  </>
                )}

                {/* Defect Pins */}
            {defectPins.map((pin, i) => (
              <group key={pin.id} position={pin.position}>
                <mesh position={[0, 0.5, 0]}>
                  <coneGeometry args={[0.2, 0.5, 16]} />
                  <meshStandardMaterial color="#ef4444" />
                </mesh>
                <mesh position={[0, 0.8, 0]}>
                  <sphereGeometry args={[0.2, 16, 16]} />
                  <meshStandardMaterial color="#ef4444" />
                </mesh>
                <Html position={[0, 1.2, 0]} center>
                  <div className="bg-red-500 text-text-primary px-2 py-1 rounded border border-red-700 font-mono text-xs whitespace-nowrap shadow-lg cursor-pointer hover:bg-red-600 transition-colors flex flex-col items-center">
                    <span className="font-bold">Defect #{i + 1}</span>
                    <span className="text-[10px] opacity-90">{pin.description}</span>
                  </div>
                </Html>
              </group>
            ))}

            <Environment preset="city" />
              </Suspense>
              <OrbitControls makeDefault target={[0, activeFloor !== null ? activeFloor * 4 : 4, 0]} />
              <Grid infiniteGrid fadeDistance={40} sectionColor="#27272a" cellColor="#18181b" />
            </Canvas>

            {/* AI Overlay Warning */}
            {auditMode && (
              <div className="absolute bottom-6 left-6 bg-surface/90 backdrop-blur-md border border-accent-warning/50 rounded-lg p-3 shadow-lg max-w-sm flex items-start gap-3 animate-in slide-in-from-bottom-4">
                <ShieldAlert className="text-accent-warning shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-xs font-medium text-accent-warning">Fire Safety Violation Detected</p>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    HVAC duct on Level 2 (Grid C4) reduces corridor clearance to 2.1m. Local regulations require minimum 2.2m for emergency egress.
                  </p>
                  <button 
                    onClick={() => setAuditMode(false)}
                    className="mt-2 text-xs text-text-primary underline hover:text-text-primary"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Layers & Properties */}
        <div className="w-full md:w-80 flex flex-col gap-4 shrink-0">
          {/* Layers Panel */}
          <div className="bg-surface border border-border rounded-xl p-4 flex-1">
            <h3 className="font-medium mb-4 flex items-center gap-2 text-sm">
              <Layers size={16} className="text-text-muted" />
              Model Layers
            </h3>
            <div className="space-y-2">
              {layers.map((layer) => (
                <div 
                  key={layer.id} 
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer",
                    layer.visible ? "bg-white/5 border-border" : "bg-transparent border-transparent hover:bg-surface"
                  )}
                  onClick={() => toggleLayer(layer.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-sm", layer.color, !layer.visible && "opacity-30")}></div>
                    <span className={cn("text-sm font-medium", !layer.visible && "text-text-muted")}>{layer.name}</span>
                  </div>
                  <button className="text-text-muted hover:text-text-primary transition-colors">
                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Properties Panel */}
          <div className="bg-surface border border-border rounded-xl p-4 flex-1">
            <h3 className="font-medium mb-4 text-sm">Selected Object</h3>
            {uploadedModel ? (
              <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Box className="text-text-muted mb-2" size={24} />
                <p className="text-sm text-text-primary font-medium">Custom Model Loaded</p>
                <p className="text-xs text-text-muted mt-1">
                  Format: {uploadedModel.type.toUpperCase()}
                </p>
                <button 
                  onClick={() => setUploadedModel(null)}
                  className="mt-3 px-3 py-1.5 hover:bg-white/10 rounded-md text-xs text-text-primary transition-colors"
                >
                  Reset to Default Model
                </button>
              </div>
            ) : defectMode ? (
              <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-red-500/50 bg-red-500/5 rounded-lg p-4 text-center">
                <ShieldAlert className="text-red-500 mb-2" size={24} />
                <p className="text-sm text-text-primary font-medium">Defect Pin Mode</p>
                <p className="text-xs text-text-muted mt-1">
                  Click anywhere on the model to place a defect pin.
                </p>
                {defectPins.length > 0 && (
                  <button 
                    onClick={() => setDefectPins([])}
                    className="mt-3 px-3 py-1.5 hover:bg-white/10 rounded-md text-xs text-text-primary transition-colors"
                  >
                    Clear All Pins
                  </button>
                )}
              </div>
            ) : measureMode ? (
              <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-accent-ai/50 bg-accent-ai/5 rounded-lg p-4 text-center">
                <Ruler className="text-accent-ai mb-2" size={24} />
                <p className="text-sm text-text-primary font-medium">Measurement Mode</p>
                <p className="text-xs text-text-muted mt-1">
                  {measurePoints.length === 0 ? "Click a point to start" : measurePoints.length === 1 ? "Click a second point" : "Distance calculated"}
                </p>
              </div>
            ) : auditMode ? (
              <div className="space-y-3 animate-in fade-in">
                <div className="bg-accent-warning/10 border border-accent-warning/30 rounded-lg p-4">
                  <h4 className="text-accent-warning font-medium flex items-center gap-2 mb-2">
                    {isAuditing ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                    {isAuditing ? "Analyzing Model..." : "Audit Report"}
                  </h4>
                  {auditReport ? (
                    <div className="text-sm text-text-primary whitespace-pre-wrap">
                      {auditReport}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">
                      {isAuditing ? "The AI is currently analyzing the visible layers for compliance and clashes." : "No report generated."}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setAuditMode(false)}
                  className="w-full py-2 mt-2 bg-white/10 border border-border rounded-lg text-xs font-medium transition-colors hover:bg-white/20"
                >
                  Close Audit
                </button>
              </div>
            ) : details ? (
              <div className="space-y-3 animate-in fade-in">
                <div className="bg-surface border border-border rounded-lg p-3">
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">Type</p>
                  <p className="text-sm font-medium">{details.type}</p>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3">
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">Material</p>
                  <p className="text-sm font-medium">{details.material}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">Est. Cost</p>
                    <p className="text-sm font-mono">{details.cost}</p>
                  </div>
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-1">Status</p>
                    <p className="text-sm font-medium text-emerald-500">{details.status}</p>
                  </div>
                </div>
                <button className="w-full py-2 mt-2 bg-white/10 border border-border rounded-lg text-xs font-medium transition-colors">
                  View in Finance Ledger
                </button>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                <p className="text-sm text-text-muted">Click an object in the 3D view</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Render Modal */}
      {showRenderModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="text-accent-ai" size={20} />
                AI High-End Rendering (Nano Banana)
              </h2>
              <button onClick={() => setShowRenderModal(false)} className="text-text-muted hover:text-text-primary p-1 rounded-md hover:bg-white/5 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
              {/* Controls */}
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-2">Style Presets</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: 'realistic', name: 'Photorealistic', prompt: 'Photorealistic architectural rendering, daylight, clear sky, high quality, 8k resolution, cinematic composition' },
                      { id: 'bluehour', name: 'Blue Hour', prompt: 'Architectural rendering during blue hour, warm interior lights, cool exterior twilight, high end, 8k' },
                      { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'Cyberpunk style architectural rendering, neon lights, rainy night, futuristic, glowing accents, 8k, Unreal Engine 5' },
                      { id: 'sketch', name: 'Pencil Sketch', prompt: 'Architectural pencil sketch, hand-drawn, technical drawing style, clean lines, white background, minimalist' },
                      { id: 'clay', name: 'Clay Model', prompt: 'Architectural clay model render, ambient occlusion, soft studio lighting, monochrome white, minimalist' },
                      { id: 'watercolor', name: 'Watercolor', prompt: 'Architectural watercolor painting, soft edges, artistic, vibrant but pastel colors, concept art' },
                    ].map(style => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setActiveStyle(style.id);
                          setRenderPrompt(style.prompt);
                        }}
                        className={cn(
                          "p-2 text-xs text-left rounded-md border transition-colors",
                          activeStyle === style.id 
                            ? "bg-accent-ai/20 border-accent-ai text-accent-ai font-medium" 
                            : "bg-surface border-border text-text-muted hover:bg-white/5 hover:text-text-primary"
                        )}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>

                  <label className="block text-sm font-medium text-text-muted mb-2">Custom Prompt</label>
                  <textarea 
                    value={renderPrompt}
                    onChange={(e) => {
                      setRenderPrompt(e.target.value);
                      setActiveStyle('custom');
                    }}
                    className="w-full bg-surface border border-border rounded-lg p-3 text-sm text-text-primary focus:outline-none focus:border-accent-ai/50 resize-none h-24"
                    placeholder="Describe the desired lighting, mood, materials, and environment..."
                  />
                </div>
                
                <div className="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
                  <p className="mb-2"><strong className="text-text-primary">How it works:</strong></p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Positions the camera exactly as currently viewed.</li>
                    <li>Captures the raw 3D geometry.</li>
                    <li>Uses Gemini 2.5 Flash Image to generate a photorealistic overlay based on your prompt.</li>
                  </ul>
                </div>

                <button 
                  onClick={handleGenerateRender}
                  disabled={isRendering}
                  className="w-full py-3 bg-accent-ai text-text-primary rounded-lg text-sm font-medium hover:bg-accent-ai/90 transition-colors shadow-lg shadow-accent-ai/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                >
                  {isRendering ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Rendering...
                    </>
                  ) : (
                    <>
                      <ImageIcon size={18} />
                      Generate Render
                    </>
                  )}
                </button>
              </div>

              {/* Result Area */}
              <div className="w-full md:w-2/3 bg-black border border-border rounded-lg flex items-center justify-center overflow-hidden min-h-[300px] relative">
                {isRendering ? (
                  <div className="flex flex-col items-center gap-4 text-accent-ai">
                    <Loader2 size={48} className="animate-spin" />
                    <p className="text-sm font-medium animate-pulse">Generating high-end render...</p>
                  </div>
                ) : generatedImage ? (
                  <img src={generatedImage} alt="Generated Render" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-text-muted">
                    <Camera size={48} className="opacity-20" />
                    <p className="text-sm">Click "Generate Render" to create an image.</p>
                  </div>
                )}
                
                {generatedImage && !isRendering && (
                  <a 
                    href={generatedImage} 
                    download="kreativ-desk-render.png"
                    className="absolute bottom-4 right-4 px-4 py-2 bg-surface/80 backdrop-blur-sm border border-border text-text-primary rounded-md text-xs font-medium hover:bg-white/5 transition-colors"
                  >
                    Download Image
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}