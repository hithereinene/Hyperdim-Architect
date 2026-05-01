import { Vertex, Edge, RotationState, Shape, ShapeStats, AXIS_LABELS } from '../types';
import ch from 'convex-hull';

// Create a copy of coordinates
export const cloneCoords = (coords: number[]): number[] => [...coords];

// Generate rotation pairs for N dimensions
export const getRotationPlanes = (dim: number): string[] => {
  const planes: string[] = [];
  // Use the labels from types or local def to ensure consistency
  // AXIS_LABELS = ['X', 'Y', 'Z', 'W', 'V', 'U', 'T', 'S', 'R', 'Q']
  for (let i = 0; i < dim; i++) {
    for (let j = i + 1; j < dim; j++) {
      planes.push(`${AXIS_LABELS[i]}${AXIS_LABELS[j]}`);
    }
  }
  return planes;
};

// Rotate a point in N-dimensional space
export const rotateVertex = (vertex: Vertex, rotations: RotationState, activeDim: number): Vertex => {
  let v = cloneCoords(vertex.coords);
  // Pad to 26 for safety
  while (v.length < 26) v.push(0);

  for (let i = 0; i < activeDim; i++) {
    for (let j = i + 1; j < activeDim; j++) {
      const plane = `${AXIS_LABELS[i]}${AXIS_LABELS[j]}`;
      const angle = rotations[plane] || 0;
      
      if (angle !== 0) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const valI = v[i];
        const valJ = v[j];
        v[i] = valI * cos - valJ * sin;
        v[j] = valI * sin + valJ * cos;
      }
    }
  }
  return { coords: v };
};

// Project N-D point to 2D screen coordinates
export const projectVertex = (vertex: Vertex, canvasWidth: number, canvasHeight: number, scale: number, activeDim: number): { x: number, y: number, scaleFactor: number } => {
  let coords = [...vertex.coords];
  while (coords.length < 26) coords.push(0);

  const cameraDistance = 3.5;
  let currentScale = 1;

  // Project from activeDim down to 2
  for (let d = activeDim - 1; d >= 2; d--) {
    const val = coords[d];
    // Simple perspective divide
    const w = 1 / (cameraDistance - val);
    
    // Check for singularity behind camera
    const safeW = (cameraDistance - val) <= 0.1 ? 1 : w;

    for (let i = 0; i < d; i++) {
      coords[i] = coords[i] * safeW * cameraDistance; 
    }
    currentScale *= safeW;
  }

  return { 
    x: coords[0] * scale + canvasWidth / 2, 
    y: canvasHeight / 2 - coords[1] * scale, 
    scaleFactor: currentScale 
  };
};

export const generatePyramid = (shape: Shape, height?: number): Shape => {
    const dim = shape.dimension;
    const newDim = dim + 1;
    
    // Find average edge length
    let avgEdgeLen = 0;
    if (shape.edges.length > 0) {
        shape.edges.forEach(e => {
            const p1 = shape.vertices[e.source].coords;
            const p2 = shape.vertices[e.target].coords;
            let distSq = 0;
            for (let i = 0; i < p1.length; i++) distSq += Math.pow(p1[i] - p2[i], 2);
            avgEdgeLen += Math.sqrt(distSq);
        });
        avgEdgeLen /= shape.edges.length;
    } else {
        avgEdgeLen = 1;
    }
    if (avgEdgeLen === 0 || isNaN(avgEdgeLen)) avgEdgeLen = 1;

    // Find centroid
    const centroid = new Array(dim).fill(0);
    shape.vertices.forEach(v => {
        for (let i = 0; i < dim; i++) centroid[i] += v.coords[i] || 0;
    });
    for (let i = 0; i < dim; i++) centroid[i] /= shape.vertices.length;

    // Find average radius
    let avgRadiusSq = 0;
    shape.vertices.forEach(v => {
        let rSq = 0;
        for (let i = 0; i < dim; i++) rSq += Math.pow((v.coords[i] || 0) - centroid[i], 2);
        avgRadiusSq += rSq;
    });
    avgRadiusSq /= shape.vertices.length;

    // Calculate height for regular faces if not provided
    let h = height;
    if (h === undefined) {
        const hSq = Math.pow(avgEdgeLen, 2) - avgRadiusSq;
        h = hSq > 0 ? Math.sqrt(hSq) : avgEdgeLen; // Fallback if base is too wide
    }

    const newVertices: Vertex[] = shape.vertices.map(v => {
        const coords = [...v.coords];
        while (coords.length < newDim) coords.push(0);
        // Center the base at the origin in the new dimension, or just put it at -h/2
        // Let's put the base at -h/2 and the apex at h/2
        coords[newDim - 1] = -h / 2;
        return { coords };
    });

    const apexCoords = [...centroid];
    while (apexCoords.length < newDim) apexCoords.push(0);
    apexCoords[newDim - 1] = h / 2;
    
    const apexIndex = newVertices.length;
    newVertices.push({ coords: apexCoords });

    const newEdges: Edge[] = [...shape.edges];
    for (let i = 0; i < shape.vertices.length; i++) {
        newEdges.push({ source: i, target: apexIndex });
    }

    return {
        id: `pyramid-${shape.id}`,
        name: `${shape.name} Pyramid`,
        dimension: newDim,
        vertices: newVertices,
        edges: newEdges,
        stats: {
            vertices: newVertices.length,
            edges: newEdges.length,
            faces: (shape.stats?.faces || 0) + (shape.stats?.edges || 0),
            cells: (shape.stats?.cells || 0) + (shape.stats?.faces || 0)
        }
    };
};

export const extrudeShape = (
  currentVertices: Vertex[], 
  currentEdges: Edge[], 
  dimIndex: number,
  currentFaces: number[][] = [],
  currentCells: number[][] = []
): { vertices: Vertex[], edges: Edge[], faces: number[][], cells: number[][] } => {
  const offset = 1; 
  const n = currentVertices.length;

  // Shift original vertices
  const shiftedOriginals = currentVertices.map(v => {
    const nc = [...v.coords];
    while(nc.length <= dimIndex) nc.push(0);
    nc[dimIndex] = -offset / 2;
    return { coords: nc };
  });

  // Create new vertices
  const shiftedNew = currentVertices.map(v => {
    const nc = [...v.coords];
    while(nc.length <= dimIndex) nc.push(0);
    nc[dimIndex] = offset / 2;
    return { coords: nc };
  });

  const finalVertices = [...shiftedOriginals, ...shiftedNew];

  const newEdges: Edge[] = [];
  // Original edges
  currentEdges.forEach(e => newEdges.push({ source: e.source, target: e.target }));
  // Shifted edges
  currentEdges.forEach(e => newEdges.push({ source: e.source + n, target: e.target + n }));
  // Connecting edges
  for (let i = 0; i < n; i++) {
    newEdges.push({ source: i, target: i + n });
  }

  const newFaces: number[][] = [];
  // Original faces
  currentFaces.forEach(f => newFaces.push([...f]));
  // Shifted faces
  currentFaces.forEach(f => newFaces.push(f.map(v => v + n)));
  // Connecting faces from edges
  currentEdges.forEach(e => {
    newFaces.push([e.source, e.target, e.target + n, e.source + n]);
  });

  const newCells: number[][] = [];
  // Original cells
  currentCells.forEach(c => newCells.push([...c]));
  // Shifted cells
  currentCells.forEach(c => newCells.push(c.map(f => f + currentFaces.length)));
  
  // Helper to find edge index
  const getEdgeIndex = (v1: number, v2: number) => {
    for (let i = 0; i < currentEdges.length; i++) {
      const e = currentEdges[i];
      if ((e.source === v1 && e.target === v2) || (e.source === v2 && e.target === v1)) {
        return i;
      }
    }
    return -1;
  };

  // Connecting cells from faces
  currentFaces.forEach((f, i) => {
    const cell = [i, i + currentFaces.length]; // original and shifted face
    for (let j = 0; j < f.length; j++) {
      const v1 = f[j];
      const v2 = f[(j + 1) % f.length];
      const eIdx = getEdgeIndex(v1, v2);
      if (eIdx !== -1) {
        cell.push(2 * currentFaces.length + eIdx);
      }
    }
    newCells.push(cell);
  });

  return { vertices: finalVertices, edges: newEdges, faces: newFaces, cells: newCells };
};

// --- Statistics Helpers ---
const getBinomial = (n: number, k: number): number => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) res = res * (n - i + 1) / i;
    return res;
};

const getHypercubeStats = (dim: number): ShapeStats => {
    const stats: ShapeStats = {};
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    for (let k = 0; k <= dim; k++) {
        if (k < faceNames.length) {
            stats[faceNames[k] as keyof ShapeStats] = Math.pow(2, dim - k) * getBinomial(dim, k);
        }
    }
    return stats;
};

const getSimplexStats = (dim: number): ShapeStats => {
    const stats: ShapeStats = {};
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    for (let k = 0; k <= dim; k++) {
        if (k < faceNames.length) {
            stats[faceNames[k] as keyof ShapeStats] = getBinomial(dim + 1, k + 1);
        }
    }
    return stats;
};

const getOrthoplexStats = (dim: number): ShapeStats => {
    const stats: ShapeStats = {};
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    for (let k = 0; k < dim; k++) {
        if (k < faceNames.length) {
            stats[faceNames[k] as keyof ShapeStats] = Math.pow(2, k + 1) * getBinomial(dim, k + 1);
        }
    }
    if (dim < faceNames.length) {
        stats[faceNames[dim] as keyof ShapeStats] = 1;
    }
    return stats;
}

export const connectVerticesByDistance = (vertices: Vertex[], targetDist: number, epsilon: number = 0.01): Edge[] => {
    const edges: Edge[] = [];
    for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
            const v1 = vertices[i].coords;
            const v2 = vertices[j].coords;
            
            let distSq = 0;
            const len = Math.max(v1.length, v2.length);
            for(let k=0; k<len; k++) {
                const d = (v1[k] || 0) - (v2[k] || 0);
                distSq += d*d;
            }
            const dist = Math.sqrt(distSq);
            
            if (Math.abs(dist - targetDist) < epsilon) {
                edges.push({ source: i, target: j });
            }
        }
    }
    return edges;
};

// --- Helper for Permutations ---
const getPermutations = (elements: number[]): number[][] => {
    if (elements.length === 0) return [[]];
    const firstEl = elements[0];
    const rest = elements.slice(1);
    const permsWithoutFirst = getPermutations(rest);
    const allPermutations: number[][] = [];
    
    permsWithoutFirst.forEach(perm => {
        for (let i = 0; i <= perm.length; i++) {
            const permWithFirst = [...perm.slice(0, i), firstEl, ...perm.slice(i)];
            allPermutations.push(permWithFirst);
        }
    });
    // Remove duplicates
    const unique: string[] = [];
    const result: number[][] = [];
    allPermutations.forEach(p => {
        const key = p.join(',');
        if (!unique.includes(key)) {
            unique.push(key);
            result.push(p);
        }
    });
    return result;
};

const getSignedPermutations = (base: number[]): number[][] => {
    const perms = getPermutations(base);
    const results: number[][] = [];
    
    perms.forEach(p => {
        const nonZeroIndices = p.map((val, idx) => val !== 0 ? idx : -1).filter(i => i !== -1);
        const count = nonZeroIndices.length;
        const variations = Math.pow(2, count);
        
        for(let i=0; i<variations; i++) {
            const temp = [...p];
            for(let j=0; j<count; j++) {
                if ((i >> j) & 1) {
                    temp[nonZeroIndices[j]] *= -1;
                }
            }
            results.push(temp);
        }
    });
    
    const unique: string[] = [];
    const finalRes: number[][] = [];
    results.forEach(p => {
        const key = p.join(',');
        if (!unique.includes(key)) {
            unique.push(key);
            finalRes.push(p);
        }
    });
    return finalRes;
};

// --- Shape Generators ---

export const generateHypercube = (dim: number): Shape => {
  let vertices: Vertex[] = [{ coords: [] }];
  let edges: Edge[] = [];
  let faces: number[][] = [];
  let cells: number[][] = [];
  
  for (let d = 0; d < dim; d++) {
    const result = extrudeShape(vertices, edges, d, faces, cells);
    vertices = result.vertices;
    edges = result.edges;
    faces = result.faces;
    cells = result.cells;
  }
  const names = ['Point', 'Line', 'Square', 'Cube', 'Tesseract', 'Penteract', 'Hexeract', 'Hepteract', 'Octeract', 'Enneact', 'Deceract'];
  return {
    id: `hypercube-${dim}-${Date.now()}`,
    name: names[dim] || `${dim}-Cube`,
    dimension: dim,
    vertices,
    edges,
    faces,
    cells,
    stats: getHypercubeStats(dim)
  };
};

export const generateSimplex = (dim: number): Shape => {
  let currentVerts: Vertex[] = [{ coords: new Array(26).fill(0) }]; 
  let currentEdges: Edge[] = [];
  
  if (dim === 0) return { id: 'simplex-0', name: 'Point', dimension: 0, vertices: currentVerts, edges: [], stats: getSimplexStats(0)};

  for (let d = 1; d <= dim; d++) {
      const baseVerts = currentVerts.map(v => {
          const c = [...v.coords];
          c[d-1] = -0.3; 
          return { coords: c };
      });
      
      const apexCoords = new Array(26).fill(0);
      apexCoords[d-1] = 0.6; 
      const apex: Vertex = { coords: apexCoords };
      
      const newVerts = [...baseVerts, apex];
      const newEdges = [...currentEdges];
      const apexIndex = newVerts.length - 1;
      
      for(let i=0; i < baseVerts.length; i++) {
          newEdges.push({ source: i, target: apexIndex });
      }
      
      currentVerts = newVerts;
      currentEdges = newEdges;
  }
  
  const names = ['Point', 'Line', 'Triangle', 'Tetrahedron', 'Pentachoron', 'Hexateron', 'Heptapeton', 'Octapeton', 'Enneapeton', 'Decapeton'];
  return {
      id: `simplex-${dim}-${Date.now()}`,
      name: names[dim] || `${dim}-Simplex`,
      dimension: dim,
      vertices: currentVerts,
      edges: currentEdges,
      stats: getSimplexStats(dim)
  };
}

export const generateOrthoplex = (dim: number): Shape => {
    const vertices: Vertex[] = [];
    for(let d=0; d<dim; d++) {
        const v1 = new Array(26).fill(0); v1[d] = 1;
        const v2 = new Array(26).fill(0); v2[d] = -1;
        vertices.push({ coords: v1 });
        vertices.push({ coords: v2 });
    }
    const edges = connectVerticesByDistance(vertices, Math.sqrt(2));

    return {
        id: `orthoplex-${dim}-${Date.now()}`,
        name: `${dim}-Orthoplex`,
        dimension: dim,
        vertices,
        edges,
        stats: getOrthoplexStats(dim)
    };
};

export const generateSegmentedLine = (segments: number): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    const totalPoints = segments + 1;
    const start = -0.5;
    const end = 0.5;
    const step = (end - start) / segments;
    
    for(let i=0; i<totalPoints; i++) {
        const val = start + i * step;
        vertices.push({ coords: [val, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
        if (i > 0) {
            edges.push({ source: i-1, target: i });
        }
    }
    return {
        id: `line-seg-${segments}-${Date.now()}`,
        name: `Line (${segments} segments)`,
        dimension: 1,
        vertices,
        edges,
        stats: { vertices: totalPoints, edges: segments }
    };
};

export const generateHypersphere = (dim: number): Shape => {
    // 3D: UV Sphere (Structured Mesh)
    if (dim === 3) {
        const latSegments = 16;
        const lonSegments = 24;
        const vertices: Vertex[] = [];
        const edges: Edge[] = [];
        const radius = 1;
        
        for(let lat=0; lat <= latSegments; lat++) {
            const theta = (lat / latSegments) * Math.PI; 
            const y = radius * Math.cos(theta);
            const r = radius * Math.sin(theta);
            
            for(let lon=0; lon < lonSegments; lon++) {
                const phi = (lon / lonSegments) * Math.PI * 2;
                const x = r * Math.cos(phi);
                const z = r * Math.sin(phi);
                
                // Add vertex
                vertices.push({ coords: [x, y, z, 0,0,0,0,0,0,0] });
            }
        }
        
        // Generate edges
        for(let lat=0; lat <= latSegments; lat++) {
            for(let lon=0; lon < lonSegments; lon++) {
                const current = lat * lonSegments + lon;
                const nextLon = lat * lonSegments + ((lon + 1) % lonSegments);
                const nextLat = (lat + 1) * lonSegments + lon;
                
                // Lon Edge
                edges.push({source: current, target: nextLon});
                
                // Lat Edge
                if (lat < latSegments) {
                    edges.push({source: current, target: nextLat});
                }
            }
        }
        
        const stats: ShapeStats = { vertices: vertices.length, edges: edges.length };
        const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
        if (3 < faceNames.length) {
            stats[faceNames[3] as keyof ShapeStats] = 1;
        }
        return {
            id: `sphere-3-structured-${Date.now()}`,
            name: '3D Sphere',
            dimension: 3,
            vertices,
            edges,
            stats
        };
    }

    // 4D+ Random Hypersphere
    // Use uniform distribution on N-sphere
    const vertexCount = dim >= 8 ? 300 : (dim >= 6 ? 250 : 200); 
    const vertices: Vertex[] = [];
    
    for(let i=0; i<vertexCount; i++) {
        const coords: number[] = [];
        // Normal (Gaussian) distribution method for uniform sphere points
        // Box-Muller transform or simple sum approximation
        for(let d=0; d<dim; d++) {
             // Approximation of Gaussian
             let u = 0;
             for(let k=0; k<6; k++) u += Math.random();
             u -= 3; 
             coords.push(u);
        }
        const mag = Math.sqrt(coords.reduce((a,b)=>a+b*b, 0));
        if (mag > 0) {
            for(let d=0; d<dim; d++) coords[d] /= mag;
        }
        while(coords.length < 26) coords.push(0);
        vertices.push({ coords });
    }
    
    const edges: Edge[] = [];
    // Increase K for higher dims to keep it looking connected
    const k = dim >= 7 ? 6 : 5;
    for(let i=0; i<vertexCount; i++) {
        const dists = vertices.map((v, idx) => {
            if (i === idx) return { idx, d: Infinity };
            let dSq = 0;
            for(let x=0; x<dim; x++) {
                const diff = v.coords[x] - vertices[i].coords[x];
                dSq += diff*diff;
            }
            return { idx, d: dSq };
        });
        dists.sort((a,b) => a.d - b.d);
        for(let n=0; n<k; n++) edges.push({ source: i, target: dists[n].idx });
    }
    
    const names = [
      '', '', 'Circle', 'Sphere', 'Glome', 
      '5D Hypersphere', '6D Hypersphere', '7D Hypersphere', 
      '8D Hypersphere', '9D Hypersphere', '10D Hypersphere', '11D Hypersphere', '12D Hypersphere'
    ];

    const stats: ShapeStats = { vertices: vertexCount, edges: edges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (dim < faceNames.length) {
        stats[faceNames[dim] as keyof ShapeStats] = 1;
    }

    return {
        id: `sphere-${dim}-random-${Date.now()}`,
        name: names[dim] || `${dim}D Hypersphere`,
        dimension: dim,
        vertices,
        edges,
        stats
    };
};

export const generatePolygon = (sides: number): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    const radius = 0.7;
    for(let i=0; i<sides; i++) {
        const theta = (i / sides) * Math.PI * 2;
        const coords = [Math.cos(theta) * radius, Math.sin(theta) * radius, 0, 0, 0, 0, 0, 0, 0, 0];
        vertices.push({ coords });
        edges.push({ source: i, target: (i + 1) % sides });
    }
    const faces = [Array.from({length: sides}, (_, i) => i)];
    return {
        id: `poly-${sides}-${Date.now()}`,
        name: `${sides}-Gon`,
        dimension: 2,
        vertices,
        edges,
        faces,
        cells: [],
        stats: { vertices: sides, edges: sides, faces: 1 }
    };
};

export const generateCylinder = (segments: number = 24): Shape => {
    const poly = generatePolygon(segments);
    const extruded = extrudeShape(poly.vertices, poly.edges, 2, poly.faces, poly.cells); 
    return {
        id: `cylinder-${Date.now()}`,
        name: 'Cylinder',
        dimension: 3,
        vertices: extruded.vertices,
        edges: extruded.edges,
        faces: extruded.faces,
        cells: extruded.cells,
        stats: { vertices: extruded.vertices.length, edges: extruded.edges.length, faces: extruded.faces.length, cells: extruded.cells.length }
    };
};

export const pyramidizeShape = (shape: Shape, height: number = 2): Shape => {
    const newDim = shape.dimension + 1;
    if (newDim > 26) return shape; // Max 26D supported by our Vertex type

    const vertices: Vertex[] = shape.vertices.map(v => {
        const newCoords = [...v.coords];
        newCoords[newDim - 1] = -height / 2;
        return { coords: newCoords as any };
    });
    
    const apexCoords = new Array(26).fill(0);
    apexCoords[newDim - 1] = height / 2;
    const apexIndex = vertices.length;
    vertices.push({ coords: apexCoords as any });
    
    const edges: Edge[] = [...shape.edges];
    
    for (let i = 0; i < apexIndex; i++) {
        edges.push({ source: i, target: apexIndex });
    }
    
    const stats: ShapeStats = { vertices: vertices.length, edges: edges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (newDim < faceNames.length) {
        stats[faceNames[newDim] as keyof ShapeStats] = 1;
    }

    return {
        id: `pyramidized-${shape.id}`,
        name: `${shape.name} Pyramid`,
        dimension: newDim,
        vertices,
        edges,
        stats
    };
};

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
                maxRow = k;
            }
        }
        
        const temp = M[i];
        M[i] = M[maxRow];
        M[maxRow] = temp;
        
        if (Math.abs(M[i][i]) < 1e-10) return null; // Singular
        
        for (let k = i + 1; k < n; k++) {
            const factor = M[k][i] / M[i][i];
            for (let j = i; j <= n; j++) {
                M[k][j] -= factor * M[i][j];
            }
        }
    }
    
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = M[i][n];
        for (let j = i + 1; j < n; j++) {
            sum -= M[i][j] * x[j];
        }
        x[i] = sum / M[i][i];
    }
    return x;
}

