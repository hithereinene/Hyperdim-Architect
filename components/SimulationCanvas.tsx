import React, { useRef, useEffect, useState } from 'react';
import { Shape, RotationState, AXIS_LABELS } from '../types';
import { rotateVertex, projectVertex } from '../services/mathUtils';

interface SimulationCanvasProps {
  shape: Shape;
  rotations: RotationState;
  activeDim: number;
  autoRotate: boolean;
  zoom: number;
  setZoom: (z: number) => void;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ shape, rotations, activeDim, autoRotate, zoom, setZoom }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  
  // Performance Monitoring State
  const fpsRef = useRef<number>(60);
  const lastTimeRef = useRef<number>(0);
  const lowPerfFrameCount = useRef<number>(0);
  
  // Touch Handling State for Zoom
  const touchDistRef = useRef<number | null>(null);
  
  // We use state for visual feedback, but Refs for render logic to avoid re-render loops
  const [isLowPerf, setIsLowPerf] = useState(false);
  const isLowPerfRef = useRef(false);

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom sensitivity
    const delta = e.deltaY * -0.001;
    setZoom(Math.max(0.01, Math.min(10, zoom + delta)));
  };

  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistRef.current !== null) {
      const newDist = getTouchDistance(e.touches[0], e.touches[1]);
      const delta = newDist - touchDistRef.current;
      
      // Sensitivity factor for pinch zoom
      const sensitivity = 0.005; 
      const newZoom = Math.max(0.01, Math.min(10, zoom + delta * sensitivity));
      
      setZoom(newZoom);
      touchDistRef.current = newDist; // Update reference distance for smooth continuous zooming
    }
  };

  const handleTouchEnd = () => {
    touchDistRef.current = null;
  };

  const draw = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Performance Monitoring ---
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const currentFps = 1000 / (deltaTime || 16);
    // Smooth FPS
    fpsRef.current = 0.9 * fpsRef.current + 0.1 * currentFps;

    if (fpsRef.current < 25) {
        lowPerfFrameCount.current++;
    } else {
        lowPerfFrameCount.current = Math.max(0, lowPerfFrameCount.current - 1);
    }

    // If consistent lag for ~1 second (60 frames), switch mode
    if (lowPerfFrameCount.current > 45 && !isLowPerfRef.current) {
        isLowPerfRef.current = true;
        setIsLowPerf(true);
    } 
    // If FPS recovers significantly, we could switch back, but usually lag is shape-dependent.
    // We'll require a manual reset (e.g. changing shape) to clear it effectively, 
    // or just let it stick for this session.
    // For now, let's keep it sticky until shape changes.

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Check if resize needed (optimization)
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    } else {
        // Just clear
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#0f172a'; // Slate 900
        ctx.fillRect(0, 0, rect.width, rect.height);
    }

    const width = rect.width;
    const height = rect.height;

    // Calculate effective rotations
    const currentRotations = { ...rotations };
    if (autoRotate) {
       const speed = 0.0005 * time;
       currentRotations['XZ'] = (currentRotations['XZ'] || 0) + speed;
       currentRotations['XW'] = (currentRotations['XW'] || 0) + speed * 0.7;
       currentRotations['YW'] = (currentRotations['YW'] || 0) + speed * 0.5;
       if (activeDim >= 5) {
         currentRotations['XV'] = (currentRotations['XV'] || 0) + speed * 0.3;
       }
    }

    // Process vertices
    // Scale multiplier: 200 pixels roughly = 1 unit
    // Apply Zoom here
    const baseScale = Math.min(width, height) / 3.5; 
    const finalScale = baseScale * zoom;

    const projectedVertices = shape.vertices.map(v => {
      const rotated = rotateVertex(v, currentRotations, activeDim);
      return projectVertex(rotated, width, height, finalScale, activeDim);
    });

    // Draw Edges
    // Skip edges if Low Performance Mode is active
    if (!isLowPerfRef.current && shape.edges) {
        ctx.lineWidth = 2;
        // Optimization: Batch rendering if possible? 
        // HTML5 Canvas paths are faster if batched by color, but we use gradients.
        // For heavy shapes, gradients are expensive.
        // If FPS is medium (e.g. < 40), maybe switch to solid color first?
        // For now, simplify to solid color if vert count > 500 automatically
        
        const useSimpleColor = shape.vertices.length > 500;

        if (useSimpleColor) {
             ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)'; // Static purple
             ctx.beginPath();
             shape.edges.forEach(edge => {
                const v1 = projectedVertices[edge.source];
                const v2 = projectedVertices[edge.target];
                if (!v1 || !v2) return;
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
             });
             ctx.stroke();
        } else {
            shape.edges.forEach(edge => {
              const v1 = projectedVertices[edge.source];
              const v2 = projectedVertices[edge.target];
              if (!v1 || !v2) return;
              
              const depthAlpha = Math.min(1, Math.max(0.2, (v1.scaleFactor + v2.scaleFactor) / 2));
              const gradient = ctx.createLinearGradient(v1.x, v1.y, v2.x, v2.y);
              gradient.addColorStop(0, `rgba(56, 189, 248, ${depthAlpha})`);
              gradient.addColorStop(1, `rgba(168, 85, 247, ${depthAlpha})`);
        
              ctx.strokeStyle = gradient;
              ctx.beginPath();
              ctx.moveTo(v1.x, v1.y);
              ctx.lineTo(v2.x, v2.y);
              ctx.stroke();
            });
        }
    }

    // Draw Vertices
    // If low perf, draw simple rects instead of arcs
    if (isLowPerfRef.current || shape.vertices.length > 1000) {
        ctx.fillStyle = '#f8fafc';
        projectedVertices.forEach(v => {
            ctx.fillRect(v.x - 1, v.y - 1, 2, 2);
        });
    } else {
        projectedVertices.forEach(v => {
          const size = 3 * v.scaleFactor;
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(v.x, v.y, Math.max(1, size), 0, Math.PI * 2);
          ctx.fill();
        });
    }
  };

  useEffect(() => {
    // Reset low perf mode when shape changes
    isLowPerfRef.current = false;
    setIsLowPerf(false);
    lowPerfFrameCount.current = 0;
    fpsRef.current = 60;
  }, [shape.id]); // Reset on new shape

  useEffect(() => {
    const animate = (time: number) => {
      timeRef.current = time;
      draw(time);
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [shape, rotations, activeDim, autoRotate, zoom]);

  return (
    <div 
        className="w-full h-full relative touch-none" // touch-none prevents default browser zooming
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block rounded-xl shadow-2xl border border-slate-700 bg-slate-900 cursor-zoom-in"
        />
        {isLowPerf && (
             <div className="absolute top-4 right-4 bg-amber-500/20 text-amber-300 border border-amber-500/50 px-3 py-1 rounded text-xs font-bold animate-pulse pointer-events-none">
                 Low FPS Detected: Reduced Fidelity
             </div>
        )}
    </div>
  );
};

export default SimulationCanvas;