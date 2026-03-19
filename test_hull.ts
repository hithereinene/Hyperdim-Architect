import { generate120Cell } from './services/mathUtils.ts';
import ch from 'convex-hull';

const s120 = generate120Cell();
const midpoints = [];
s120.edges.forEach(e => {
    const p1 = s120.vertices[e.source].coords;
    const p2 = s120.vertices[e.target].coords;
    midpoints.push(p1.map((c, i) => (c + p2[i]) / 2));
});

console.log("Midpoints:", midpoints.length);

// add jitter
const jittered = midpoints.map(p => p.map(c => c + (Math.random() - 0.5) * 1e-5));

const hull = ch(jittered);
console.log("Hull facets:", hull.length);

const edges = new Set();
hull.forEach(facet => {
    for (let i=0; i<facet.length; i++) {
        for (let j=i+1; j<facet.length; j++) {
            const a = facet[i];
            const b = facet[j];
            const key = a < b ? `${a},${b}` : `${b},${a}`;
            edges.add(key);
        }
    }
});

console.log("Hull edges:", edges.size);