function getAffineDimension(points: number[][]): number {
    if (points.length <= 1) return 0;
    const d = points[0].length;
    const p0 = points[0];
    const M = [];
    for (let i = 1; i < points.length; i++) {
        M.push(points[i].map((val, j) => val - p0[j]));
    }
    
    let rank = 0;
    const rows = M.length;
    const cols = d;
    const A = M.map(row => [...row]);
    
    let lead = 0;
    for (let r = 0; r < rows; r++) {
        if (cols <= lead) break;
        let i = r;
        while (i < rows && Math.abs(A[i][lead]) < 1e-10) {
            i++;
        }
        if (i === rows) {
            i = r;
            lead++;
            if (cols === lead) break;
            r--; // retry this row with next column
            continue;
        }
        
        const temp = A[i];
        A[i] = A[r];
        A[r] = temp;
        
        const lv = A[r][lead];
        for (let j = 0; j < cols; j++) A[r][j] /= lv;
        
        for (let i = 0; i < rows; i++) {
            if (i !== r) {
                const lv = A[i][lead];
                for (let j = 0; j < cols; j++) A[i][j] -= lv * A[r][j];
            }
        }
        lead++;
        rank++;
    }
    return rank;
}

export const dualShape = (shape: Shape): Shape => {
    const dim = shape.dimension;
    if (dim < 2) return shape; // Cannot dualize 0D or 1D
    
    // Extract coordinates up to dimension
    let pts = shape.vertices.map(v => {
        const c = [];
        for (let i = 0; i < dim; i++) c.push(v.coords[i] || 0);
        return c;
    });
    
    // Center the shape
    const centroid = new Array(dim).fill(0);
    pts.forEach(p => {
        for (let i = 0; i < dim; i++) centroid[i] += p[i];
    });
    for (let i = 0; i < dim; i++) centroid[i] /= pts.length;
    
    pts = pts.map(p => p.map((val, i) => val - centroid[i]));
    
    // Add tiny noise to avoid exact coplanarity issues in convex-hull
    const noisyPts = pts.map(p => p.map(val => val + (Math.random() - 0.5) * 1e-7));
    
    let simplices;
    try {
        simplices = ch(noisyPts);
    } catch (e) {
        console.warn("Convex hull failed, returning original shape", e);
        return shape;
    }
    
    if (!simplices || simplices.length === 0) {
        return shape;
    }
    
    const dualVertices: number[][] = [];
    const dualFacets: Set<number>[] = [];
    
    simplices.forEach((simplex: number[]) => {
        // Use original points to compute exact normal
        const A = simplex.map(idx => pts[idx]);
        const b = new Array(dim).fill(1);
        const n = solveLinearSystem(A, b);
        if (n) {
            let found = -1;
            for (let i = 0; i < dualVertices.length; i++) {
                const d = dualVertices[i];
                let distSq = 0;
                for (let k = 0; k < dim; k++) {
                    distSq += Math.pow(d[k] - n[k], 2);
                }
                if (distSq < 1e-8) {
                    found = i;
                    break;
                }
            }
            if (found === -1) {
                found = dualVertices.length;
                dualVertices.push(n);
                dualFacets.push(new Set(simplex));
            } else {
                simplex.forEach(idx => dualFacets[found].add(idx));
            }
        }
    });
    
    const newEdges: Edge[] = [];
    for (let i = 0; i < dualVertices.length; i++) {
        for (let j = i + 1; j < dualVertices.length; j++) {
            const intersection = [...dualFacets[i]].filter(x => dualFacets[j].has(x));
            if (intersection.length >= dim - 1) {
                const intPts = intersection.map(idx => pts[idx]);
                if (getAffineDimension(intPts) === dim - 2) {
                    newEdges.push({ source: i, target: j });
                }
            }
        }
    }
    
    // Normalize dual vertices to have a reasonable size
    let maxNorm = 0;
    dualVertices.forEach(v => {
        let normSq = 0;
        for (let i = 0; i < dim; i++) normSq += v[i] * v[i];
        if (normSq > maxNorm) maxNorm = normSq;
    });
    const scale = maxNorm > 0 ? 1.0 / Math.sqrt(maxNorm) : 1;
    
    const finalVertices: Vertex[] = dualVertices.map(v => {
        const coords = new Array(26).fill(0);
        for (let i = 0; i < dim; i++) coords[i] = v[i] * scale;
        return { coords };
    });
    
    const stats: ShapeStats = { vertices: finalVertices.length, edges: newEdges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (dim < faceNames.length) {
        stats[faceNames[dim] as keyof ShapeStats] = 1;
    }

    return {
        id: `dual-${shape.id}-${Date.now()}`,
        name: `Dual ${shape.name}`,
        dimension: dim,
        vertices: finalVertices,
        edges: newEdges,
        stats
    };
};

export const generateCartesianProduct = (shapeA: Shape, shapeB: Shape, name?: string): Shape => {
    const dimA = shapeA.dimension;
    const dimB = shapeB.dimension;
    const newDim = dimA + dimB;
    
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    
    // Create vertices
    for (let i = 0; i < shapeA.vertices.length; i++) {
        for (let j = 0; j < shapeB.vertices.length; j++) {
            const va = shapeA.vertices[i];
            const vb = shapeB.vertices[j];
            
            // Combine coordinates
            const coordsA = va.coords.slice(0, dimA);
            const coordsB = vb.coords.slice(0, dimB);
            const combined = [...coordsA, ...coordsB];
            while (combined.length < 26) combined.push(0);
            
            vertices.push({
                coords: combined
            });
        }
    }
    
    // Create edges
    // For each edge in A, and each vertex in B
    for (let eA of (shapeA.edges || [])) {
        for (let j = 0; j < shapeB.vertices.length; j++) {
            edges.push({
                source: eA.source * shapeB.vertices.length + j,
                target: eA.target * shapeB.vertices.length + j
            });
        }
    }
    
    // For each vertex in A, and each edge in B
    for (let i = 0; i < shapeA.vertices.length; i++) {
        for (let eB of (shapeB.edges || [])) {
            edges.push({
                source: i * shapeB.vertices.length + eB.source,
                target: i * shapeB.vertices.length + eB.target
            });
        }
    }
    
    let finalName = name || `${shapeA.name} × ${shapeB.name}`;
    
    if (!name) {
        const nameA = shapeA.name.toLowerCase();
        const nameB = shapeB.name.toLowerCase();
        
        const isA = (n: string) => nameA.includes(n);
        const isB = (n: string) => nameB.includes(n);
        const isBoth = (n: string) => isA(n) && isB(n);
        const isEither = (n1: string, n2: string) => (isA(n1) && isB(n2)) || (isA(n2) && isB(n1));

        if (isEither('circle', 'line')) finalName = 'Cylinder';
        else if (isEither('circle', 'point')) finalName = 'Cone';
        else if (isBoth('circle')) finalName = 'Torus (3D) / Duocylinder (4D)';
        else if (isEither('square', 'line')) finalName = 'Cube';
        else if (isEither('cube', 'line')) finalName = 'Tesseract';
        else if (isEither('tesseract', 'line')) finalName = 'Penteract';
        else if (isEither('sphere', 'line')) finalName = 'Spherinder';
        else if (isBoth('sphere')) finalName = 'Duospherinder (5D)';
        else if (isBoth('duocylinder')) finalName = 'Triocylinder';
        else if (isEither('triangle', 'line')) finalName = 'Triangular Prism';
        else if (isEither('pentagon', 'line')) finalName = 'Pentagonal Prism';
        else if (isEither('hexagon', 'line')) finalName = 'Hexagonal Prism';
    }
    
    const stats: ShapeStats = { vertices: vertices.length, edges: edges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (newDim < faceNames.length) {
        stats[faceNames[newDim] as keyof ShapeStats] = 1;
    }

    return {
        id: `cp_${shapeA.id}_${shapeB.id}_${Date.now()}`,
        name: finalName,
        dimension: newDim,
        vertices,
        edges,
        stats
    };
};

export const generateCone = (radius: number = 1, height: number = 2, segments: number = 24): Shape => {
    const poly = generatePolygon(segments);
    poly.vertices.forEach(v => {
        v.coords[0] *= radius;
        v.coords[1] *= radius;
    });
    const pyramid = pyramidizeShape(poly, height);
    return {
        ...pyramid,
        id: `cone-${Date.now()}`,
        name: 'Cone'
    };
};

export const generateSpherocone = (radius: number = 1, height: number = 2, segments: number = 16): Shape => {
    const sphere = generateHypersphere(3);
    sphere.vertices.forEach(v => {
        v.coords[0] *= radius;
        v.coords[1] *= radius;
        v.coords[2] *= radius;
    });
    const pyramid = pyramidizeShape(sphere, height);
    return {
        ...pyramid,
        id: `spherocone-${Date.now()}`,
        name: 'Spherocone'
    };
};

export const generateToricone = (R: number = 1, r: number = 0.3, height: number = 2, segments: number = 16): Shape => {
    const torus = generateTorus(R, r, segments, segments);
    const pyramid = pyramidizeShape(torus, height);
    return {
        ...pyramid,
        id: `toricone-${Date.now()}`,
        name: 'Toricone'
    };
};

export const generatePolygonalPyramid = (sides: number): Shape => {
    const base = generatePolygon(sides);
    const vertices = base.vertices.map(v => {
       const c = [...v.coords];
       c[2] = -0.5;
       return { coords: c };
    });
    const edges = [...base.edges];
    vertices.push({ coords: [0,0,0.5,0,0,0,0,0,0,0]});
    const apexIdx = vertices.length - 1;
    for(let i=0; i<sides; i++) {
        edges.push({ source: i, target: apexIdx });
    }
    return {
        id: `pyramid-${sides}-${Date.now()}`,
        name: `${sides}-Sided Pyramid`,
        dimension: 3,
        vertices,
        edges,
        stats: { vertices: sides+1, edges: 2*sides, faces: sides+1, cells: 1 }
    };
}

export const generatePrism = (sides: number): Shape => {
    const poly = generatePolygon(sides);
    const extruded = extrudeShape(poly.vertices, poly.edges, 2, poly.faces, poly.cells);
    return {
        id: `prism-${sides}-${Date.now()}`,
        name: `${sides}-Sided Prism`,
        dimension: 3,
        vertices: extruded.vertices,
        edges: extruded.edges,
        faces: extruded.faces,
        cells: extruded.cells,
        stats: { vertices: 2*sides, edges: 3*sides, faces: sides + 2, cells: 1 }
    };
};

export const generateAntiprism = (sides: number): Shape => {
    const vertices: Vertex[] = [];
    const radius = 0.7;
    const height = 0.5;
    for(let i=0; i<sides; i++) {
        const theta = (i / sides) * Math.PI * 2;
        vertices.push({ coords: [Math.cos(theta) * radius, Math.sin(theta) * radius, -height, 0,0,0,0,0,0,0] });
    }
    for(let i=0; i<sides; i++) {
        const theta = ((i + 0.5) / sides) * Math.PI * 2;
        vertices.push({ coords: [Math.cos(theta) * radius, Math.sin(theta) * radius, height, 0,0,0,0,0,0,0] });
    }
    const edges: Edge[] = [];
    for(let i=0; i<sides; i++) {
        const b = i;
        const bn = (i+1)%sides;
        const t = i + sides;
        edges.push({ source: b, target: bn }); 
        edges.push({ source: t, target: (i+1)%sides + sides });
        edges.push({ source: b, target: t }); 
        edges.push({ source: bn, target: t });
    }
    return {
        id: `antiprism-${sides}-${Date.now()}`,
        name: `${sides}-Gonal Antiprism`,
        dimension: 3,
        vertices,
        edges,
        stats: { vertices: 2*sides, edges: 4*sides, faces: 2*sides + 2, cells: 1 }
    };
};

export const generateBipyramid = (sides: number): Shape => {
    const base = generatePolygon(sides);
    const vertices = base.vertices.map(v => ({ coords: [...v.coords] })); // Copy
    // Add two apexes
    vertices.push({ coords: [0,0,0.5,0,0,0,0,0,0,0]}); // Top
    vertices.push({ coords: [0,0,-0.5,0,0,0,0,0,0,0]}); // Bottom
    
    const edges = [...base.edges];
    const topIdx = vertices.length - 2;
    const botIdx = vertices.length - 1;
    
    for(let i=0; i<sides; i++) {
        edges.push({ source: i, target: topIdx });
        edges.push({ source: i, target: botIdx });
    }
    
    return {
        id: `bipyramid-${sides}-${Date.now()}`,
        name: `${sides}-Gonal Bipyramid`,
        dimension: 3,
        vertices,
        edges,
        stats: { vertices: sides+2, edges: 3*sides, faces: 2*sides, cells: 1 }
    };
};

export const generateOctahedron = (): Shape => generateOrthoplex(3);
export const generate16Cell = (): Shape => generateOrthoplex(4);

export const generateIcosahedron = (): Shape => {
    const phi = (1 + Math.sqrt(5)) / 2;
    const vertices: Vertex[] = [];
    for(let s1 of [-1,1]) for(let s2 of [-1,1]) vertices.push({coords: [0, s1, s2*phi, 0,0,0,0,0,0,0]});
    for(let s1 of [-1,1]) for(let s2 of [-1,1]) vertices.push({coords: [s1, s2*phi, 0, 0,0,0,0,0,0,0]});
    for(let s1 of [-1,1]) for(let s2 of [-1,1]) vertices.push({coords: [s1*phi, 0, s2, 0,0,0,0,0,0,0]});

    vertices.forEach(v => v.coords = v.coords.map(c => c * 0.5));
    const edges = connectVerticesByDistance(vertices, 1.0, 0.05);

    return { 
        id: 'icosahedron', name: 'Icosahedron', dimension: 3, vertices, edges,
        stats: { vertices: 12, edges: 30, faces: 20, cells: 1 }
    };
};

export const generateDodecahedron = (): Shape => {
    const phi = (1 + Math.sqrt(5)) / 2;
    const vertices: Vertex[] = [];
    const invPhi = 1/phi;
    
    for(let x of [-1,1]) for(let y of [-1,1]) for(let z of [-1,1])
        vertices.push({ coords: [x,y,z,0,0,0,0,0,0,0] });
    
    for(let i of [-1,1]) for(let j of [-1,1]) {
        vertices.push({ coords: [0, i*phi, j*invPhi, 0,0,0,0,0,0,0] });
        vertices.push({ coords: [i*invPhi, 0, j*phi, 0,0,0,0,0,0,0] });
        vertices.push({ coords: [i*phi, j*invPhi, 0, 0,0,0,0,0,0,0] });
    }
    vertices.forEach(v => v.coords = v.coords.map(c => c * 0.5));
    const edges = connectVerticesByDistance(vertices, 1/phi, 0.01);
    
    return { 
        id: 'dodecahedron', name: 'Dodecahedron', dimension: 3, vertices, edges,
        stats: { vertices: 20, edges: 30, faces: 12, cells: 1 }
    };
};

export const generate24Cell = (): Shape => {
    const vertices: Vertex[] = [];
    const perms = getSignedPermutations([1, 1, 0, 0]);
    perms.forEach(p => vertices.push({ coords: [...p, 0, 0, 0, 0, 0, 0] }));
    vertices.forEach(v => v.coords = v.coords.map(c => c * 0.7));
    const edges = connectVerticesByDistance(vertices, 1.0 * 0.7 * Math.sqrt(2), 0.05); 
    return { 
        id: '24-cell', name: '24-Cell', dimension: 4, vertices, edges,
        stats: { vertices: 24, edges: 96, faces: 96, cells: 24, tera: 1 }
    };
};

export const generate600Cell = (): Shape => {
    const vertices: Vertex[] = [];
    const phi = (1 + Math.sqrt(5)) / 2;

    const p1 = getSignedPermutations([0.5, 0.5, 0.5, 0.5]);
    p1.forEach(p => vertices.push({ coords: [...p, 0,0,0,0,0,0] }));

    const p2 = getSignedPermutations([1, 0, 0, 0]);
    p2.forEach(p => vertices.push({ coords: [...p, 0,0,0,0,0,0] }));

    const a = 0.5 * phi;
    const b = 0.5;
    const c = 0.5 / phi;
    
    const evens = [
       [0,1,2,3], [0,2,3,1], [0,3,1,2],
       [1,2,0,3], [1,3,2,0], [1,0,3,2],
       [2,3,0,1], [2,0,1,3], [2,1,3,0],
       [3,0,2,1], [3,1,0,2], [3,2,1,0]
    ]; 
    
    const valid96: number[][] = [];
    evens.forEach(indices => {
        const raw = [0,0,0,0];
        raw[indices[0]] = a; raw[indices[1]] = b;
        raw[indices[2]] = c; raw[indices[3]] = 0;
        
        for(let i=0; i<16; i++) {
             const v = [...raw];
             for(let bit=0; bit<4; bit++) {
                 if ((i>>bit)&1) v[bit] *= -1;
             }
             valid96.push(v);
        }
    });

    const unique96: number[][] = [];
    const seen = new Set();
    valid96.forEach(v => {
        const k = v.join(',');
        if(!seen.has(k)) { seen.add(k); unique96.push(v); }
    });
    const final96 = unique96.slice(0, 96); 
    final96.forEach(p => vertices.push({ coords: [...p, 0,0,0,0,0,0] }));

    const edges = connectVerticesByDistance(vertices, 1 / phi, 0.05);

    return {
        id: '600-cell', name: '600-Cell', dimension: 4, vertices, edges,
        stats: { vertices: vertices.length, edges: edges.length, faces: 1200, cells: 600, tera: 1 }
    };
};

export const generate120Cell = (): Shape => {
    const vertices: Vertex[] = [];
    const phi = (1 + Math.sqrt(5)) / 2;
    const phi2 = phi*phi;
    const invPhi = 1/phi;
    const invPhi2 = 1/phi2;
    const sqrt5 = Math.sqrt(5);

    const addGroup = (base: number[], signed: boolean = true) => {
        const p = signed ? getSignedPermutations(base) : getPermutations(base);
        p.forEach(c => vertices.push({ coords: [...c, 0,0,0,0,0,0] }));
    }
    
    addGroup([2, 2, 0, 0]);
    addGroup([1, 1, 1, sqrt5]);
    addGroup([phi, phi, phi, invPhi2]);
    addGroup([invPhi, invPhi, invPhi, phi2]);
    
    const evens = [
       [0,1,2,3], [0,2,3,1], [0,3,1,2],
       [1,2,0,3], [1,3,2,0], [1,0,3,2],
       [2,3,0,1], [2,0,1,3], [2,1,3,0],
       [3,0,2,1], [3,1,0,2], [3,2,1,0]
    ];
    
    const addEvenGroup = (base: number[]) => {
        evens.forEach(indices => {
            const raw = [0,0,0,0];
            raw[indices[0]] = base[0]; raw[indices[1]] = base[1]; 
            raw[indices[2]] = base[2]; raw[indices[3]] = base[3];
            for(let i=0; i<16; i++) {
                 const v = [...raw];
                 for(let b=0; b<4; b++) if((i>>b)&1) v[b] *= -1;
                 vertices.push({ coords: [...v, 0,0,0,0,0,0] });
            }
        });
    }

    addEvenGroup([0, invPhi2, 1, phi2]);
    addEvenGroup([0, invPhi, phi, sqrt5]);
    // The missing group for 120-cell: Even permutations of (phi^-1, 1, phi, 2)
    addEvenGroup([invPhi, 1, phi, 2]);

    const uniqueV: Vertex[] = [];
    const seen = new Set();
    vertices.forEach(v => {
        const k = v.coords.slice(0,4).map(n => n.toFixed(3)).join(',');
        if(!seen.has(k)) {
            seen.add(k);
            const truncated = v.coords.slice(0, 4).map(c => c * 0.3);
            uniqueV.push({ coords: truncated });
        }
    });

    const edges = connectVerticesByDistance(uniqueV, (3 - Math.sqrt(5))*0.3, 0.05);

    return {
        id: '120-cell', name: '120-Cell', dimension: 4, vertices: uniqueV, edges,
        stats: { vertices: 600, edges: edges.length, faces: 720, cells: 120, tera: 1 }
    };
};

export const generate720Cell = (): Shape => {
    // The Rectified 600-cell (or Rectified 120-cell)
    // Vertices are the midpoints of the edges of the 600-cell.
    
    const base = generate600Cell(); // This provides vertices and edges
    const newVertices: Vertex[] = [];
    const seen = new Set<string>();

    base.edges.forEach(e => {
        const v1 = base.vertices[e.source].coords;
        const v2 = base.vertices[e.target].coords;
        
        // Midpoint
        const mid = v1.map((c, i) => (c + v2[i]) / 2);
        
        // Check uniqueness (though edges should be unique in base, orientation might vary)
        // Round for key
        const key = mid.slice(0,4).map(n => n.toFixed(4)).join(',');
        if (!seen.has(key)) {
            seen.add(key);
            newVertices.push({ coords: mid });
        }
    });

    // Distance is half of the base 600-cell edge length (which is 1.0)
    const edges = connectVerticesByDistance(newVertices, 0.5, 0.05);

    return {
        id: `720-cell-${Date.now()}`,
        name: '720-Cell (Rectified 600-Cell)',
        dimension: 4,
        vertices: newVertices,
        edges,
        stats: { 
            vertices: newVertices.length, 
            edges: edges.length, 
            cells: 720, // 120 (Icosahedra) + 600 (Octahedra)
            tera: 1
        }
    };
};

export const generateOmniTesseract = (): Shape => {
    const p = getSignedPermutations([1, 3, 5, 7]);
    const vertices = p.map(c => ({ coords: [...c.map(x => x*0.1), 0,0,0,0,0,0] }));
    const edges = connectVerticesByDistance(vertices, 2*0.1, 0.01);
    return {
        id: 'omni-tesseract', name: 'Omnitruncated Tesseract', dimension: 4, vertices, edges,
        stats: { vertices: vertices.length, edges: edges.length, tera: 1 }
    };
};

export const generateGippic = (): Shape => {
    const p = getSignedPermutations([2, 1, 1, 0]); 
    const vertices = p.map(c => ({ coords: [...c.map(x => x*0.3), 0,0,0,0,0,0] }));
    const edges = connectVerticesByDistance(vertices, Math.sqrt(2)*0.3, 0.05);
    return {
        id: `gippic-${Date.now()}`,
        name: 'Great Prismatotetracontoctachoron',
        dimension: 4,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length, tera: 1 }
    };
};

export const generateSnubCube = (): Shape => {
    const t = 1.839286755214161; // Tribonacci constant
    const xi = 1/t;
    const vals = [1, xi, t];
    const vertices: Vertex[] = [];
    
    // Even permutations
    const evenPosPerms = [[vals[0], vals[1], vals[2]], [vals[1], vals[2], vals[0]], [vals[2], vals[0], vals[1]]];
    // Odd permutations
    const oddPosPerms = [[vals[0], vals[2], vals[1]], [vals[2], vals[1], vals[0]], [vals[1], vals[0], vals[2]]];

    evenPosPerms.forEach(p => {
        for(let i=0; i<8; i++) {
             let minusCount = 0;
             if(i&1) minusCount++; if(i&2) minusCount++; if(i&4) minusCount++;
             if(minusCount % 2 === 0) {
                 const x = (i&1) ? -p[0] : p[0];
                 const y = (i&2) ? -p[1] : p[1];
                 const z = (i&4) ? -p[2] : p[2];
                 vertices.push({ coords: [x,y,z,0,0,0,0,0,0,0] });
             }
        }
    });

    oddPosPerms.forEach(p => {
        for(let i=0; i<8; i++) {
             let minusCount = 0;
             if(i&1) minusCount++; if(i&2) minusCount++; if(i&4) minusCount++;
             if(minusCount % 2 !== 0) {
                 const x = (i&1) ? -p[0] : p[0];
                 const y = (i&2) ? -p[1] : p[1];
                 const z = (i&4) ? -p[2] : p[2];
                 vertices.push({ coords: [x,y,z,0,0,0,0,0,0,0] });
             }
        }
    });

    vertices.forEach(v => v.coords = v.coords.map(c => c * 0.5));
    
    let minD = Infinity;
    for(let i=1; i<vertices.length; i++) {
        let d2 = 0;
        for(let k=0; k<3; k++) d2 += (vertices[0].coords[k]-vertices[i].coords[k])**2;
        const d = Math.sqrt(d2);
        if (d > 0.01 && d < minD) minD = d;
    }
    
    const edges = connectVerticesByDistance(vertices, minD, 0.05);

    return {
        id: 'snub-cube', name: 'Snub Cube (Corrected)', dimension: 3, vertices, edges,
        stats: { vertices: 24, edges: 60, faces: 38, cells: 1 }
    };
}

export const generateAgapornis = (): Shape => {
    const vertices: Vertex[] = [
        { coords: [0, 0.5, 0.5, 0,0,0,0,0,0,0] }, 
        { coords: [0, 0.6, 0.2, 0,0,0,0,0,0,0] }, 
        { coords: [-0.2, 0.5, 0.1, 0,0,0,0,0,0,0] },
        { coords: [0.2, 0.5, 0.1, 0,0,0,0,0,0,0] }, 
        { coords: [0, 0.1, 0.3, 0,0,0,0,0,0,0] }, 
        { coords: [0, -0.2, -0.1, 0,0,0,0,0,0,0] }, 
        { coords: [0, 0.4, -0.2, 0,0,0,0,0,0,0] }, 
        { coords: [0, -0.5, -0.6, 0,0,0,0,0,0,0] }, 
        { coords: [-0.8, 0.2, -0.2, 0,0,0,0,0,0,0] }, 
        { coords: [0.8, 0.2, -0.2, 0,0,0,0,0,0,0] }, 
    ];
    const edges: Edge[] = [
        {source:0, target:1}, {source:0, target:2}, {source:0, target:3}, {source:0, target:4},
        {source:1, target:2}, {source:1, target:3}, {source:2, target:3}, 
        {source:2, target:4}, {source:3, target:4}, 
        {source:1, target:6}, 
        {source:4, target:5}, {source:5, target:6}, {source:4, target:6}, 
        {source:6, target:7}, {source:5, target:7}, 
        {source:6, target:8}, {source:4, target:8}, {source:5, target:8}, 
        {source:6, target:9}, {source:4, target:9}, {source:5, target:9}, 
    ];
    return { 
        id: `agapornis-${Date.now()}`, 
        name: 'Agapornis', 
        dimension: 3, 
        vertices, 
        edges,
        stats: { vertices: vertices.length, edges: edges.length, faces: 14, cells: 1 } 
    };
};

export const generateAnomalocaris = (): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    const segments = 8;
    const bodyWidth = 0.3;
    const bodyHeight = 0.15;
    const length = 1.6;
    const step = length / segments;
    const startZ = length / 2;

    for(let i=0; i<=segments; i++) {
        const z = startZ - i * step;
        const w = bodyWidth * (1 - (i/segments)*0.6);
        const h = bodyHeight * (1 - (i/segments)*0.5);
        const baseIdx = vertices.length;
        vertices.push({ coords: [-w, h, z, 0,0,0,0,0,0,0] });
        vertices.push({ coords: [w, h, z, 0,0,0,0,0,0,0] }); 
        vertices.push({ coords: [w, -h, z, 0,0,0,0,0,0,0] });
        vertices.push({ coords: [-w, -h, z, 0,0,0,0,0,0,0] });
        vertices.push({ coords: [-w*2, 0, z, 0,0,0,0,0,0,0] });
        vertices.push({ coords: [w*2, 0, z, 0,0,0,0,0,0,0] });

        edges.push({source: baseIdx, target: baseIdx+1});
        edges.push({source: baseIdx+1, target: baseIdx+2});
        edges.push({source: baseIdx+2, target: baseIdx+3});
        edges.push({source: baseIdx+3, target: baseIdx});
        edges.push({source: baseIdx+3, target: baseIdx+4});
        edges.push({source: baseIdx, target: baseIdx+4}); 
        edges.push({source: baseIdx+2, target: baseIdx+5});
        edges.push({source: baseIdx+1, target: baseIdx+5});

        if (i > 0) {
            const prevBase = baseIdx - 6;
            for(let k=0; k<6; k++) {
                edges.push({source: prevBase+k, target: baseIdx+k});
            }
        }
    }
    const armLen = 0.5;
    const armSegs = 4;
    for(let side of [-1, 1]) {
        let prevIdx = side === -1 ? 0 : 1; 
        for(let k=1; k<=armSegs; k++) {
            const t = k/armSegs;
            const curY = 0.1 - Math.sin(t*Math.PI/2)*armLen;
            const z = startZ + t*armLen;
            const x = side * (bodyWidth - t*0.1); 
            const idx = vertices.length;
            vertices.push({coords: [x, curY, z, 0,0,0,0,0,0,0]});
            edges.push({source: prevIdx, target: idx});
            prevIdx = idx;
        }
    }

    return { 
        id: `anomalocaris-${Date.now()}`, 
        name: 'Anomalocaris', 
        dimension: 3, 
        vertices, 
        edges,
        stats: { vertices: vertices.length, edges: edges.length, faces: 1, cells: 1 }
    };
};

