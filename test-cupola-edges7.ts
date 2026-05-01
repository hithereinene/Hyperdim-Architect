import { generateIcosahedron, ch, solveLinearSystem, Shape, Vertex, Edge } from './services/mathUtils.ts';

const expandShapeNoRelax = (shape: Shape): Shape => {
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
    let simplices = ch(noisyPts);

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
    let dualSimplices = ch(noisyDual);
    
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

    return {
        id: `expanded-${shape.id}`,
        name: `Expanded ${shape.name}`,
        dimension: dim,
        vertices: newVertices,
        edges: newEdges
    };
};

const baseShape = generateIcosahedron();
const expShape = expandShapeNoRelax(baseShape);

const dim = 4;

const scaleShape = (shape: any, targetEdgeLen: number) => {
    let avgEdgeLen = 0;
    if (shape.edges.length > 0) {
        let total = 0;
        let count = 0;
        shape.edges.forEach((e: any) => {
            const v1 = shape.vertices[e.source].coords;
            const v2 = shape.vertices[e.target].coords;
            let distSq = 0;
            for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
                const c1 = v1[i] !== undefined ? v1[i] : 0;
                const c2 = v2[i] !== undefined ? v2[i] : 0;
                distSq += Math.pow(c1 - c2, 2);
            }
            if (distSq > 0.001) {
                total += Math.sqrt(distSq);
                count++;
            }
        });
        if (count > 0) avgEdgeLen = total / count;
    }
    const scale = targetEdgeLen / (avgEdgeLen || 1);
    return shape.vertices.map((v: any) => ({
        coords: v.coords.map((c: number) => c * scale)
    }));
};

const v1 = scaleShape(baseShape, 1);
const v2 = scaleShape(expShape, 1);

let minSq = Infinity;
for (let i = 0; i < v1.length; i++) {
    for (let j = 0; j < v2.length; j++) {
        let distSq = 0;
        for (let d = 0; d < 3; d++) {
            const c1 = v1[i].coords[d] || 0;
            const c2 = v2[j].coords[d] || 0;
            distSq += Math.pow(c1 - c2, 2);
        }
        if (distSq < minSq) minSq = distSq;
    }
}

let height = 1.0;
if (minSq <= 1) height = Math.sqrt(1 - minSq);

const targetDist = minSq <= 1 ? 1.0 : Math.sqrt(minSq + height * height);

const newVertices = [];
v1.forEach((v:any) => {
    const c = [...v.coords];
    while (c.length < dim) c.push(0);
    c[dim - 1] = -height / 2;
    newVertices.push({ coords: c });
});
const offset = newVertices.length;
v2.forEach((v:any) => {
    const c = [...v.coords];
    while (c.length < dim) c.push(0);
    c[dim - 1] = height / 2;
    newVertices.push({ coords: c });
});

for (let tol of [0.05, 0.1, 0.2, 0.3]) {
    let count = 0;
    for (let i = 0; i < v1.length; i++) {
        for (let j = 0; j < v2.length; j++) {
            let distSq = 0;
            for (let d = 0; d < dim; d++) {
                distSq += Math.pow(newVertices[i].coords[d] - newVertices[j + offset].coords[d], 2);
            }
            const dist = Math.sqrt(distSq);
            if (Math.abs(dist - targetDist) < tol) {
                count++;
            }
        }
    }
    console.log("Tol:", tol, "Edges:", count);
}
