import { supabase } from '@/integrations/supabase/client';

/**
 * Helper to fetch client IP address.
 * Uses a public IP echo service with a short timeout.
 */
const getClientIP = async (): Promise<string | null> => {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

        const response = await fetch('https://api.ipify.org?format=json', {
            signal: controller.signal
        });
        clearTimeout(id);

        if (response.ok) {
            const data = await response.json();
            return data.ip;
        }
    } catch (error) {
        // Fail silently on IP fetch error
        console.warn('Failed to fetch IP for logging', error);
    }
    return null;
};

/**
 * Centralized activity logger that automatically captures IP and User Agent
 */
export const logActivity = async (
    userId: string | undefined,
    action: string,
    details: any
) => {
    if (!userId) return;

    // Attempt to get IP, but don't block heavily
    // We start the IP fetch but don't await it immediately to allow UI to proceed if needed, 
    // but here we want it for the log, so we await.
    const ip_address = await getClientIP();
    const user_agent = navigator.userAgent;

    const { error } = await supabase.from('activity_logs').insert([
        {
            user_id: userId,
            action,
            details,
            ip_address,
            user_agent,
        },
    ]);

    if (error) {
        console.error('Failed to log activity:', error);
    }
};