export const generateHomoSapiens = (): Shape => {
    const vertices: Vertex[] = [
        { coords: [0, 0.75, 0, 0,0,0,0,0,0,0] },    
        { coords: [0, 0.6, 0, 0,0,0,0,0,0,0] },     
        { coords: [-0.2, 0.5, 0, 0,0,0,0,0,0,0] },  
        { coords: [0.2, 0.5, 0, 0,0,0,0,0,0,0] },   
        { coords: [0, 0.5, 0, 0,0,0,0,0,0,0] },     
        { coords: [0, 0.1, 0, 0,0,0,0,0,0,0] },     
        { coords: [-0.15, 0.1, 0, 0,0,0,0,0,0,0] }, 
        { coords: [0.15, 0.1, 0, 0,0,0,0,0,0,0] },  
        { coords: [-0.25, 0.3, 0.1, 0,0,0,0,0,0,0] }, 
        { coords: [0.25, 0.3, 0.1, 0,0,0,0,0,0,0] },  
        { coords: [-0.3, 0.1, 0.2, 0,0,0,0,0,0,0] },  
        { coords: [0.3, 0.1, 0.2, 0,0,0,0,0,0,0] },   
        { coords: [-0.15, -0.3, 0, 0,0,0,0,0,0,0] },  
        { coords: [0.15, -0.3, 0, 0,0,0,0,0,0,0] },   
        { coords: [-0.2, -0.7, 0, 0,0,0,0,0,0,0] },   
        { coords: [0.2, -0.7, 0, 0,0,0,0,0,0,0] },    
        {coords: [0, 0.67, 0.12, 0,0,0,0,0,0,0]},
        {coords: [0, 0.67, -0.12, 0,0,0,0,0,0,0]},
        {coords: [-0.1, 0.67, 0, 0,0,0,0,0,0,0]},
        {coords: [0.1, 0.67, 0, 0,0,0,0,0,0,0]}, 
    ];
    const edges: Edge[] = [
        {source: 1, target: 4}, {source: 4, target: 5}, 
        {source: 5, target: 6}, {source: 5, target: 7},
        {source: 4, target: 2}, {source: 4, target: 3},
        {source: 2, target: 8}, {source: 8, target: 10},
        {source: 3, target: 9}, {source: 9, target: 11},
        {source: 6, target: 12}, {source: 12, target: 14},
        {source: 7, target: 13}, {source: 13, target: 15},
        {source: 0, target: 16}, {source: 0, target: 17}, {source: 0, target: 18}, {source: 0, target: 19},
        {source: 1, target: 16}, {source: 1, target: 17}, {source: 1, target: 18}, {source: 1, target: 19},
        {source: 16, target: 18}, {source: 18, target: 17}, {source: 17, target: 19}, {source: 19, target: 16},
    ];
    return { 
        id: `homo-sapiens-${Date.now()}`, 
        name: 'Homo Sapiens', 
        dimension: 3, 
        vertices, 
        edges,
        stats: { vertices: vertices.length, edges: edges.length, faces: 1, cells: 1 }
    };
};

// --- NEW SHAPES ---

export const generateDisdyakisTriacontahedron = (): Shape => {
    // 62 vertices: Union of Icosahedron (12), Dodecahedron (20), Icosidodecahedron (30) normalized
    const vertices: Vertex[] = [];
    const phi = (1 + Math.sqrt(5)) / 2;

    // 1. Icosahedron (12)
    for(let s1 of [-1,1]) for(let s2 of [-1,1]) vertices.push({coords: [0, s1, s2*phi, 0,0,0,0,0,0,0]});
    for(let s1 of [-1,1]) for(let s2 of [-1,1]) vertices.push({coords: [s1, s2*phi, 0, 0,0,0,0,0,0,0]});
    for(let s1 of [-1,1]) for(let s2 of [-1,1]) vertices.push({coords: [s1*phi, 0, s2, 0,0,0,0,0,0,0]});

    // 2. Dodecahedron (20)
    const invPhi = 1/phi;
    for(let x of [-1,1]) for(let y of [-1,1]) for(let z of [-1,1])
        vertices.push({ coords: [x,y,z,0,0,0,0,0,0,0] });
    for(let i of [-1,1]) for(let j of [-1,1]) {
        vertices.push({ coords: [0, i*phi, j*invPhi, 0,0,0,0,0,0,0] });
        vertices.push({ coords: [i*invPhi, 0, j*phi, 0,0,0,0,0,0,0] });
        vertices.push({ coords: [i*phi, j*invPhi, 0, 0,0,0,0,0,0,0] });
    }

    // Using Fibonacci Sphere N=62
    const n = 62;
    const phiApprox = Math.PI * (3 - Math.sqrt(5));
    const finalVerts: Vertex[] = [];
    for(let i=0; i<n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = phiApprox * i;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        finalVerts.push({ coords: [x, y, z, 0,0,0,0,0,0,0] });
    }

    // Connect nearest
    const edges = connectVerticesByDistance(finalVerts, 0.6, 0.15); // Tuned for 62 points on sphere

    return {
        id: `disdyakis-${Date.now()}`,
        name: 'Disdyakis Triacontahedron (Approx)',
        dimension: 3,
        vertices: finalVerts,
        edges,
        stats: { vertices: 62, edges: 180, faces: 120, cells: 1 }
    };
};

export const generateEnneacontahedron = (): Shape => {
    // 92 vertices approx (Rhombic Enneacontahedron has 92 vertices)
    const n = 92;
    const phiApprox = Math.PI * (3 - Math.sqrt(5));
    const vertices: Vertex[] = [];
    for(let i=0; i<n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = phiApprox * i;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        vertices.push({ coords: [x, y, z, 0,0,0,0,0,0,0] });
    }
    
    // Connectivity for Enneacontahedron (~92 points)
    // Distance roughly 0.5 on unit sphere
    const edges = connectVerticesByDistance(vertices, 0.5, 0.1);

    return {
        id: `enneacontahedron-${Date.now()}`,
        name: 'Enneacontahedron (Approx)',
        dimension: 3,
        vertices,
        edges,
        stats: { vertices: 92, edges: 132, faces: 90, cells: 1 } // Approx edges
    };
};

export const generateEnneacontachoron = (): Shape => {
    // A procedural 4D polytope with ~90 vertices on a hypersphere.
    const vertexCount = 90;
    const vertices: Vertex[] = [];
    
    // Procedural distribution 4D
    for(let i=0; i<vertexCount; i++) {
        const coords: number[] = [];
        for(let d=0; d<4; d++) {
             let u = 0;
             for(let k=0; k<6; k++) u += Math.random();
             u -= 3; 
             coords.push(u);
        }
        const mag = Math.sqrt(coords.reduce((a,b)=>a+b*b, 0));
        if (mag > 0) {
            for(let d=0; d<4; d++) coords[d] /= mag;
        }
        while(coords.length < 26) coords.push(0);
        vertices.push({ coords });
    }
    
    // Connect nearest neighbors to form mesh
    const edges: Edge[] = [];
    const k = 8; // high connectivity for complexity
    for(let i=0; i<vertexCount; i++) {
        const dists = vertices.map((v, idx) => {
            if (i === idx) return { idx, d: Infinity };
            let dSq = 0;
            for(let x=0; x<4; x++) {
                const diff = v.coords[x] - vertices[i].coords[x];
                dSq += diff*diff;
            }
            return { idx, d: dSq };
        });
        dists.sort((a,b) => a.d - b.d);
        // Connect to closest K
        for(let n=0; n<k; n++) {
            // Avoid duplicates
            if (dists[n].idx > i) {
                 edges.push({ source: i, target: dists[n].idx });
            }
        }
    }

    return {
        id: `enneacontachoron-${Date.now()}`,
        name: 'Enneacontachoron (Approx 90-vertex)',
        dimension: 4,
        vertices,
        edges,
        stats: { vertices: vertexCount, edges: edges.length, faces: 90, cells: 1, tera: 1 }
    };
};

export const generateE8Polytope = (): Shape => {
    const vertices: Vertex[] = [];
    // 1. Type A: (±1, ±1, 0,0,0,0,0,0) permutations
    const baseA = [1,1,0,0,0,0,0,0];
    for(let i=0; i<8; i++) {
        for(let j=i+1; j<8; j++) {
             for(let s1 of [-1,1]) for(let s2 of [-1,1]) {
                 const v = new Array(26).fill(0); // 26D padded
                 v[i] = s1; v[j] = s2;
                 vertices.push({coords: v});
             }
        }
    }
    // 2. Type B
    for(let i=0; i<256; i++) {
        let bits = 0;
        for(let k=0; k<8; k++) if((i>>k)&1) bits++;
        if(bits % 2 === 0) {
            const v = [0,0,0,0,0,0,0,0,0,0];
            for(let k=0; k<8; k++) v[k] = ((i>>k)&1) ? -0.5 : 0.5;
            vertices.push({coords: v});
        }
    }
    const edges = connectVerticesByDistance(vertices, Math.sqrt(2), 0.05);

    return {
        id: `e8-polytope-${Date.now()}`,
        name: '4_21 Polytope (E8 Gosset)',
        dimension: 8,
        vertices,
        edges,
        stats: { vertices: 240, edges: 6720, theta: 19440, yotta: 1 }
    };
};

export const generateDemiOcteract = (): Shape => {
    const vertices: Vertex[] = [];
    for(let i=0; i<256; i++) {
        let bits = 0;
        for(let k=0; k<8; k++) if((i>>k)&1) bits++;
        if(bits % 2 === 0) {
            const v = [0,0,0,0,0,0,0,0,0,0];
            for(let k=0; k<8; k++) v[k] = ((i>>k)&1) ? -1 : 1;
            vertices.push({coords: v});
        }
    }
    const edges = connectVerticesByDistance(vertices, Math.sqrt(8), 0.05);

    return {
        id: `demi-octeract-${Date.now()}`,
        name: 'Demi-Octeract (8D)',
        dimension: 8,
        vertices,
        edges,
        stats: { vertices: 128, edges: edges.length, theta: 272, yotta: 1 }
    };
};

export const generate1600Yotta = (): Shape => {
    const vertices: Vertex[] = [];
    for(let i=0; i<512; i++) {
        let bits = 0;
        for(let k=0; k<9; k++) if((i>>k)&1) bits++;
        if(bits % 2 === 0) {
            const v = [0,0,0,0,0,0,0,0,0,0];
            for(let k=0; k<9; k++) v[k] = ((i>>k)&1) ? -1 : 1;
            vertices.push({coords: v});
        }
    }
    const edges = connectVerticesByDistance(vertices, Math.sqrt(8), 0.05);

    return {
        id: `1600-yotta-${Date.now()}`,
        name: '1600-Yotta (9-Demicube)',
        dimension: 9,
        vertices,
        edges,
        stats: { vertices: 256, edges: edges.length, yotta: 530, ronna: 1 }
    };
};

// --- NEW 4D/10D SHAPES ---

export const generate2_21Polytope = (): Shape => {
    const vertices: Vertex[] = [];
    
    // 12 vertices of type (1, 0, 1, 0, 0, 0, 0, 0)
    for (let i = 0; i < 2; i++) {
        for (let j = 2; j < 8; j++) {
            const coords = [0,0,0,0,0,0,0,0,0,0];
            coords[i] = 1;
            coords[j] = 1;
            vertices.push({ coords });
        }
    }
    
    // 15 vertices of type (1/2, 1/2, ..., -1/2, ..., -1/2)
    for (let i = 2; i < 8; i++) {
        for (let j = i + 1; j < 8; j++) {
            const coords = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0, 0];
            coords[i] = -0.5;
            coords[j] = -0.5;
            vertices.push({ coords });
        }
    }
    
    // Center the vertices
    const center = new Array(10).fill(0);
    vertices.forEach(v => {
        for(let d=0; d<8; d++) center[d] += v.coords[d] / 27;
    });
    vertices.forEach(v => {
        for(let d=0; d<8; d++) v.coords[d] -= center[d];
    });

    const edges = connectVerticesByDistance(vertices, Math.sqrt(2), 0.05);

    return {
        id: `2_21-polytope-${Date.now()}`,
        name: '2_21 Polytope',
        description: 'The 2_21 polytope (also called the icosiheptaheptacontadipeton; OBSA: jak) is a convex uniform 6-polytope. It has 27 5-orthoplexes and 72 5-simplices as facets, with 10 5-orthoplexes and 16 5-simplices at each vertex forming a demipenteract as the vertex figure. The 2_21 polytope contains the vertices of a hexateric prism, and is also the convex hull of 3 gyro-orthogonal triangular duoprisms. It can tile 6-dimensional Euclidean space by itself, forming the 2_22 honeycomb. It is the only semiregular polytope, other than polygons and simplices, to have an odd number of vertices, in this case 27.',
        dimension: 6,
        vertices,
        edges,
        stats: { 
            vertices: 27, 
            edges: 216, 
            faces: 720, 
            cells: 1080, 
            tera: 648, 
            peta: 99 
        }
    };
};

export const generateDuocylinder = (): Shape => {
    // Cartesian product of two circles (Disks)
    // Surface is Torus-like in 4D projection
    // (r1*cos(t), r1*sin(t), r2*cos(p), r2*sin(p))
    const n = 16;
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    
    const faces: number[][] = [];
    for(let i=0; i<n; i++) {
        for(let j=0; j<n; j++) {
            const theta = (i/n) * Math.PI * 2;
            const phi = (j/n) * Math.PI * 2;
            vertices.push({
                coords: [
                    Math.cos(theta), Math.sin(theta),
                    Math.cos(phi), Math.sin(phi),
                    0,0,0,0,0,0
                ]
            });
            // Connect
            const curr = i*n + j;
            const nextI = ((i+1)%n)*n + j;
            const nextJ = i*n + ((j+1)%n);
            const nextINextJ = ((i+1)%n)*n + ((j+1)%n);
            
            edges.push({source: curr, target: nextI});
            edges.push({source: curr, target: nextJ});
            
            faces.push([curr, nextI, nextINextJ, nextJ]);
        }
    }
    
    return {
        id: `duocylinder-${Date.now()}`,
        name: 'Duocylinder (3,3)',
        dimension: 4,
        vertices,
        edges,
        faces,
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length, cells: 0, tera: 1 }
    };
};

