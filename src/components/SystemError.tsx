import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SystemErrorProps {
    title?: string;
    message: string;
    action?: () => void;
    actionLabel?: string;
}

export function SystemError({
    title = "System Data Error",
    message,
    action,
    actionLabel = "Retry"
}: SystemErrorProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground animate-in fade-in zoom-in duration-300">
            <div className="max-w-md w-full text-center space-y-6 p-8 border rounded-2xl shadow-lg bg-card/50 backdrop-blur-sm">
                <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground">{message}</p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Button
                        size="lg"
                        className="w-full font-semibold"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Page
                    </Button>

                    {action && (
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full"
                            onClick={action}
                        >
                            {actionLabel}
                        </Button>
                    )}

                    <div className="text-xs text-muted-foreground pt-4 border-t mt-4">
                        <p>If this persists, please contact the system administrator.</p>
                        <p className="font-mono mt-1 opacity-50">Error Code: SYS_DATA_INTEGRITY</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
