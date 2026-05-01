import { generateHypercube, generateIcosahedron, Shape, Vertex, Edge } from './services/mathUtils.ts';
import ch from 'convex-hull';

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
    const scale = targetEdgeLen / avgEdgeLen;
    return shape.vertices.map(v => ({
        coords: v.coords.map(c => c * scale)
    }));
};

const v1 = scaleShape(generateHypercube(3), 1);
const v2 = scaleShape(generateIcosahedron(), 1);

const pts: number[][] = [];
v1.forEach(v => {
    pts.push([...v.coords, -0.5]);
});
v2.forEach(v => {
    pts.push([...v.coords, 0.5]);
});

// Add noise
const noisyPts = pts.map(p => p.map(val => val + (Math.random() - 0.5) * 1e-7));

const simplices = ch(noisyPts);

const edges = new Set<string>();
simplices.forEach(simplex => {
    for (let i=0; i<simplex.length; i++) {
        for (let j=i+1; j<simplex.length; j++) {
            const u = simplex[i];
            const v = simplex[j];
            const key = u < v ? `${u},${v}` : `${v},${u}`;
            edges.add(key);
        }
    }
});

console.log("Vertices:", pts.length);
console.log("Edges:", edges.size);