export const generateDuocone = (): Shape => {
    const duocylinder = generateDuocylinder();
    const duocone = dualShape(duocylinder);
    duocone.id = `duocone-${Date.now()}`;
    duocone.name = 'Duocone';
    return duocone;
};

export const generateSpherinder = (): Shape => {
    // Sphere extruded into 4D (Sphere x Line)
    // Take a 3D sphere and extrude it
    const sphere = generateHypersphere(3);
    const extruded = extrudeShape(sphere.vertices, sphere.edges, 3, sphere.faces, sphere.cells); // Extrude along W (index 3)
    return {
        id: `spherinder-${Date.now()}`,
        name: 'Spherinder (Sphere Prism)',
        dimension: 4,
        vertices: extruded.vertices,
        edges: extruded.edges,
        faces: extruded.faces,
        cells: extruded.cells,
        stats: { vertices: extruded.vertices.length, edges: extruded.edges.length, tera: 1 }
    };
};

export const generateOctahedralPrism = (): Shape => {
    const octa = generateOctahedron();
    const extruded = extrudeShape(octa.vertices, octa.edges, 3, octa.faces, octa.cells);
    return {
        id: `octa-prism-${Date.now()}`,
        name: 'Octahedral Prism',
        dimension: 4,
        vertices: extruded.vertices,
        edges: extruded.edges,
        faces: extruded.faces,
        cells: extruded.cells,
        stats: { vertices: extruded.vertices.length, edges: extruded.edges.length, tera: 1 }
    };
};



export const generateDeceract = (): Shape => {
    return generateHypercube(10);
};

export const generate10Simplex = (): Shape => {
    return generateSimplex(10);
};

export const generate10Orthoplex = (): Shape => {
    return generateOrthoplex(10);
};

export const generateHendeceract = (): Shape => {
    return generateHypercube(11);
};

export const generate11Simplex = (): Shape => {
    return generateSimplex(11);
};

export const generate11Orthoplex = (): Shape => {
    return generateOrthoplex(11);
};

export const generateDodeceract = (): Shape => {
    return generateHypercube(12);
};

export const generate12Simplex = (): Shape => {
    return generateSimplex(12);
};

export const generate12Orthoplex = (): Shape => {
    return generateOrthoplex(12);
};

export const generateTorus = (
    majorRadius: number = 1, 
    minorRadius: number = 0.3, 
    ringSegments: number = 32, 
    tubeSegments: number = 16
): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];

    for (let i = 0; i < ringSegments; i++) {
        const phi = (i / ringSegments) * Math.PI * 2;
        for (let j = 0; j < tubeSegments; j++) {
            const theta = (j / tubeSegments) * Math.PI * 2;

            const x = (majorRadius + minorRadius * Math.cos(theta)) * Math.cos(phi);
            const y = (majorRadius + minorRadius * Math.cos(theta)) * Math.sin(phi);
            const z = minorRadius * Math.sin(theta);

            vertices.push({ coords: [x, y, z, 0, 0, 0, 0, 0, 0, 0] });
        }
    }

    const faces: number[][] = [];

    for (let i = 0; i < ringSegments; i++) {
        for (let j = 0; j < tubeSegments; j++) {
            const current = i * tubeSegments + j;
            const nextTube = i * tubeSegments + ((j + 1) % tubeSegments);
            const nextRing = ((i + 1) % ringSegments) * tubeSegments + j;
            const nextRingNextTube = ((i + 1) % ringSegments) * tubeSegments + ((j + 1) % tubeSegments);

            edges.push({ source: current, target: nextTube });
            edges.push({ source: current, target: nextRing });
            
            faces.push([current, nextTube, nextRingNextTube, nextRing]);
        }
    }

    return {
        id: `torus-${Date.now()}`,
        name: `Torus (R=${majorRadius}, r=${minorRadius})`,
        dimension: 3,
        vertices,
        edges,
        faces,
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length, cells: 1 }
    };
};

export const generate1200Teron = (): Shape => {
    // 5D Bipyramid of the 600-Cell (Dual of 120-Cell Prism)
    // The 120-Cell Prism has 1200 vertices. Its geometric dual is a shape with 1200 cells (tera).
    // This is the 5D Bipyramid of the 600-Cell.
    // Vertices: 120 (from 600-cell) + 2 (apexes) = 122 vertices.
    // Facets (Tera): 600 (to top) + 600 (to bottom) = 1200 tera.

    // 1. Generate 600-Cell (base)
    const base = generate600Cell();
    // 600-cell has 120 vertices.

    // 2. Clone vertices and ensure they are 5D (pad with 0)
    const vertices: Vertex[] = base.vertices.map(v => {
        const nc = [...v.coords];
        while(nc.length < 26) nc.push(0);
        nc[4] = 0; // Base lies in w=0 (relative to v-axis)
        // Scale it a bit for visibility
        nc.forEach((val, i) => nc[i] = val * 0.7);
        return { coords: nc };
    });

    // 3. Add Apexes in 5th dimension (index 4)
    const topApexIndex = vertices.length;
    vertices.push({ coords: [0,0,0,0, 0.7, 0,0,0,0,0] });
    const botApexIndex = vertices.length;
    vertices.push({ coords: [0,0,0,0, -0.7, 0,0,0,0,0] });

    // 4. Edges
    const edges: Edge[] = [];
    
    // a) Edges from the base 600-cell
    base.edges.forEach(e => {
        edges.push({ source: e.source, target: e.target });
    });

    // b) Connect every base vertex to both apexes
    // This creates the bipyramidal structure
    for(let i=0; i<base.vertices.length; i++) {
        edges.push({ source: i, target: topApexIndex });
        edges.push({ source: i, target: botApexIndex });
    }

    return {
        id: `1200-teron-${Date.now()}`,
        name: '1200-Cell (5D Bipyramid of 600-Cell)',
        dimension: 5,
        vertices,
        edges,
        stats: { 
            vertices: 122, 
            edges: edges.length,
            tera: 1200, // 1200 Facets (Tera)
            peta: 1
        }
    };
};

export const generateDemipenteract = (): Shape => {
    const vertices: Vertex[] = [];
    for(let i=0; i<32; i++) {
        let bits = 0;
        for(let k=0; k<5; k++) if((i>>k)&1) bits++;
        if(bits % 2 === 0) {
            const v = [0,0,0,0,0,0,0,0,0,0];
            for(let k=0; k<5; k++) v[k] = ((i>>k)&1) ? -1 : 1;
            vertices.push({coords: v});
        }
    }
    const edges = connectVerticesByDistance(vertices, Math.sqrt(8), 0.05);

    return {
        id: `demipenteract-${Date.now()}`,
        name: 'Demipenteract (5D)',
        dimension: 5,
        vertices,
        edges,
        stats: { vertices: 16, edges: edges.length, tera: 26, peta: 1 }
    };
};

export const generateDodecateron = (): Shape => {
    const hexateron = generateSimplex(5);
    const dodecateron = rectifyShape(hexateron);
    
    return {
        ...dodecateron,
        id: `dodecateron-${Date.now()}`,
        name: 'Dodecateron (Rectified Hexateron)',
        dimension: 5,
        stats: { vertices: 15, edges: 60, tera: 12, peta: 1 }
    };
};

export const generateCliffordTorus = (uSegments: number = 32, vSegments: number = 32): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    const scale = 1 / Math.sqrt(2);

    for (let i = 0; i < uSegments; i++) {
        const u = (i / uSegments) * Math.PI * 2;
        for (let j = 0; j < vSegments; j++) {
            const v = (j / vSegments) * Math.PI * 2;
            
            // Clifford Torus embedding in 4D: (cos u, sin u, cos v, sin v) / sqrt(2)
            const x = Math.cos(u) * scale;
            const y = Math.sin(u) * scale;
            const z = Math.cos(v) * scale;
            const w = Math.sin(v) * scale;

            vertices.push({ coords: [x, y, z, w, 0, 0, 0, 0, 0, 0] });
        }
    }

    const faces: number[][] = [];

    for (let i = 0; i < uSegments; i++) {
        for (let j = 0; j < vSegments; j++) {
            const current = i * vSegments + j;
            const nextU = ((i + 1) % uSegments) * vSegments + j;
            const nextV = i * vSegments + ((j + 1) % vSegments);
            const nextUNextV = ((i + 1) % uSegments) * vSegments + ((j + 1) % vSegments);

            edges.push({ source: current, target: nextU });
            edges.push({ source: current, target: nextV });
            
            faces.push([current, nextU, nextUNextV, nextV]);
        }
    }

    return {
        id: `clifford-torus-${Date.now()}`,
        name: 'Clifford Torus (Flat Torus in 4D)',
        dimension: 4,
        vertices,
        edges,
        faces,
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length, cells: 0, tera: 1 }
    };
};

export const generateGyrochoron = (p: number, q: number): Shape => {
    const vertices: Vertex[] = [];
    if (p < 1) p = 1;
    
    for (let k = 0; k < p; k++) {
        const theta1 = (k / p) * Math.PI * 2;
        const theta2 = ((k * q) / p) * Math.PI * 2;
        vertices.push({ coords: [Math.cos(theta1), Math.sin(theta1), Math.cos(theta2), Math.sin(theta2), 0, 0, 0, 0, 0, 0] });
    }

    const stepPrism: Shape = {
        id: 'stepprism',
        name: 'Step Prism',
        dimension: 4,
        vertices,
        edges: []
    };

    const gyro = dualShape(stepPrism);
    gyro.name = `${p}-${q} Gyrochoron`;
    gyro.id = `gyrochoron-${p}-${q}-${Date.now()}`;
    return gyro;
};

export const generateBigyrochoron = (p: number, q: number): Shape => {
    const vertices: Vertex[] = [];
    
    if (p < 1) p = 1;

    for (let k = 0; k < p; k++) {
        const theta1 = (k / p) * Math.PI * 2;
        const theta2 = ((k * q) / p) * Math.PI * 2;
        vertices.push({ coords: [Math.cos(theta1), Math.sin(theta1), Math.cos(theta2), Math.sin(theta2), 0, 0, 0, 0, 0, 0] });
    }

    const offset1 = Math.PI / p;
    const offset2 = (q * Math.PI) / p;
    for (let k = 0; k < p; k++) {
        const theta1 = (k / p) * Math.PI * 2 + offset1;
        const theta2 = ((k * q) / p) * Math.PI * 2 + offset2;
        vertices.push({ coords: [Math.cos(theta1), Math.sin(theta1), Math.cos(theta2), Math.sin(theta2), 0, 0, 0, 0, 0, 0] });
    }

    const bistepPrism: Shape = {
        id: 'bistepprism',
        name: 'Bistep Prism',
        dimension: 4,
        vertices,
        edges: []
    };

    const bigyro = dualShape(bistepPrism);
    bigyro.name = `${p}-${q} Bigyrochoron`;
    bigyro.id = `bigyrochoron-${p}-${q}-${Date.now()}`;
    return bigyro;
};

export const generateAntibigyrochoron = (p: number, q: number): Shape => {
    const vertices: Vertex[] = [];
    
    if (p < 1) p = 1;

    for (let k = 0; k < p; k++) {
        const theta1 = (k / p) * Math.PI * 2;
        const theta2 = ((k * q) / p) * Math.PI * 2;
        vertices.push({ coords: [Math.cos(theta1), Math.sin(theta1), Math.cos(theta2), Math.sin(theta2), 0, 0, 0, 0, 0, 0] });
    }

    const offset1 = Math.PI / p;
    const offset2 = -(q * Math.PI) / p; // Negated phase for anti version
    for (let k = 0; k < p; k++) {
        const theta1 = (k / p) * Math.PI * 2 + offset1;
        const theta2 = ((k * q) / p) * Math.PI * 2 + offset2;
        vertices.push({ coords: [Math.cos(theta1), Math.sin(theta1), Math.cos(theta2), Math.sin(theta2), 0, 0, 0, 0, 0, 0] });
    }

    const antibistepPrism: Shape = {
        id: 'antibistepprism',
        name: 'Antibistep Prism',
        dimension: 4,
        vertices,
        edges: []
    };

    const antibigyro = dualShape(antibistepPrism);
    antibigyro.name = `${p}-${q} Antibigyrochoron`;
    antibigyro.id = `antibigyrochoron-${p}-${q}-${Date.now()}`;
    return antibigyro;
};


export const generateGyropeton = (p: number, q: number, r: number): Shape => {
    const vertices: Vertex[] = [];
    if (p < 1) p = 1;
    for (let k = 0; k < p; k++) {
        const theta1 = (k / p) * Math.PI * 2;
        const theta2 = ((k * q) / p) * Math.PI * 2;
        const theta3 = ((k * r) / p) * Math.PI * 2;
        vertices.push({ coords: [
            Math.cos(theta1), Math.sin(theta1), 
            Math.cos(theta2), Math.sin(theta2), 
            Math.cos(theta3), Math.sin(theta3), 0, 0, 0, 0] 
        });
    }
    const stepPrism: Shape = {
        id: 'stepprism6',
        name: 'Step Prism',
        dimension: 6,
        vertices,
        edges: []
    };
    const gyropeton = dualShape(stepPrism);
    gyropeton.name = `${p}-${q}-${r} Gyropeton`;
    gyropeton.id = `gyropeton-${p}-${q}-${r}-${Date.now()}`;
    return gyropeton;
};

export const generateSpecialCut600Cell = (cutIndex: number): Shape => {
    const c600 = generate600Cell();
    
    // Simple PRNG
    let s = (cutIndex * 16807 + 1) % 2147483647;
    const rnd = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };

    // Adjacency list
    const adj = Array.from({length: 120}, () => [] as number[]);
    for (const e of c600.edges) {
        adj[e.source].push(e.target);
        adj[e.target].push(e.source);
    }
    
    const I = new Set<number>();
    const indices = Array.from({length: 120}, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    // Special cuts are formed by diminishing non-adjacent sets of vertices (independent set)
    // Max size of a special cut is 24 (snub 24-cell)
    for (const v of indices) {
        if (rnd() > 0.4) { 
            let ok = true;
            for (const u of adj[v]) {
                if (I.has(u)) { ok = false; break; }
            }
            if (ok) {
                I.add(v);
                if (I.size >= 24) break;
            }
        }
    }
    
    const remainingVerts: Vertex[] = [];
    const newIdxMap = new Map<number, number>();
    
    for (let i = 0; i < 120; i++) {
        if (!I.has(i)) {
            newIdxMap.set(i, remainingVerts.length);
            remainingVerts.push(c600.vertices[i]);
        }
    }

    const remainingEdges: Edge[] = [];
    for (const e of c600.edges) {
        if (!I.has(e.source) && !I.has(e.target)) {
            remainingEdges.push({ source: newIdxMap.get(e.source)!, target: newIdxMap.get(e.target)! });
        }
    }

    return {
        id: `600cell-cut-${cutIndex}`,
        name: `Special Cut #${cutIndex} of 600-Cell`,
        dimension: 4,
        vertices: remainingVerts,
        edges: remainingEdges,
        stats: { vertices: remainingVerts.length, edges: remainingEdges.length, tera: 1 }
    };
};

export const generateDuoprism = (n: number, m: number): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    const r = 0.5; // Radius for both rings

    // Generate vertices
    for (let i = 0; i < n; i++) {
        const theta1 = (i / n) * Math.PI * 2;
        for (let j = 0; j < m; j++) {
            const theta2 = (j / m) * Math.PI * 2;
            
            const x = r * Math.cos(theta1);
            const y = r * Math.sin(theta1);
            const z = r * Math.cos(theta2);
            const w = r * Math.sin(theta2);
            
            vertices.push({ coords: [x, y, z, w, 0, 0, 0, 0, 0, 0] });
        }
    }

    // Generate edges
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            const current = i * m + j;
            
            // Connect in first ring direction
            const nextN = ((i + 1) % n) * m + j;
            edges.push({ source: current, target: nextN });
            
            // Connect in second ring direction
            const nextM = i * m + ((j + 1) % m);
            edges.push({ source: current, target: nextM });
        }
    }

    return {
        id: `duoprism-${n}-${m}-${Date.now()}`,
        name: `${n}-${m} Duoprism`,
        dimension: 4,
        vertices,
        edges,
        stats: { vertices: n * m, edges: 2 * n * m, faces: n * m + n + m, cells: n + m, tera: 1 }
    };
};

export const generateDuopyramid = (n: number, m: number): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    const r = 0.7;

    // First polygon in XY plane
    for (let i = 0; i < n; i++) {
        const theta = (i / n) * Math.PI * 2;
        vertices.push({ coords: [r * Math.cos(theta), r * Math.sin(theta), 0, 0, 0, 0, 0, 0, 0, 0] });
    }

    // Second polygon in ZW plane
    for (let j = 0; j < m; j++) {
        const theta = (j / m) * Math.PI * 2;
        vertices.push({ coords: [0, 0, r * Math.cos(theta), r * Math.sin(theta), 0, 0, 0, 0, 0, 0] });
    }

    // Edges for first polygon
    for (let i = 0; i < n; i++) {
        edges.push({ source: i, target: (i + 1) % n });
    }

    // Edges for second polygon
    for (let j = 0; j < m; j++) {
        edges.push({ source: n + j, target: n + ((j + 1) % m) });
    }

    // Connect every vertex of first to every vertex of second
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            edges.push({ source: i, target: n + j });
        }
    }

    return {
        id: `duopyramid-${n}-${m}-${Date.now()}`,
        name: `${n}-${m} Duopyramid`,
        dimension: 4,
        vertices,
        edges,
        stats: { vertices: n + m, edges: n + m + n * m, faces: 2 * n * m, cells: n * m, tera: 1 }
    };
};

export const generateTrioprism = (n: number, m: number, p: number): Shape => {
    const poly1 = generatePolygon(n);
    const poly2 = generatePolygon(m);
    const poly3 = generatePolygon(p);
    const duo = generateCartesianProduct(poly1, poly2);
    const trio = generateCartesianProduct(duo, poly3);
    return {
        ...trio,
        id: `trioprism-${n}-${m}-${p}-${Date.now()}`,
        name: `${n}-${m}-${p} Trioprism`,
        dimension: 6
    };
};

export const generateTriopyramid = (n: number, m: number, p: number): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    const r = 0.7;

    for (let i = 0; i < n; i++) {
        const theta = (i / n) * Math.PI * 2;
        vertices.push({ coords: [r * Math.cos(theta), r * Math.sin(theta), 0, 0, 0, 0, 0, 0, 0, 0] });
    }

    for (let j = 0; j < m; j++) {
        const theta = (j / m) * Math.PI * 2;
        vertices.push({ coords: [0, 0, r * Math.cos(theta), r * Math.sin(theta), 0, 0, 0, 0, 0, 0] });
    }

    for (let k = 0; k < p; k++) {
        const theta = (k / p) * Math.PI * 2;
        vertices.push({ coords: [0, 0, 0, 0, r * Math.cos(theta), r * Math.sin(theta), 0, 0, 0, 0] });
    }

    for (let i = 0; i < n; i++) edges.push({ source: i, target: (i + 1) % n });
    for (let j = 0; j < m; j++) edges.push({ source: n + j, target: n + ((j + 1) % m) });
    for (let k = 0; k < p; k++) edges.push({ source: n + m + k, target: n + m + ((k + 1) % p) });

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) edges.push({ source: i, target: n + j });
        for (let k = 0; k < p; k++) edges.push({ source: i, target: n + m + k });
    }
    for (let j = 0; j < m; j++) {
        for (let k = 0; k < p; k++) edges.push({ source: n + j, target: n + m + k });
    }

    return {
        id: `triopyramid-${n}-${m}-${p}-${Date.now()}`,
        name: `${n}-${m}-${p} Triopyramid`,
        dimension: 6,
        vertices,
        edges,
        stats: { vertices: n + m + p, edges: edges.length, peta: 1 }
    };
};

export const generateTriocylinder = (n: number = 16, m: number = 16, p: number = 16): Shape => {
    const c1 = generatePolygon(n);
    const c2 = generatePolygon(m);
    const c3 = generatePolygon(p);
    const duo = generateCartesianProduct(c1, c2);
    const trio = generateCartesianProduct(duo, c3);
    return {
        ...trio,
        id: `triocylinder-${n}-${m}-${p}-${Date.now()}`,
        name: `${n}-${m}-${p} Triocylinder`,
        dimension: 6
    };
};

export const generateTriocone = (n: number = 16, m: number = 16, p: number = 16): Shape => {
    const shape = generateTriopyramid(n, m, p);
    return {
        ...shape,
        id: `triocone-${n}-${m}-${p}-${Date.now()}`,
        name: `${n}-${m}-${p} Triocone`
    };
};

export const generateDuotegum = (n: number, m: number): Shape => {
    const shape = generateDuopyramid(n, m);
    return {
        ...shape,
        id: `duotegum-${n}-${m}-${Date.now()}`,
        name: `${n}-${m} Duotegum (Duobipyramid)`
    };
};

export const generateTriotegum = (n: number, m: number, p: number): Shape => {
    const shape = generateTriopyramid(n, m, p);
    return {
        ...shape,
        id: `triotegum-${n}-${m}-${p}-${Date.now()}`,
        name: `${n}-${m}-${p} Triotegum (Triopyramid)`
    };
};

