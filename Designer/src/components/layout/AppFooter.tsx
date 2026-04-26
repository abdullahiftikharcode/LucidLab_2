import React from 'react';

interface AppFooterProps {
  className?: string;
}

export default function AppFooter({ className = '' }: AppFooterProps) {
  return (
    <footer className={`px-4 sm:px-6 pt-2 pb-8 text-center ${className}`.trim()}>
      <p className="text-sm text-slate-400">© 2026 Lucid Lab Studio.</p>
    </footer>
  );
}
