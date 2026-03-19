import ch from 'convex-hull';
const pts = [
  [1, 0, 0, 0],
  [-1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, -1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, -1, 0],
  [0, 0, 0, 1],
  [0, 0, 0, -1]
];
const cells = ch(pts);
console.log("Cells:", cells.length);
console.log("First cell:", cells[0]);
