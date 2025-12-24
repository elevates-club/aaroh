import { useEffect, useState } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { supabase } from '@/integrations/supabase/client';
import { getCoordinatorYear } from '@/lib/roleUtils';
import { Loader2, Bell } from 'lucide-react';

export function SidebarStatus() {
    const { activeRole } = useRole();
    const [count, setCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchStatus() {
            setLoading(true);

            if (activeRole === 'event_manager') {
                const { count: activeCount } = await supabase
                    .from('events')
                    .select('id', { count: 'exact', head: true })
                    .eq('is_active', true);
                setCount(activeCount || 0);
                setLoading(false);
                return;
            }

            if (activeRole === 'student') {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: studentData } = await supabase
                            .from('students')
                            .select('id')
                            .eq('user_id', user.id)
                            .single();

                        if (studentData) {
                            const { count: regCount } = await supabase
                                .from('registrations')
                                .select('id', { count: 'exact', head: true })
                                .eq('student_id', studentData.id);
                            setCount(regCount || 0);
                        } else {
                            setCount(0);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching student status:', err);
                    setCount(null);
                }
                setLoading(false);
                return;
            }

            const year = getCoordinatorYear(activeRole);
            if (!year) {
                setCount(null);
                setLoading(false);
                return;
            }

            // Coordinator specific fetch
            const { data } = await supabase
                .from('registrations')
                .select('student:students!inner(year)')
                .eq('status', 'pending')
                .eq('student.year', year);

            setCount(data?.length || 0);
            setLoading(false);
        }

        fetchStatus();

        // Optional: Subscribe to changes (omitted for simplicity, can add if requested)
        const interval = setInterval(fetchStatus, 30000); // Polling fallback
        return () => clearInterval(interval);
    }, [activeRole]);

    if (activeRole !== 'event_manager' && activeRole !== 'student' && !getCoordinatorYear(activeRole)) return null;

    const isCoordinator = !!getCoordinatorYear(activeRole);
    const isStudent = activeRole === 'student';
    const isEventManager = activeRole === 'event_manager';

    return (
        <div className="mt-auto px-4 pb-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-[20px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />

                <div className="relative z-10 flex items-start justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Status</span>
                    <Bell className="h-3 w-3 text-primary animate-pulse" />
                </div>

                <div className="relative z-10">
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-foreground tracking-tighter">{count}</span>
                            <span className="text-xs font-bold text-muted-foreground">
                                {isCoordinator ? 'Pending' : isStudent ? 'Registrations' : 'Active Events'}
                            </span>
                        </div>
                    )}
                    <p className="text-[10px] text-muted-foreground font-medium mt-1 leading-tight">
                        {isCoordinator ? 'Requests awaiting your review.' : isStudent ? 'Your total event registrations.' : 'Live events currently running.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
