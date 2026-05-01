import { generate120Cell, expandShape, generateSegmentochoron } from './services/mathUtils.ts';

const cell120 = generate120Cell();
const expanded = expandShape(cell120);

// We run what cupolizeShape runs manually
const dim = Math.max(cell120.dimension, expanded.dimension) + 1;

const scaleShape = (shape, targetEdgeLen) => {
    let avgEdgeLen = 0;
    if (shape.edges.length > 0) {
        shape.edges.forEach(e => {
            const p1 = shape.vertices[e.source].coords;
            const p2 = shape.vertices[e.target].coords;
            let distSq = 0;
            for (let i = 0; i < p1.length; i++) distSq += Math.pow((p1[i] || 0) - (p2[i] || 0), 2);
            avgEdgeLen += Math.sqrt(distSq);
        });
        avgEdgeLen /= shape.edges.length;
    } else {
        avgEdgeLen = 1;
    }
    if (avgEdgeLen === 0 || isNaN(avgEdgeLen)) avgEdgeLen = 1;
    console.log("avgEdgeLen:", avgEdgeLen);
    const scale = targetEdgeLen / avgEdgeLen;
    console.log("scale:", scale);
    return shape.vertices.map(v => ({
        coords: v.coords.map(c => (c || 0) * scale)
    }));
};

const v1 = scaleShape(cell120, 1);
const v2 = scaleShape(expanded, 1);

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
console.log("minSq:", minSq);

let height = 1.0;
if (minSq <= 1) {
    height = Math.sqrt(1 - minSq);
} else {
    height = 1.0;
}
console.log("height:", height);
