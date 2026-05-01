import { generate120Cell } from './services/mathUtils.ts';

const cell120 = generate120Cell();
console.log("v[0] length:", cell120.vertices[0].coords.length);
console.log("v[0] coords:", cell120.vertices[0].coords);
