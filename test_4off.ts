import { generate600Cell, generateOFFContent } from './services/mathUtils.ts';
import ch from 'convex-hull';

const s600 = generate600Cell();
const pts = s600.vertices.map(v => v.coords);
const cells = ch(pts);
console.log("Cells:", cells.length);
console.log("First cell:", cells[0]);
