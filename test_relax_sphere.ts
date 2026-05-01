import { generateHypercube, rectifyShape } from './services/mathUtils.ts';

const cube = generateHypercube(3);
const rrCube = rectifyShape(rectifyShape(cube));

const vertices = rrCube.vertices.map(v => ({ coords: [...v.coords] }));
const edges = rrCube.edges;

for (let iter = 0; iter < 300; iter++) {
    let avgLen = 0;
    const lengths = edges.map(e => {
        const p1 = vertices[e.source].coords;
        const p2 = vertices[e.target].coords;
        let distSq = 0;
        for (let i = 0; i < p1.length; i++) distSq += (p1[i] - p2[i]) ** 2;
        const dist = Math.sqrt(distSq);
        avgLen += dist;
        return dist;
    });
    avgLen /= edges.length;
    
    const forces = vertices.map(v => new Array(v.coords.length).fill(0));
    
    edges.forEach((e, i) => {
        const p1 = vertices[e.source].coords;
        const p2 = vertices[e.target].coords;
        const dist = lengths[i];
        if (dist === 0) return;
        
        const diff = (dist - avgLen) / dist * 0.5;
        
        for (let d = 0; d < p1.length; d++) {
            const f = (p2[d] - p1[d]) * diff;
            forces[e.source][d] += f;
            forces[e.target][d] -= f;
        }
    });
    
    let avgRadius = 0;
    vertices.forEach((v, i) => {
        let rSq = 0;
        for (let d = 0; d < v.coords.length; d++) {
            v.coords[d] += forces[i][d] * 0.1;
            rSq += v.coords[d] ** 2;
        }
        avgRadius += Math.sqrt(rSq);
    });
    avgRadius /= vertices.length;
    
    // Project to sphere
    vertices.forEach(v => {
        let rSq = 0;
        for (let d = 0; d < v.coords.length; d++) rSq += v.coords[d] ** 2;
        const r = Math.sqrt(rSq);
        for (let d = 0; d < v.coords.length; d++) {
            v.coords[d] = v.coords[d] / r * avgRadius;
        }
    });
}

let minLen = Infinity;
let maxLen = -Infinity;
edges.forEach(e => {
    const p1 = vertices[e.source].coords;
    const p2 = vertices[e.target].coords;
    let distSq = 0;
    for (let i = 0; i < p1.length; i++) distSq += (p1[i] - p2[i]) ** 2;
    const dist = Math.sqrt(distSq);
    if (dist < minLen) minLen = dist;
    if (dist > maxLen) maxLen = dist;
});

console.log("Min edge length:", minLen);
console.log("Max edge length:", maxLen);

// Check if it's a rhombicuboctahedron
// Rhombicuboctahedron has 8 triangles and 18 squares.
// Let's check the face degrees.
// We don't have faces, but we can check the angles between adjacent edges.
// For a vertex, it has 4 edges. The angles should be 60, 90, 90, 120? No, 60, 90, 90, 90.
// Wait, a vertex in rhombicuboctahedron is adjacent to 1 triangle and 3 squares.
// So the angles between adjacent edges are 60, 90, 90, 90.
const v0 = vertices[0].coords;
const adj = edges.filter(e => e.source === 0 || e.target === 0).map(e => e.source === 0 ? e.target : e.source);
const adjCoords = adj.map(i => vertices[i].coords);

const angles = [];
for(let i=0; i<adjCoords.length; i++) {
    for(let j=i+1; j<adjCoords.length; j++) {
        const p1 = adjCoords[i];
        const p2 = adjCoords[j];
        let dot = 0;
        let n1 = 0, n2 = 0;
        for(let d=0; d<3; d++) {
            const v1 = p1[d] - v0[d];
            const v2 = p2[d] - v0[d];
            dot += v1 * v2;
            n1 += v1*v1;
            n2 += v2*v2;
        }
        const angle = Math.acos(dot / Math.sqrt(n1*n2)) * 180 / Math.PI;
        angles.push(angle);
    }
}
angles.sort((a,b) => a-b);
console.log("Angles at vertex 0:", angles.map(a => Math.round(a)));

