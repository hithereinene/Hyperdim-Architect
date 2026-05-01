import { generateSmallDisprismatohexacosihecatonicosachoron } from './services/mathUtils.ts';

const sdh = generateSmallDisprismatohexacosihecatonicosachoron();
console.log("SDH Vertices:", sdh.vertices.length);
console.log("SDH Edges:", sdh.edges.length);
