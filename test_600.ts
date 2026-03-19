import { generate600Cell, rectifyShape } from './services/mathUtils.ts';

const s600 = generate600Cell();
console.log("600-cell edges:", s600.edges.length);
const r600 = rectifyShape(s600);
console.log("Rectified 600-cell edges:", r600.edges.length);
