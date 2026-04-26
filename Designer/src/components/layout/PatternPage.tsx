import React, { useEffect } from 'react';

interface PatternPageProps {
  children: React.ReactNode;
  className?: string;
  fontFamily?: string;
}

export default function PatternPage({
  children,
  className = '',
  fontFamily = "'Quicksand', 'Inter', sans-serif",
}: PatternPageProps) {
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--app-vh', `${vh}px`);
    };

    // Set immediately on mount — before any resize event fires
    setVh();

    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  return (
    <div
      className={`pattern-page ${className}`.trim()}
      style={{ fontFamily }}
    >
      {children}
    </div>
  );
}