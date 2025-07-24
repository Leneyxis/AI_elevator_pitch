'use client';
import { useState, useRef, useEffect } from 'react';
import { FiInfo } from 'react-icons/fi';
import { createPortal } from 'react-dom';

export function InfoTooltip({ text }: { text: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const tooltip = isVisible && mounted ? (
    <div
      className="fixed z-[9999] w-64 rounded-lg bg-gray-800 p-3 text-sm text-white shadow-lg pointer-events-none transition-opacity duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {text}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800" />
    </div>
  ) : null;

  return (
    <>
      <span 
        ref={triggerRef}
        className="relative inline-block ml-1 cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <FiInfo className="text-gray-400" />
      </span>
      
      {mounted && createPortal(tooltip, document.body)}
    </>
  );
}