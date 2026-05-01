import { generateIcosahedron, cupolizeShape, calculateNormal } from './services/mathUtils.ts';
import ch from 'convex-hull';

export const addNoise = (pts: number[][], iter = 0): number[][] => {
    return pts.map(p => p.map(val => val + (Math.random() - 0.5) * 1e-7 * Math.pow(10, iter)));
};

const shape = generateIcosahedron();
const cupola = cupolizeShape(shape);

const pts4D = cupola.vertices.map(v => v.coords.map(c=>c||0).slice(0, 4));
const noisyPts = addNoise(pts4D);
const hull = ch(noisyPts);

const cellGroups = new Map<string, number[][]>();
for (const tet of hull) {
    const n = calculateNormal(tet.map(i => pts4D[i]), 4);
    if (n) {
        const key = n.map(c => c.toFixed(6)).join(',');
        if (!cellGroups.has(key)) cellGroups.set(key, []);
        cellGroups.get(key)!.push(tet);
    }
}
console.log('Cell groups:', cellGroups.size);
let hist = [];
for(let [k,v] of cellGroups.entries()) hist.push({k, len: v.length});
hist.sort((a,b)=>b.len-a.len);
console.log('Largest cell sizes:', hist.slice(0, 10));

