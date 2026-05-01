import { generateHypercube, relaxShape, Vertex, Edge, Shape } from './services/mathUtils.ts';
import ch from 'convex-hull';

const solveLinearSystem = (A: number[][], b: number[]): number[] | null => {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
        }
        const temp = M[i];
        M[i] = M[maxRow];
        M[maxRow] = temp;
        if (Math.abs(M[i][i]) < 1e-10) return null;
        for (let k = i + 1; k < n; k++) {
            const factor = M[k][i] / M[i][i];
            for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
        }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) sum += M[i][j] * x[j];
        x[i] = (M[i][n] - sum) / M[i][i];
    }
    return x;
};

export const expandShapeGeneric = (shape: Shape): Shape => {
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
        return shape;
    }
    if (!simplices || simplices.length === 0) return shape;

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
        return shape;
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

    return relaxShape(expanded, 300);
};

const cube = generateHypercube(3);
const expanded = expandShapeGeneric(cube);

let minLen = Infinity;
let maxLen = -Infinity;
expanded.edges.forEach(e => {
    const p1 = expanded.vertices[e.source].coords;
    const p2 = expanded.vertices[e.target].coords;
    let distSq = 0;
    for (let i = 0; i < p1.length; i++) distSq += (p1[i] - p2[i]) ** 2;
    const dist = Math.sqrt(distSq);
    if (dist < minLen) minLen = dist;
    if (dist > maxLen) maxLen = dist;
});

console.log("Expanded Cube Vertices:", expanded.vertices.length);
console.log("Expanded Cube Edges:", expanded.edges.length);
console.log("Min edge length:", minLen);
console.log("Max edge length:", maxLen);
