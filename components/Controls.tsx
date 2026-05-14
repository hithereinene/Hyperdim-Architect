import React from 'react';
import { RotationState, Shape } from '../types';
import { getRotationPlanes, estimateToratopeSize, generateNumericToratope } from '../services/mathUtils';
import { explainToratope } from '../services/geminiService';
import { Sparkles, Download } from 'lucide-react';
import SimulationCanvas from './SimulationCanvas';

interface ControlsProps {
  activeDim: number;
  setActiveDim: (dim: number) => void;
  onExtrude: () => void;
  onReset: () => void;
  rotations: RotationState;
  setRotations: React.Dispatch<React.SetStateAction<RotationState>>;
  shape: Shape;
  autoRotate: boolean;
  setAutoRotate: (v: boolean) => void;
  onSelectPreset: (type: string, param?: any) => void;
  onCartesianProduct: (factors: string[]) => void;
  zoom: number;
  setZoom: (z: number) => void;
  extrusionSegments?: number;
  setExtrusionSegments?: (n: number) => void;
  ntopeConfig?: { sides1: number, sides2: number, sides3: number, type: string };
  setNtopeConfig?: (config: { sides1: number, sides2: number, sides3: number, type: string }) => void;
  onCreateNtope?: () => void;
  torusConfig?: { majorRadius: number, minorRadius: number, ringSegments: number, tubeSegments: number };
  setTorusConfig?: (config: { majorRadius: number, minorRadius: number, ringSegments: number, tubeSegments: number }) => void;
  onCreateTorus?: () => void;
  spinConfig?: { majorRadius: number, segments: number, targetDim: number };
  setSpinConfig?: (config: { majorRadius: number, segments: number, targetDim: number }) => void;
  onSpinShape?: () => void;
  gyroConfig?: { p: number, q: number, type: string };
  setGyroConfig?: (config: { p: number, q: number, type: string }) => void;
  onCreateGyrochoron?: () => void;
  gyropetonConfig?: { p: number, q: number, r: number };
  setGyropetonConfig?: (config: { p: number, q: number, r: number }) => void;
  onCreateGyropeton?: () => void;
  specialCutConfig?: { index: number };
  setSpecialCutConfig?: (config: { index: number }) => void;
  onCreateSpecialCut?: () => void;
  onTruncate?: () => void;
  onRectify?: () => void;
  onOmnitruncate?: () => void;
  onExpand?: () => void;
  onRuncinate?: () => void;
  onWythoff?: (rings: number[]) => void;
  onStellate?: () => void;
  onSnub?: () => void;
  onPyramidize?: () => void;
  onBipyramidize?: () => void;
  onAntiprismize?: () => void;
  onUrsaize?: () => void;
  onCupolize?: () => void;
  onLoadOFF?: (offData: string) => void;
  onDual?: () => void;
  hacka67Mode?: boolean;
  setHacka67Mode?: (mode: boolean) => void;
  may2ndMode?: boolean;
  setMay2ndMode?: (mode: boolean) => void;
  showMaiaPrism?: boolean;
  showToratopeExplorer?: boolean;
  setShowToratopeExplorer?: (mode: boolean) => void;
  onLoadNumericToratope?: (sequence: string, name?: string) => void;
  onRandomShape?: () => void;
  onRandomSpin?: () => void;
  onExportOFF?: () => void;
}

const KNOWN_TAPERTOPES: Record<string, { name: string, notation: string }[]> = {
    "0": [{ name: "Point", notation: "0" }],
    "1": [{ name: "Digon", notation: "1" }],
    "2": [{ name: "Circle", notation: "2" }],
    "11": [{ name: "Square", notation: "11" }, { name: "Triangle", notation: "11" }],
    "3": [{ name: "Sphere", notation: "3" }],
    "21": [{ name: "Cylinder", notation: "21" }, { name: "Cone", notation: "21" }],
    "111": [{ name: "Cube", notation: "111" }, { name: "Triangular prism", notation: "111" }],
    "[11]1": [{ name: "Square pyramid", notation: "[11]1" }],
    "12": [{ name: "Tetrahedron", notation: "12" }],
    "4": [{ name: "Glome", notation: "4" }],
    "31": [{ name: "Spherinder", notation: "31" }, { name: "Sphone", notation: "31" }],
    "22": [{ name: "Duocylinder", notation: "22" }, { name: "Dicone", notation: "22" }],
    "211": [{ name: "Cubinder", notation: "211" }, { name: "Cyltrianglinder", notation: "211" }],
    "1111": [{ name: "Tesseract", notation: "1111" }, { name: "Triangular diprism", notation: "1111" }, { name: "Duotrianglinder", notation: "1111" }],
    "[21]1": [{ name: "Cylindrone", notation: "[21]1" }],
    "[111]1": [{ name: "Cubic pyramid", notation: "[111]1" }, { name: "Triangular prismic pyramid", notation: "[111]1" }],
    "[11]2": [{ name: "Square dipyramid", notation: "[11]2" }],
    "121": [{ name: "Coninder", notation: "121" }],
    "1[11]1": [{ name: "Square pyramidal prism", notation: "1[11]1" }],
    "112": [{ name: "Tetrahedral prism", notation: "112" }],
    "13": [{ name: "Pentachoron", notation: "13" }],
    "5": [{ name: "Pentasphere", notation: "5" }],
    "41": [{ name: "Glominder", notation: "41" }, { name: "Glone", notation: "41" }],
    "32": [{ name: "Cylspherinder", notation: "32" }, { name: "Disphone", notation: "32" }],
    "311": [{ name: "Cubspherinder", notation: "311" }, { name: "Sphertrianglinder", notation: "311" }],
    "221": [{ name: "Duocylindyinder", notation: "221" }, { name: "Cylconinder", notation: "221" }],
    "2111": [{ name: "Tesserinder", notation: "2111" }, { name: "Cyltrianglindyinder", notation: "2111" }, { name: "Contrianglinder", notation: "2111" }],
    "11111": [{ name: "Penteract", notation: "11111" }, { name: "Triangular triprism", notation: "11111" }, { name: "Duotrianglindyinder", notation: "11111" }],
    "[31]1": [{ name: "Spherindrone", notation: "[31]1" }],
    "[22]1": [{ name: "Duocylindrone", notation: "[22]1" }],
    "[211]1": [{ name: "Cubindrone", notation: "[211]1" }, { name: "Cyltrianglindrone", notation: "[211]1" }],
    "[1111]1": [{ name: "Tesseric pyramid", notation: "[1111]1" }, { name: "Triangular diprismic pyramid", notation: "[1111]1" }, { name: "Duotrianglindric pyramid", notation: "[1111]1" }],
    "[21]2": [{ name: "Dicylindrone", notation: "[21]2" }],
    "[111]2": [{ name: "Cubic dipyramid", notation: "[111]2" }, { name: "Triangular prismic dipyramid", notation: "[111]2" }],
    "2[11]1": [{ name: "Cylhemoctahedrinder", notation: "2[11]1" }],
    "212": [{ name: "Cyltetrahedrinder", notation: "212" }],
    "1121": [{ name: "Conic diprism", notation: "1121" }],
    "11[11]1": [{ name: "Square pyramidal diprism", notation: "11[11]1" }],
    "1112": [{ name: "Tetrahedral diprism", notation: "1112" }],
    "23": [{ name: "Tricone", notation: "23" }],
    "[11]3": [{ name: "Square tripyramid", notation: "[11]3" }],
    "131": [{ name: "Sphoninder", notation: "131" }],
    "1[21]1": [{ name: "Cylindronic prism", notation: "1[21]1" }],
    "1[111]1": [{ name: "Cubic pyramidal prism", notation: "1[111]1" }, { name: "Triangular prismic pyramidal prism", notation: "1[111]1" }],
    "122": [{ name: "Diconic prism", notation: "122" }],
    "1[11]2": [{ name: "Square dipyramidal prism", notation: "1[11]2" }],
    "113": [{ name: "Pentachoric prism", notation: "113" }],
    "[121]1": [{ name: "Conindric pyramid", notation: "[121]1" }],
    "[1[11]1]1": [{ name: "Square pyramidal prismic pyramid", notation: "[1[11]1]1" }],
    "[112]1": [{ name: "Tetrahedral prismic pyramid", notation: "[112]1" }],
    "14": [{ name: "Hexateron", notation: "14" }],
    "[11]111": [{ name: "Hemoctahedrotrianglinder", notation: "[11]111" }],
    "1211": [{ name: "Tetrahedrotrianglinder", notation: "1211" }],
    "1^4": [{ name: "6-tera", notation: "1^4" }]
};

