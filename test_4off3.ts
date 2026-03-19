import { generate600Cell } from './services/mathUtils.ts';
import ch from 'convex-hull';

const s600 = generate600Cell();
const pts = s600.vertices.map(v => v.coords.slice(0, 4));
const addNoise = (coords: number[][]) => 
    coords.map(p => p.map(c => c + (Math.random() - 0.5) * 1e-9));
const noisyPts = addNoise(pts);
const cells = ch(noisyPts);

// Extract unique faces
const facesMap = new Map<string, number>();
const uniqueFaces: number[][] = [];
const cellFaces: number[][] = [];

cells.forEach(cell => {
    // cell is an array of 4 vertex indices
    const cFaces: number[] = [];
    // 4 combinations of 3 vertices
    const combinations = [
        [cell[0], cell[1], cell[2]],
        [cell[0], cell[1], cell[3]],
        [cell[0], cell[2], cell[3]],
        [cell[1], cell[2], cell[3]]
    ];
    
    combinations.forEach(face => {
        face.sort((a, b) => a - b);
        const key = face.join(',');
        if (!facesMap.has(key)) {
            facesMap.set(key, uniqueFaces.length);
            uniqueFaces.push(face);
        }
        cFaces.push(facesMap.get(key)!);
    });
    cellFaces.push(cFaces);
});

console.log("Vertices:", pts.length);
console.log("Edges:", s600.edges.length);
console.log("Faces:", uniqueFaces.length);
console.log("Cells:", cellFaces.length);

let content = "4OFF\n";
content += `${pts.length} ${s600.edges.length} ${uniqueFaces.length} ${cellFaces.length}\n\n`;

content += "# Vertices\n";
pts.forEach(p => {
    content += `${p.join(' ')}\n`;
});

content += "\n# Faces\n";
uniqueFaces.forEach(f => {
    content += `${f.length} ${f.join(' ')}\n`;
});

content += "\n# Cells\n";
cellFaces.forEach(c => {
    content += `${c.length} ${c.join(' ')}\n`;
});

console.log(content.substring(0, 500));
