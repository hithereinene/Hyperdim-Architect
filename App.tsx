import React, { useState, useEffect, useCallback } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';
import { Shape, RotationState, Vertex, Edge } from './types';
import { 
    extrudeShape, 
    generateHypercube, 
    generateSimplex, 
    generateOrthoplex,
    generatePolygon, 
    generateCylinder, 
    generatePolygonalPyramid,
    generatePrism,
    generateAntiprism,
    generateBipyramid,
    generateOctahedron,
    generateDodecahedron,
    generateIcosahedron,
    generate16Cell,
    generate24Cell,
    generateHypersphere,
    generateSegmentedLine,
    generateGippic,
    generate600Cell,
    generate120Cell,
    generateOmniTesseract,
    generateSnubCube,
    generateAgapornis,
    generateAnomalocaris,
    generateHomoSapiens,
    generateE8Polytope,
    generateDemiOcteract,
    generate1600Yotta,
    generateEnneacontachoron,
    generateDisdyakisTriacontahedron,
    generateEnneacontahedron,
    generateDuocylinder,
    generateDuocone,
    generateSpherinder,
    generateOctahedralPrism,
    generateOctahedralPyramid,
    generateDeceract,
    generate10Simplex,
    generate10Orthoplex,
    generateHendeceract,
    generate11Simplex,
    generate11Orthoplex,
    generate1200Teron,
    generateDemipenteract,
    generateDodecateron,
    generate720Cell,
    generateTorus,
    generateCliffordTorus,
    generateDuoprism,
    generateDuopyramid,
    generateTorisphere,
    generateTiger,
    generate3Torus,
    generateTigerSphere,
    generateCyloGoroid,
    generateCylointigoroid,
    generateNumericToratope,
    generateCone,
    generateSpherocone,
    generateToricone,
    spinShape,
    truncateShape,
    rectifyShape,
    omnitruncateShape,
    stellateShape,
    snubShape,
    generateGrandHecatonicosinterceptedTrishecatonicosachoron,
    generatePentachoricTrischiliaoctacositetracontateron,
    pyramidizeShape,
    dualShape,
    getAxisName,
    generateCartesianProduct,
    generateOFFContent
} from './services/mathUtils';
import { generateShapeWithGemini, explainDimension } from './services/geminiService';

// Initial Shape: A single point (0D)
const INITIAL_SHAPE: Shape = {
  id: 'point',
  name: 'Point',
  dimension: 0,
  vertices: [{ coords: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }], // Center
  edges: [],
  stats: { vertices: 1, edges: 0 }
};

const PRESETS = [
    'point', 'line', 'triangle', 'square', 'pentagon', 'hexagon', 'octagon', 'circle',
    'torus', 'clifford-torus', 'torisphere', 'tiger', '3-torus',
    'tiger-sphere', 'cylo-goroid', 'cylointigoroid',
    'herures-shape', 'novairus', 'nemas-torisphere',
    'agapornis', 'anomalocaris', 'homo-sapiens',
    'sphere-3', 'sphere-4', 'sphere-5', 'sphere-6', 'sphere-7', 'sphere-8', 'sphere-9', 'sphere-10', 'sphere-11',
    'tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron',
    'truncated-octahedron', 'snub-cube', 'disdyakis', 'enneacontahedron', 'cylinder', 'cone',
    'pyramid-4', 'pyramid-5', 'prism-3', 'prism-5', 'prism-6', 'antiprism-4', 'antiprism-6',
    'pentachoron', 'tesseract', '16-cell', '24-cell', 'cubinder', 'spherinder', 'duocylinder',
    'spherocone', 'toricone', 'octa-prism', 'octa-pyramid', 'gippic', '600-cell', '120-cell',
    'ghit', '720-cell', 'omni-tesseract', 'enneacontachoron',
    'pentachoric-trischiliaoctacositetracontateron',
    'penteract', 'demipenteract', 'dodecateron', '1200-teron', 'hexeract', 'hepteract',
    'octeract', '8-simplex', '8-orthoplex', 'e8-polytope', 'demi-octeract',
    'enneact', '9-simplex', '1600-yotta',
    'deceract', '10-simplex', '10-orthoplex',
    'hendeceract', '11-simplex', '11-orthoplex'
];

