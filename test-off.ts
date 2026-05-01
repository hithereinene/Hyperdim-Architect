import * as fs from 'fs';
import { parseOFF } from './services/mathUtils.ts';

const offContent = fs.readFileSync('test.off', 'utf-8');
const shape = parseOFF(offContent);
console.log(shape.vertices.length, shape.edges.length);
