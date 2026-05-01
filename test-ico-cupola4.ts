import { generateIcosahedron, expandShape, generateSegmentochoron } from './services/mathUtils.ts';

const v1 = generateIcosahedron();
const v2 = expandShape(generateIcosahedron());
v1.edges = []; v2.edges = []; // ignore original shape edges
const shape = generateSegmentochoron(v1, v2, 'test', 'test');
console.log('Cross edges returned by generated segmentochoron:', shape.edges.length);
