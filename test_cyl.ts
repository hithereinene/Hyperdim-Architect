import { generateCylinder, rectifyShape } from './services/mathUtils.ts';

const cyl = generateCylinder(24);
const rcyl = rectifyShape(cyl);
console.log("Cylinder edges:", cyl.edges.length);
console.log("Rectified Cylinder edges:", rcyl.edges.length);
