import { generate120Cell, rectifyShape, generateOFFContent } from './services/mathUtils.ts';

const s120 = generate120Cell();
const r120 = rectifyShape(s120);
console.log("Rectified 120-cell edges:", r120.edges.length);

const offContent = generateOFFContent(r120);
console.log("OFF Content length:", offContent.length);
