import { generateHypercube, generateIcosahedron, Shape, Vertex, Edge } from './services/mathUtils.ts';

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

// Find minimum distance between any vertex in v1 and any vertex in v2 when placed at same origin
let minSq = Infinity;
for (let i=0; i<v1.length; i++) {
    for (let j=0; j<v2.length; j++) {
        let distSq = 0;
        for (let d=0; d<3; d++) distSq += Math.pow(v1[i].coords[d] - v2[j].coords[d], 2);
        if (distSq < minSq) minSq = distSq;
    }
}

console.log("Min distance squared in 3D:", minSq);
// We want total distance squared to be 1.
// 1 = minSq + h^2  =>  h = sqrt(1 - minSq)
if (minSq <= 1) {
    const h = Math.sqrt(1 - minSq);
    console.log("Calculated height:", h);
} else {
    console.log("minSq > 1, impossible to connect with length 1");
}