const App: React.FC = () => {
  const [activeDim, setActiveDim] = useState<number>(3);
  const [zoom, setZoom] = useState<number>(1);
  const [extrusionSegments, setExtrusionSegments] = useState<number>(3); // Default to Triangle
  
  // N-tope Maker State (formerly Hedron Maker)
  const [ntopeConfig, setNtopeConfig] = useState<{sides1: number, sides2: number, type: string}>({
      sides1: 5,
      sides2: 5,
      type: 'Pyramid'
  });

  // Torus Maker State
  const [torusConfig, setTorusConfig] = useState<{majorRadius: number, minorRadius: number, ringSegments: number, tubeSegments: number}>({
      majorRadius: 1,
      minorRadius: 0.4,
      ringSegments: 32,
      tubeSegments: 16
  });

  // Spin State
  const [spinConfig, setSpinConfig] = useState({ majorRadius: 1.5, segments: 16, targetDim: 4 });
  
  // Start with a Cube (3D)
  const [shape, setShape] = useState<Shape>(() => generateHypercube(3));
  
  const [rotations, setRotations] = useState<RotationState>({
    'AC': 0.5, // XZ
    'BC': 0.5, // YZ
    'AD': 0.2, // XW
    'BD': 0,   // YW
    'AF': 0    // XU
  });
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // AI State
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  
  // Determine easter egg probability once per page load
  const [isAprilFools] = useState<boolean>(() => Math.random() < 0.5);
  
  // Hacka 67 Mode
  const [hacka67Mode, setHacka67Mode] = useState<boolean>(false);
  const [may2ndMode, setMay2ndMode] = useState<boolean>(false);
  const [showToratopeExplorer, setShowToratopeExplorer] = useState<boolean>(false);
  
  const [easterEggActive, setEasterEggActive] = useState<boolean>(false);

  const [easterEggUrl, setEasterEggUrl] = useState<string>('https://www.youtube.com/watch?v=GvCKHZDicyE');

  const triggerEasterEgg = (isInitialLoad = false, url = 'https://www.youtube.com/watch?v=GvCKHZDicyE') => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isPC = !isMobile;

    if (isPC) {
        window.location.href = url;
        return;
    }

    if (isInitialLoad) {
        setEasterEggUrl(url);
        setEasterEggActive(true);
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
  };

  // Update shape when user requests extrusion
  const handleExtrude = useCallback(() => {
    if (activeDim >= 11) return;
    
    // Extrude FROM the current shape's actual dimension INTO the new dimension index
    const nextDimIndex = shape.dimension; 
    if (nextDimIndex >= 11) return;

    let newShapeData: { vertices: Vertex[], edges: Edge[], name?: string, dimension?: number } | null = null;

    // Special case for 0D -> Polygon (if segments > 2) or Line (if segments <= 2)
    if (shape.dimension === 0) {
        if (extrusionSegments > 2) {
            // Generate closed polygon (2D)
            const poly = generatePolygon(extrusionSegments);
            newShapeData = { 
                ...poly, 
                dimension: 2 // Polygons are 2D
            };
        } else {
            // Generate straight line (1D)
            const line = generateSegmentedLine(extrusionSegments);
            newShapeData = { 
                ...line, 
                dimension: 1 
            };
        }
    } else {
        // Standard extrusion for 1D+
        newShapeData = extrudeShape(shape.vertices, shape.edges, nextDimIndex);
        // Standard extrusion always increases dimension by 1
        newShapeData.dimension = nextDimIndex + 1;
    }
    
    if (newShapeData) {
        const finalDimension = newShapeData.dimension !== undefined ? newShapeData.dimension : (nextDimIndex + 1);
        
        setShape({
          id: `extruded-${Date.now()}`,
          name: newShapeData.name || `Extruded ${shape.name}`,
          vertices: newShapeData.vertices,
          edges: newShapeData.edges,
          dimension: finalDimension,
          stats: {
              vertices: newShapeData.vertices.length,
              edges: newShapeData.edges.length,
          }
        });
        
        // Auto-switch view to the new dimension so they can see it
        setActiveDim(Math.min(11, finalDimension));
    }

  }, [shape, activeDim, extrusionSegments]);

  const handleReset = () => {
    setShape(INITIAL_SHAPE);
    setActiveDim(1);
    setRotations({});
    setZoom(1);
    setExtrusionSegments(3);
    setAiResponse("Reset to a single point (0D). Start extruding!");
  };

  const handleCreateNtope = () => {
      const { sides1, sides2, type } = ntopeConfig;
      let newShape: Shape | null = null;
      let targetDim = 3;

      switch(type) {
          case 'Pyramid':
              newShape = generatePolygonalPyramid(sides1);
              targetDim = 3;
              break;
          case 'Bipyramid':
              newShape = generateBipyramid(sides1);
              targetDim = 3;
              break;
          case 'Prism':
              newShape = generatePrism(sides1);
              targetDim = 3;
              break;
          case 'Antiprism':
              newShape = generateAntiprism(sides1);
              targetDim = 3;
              break;
          case 'Duoprism':
              newShape = generateDuoprism(sides1, sides2);
              targetDim = 4;
              break;
          case 'Duopyramid':
              newShape = generateDuopyramid(sides1, sides2);
              targetDim = 4;
              break;
          default:
              newShape = generatePolygonalPyramid(sides1);
      }

      if (newShape) {
          setShape(newShape);
          setActiveDim(targetDim);
          setAiResponse(`Generated a ${newShape.name}.`);
      }
  };

  const handleCreateTorus = () => {
      const { majorRadius, minorRadius, ringSegments, tubeSegments } = torusConfig;
      const newShape = generateTorus(majorRadius, minorRadius, ringSegments, tubeSegments);
      setShape(newShape);
      setActiveDim(3);
      setAiResponse(`Generated a Torus (R=${majorRadius}, r=${minorRadius}).`);
  };

  const handleSpinShape = () => {
      const targetDim = Math.max(spinConfig.targetDim, shape.dimension + 1);
      
      const axis1 = 0;
      const axis2 = targetDim - 1;
      
      const newShape = spinShape(shape, spinConfig.majorRadius, spinConfig.segments, axis1, axis2);
      setShape(newShape);
      setActiveDim(newShape.dimension);
      setAiResponse(`Spun ${shape.name} into a ${newShape.dimension}D toratope.`);
  };

  const handleTruncate = () => {
      let appliedAprilFools = false;
      if (shape.name.toLowerCase() === 'octahedron') {
          appliedAprilFools = isAprilFools;
          const chance = appliedAprilFools ? 1/8 : 1/16;
          if (Math.random() < chance) {
              triggerEasterEgg(false, 'https://www.youtube.com/watch?v=GvCKHZDicyE');
              return;
          }
      }
      const newShape = truncateShape(shape);
      if (appliedAprilFools) {
          newShape.name = 'April Fools Octahedron';
      }
      setShape(newShape);
      setAiResponse(`Truncated ${shape.name}.`);
  };

  const handleRectify = () => {
      const newShape = rectifyShape(shape);
      setShape(newShape);
      setAiResponse(`Rectified ${shape.name}.`);
  };

  const handleOmnitruncate = () => {
      const newShape = omnitruncateShape(shape);
      setShape(newShape);
      setAiResponse(`Omnitruncated ${shape.name}.`);
  };

  const handleStellate = () => {
      const newShape = stellateShape(shape);
      setShape(newShape);
      setAiResponse(`Stellated ${shape.name}.`);
  };

  const handleSnub = () => {
      const newShape = snubShape(shape);
      setShape(newShape);
      setAiResponse(`Snubbed ${shape.name}.`);
  };

  const handlePyramidize = () => {
      if (shape.dimension >= 10) {
          setAiResponse("Cannot pyramidize beyond 10 dimensions.");
          return;
      }
      const newShape = pyramidizeShape(shape);
      setShape(newShape);
      setActiveDim(newShape.dimension);
      setAiResponse(`Pyramidized ${shape.name} into ${newShape.dimension}D space.`);
  };

  const handleDual = () => {
      if (shape.dimension < 2) {
          setAiResponse("Cannot dualize 0D or 1D shapes.");
          return;
      }
      try {
          const newShape = dualShape(shape);
          setShape(newShape);
          setActiveDim(newShape.dimension);
          setAiResponse(`Generated Dual of ${shape.name}.`);
      } catch (e) {
          setAiResponse(`Failed to generate dual: ${e}`);
      }
  };

  const getShapeByPreset = (type: string, isInitialLoad = false): { shape: Shape, targetDim: number, triggerEgg: boolean, triggerEggUrl?: string, appliedAprilFools: boolean } => {
    let appliedAprilFools = false;
    let triggerEgg = false;
    let triggerEggUrl = '';
    
    if (type === 'truncated-octahedron') {
        appliedAprilFools = isAprilFools;
        const chance = isInitialLoad ? 1 : (appliedAprilFools ? 1/8 : 1/16);
        if (Math.random() < chance) {
            triggerEgg = true;
            triggerEggUrl = 'https://www.youtube.com/watch?v=GvCKHZDicyE';
            return { shape: INITIAL_SHAPE, targetDim: 3, triggerEgg, triggerEggUrl, appliedAprilFools };
        }
    }
    
    if (type === 'pentachoric-trischiliaoctacositetracontateron') {
        const chance = isInitialLoad ? 1 : 1/16;
        if (Math.random() < chance) {
            triggerEgg = true;
            triggerEggUrl = 'https://www.youtube.com/watch?v=kEDsqaKgGuM';
            return { shape: INITIAL_SHAPE, targetDim: 5, triggerEgg, triggerEggUrl, appliedAprilFools };
        }
    }
    
    let newShape: Shape = INITIAL_SHAPE;
    let targetDim = 3;

    switch(type) {
        // Primitives
        case 'point': newShape = generateHypercube(0); targetDim=1; break;
        case 'line': newShape = generateHypercube(1); targetDim=2; break;
        
        // 2D Polygons
        case 'triangle': newShape = generatePolygon(3); targetDim=2; break;
        case 'square': newShape = generatePolygon(4); targetDim=2; break; 
        case 'pentagon': newShape = generatePolygon(5); targetDim=2; break;
        case 'hexagon': newShape = generatePolygon(6); targetDim=2; break;
        case 'octagon': newShape = generatePolygon(8); targetDim=2; break;
        case 'circle': newShape = generatePolygon(32); targetDim=2; break;
        
        // Torus
        case 'torus': newShape = generateTorus(1, 0.4, 32, 16); targetDim=3; break;
        case 'clifford-torus': newShape = generateCliffordTorus(32, 32); targetDim=4; break;
        case 'torisphere': newShape = generateTorisphere(1, 0.3, 16, 16); targetDim=4; break;
        case 'tiger': newShape = generateTiger(1, 1, 0.3, 12); targetDim=4; break;
        case '3-torus': newShape = generate3Torus(1, 0.3, 16); targetDim=4; break;
        case 'tiger-sphere': newShape = generateTigerSphere(1, 1, 0.3, 8); targetDim=5; break;
        case 'cylo-goroid': newShape = generateCyloGoroid(1, 1, 0.3, 8); targetDim=5; break;
        case 'cylointigoroid': newShape = generateCylointigoroid(1.5, 1, 1, 0.3, 8); targetDim=5; break;
        
        // Advanced Numeric Toratopes
        case 'herures-shape': newShape = generateNumericToratope([3, 2, 1, 2], "Herure's Shape (3212)"); targetDim=8; break;
        case 'novairus': newShape = generateNumericToratope([2, 1, 2, 1, 1, 2], "Novairus (212112)"); targetDim=9; break;
        case 'nemas-torisphere': newShape = generateNumericToratope([1, 2, 4, 2], "Nema's Torisphere (1242)"); targetDim=9; break;

        // Biological
        case 'agapornis': newShape = generateAgapornis(); targetDim=3; break;
        case 'anomalocaris': newShape = generateAnomalocaris(); targetDim=3; break;
        case 'homo-sapiens': newShape = generateHomoSapiens(); targetDim=3; break;

        // Spheres
        case 'sphere-3': newShape = generateHypersphere(3); targetDim=3; break;
        case 'sphere-4': newShape = generateHypersphere(4); targetDim=4; break;
        case 'sphere-5': newShape = generateHypersphere(5); targetDim=5; break;
        case 'sphere-6': newShape = generateHypersphere(6); targetDim=6; break;
        case 'sphere-7': newShape = generateHypersphere(7); targetDim=7; break;
        case 'sphere-8': newShape = generateHypersphere(8); targetDim=8; break;
        case 'sphere-9': newShape = generateHypersphere(9); targetDim=9; break;
        case 'sphere-10': newShape = generateHypersphere(10); targetDim=10; break;
        case 'sphere-11': newShape = generateHypersphere(11); targetDim=11; break;

        // 3D Platonic Solids
        case 'tetrahedron': newShape = generateSimplex(3); targetDim=3; break;
        case 'cube': newShape = generateHypercube(3); targetDim=3; break;
        case 'octahedron': newShape = generateOctahedron(); targetDim=3; break;
        case 'dodecahedron': newShape = generateDodecahedron(); targetDim=3; break;
        case 'icosahedron': newShape = generateIcosahedron(); targetDim=3; break;
        
        // 3D Non-Platonic
        case 'truncated-octahedron': 
            newShape = truncateShape(generateOctahedron()); 
            if (appliedAprilFools) {
                newShape.name = 'April Fools Octahedron';
            }
            targetDim=3; 
            break;
        case 'snub-cube': newShape = generateSnubCube(); targetDim=3; break;
        case 'disdyakis': newShape = generateDisdyakisTriacontahedron(); targetDim=3; break;
        case 'enneacontahedron': newShape = generateEnneacontahedron(); targetDim=3; break;
        case 'cylinder': newShape = generateCylinder(24); targetDim=3; break;
        case 'cone': newShape = generateCone(); targetDim=3; break;
        case 'pyramid-4': newShape = generatePolygonalPyramid(4); targetDim=3; break;
        case 'pyramid-5': newShape = generatePolygonalPyramid(5); targetDim=3; break;
        case 'prism-3': newShape = generatePrism(3); targetDim=3; break;
        case 'prism-5': newShape = generatePrism(5); targetDim=3; break;
        case 'prism-6': newShape = generatePrism(6); targetDim=3; break;
        case 'antiprism-4': newShape = generateAntiprism(4); targetDim=3; break;
        case 'antiprism-6': newShape = generateAntiprism(6); targetDim=3; break;

        // 4D Chorons
        case 'pentachoron': newShape = generateSimplex(4); targetDim=4; break;
        case 'tesseract': newShape = generateHypercube(4); targetDim=4; break;
        case '16-cell': newShape = generate16Cell(); targetDim=4; break;
        case '24-cell': newShape = generate24Cell(); targetDim=4; break;
        case 'cubinder': {
            const cyl = generateCylinder(16);
            const ext = extrudeShape(cyl.vertices, cyl.edges, 3);
            newShape = { 
                ...cyl, ...ext, name: 'Cubinder', dimension: 4,
                stats: { vertices: ext.vertices.length, edges: ext.edges.length }
            };
            targetDim = 4;
            break;
        }
        case 'spherinder': newShape = generateSpherinder(); targetDim=4; break;
        case 'duocylinder': newShape = generateDuocylinder(); targetDim=4; break;
        case 'duocone': newShape = generateDuocone(); targetDim=4; break;
        case 'spherocone': newShape = generateSpherocone(); targetDim=4; break;
        case 'toricone': newShape = generateToricone(); targetDim=4; break;
        case 'octa-prism': newShape = generateOctahedralPrism(); targetDim=4; break;
        case 'octa-pyramid': newShape = generateOctahedralPyramid(); targetDim=4; break;
        case 'gippic': newShape = generateGippic(); targetDim=4; break;
        case '600-cell': newShape = generate600Cell(); targetDim=4; break;
        case '120-cell': newShape = generate120Cell(); targetDim=4; break;
        case 'ghit': newShape = generateGrandHecatonicosinterceptedTrishecatonicosachoron(); targetDim=4; break;
        case '720-cell': newShape = generate720Cell(); targetDim=4; break;
        case 'omni-tesseract': newShape = generateOmniTesseract(); targetDim=4; break;
        case 'enneacontachoron': newShape = generateEnneacontachoron(); targetDim=4; break;

        // Higher Dims (5D, 6D, 7D)
        case 'pentachoric-trischiliaoctacositetracontateron': 
            newShape = generatePentachoricTrischiliaoctacositetracontateron(); 
            if (Math.random() < 1/16) {
                newShape.name = 'The Furious';
            }
            targetDim=5; 
            break;
        case 'penteract': newShape = generateHypercube(5); targetDim=5; break;
        case 'demipenteract': newShape = generateDemipenteract(); targetDim=5; break;
        case 'dodecateron': newShape = generateDodecateron(); targetDim=5; break;
        case '1200-teron': newShape = generate1200Teron(); targetDim=5; break;
        case 'hexeract': newShape = generateHypercube(6); targetDim=6; break;
        case 'hepteract': newShape = generateHypercube(7); targetDim=7; break;

        // 8D-11D
        case 'octeract': newShape = generateHypercube(8); targetDim=8; break;
        case '8-simplex': newShape = generateSimplex(8); targetDim=8; break;
        case '8-orthoplex': newShape = generateOrthoplex(8); targetDim=8; break;
        case 'e8-polytope': newShape = generateE8Polytope(); targetDim=8; break;
        case 'demi-octeract': newShape = generateDemiOcteract(); targetDim=8; break;
        
        case 'enneact': newShape = generateHypercube(9); targetDim=9; break;
        case '9-simplex': newShape = generateSimplex(9); targetDim=9; break;
        case '1600-yotta': newShape = generate1600Yotta(); targetDim=9; break;

        case 'deceract': newShape = generateDeceract(); targetDim=10; break;
        case '10-simplex': newShape = generate10Simplex(); targetDim=10; break;
        case '10-orthoplex': newShape = generate10Orthoplex(); targetDim=10; break;

        case 'hendeceract': newShape = generateHendeceract(); targetDim=11; break;
        case '11-simplex': newShape = generate11Simplex(); targetDim=11; break;
        case '11-orthoplex': newShape = generate11Orthoplex(); targetDim=11; break;
    }
    
    return { shape: newShape, targetDim, triggerEgg, triggerEggUrl, appliedAprilFools };
  };

  const handleSelectPreset = (type: string, isInitialLoad = false) => {
    const { shape: newShape, targetDim, triggerEgg, triggerEggUrl } = getShapeByPreset(type, isInitialLoad);
    if (triggerEgg) {
        triggerEasterEgg(isInitialLoad, triggerEggUrl);
        return;
    }

    setShape(newShape);
    setActiveDim(Math.max(activeDim, targetDim));
    setAiResponse(`Loaded ${newShape.name} (${newShape.dimension}D).`);
  };

  const handleCartesianProduct = (factors: string[]) => {
      if (factors.length < 2) return;
      
      let currentShape = getShapeByPreset(factors[0]).shape;
      
      for (let i = 1; i < factors.length; i++) {
          const nextShape = getShapeByPreset(factors[i]).shape;
          currentShape = generateCartesianProduct(currentShape, nextShape);
      }
      
      setShape(currentShape);
      setActiveDim(Math.max(activeDim, currentShape.dimension));
      setAiResponse(`Loaded Cartesian Product: ${currentShape.name} (${currentShape.dimension}D).`);
  };

  useEffect(() => {
    const randomPreset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    handleSelectPreset(randomPreset, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadNumericToratope = (sequence: number[], customName?: string) => {
      const name = customName || `Custom Toratope (${sequence.join('')})`;
      const newShape = generateNumericToratope(sequence, name);
      setShape(newShape);
      setActiveDim(Math.max(activeDim, newShape.dimension));
      setAiResponse(`Loaded ${name} (${newShape.dimension}D).`);
  };

  const handleRandomShape = () => {
    if (hacka67Mode) {
        handleSelectPreset('truncated-octahedron');
    } else if (may2ndMode) {
        handleSelectPreset('pentachoric-trischiliaoctacositetracontateron');
    } else {
        const randomPreset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
        handleSelectPreset(randomPreset);
    }
  };

  const handleRandomSpin = () => {
    const randomMajorRadius = 0.5 + Math.random() * 4.5; // 0.5 to 5.0
    const randomSegments = 4 + Math.floor(Math.random() * 15) * 2; // 4 to 32 (even numbers)
    const randomTargetDim = Math.max(shape.dimension + 1, Math.min(11, shape.dimension + 1 + Math.floor(Math.random() * 3)));
    
    setSpinConfig({
        majorRadius: parseFloat(randomMajorRadius.toFixed(1)),
        segments: randomSegments,
        targetDim: randomTargetDim
    });
    
    // Apply spin immediately
    const axis1 = shape.dimension >= 3 ? 0 : 0;
    const axis2 = shape.dimension >= 3 ? shape.dimension : 2;
    const newShape = spinShape(shape, randomMajorRadius, randomSegments, axis1, axis2);
    setShape(newShape);
    setActiveDim(newShape.dimension);
    setAiResponse(`Randomly spun ${shape.name} into a ${newShape.dimension}D toratope.`);
  };

  const handleExportOFF = () => {
    if (!shape) return;
    
    const content = generateOFFContent(shape);
    const is4D = shape.dimension === 4;
    const extension = is4D ? '4off' : 'off';
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${shape.name.replace(/\s+/g, '_').toLowerCase()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiResponse(null);
    try {
      const { shape: newShape, text } = await generateShapeWithGemini(aiPrompt, activeDim);
      setShape(newShape);
      setAiResponse(text);
      setAutoRotate(true);
      if (newShape.dimension > activeDim) {
          setActiveDim(newShape.dimension);
      }
    } catch (e) {
      setAiResponse("Sorry, I couldn't generate that shape. Try asking for something simpler like 'a pyramid'.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExplain = async () => {
    setIsGenerating(true);
    try {
        const text = await explainDimension(activeDim);
        setAiResponse(text);
    } catch (e) {
        setAiResponse("Could not fetch explanation.");
    } finally {
        setIsGenerating(false);
    }
  };

  if (easterEggActive) {
      return (
          <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 text-center">
              <h1 className="text-4xl font-bold mb-6 text-sky-400">You found a secret!</h1>
              <p className="mb-8 text-slate-400">A rare dimensional anomaly has been detected.</p>
              <a 
                  href={easterEggUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 rounded-xl font-bold text-xl shadow-lg shadow-sky-500/20 transition-all"
                  onClick={() => setEasterEggActive(false)}
              >
                  Investigate Anomaly
              </a>
          </div>
      );
  }

  return (
    <div className="w-full h-screen flex flex-col md:flex-row bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* Sidebar Controls */}
      <div className="w-full md:w-96 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
        <div className="p-4 border-b border-slate-800 bg-slate-900">
            <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                HyperDim Architect
            </h1>
            <p className="text-xs text-slate-500 mt-1">1D-11D Geometry Sim</p>
        </div>
        
        <Controls 
            activeDim={activeDim}
            setActiveDim={setActiveDim}
            onExtrude={handleExtrude}
            onReset={handleReset}
            rotations={rotations}
            setRotations={setRotations}
            shape={shape}
            autoRotate={autoRotate}
            setAutoRotate={setAutoRotate}
            onSelectPreset={handleSelectPreset}
            onCartesianProduct={handleCartesianProduct}
            zoom={zoom}
            setZoom={setZoom}
            extrusionSegments={extrusionSegments}
            setExtrusionSegments={setExtrusionSegments}
            ntopeConfig={ntopeConfig}
            setNtopeConfig={setNtopeConfig}
            onCreateNtope={handleCreateNtope}
            torusConfig={torusConfig}
            setTorusConfig={setTorusConfig}
            onCreateTorus={handleCreateTorus}
            spinConfig={spinConfig}
            setSpinConfig={setSpinConfig}
            onSpinShape={handleSpinShape}
            onTruncate={handleTruncate}
            onRectify={handleRectify}
            onOmnitruncate={handleOmnitruncate}
            onStellate={handleStellate}
            onSnub={handleSnub}
            onPyramidize={handlePyramidize}
            onDual={handleDual}
            hacka67Mode={hacka67Mode}
            setHacka67Mode={setHacka67Mode}
            may2ndMode={may2ndMode}
            setMay2ndMode={setMay2ndMode}
            showToratopeExplorer={showToratopeExplorer}
            setShowToratopeExplorer={setShowToratopeExplorer}
            onLoadNumericToratope={handleLoadNumericToratope}
            onRandomShape={handleRandomShape}
            onRandomSpin={handleRandomSpin}
            onExportOFF={handleExportOFF}
        />
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative flex flex-col">
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
             <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 shadow-xl flex gap-4 items-center">
                 <div className="flex items-center gap-2">
                     <span className="text-sky-400 font-mono font-bold">{activeDim === 11 ? '11D' : `${activeDim}D View`}</span>
                     <span className="text-slate-600">|</span>
                     <span className="text-slate-300 text-sm">{shape.name}</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs text-slate-500 border-l border-slate-700 pl-4">
                     <span>Zoom: {zoom.toFixed(2)}x</span>
                 </div>
             </div>
        </div>

        <div className="flex-1 p-4 bg-slate-950 relative">
             <SimulationCanvas 
                shape={shape} 
                rotations={rotations} 
                activeDim={activeDim} 
                autoRotate={autoRotate}
                zoom={zoom}
                setZoom={setZoom}
             />
             
             {/* Gemini AI Floating Panel */}
             <div className="absolute bottom-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:w-[600px] bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl transition-all">
                {aiResponse && (
                    <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-sm text-slate-300 leading-relaxed animate-fade-in max-h-32 overflow-y-auto custom-scrollbar">
                        <span className="text-indigo-400 font-bold block mb-1">Gemini:</span>
                        {aiResponse}
                    </div>
                )}
                
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Ask Gemini: 'Make a 4D Pyramid' or 'Explain 7D'..."
                        className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                    />
                    <button 
                        onClick={handleAiGenerate}
                        disabled={isGenerating || !aiPrompt}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2 font-medium text-sm transition-all"
                    >
                        {isGenerating ? '...' : 'Gen'}
                    </button>
                    <button 
                        onClick={handleExplain}
                        disabled={isGenerating}
                        className="bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-600/30 rounded-xl px-4 py-2 font-medium text-sm transition-all whitespace-nowrap"
                    >
                        Explain
                    </button>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default App;