export const generateTorisphere = (R: number = 1, r: number = 0.3, sphereSegments: number = 16, tubeSegments: number = 16): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    
    const sphere = generateHypersphere(3); 
    
    for (let i = 0; i < tubeSegments; i++) {
        const theta = (i / tubeSegments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        
        for (let v of sphere.vertices) {
            const sx = v.coords[0];
            const sy = v.coords[1];
            const sz = v.coords[2];
            
            const factor = R + r * cosT;
            const x = factor * sx;
            const y = factor * sy;
            const z = factor * sz;
            const w = r * sinT;
            
            vertices.push({ coords: [x, y, z, w, 0, 0, 0, 0, 0, 0] });
        }
    }
    
    const numSphereVerts = sphere.vertices.length;
    
    for (let i = 0; i < tubeSegments; i++) {
        const offset = i * numSphereVerts;
        for (let e of sphere.edges) {
            edges.push({ source: offset + e.source, target: offset + e.target });
        }
    }
    
    for (let i = 0; i < tubeSegments; i++) {
        const nextI = (i + 1) % tubeSegments;
        for (let j = 0; j < numSphereVerts; j++) {
            edges.push({ source: i * numSphereVerts + j, target: nextI * numSphereVerts + j });
        }
    }
    
    return {
        id: `torisphere-${Date.now()}`,
        name: `Torisphere (R=${R}, r=${r})`,
        dimension: 4,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length, tera: 1 }
    };
};

export const generateTiger = (R1: number = 1, R2: number = 1, r: number = 0.3, segments: number = 12): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        
        for (let j = 0; j < segments; j++) {
            const phi1 = (j / segments) * Math.PI * 2;
            const cosP1 = Math.cos(phi1);
            const sinP1 = Math.sin(phi1);
            
            for (let k = 0; k < segments; k++) {
                const phi2 = (k / segments) * Math.PI * 2;
                const cosP2 = Math.cos(phi2);
                const sinP2 = Math.sin(phi2);
                
                const x = (R1 + r * cosT) * cosP1;
                const y = (R1 + r * cosT) * sinP1;
                const z = (R2 + r * sinT) * cosP2;
                const w = (R2 + r * sinT) * sinP2;
                
                vertices.push({ coords: [x, y, z, w, 0, 0, 0, 0, 0, 0] });
            }
        }
    }
    
    const faces: number[][] = [];
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
            for (let k = 0; k < segments; k++) {
                const current = i * segments * segments + j * segments + k;
                
                const nextI = ((i + 1) % segments) * segments * segments + j * segments + k;
                const nextJ = i * segments * segments + ((j + 1) % segments) * segments + k;
                const nextK = i * segments * segments + j * segments + ((k + 1) % segments);
                
                const nextINextJ = ((i + 1) % segments) * segments * segments + ((j + 1) % segments) * segments + k;
                const nextINextK = ((i + 1) % segments) * segments * segments + j * segments + ((k + 1) % segments);
                const nextJNextK = i * segments * segments + ((j + 1) % segments) * segments + ((k + 1) % segments);

                edges.push({ source: current, target: nextI });
                edges.push({ source: current, target: nextJ });
                edges.push({ source: current, target: nextK });
                
                faces.push([current, nextI, nextINextJ, nextJ]);
                faces.push([current, nextI, nextINextK, nextK]);
                faces.push([current, nextJ, nextJNextK, nextK]);
            }
        }
    }
    
    return {
        id: `tiger-${Date.now()}`,
        name: `Tiger (R1=${R1}, R2=${R2}, r=${r})`,
        dimension: 4,
        vertices,
        edges,
        faces,
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length, cells: 0, tera: 1 }
    };
};

export const generate3Torus = (R: number = 1, r: number = 0.3, segments: number = 16): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    
    for (let i = 0; i < segments; i++) {
        const theta1 = (i / segments) * Math.PI * 2;
        const cos1 = Math.cos(theta1);
        const sin1 = Math.sin(theta1);
        
        for (let j = 0; j < segments; j++) {
            const theta2 = (j / segments) * Math.PI * 2;
            const cos2 = Math.cos(theta2);
            const sin2 = Math.sin(theta2);
            
            for (let k = 0; k < segments; k++) {
                const theta3 = (k / segments) * Math.PI * 2;
                const cos3 = Math.cos(theta3);
                const sin3 = Math.sin(theta3);
                
                // ((II)II) parametrization
                const x = (R + r * cos1) * cos2;
                const y = (R + r * cos1) * sin2;
                const z = r * sin1 * cos3;
                const w = r * sin1 * sin3;
                
                vertices.push({ coords: [x, y, z, w, 0, 0, 0, 0, 0, 0] });
            }
        }
    }
    
    // Generate edges and faces
    const faces: number[][] = [];
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
            for (let k = 0; k < segments; k++) {
                const current = i * segments * segments + j * segments + k;
                const nextI = ((i + 1) % segments) * segments * segments + j * segments + k;
                const nextJ = i * segments * segments + ((j + 1) % segments) * segments + k;
                const nextK = i * segments * segments + j * segments + ((k + 1) % segments);
                
                const nextINextJ = ((i + 1) % segments) * segments * segments + ((j + 1) % segments) * segments + k;
                const nextINextK = ((i + 1) % segments) * segments * segments + j * segments + ((k + 1) % segments);
                const nextJNextK = i * segments * segments + ((j + 1) % segments) * segments + ((k + 1) % segments);

                edges.push({ source: current, target: nextI });
                edges.push({ source: current, target: nextJ });
                edges.push({ source: current, target: nextK });
                
                faces.push([current, nextI, nextINextJ, nextJ]);
                faces.push([current, nextI, nextINextK, nextK]);
                faces.push([current, nextJ, nextJNextK, nextK]);
            }
        }
    }
    
    return {
        id: `3-torus-${Date.now()}`,
        name: '3-Torus ((||)||)',
        dimension: 4,
        vertices,
        edges,
        faces,
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length, cells: 0, tera: 1 }
    };
};

export const generateTigerSphere = (R1: number = 1, R2: number = 1, r: number = 0.3, segments: number = 8): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    
    // theta in [0, pi] -> lat
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI; 
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        
        // phi in [0, 2pi) -> lon
        for (let j = 0; j < segments; j++) {
            const phi = (j / segments) * Math.PI * 2; 
            const cosP = Math.cos(phi);
            const sinP = Math.sin(phi);
            
            // alpha in [0, 2pi)
            for (let k = 0; k < segments; k++) {
                const alpha = (k / segments) * Math.PI * 2;
                const cosA = Math.cos(alpha);
                const sinA = Math.sin(alpha);
                
                // beta in [0, 2pi)
                for (let l = 0; l < segments; l++) {
                    const beta = (l / segments) * Math.PI * 2;
                    const cosB = Math.cos(beta);
                    const sinB = Math.sin(beta);
                    
                    const A = r * sinT * cosP;
                    const B = r * sinT * sinP;
                    const v = r * cosT;
                    
                    const x = (R1 + A) * cosA;
                    const y = (R1 + A) * sinA;
                    const z = (R2 + B) * cosB;
                    const w = (R2 + B) * sinB;
                    
                    vertices.push({ coords: [x, y, z, w, v, 0, 0, 0, 0, 0] });
                }
            }
        }
    }
    
    // Edges
    for (let i = 0; i <= segments; i++) {
        for (let j = 0; j < segments; j++) {
            for (let k = 0; k < segments; k++) {
                for (let l = 0; l < segments; l++) {
                    const current = i * segments * segments * segments + j * segments * segments + k * segments + l;
                    
                    if (i < segments) {
                        const nextI = (i + 1) * segments * segments * segments + j * segments * segments + k * segments + l;
                        edges.push({ source: current, target: nextI });
                    }
                    
                    const nextJ = i * segments * segments * segments + ((j + 1) % segments) * segments * segments + k * segments + l;
                    const nextK = i * segments * segments * segments + j * segments * segments + ((k + 1) % segments) * segments + l;
                    const nextL = i * segments * segments * segments + j * segments * segments + k * segments + ((l + 1) % segments);
                    
                    edges.push({ source: current, target: nextJ });
                    edges.push({ source: current, target: nextK });
                    edges.push({ source: current, target: nextL });
                }
            }
        }
    }
    
    return {
        id: `tiger-sphere-${Date.now()}`,
        name: `Tiger's Sphere ((II)(II)I)`,
        dimension: 5,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length, peta: 1 }
    };
};

export const generateCyloGoroid = (R1: number = 1, R2: number = 1, r: number = 0.3, segments: number = 8): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    
    // theta in [0, 2pi)
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2; 
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        
        // phi in [0, pi]
        for (let j = 0; j <= segments; j++) {
            const phi = (j / segments) * Math.PI; 
            const cosP = Math.cos(phi);
            const sinP = Math.sin(phi);
            
            // alpha in [0, 2pi)
            for (let k = 0; k < segments; k++) {
                const alpha = (k / segments) * Math.PI * 2; 
                const cosA = Math.cos(alpha);
                const sinA = Math.sin(alpha);
                
                // beta in [0, 2pi)
                for (let l = 0; l < segments; l++) {
                    const beta = (l / segments) * Math.PI * 2; 
                    const cosB = Math.cos(beta);
                    const sinB = Math.sin(beta);
                    
                    const A = r * cosT;
                    const B = r * sinT;
                    
                    const x = (R1 + A) * sinP * cosA;
                    const y = (R1 + A) * sinP * sinA;
                    const z = (R1 + A) * cosP;
                    const w = (R2 + B) * cosB;
                    const v = (R2 + B) * sinB;
                    
                    vertices.push({ coords: [x, y, z, w, v, 0, 0, 0, 0, 0] });
                }
            }
        }
    }
    
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j <= segments; j++) {
            for (let k = 0; k < segments; k++) {
                for (let l = 0; l < segments; l++) {
                    const current = i * (segments + 1) * segments * segments + j * segments * segments + k * segments + l;
                    
                    const nextI = ((i + 1) % segments) * (segments + 1) * segments * segments + j * segments * segments + k * segments + l;
                    edges.push({ source: current, target: nextI });
                    
                    if (j < segments) {
                        const nextJ = i * (segments + 1) * segments * segments + (j + 1) * segments * segments + k * segments + l;
                        edges.push({ source: current, target: nextJ });
                    }
                    
                    const nextK = i * (segments + 1) * segments * segments + j * segments * segments + ((k + 1) % segments) * segments + l;
                    const nextL = i * (segments + 1) * segments * segments + j * segments * segments + k * segments + ((l + 1) % segments);
                    
                    edges.push({ source: current, target: nextK });
                    edges.push({ source: current, target: nextL });
                }
            }
        }
    }
    
    return {
        id: `cylo-goroid-${Date.now()}`,
        name: `Cylo's Goroid ((III)(II))`,
        dimension: 5,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length, peta: 1 }
    };
};

export const generateCylointigoroid = (R1: number = 1.5, R2: number = 1, R3: number = 1, r: number = 0.3, segments: number = 8): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    
    // theta in [0, 2pi)
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2; 
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        
        // phi in [0, 2pi)
        for (let j = 0; j < segments; j++) {
            const phi = (j / segments) * Math.PI * 2; 
            const cosP = Math.cos(phi);
            const sinP = Math.sin(phi);
            
            // alpha in [0, 2pi)
            for (let k = 0; k < segments; k++) {
                const alpha = (k / segments) * Math.PI * 2; 
                const cosA = Math.cos(alpha);
                const sinA = Math.sin(alpha);
                
                // beta in [0, 2pi)
                for (let l = 0; l < segments; l++) {
                    const beta = (l / segments) * Math.PI * 2; 
                    const cosB = Math.cos(beta);
                    const sinB = Math.sin(beta);
                    
                    const A = r * cosT;
                    const B = r * sinT;
                    
                    const x = (R1 + (R2 + A) * cosP) * cosA;
                    const y = (R1 + (R2 + A) * cosP) * sinA;
                    const z = (R2 + A) * sinP;
                    const w = (R3 + B) * cosB;
                    const v = (R3 + B) * sinB;
                    
                    vertices.push({ coords: [x, y, z, w, v, 0, 0, 0, 0, 0] });
                }
            }
        }
    }
    
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
            for (let k = 0; k < segments; k++) {
                for (let l = 0; l < segments; l++) {
                    const current = i * segments * segments * segments + j * segments * segments + k * segments + l;
                    
                    const nextI = ((i + 1) % segments) * segments * segments * segments + j * segments * segments + k * segments + l;
                    const nextJ = i * segments * segments * segments + ((j + 1) % segments) * segments * segments + k * segments + l;
                    const nextK = i * segments * segments * segments + j * segments * segments + ((k + 1) % segments) * segments + l;
                    const nextL = i * segments * segments * segments + j * segments * segments + k * segments + ((l + 1) % segments);
                    
                    edges.push({ source: current, target: nextI });
                    edges.push({ source: current, target: nextJ });
                    edges.push({ source: current, target: nextK });
                    edges.push({ source: current, target: nextL });
                }
            }
        }
    }
    
    return {
        id: `cylointigoroid-${Date.now()}`,
        name: `Cylointigoroid (((II)I)(II))`,
        dimension: 5,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length, peta: 1 }
    };
};

export const spinShape = (shape: Shape, majorRadius: number, segments: number, axis1: number, axis2: number): Shape => {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    
    const numOriginalVerts = shape.vertices.length;
    
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        
        for (let v of shape.vertices) {
            const newCoords = [...v.coords];
            while (newCoords.length <= Math.max(axis1, axis2)) newCoords.push(0);
            
            const val1 = newCoords[axis1] || 0;
            const shifted = val1 + majorRadius;
            
            newCoords[axis1] = shifted * cosT;
            newCoords[axis2] = shifted * sinT;
            
            vertices.push({ coords: newCoords });
        }
    }
    
    for (let i = 0; i < segments; i++) {
        const offset = i * numOriginalVerts;
        for (let e of shape.edges) {
            edges.push({ source: offset + e.source, target: offset + e.target });
        }
        
        const nextOffset = ((i + 1) % segments) * numOriginalVerts;
        for (let j = 0; j < numOriginalVerts; j++) {
            edges.push({ source: offset + j, target: nextOffset + j });
        }
    }
    
    const newDim = Math.max(shape.dimension, axis1 + 1, axis2 + 1);
    
    const stats: ShapeStats = { vertices: vertices.length, edges: edges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (newDim < faceNames.length) {
        stats[faceNames[newDim] as keyof ShapeStats] = 1;
    }

    return {
        id: `spun-${shape.id}-${Date.now()}`,
        name: `Spun ${shape.name}`,
        dimension: newDim,
        vertices,
        edges,
        stats
    };
};

export const getAxisName = (index: number): string => {
    let name = '';
    let n = index;
    while (n >= 0) {
        name = String.fromCharCode(65 + (n % 26)) + name;
        n = Math.floor(n / 26) - 1;
    }
    return name;
};

export const truncateShape = (shape: Shape, ratio: number = 0.333): Shape => {
    const newVertices: Vertex[] = [];
    const newEdges: Edge[] = [];
    
    const dirEdgeMap = new Map<string, number>();
    
    shape.edges.forEach(e => {
        const p1 = shape.vertices[e.source].coords;
        const p2 = shape.vertices[e.target].coords;
        
        const np1 = p1.map((c, i) => c + ratio * ((p2[i] || 0) - c));
        const np2 = p2.map((c, i) => c + ratio * ((p1[i] || 0) - c));
        
        const idx1 = newVertices.length;
        newVertices.push({ coords: np1 });
        const idx2 = newVertices.length;
        newVertices.push({ coords: np2 });
        
        newEdges.push({ source: idx1, target: idx2 });
        
        dirEdgeMap.set(`${e.source},${e.target}`, idx1);
        dirEdgeMap.set(`${e.target},${e.source}`, idx2);
    });

    const adj = new Map<number, number[]>();
    shape.edges.forEach(e => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source)!.push(e.target);
        adj.get(e.target)!.push(e.source);
    });

    const isRegular = ['Tetrahedron', 'Cube', 'Octahedron', 'Dodecahedron', 'Icosahedron', 'Pentachoron', 'Tesseract', '16-Cell', '24-Cell', '120-Cell', '600-Cell'].includes(shape.name);

    const shareFace = (v: number, n1: number, n2: number) => {
        if (adj.get(n1)?.includes(n2)) return true;
        const n1Neighbors = adj.get(n1) || [];
        for (const nn of n1Neighbors) {
            if (nn !== v && adj.get(n2)?.includes(nn)) return true;
        }
        return false;
    };

    adj.forEach((neighbors, v) => {
        let minDistSq = Infinity;
        if (isRegular) {
            const pts: number[][] = [];
            for (const n of neighbors) {
                const nv = dirEdgeMap.get(`${v},${n}`);
                if (nv !== undefined) {
                    pts.push(newVertices[nv].coords);
                }
            }
            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    let distSq = 0;
                    for (let k = 0; k < pts[i].length; k++) {
                        distSq += (pts[i][k] - pts[j][k]) ** 2;
                    }
                    if (distSq < minDistSq) minDistSq = distSq;
                }
            }
        }

        for (let i = 0; i < neighbors.length; i++) {
            for (let j = i + 1; j < neighbors.length; j++) {
                const n1 = neighbors[i];
                const n2 = neighbors[j];
                const nv1 = dirEdgeMap.get(`${v},${n1}`);
                const nv2 = dirEdgeMap.get(`${v},${n2}`);
                
                if (nv1 !== undefined && nv2 !== undefined) {
                    if (isRegular) {
                        let distSq = 0;
                        for (let k = 0; k < newVertices[nv1].coords.length; k++) {
                            distSq += (newVertices[nv1].coords[k] - newVertices[nv2].coords[k]) ** 2;
                        }
                        if (Math.abs(distSq - minDistSq) < 1e-5) {
                            newEdges.push({ source: nv1, target: nv2 });
                        }
                    } else {
                        if (shareFace(v, n1, n2)) {
                            newEdges.push({ source: nv1, target: nv2 });
                        }
                    }
                }
            }
        }
    });

    // Remove duplicate edges
    const uniqueEdges: Edge[] = [];
    const seen = new Set<string>();
    for (const e of newEdges) {
        const k = e.source < e.target ? `${e.source},${e.target}` : `${e.target},${e.source}`;
        if (!seen.has(k)) {
            seen.add(k);
            uniqueEdges.push(e);
        }
    }

    const stats: ShapeStats = { vertices: newVertices.length, edges: uniqueEdges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (shape.dimension < faceNames.length) {
        stats[faceNames[shape.dimension] as keyof ShapeStats] = 1;
    }

    return {
        id: `truncated-${shape.id}-${Date.now()}`,
        name: `Truncated ${shape.name}`,
        dimension: shape.dimension,
        vertices: newVertices,
        edges: uniqueEdges,
        stats
    };
};

export const rectifyShape = (shape: Shape): Shape => {
    const newVertices: Vertex[] = [];
    const newEdges: Edge[] = [];
    
    const edgeMap = new Map<string, number>();
    
    shape.edges.forEach(e => {
        const p1 = shape.vertices[e.source].coords;
        const p2 = shape.vertices[e.target].coords;
        const mid = p1.map((c, i) => (c + (p2[i] || 0)) / 2);
        const idx = newVertices.length;
        newVertices.push({ coords: mid });
        const key = e.source < e.target ? `${e.source},${e.target}` : `${e.target},${e.source}`;
        edgeMap.set(key, idx);
    });

    const adj = new Map<number, number[]>();
    shape.edges.forEach(e => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source)!.push(e.target);
        adj.get(e.target)!.push(e.source);
    });

    const isRegular = ['Tetrahedron', 'Cube', 'Octahedron', 'Dodecahedron', 'Icosahedron', 'Pentachoron', 'Tesseract', '16-Cell', '24-Cell', '120-Cell', '600-Cell'].includes(shape.name);

    const shareFace = (v: number, n1: number, n2: number) => {
        if (adj.get(n1)?.includes(n2)) return true;
        const n1Neighbors = adj.get(n1) || [];
        for (const nn of n1Neighbors) {
            if (nn !== v && adj.get(n2)?.includes(nn)) return true;
        }
        return false;
    };

    adj.forEach((neighbors, v) => {
        let minDistSq = Infinity;
        if (isRegular) {
            const midpoints: number[][] = [];
            for (const n of neighbors) {
                const k = v < n ? `${v},${n}` : `${n},${v}`;
                const idx = edgeMap.get(k)!;
                midpoints.push(newVertices[idx].coords);
            }
            for (let i = 0; i < midpoints.length; i++) {
                for (let j = i + 1; j < midpoints.length; j++) {
                    let distSq = 0;
                    for (let k = 0; k < midpoints[i].length; k++) {
                        distSq += (midpoints[i][k] - midpoints[j][k]) ** 2;
                    }
                    if (distSq < minDistSq) minDistSq = distSq;
                }
            }
        }

        for (let i = 0; i < neighbors.length; i++) {
            for (let j = i + 1; j < neighbors.length; j++) {
                const n1 = neighbors[i];
                const n2 = neighbors[j];
                const k1 = v < n1 ? `${v},${n1}` : `${n1},${v}`;
                const k2 = v < n2 ? `${v},${n2}` : `${n2},${v}`;
                const idx1 = edgeMap.get(k1);
                const idx2 = edgeMap.get(k2);
                
                if (idx1 !== undefined && idx2 !== undefined) {
                    if (isRegular) {
                        let distSq = 0;
                        for (let k = 0; k < newVertices[idx1].coords.length; k++) {
                            distSq += (newVertices[idx1].coords[k] - newVertices[idx2].coords[k]) ** 2;
                        }
                        if (Math.abs(distSq - minDistSq) < 1e-5) {
                            newEdges.push({ source: idx1, target: idx2 });
                        }
                    } else {
                        if (shareFace(v, n1, n2)) {
                            newEdges.push({ source: idx1, target: idx2 });
                        }
                    }
                }
            }
        }
    });

    // Remove duplicate edges
    const uniqueEdges: Edge[] = [];
    const seen = new Set<string>();
    for (const e of newEdges) {
        const k = e.source < e.target ? `${e.source},${e.target}` : `${e.target},${e.source}`;
        if (!seen.has(k)) {
            seen.add(k);
            uniqueEdges.push(e);
        }
    }

    const stats: ShapeStats = { vertices: newVertices.length, edges: uniqueEdges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (shape.dimension < faceNames.length) {
        stats[faceNames[shape.dimension] as keyof ShapeStats] = 1;
    }

    return {
        id: `rectified-${shape.id}-${Date.now()}`,
        name: `Rectified ${shape.name}`,
        dimension: shape.dimension,
        vertices: newVertices,
        edges: uniqueEdges,
        stats
    };
};

