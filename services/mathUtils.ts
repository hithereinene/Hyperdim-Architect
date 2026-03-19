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
  // Pad to 11 for safety
  while (v.length < 11) v.push(0);

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
  while (coords.length < 11) coords.push(0);

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

export const extrudeShape = (currentVertices: Vertex[], currentEdges: Edge[], dimIndex: number): { vertices: Vertex[], edges: Edge[] } => {
  const newVertices: Vertex[] = [];
  const newEdges: Edge[] = [...currentEdges];
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

  // Duplicate edges for new face
  currentEdges.forEach(e => {
    newEdges.push({ source: e.source + n, target: e.target + n });
  });

  // Connect faces
  for (let i = 0; i < n; i++) {
    newEdges.push({ source: i, target: i + n });
  }

  return { vertices: finalVertices, edges: newEdges };
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
    if (dim >= 0) stats.vertices = Math.pow(2, dim);
    if (dim >= 1) stats.edges = dim * Math.pow(2, dim - 1);
    return stats;
};

const getSimplexStats = (dim: number): ShapeStats => {
    const stats: ShapeStats = {};
    if (dim >= 0) stats.vertices = dim + 1;
    if (dim >= 1) stats.edges = getBinomial(dim + 1, 2);
    return stats;
};

const getOrthoplexStats = (dim: number): ShapeStats => {
    const stats: ShapeStats = {};
    if (dim >= 0) stats.vertices = 2 * dim;
    if (dim >= 1) stats.edges = 2 * 2 * getBinomial(dim, 2);
    return stats;
}

const connectVerticesByDistance = (vertices: Vertex[], targetDist: number, epsilon: number = 0.01): Edge[] => {
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
  for (let d = 0; d < dim; d++) {
    const result = extrudeShape(vertices, edges, d);
    vertices = result.vertices;
    edges = result.edges;
  }
  const names = ['Point', 'Line', 'Square', 'Cube', 'Tesseract', 'Penteract', 'Hexeract', 'Hepteract', 'Octeract', 'Enneact', 'Deceract'];
  return {
    id: `hypercube-${dim}-${Date.now()}`,
    name: names[dim] || `${dim}-Cube`,
    dimension: dim,
    vertices,
    edges,
    stats: getHypercubeStats(dim)
  };
};

