import { GoogleGenAI, Type } from "@google/genai";
import { Shape } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using Flash for speed as requested for general text tasks
const MODEL_NAME = 'gemini-3-flash-preview'; 

export const generateShapeWithGemini = async (prompt: string, currentDim: number): Promise<{ shape: Shape, text: string }> => {
  
  const systemInstruction = `
    You are a high-dimensional geometry architect. 
    Your goal is to generate geometric shapes based on user requests for a simulation engine that supports up to 10 dimensions.
    
    The coordinates are arrays of numbers [x, y, z, w, v, u, t, s, r, q].
    - 1D uses [x]
    - 2D uses [x, y]
    - 3D uses [x, y, z]
    - 4D uses [x, y, z, w]
    - 5D uses [x, y, z, w, v]
    - 6D uses [x, y, z, w, v, u]
    - 7D uses [x, y, z, w, v, u, t]
    - 8D uses [x, y, z, w, v, u, t, s]
    - 9D uses [x, y, z, w, v, u, t, s, r]
    - 10D uses [x, y, z, w, v, u, t, s, r, q]
    
    Center shapes around the origin. Scale should be roughly -1 to 1.
    
    When asked for a shape, return the JSON structure for vertices and edges.
    Also provide a short explanation of what this shape represents in the 'explanation' field.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `User Prompt: ${prompt}. \nTarget Dimension: ${currentDim}D.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shape: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                dimension: { type: Type.INTEGER },
                vertices: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      coords: { 
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER }
                      }
                    }
                  }
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      source: { type: Type.INTEGER },
                      target: { type: Type.INTEGER }
                    }
                  }
                }
              }
            },
            explanation: { type: Type.STRING }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Post-process to ensure IDs and safety
    if (result.shape) {
        result.shape.id = `gen-${Date.now()}`;
        if (!result.shape.vertices) result.shape.vertices = [];
        if (!result.shape.edges) result.shape.edges = [];
        // Ensure coords have enough zeros if AI returns fewer
        result.shape.vertices.forEach((v: any) => {
           while(v.coords.length < 10) v.coords.push(0);
        });
    }

    return { shape: result.shape, text: result.explanation };
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate shape.");
  }
};

export const explainDimension = async (dim: number): Promise<string> => {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Explain the concept of the ${dim}-th dimension in a simple, intuitive way for a visual simulation user. Keep it under 100 words. Focus on how it relates to the previous dimension (extrusion).`,
  });
  return response.text || "Dimension info unavailable.";
};

export const explainToratope = async (sequence: number[]): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `The user is about to load a multi-dimensional toratope with the numeric sequence [${sequence.join(', ')}]. 
To understand this notation, read from left to right:
- The first number is the base shape: 1 = line segment, 2 = circle/disk, 3 = solid sphere, 4 = 4D sphere (glome), etc.
- Each subsequent number modifies the shape: 
  - 1 = linear extrusion (makes it a prism/cylinder).
  - 2 = circular revolution (wraps it into a torus/ring).
  - 3 = spherical revolution (wraps it spherically).
  - n = n-dimensional spherical revolution.
Describe what this shape looks like geometrically in 1-2 short sentences based on these rules. Keep it simple, intuitive, and explain its structure step-by-step. Do not warn them about performance, just describe the shape's geometry.`,
    });
    return response.text || "A complex multi-dimensional shape.";
  } catch (error) {
    console.error("Error explaining toratope:", error);
    return "A complex multi-dimensional shape.";
  }
};