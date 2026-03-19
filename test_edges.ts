import { generate600Cell, generate120Cell } from './services/mathUtils.ts';

console.log("600-cell edges:", generate600Cell().edges.length);
console.log("120-cell edges:", generate120Cell().edges.length);
