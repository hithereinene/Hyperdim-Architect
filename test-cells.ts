import { generateIcosahedron, cupolizeShape, calculateNormal, addNoise } from './services/mathUtils.ts';
import ch from 'convex-hull';

const shape = generateIcosahedron();
const cupola = cupolizeShape(shape);

const pts4D = cupola.vertices.map(v => v.coords.map(c=>c||0).slice(0, 4));
const noisyPts = addNoise(pts4D);
const hull = ch(noisyPts);

const cellGroups = new Map<string, number[][]>();
for (const tet of hull) {
    const n = calculateNormal(tet.map(i => pts4D[i]), 4);
    if (n) {
        // use pts4D instead of noisyPts for the normal calculation so there is NO NOISE in the normal!
        const key = n.map(c => c.toFixed(6)).join(',');
        if (!cellGroups.has(key)) cellGroups.set(key, []);
        cellGroups.get(key)!.push(tet);
    }
}
console.log('Cell groups:', cellGroups.size);
let hist = [];
for(let v of cellGroups.values()) hist.push(v.length);
hist.sort((a,b)=>b-a);
console.log('Largest cell sizes:', hist.slice(0, 10));

