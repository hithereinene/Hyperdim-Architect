import { generateSegmentochoron, generateCubeAtopIcosahedron, generateCubeAtopCuboctahedron, generateOctahedronAtopRhombicuboctahedron, generateCuboctahedronAtopTruncatedCube } from './services/mathUtils.ts';

const testShapes = [
    { fn: generateCubeAtopIcosahedron, name: "Cube Atop Icosahedron" },
    { fn: generateCubeAtopCuboctahedron, name: "Cube Atop Cuboctahedron" },
    { fn: generateOctahedronAtopRhombicuboctahedron, name: "Octahedron Atop Rhombicuboctahedron" },
    { fn: generateCuboctahedronAtopTruncatedCube, name: "Cuboctahedron Atop Truncated Cube" }
];

for(let test of testShapes) {
   const shape = test.fn();
   // For these compound functions, they call generateSegmentochoron internally.
   // We want to test their output edges.
   console.log(`${test.name}: V=${shape.vertices.length}, E=${shape.edges.length}`);
}