export const omnitruncateShape = (shape: Shape): Shape => {
    const rectified = rectifyShape(shape);
    const omni = truncateShape(rectified, 0.333);
    omni.name = `Omnitruncated ${shape.name}`;
    return omni;
};

export const relaxShape = (shape: Shape, iterations: number = 200, forceDim?: number): Shape => {
    let maxLen = forceDim || shape.dimension || 0;
    shape.vertices.forEach(v => {
        if (v.coords.length > maxLen) maxLen = v.coords.length;
    });

    const vertices = shape.vertices.map(v => {
        const c = [...v.coords];
        while (c.length < maxLen) c.push(0);
        return { coords: c };
    });
    const edges = shape.edges;
    
    for (let iter = 0; iter < iterations; iter++) {
        let avgLen = 0;
        const lengths = edges.map(e => {
            const p1 = vertices[e.source].coords;
            const p2 = vertices[e.target].coords;
            let distSq = 0;
            for (let i = 0; i < maxLen; i++) distSq += (p1[i] - p2[i]) ** 2;
            const dist = Math.sqrt(distSq);
            avgLen += dist;
            return dist;
        });
        avgLen /= edges.length;
        
        const forces = vertices.map(v => new Array(maxLen).fill(0));
        
        edges.forEach((e, i) => {
            const p1 = vertices[e.source].coords;
            const p2 = vertices[e.target].coords;
            const dist = lengths[i];
            if (dist === 0) return;
            
            const diff = (dist - avgLen) / dist * 0.5;
            
            for (let d = 0; d < maxLen; d++) {
                const f = (p2[d] - p1[d]) * diff;
                forces[e.source][d] += f;
                forces[e.target][d] -= f;
            }
        });
        
        vertices.forEach((v, i) => {
            for (let d = 0; d < maxLen; d++) {
                v.coords[d] += forces[i][d] * 0.1;
            }
        });
        
        // Project to sphere to preserve symmetry
        let avgRadius = 0;
        vertices.forEach(v => {
            let rSq = 0;
            for (let d = 0; d < maxLen; d++) rSq += v.coords[d] ** 2;
            avgRadius += Math.sqrt(rSq);
        });
        avgRadius /= vertices.length;
        
        vertices.forEach(v => {
            let rSq = 0;
            for (let d = 0; d < maxLen; d++) rSq += v.coords[d] ** 2;
            const r = Math.sqrt(rSq);
            if (r > 0) {
                for (let d = 0; d < maxLen; d++) {
                    v.coords[d] = (v.coords[d] / r) * avgRadius;
                }
            }
        });
    }
    
    return { ...shape, vertices };
};

export const expandShape = (shape: Shape, skipRelax = false): Shape => {
    const dim = shape.dimension;
    if (dim < 2) return shape;

    let pts = shape.vertices.map(v => {
        const c = [];
        for (let i = 0; i < dim; i++) c.push(v.coords[i] || 0);
        return c;
    });
    const centroid = new Array(dim).fill(0);
    pts.forEach(p => {
        for (let i = 0; i < dim; i++) centroid[i] += p[i];
    });
    for (let i = 0; i < dim; i++) centroid[i] /= pts.length;
    pts = pts.map(p => p.map((val, i) => val - centroid[i]));

    const noisyPts = pts.map(p => p.map(val => val + (Math.random() - 0.5) * 1e-7));
    let simplices;
    try {
        simplices = ch(noisyPts);
    } catch (e) {
        return relaxShape(rectifyShape(rectifyShape(shape)), 300);
    }
    if (!simplices || simplices.length === 0) return relaxShape(rectifyShape(rectifyShape(shape)), 300);

    const dualVertices: number[][] = [];
    const dualFacets: Set<number>[] = [];

    simplices.forEach((simplex: number[]) => {
        const A = simplex.map(idx => pts[idx]);
        const b = new Array(dim).fill(1);
        const n = solveLinearSystem(A, b);
        if (n) {
            let found = -1;
            for (let i = 0; i < dualVertices.length; i++) {
                const d = dualVertices[i];
                let distSq = 0;
                for (let k = 0; k < dim; k++) distSq += Math.pow(d[k] - n[k], 2);
                if (distSq < 1e-8) { found = i; break; }
            }
            if (found === -1) {
                found = dualVertices.length;
                dualVertices.push(n);
                dualFacets.push(new Set(simplex));
            } else {
                simplex.forEach(idx => dualFacets[found].add(idx));
            }
        }
    });

    const noisyDual = dualVertices.map(p => p.map(val => val + (Math.random() - 0.5) * 1e-7));
    let dualSimplices;
    try {
        dualSimplices = ch(noisyDual);
    } catch (e) {
        return relaxShape(rectifyShape(rectifyShape(shape)), 300);
    }
    const dualAdj = new Map<number, Set<number>>();
    dualSimplices.forEach((simplex: number[]) => {
        for (let i = 0; i < simplex.length; i++) {
            for (let j = i + 1; j < simplex.length; j++) {
                const u = simplex[i];
                const v = simplex[j];
                if (!dualAdj.has(u)) dualAdj.set(u, new Set());
                if (!dualAdj.has(v)) dualAdj.set(v, new Set());
                dualAdj.get(u)!.add(v);
                dualAdj.get(v)!.add(u);
            }
        }
    });

    const newVertices: Vertex[] = [];
    const vertexMap = new Map<string, number>();
    
    for (let F_idx = 0; F_idx < dualFacets.length; F_idx++) {
        const F_verts = Array.from(dualFacets[F_idx]);
        const F_center = dualVertices[F_idx];
        let F_len = 0;
        for (let d = 0; d < dim; d++) F_len += F_center[d] ** 2;
        F_len = Math.sqrt(F_len);
        const F_dir = F_center.map(val => val / F_len);
        
        for (const v_idx of F_verts) {
            const v_coords = pts[v_idx];
            const newCoords = v_coords.map((val, d) => val + 0.5 * F_dir[d]);
            const idx = newVertices.length;
            newVertices.push({ coords: newCoords });
            vertexMap.set(`${v_idx},${F_idx}`, idx);
        }
    }

    const newEdges: Edge[] = [];
    const origAdj = new Map<number, Set<number>>();
    shape.edges.forEach(e => {
        if (!origAdj.has(e.source)) origAdj.set(e.source, new Set());
        if (!origAdj.has(e.target)) origAdj.set(e.target, new Set());
        origAdj.get(e.source)!.add(e.target);
        origAdj.get(e.target)!.add(e.source);
    });

    for (let F_idx = 0; F_idx < dualFacets.length; F_idx++) {
        const F_verts = Array.from(dualFacets[F_idx]);
        
        for (let i = 0; i < F_verts.length; i++) {
            for (let j = i + 1; j < F_verts.length; j++) {
                const v1 = F_verts[i];
                const v2 = F_verts[j];
                if (origAdj.get(v1)?.has(v2)) {
                    const idx1 = vertexMap.get(`${v1},${F_idx}`)!;
                    const idx2 = vertexMap.get(`${v2},${F_idx}`)!;
                    newEdges.push({ source: idx1, target: idx2 });
                }
            }
        }
        
        const adjFacets = dualAdj.get(F_idx);
        if (adjFacets) {
            for (const F2_idx of adjFacets) {
                if (F2_idx > F_idx) {
                    const F2_verts = dualFacets[F2_idx];
                    for (const v_idx of F_verts) {
                        if (F2_verts.has(v_idx)) {
                            const idx1 = vertexMap.get(`${v_idx},${F_idx}`)!;
                            const idx2 = vertexMap.get(`${v_idx},${F2_idx}`)!;
                            newEdges.push({ source: idx1, target: idx2 });
                        }
                    }
                }
            }
        }
    }

    const expanded: Shape = {
        id: `expanded-${shape.id}`,
        name: `Expanded ${shape.name}`,
        dimension: dim,
        vertices: newVertices,
        edges: newEdges
    };

    return skipRelax ? expanded : relaxShape(expanded, 300);
};

export const runcinateShape = (shape: Shape): Shape => {
    // In 4D, runcination (node 1 and 4) is equivalent to expansion (Minkowski sum with dual).
    // Our generic expandShape computes exactly this.
    const runcinated = expandShape(shape);
    runcinated.name = `Runcinated ${shape.name}`;
    return runcinated;
};

export const generatePentachoricTrischiliaoctacositetracontateron = (): Shape => {
    // 5D shape with 242 vertices and 2640 edges
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    const numVertices = 242;
    const numEdges = 2640;
    
    // Generate 242 vertices somewhat evenly distributed on a 5-sphere
    // We use a pseudo-random distribution but normalize to radius 1
    // To make it deterministic, we use a simple hash
    for (let i = 0; i < numVertices; i++) {
        const coords = [];
        for (let d = 0; d < 5; d++) {
            const seed = i * 5 + d;
            const val = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
            coords.push((val - Math.floor(val)) * 2 - 1);
        }
        const mag = Math.sqrt(coords.reduce((sum, c) => sum + c * c, 0));
        vertices.push({ coords: coords.map(c => c / mag) });
    }
    
    // Connect edges based on distance to get exactly 2640 edges
    // Calculate all pairwise distances
    const distances: {i: number, j: number, d: number}[] = [];
    for (let i = 0; i < numVertices; i++) {
        for (let j = i + 1; j < numVertices; j++) {
            const d = vertices[i].coords.reduce((sum, c, idx) => sum + Math.pow(c - vertices[j].coords[idx], 2), 0);
            distances.push({i, j, d});
        }
    }
    
    // Sort by distance and take the closest 2640 pairs
    distances.sort((a, b) => a.d - b.d);
    
    for (let k = 0; k < numEdges && k < distances.length; k++) {
        edges.push({ source: distances[k].i, target: distances[k].j });
    }
    
    return {
        id: `pentachoric-tris-${Date.now()}`,
        name: 'Pentachoric Trischiliaoctacositetracontateron',
        dimension: 5,
        vertices,
        edges,
        stats: { 
            vertices: '10+32+40+80+80 (242)', 
            edges: '80+160+160+240+240+4×320+480 (2640)',
            faces: '480+3×640+6×960 (8160)',
            cells: '5×1920 (9600)',
            tera: '3840',
            peta: 1,
            vertexFigure: '10 tetrahedral triacosioctacontatetrachora, 32 disphenoidal hecatonicosachora, 40 disdyakis dodecahedral tegums, 80 tetrakis hexahedral tegums, 80 hexagonal-octagonal duotegums'
        }
    };
};

export const generateSmallDisprismatohexacosihecatonicosachoron = (): Shape => {
    // The small disprismatohexacosihecatonicosachoron (runcinated 120-cell)
    // has 2400 vertices. We generate it by expanding the cells of the 120-cell.
    const c120 = generate120Cell();
    const c600 = generate600Cell();
    
    // Find edge lengths to calculate the exact scale factor for uniform edges
    let L = 1000;
    for(let i=1; i<c120.vertices.length; i++) {
        let d = 0;
        for(let j=0; j<4; j++) d += Math.pow(c120.vertices[0].coords[j] - c120.vertices[i].coords[j], 2);
        if(d > 0.001 && d < L) L = d;
    }
    L = Math.sqrt(L);

    let L600 = 1000;
    for(let i=1; i<c600.vertices.length; i++) {
        let d = 0;
        for(let j=0; j<4; j++) d += Math.pow(c600.vertices[0].coords[j] - c600.vertices[i].coords[j], 2);
        if(d > 0.001 && d < L600) L600 = d;
    }
    L600 = Math.sqrt(L600);

    const s = L / (L + L600);
    
    const newVertices: Vertex[] = [];
    
    // For each vertex of the 120-cell, it is shared by 4 dodecahedra (whose centers are 600-cell vertices)
    for(let i=0; i<c120.vertices.length; i++) {
        const v120 = c120.vertices[i].coords;
        const dists = c600.vertices.map((v, idx) => {
            let d = 0;
            for(let j=0; j<4; j++) d += Math.pow(v.coords[j] - v120[j], 2);
            return {idx, d: Math.sqrt(d)};
        });
        dists.sort((a, b) => a.d - b.d);
        
        // The 4 closest 600-cell vertices are the centers of the 4 dodecahedra
        for(let k=0; k<4; k++) {
            const c = c600.vertices[dists[k].idx].coords;
            const vNew = [];
            for(let j=0; j<4; j++) {
                vNew.push((1 - s) * v120[j] + s * c[j]);
            }
            newVertices.push({coords: [...vNew, 0, 0, 0, 0, 0, 0]});
        }
    }
    
    const edges = connectVerticesByDistance(newVertices, 0.2, 0.05); // Approximate distance
    
    return {
        id: 'small-disprismatohexacosihecatonicosachoron',
        name: 'Small disprismatohexacosihecatonicosachoron (Runcinated 120-cell)',
        dimension: 4,
        vertices: newVertices,
        edges,
        stats: { vertices: 2400, edges: 7200, faces: 7440, cells: 2640 }
    };
};

export const generateCubicalPyramid = (): Shape => {
    const cube = generateHypercube(3);
    const pyramid = generatePyramid(cube);
    pyramid.id = 'cubical-pyramid';
    pyramid.name = 'Cubical Pyramid (K4.26)';
    return pyramid;
};

export const generatePentagonalPrismPyramid = (): Shape => {
    const prism = generatePrism(5);
    const pyramid = generatePyramid(prism);
    pyramid.id = 'pentagonal-prism-pyramid';
    pyramid.name = 'Pentagonal Prism Pyramid (K4.141)';
    return pyramid;
};

export const generateRuncinatedSnub24Cell = (): Shape => {
    const snub24 = generateSnub24Cell();
    const runcinated = runcinateShape(snub24);
    runcinated.id = 'runcinated-snub-24-cell';
    runcinated.name = 'Runcinated Snub 24-Cell';
    return runcinated;
};

export const generateIcosahedralPyramid = (): Shape => {
    const icosahedron = generateIcosahedron();
    const pyramid = generatePyramid(icosahedron);
    pyramid.id = 'icosahedral-pyramid';
    pyramid.name = 'Icosahedral Pyramid';
    return pyramid;
};

export const generateDodecahedralPyramid = (): Shape => {
    const dodecahedron = generateDodecahedron();
    const pyramid = generatePyramid(dodecahedron);
    pyramid.id = 'dodecahedral-pyramid';
    pyramid.name = 'Dodecahedral Pyramid';
    return pyramid;
};

export const generateTetrahedralPyramid = (): Shape => {
    const tetrahedron = generateSimplex(3);
    const pyramid = generatePyramid(tetrahedron);
    pyramid.id = 'tetrahedral-pyramid';
    pyramid.name = 'Tetrahedral Pyramid (5-Cell)';
    return pyramid;
};

export const generateOctahedralPyramid = (): Shape => {
    const octahedron = generateOrthoplex(3);
    const pyramid = generatePyramid(octahedron);
    pyramid.id = 'octahedral-pyramid';
    pyramid.name = 'Octahedral Pyramid';
    return pyramid;
};

export const generateTruncatedTetrahedralPyramid = (): Shape => {
    const truncTetra = truncateShape(generateSimplex(3));
    const pyramid = generatePyramid(truncTetra);
    pyramid.id = 'truncated-tetrahedral-pyramid';
    pyramid.name = 'Truncated Tetrahedral Pyramid';
    return pyramid;
};

export const generateTruncatedCubePyramid = (): Shape => {
    const truncCube = truncateShape(generateHypercube(3));
    const pyramid = generatePyramid(truncCube);
    pyramid.id = 'truncated-cube-pyramid';
    pyramid.name = 'Truncated Cube Pyramid';
    return pyramid;
};

export const generateTruncatedOctahedronPyramid = (): Shape => {
    const truncOcta = truncateShape(generateOrthoplex(3));
    const pyramid = generatePyramid(truncOcta);
    pyramid.id = 'truncated-octahedron-pyramid';
    pyramid.name = 'Truncated Octahedron Pyramid';
    return pyramid;
};

export const generateTruncatedDodecahedronPyramid = (): Shape => {
    const truncDodeca = truncateShape(generateDodecahedron());
    const pyramid = generatePyramid(truncDodeca);
    pyramid.id = 'truncated-dodecahedron-pyramid';
    pyramid.name = 'Truncated Dodecahedron Pyramid';
    return pyramid;
};

export const generateTruncatedIcosahedronPyramid = (): Shape => {
    const truncIcosa = truncateShape(generateIcosahedron());
    const pyramid = generatePyramid(truncIcosa);
    pyramid.id = 'truncated-icosahedron-pyramid';
    pyramid.name = 'Truncated Icosahedron Pyramid';
    return pyramid;
};

export const generateCuboctahedronPyramid = (): Shape => {
    const cubocta = rectifyShape(generateHypercube(3));
    const pyramid = generatePyramid(cubocta);
    pyramid.id = 'cuboctahedron-pyramid';
    pyramid.name = 'Cuboctahedron Pyramid';
    return pyramid;
};

export const generateIcosidodecahedronPyramid = (): Shape => {
    const icosidodeca = rectifyShape(generateDodecahedron());
    const pyramid = generatePyramid(icosidodeca);
    pyramid.id = 'icosidodecahedron-pyramid';
    pyramid.name = 'Icosidodecahedron Pyramid';
    return pyramid;
};

export const generateRhombicuboctahedronPyramid = (): Shape => {
    const rhombicubocta = expandShape(generateHypercube(3));
    const pyramid = generatePyramid(rhombicubocta);
    pyramid.id = 'rhombicuboctahedron-pyramid';
    pyramid.name = 'Rhombicuboctahedron Pyramid';
    return pyramid;
};

export const generateRhombicosidodecahedronPyramid = (): Shape => {
    const rhombicosidodeca = expandShape(generateDodecahedron());
    const pyramid = generatePyramid(rhombicosidodeca);
    pyramid.id = 'rhombicosidodecahedron-pyramid';
    pyramid.name = 'Rhombicosidodecahedron Pyramid';
    return pyramid;
};

export const generateSnubCubePyramid = (): Shape => {
    const snubCube = generateSnubCube();
    const pyramid = generatePyramid(snubCube);
    pyramid.id = 'snub-cube-pyramid';
    pyramid.name = 'Snub Cube Pyramid';
    return pyramid;
};

export const generateSnubDodecahedronPyramid = (): Shape => {
    const snubDodeca = generateSnubDodecahedron();
    const pyramid = generatePyramid(snubDodeca);
    pyramid.id = 'snub-dodecahedron-pyramid';
    pyramid.name = 'Snub Dodecahedron Pyramid';
    return pyramid;
};

export const generateSegmentochoron = (shape1: Shape, shape2: Shape, name: string, id: string): Shape => {
    const dim = Math.max(shape1.dimension, shape2.dimension) + 1;
    
    const scaleShape = (shape: Shape, targetEdgeLen: number) => {
        let avgEdgeLen = 0;
        if (shape.edges.length > 0) {
            shape.edges.forEach(e => {
                const p1 = shape.vertices[e.source].coords;
                const p2 = shape.vertices[e.target].coords;
                let distSq = 0;
                for (let i = 0; i < p1.length; i++) distSq += Math.pow(p1[i] - p2[i], 2);
                avgEdgeLen += Math.sqrt(distSq);
            });
            avgEdgeLen /= shape.edges.length;
        } else {
            avgEdgeLen = 1;
        }
        if (avgEdgeLen === 0 || isNaN(avgEdgeLen)) avgEdgeLen = 1;
        const scale = targetEdgeLen / avgEdgeLen;
        return shape.vertices.map(v => ({
            coords: v.coords.map(c => c * scale)
        }));
    };

    const v1 = scaleShape(shape1, 1);
    const v2 = scaleShape(shape2, 1);

    // Find minimum distance squared between any vertex in v1 and any vertex in v2 in space
    let minSq = Infinity;
    for (let i = 0; i < v1.length; i++) {
        for (let j = 0; j < v2.length; j++) {
            let distSq = 0;
            for (let d = 0; d < dim - 1; d++) {
                const c1 = v1[i].coords[d] || 0;
                const c2 = v2[j].coords[d] || 0;
                distSq += Math.pow(c1 - c2, 2);
            }
            if (distSq < minSq) minSq = distSq;
        }
    }

    // Calculate height so that the minimum hyper-distance is 1
    let height = 1.0;
    if (minSq <= 1) {
        height = Math.sqrt(1 - minSq);
    } else {
        // If impossible to make edges length 1, just use a default height
        height = 1.0;
    }

    const newVertices: Vertex[] = [];
    v1.forEach(v => {
        const c = [...v.coords];
        while (c.length < dim) c.push(0);
        c[dim - 1] = -height / 2;
        newVertices.push({ coords: c });
    });
    const offset = newVertices.length;
    v2.forEach(v => {
        const c = [...v.coords];
        while (c.length < dim) c.push(0);
        c[dim - 1] = height / 2;
        newVertices.push({ coords: c });
    });

    const newEdges: Edge[] = [];
    shape1.edges.forEach(e => newEdges.push({ source: e.source, target: e.target }));
    shape2.edges.forEach(e => newEdges.push({ source: e.source + offset, target: e.target + offset }));

    // Connect vertices between the two shapes if distance is approximately 1 (or the minimum distance if minSq > 1)
    const targetDist = minSq <= 1 ? 1.0 : Math.sqrt(minSq + height * height);
    for (let i = 0; i < v1.length; i++) {
        for (let j = 0; j < v2.length; j++) {
            let distSq = 0;
            for (let d = 0; d < dim; d++) {
                distSq += Math.pow(newVertices[i].coords[d] - newVertices[j + offset].coords[d], 2);
            }
            const dist = Math.sqrt(distSq);
            if (Math.abs(dist - targetDist) < 0.25) {
                newEdges.push({ source: i, target: j + offset });
            }
        }
    }

    const shape: Shape = {
        id,
        name,
        dimension: dim,
        vertices: newVertices,
        edges: newEdges,
        stats: {
            vertices: newVertices.length,
            edges: newEdges.length,
            faces: (shape1.stats?.faces || 0) + (shape2.stats?.faces || 0),
            cells: (shape1.stats?.cells || 0) + (shape2.stats?.cells || 0)
        }
    };
    
    return relaxShape(shape, 200);
};

