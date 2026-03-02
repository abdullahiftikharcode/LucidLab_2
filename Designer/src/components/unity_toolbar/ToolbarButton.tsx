import * as React from 'react';
import { ToolMode } from './toolbar.types';
import './toolbar.css';

interface ToolbarButtonProps {
    icon: React.ReactNode;
    tool: ToolMode;
    shortcut: string;
    isActive: boolean;
    onClick: () => void;
}

export function ToolbarButton({ icon, tool, shortcut, isActive, onClick }: ToolbarButtonProps) {
    return (
        <button
            className={`unity-toolbar-button ${isActive ? 'active' : ''}`}
            onClick={onClick}
            title={`${tool} Tool (${shortcut.toUpperCase()})`}
            type="button"
        >
            {icon}
        </button>
    );
}