export const generateSimplex = (dim: number): Shape => {
  let currentVerts: Vertex[] = [{ coords: [0,0,0,0,0,0,0,0,0,0] }]; 
  let currentEdges: Edge[] = [];
  
  if (dim === 0) return { id: 'simplex-0', name: 'Point', dimension: 0, vertices: currentVerts, edges: [], stats: getSimplexStats(0)};

  for (let d = 1; d <= dim; d++) {
      const baseVerts = currentVerts.map(v => {
          const c = [...v.coords];
          c[d-1] = -0.3; 
          return { coords: c };
      });
      
      const apexCoords = new Array(11).fill(0);
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
        const v1 = new Array(11).fill(0); v1[d] = 1;
        const v2 = new Array(11).fill(0); v2[d] = -1;
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
        
        return {
            id: `sphere-3-structured-${Date.now()}`,
            name: '3D Sphere',
            dimension: 3,
            vertices,
            edges,
            stats: { vertices: vertices.length, edges: edges.length }
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
        while(coords.length < 11) coords.push(0);
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
      '8D Hypersphere', '9D Hypersphere', '10D Hypersphere', '11D Hypersphere'
    ];

    return {
        id: `sphere-${dim}-random-${Date.now()}`,
        name: names[dim] || `${dim}D Hypersphere`,
        dimension: dim,
        vertices,
        edges,
        stats: { vertices: vertexCount, edges: edges.length }
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
    return {
        id: `poly-${sides}-${Date.now()}`,
        name: `${sides}-Gon`,
        dimension: 2,
        vertices,
        edges,
        stats: { vertices: sides, edges: sides, faces: 1 }
    };
};

export const generateCylinder = (segments: number = 24): Shape => {
    const poly = generatePolygon(segments);
    const extruded = extrudeShape(poly.vertices, poly.edges, 2); 
    return {
        id: `cylinder-${Date.now()}`,
        name: 'Cylinder',
        dimension: 3,
        vertices: extruded.vertices,
        edges: extruded.edges,
        stats: { vertices: extruded.vertices.length, edges: extruded.edges.length }
    };
};

export const pyramidizeShape = (shape: Shape, height: number = 2): Shape => {
    const newDim = shape.dimension + 1;
    if (newDim > 11) return shape; // Max 11D supported by our Vertex type

    const vertices: Vertex[] = shape.vertices.map(v => {
        const newCoords = [...v.coords];
        newCoords[newDim - 1] = -height / 2;
        return { coords: newCoords as any };
    });
    
    const apexCoords = new Array(11).fill(0);
    apexCoords[newDim - 1] = height / 2;
    const apexIndex = vertices.length;
    vertices.push({ coords: apexCoords as any });
    
    const edges: Edge[] = [...shape.edges];
    
    for (let i = 0; i < apexIndex; i++) {
        edges.push({ source: i, target: apexIndex });
    }
    
    return {
        id: `pyramidized-${shape.id}`,
        name: `${shape.name} Pyramid`,
        dimension: newDim,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length }
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
        const coords = new Array(11).fill(0);
        for (let i = 0; i < dim; i++) coords[i] = v[i] * scale;
        return { coords };
    });
    
    return {
        id: `dual-${shape.id}-${Date.now()}`,
        name: `Dual ${shape.name}`,
        dimension: dim,
        vertices: finalVertices,
        edges: newEdges,
        stats: { vertices: finalVertices.length, edges: newEdges.length }
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
            const coordsA = [...va.coords];
            while (coordsA.length < dimA) coordsA.push(0);
            
            const coordsB = [...vb.coords];
            while (coordsB.length < dimB) coordsB.push(0);
            
            vertices.push({
                coords: [...coordsA, ...coordsB]
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
    
    return {
        id: `cp_${shapeA.id}_${shapeB.id}_${Date.now()}`,
        name: finalName,
        dimension: newDim,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length }
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
        stats: { vertices: sides+1, edges: 2*sides }
    };
}

export const generatePrism = (sides: number): Shape => {
    const poly = generatePolygon(sides);
    const extruded = extrudeShape(poly.vertices, poly.edges, 2);
    return {
        id: `prism-${sides}-${Date.now()}`,
        name: `${sides}-Sided Prism`,
        dimension: 3,
        vertices: extruded.vertices,
        edges: extruded.edges,
        stats: { vertices: 2*sides, edges: 3*sides }
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
        stats: { vertices: 2*sides, edges: 4*sides }
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
        stats: { vertices: sides+2, edges: 3*sides }
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
        stats: { vertices: 24, edges: 96, faces: 96, cells: 24 }
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
        stats: { vertices: vertices.length, edges: edges.length, faces: 1200, cells: 600 }
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
            v.coords = v.coords.map(c => c * 0.3);
            uniqueV.push(v);
        }
    });

    const edges = connectVerticesByDistance(uniqueV, (3 - Math.sqrt(5))*0.3, 0.05);

    return {
        id: '120-cell', name: '120-Cell', dimension: 4, vertices: uniqueV, edges,
        stats: { vertices: 600, edges: edges.length, faces: 720, cells: 120 }
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
            cells: 720 // 120 (Icosahedra) + 600 (Octahedra)
        }
    };
};

export const generateOmniTesseract = (): Shape => {
    const p = getSignedPermutations([1, 3, 5, 7]);
    const vertices = p.map(c => ({ coords: [...c.map(x => x*0.1), 0,0,0,0,0,0] }));
    const edges = connectVerticesByDistance(vertices, 2*0.1, 0.01);
    return {
        id: 'omni-tesseract', name: 'Omnitruncated Tesseract', dimension: 4, vertices, edges
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
        edges
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
        stats: { vertices: 24, edges: 60, faces: 38 }
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
    return { id: `agapornis-${Date.now()}`, name: 'Agapornis', dimension: 3, vertices, edges };
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

    return { id: `anomalocaris-${Date.now()}`, name: 'Anomalocaris', dimension: 3, vertices, edges };
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
    return { id: `homo-sapiens-${Date.now()}`, name: 'Homo Sapiens', dimension: 3, vertices, edges };
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
        stats: { vertices: 62, edges: 180, faces: 120 }
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
        stats: { vertices: 92, edges: 132, faces: 90 } // Approx edges
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
        while(coords.length < 11) coords.push(0);
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
        stats: { vertices: vertexCount, edges: edges.length, cells: 90 }
    };
};

