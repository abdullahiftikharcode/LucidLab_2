import * as React from 'react';
import { ToolMode, ToolbarContextValue } from './toolbar.types';

const ToolbarContext = React.createContext<ToolbarContextValue | null>(null);

export function ToolbarProvider({ children }: { children: React.ReactNode }) {
    const [activeTool, setActiveTool] = React.useState<ToolMode>(ToolMode.Hand);
    const [selectedObjectName, setSelectedObject] = React.useState<string | null>(null);

    const value = React.useMemo<ToolbarContextValue>(
        () => ({
            activeTool,
            selectedObjectName,
            setActiveTool,
            setSelectedObject,
        }),
        [activeTool, selectedObjectName],
    );

    return React.createElement(ToolbarContext.Provider, { value }, children);
}

export function useToolbar(): ToolbarContextValue {
    const ctx = React.useContext(ToolbarContext);
    if (!ctx) {
        throw new Error('useToolbar must be used inside <ToolbarProvider>');
    }
    return ctx;
}

export { ToolbarContext };