const KNOWN_TORATOPES: Record<string, { name: string, notation: string }[]> = {
    "11": [{ name: "Square", notation: "II" }],
    "2": [{ name: "Circle", notation: "(II)" }],
    "111": [{ name: "Cube", notation: "III" }],
    "3": [{ name: "Sphere", notation: "(III)" }],
    "21": [{ name: "Cylinder", notation: "(II)I" }],
    "22": [
        { name: "Torus", notation: "((II)I)" }
    ],
    "2[2]": [
        { name: "Duocylinder", notation: "(II)(II)" }
    ],
    "1111": [{ name: "Tesseract", notation: "IIII" }],
    "4": [{ name: "Glome", notation: "(IIII)" }],
    "211": [{ name: "Cubinder", notation: "(II)II" }],
    "32": [
        { name: "Spheritorus", notation: "((II)II)" },
        { name: "Torisphere", notation: "((III)I)" },
        { name: "Cylspherinder", notation: "(III)(II)" }
    ],
    "222": [
        { name: "Ditorus", notation: "(((II)I)I)" },
        { name: "Cyltorinder", notation: "((II)I)(II)" }
    ],
    "22[2]": [
        { name: "Tiger", notation: "((II)(II))" }
    ],
    "22[2][2]": [
        { name: "Triocylinder", notation: "((II)(II)(II))" }
    ],
    "31": [{ name: "Spherinder", notation: "(III)I" }],
    "221": [
        { name: "Torinder", notation: "((II)I)I" }
    ],
    "2[2]1": [
        { name: "Duocylindyinder", notation: "(II)(II)I" }
    ],
    "11111": [{ name: "Penteract", notation: "IIIII" }],
    "5": [{ name: "Pentasphere", notation: "(IIIII)" }],
    "2111": [{ name: "Tesserinder", notation: "(II)III" }],
    "42": [
        { name: "Glomitorus", notation: "((II)III)" },
        { name: "Toriglome", notation: "((IIII)I)" }
    ],
    "322": [
        { name: "Spheriditorus", notation: "(((II)I)II)" },
        { name: "Cylspherintigroid", notation: "((III)(II))" },
        { name: "Torispheritorus", notation: "(((II)II)I)" },
        { name: "Ditorisphere", notation: "(((III)I)I)" }
    ],
    "32[2]": [
        { name: "Spheritiger", notation: "((II)(II)I)" }
    ],
    "311": [{ name: "Cubspherinder", notation: "(III)II" }],
    "33": [{ name: "Spheritorisphere", notation: "((III)II)" }],
    "2211": [{ name: "Cubtorinder", notation: "((II)I)II" }],
    "2222": [
        { name: "Cyltorintigroid", notation: "(((II)I)(II))" },
        { name: "Tritorus", notation: "((((II)I)I)I)" }
    ],
    "222[2]": [
        { name: "Toratiger", notation: "(((II)(II))I)" }
    ],
    "41": [{ name: "Glominder", notation: "(IIII)I" }],
    "321": [
        { name: "Spheritorinder", notation: "((II)II)I" },
        { name: "Torispherinder", notation: "((III)I)I" }
    ],
    "3[2]1": [
        { name: "Cylspherindyinder", notation: "(III)(II)I" }
    ],
    "2221": [
        { name: "Ditorinder", notation: "(((II)I)I)I" }
    ],
    "22[2]1": [
        { name: "Tigric prism", notation: "((II)(II))I" }
    ],
    "2[2][2]": [
        { name: "Tricylinder", notation: "(II)(II)(II)" }
    ],
    "3212": [{ name: "Herure's Shape", notation: "3212" }],
    "212112": [{ name: "Novairus", notation: "212112" }],
    "1242": [{ name: "Nema's Torisphere", notation: "1242" }]
};