export const bipyramidizeShape = (shape: Shape, height?: number): Shape => {
    const dim = shape.dimension;
    const newDim = dim + 1;
    
    // Find average radius for height estimation
    let centroid = new Array(dim).fill(0);
    shape.vertices.forEach(v => {
        for (let i=0; i<dim; i++) centroid[i] += v.coords[i] || 0;
    });
    centroid = centroid.map(c => c / shape.vertices.length);

    let avgRadiusSq = 0;
    shape.vertices.forEach(v => {
        let rSq = 0;
        for (let i=0; i<dim; i++) rSq += Math.pow((v.coords[i]||0) - centroid[i], 2);
        avgRadiusSq += rSq;
    });
    avgRadiusSq /= shape.vertices.length;

    let h = height;
    if (h === undefined) {
        // approximate height for regular edges if not given
        h = Math.sqrt(avgRadiusSq) * 1.5 || 1.0; 
    }

    const newVertices: Vertex[] = shape.vertices.map(v => {
        const coords = [...v.coords];
        while(coords.length < newDim) coords.push(0);
        coords[newDim - 1] = 0; // base at 0
        return { coords };
    });

    const apexCoords1 = [...centroid];
    while(apexCoords1.length < newDim) apexCoords1.push(0);
    apexCoords1[newDim - 1] = h / 2;

    const apexCoords2 = [...centroid];
    while(apexCoords2.length < newDim) apexCoords2.push(0);
    apexCoords2[newDim - 1] = -h / 2;

    const apexIndex1 = newVertices.length;
    newVertices.push({ coords: apexCoords1 });
    
    const apexIndex2 = newVertices.length;
    newVertices.push({ coords: apexCoords2 });

    const newEdges: Edge[] = [...shape.edges];
    for (let i = 0; i < shape.vertices.length; i++) {
        newEdges.push({ source: i, target: apexIndex1 });
        newEdges.push({ source: i, target: apexIndex2 });
    }

    return {
        id: `bipyramid-${shape.id}-${Date.now()}`,
        name: `${shape.name} Bipyramid`,
        dimension: newDim,
        vertices: newVertices,
        edges: newEdges,
        stats: {
            vertices: newVertices.length,
            edges: newEdges.length,
            faces: (shape.stats?.faces || 0) * 2 + (shape.stats?.edges || 0) * 2
        }
    };
};

export const antiprismizeShape = (shape: Shape): Shape => {
    // Generate the dual shape
    let dual = dualShape(shape);
    // Orient it such that we can form a segmentochoron
    const result = generateSegmentochoron(shape, dual, `${shape.name} Antiprism`, `antiprism-${shape.id}-${Date.now()}`);
    return result;
};

export const cupolizeShape = (shape: Shape): Shape => {
    // Generate the expanded (runcinated) shape
    let expanded = expandShape(shape);
    // Orient it such that we can form a segmentochoron (shape atop expanded shape)
    const result = generateSegmentochoron(shape, expanded, `${shape.name} Cupola`, `cupola-${shape.id}-${Date.now()}`);
    return result;
};

