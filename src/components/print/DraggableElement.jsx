import React, { useState, useEffect } from 'react';

/**
 * Komponen pembungkus elemen yang dapat digeser (drag & drop)
 * Digunakan khusus untuk penyesuaian posisi cetak form Dot Matrix NCR
 */
export default function DraggableElement({ defaultTop, defaultLeft, children, className }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setStartPos({ x: clientX - pos.x, y: clientY - pos.y });
    e.stopPropagation();
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setPos({ x: clientX - startPos.x, y: clientY - startPos.y });
    };
    const handlePointerUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove, { passive: false });
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, startPos]);

  return (
    <div
      className={`absolute cursor-move hover:outline hover:outline-1 hover:outline-blue-400 hover:bg-blue-50/20 print:hover:outline-none print:hover:bg-transparent ${className || ''}`}
      style={{ top: defaultTop, left: defaultLeft, transform: `translate(${pos.x}px, ${pos.y}px)`, touchAction: 'none' }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
    >
      {children}
    </div>
  );
}
