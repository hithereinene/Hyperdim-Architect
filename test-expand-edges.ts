import { generate120Cell, expandShape } from './services/mathUtils.ts';

const cell120 = generate120Cell();
const expanded = expandShape(cell120);

console.log("Expanded edges length:", expanded.edges.length);
