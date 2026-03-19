import { generate600Cell, generate120Cell } from './services/mathUtils.ts';

function rectifyRegular(shape: any) {
    const newVertices: any[] = [];
    const newEdges: any[] = [];
    
    const edgeMap = new Map<string, number>();
    
    shape.edges.forEach((e: any) => {
        const p1 = shape.vertices[e.source].coords;
        const p2 = shape.vertices[e.target].coords;
        const mid = p1.map((c: number, i: number) => (c + (p2[i] || 0)) / 2);
        const idx = newVertices.length;
        newVertices.push({ coords: mid });
        const key = e.source < e.target ? `${e.source},${e.target}` : `${e.target},${e.source}`;
        edgeMap.set(key, idx);
    });

    const adj = new Map<number, number[]>();
    shape.edges.forEach((e: any) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source)!.push(e.target);
        adj.get(e.target)!.push(e.source);
    });

    adj.forEach((neighbors, v) => {
        // find minimum distance between midpoints of edges meeting at v
        let minDistSq = Infinity;
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
        
        // connect midpoints at minimum distance
        const epsilon = 1e-5;
        for (let i = 0; i < neighbors.length; i++) {
            for (let j = i + 1; j < neighbors.length; j++) {
                const n1 = neighbors[i];
                const n2 = neighbors[j];
                const k1 = v < n1 ? `${v},${n1}` : `${n1},${v}`;
                const k2 = v < n2 ? `${v},${n2}` : `${n2},${v}`;
                const idx1 = edgeMap.get(k1)!;
                const idx2 = edgeMap.get(k2)!;
                
                let distSq = 0;
                for (let k = 0; k < newVertices[idx1].coords.length; k++) {
                    distSq += (newVertices[idx1].coords[k] - newVertices[idx2].coords[k]) ** 2;
                }
                
                if (Math.abs(distSq - minDistSq) < epsilon) {
                    newEdges.push({ source: idx1, target: idx2 });
                }
            }
        }
    });

    // remove duplicate edges
    const uniqueEdges = [];
    const seen = new Set();
    for (const e of newEdges) {
        const k = e.source < e.target ? `${e.source},${e.target}` : `${e.target},${e.source}`;
        if (!seen.has(k)) {
            seen.add(k);
            uniqueEdges.push(e);
        }
    }

    console.log(shape.name, "rectified edges:", uniqueEdges.length);
}

rectifyRegular(generate600Cell());
rectifyRegular(generate120Cell());