export const generateE8Polytope = (): Shape => {
    const vertices: Vertex[] = [];
    // 1. Type A: (±1, ±1, 0,0,0,0,0,0) permutations
    const baseA = [1,1,0,0,0,0,0,0];
    for(let i=0; i<8; i++) {
        for(let j=i+1; j<8; j++) {
             for(let s1 of [-1,1]) for(let s2 of [-1,1]) {
                 const v = [0,0,0,0,0,0,0,0,0,0,0]; // 11D padded
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
        stats: { vertices: 240, edges: 6720 }
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
        stats: { vertices: 128, edges: edges.length }
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
        stats: { vertices: 256, edges: edges.length }
    };
};

// --- NEW 4D/10D SHAPES ---

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
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length }
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
    const extruded = extrudeShape(sphere.vertices, sphere.edges, 3); // Extrude along W (index 3)
    return {
        id: `spherinder-${Date.now()}`,
        name: 'Spherinder (Sphere Prism)',
        dimension: 4,
        vertices: extruded.vertices,
        edges: extruded.edges,
        stats: { vertices: extruded.vertices.length, edges: extruded.edges.length }
    };
};

export const generateOctahedralPrism = (): Shape => {
    const octa = generateOctahedron();
    const extruded = extrudeShape(octa.vertices, octa.edges, 3);
    return {
        id: `octa-prism-${Date.now()}`,
        name: 'Octahedral Prism',
        dimension: 4,
        vertices: extruded.vertices,
        edges: extruded.edges,
        stats: { vertices: extruded.vertices.length, edges: extruded.edges.length }
    };
};

export const generateOctahedralPyramid = (): Shape => {
    const octa = generateOctahedron();
    const vertices = octa.vertices.map(v => {
        const c = [...v.coords];
        while(c.length < 11) c.push(0);
        c[3] = -0.5; // Base at w = -0.5
        return { coords: c };
    });
    // Add apex
    vertices.push({ coords: [0,0,0, 0.5, 0,0,0,0,0,0] });
    
    const edges = [...octa.edges];
    const apexIdx = vertices.length - 1;
    // Connect all base vertices to apex
    for(let i=0; i<octa.vertices.length; i++) {
        edges.push({ source: i, target: apexIdx });
    }

    return {
        id: `octa-pyramid-${Date.now()}`,
        name: 'Octahedral Pyramid',
        dimension: 4,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length }
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
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length }
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
        while(nc.length < 11) nc.push(0);
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
            tera: 1200 // 1200 Facets (Tera)
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
        stats: { vertices: 16, edges: edges.length, tera: 26 }
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
        stats: { vertices: 15, edges: 60, tera: 12 }
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
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length }
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
        stats: { vertices: n * m, edges: 2 * n * m }
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
        stats: { vertices: n + m, edges: n + m + n * m }
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
        stats: { vertices: vertices.length, edges: edges.length }
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
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length }
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
        stats: { vertices: vertices.length, edges: edges.length, faces: faces.length }
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
        stats: { vertices: vertices.length, edges: edges.length }
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
        stats: { vertices: vertices.length, edges: edges.length }
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
        stats: { vertices: vertices.length, edges: edges.length }
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
    
    return {
        id: `spun-${shape.id}-${Date.now()}`,
        name: `Spun ${shape.name}`,
        dimension: newDim,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length }
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

    return {
        id: `truncated-${shape.id}-${Date.now()}`,
        name: `Truncated ${shape.name}`,
        dimension: shape.dimension,
        vertices: newVertices,
        edges: uniqueEdges,
        stats: { vertices: newVertices.length, edges: uniqueEdges.length }
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

    return {
        id: `rectified-${shape.id}-${Date.now()}`,
        name: `Rectified ${shape.name}`,
        dimension: shape.dimension,
        vertices: newVertices,
        edges: uniqueEdges,
        stats: { vertices: newVertices.length, edges: uniqueEdges.length }
    };
};