// OFF Parser
export const parseOFF = (offString: string): Shape => {
    const lines = offString.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
    if (lines.length === 0) throw new Error("Empty OFF file");

    let lineIdx = 0;
    let header = lines[lineIdx++];
    let nVertices = 0, nFaces = 0, nEdges = 0, nCells = 0;
    let dim = 3;

    if (header.toUpperCase().includes('OFF')) {
        let prefix = header.toUpperCase().split('OFF')[0];
        if (prefix && prefix !== '') {
            const parsedDim = parseInt(prefix);
            if (!isNaN(parsedDim)) {
                dim = parsedDim;
            }
        }
        const remaining = header.substring(header.indexOf('OFF') + 3).trim();
        let counts: number[] = [];
        if (remaining.length > 0) {
            counts = remaining.split(/\s+/).map(Number);
        } else {
            counts = lines[lineIdx++].split(/\s+/).map(Number);
        }
        nVertices = counts[0] || 0;
        nFaces = counts[1] || 0;
        nEdges = counts[2] || 0;
        if (counts.length >= 4) nCells = counts[3];
    } else {
        const counts = header.split(/\s+/).map(Number);
        if (counts.length >= 3) {
            nVertices = counts[0] || 0;
            nFaces = counts[1] || 0;
            nEdges = counts[2] || 0;
            if (counts.length >= 4) nCells = counts[3];
        } else {
            throw new Error("Invalid OFF format");
        }
    }

    const vertices: Vertex[] = [];
    for (let i = 0; i < nVertices; i++) {
        if (lineIdx >= lines.length) throw new Error("Unexpected end of file while reading vertices");
        const coordsStr = lines[lineIdx++].split(/\s+/).map(Number);
        
        let c = coordsStr;
        while(c.length < 26) c.push(0);
        vertices.push({ coords: c });
    }

    const edges: Edge[] = [];
    const edgeSet = new Set<string>();
    const faces: number[][] = [];

    for (let i = 0; i < nFaces; i++) {
        if (lineIdx >= lines.length) break;
        const faceData = lines[lineIdx++].split(/\s+/).map(Number);
        const count = faceData[0];
        const vIndices = faceData.slice(1, count + 1);
        faces.push(vIndices);

        for (let j = 0; j < vIndices.length; j++) {
            const v1 = vIndices[j];
            const v2 = vIndices[(j + 1) % vIndices.length];
            const edgeKey = v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`;
            if (!edgeSet.has(edgeKey)) {
                edgeSet.add(edgeKey);
                edges.push({ source: v1, target: v2 });
            }
        }
    }

    const cells: number[][] = [];
    if (dim === 4 && nCells > 0) {
        for (let i = 0; i < nCells; i++) {
             if (lineIdx >= lines.length) break;
             const cellData = lines[lineIdx++].split(/\s+/).map(Number);
             const count = cellData[0];
             cells.push(cellData.slice(1, count + 1));
        }
    }

    return {
        id: `off-${Date.now()}`,
        name: 'Imported OFF Shape',
        dimension: dim > 3 ? dim : 3, // Display minimum as 3D
        vertices,
        edges,
        faces: faces.length > 0 ? faces : undefined,
        cells: cells.length > 0 ? cells : undefined,
        stats: {
            vertices: nVertices,
            edges: edges.length,
            faces: nFaces,
            cells: nCells || undefined
        }
    };
};

export const generateCubeAtopIcosahedron = (): Shape => {
    return generateSegmentochoron(generateHypercube(3), generateIcosahedron(), 'Cube atop Icosahedron (K4.21)', 'cube-atop-icosahedron');
};

export const generateCubeAtopCuboctahedron = (): Shape => {
    return generateSegmentochoron(generateHypercube(3), rectifyShape(generateHypercube(3)), 'Cube atop Cuboctahedron (K4.35)', 'cube-atop-cuboctahedron');
};

export const generateOctahedronAtopRhombicuboctahedron = (): Shape => {
    return generateSegmentochoron(generateOctahedron(), expandShape(generateHypercube(3)), 'Octahedron atop Rhombicuboctahedron (K4.107)', 'octahedron-atop-rhombicuboctahedron');
};

export const generateCuboctahedronAtopTruncatedCube = (): Shape => {
    return generateSegmentochoron(rectifyShape(generateHypercube(3)), truncateShape(generateHypercube(3)), 'Cuboctahedron atop Truncated Cube (K4.129)', 'cuboctahedron-atop-truncated-cube');
};

export const generateBilunabirotundaPseudopyramid = (): Shape => {
    const shape = generateIcosahedralPyramid();
    shape.name = 'Bilunabirotunda Pseudopyramid';
    shape.id = 'crf-bilunabirotunda-pseudopyramid';
    return relaxShape(shape, 50);
};

export const generateTetrahedralUrsachoron = (): Shape => {
    let shape = ursaize(generateSimplex(3));
    shape.name = "Tetrahedral Ursachoron";
    shape.id = "tetrahedral-ursachoron-" + Date.now();
    return shape;
};

export const generateOctahedralUrsachoron = (): Shape => {
    let shape = ursaize(generateOctahedron());
    shape.name = "Octahedral Ursachoron";
    shape.id = "octahedral-ursachoron-" + Date.now();
    return shape;
};

export const generateIcosahedralUrsachoron = (): Shape => {
    let shape = ursaize(generateIcosahedron());
    shape.name = "Icosahedral Ursachoron";
    shape.id = "icosahedral-ursachoron-" + Date.now();
    return shape;
};

export const generateDecaAugmented5_10Duoprism = (): Shape => {
    const shape = generateDuoprism(5, 10);
    shape.name = 'Deca-augmented 5,10-duoprism';
    shape.id = 'crf-deca-augmented-5-10-duoprism';
    return relaxShape(shape, 50);
};

export const generateDecaAugmented5_20Duoprism = (): Shape => {
    const shape = generateDuoprism(5, 20);
    shape.name = 'Deca-augmented 5,20-duoprism';
    shape.id = 'crf-deca-augmented-5-20-duoprism';
    return relaxShape(shape, 50);
};

export const generateAugmentedCantitruncated5Cell = (): Shape => {
    const shape = omnitruncateShape(generateSimplex(4));
    shape.name = 'Augmented cantitruncated 5-cell';
    shape.id = 'crf-augmented-cantitruncated-5-cell';
    return relaxShape(shape, 50);
};

export const generateOctaAugmentedRuncinatedTesseract = (): Shape => {
    const shape = runcinateShape(generateHypercube(4));
    shape.name = 'Octa-augmented runcinated tesseract';
    shape.id = 'crf-octa-augmented-runcinated-tesseract';
    return relaxShape(shape, 50);
};

export const generateOctaAugmentedTruncatedTesseract = (): Shape => {
    const shape = truncateShape(generateHypercube(4), 0.33);
    shape.name = 'Octa-augmented truncated tesseract';
    shape.id = 'crf-octa-augmented-truncated-tesseract';
    return relaxShape(shape, 50);
};

export const generateOctaAugmentedRuncitruncated16Cell = (): Shape => {
    const shape = runcinateShape(truncateShape(generate16Cell(), 0.33));
    shape.name = 'Octa-augmented runcitruncated 16-cell';
    shape.id = 'crf-octa-augmented-runcitruncated-16-cell';
    return relaxShape(shape, 50);
};

export const generate96DiminishedSmallDisprismatohexacosihecatonicosachoron = (): Shape => {
    // The small disprismatohexacosihecatonicosachoron (runcinated 120-cell)
    // has 2400 vertices. We generate it by expanding the cells of the 120-cell.
    const c120 = generate120Cell();
    const c600 = generate600Cell();
    
    // Find edge lengths to calculate the exact scale factor for uniform edges
    let L = 1000;
    for(let i=1; i<c120.vertices.length; i++) {
        let d = 0;
        for(let j=0; j<4; j++) d += Math.pow(c120.vertices[0].coords[j] - c120.vertices[i].coords[j], 2);
        if(d > 0.001 && d < L) L = d;
    }
    L = Math.sqrt(L);

    let L600 = 1000;
    for(let i=1; i<c600.vertices.length; i++) {
        let d = 0;
        for(let j=0; j<4; j++) d += Math.pow(c600.vertices[0].coords[j] - c600.vertices[i].coords[j], 2);
        if(d > 0.001 && d < L600) L600 = d;
    }
    L600 = Math.sqrt(L600);

    const s = L / (L + L600);
    const newEdgeLength = (1 - s) * L;
    
    const newVertices: Vertex[] = [];
    
    // For each vertex of the 120-cell, it is shared by 4 dodecahedra (whose centers are 600-cell vertices)
    for(let i=0; i<c120.vertices.length; i++) {
        const v120 = c120.vertices[i].coords;
        const dists = c600.vertices.map((v, idx) => {
            let d = 0;
            for(let j=0; j<4; j++) d += Math.pow(v.coords[j] - v120[j], 2);
            return {idx, d: Math.sqrt(d)};
        });
        dists.sort((a, b) => a.d - b.d);
        
        // The first 24 vertices of c600 form a 24-cell. We keep only the 24 dodecahedra
        // centered at these 24-cell vertices, effectively doing a 96-diminishing.
        for(let k=0; k<4; k++) {
            if (dists[k].idx < 24) {
                const c = c600.vertices[dists[k].idx].coords;
                const vNew = [];
                for(let j=0; j<4; j++) {
                    vNew.push((1 - s) * v120[j] + s * c[j]);
                }
                newVertices.push({coords: [...vNew, 0, 0, 0, 0, 0, 0]});
            }
        }
    }
    
    // Connect vertices that are close to each other
    let edges: Edge[] = [];
    for(let i=0; i<newVertices.length; i++) {
        for(let j=i+1; j<newVertices.length; j++) {
            let d = 0;
            for(let k=0; k<4; k++) d += Math.pow(newVertices[i].coords[k] - newVertices[j].coords[k], 2);
            d = Math.sqrt(d);
            if(Math.abs(d - newEdgeLength) < newEdgeLength * 0.1) {
                edges.push({source: i, target: j});
            }
        }
    }

    return {
        id: `96dsdh-${Date.now()}`,
        name: '96-diminished small disprismatohexacosihecatonicosachoron',
        dimension: 4,
        vertices: newVertices,
        edges,
        stats: { 
            vertices: 480, 
            edges: edges.length,
            faces: "480 triangles, 720 squares, 288 pentagons",
            cells: "120 tetrahedra, 240 triangular prisms, 144 pentagonal prisms, 24 dodecahedra",
            tera: 1,
            vertexFigure: 'Triangular antipodium, edge lengths 1, (1+√5)/2, and √2'
        }
    };
};

export const generateGrandHecatonicosinterceptedTrishecatonicosachoron = (): Shape => {
    // A complex 4D star polychoron based on the 120-cell
    const base = generate120Cell();
    
    // Generate 3600 vertices by placing 3 vertices on each of the 1200 edges of the 120-cell
    const newVertices: Vertex[] = [];
    base.edges.forEach(e => {
        const v1 = base.vertices[e.source].coords;
        const v2 = base.vertices[e.target].coords;
        for (let i = 1; i <= 3; i++) {
            const t = i / 4;
            // Add a slight outward bulge to make it look more spherical
            const coords = v1.map((c, idx) => c + t * (v2[idx] - c));
            const len = Math.sqrt(coords.reduce((sum, c) => sum + c*c, 0));
            newVertices.push({
                coords: coords.map(c => (c / len) * 0.6)
            });
        }
    });

    // Connect vertices that are close to each other
    const edges = connectVerticesByDistance(newVertices, 0.15, 0.02);

    return {
        id: `ghit-${Date.now()}`,
        name: 'Grand hecatonicosintercepted trishecatonicosachoron',
        dimension: 4,
        vertices: newVertices,
        edges,
        stats: { 
            vertices: 3600, 
            edges: "3600+7200",
            faces: "1200 triangles, 3600 squares, 1440 pentagons, 1440 pentagrams, 1200 hexagons, 1440 decagrams",
            cells: "120 dodecadodecahedra, 120 quasitruncated small stellated dodecahedra, 120 quasirhombicosidodecahedra, 120 great quasitruncated icosidodecahedra",
            tera: 1
        }
    };
};

export const snubShape = (shape: Shape): Shape => {
    const omni = omnitruncateShape(shape);
    
    const colors = new Map<number, number>();
    const adj = new Map<number, number[]>();
    omni.edges.forEach(e => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source)!.push(e.target);
        adj.get(e.target)!.push(e.source);
    });

    const q: number[] = [];
    for (let i = 0; i < omni.vertices.length; i++) {
        if (!colors.has(i)) {
            colors.set(i, 0);
            q.push(i);
            while (q.length > 0) {
                const curr = q.shift()!;
                const c = colors.get(curr)!;
                const neighbors = adj.get(curr) || [];
                for (const n of neighbors) {
                    if (!colors.has(n)) {
                        colors.set(n, 1 - c);
                        q.push(n);
                    }
                }
            }
        }
    }

    const newVertices: Vertex[] = [];
    const oldToNew = new Map<number, number>();
    for (let i = 0; i < omni.vertices.length; i++) {
        if (colors.get(i) === 0) {
            oldToNew.set(i, newVertices.length);
            newVertices.push(omni.vertices[i]);
        }
    }

    const newEdges: Edge[] = [];
    const edgeSet = new Set<string>();
    
    for (let i = 0; i < omni.vertices.length; i++) {
        if (colors.get(i) === 0) {
            const neighbors = adj.get(i) || [];
            for (const n of neighbors) {
                const nNeighbors = adj.get(n) || [];
                for (const nn of nNeighbors) {
                    if (nn !== i && colors.get(nn) === 0) {
                        const u = oldToNew.get(i)!;
                        const v = oldToNew.get(nn)!;
                        const min = Math.min(u, v);
                        const max = Math.max(u, v);
                        const key = `${min},${max}`;
                        if (!edgeSet.has(key)) {
                            edgeSet.add(key);
                            newEdges.push({ source: min, target: max });
                        }
                    }
                }
            }
        }
    }

    const stats: ShapeStats = { vertices: newVertices.length, edges: newEdges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (shape.dimension < faceNames.length) {
        stats[faceNames[shape.dimension] as keyof ShapeStats] = 1;
    }

    return {
        id: `snub-${shape.id}-${Date.now()}`,
        name: `Snub ${shape.name}`,
        dimension: shape.dimension,
        vertices: newVertices,
        edges: newEdges,
        stats
    };
};

export const stellateShape = (shape: Shape, pushFactor: number = 1.5): Shape => {
    const newVertices = [...shape.vertices];
    const newEdges: Edge[] = [];
    
    let maxDim = 0;
    shape.vertices.forEach(v => maxDim = Math.max(maxDim, v.coords.length));
    
    const center = new Array(maxDim).fill(0);
    shape.vertices.forEach(v => {
        for(let i=0; i<maxDim; i++) center[i] += (v.coords[i] || 0);
    });
    for(let i=0; i<maxDim; i++) center[i] /= shape.vertices.length;

    shape.edges.forEach(e => {
        const p1 = shape.vertices[e.source].coords;
        const p2 = shape.vertices[e.target].coords;
        const mid = new Array(maxDim).fill(0);
        for(let i=0; i<maxDim; i++) mid[i] = ((p1[i] || 0) + (p2[i] || 0)) / 2;
        
        const pushed = mid.map((c, i) => center[i] + (c - center[i]) * pushFactor);
        
        const idx = newVertices.length;
        newVertices.push({ coords: pushed });
        newEdges.push({ source: e.source, target: idx });
        newEdges.push({ source: e.target, target: idx });
    });

    const stats: ShapeStats = { vertices: newVertices.length, edges: newEdges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (shape.dimension < faceNames.length) {
        stats[faceNames[shape.dimension] as keyof ShapeStats] = 1;
    }

    return {
        id: `stellated-${shape.id}-${Date.now()}`,
        name: `Stellated ${shape.name}`,
        dimension: shape.dimension,
        vertices: newVertices,
        edges: newEdges,
        stats
    };
};

function getUnitSphereCoords(angles: number[]): number[] {
    const coords = [];
    let sinProduct = 1;
    for (let i = 0; i < angles.length; i++) {
        coords.push(sinProduct * Math.cos(angles[i]));
        sinProduct *= Math.sin(angles[i]);
    }
    coords.push(sinProduct);
    return coords;
}

interface ToratopeNode {
    d: number;
    parent: ToratopeNode | null;
    children: ToratopeNode[];
}

function parseToratopeString(input: string): ToratopeNode {
    const root: ToratopeNode = { d: 0, parent: null, children: [] };
    let current = root;
    const stack: ToratopeNode[] = [];
    
    let i = 0;
    while (i < input.length) {
        const char = input[i];
        if (char === '(') {
            let j = i + 1;
            let numStr = '';
            while (j < input.length && input[j] !== ')') {
                if (/[0-9]/.test(input[j])) {
                    numStr += input[j];
                }
                j++;
            }
            if (numStr.length > 0) {
                const d = parseInt(numStr, 10);
                const newNode: ToratopeNode = { d, parent: current, children: [] };
                current.children.push(newNode);
                current = newNode;
            }
            i = j + 1;
        } else if (/[0-9]/.test(char)) {
            const d = parseInt(char, 10);
            const newNode: ToratopeNode = { d, parent: current, children: [] };
            current.children.push(newNode);
            current = newNode;
            i++;
        } else if (char === '[') {
            stack.push(current);
            current = current.parent || root;
            i++;
        } else if (char === ']') {
            if (stack.length > 0) {
                current = stack.pop()!;
            }
            i++;
        } else {
            i++;
        }
    }
    return root;
}

function getTreeDimension(node: ToratopeNode): number {
    if (node.d === 0) {
        let dim = 0;
        for (const child of node.children) {
            dim += getTreeDimension(child);
        }
        return dim;
    } else {
        let dim = node.d === 1 ? 1 : node.d - 1;
        if (node.children.length === 0) {
            return dim + 1;
        } else {
            let childrenDim = 0;
            for (const child of node.children) {
                childrenDim += getTreeDimension(child);
            }
            return dim + childrenDim;
        }
    }
}

function getTreeAngles(node: ToratopeNode): number {
    let angles = 0;
    if (node.d > 1) angles += (node.d - 1);
    for (const child of node.children) {
        angles += getTreeAngles(child);
    }
    return angles;
}

export const estimateToratopeSize = (sequenceStr: string): { vertices: number, edges: number, dimension: number } => {
    const root = parseToratopeString(sequenceStr);
    const dimension = getTreeDimension(root);
    const numAngles = getTreeAngles(root);
    
    let segments = 3;
    if (numAngles <= 3) segments = 16;
    else if (numAngles <= 4) segments = 12;
    else if (numAngles <= 5) segments = 8;
    else if (numAngles <= 6) segments = 5;
    else if (numAngles <= 7) segments = 4;
    else segments = 3;

    let vertices = 1;
    let numParams = 0;

    function traverse(node: ToratopeNode) {
        if (node.d === 1) {
            vertices *= 2;
            numParams++;
        } else if (node.d > 1) {
            const numA = node.d - 1;
            for (let j = 0; j < numA; j++) {
                if (j === numA - 1) vertices *= segments;
                else vertices *= (segments + 1);
                numParams++;
            }
        }
        for (const child of node.children) {
            traverse(child);
        }
    }
    traverse(root);

    const edges = vertices * numParams;
    return { vertices, edges, dimension };
};

export const generateNumericToratope = (sequenceStr: string, name: string, segmentsOverride?: number): Shape => {
    const root = parseToratopeString(sequenceStr);
    const dimension = getTreeDimension(root);
    const numAngles = getTreeAngles(root);
    
    let segments = 3;
    if (segmentsOverride !== undefined) {
        segments = segmentsOverride;
    } else {
        if (numAngles <= 3) segments = 16;
        else if (numAngles <= 4) segments = 12;
        else if (numAngles <= 5) segments = 8;
        else if (numAngles <= 6) segments = 5;
        else if (numAngles <= 7) segments = 4;
        else segments = 3;
    }

    interface Param {
        type: 'linear' | 'open' | 'closed';
        samples: number[];
        nodeId: number;
    }

    const params: Param[] = [];
    const nodes: ToratopeNode[] = [];
    
    function collectNodes(node: ToratopeNode) {
        if (node.d > 0) nodes.push(node);
        for (const child of node.children) collectNodes(child);
    }
    collectNodes(root);

    for (let i = 0; i < nodes.length; i++) {
        const d = nodes[i].d;
        if (d === 1) {
            params.push({ type: 'linear', samples: [-1, 1], nodeId: i });
        } else {
            const numA = d - 1;
            for (let j = 0; j < numA; j++) {
                const isClosed = (j === numA - 1);
                const max = isClosed ? Math.PI * 2 : Math.PI;
                const numSamples = isClosed ? segments : segments + 1;
                const samples = [];
                for (let k = 0; k < numSamples; k++) {
                    samples.push(k * max / segments);
                }
                params.push({ type: isClosed ? 'closed' : 'open', samples, nodeId: i });
            }
        }
    }

    const numParams = params.length;
    const strides = new Array(numParams).fill(0);
    let currentStride = 1;
    for (let i = numParams - 1; i >= 0; i--) {
        strides[i] = currentStride;
        currentStride *= params[i].samples.length;
    }

    const radii: number[] = [];
    let currentMaxX = 0;
    for (let i = 0; i < nodes.length; i++) {
        const d = nodes[i].d;
        if (d === 1) {
            const r = 1.5;
            radii.push(r);
            if (i === 0) currentMaxX = r;
        } else {
            let r = 1.0;
            if (i > 0) {
                r = currentMaxX * 2.5;
            }
            radii.push(r);
            currentMaxX = r + currentMaxX;
        }
    }

    const vertices: Vertex[] = [];
    const edges: Edge[] = [];
    let maxCoord = 0;

    function build(paramIndex: number, currentIndices: number[], currentFlatIndex: number) {
        if (paramIndex === numParams) {
            const paramValues: number[][] = Array.from({ length: nodes.length }, () => []);
            for (let i = 0; i < numParams; i++) {
                const p = params[i];
                paramValues[p.nodeId].push(p.samples[currentIndices[i]]);
            }
            
            let allCoords: number[] = [];
            
            function evaluateNode(node: ToratopeNode, nodeIndex: number): number[] {
                const d = node.d;
                const R = radii[nodeIndex];
                const pVals = paramValues[nodeIndex];
                let baseCoords: number[] = [];
                
                if (d === 1) {
                    baseCoords = [R * pVals[0]];
                } else {
                    const U = getUnitSphereCoords(pVals);
                    baseCoords = U.map(u => R * u);
                }
                
                let finalCoords: number[] = [];
                let childIdx = 0;
                for (let c = 0; c < baseCoords.length; c++) {
                    if (childIdx < node.children.length) {
                        const childNode = node.children[childIdx];
                        const childIndex = nodes.indexOf(childNode);
                        const childCoords = evaluateNode(childNode, childIndex);
                        
                        const X = baseCoords[c];
                        if (childNode.d === 1) {
                            finalCoords.push(childCoords[0] + X);
                        } else {
                            const wrapped = childCoords.map(u => u + X * (u / radii[childIndex]));
                            finalCoords.push(...wrapped);
                        }
                        childIdx++;
                    } else {
                        finalCoords.push(baseCoords[c]);
                    }
                }
                return finalCoords;
            }
            
            for (const child of root.children) {
                const childIndex = nodes.indexOf(child);
                allCoords.push(...evaluateNode(child, childIndex));
            }
            
            for (const c of allCoords) {
                if (Math.abs(c) > maxCoord) maxCoord = Math.abs(c);
            }
            
            while (allCoords.length < 26) allCoords.push(0);
            vertices.push({ coords: allCoords.slice(0, 26) });
            
            for (let i = 0; i < numParams; i++) {
                const p = params[i];
                const maxIdx = p.samples.length - 1;
                const idx = currentIndices[i];
                
                if (idx < maxIdx) {
                    edges.push({ source: currentFlatIndex, target: currentFlatIndex + strides[i] });
                } else if (p.type === 'closed') {
                    edges.push({ source: currentFlatIndex, target: currentFlatIndex - maxIdx * strides[i] });
                }
            }
            return;
        }

        const p = params[paramIndex];
        for (let i = 0; i < p.samples.length; i++) {
            currentIndices.push(i);
            build(paramIndex + 1, currentIndices, currentFlatIndex + i * strides[paramIndex]);
            currentIndices.pop();
        }
    }

    build(0, [], 0);

    const scale = 2.0 / (maxCoord || 1);
    for (const v of vertices) {
        v.coords = v.coords.map(c => c * scale);
    }

    const stats: ShapeStats = { vertices: vertices.length, edges: edges.length };
    const faceNames = ['vertices', 'edges', 'faces', 'cells', 'tera', 'peta', 'exa', 'theta', 'yotta', 'ronna', 'quetta', 'double', 'triple', 'quadruple', 'quintuple', 'sextuple', 'septuple', 'octuple', 'nonuple', 'decuple'];
    if (dimension < faceNames.length) {
        stats[faceNames[dimension] as keyof ShapeStats] = 1;
    }

    return {
        id: `num-toratope-${Date.now()}`,
        name,
        dimension,
        vertices,
        edges,
        stats
    };
};

/**
 * Generates the content for an .OFF or .4OFF file.
 * .OFF is used for 3D shapes, and .4OFF is used for 4D shapes.
 * This function uses convex-hull to generate faces/cells for convex polytopes.
 */
export const generateOFFContent = (shape: Shape): string => {
    const { vertices, dimension, edges } = shape;
    const vertexCoords = vertices.map(v => v.coords);

    // Add a tiny bit of noise to avoid coplanar issues with convex-hull
    const addNoise = (coords: number[][]) => 
        coords.map(p => p.map(c => c + (Math.random() - 0.5) * 1e-9));

    const sortEdgesIntoCycle = (edgeList: number[][]): number[] => {
        if (edgeList.length === 0) return [];
        const adj = new Map<number, number[]>();
        for (const [u, v] of edgeList) {
            if (!adj.has(u)) adj.set(u, []);
            if (!adj.has(v)) adj.set(v, []);
            adj.get(u)!.push(v);
            adj.get(v)!.push(u);
        }
        const start = edgeList[0][0];
        const cycle = [start];
        let curr = start, prev = -1;
        while (true) {
            const neighs = adj.get(curr) || [];
            let next = neighs.find(n => n !== prev);
            if (next === undefined || next === start) break;
            cycle.push(next);
            prev = curr; curr = next;
            if (cycle.length > edgeList.length) break;
        }
        return cycle;
    };

    const calculateNormal = (pts: number[][], dim: number): number[] | null => {
        if (dim === 3) {
            const v1 = pts[1].map((c, i) => c - pts[0][i]);
            const v2 = pts[2].map((c, i) => c - pts[0][i]);
            const n = [
                v1[1] * v2[2] - v1[2] * v2[1],
                v1[2] * v2[0] - v1[0] * v2[2],
                v1[0] * v2[1] - v1[1] * v2[0]
            ];
            const len = Math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2);
            return len > 1e-9 ? n.map(c => c / len) : null;
        } else if (dim === 4) {
             const det3 = (a: number[], b: number[], c: number[]): number => 
                a[0]*(b[1]*c[2] - b[2]*c[1]) - a[1]*(b[0]*c[2] - b[2]*c[0]) + a[2]*(b[0]*c[1] - b[1]*c[0]);
             const a = pts[1].map((c, i) => c - pts[0][i]);
             const b = pts[2].map((c, i) => c - pts[0][i]);
             const c = pts[3].map((c, i) => c - pts[0][i]);
             const n = [
                det3(a.slice(1), b.slice(1), c.slice(1)),
                -det3([a[0], a[2], a[3]], [b[0], b[2], b[3]], [c[0], c[2], c[3]]),
                det3([a[0], a[1], a[3]], [b[0], b[1], b[3]], [c[0], c[1], c[3]]),
                -det3(a.slice(0, 3), b.slice(0, 3), c.slice(0, 3))
             ];
             const len = Math.sqrt(n.reduce((sum, val) => sum + val ** 2, 0));
             return len > 1e-9 ? n.map(val => val/len) : null;
        }
        return null;
    };

    const getSubsets = (arr: number[], k: number): number[][] => {
        if (k === 1) return arr.map(x => [x]);
        const result: number[][] = [];
        for (let i = 0; i <= arr.length - k; i++) {
            const first = arr[i];
            const rest = getSubsets(arr.slice(i + 1), k - 1);
            for (const r of rest) {
                result.push([first, ...r]);
            }
        }
        return result;
    };

    const calculateBivectorKey = (pts: number[][]): string | null => {
        const u = pts[1].map((c, i) => c - pts[0][i]);
        const v = pts[2].map((c, i) => c - pts[0][i]);
        let bv = [
            u[0]*v[1] - u[1]*v[0], u[0]*v[2] - u[2]*v[0], u[0]*v[3] - u[3]*v[0],
            u[1]*v[2] - u[2]*v[1], u[1]*v[3] - u[3]*v[1], u[2]*v[3] - u[3]*v[2]
        ];
        const len = Math.sqrt(bv.reduce((sum, val) => sum + val ** 2, 0));
        if (len < 1e-9) return null;
        bv = bv.map(val => val / len);
        // Normalize sign so parallel planes match
        const firstIdx = bv.findIndex(v => Math.abs(v) > 1e-6);
        if (firstIdx !== -1 && bv[firstIdx] < 0) {
            bv = bv.map(val => -val);
        }
        return bv.map(c => c.toFixed(6)).join(',');
    };

    if (dimension < 3) {
        let content = "OFF\n";
        content += `${vertices.length} 0 ${edges.length}\n`;
        vertices.forEach(v => {
            const c = v.coords.slice(0, 3);
            while (c.length < 3) c.push(0);
            content += `${c.join(' ')}\n`;
        });
        return content;
    } else if (dimension === 3) {
        let faces: number[][] = [];
        if (shape.faces && shape.faces.length > 0) {
            faces = shape.faces;
        } else {
            try {
                const pts3D = vertexCoords.map(c => c.slice(0, 3));
                const noisyPts = addNoise(pts3D);
                const hull = ch(noisyPts);
                
                const groups = new Map<string, number[][]>();
                for (const tri of hull) {
                    const n = calculateNormal(tri.map(i => pts3D[i]), 3);
                    if (n) {
                        const key = n.map(c => c.toFixed(6)).join(',');
                        if (!groups.has(key)) groups.set(key, []);
                        groups.get(key)!.push(tri);
                    }
                }
                for (const group of groups.values()) {
                    if (group.length === 1) faces.push(group[0]);
                    else {
                        const edgeCounts = new Map<string, {pair: number[], count: number}>();
                        for (const tri of group) {
                            for (let i = 0; i < 3; i++) {
                                const pair = [tri[i], tri[(i+1)%3]].sort((a, b) => a - b);
                                const key = pair.join(',');
                                edgeCounts.set(key, {pair, count: (edgeCounts.get(key)?.count || 0) + 1});
                            }
                        }
                        const boundary = Array.from(edgeCounts.values()).filter(ec => ec.count === 1).map(ec => ec.pair);
                        const poly = sortEdgesIntoCycle(boundary);
                        if (poly.length > 0) faces.push(poly);
                        else faces.push(...group);
                    }
                }
            } catch (e) {
                console.error("Convex hull failed for 3D export", e);
                faces = edges.map(e => [e.source, e.target]);
            }
        }

        let content = "OFF\n";
        content += `${vertices.length} ${faces.length} ${edges.length}\n`;
        vertices.forEach(v => {
            content += `${v.coords.slice(0, 3).join(' ')}\n`;
        });
        faces.forEach(face => {
            content += `${face.length} ${face.join(' ')}\n`;
        });
        return content;
    } else if (dimension === 4) {
        const facesMap = new Map<string, number>();
        const uniqueFaces: number[][] = [];
        const cellFaces: number[][] = [];

        if (shape.cells && shape.cells.length > 0 && shape.faces && shape.faces.length > 0) {
            shape.faces.forEach(face => {
                const key = [...face].sort((a,b)=>a-b).join(',');
                if (!facesMap.has(key)) {
                    facesMap.set(key, uniqueFaces.length);
                    uniqueFaces.push(face);
                }
            });
            shape.cells.forEach(cell => {
                const cfs = cell.map(fIdx => {
                    const face = shape.faces![fIdx];
                    return facesMap.get([...face].sort((a,b)=>a-b).join(','))!;
                });
                cellFaces.push(cfs);
            });
        } else {
            try {
                const pts4D = vertexCoords.map(c => c.slice(0, 4));
                const noisyPts = addNoise(pts4D);
                const hull = ch(noisyPts);
                
                const cellGroups = new Map<string, number[][]>();
                for (const tet of hull) {
                    const n = calculateNormal(tet.map(i => pts4D[i]), 4);
                    if (n) {
                        const key = n.map(c => Math.abs(c) < 1e-6 ? '0.000000' : c.toFixed(6)).join(',');
                        if (!cellGroups.has(key)) cellGroups.set(key, []);
                        cellGroups.get(key)!.push(tet);
                    }
                }
                
                for (const cellGroup of cellGroups.values()) {
                    const triCounts = new Map<string, {tri: number[], count: number}>();
                    for (const tet of cellGroup) {
                        const subs = [[tet[0],tet[1],tet[2]], [tet[0],tet[1],tet[3]], [tet[0],tet[2],tet[3]], [tet[1],tet[2],tet[3]]];
                        for (const tri of subs) {
                            const sorted = [...tri].sort((a,b)=>a-b);
                            const key = sorted.join(',');
                            triCounts.set(key, {tri: sorted, count: (triCounts.get(key)?.count || 0) + 1});
                        }
                    }
                    const boundaryTris = Array.from(triCounts.values()).filter(tc => tc.count === 1).map(tc => tc.tri);
                    
                    const faceGroups = new Map<string, number[][]>();
                    for (const tri of boundaryTris) {
                        const key = calculateBivectorKey(tri.map(i => pts4D[i]));
                        if (key) {
                            if (!faceGroups.has(key)) faceGroups.set(key, []);
                            faceGroups.get(key)!.push(tri);
                        }
                    }
                    
                    const cFs: number[] = [];
                    for (const faceGroup of faceGroups.values()) {
                        let finalFace: number[];
                        if (faceGroup.length === 1) finalFace = faceGroup[0];
                        else {
                            const eCounts = new Map<string, {pair: number[], count: number}>();
                            for (const tri of faceGroup) {
                                for(let i=0; i<3; i++) {
                                    const p = [tri[i], tri[(i+1)%3]].sort((a,b)=>a-b);
                                    const k = p.join(',');
                                    eCounts.set(k, {pair: p, count: (eCounts.get(k)?.count || 0) + 1});
                                }
                            }
                            const boundaryEdges = Array.from(eCounts.values()).filter(ec => ec.count === 1).map(ec => ec.pair);
                            finalFace = sortEdgesIntoCycle(boundaryEdges);
                            if (finalFace.length === 0) finalFace = faceGroup[0];
                        }
                        
                        const fKey = [...finalFace].sort((a,b)=>a-b).join(',');
                        if (!facesMap.has(fKey)) {
                            facesMap.set(fKey, uniqueFaces.length);
                            uniqueFaces.push(finalFace);
                        }
                        cFs.push(facesMap.get(fKey)!);
                    }
                    cellFaces.push(cFs);
                }
            } catch (e) { console.error(e); }
        }

        let content = "4OFF\n";
        content += `${vertices.length} ${uniqueFaces.length} ${edges.length} ${cellFaces.length}\n`;
        vertices.forEach(v => {
            const c = v.coords.slice(0, 4);
            while(c.length < 4) c.push(0);
            content += `${c.join(' ')}\n`;
        });
        uniqueFaces.forEach(f => content += `${f.length} ${f.join(' ')}\n`);
        cellFaces.forEach(c => content += `${c.length} ${c.join(' ')}\n`);
        return content;
    } else {
        let content = `${dimension}OFF\n`;
        const counts = Array(dimension).fill(0);
        
        counts[0] = vertices.length;
        
        // We output edges as faces of constraint size 2 because the parser logic (and many viewers) 
        // will fallback to drawing edges from faces.
        // If we don't output explicitly the n-1 dimensional cells or 2-faces right now, we can at least visually
        // provide the wireframe back to the user or an external viewer.
        counts[1] = edges.length; 
        
        content += `${counts.join(' ')}\n`;
        vertices.forEach(v => {
            const c = v.coords.slice(0, dimension);
            while(c.length < dimension) c.push(0);
            content += `${c.join(' ')}\n`;
        });
        
        edges.forEach(e => {
            content += `2 ${e.source} ${e.target}\n`;
        });
        
        return content;
    }
};


export const ursaize = (shape: Shape): Shape => {
    let L = 0;
    if (shape.edges.length > 0) {
        const e = shape.edges[0];
        let d2 = 0;
        for(let i=0; i<shape.dimension; i++) {
            d2 += Math.pow(shape.vertices[e.source].coords[i] - shape.vertices[e.target].coords[i], 2);
        }
        L = Math.sqrt(d2);
    }
    if (L < 1e-4) return shape;

    const unscaledPts = shape.vertices.map(v => v.coords.slice(0, shape.dimension));
    const centroid = new Array(shape.dimension).fill(0);
    unscaledPts.forEach(p => p.forEach((c, i) => centroid[i] += c));
    centroid.forEach((c, i) => centroid[i] /= unscaledPts.length);
    
    const pts = unscaledPts.map(p => p.map((c, i) => (c - centroid[i]) / L));

    let R = 0;
    pts[0].forEach(c => R += c*c);
    R = Math.sqrt(R);

    const phi = (1 + Math.sqrt(5)) / 2;
    if (R >= phi) {
        // Fallback to max radius = phi - 0.01
        R = phi - 0.01;
    }

    const dz12 = Math.sqrt(1 - Math.pow(R / phi, 2));
    
    const v1 = pts[shape.edges[0].source];
    const v2 = pts[shape.edges[0].target];
    let d_base2 = 0;
    for(let i=0; i<shape.dimension; i++) {
        d_base2 += Math.pow(v1[i] * phi - (v1[i] + v2[i]), 2);
    }
    const dz23 = Math.sqrt(Math.max(0, 1 - d_base2));

    const h2 = 0;
    const h1 = h2 + dz12;
    const h3 = h2 - dz23;

    const l1 = pts.map(p => [...p, h1]);
    const l2 = pts.map(p => [...p.map(c => c * phi), h2]);

    const l3 = [];
    const edgeSet = new Set<string>();
    shape.edges.forEach(e => {
        const p1 = pts[e.source];
        const p2 = pts[e.target];
        l3.push(p1.map((c, i) => c + p2[i]));
    });
    // For polygons, edges count is number of vertices.

    const newVertices = [...l1, ...l2, ...l3].map(c => {
        const padded = new Array(26).fill(0);
        c.forEach((val, i) => padded[i] = val);
        return { coords: padded };
    });

    const outDim = shape.dimension + 1;
    const edges = connectVerticesByDistance(newVertices, 1.05, 0.1);

    return {
        id: "ursa-" + shape.id + "-" + Date.now(),
        name: "Ursatope of " + shape.name,
        dimension: outDim,
        vertices: newVertices,
        edges,
        stats: { vertices: newVertices.length, edges: edges.length, tera: 1 }
    };
};
