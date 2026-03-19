import ch from 'convex-hull';
const pts = [
  [1, 1, 0],
  [1, -1, 0],
  [-1, 1, 0],
  [-1, -1, 0]
];
try {
  console.log(ch(pts));
} catch (e) {
  console.error(e.message);
}