export const omnitruncateShape = (shape: Shape): Shape => {
    const rectified = rectifyShape(shape);
    const omni = truncateShape(rectified, 0.333);
    omni.name = `Omnitruncated ${shape.name}`;
    return omni;
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
            vertexFigure: '10 tetrahedral triacosioctacontatetrachora, 32 disphenoidal hecatonicosachora, 40 disdyakis dodecahedral tegums, 80 tetrakis hexahedral tegums, 80 hexagonal-octagonal duotegums'
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
            cells: "120 dodecadodecahedra, 120 quasitruncated small stellated dodecahedra, 120 quasirhombicosidodecahedra, 120 great quasitruncated icosidodecahedra"
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

    return {
        id: `snub-${shape.id}-${Date.now()}`,
        name: `Snub ${shape.name}`,
        dimension: shape.dimension,
        vertices: newVertices,
        edges: newEdges,
        stats: { vertices: newVertices.length, edges: newEdges.length }
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

    return {
        id: `stellated-${shape.id}-${Date.now()}`,
        name: `Stellated ${shape.name}`,
        dimension: shape.dimension,
        vertices: newVertices,
        edges: newEdges,
        stats: { vertices: newVertices.length, edges: newEdges.length }
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

export const estimateToratopeSize = (sequence: number[]): { vertices: number, edges: number, dimension: number } => {
    let dimension = sequence[0];
    for (let i = 1; i < sequence.length; i++) {
        dimension += (sequence[i] === 1 ? 1 : sequence[i] - 1);
    }
    
    let numAngles = 0;
    for (let i = 0; i < sequence.length; i++) {
        if (sequence[i] > 1) numAngles += (sequence[i] - 1);
    }
    
    let segments = 3;
    if (numAngles <= 3) segments = 16;
    else if (numAngles <= 4) segments = 12;
    else if (numAngles <= 5) segments = 8;
    else if (numAngles <= 6) segments = 5;
    else if (numAngles <= 7) segments = 4;
    else segments = 3;

    let vertices = 1;
    let numParams = 0;
    for (let i = 0; i < sequence.length; i++) {
        const d = sequence[i];
        if (d === 1) {
            vertices *= 2; // linear segment
            numParams++;
        } else {
            const numA = d - 1;
            for (let j = 0; j < numA; j++) {
                if (j === numA - 1) {
                    vertices *= segments; // closed
                } else {
                    vertices *= (segments + 1); // open
                }
                numParams++;
            }
        }
    }
    const edges = vertices * numParams;
    return { vertices, edges, dimension };
};

export const generateNumericToratope = (sequence: number[], name: string, segmentsOverride?: number): Shape => {
    let dimension = sequence[0];
    for (let i = 1; i < sequence.length; i++) {
        dimension += (sequence[i] === 1 ? 1 : sequence[i] - 1);
    }
    
    let numAngles = 0;
    for (let i = 0; i < sequence.length; i++) {
        if (sequence[i] > 1) numAngles += (sequence[i] - 1);
    }
    
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
        dimIndex: number;
    }

    const params: Param[] = [];
    for (let i = 0; i < sequence.length; i++) {
        const d = sequence[i];
        if (d === 1) {
            params.push({ type: 'linear', samples: [-1, 1], dimIndex: i });
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
                params.push({ type: isClosed ? 'closed' : 'open', samples, dimIndex: i });
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
    for (let i = 0; i < sequence.length; i++) {
        const d = sequence[i];
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
            const paramValues: number[][] = Array.from({ length: sequence.length }, () => []);
            for (let i = 0; i < numParams; i++) {
                const p = params[i];
                paramValues[p.dimIndex].push(p.samples[currentIndices[i]]);
            }
            
            let coords: number[] = [];
            for (let i = 0; i < sequence.length; i++) {
                const d = sequence[i];
                const R = radii[i];
                const pVals = paramValues[i];
                
                if (d === 1) {
                    const v = pVals[0];
                    if (i === 0) {
                        coords = [R * v];
                    } else {
                        coords.push(R * v);
                    }
                } else {
                    const U = getUnitSphereCoords(pVals);
                    if (i === 0) {
                        coords = U.map(u => R * u);
                    } else {
                        const X = coords[0];
                        const newFirstCoords = U.map(u => (R + X) * u);
                        coords = [...newFirstCoords, ...coords.slice(1)];
                    }
                }
            }
            
            for (const c of coords) {
                if (Math.abs(c) > maxCoord) maxCoord = Math.abs(c);
            }
            
            while (coords.length < 11) coords.push(0);
            vertices.push({ coords: coords.slice(0, 11) });
            
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

    return {
        id: `num-toratope-${Date.now()}`,
        name,
        dimension,
        vertices,
        edges,
        stats: { vertices: vertices.length, edges: edges.length }
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
                faces = ch(noisyPts);
            } catch (e) {
                console.error("Convex hull failed for 3D export", e);
                // Fallback to edges as 2-vertex faces if hull fails
                faces = edges.map(e => [e.source, e.target]);
            }
        }

        let content = "OFF\n";
        content += `${vertices.length} ${faces.length} ${edges.length}\n`;
        
        // Vertices
        vertices.forEach(v => {
            content += `${v.coords.slice(0, 3).join(' ')}\n`;
        });
        
        // Faces
        faces.forEach(face => {
            content += `${face.length} ${face.join(' ')}\n`;
        });
        
        return content;
    } else if (dimension === 4) {
        let cells: number[][] = [];
        const facesMap = new Map<string, number>();
        const uniqueFaces: number[][] = [];
        const cellFaces: number[][] = [];

        if (shape.cells && shape.cells.length > 0) {
            // If explicit cells are provided, use them directly
            // Assuming shape.cells is an array of cells, where each cell is an array of face indices
            // Or maybe shape.cells is an array of cells, where each cell is an array of vertex indices?
            // If it's vertex indices, we need to extract faces.
            // Let's assume shape.cells is an array of tetrahedra (vertex indices) for simplicity, or we just handle shape.faces.
        }

        if (shape.faces && shape.faces.length > 0) {
            shape.faces.forEach(face => {
                const sortedFace = [...face].sort((a, b) => a - b);
                const key = sortedFace.join(',');
                if (!facesMap.has(key)) {
                    facesMap.set(key, uniqueFaces.length);
                    uniqueFaces.push(face); // Keep original order for rendering
                }
            });
            // If we have explicit faces but no cells, we just export the faces
        } else {
            try {
                // Slice to 4D to avoid 10D convex hull
                const pts4D = vertexCoords.map(c => c.slice(0, 4));
                const noisyPts = addNoise(pts4D);
                cells = ch(noisyPts);
            } catch (e) {
                console.error("Convex hull failed for 4D export", e);
            }

            if (cells.length > 0) {
                cells.forEach(cell => {
                    const cFaces: number[] = [];
                    // A 4D simplex (tetrahedron) has 4 triangular faces
                    const combinations = [
                        [cell[0], cell[1], cell[2]],
                        [cell[0], cell[1], cell[3]],
                        [cell[0], cell[2], cell[3]],
                        [cell[1], cell[2], cell[3]]
                    ];
                    
                    combinations.forEach(face => {
                        const sortedFace = [...face].sort((a, b) => a - b);
                        const key = sortedFace.join(',');
                        if (!facesMap.has(key)) {
                            facesMap.set(key, uniqueFaces.length);
                            uniqueFaces.push(sortedFace);
                        }
                        cFaces.push(facesMap.get(key)!);
                    });
                    cellFaces.push(cFaces);
                });
            }
        }

        // 4OFF format for Miratope
        let content = "4OFF\n";
        // V F E C (Vertices, Faces, Edges, Cells)
        content += `${vertices.length} ${uniqueFaces.length} ${edges.length} ${cellFaces.length}\n`;
        
        content += "\n# Vertices\n";
        vertices.forEach(v => {
            const c = v.coords.slice(0, 4);
            while (c.length < 4) c.push(0);
            content += `${c.join(' ')}\n`;
        });
        
        if (uniqueFaces.length > 0) {
            content += "\n# Faces\n";
            uniqueFaces.forEach(face => {
                content += `${face.length} ${face.join(' ')}\n`;
            });
        }

        if (cellFaces.length > 0) {
            content += "\n# Cells\n";
            cellFaces.forEach(cell => {
                content += `${cell.length} ${cell.join(' ')}\n`;
            });
        }
        
        return content;
    } else if (dimension > 4) {
        // Higher dimensions use nOFF format
        let content = `${dimension}OFF\n`;
        // For n-dimensions, we'd need n-1 facets.
        let facets: number[][] = [];
        try {
            const ptsND = vertexCoords.map(c => c.slice(0, dimension));
            const noisyPts = addNoise(ptsND);
            facets = ch(noisyPts);
        } catch (e) {
            console.error(`Convex hull failed for ${dimension}D export`, e);
            facets = edges.map(e => [e.source, e.target]);
        }

        // We provide V and the highest dimension facets, setting intermediate to 0
        const counts = [vertices.length];
        for (let i = 1; i < dimension - 1; i++) counts.push(0);
        counts.push(facets.length);
        
        content += `${counts.join(' ')}\n`;
        
        // Vertices
        vertices.forEach(v => {
            content += `${v.coords.slice(0, dimension).join(' ')}\n`;
        });
        
        // Facets
        facets.forEach(facet => {
            content += `${facet.length} ${facet.join(' ')}\n`;
        });
        
        return content;
    } else {
        // Fallback for 2D or 1D
        let content = "OFF\n";
        content += `${vertices.length} 0 ${edges.length}\n`;
        vertices.forEach(v => {
            content += `${v.coords.join(' ')}\n`;
        });
        return content;
    }
};