const Controls: React.FC<ControlsProps> = ({
  activeDim,
  setActiveDim,
  onExtrude,
  onReset,
  rotations,
  setRotations,
  shape,
  autoRotate,
  setAutoRotate,
  onSelectPreset,
  onCartesianProduct,
  zoom,
  setZoom,
  extrusionSegments,
  setExtrusionSegments,
  ntopeConfig,
  setNtopeConfig,
  onCreateNtope,
  torusConfig,
  setTorusConfig,
  onCreateTorus,
  spinConfig,
  setSpinConfig,
  onSpinShape,
  gyroConfig,
  setGyroConfig,
  onCreateGyrochoron,
  gyropetonConfig,
  setGyropetonConfig,
  onCreateGyropeton,
  specialCutConfig,
  setSpecialCutConfig,
  onCreateSpecialCut,
  onTruncate,
  onRectify,
  onOmnitruncate,
  onExpand,
  onRuncinate,
  onWythoff,
  onStellate,
  onSnub,
  onPyramidize,
  onBipyramidize,
  onAntiprismize,
  onUrsaize,
  onCupolize,
  onLoadOFF,
  onDual,
  hacka67Mode,
  setHacka67Mode,
  may2ndMode,
  setMay2ndMode,
  showMaiaPrism,
  showToratopeExplorer,
  setShowToratopeExplorer,
  onLoadNumericToratope,
  onRandomShape,
  onRandomSpin,
  onExportOFF
}) => {

  const [activeTab, setActiveTab] = React.useState<'build' | 'spin' | 'cartesian'>('build');

  const [toratopeInput, setToratopeInput] = React.useState('');
  const [tapertopeInput, setTapertopeInput] = React.useState('');
  const [explorerTab, setExplorerTab] = React.useState<'toratope' | 'tapertope'>('toratope');
  const [toratopeWarning, setToratopeWarning] = React.useState<{type: 'fidelity'|'crash', v: number, e: number, seq: string, dim: number} | null>(null);
  const [lowPolyShape, setLowPolyShape] = React.useState<Shape | null>(null);
  const [toratopeError, setToratopeError] = React.useState('');
  const [toratopeAiDescription, setToratopeAiDescription] = React.useState<string | null>(null);
  const [isDescribing, setIsDescribing] = React.useState(false);
  
  const [cartesianFactors, setCartesianFactors] = React.useState<string[]>(['square', 'circle']);

  const [activeRings, setActiveRings] = React.useState<number[]>([1]);

  const handleRingToggle = (ring: number) => {
      setActiveRings(prev => 
          prev.includes(ring) ? prev.filter(r => r !== ring) : [...prev, ring].sort((a, b) => a - b)
      );
  };

  const applyWythoff = () => {
      if (onWythoff) {
          onWythoff(activeRings);
      } else {
          // Fallback if not provided
          const ringsStr = activeRings.join(',');
          const d = shape.dimension;
          const allRings = Array.from({length: d}, (_, i) => i + 1).join(',');
          
          if (ringsStr === '1,2') {
              onTruncate?.();
          } else if (ringsStr === '2') {
              onRectify?.();
          } else if (ringsStr === allRings && d > 1) {
              onOmnitruncate?.();
          } else if (ringsStr === `1,${d}`) {
              onExpand?.();
          } else if (ringsStr === '1,4' && d >= 4) {
              onRuncinate?.();
          } else {
              alert(`Wythoff operation with rings [${ringsStr}] is not fully supported yet.`);
          }
      }
  };

  const fetchToratopeDescription = async (seq: string) => {
      setIsDescribing(true);
      setToratopeAiDescription(null);
      try {
          const desc = await explainToratope(seq);
          setToratopeAiDescription(desc);
      } catch (e) {
          console.error(e);
      } finally {
          setIsDescribing(false);
      }
  };

  const handleAnalyzeToratope = () => {
      setToratopeError('');
      setToratopeWarning(null);
      
      const cleanedInput = toratopeInput.replace(/[^0-9()\[\]]/g, '');
      
      if (cleanedInput.length === 0) {
          setToratopeError('Please enter a valid numeric sequence (e.g., 3212, (10)1, or 22[2]).');
          return;
      }
      
      const { vertices, edges, dimension } = estimateToratopeSize(cleanedInput);
      
      if (dimension < 2 || dimension > 15) {
          setToratopeError(`Resulting dimension is ${dimension}D. Please keep it between 2D and 15D.`);
          return;
      }
      
      const total = vertices + edges;
      
      if (total > 50000) {
          setToratopeWarning({ type: 'crash', v: vertices, e: edges, seq: cleanedInput, dim: dimension });
          setLowPolyShape(generateNumericToratope(cleanedInput, "Low-Poly Preview", 2));
          fetchToratopeDescription(cleanedInput);
      } else if (total > 10000) {
          setToratopeWarning({ type: 'fidelity', v: vertices, e: edges, seq: cleanedInput, dim: dimension });
          setLowPolyShape(generateNumericToratope(cleanedInput, "Low-Poly Preview", 2));
          fetchToratopeDescription(cleanedInput);
      } else {
          const knownMatches = KNOWN_TORATOPES[cleanedInput];
          const customName = knownMatches ? knownMatches.map(m => m.name).join(' / ') : undefined;
          onLoadNumericToratope?.(cleanedInput, customName);
      }
  };

  const confirmLoadToratope = () => {
      if (toratopeWarning) {
          const cleaned = toratopeWarning.seq;
          const knownMatches = KNOWN_TORATOPES[cleaned];
          const customName = knownMatches ? knownMatches.map(m => m.name).join(' / ') : undefined;
          onLoadNumericToratope?.(toratopeWarning.seq, customName);
          setToratopeWarning(null);
          setLowPolyShape(null);
      }
  };

  const handleRotationChange = (plane: string, value: number) => {
    setRotations(prev => ({
      ...prev,
      [plane]: value
    }));
  };

  const handleManualZoom = (delta: number) => {
      setZoom(Math.max(0.01, Math.min(10, zoom + delta)));
  };

  const planes = getRotationPlanes(activeDim);

  // Helper to render stats row
  const StatRow = ({ label, value }: { label: string, value: number | string | undefined }) => {
     if (value === undefined) return null;
     const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
     return (
        <div className="flex justify-between text-xs py-1 border-b border-slate-800 last:border-0">
           <span className="text-slate-500 font-medium">{label}</span>
           <span className="text-slate-300 font-mono text-right ml-4 break-words max-w-[200px]">{displayValue}</span>
        </div>
     );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 shrink-0">
          <button 
              onClick={() => setActiveTab('build')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'build' ? 'text-sky-400 border-b-2 border-sky-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
          >
              Build
          </button>
          <button 
              onClick={() => setActiveTab('spin')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'spin' ? 'text-sky-400 border-b-2 border-sky-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
          >
              Spin
          </button>
          <button 
              onClick={() => setActiveTab('cartesian')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'cartesian' ? 'text-sky-400 border-b-2 border-sky-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
          >
              Products
          </button>
      </div>

      <div className="flex flex-col gap-6 p-4 overflow-y-auto flex-1">
      
        {/* Toggles Row */}
        <div className="flex space-x-4 mb-2">
            <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={hacka67Mode || false}
                    onChange={(e) => setHacka67Mode?.(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500"
                />
                <span>Hacka 67 Mode</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={may2ndMode || false}
                    onChange={(e) => setMay2ndMode?.(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-600 text-orange-500 focus:ring-orange-500"
                />
                <span>May 2nd Mode</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={showToratopeExplorer || false}
                    onChange={(e) => setShowToratopeExplorer?.(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Shape Explorer</span>
            </label>
        </div>

        {showToratopeExplorer && (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-emerald-500/30">
                <div className="flex space-x-2 mb-4">
                    <button 
                        onClick={() => setExplorerTab('toratope')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded ${explorerTab === 'toratope' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        Toratopes
                    </button>
                    <button 
                        onClick={() => setExplorerTab('tapertope')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded ${explorerTab === 'tapertope' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                        Tapertopes
                    </button>
                </div>

                {explorerTab === 'toratope' ? (
                    <>
                        <h3 className="text-sm font-semibold text-emerald-400 mb-2">Toratope Explorer</h3>
                        <p className="text-xs text-slate-400 mb-3">
                            Load any toratope from 2D to 15D using its numeric notation (e.g., 3212). 
                            Use parentheses for multi-digit numbers (e.g., (10)1 for a 10-Hypersphere Prism).
                            Standard toratopes are also located in the Presets dropdown under "Torus & Rings".
                        </p>
                        
                        <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-700/50">
                            <div className="text-xs font-semibold text-slate-300 mb-1">Total Toratopes per Dimension:</div>
                            <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[10px] text-slate-400">
                                <div>2D: <span className="text-emerald-400">2</span></div>
                                <div>3D: <span className="text-emerald-400">4</span></div>
                                <div>4D: <span className="text-emerald-400">10</span></div>
                                <div>5D: <span className="text-emerald-400">24</span></div>
                                <div>6D: <span className="text-emerald-400">66</span></div>
                                <div>7D: <span className="text-emerald-400">180</span></div>
                                <div>8D: <span className="text-emerald-400">522</span></div>
                                <div>9D: <span className="text-emerald-400">1,532</span></div>
                                <div>10D: <span className="text-emerald-400">4,624</span></div>
                                <div>11D: <span className="text-emerald-400">14,136</span></div>
                                <div>12D: <span className="text-emerald-400">43,930</span></div>
                                <div>13D: <span className="text-emerald-400">137,908</span></div>
                                <div>14D: <span className="text-emerald-400">437,502</span></div>
                                <div>15D: <span className="text-emerald-400">1,399,068</span></div>
                                <div>16D: <span className="text-emerald-400">4,507,352</span></div>
                                <div>17D: <span className="text-emerald-400">14,611,576</span></div>
                                <div>18D: <span className="text-emerald-400">47,633,486</span></div>
                                <div>19D: <span className="text-emerald-400">156,047,204</span></div>
                                <div>20D: <span className="text-emerald-400">513,477,502</span></div>
                                <div>21D: <span className="text-emerald-400">1,696,305,728</span></div>
                                <div>22D: <span className="text-emerald-400">5,623,993,944</span></div>
                                <div>23D: <span className="text-emerald-400">18,706,733,128</span></div>
                                <div>24D: <span className="text-emerald-400">62,408,176,762</span></div>
                                <div>25D: <span className="text-emerald-400">208,769,240,140</span></div>
                                <div>26D: <span className="text-emerald-400">700,129,713,630</span></div>
                                <div>27D: <span className="text-emerald-400">2,353,386,723,912</span></div>
                            </div>
                        </div>

                        <div className="flex space-x-2 mb-2">
                            <input 
                                type="text" 
                                value={toratopeInput}
                                onChange={(e) => setToratopeInput(e.target.value)}
                                placeholder="e.g., 3212 or 212112"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                            />
                            <button 
                                onClick={handleAnalyzeToratope}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
                            >
                                Analyze & Load
                            </button>
                        </div>

                        {toratopeInput.replace(/[^0-9()\[\]]/g, '') && KNOWN_TORATOPES[toratopeInput.replace(/[^0-9()\[\]]/g, '')] && (
                            <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-700/50">
                                <div className="text-xs text-slate-400 mb-1">Known shapes for {toratopeInput.replace(/[^0-9()\[\]]/g, '')}:</div>
                                <ul className="text-xs text-emerald-400 space-y-1">
                                    {KNOWN_TORATOPES[toratopeInput.replace(/[^0-9()\[\]]/g, '')].map((m, i) => (
                                        <li key={i}>• {m.name} <span className="text-slate-500">{m.notation}</span></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {toratopeError && (
                            <div className="text-xs text-red-400 mt-2">{toratopeError}</div>
                        )}
                        
                        {toratopeWarning && (
                            <div className={`mt-3 p-3 rounded border ${toratopeWarning.type === 'crash' ? 'bg-red-900/30 border-red-500/50' : 'bg-yellow-900/30 border-yellow-500/50'}`}>
                                <h4 className={`text-sm font-bold mb-1 ${toratopeWarning.type === 'crash' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {toratopeWarning.type === 'crash' ? 'CRASH WARNING' : 'FIDELITY WARNING'}
                                </h4>
                                <p className="text-xs text-slate-300 mb-2">
                                    This {toratopeWarning.dim}D shape will generate <strong>{toratopeWarning.v.toLocaleString()}</strong> vertices and <strong>{toratopeWarning.e.toLocaleString()}</strong> edges.
                                    {toratopeWarning.type === 'crash' 
                                        ? ' This is an extreme amount of geometry and will likely crash your browser or cause severe lag.' 
                                        : ' This is a high amount of geometry and may cause your browser to render slowly.'}
                                </p>
                                
                                <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-700 text-xs text-slate-300">
                                    <div className="font-semibold text-indigo-400 mb-1 flex items-center">
                                        <Sparkles className="w-3 h-3 mr-1" /> AI Description
                                    </div>
                                    {isDescribing ? (
                                        <span className="animate-pulse">Analyzing shape structure...</span>
                                    ) : (
                                        <span>{toratopeAiDescription}</span>
                                    )}
                                </div>
                                
                                {lowPolyShape && (
                                    <div className="mb-3">
                                        <div className="text-xs font-semibold text-slate-400 mb-1">Low-Fidelity Preview (Tapertope)</div>
                                        <div className="h-48 w-full rounded border border-slate-700 overflow-hidden relative bg-slate-950">
                                            <SimulationCanvas
                                                shape={lowPolyShape}
                                                rotations={{}}
                                                activeDim={lowPolyShape.dimension}
                                                autoRotate={true}
                                                zoom={1.5}
                                                setZoom={() => {}}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex space-x-2">
                                    <button 
                                        onClick={confirmLoadToratope}
                                        className={`px-3 py-1 rounded text-xs font-bold text-white ${toratopeWarning.type === 'crash' ? 'bg-red-600 hover:bg-red-500' : 'bg-yellow-600 hover:bg-yellow-500'}`}
                                    >
                                        Load Anyway
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setToratopeWarning(null);
                                            setLowPolyShape(null);
                                        }}
                                        className="px-3 py-1 rounded text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <h3 className="text-sm font-semibold text-indigo-400 mb-2">Tapertope Explorer</h3>
                        <p className="text-xs text-slate-400 mb-3">
                            Look up any tapertope using its tapertopic notation (e.g., 111, [11]1, 1^4).
                            This dictionary contains known tapertopes up to 12D.
                        </p>
                        
                        <div className="mb-3 p-2 bg-slate-900/50 rounded border border-slate-700/50">
                            <div className="text-xs font-semibold text-slate-300 mb-1">Total Tapertopes per Dimension:</div>
                            <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[10px] text-slate-400">
                                <div>0D: <span className="text-indigo-400">1</span></div>
                                <div>1D: <span className="text-indigo-400">1</span></div>
                                <div>2D: <span className="text-indigo-400">3</span></div>
                                <div>3D: <span className="text-indigo-400">7</span></div>
                                <div>4D: <span className="text-indigo-400">18</span></div>
                                <div>5D: <span className="text-indigo-400">45</span></div>
                                <div>6D: <span className="text-indigo-400">116</span></div>
                                <div>7D: <span className="text-indigo-400">298</span></div>
                                <div>8D: <span className="text-indigo-400">776</span></div>
                                <div>9D: <span className="text-indigo-400">2,025</span></div>
                                <div>10D: <span className="text-indigo-400">5,322</span></div>
                                <div>12D: <span className="text-indigo-400">...</span></div>
                            </div>
                        </div>

                        <div className="flex space-x-2 mb-2">
                            <input 
                                type="text" 
                                value={tapertopeInput}
                                onChange={(e) => setTapertopeInput(e.target.value)}
                                placeholder="e.g., 111 or [11]1"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        {tapertopeInput && KNOWN_TAPERTOPES[tapertopeInput] ? (
                            <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-700/50">
                                <div className="text-xs text-slate-400 mb-1">Known shapes for {tapertopeInput}:</div>
                                <ul className="text-xs text-indigo-400 space-y-1">
                                    {KNOWN_TAPERTOPES[tapertopeInput].map((m, i) => (
                                        <li key={i}>• {m.name}</li>
                                    ))}
                                </ul>
                                <div className="mt-2 text-[10px] text-slate-500 italic">
                                    Note: Tapertopes are highly ambiguous in notation. A generic generator is not available, but you can find many of these in the Presets dropdown.
                                </div>
                            </div>
                        ) : tapertopeInput ? (
                            <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-700/50 text-xs text-slate-500">
                                No known tapertopes found for this notation.
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        )}

      {activeTab === 'cartesian' && (
        <div className="space-y-4">
            <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                <h3 className="text-sm font-semibold text-sky-400 mb-2">Cartesian Products</h3>
                <p className="text-xs text-slate-400 mb-4">
                    Multiply two shapes together to create higher-dimensional prisms (like duoprisms).
                </p>
                
                <div className="space-y-3">
                    {cartesianFactors.map((factor, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && <div className="flex justify-center text-slate-500 font-bold">×</div>}
                            <div className="flex gap-2">
                                <select 
                                    value={factor}
                                    onChange={(e) => {
                                        const newFactors = [...cartesianFactors];
                                        newFactors[index] = e.target.value;
                                        setCartesianFactors(newFactors);
                                    }}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                                >
                                    <optgroup label="Primitives">
                                        <option value="point">Point (0D)</option>
                                        <option value="line">Line (1D)</option>
                                        <option value="triangle">Triangle (2D)</option>
                                        <option value="square">Square (2D)</option>
                                        <option value="pentagon">Pentagon (2D)</option>
                                        <option value="hexagon">Hexagon (2D)</option>
                                        <option value="octagon">Octagon (2D)</option>
                                        <option value="circle">Circle (2D)</option>
                                    </optgroup>
                                    <optgroup label="3D Shapes">
                                        <option value="tetrahedron">Tetrahedron</option>
                                        <option value="cube">Cube</option>
                                        <option value="octahedron">Octahedron</option>
                                        <option value="sphere-3">Sphere</option>
                                        <option value="cylinder">Cylinder</option>
                                        <option value="torus">Torus</option>
                                    </optgroup>
                                    <optgroup label="4D Shapes">
                                        <option value="pentachoron">5-Cell (Pentachoron)</option>
                                        <option value="tesseract">8-Cell (Tesseract)</option>
                                        <option value="16-cell">16-Cell (Hexadecachoron)</option>
                                        <option value="sphere-4">4D Sphere</option>
                                        <option value="duocylinder">Duocylinder</option>
                                        <option value="duocone">Duocone</option>
                                    </optgroup>
                                </select>
                                {cartesianFactors.length > 2 && (
                                    <button 
                                        onClick={() => {
                                            const newFactors = cartesianFactors.filter((_, i) => i !== index);
                                            setCartesianFactors(newFactors);
                                        }}
                                        className="px-2 py-1 bg-red-900/50 text-red-400 hover:bg-red-800/50 rounded border border-red-700/50"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </React.Fragment>
                    ))}
                    
                    <button 
                        onClick={() => setCartesianFactors([...cartesianFactors, 'line'])}
                        className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded text-xs font-medium transition-colors border border-slate-700"
                    >
                        + Add Factor
                    </button>
                    
                    <button 
                        onClick={() => onCartesianProduct(cartesianFactors)}
                        className="w-full mt-4 bg-sky-600 hover:bg-sky-500 text-white py-2 rounded text-sm font-bold transition-colors"
                    >
                        Generate Product
                    </button>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'build' && (
        <>
          {/* Dimension Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">View Dimension</label>
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveDim(Math.max(1, activeDim - 1))}
                  className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors flex items-center justify-center"
                >
                  -
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="number" 
                    min="1"
                    value={activeDim}
                    onChange={(e) => setActiveDim(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 bg-slate-900 border border-slate-700 text-sky-400 font-bold text-center rounded-lg focus:ring-sky-500 focus:border-sky-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold pointer-events-none">D</span>
                </div>
                <button 
                  onClick={() => setActiveDim(activeDim + 1)}
                  className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors flex items-center justify-center"
                >
                  +
                </button>
            </div>
          </div>

          {/* N-tope Maker */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
             <label className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 9a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V6h-1a1 1 0 110-2h1V3a1 1 0 011-1zm0 9a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
                 </svg>
                 N-tope Maker (3D/4D)
             </label>
             {ntopeConfig && setNtopeConfig && onCreateNtope ? (
                 <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-3">
                     <div className="space-y-1">
                         <label className="text-xs text-slate-400">Primary Base (Sides)</label>
                         <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-mono text-sky-300">{ntopeConfig.sides1} ({(['Triangle','Square','Pentagon','Hexagon','Heptagon','Octagon','Nonagon','Decagon'])[ntopeConfig.sides1-3] || 'N-gon'})</span>
                         </div>
                         <input 
                           type="range" min="3" max="12" 
                           value={ntopeConfig.sides1} 
                           onChange={(e) => setNtopeConfig({...ntopeConfig, sides1: parseInt(e.target.value)})}
                           className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                         />
                     </div>
                     
                     {(ntopeConfig.type === 'Duoprism' || ntopeConfig.type === 'Duotegnum' || ntopeConfig.type === 'Trioprism' || ntopeConfig.type === 'Triopyramid' || ntopeConfig.type === 'Triotegnum') && (
                         <div className="space-y-1 animate-fade-in">
                             <label className="text-xs text-slate-400">Secondary Base (Sides)</label>
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-mono text-sky-300">{ntopeConfig.sides2} ({(['Triangle','Square','Pentagon','Hexagon','Heptagon','Octagon','Nonagon','Decagon'])[ntopeConfig.sides2-3] || 'N-gon'})</span>
                             </div>
                             <input 
                               type="range" min="3" max="12" 
                               value={ntopeConfig.sides2} 
                               onChange={(e) => setNtopeConfig({...ntopeConfig, sides2: parseInt(e.target.value)})}
                               className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                             />
                         </div>
                     )}

                     {(ntopeConfig.type === 'Trioprism' || ntopeConfig.type === 'Triopyramid' || ntopeConfig.type === 'Triotegnum') && (
                         <div className="space-y-1 animate-fade-in">
                             <label className="text-xs text-slate-400">Tertiary Base (Sides)</label>
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-mono text-sky-300">{ntopeConfig.sides3} ({(['Triangle','Square','Pentagon','Hexagon','Heptagon','Octagon','Nonagon','Decagon'])[ntopeConfig.sides3-3] || 'N-gon'})</span>
                             </div>
                             <input 
                               type="range" min="3" max="12" 
                               value={ntopeConfig.sides3} 
                               onChange={(e) => setNtopeConfig({...ntopeConfig, sides3: parseInt(e.target.value)})}
                               className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                             />
                         </div>
                     )}

                     <div className="space-y-1">
                        <label className="text-xs text-slate-400">Construction Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Pyramid', 'Bipyramid', 'Prism', 'Antiprism', 'Pucofastegium', 'Antifastegium', 'Cupolifastegium', 'Anticupolifastegium', 'Duoprism', 'Duotegnum', 'Duoantifastegium', 'Duoprismatoantifastegium', 'Duopucofastegium', 'Dipucofastegium', 'Duocupolifastegium', 'Pucoprismatoduoprism', 'Trioprism', 'Triopyramid', 'Triotegnum'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setNtopeConfig({...ntopeConfig, type: t})}
                                    className={`text-[10px] py-1.5 px-1 rounded border transition-colors ${
                                        ntopeConfig.type === t 
                                        ? 'bg-sky-600 text-white border-sky-500' 
                                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                     </div>
                     <button 
                        onClick={onCreateNtope}
                        className="w-full py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold rounded shadow-lg transition-all"
                     >
                        Generate {ntopeConfig.type}
                     </button>
                 </div>
             ) : (
                <div className="text-xs text-slate-500 italic">Configuration unavailable</div>
             )}
          </div>

          {/* Torus Maker */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
             <label className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                 </svg>
                 Torus Maker
             </label>
             {torusConfig && setTorusConfig && onCreateTorus ? (
                 <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-3">
                     <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                             <label className="text-[10px] text-slate-400">Major Radius (R)</label>
                             <input 
                               type="number" step="0.1" min="0.1" max="5"
                               value={torusConfig.majorRadius} 
                               onChange={(e) => setTorusConfig({...torusConfig, majorRadius: parseFloat(e.target.value)})}
                               className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                             />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[10px] text-slate-400">Minor Radius (r)</label>
                             <input 
                               type="number" step="0.1" min="0.1" max="5"
                               value={torusConfig.minorRadius} 
                               onChange={(e) => setTorusConfig({...torusConfig, minorRadius: parseFloat(e.target.value)})}
                               className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                             />
                         </div>
                     </div>
                     <div className="space-y-1">
                         <label className="text-xs text-slate-400">Resolution (Ring / Tube)</label>
                         <div className="flex gap-2">
                            <input 
                               type="range" min="8" max="64" 
                               value={torusConfig.ringSegments} 
                               onChange={(e) => setTorusConfig({...torusConfig, ringSegments: parseInt(e.target.value)})}
                               className="flex-1 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                               title={`Ring: ${torusConfig.ringSegments}`}
                            />
                            <input 
                               type="range" min="4" max="32" 
                               value={torusConfig.tubeSegments} 
                               onChange={(e) => setTorusConfig({...torusConfig, tubeSegments: parseInt(e.target.value)})}
                               className="flex-1 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                               title={`Tube: ${torusConfig.tubeSegments}`}
                            />
                         </div>
                         <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                             <span>Ring: {torusConfig.ringSegments}</span>
                             <span>Tube: {torusConfig.tubeSegments}</span>
                         </div>
                     </div>
                     <button 
                        onClick={onCreateTorus}
                        className="w-full py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold rounded shadow-lg transition-all"
                     >
                        Generate Torus
                     </button>
                 </div>
             ) : (
                <div className="text-xs text-slate-500 italic">Configuration unavailable</div>
             )}
          </div>

          {/* Shape Library */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Presets</label>
            <select 
                className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg p-2.5 border border-slate-700 focus:ring-sky-500 focus:border-sky-500"
                onChange={(e) => {
                    if(e.target.value) onSelectPreset(e.target.value);
                    e.target.value = ""; // Reset
                }}
            >
                <option value="">-- Choose a Preset --</option>
                <optgroup label="Polygons (2D)">
                    <option value="triangle">Triangle</option>
                    <option value="square">Square</option>
                    <option value="pentagon">Pentagon</option>
                    <option value="hexagon">Hexagon</option>
                    <option value="octagon">Octagon</option>
                    <option value="circle">Circle</option>
                </optgroup>
                <optgroup label="Torus & Rings">
                    <option value="torus">Standard Torus</option>
                    <option value="clifford-torus">Clifford Torus (4D)</option>
                    <option value="torisphere">Torisphere (4D)</option>
                    <option value="tiger">Tiger (4D)</option>
                    <option value="3-torus">3-Torus ((||)||)</option>
                    <option value="tiger-sphere">Tiger's Sphere (5D)</option>
                    <option value="cylo-goroid">Cylo's Goroid (5D)</option>
                    <option value="cylointigoroid">Cylointigoroid (5D)</option>
                    <option value="herures-shape">Herure's Shape (3212) (8D)</option>
                    <option value="novairus">Novairus (212112) (9D)</option>
                    <option value="nemas-torisphere">Nema's Torisphere (1242) (9D)</option>
                </optgroup>
                <optgroup label="Biological Hedrons">
                    <option value="agapornis">Agapornis (Lovebird)</option>
                    <option value="anomalocaris">Anomalocaris</option>
                    <option value="homo-sapiens">Homo Sapiens</option>
                </optgroup>
                <optgroup label="Spheres (Hyperspheres)">
                    <option value="sphere-3">3D Sphere</option>
                    <option value="sphere-4">4D Glome</option>
                    <option value="sphere-5">5D Hypersphere</option>
                    <option value="sphere-6">6D Hypersphere</option>
                    <option value="sphere-7">7D Hypersphere</option>
                    <option value="sphere-8">8D Hypersphere</option>
                    <option value="sphere-9">9D Hypersphere</option>
                    <option value="sphere-10">10D Hypersphere</option>
                    <option value="sphere-11">11D Hypersphere</option>
                    <option value="sphere-12">12D Hypersphere</option>
                    <option value="sphere-13">13D Hypersphere</option>
                    <option value="sphere-14">14D Hypersphere</option>
                    <option value="sphere-15">15D Hypersphere</option>
                </optgroup>
                <optgroup label="Platonic Solids (3D)">
                    <option value="tetrahedron">Tetrahedron</option>
                    <option value="cube">Cube</option>
                    <option value="octahedron">Octahedron</option>
                    <option value="dodecahedron">Dodecahedron</option>
                    <option value="icosahedron">Icosahedron</option>
                    <option value="ursahedron">Ursahedron (Tridiminished Icosahedron)</option>
                </optgroup>
                <optgroup label="3D Non-Platonic">
                    <option value="truncated-octahedron">Truncated Octahedron</option>
                    <option value="snub-cube">Snub Cube (Corrected)</option>
                    <option value="disdyakis">Disdyakis Triacontahedron</option>
                    <option value="enneacontahedron">Enneacontahedron</option>
                    <option value="prism-3">Triangular Prism</option>
                    <option value="prism-5">Pentagonal Prism</option>
                    <option value="pucofastegium">Pucofastegium (5-gonal)</option>
                    <option value="antifastegium">Antifastegium (5-gonal)</option>
                    <option value="cupolifastegium">Cupolifastegium (5-gonal)</option>
                    <option value="anticupolifastegium">Anticupolifastegium (5-gonal)</option>

                    <option value="prism-6">Hexagonal Prism</option>
                    <option value="pyramid-4">Square Pyramid</option>
                    <option value="pyramid-5">Pentagonal Pyramid</option>
                    <option value="antiprism-4">Square Antiprism</option>
                    <option value="antiprism-6">Hexagonal Antiprism</option>
                    <option value="cylinder">Cylinder</option>
                    <option value="cone">Cone</option>
                </optgroup>
                <optgroup label="4D Chorons">
                    <option value="pentachoron">Pentachoron</option>
                    <option value="tesseract">Tesseract</option>
                    <option value="16-cell">16-Cell</option>
                    <option value="24-cell">24-Cell</option>
                    <option value="120-cell">120-Cell</option>
                    <option value="600-cell">600-Cell</option>
                    <option value="720-cell">720-Cell (Rectified 600-Cell)</option>
                    <option value="ghit">Grand hecatonicosintercepted trishecatonicosachoron</option>
                    <option value="sdh">Small disprismatohexacosihecatonicosachoron (Runcinated 120-cell)</option>
                    <option value="96dsdh">96-diminished small disprismatohexacosihecatonicosachoron</option>
                </optgroup>
                <optgroup label="CRF Polychora">
                    <option value="cubical-pyramid">Cubical Pyramid (K4.26)</option>
                    <option value="pentagonal-prism-pyramid">Pentagonal Prism Pyramid (K4.141)</option>
                    <option value="runcinated-snub-24-cell">Runcinated Snub 24-Cell</option>
                    <option value="tetrahedral-pyramid">Tetrahedral Pyramid (5-Cell)</option>
                    <option value="octahedral-pyramid">Octahedral Pyramid</option>
                    <option value="icosahedral-pyramid">Icosahedral Pyramid</option>
                    <option value="dodecahedral-pyramid">Dodecahedral Pyramid</option>
                    <option value="truncated-tetrahedral-pyramid">Truncated Tetrahedral Pyramid</option>
                    <option value="truncated-cube-pyramid">Truncated Cube Pyramid</option>
                    <option value="truncated-octahedron-pyramid">Truncated Octahedron Pyramid</option>
                    <option value="truncated-dodecahedron-pyramid">Truncated Dodecahedron Pyramid</option>
                    <option value="truncated-icosahedron-pyramid">Truncated Icosahedron Pyramid</option>
                    <option value="cuboctahedron-pyramid">Cuboctahedron Pyramid</option>
                    <option value="icosidodecahedron-pyramid">Icosidodecahedron Pyramid</option>
                    <option value="rhombicuboctahedron-pyramid">Rhombicuboctahedron Pyramid</option>
                    <option value="rhombicosidodecahedron-pyramid">Rhombicosidodecahedron Pyramid</option>
                    <option value="snub-cube-pyramid">Snub Cube Pyramid</option>
                    <option value="snub-dodecahedron-pyramid">Snub Dodecahedron Pyramid</option>
                    <option value="cube-atop-icosahedron">Cube atop Icosahedron (K4.21)</option>
                    <option value="cube-atop-cuboctahedron">Cube atop Cuboctahedron (K4.35)</option>
                    <option value="octahedron-atop-rhombicuboctahedron">Octahedron atop Rhombicuboctahedron (K4.107)</option>
                    <option value="cuboctahedron-atop-truncated-cube">Cuboctahedron atop Truncated Cube (K4.129)</option>
                    <option value="cube-antiprism">Cube antiprism (K4.15)</option>
                    <option value="truncated-tetrahedral-cupoliprism">Truncated tetrahedral cupoliprism (K4.55)</option>
                    <option value="tetrahedral-canticupola">Tetrahedral canticupola (K4.76)</option>
                    <option value="square-magnabicupolic-ring">Square magnabicupolic ring (K4.105)</option>
                    <option value="bilunabirotunda-pseudopyramid">Bilunabirotunda pseudopyramid</option>
                    <option value="tetrahedral-ursachoron">Tetrahedral ursachoron</option>
                    <option value="octahedral-ursachoron">Octahedral ursachoron</option>
                    <option value="icosahedral-ursachoron">Icosahedral ursachoron</option>
                    <option value="deca-augmented-5-10-duoprism">Deca-augmented 5,10-duoprism</option>
                    <option value="deca-augmented-5-20-duoprism">Deca-augmented 5,20-duoprism</option>
                    <option value="augmented-cantitruncated-5-cell">Augmented cantitruncated 5-cell</option>
                    <option value="octa-augmented-runcinated-tesseract">Octa-augmented runcinated tesseract</option>
                    <option value="octa-augmented-truncated-tesseract">Octa-augmented truncated tesseract</option>
                    <option value="octa-augmented-runcitruncated-16-cell">Octa-augmented runcitruncated 16-cell</option>
                    <option value="biparabigyrated-cantellated-tesseract">Biparabigyrated cantellated tesseract</option>
                    <option value="bi-icosi96-diminished-600-cell">Bi-icosi96-diminished 600-cell</option>
                    <option value="swirlprismatodiminished-rectified-600-cell">Swirlprismatodiminished rectified 600-cell</option>
                    <option value="castellated-rhombicosidodecahedral-prism">Castellated rhombicosidodecahedral prism</option>
                    <option value="triangular-hebesphenorotundaeic-rhombochoron">Triangular hebesphenorotundaeic rhombochoron</option>
                    <option value="pentagonorhombic-trisnub-trisoctachoron">Pentagonorhombic trisnub trisoctachoron (D4.11)</option>
                    <option value="duoprism-5-10">5,10-Duoprism (Base for Deca-augmented)</option>
                    <option value="duoprism-5-20">5,20-Duoprism (Base for Deca-augmented)</option>
                </optgroup>
                <optgroup label="4D Non-Platonic">
                    <option value="enneacontachoron">Enneacontachoron</option>
                    <option value="omni-tesseract">Omnitruncated Tesseract</option>
                    <option value="cubinder">Cubinder</option>
                    <option value="spherinder">Spherinder</option>
                    <option value="duocylinder">Duocylinder</option>
                    <option value="duocone">Duocone</option>
                    <option value="spherocone">Spherocone</option>
                    <option value="toricone">Toricone</option>
                    <option value="octa-prism">Octahedral Prism</option>
                    <option value="octa-pyramid">Octahedral Pyramid</option>
                    <option value="gippic">Gippic (Great Prismato...)</option>
                </optgroup>
                <optgroup label="5D-7D Shapes">
                    <option value="pentachoric-trischiliaoctacositetracontateron">Pentachoric Trischiliaoctacositetracontateron (5D)</option>
                    <option value="penteract">Penteract (5D)</option>
                    <option value="demipenteract">Demipenteract (5D)</option>
                    <option value="dodecateron">Dodecateron (Rectified Hexateron)</option>
                    <option value="1200-teron">1200-Cell (1200 Tera)</option>
                    <option value="hydroteron">Hydroteron</option>
                    <option value="hexeract">Hexeract (6D)</option>
                    <option value="hepteract">Hepteract (7D)</option>
                    <option value="2_21-polytope">2_21 Polytope (6D)</option>
                    <option value="trioprism">Trioprism (6D)</option>
                    <option value="triopyramid">Triopyramid (6D)</option>
                    <option value="triotegum">Triotegum (6D)</option>
                    <option value="triocylinder">Triocylinder (6D)</option>
                    <option value="triocone">Triocone (6D)</option>
                    <option value="duotegum">Duotegum (4D)</option>
                </optgroup>
                <optgroup label="8D-12D Shapes">
                    <option value="octeract">Octeract (8D Cube)</option>
                    <option value="8-simplex">8-Simplex</option>
                    <option value="8-orthoplex">8-Orthoplex</option>
                    <option value="e8-polytope">E8 Polytope (Gosset 4_21)</option>
                    <option value="demi-octeract">Demi-Octeract (8D)</option>
                    <option value="enneact">Enneact (9D Cube)</option>
                    <option value="9-simplex">9-Simplex</option>
                    <option value="1600-yotta">1600-Yotta (9-Demicube)</option>
                    <option value="deceract">Deceract (10D Cube)</option>
                    <option value="10-simplex">10-Simplex</option>
                    <option value="10-orthoplex">10-Orthoplex</option>
                    <option value="hendeceract">Hendeceract (11D Cube)</option>
                    <option value="11-simplex">11-Simplex</option>
                    <option value="11-orthoplex">11-Orthoplex</option>
                    <option value="dodeceract">Dodeceract (12D Cube)</option>
                    <option value="12-simplex">12-Simplex</option>
                    <option value="12-orthoplex">12-Orthoplex</option>
                </optgroup>
                <optgroup label="13D-15D Shapes">
                    <option value="13-cube">13-Cube (N)</option>
                    <option value="13-simplex">13-Simplex (N)</option>
                    <option value="13-orthoplex">13-Orthoplex (N)</option>
                    <option value="14-cube">14-Cube (M)</option>
                    <option value="14-simplex">14-Simplex (M)</option>
                    <option value="14-orthoplex">14-Orthoplex (M)</option>
                    <option value="15-cube">15-Cube (L)</option>
                    <option value="15-simplex">15-Simplex (L)</option>
                    <option value="15-orthoplex">15-Orthoplex (L)</option>
                </optgroup>
            </select>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Import File</label>
            <div>
              <label 
                  htmlFor="off-upload" 
                  className="w-full inline-block text-center cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold py-2 rounded-lg border border-slate-700 transition-colors"
               >
                 Upload .OFF File
              </label>
              <input 
                  id="off-upload" 
                  type="file" 
                  accept=".off" 
                  className="hidden" 
                  onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                          if (ev.target?.result && onLoadOFF) {
                              onLoadOFF(ev.target.result as string);
                          }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                  }} 
              />
            </div>
          </div>

          {/* Manual Actions */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manual Construction</label>
            <div className="flex flex-col gap-2">
                
               {shape.dimension === 0 && setExtrusionSegments && (
                   <div className="flex flex-col gap-1 mb-1 animate-fade-in p-2 bg-slate-800/50 rounded border border-slate-700">
                       <div className="flex justify-between items-center">
                           <span className="text-xs text-slate-400">Segments / Vertices:</span>
                           <span className="text-xs font-mono text-sky-400">{extrusionSegments}</span>
                       </div>
                       <input 
                          type="range" 
                          min="1" 
                          max="50" 
                          value={extrusionSegments}
                          onChange={(e) => setExtrusionSegments(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                       />
                       <div className="text-[10px] text-slate-500 text-right italic">
                           {extrusionSegments && extrusionSegments > 2 ? 'Creates Polygon (2D)' : 'Creates Line (1D)'}
                       </div>
                   </div>
               )}

               <button
                onClick={onExtrude}
                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Extrude (+1 Dim)
              </button>
              
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coxeter-Dynkin Rings</label>
                <div className="flex flex-wrap gap-2">
                    {Array.from({length: shape.dimension}, (_, i) => i + 1).map(ring => {
                        const isActive = activeRings.includes(ring);
                        return (
                            <button 
                                key={ring}
                                onClick={() => handleRingToggle(ring)}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${isActive ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400'}`}
                            >
                                {ring}
                            </button>
                        );
                    })}
                </div>
                <button 
                    onClick={applyWythoff}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors mt-2"
                >
                    Apply Wythoffian Operation
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Other Operations</label>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={onStellate} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors">Stellate</button>
                    <button onClick={onSnub} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors">Snub</button>
                    <button onClick={onDual} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors">Dual</button>
                    <button onClick={onPyramidize} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors">Pyramidize (+1 Dim)</button>
                    <button onClick={onBipyramidize} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors">Bipyramidize (+1 Dim)</button>
                    <button onClick={onUrsaize} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors">Ursaize (+1 Dim)</button>
                    <button onClick={onAntiprismize} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors">Antiprismize (+1 Dim)</button>
                    <button onClick={onCupolize} className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-700 transition-colors">Cupolize (+1 Dim)</button>
                </div>
              </div>
              
              <button
                onClick={onReset}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm transition-colors mt-2"
              >
                Clear Canvas
              </button>

              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center gap-3 p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-750 border border-slate-700">
                    <input 
                    type="checkbox" 
                    checked={autoRotate}
                    onChange={(e) => setAutoRotate(e.target.checked)}
                    className="w-5 h-5 text-indigo-500 rounded focus:ring-indigo-500 bg-slate-900 border-slate-600"
                    />
                    <span className="text-sm font-medium text-slate-300">Auto Rotate</span>
                </label>
                
                <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    <button 
                        onClick={() => handleManualZoom(-0.5)}
                        className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border-r border-slate-700"
                        title="Zoom Out"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <div className="px-2 flex flex-col items-center justify-center min-w-[50px]">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Zoom</span>
                        <span className="text-xs font-mono text-sky-400">{zoom.toFixed(2)}x</span>
                    </div>
                    <button 
                        onClick={() => handleManualZoom(0.5)}
                        className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border-l border-slate-700"
                        title="Zoom In"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'spin' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-sky-500/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Spin Shape</h3>
                <p className="text-[10px] text-slate-400">Revolve the current shape to create a toratope (+1D).</p>
              </div>
            </div>

            {spinConfig && setSpinConfig && onSpinShape ? (
              <div className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">Target Dimension</label>
                    <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSpinConfig({...spinConfig, targetDim: Math.max(shape.dimension + 1, spinConfig.targetDim - 1)})}
                          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded font-bold transition-colors flex items-center justify-center"
                        >
                          -
                        </button>
                        <div className="flex-1 relative">
                          <input 
                            type="number" 
                            min={Math.max(1, shape.dimension + 1)}
                            value={Math.max(spinConfig.targetDim, shape.dimension + 1)} 
                            onChange={(e) => setSpinConfig({...spinConfig, targetDim: Math.max(shape.dimension + 1, parseInt(e.target.value) || shape.dimension + 1)})}
                            className="w-full h-8 bg-slate-900 border border-slate-700 text-sky-400 font-bold text-center rounded focus:ring-sky-500 focus:border-sky-500"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold pointer-events-none text-xs">D</span>
                        </div>
                        <button 
                          onClick={() => setSpinConfig({...spinConfig, targetDim: Math.max(spinConfig.targetDim, shape.dimension + 1) + 1})}
                          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded font-bold transition-colors flex items-center justify-center"
                        >
                          +
                        </button>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-slate-400">Major Radius (Displacement)</label>
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-xs font-mono text-sky-300">{spinConfig.majorRadius.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="5" step="0.1"
                      value={spinConfig.majorRadius} 
                      onChange={(e) => setSpinConfig({...spinConfig, majorRadius: parseFloat(e.target.value)})}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">Number of Tubes (Segments)</label>
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-xs font-mono text-sky-300">{spinConfig.segments}</span>
                    </div>
                    <input 
                      type="range" min="4" max="32" step="2"
                      value={spinConfig.segments} 
                      onChange={(e) => setSpinConfig({...spinConfig, segments: parseInt(e.target.value)})}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                </div>

                <button 
                   onClick={onSpinShape}
                   className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-xs font-bold rounded shadow-lg transition-all"
                >
                   Apply Spin
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">Configuration unavailable</div>
            )}
          </div>

          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Random Options</h3>
                <p className="text-[10px] text-slate-400">Randomize shapes and spins.</p>
              </div>
            </div>
            
            <div className="space-y-2">
                <button 
                   onClick={onRandomShape}
                   className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors"
                >
                   Random Shape
                </button>
                <button 
                   onClick={onRandomSpin}
                   className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors"
                >
                   Random Spin
                </button>
                <button 
                   onClick={() => setHacka67Mode?.(!hacka67Mode)}
                   className={`w-full py-2 text-xs font-bold rounded transition-colors ${hacka67Mode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                   Hacka 67 Mode: {hacka67Mode ? 'ON' : 'OFF'}
                </button>
                <button 
                   onClick={() => setMay2ndMode?.(!may2ndMode)}
                   className={`w-full py-2 text-xs font-bold rounded transition-colors ${may2ndMode ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                   May 2nd Mode: {may2ndMode ? 'ON' : 'OFF'}
                </button>
                <button 
                   onClick={() => setShowToratopeExplorer?.(!showToratopeExplorer)}
                   className={`w-full py-2 text-xs font-bold rounded transition-colors ${showToratopeExplorer ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                >
                   Toratope Explorer: {showToratopeExplorer ? 'ON' : 'OFF'}
                </button>
                <button 
                   onClick={onExportOFF}
                   className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors flex items-center justify-center"
                >
                   <Download className="w-3 h-3 mr-2" />
                   Export as .OFF
                </button>
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.759-1.576 5.5 5.5 0 013.86 1.848C17.391 10.373 18 11.134 18 12.5A3.5 3.5 0 0114.5 16h-9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Gyrochoron Maker</h3>
                <p className="text-[10px] text-slate-400">Generate (p,q)-gyrochorons.</p>
              </div>
            </div>
            
            {gyroConfig && setGyroConfig && onCreateGyrochoron ? (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Type</label>
                        <select
                          value={gyroConfig.type}
                          onChange={(e) => setGyroConfig({...gyroConfig, type: e.target.value})}
                          className="w-full h-8 bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-sm rounded focus:ring-emerald-500 focus:border-emerald-500 px-2"
                        >
                            <option value="gyrochoron">Gyrochoron</option>
                            <option value="bigyrochoron">Bigyrochoron</option>
                            <option value="antibigyrochoron">Antibigyrochoron</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">P (1-100)</label>
                            <input
                              type="number" min="1" max="100"
                              value={gyroConfig.p}
                              onChange={(e) => setGyroConfig({...gyroConfig, p: parseInt(e.target.value) || 1})}
                              className="w-full h-8 bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-center rounded focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Q (1-100)</label>
                            <input
                              type="number" min="1" max="100"
                              value={gyroConfig.q}
                              onChange={(e) => setGyroConfig({...gyroConfig, q: parseInt(e.target.value) || 1})}
                              className="w-full h-8 bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-center rounded focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    </div>
                    
                    <button 
                       onClick={onCreateGyrochoron}
                       className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded shadow-lg transition-all"
                    >
                       Create {gyroConfig.type.charAt(0).toUpperCase() + gyroConfig.type.slice(1)}
                    </button>
                </div>
            ) : (
                <div className="text-xs text-slate-500 italic">Configuration unavailable</div>
            )}
          </div>

          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a8 8 0 100 16 8 8 0 000-16z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Gyropeton Maker</h3>
                <p className="text-[10px] text-slate-400">Generate (p,q,r)-gyropetons (5D).</p>
              </div>
            </div>
            
            {gyropetonConfig && setGyropetonConfig && onCreateGyropeton ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">P</label>
                            <input
                              type="number" min="1" max="100"
                              value={gyropetonConfig.p}
                              onChange={(e) => setGyropetonConfig({...gyropetonConfig, p: parseInt(e.target.value) || 1})}
                              className="w-full h-8 bg-slate-900 border border-slate-700 text-yellow-400 font-bold text-center rounded focus:ring-yellow-500 focus:border-yellow-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Q</label>
                            <input
                              type="number" min="1" max="100"
                              value={gyropetonConfig.q}
                              onChange={(e) => setGyropetonConfig({...gyropetonConfig, q: parseInt(e.target.value) || 1})}
                              className="w-full h-8 bg-slate-900 border border-slate-700 text-yellow-400 font-bold text-center rounded focus:ring-yellow-500 focus:border-yellow-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">R</label>
                            <input
                              type="number" min="1" max="100"
                              value={gyropetonConfig.r}
                              onChange={(e) => setGyropetonConfig({...gyropetonConfig, r: parseInt(e.target.value) || 1})}
                              className="w-full h-8 bg-slate-900 border border-slate-700 text-yellow-400 font-bold text-center rounded focus:ring-yellow-500 focus:border-yellow-500"
                            />
                        </div>
                    </div>
                    
                    <button 
                       onClick={onCreateGyropeton}
                       className="w-full py-2.5 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white text-xs font-bold rounded shadow-lg transition-all"
                    >
                       Create Gyropeton
                    </button>
                </div>
            ) : (
                <div className="text-xs text-slate-500 italic">Configuration unavailable</div>
            )}
          </div>

          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Special 600-Cell Cuts</h3>
                <p className="text-[10px] text-slate-400">Search 314,248,344 possible cuts.</p>
              </div>
            </div>
            
            {specialCutConfig && setSpecialCutConfig && onCreateSpecialCut ? (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="space-y-1 flex-1">
                            <label className="text-xs text-slate-400">Cut Index</label>
                            <input
                              type="number" min="1" max="314248344"
                              value={specialCutConfig.index}
                              onChange={(e) => setSpecialCutConfig({...specialCutConfig, index: parseInt(e.target.value) || 1})}
                              className="w-full h-8 bg-slate-900 border border-slate-700 text-pink-400 font-bold text-center rounded focus:ring-pink-500 focus:border-pink-500"
                            />
                        </div>
                        <div className="flex items-end">
                            <button 
                               onClick={() => setSpecialCutConfig({...specialCutConfig, index: Math.floor(Math.random() * 314248344) + 1})}
                               className="h-8 px-3 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded transition-colors"
                            >
                               Random
                            </button>
                        </div>
                    </div>
                    
                    <button 
                       onClick={onCreateSpecialCut}
                       className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold rounded shadow-lg transition-all"
                    >
                       Generate Cut
                    </button>
                </div>
            ) : (
                <div className="text-xs text-slate-500 italic">Configuration unavailable</div>
            )}
          </div>
        </div>
      )}

      {/* Stats Panel */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Geometry Stats</label>
         <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 space-y-0">
            <StatRow label="Dim" value={shape.dimension} />
            <StatRow label="Vertices" value={shape.stats?.vertices || shape.vertices?.length} />
            <StatRow label="Edges" value={(shape.stats?.edges || shape.edges?.length) ?? 0} />
            <StatRow label="Faces" value={shape.stats?.faces} />
            <StatRow label="Cells" value={shape.stats?.cells} />
            <StatRow label="Tera (4D)" value={shape.stats?.tera} />
            <StatRow label="Peta (5D)" value={shape.stats?.peta} />
            <StatRow label="Exa (6D)" value={shape.stats?.exa} />
            <StatRow label="Theta (7D)" value={shape.stats?.theta} />
            <StatRow label="Yotta (8D)" value={shape.stats?.yotta} />
            <StatRow label="Ronna (9D)" value={shape.stats?.ronna} />
            <StatRow label="Quetta (10D)" value={shape.stats?.quetta} />
            <StatRow label="Double (11D)" value={shape.stats?.double} />
            <StatRow label="Triple (12D)" value={shape.stats?.triple} />
            <StatRow label="Quadruple (13D)" value={shape.stats?.quadruple} />
            <StatRow label="Quintuple (14D)" value={shape.stats?.quintuple} />
            <StatRow label="Sextuple (15D)" value={shape.stats?.sextuple} />
            <StatRow label="Septuple (16D)" value={shape.stats?.septuple} />
            <StatRow label="Octuple (17D)" value={shape.stats?.octuple} />
            <StatRow label="Nonuple (18D)" value={shape.stats?.nonuple} />
            <StatRow label="Decuple (19D)" value={shape.stats?.decuple} />
            <StatRow label="Vertex Figure" value={shape.stats?.vertexFigure} />
         </div>
         {shape.description && (
            <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Description</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{shape.description}</p>
            </div>
         )}
      </div>

      {/* Rotations */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
               Rotation Control ({planes.length} axes)
          </label>
          <button 
            onClick={() => setRotations({})}
            className="text-[10px] text-slate-500 hover:text-sky-400 transition-colors"
          >
            Reset All
          </button>
        </div>
        <div className="space-y-6 pr-3 pb-20">
          {planes.map(plane => (
            <div key={plane} className="space-y-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-700/50 shadow-xl">
              <div className="flex justify-between items-center">
                <span className="font-mono font-black text-lg text-sky-400">{plane}</span>
                <span className="text-slate-200 font-mono font-black text-sm bg-slate-800 px-2 py-1 rounded border border-slate-700">{((rotations[plane] || 0) / Math.PI * 180).toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.PI * 2}
                step="0.01"
                value={rotations[plane] || 0}
                onChange={(e) => handleRotationChange(plane, parseFloat(e.target.value))}
                className="w-full h-6 bg-slate-800 rounded-full appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all shadow-inner"
              />
            </div>
          ))}
          {planes.length === 0 && (
            <div className="text-sm text-slate-600 italic py-4 text-center">No rotation in 1D</div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default Controls;