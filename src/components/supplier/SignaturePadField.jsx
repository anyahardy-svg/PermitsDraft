import React, { useEffect, useRef, useState } from 'react';

const padStyles = {
  container: {
    width: '100%',
    height: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'crosshair',
    display: 'block',
    touchAction: 'none',
    maxWidth: '100%',
    height: '100%',
  },
  hint: {
    fontSize: '0.8125rem',
    color: '#6B7280',
    fontStyle: 'italic',
    padding: '8px 12px',
    backgroundColor: '#F3F4F6',
    textAlign: 'center',
    borderRadius: '4px',
    marginTop: '8px',
  },
  clearButton: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#FEE2E2',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    fontSize: '0.8125rem',
    color: '#991B1B',
    fontWeight: 600,
  },
};

export default function SignaturePadField({ value, onChange }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(Boolean(value));

  useEffect(() => {
    setHasSignature(Boolean(value));
  }, [value]);

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    onChange(canvas.toDataURL('image/png'));
    setHasSignature(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) {
      return;
    }
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange('');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || contextRef.current) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const actualWidth = Math.max(rect.width, 300);
    const actualHeight = Math.max(rect.height, 160);

    canvas.width = actualWidth;
    canvas.height = actualHeight;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${actualHeight}px`;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, actualWidth, actualHeight);
    contextRef.current = ctx;
  }, []);

  useEffect(() => {
    if (!value) {
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const actualWidth = Math.max(rect.width, 300);
    const actualHeight = Math.max(rect.height, 160);

    canvas.width = actualWidth;
    canvas.height = actualHeight;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${actualHeight}px`;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, actualWidth, actualHeight);
    contextRef.current = ctx;

    const img = new Image();
    img.onload = () => {
      const currentCtx = contextRef.current;
      const currentCanvas = canvasRef.current;
      if (!currentCtx || !currentCanvas) {
        return;
      }
      currentCtx.fillStyle = 'white';
      currentCtx.fillRect(0, 0, currentCanvas.width, currentCanvas.height);
      currentCtx.drawImage(img, 0, 0, currentCanvas.width, currentCanvas.height);
      setHasSignature(true);
    };
    img.src = value;
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) {
      return;
    }

    const ctx = contextRef.current;

    const getPoint = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    const handleMouseDown = (e) => {
      const { x, y } = getPoint(e.clientX, e.clientY);
      isDrawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleMouseMove = (e) => {
      if (!isDrawingRef.current) {
        return;
      }
      const { x, y } = getPoint(e.clientX, e.clientY);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current) {
        return;
      }
      isDrawingRef.current = false;
      ctx.closePath();
      saveSignature();
    };

    const handleTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = getPoint(touch.clientX, touch.clientY);
      isDrawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawingRef.current) {
        return;
      }
      const touch = e.touches[0];
      const { x, y } = getPoint(touch.clientX, touch.clientY);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      if (!isDrawingRef.current) {
        return;
      }
      isDrawingRef.current = false;
      ctx.closePath();
      saveSignature();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} style={padStyles.container}>
        <canvas ref={canvasRef} style={padStyles.canvas} />
      </div>
      <div style={padStyles.hint}>
        Sign above with your mouse or trackpad
      </div>
      {hasSignature && (
        <button type="button" onClick={clearSignature} style={padStyles.clearButton}>
          Clear Signature
        </button>
      )}
    </div>
  );
}
