import { generate600Cell } from './services/mathUtils.ts';
import ch from 'convex-hull';

const s600 = generate600Cell();
const pts = s600.vertices.map(v => v.coords.slice(0, 4));
const addNoise = (coords: number[][]) => 
    coords.map(p => p.map(c => c + (Math.random() - 0.5) * 1e-9));
const noisyPts = addNoise(pts);
const cells = ch(noisyPts);
console.log("Cells:", cells.length);
console.log("First cell:", cells[0]);
