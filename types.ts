export interface Vertex {
  // Coordinates for up to 11 dimensions: x, y, z, w, v, u, t, s, r, p, q
  coords: number[]; 
}

export interface Edge {
  source: number; // Index in vertices array
  target: number; // Index in vertices array
}

export interface ShapeStats {
  vertices?: number | string; // 0-faces
  edges?: number | string;    // 1-faces
  faces?: number | string;    // 2-faces
  cells?: number | string;    // 3-faces
  tera?: number | string;     // 4-faces
  peta?: number | string;     // 5-faces
  exa?: number | string;      // 6-faces
  theta?: number | string;    // 7-faces
  yotta?: number | string;    // 8-faces
  ronna?: number | string;    // 9-faces
  quetta?: number | string;   // 10-faces
  ronna2?: number | string;   // 11-faces
  vertexFigure?: string;
}

export interface Shape {
  id: string;
  name: string;
  vertices: Vertex[];
  edges: Edge[];
  faces?: number[][]; // Optional explicit faces for non-convex shapes
  cells?: number[][]; // Optional explicit cells for non-convex 4D shapes
  dimension: number; // The dimension this shape 'lives' in naturally
  stats?: ShapeStats;
}

export type RotationState = {
  [key: string]: number; // e.g., "XY": 0.5 (radians)
};

export const AXIS_LABELS = ['X', 'Y', 'Z', 'W', 'V', 'U', 'T', 'S', 'R', 'P', 'Q'];

export interface GenerationResponse {
  shape: Shape;
  explanation: string;
}