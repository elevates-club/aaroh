import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Users,
    Calendar,
    Award,
    AlertTriangle,
    Clock,
    Trophy,
    Activity,
    UserX,
    ArrowRight,
    Palette,
    GraduationCap,
    Zap,
    Shield,
    Target,
    LayoutDashboard
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES, getYearLabel } from '@/lib/constants';
import { hasRole, getCoordinatorYear as getYearFromRole } from '@/lib/roleUtils';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

interface EventAtLimit {
    id: string;
    name: string;
    category: 'on_stage' | 'off_stage';
    max_entries_per_year: number;
    currentCount: number;
}

interface RecentRegistration {
    id: string;
    studentName: string;
    eventName: string;
    status: string;
    createdAt: string;
}

interface TopEvent {
    id: string;
    name: string;
    category: 'on_stage' | 'off_stage';
    count: number;
}

export function CoordinatorDashboard() {
    const { profile } = useAuth();
    const { activeRole } = useRole();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        myYearStudents: 0,
        activeEvents: 0,
        myRegistrations: 0,
        pendingApprovals: 0,
        unregisteredStudents: 0,
    });
    const [eventsAtLimit, setEventsAtLimit] = useState<EventAtLimit[]>([]);
    const [recentRegistrations, setRecentRegistrations] = useState<RecentRegistration[]>([]);
    const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const coordinatorYear = getYearFromRole(activeRole);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const cards = document.getElementsByClassName('bento-card');
            for (const card of cards as any) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [activeRole]);

    const fetchAllData = async () => {
        const year = coordinatorYear as 'first' | 'second' | 'third' | 'fourth';
        if (!year) return;

        setLoading(true);
        await Promise.all([
            fetchBasicStats(year),
            fetchEventsAtLimit(year),
            fetchRecentRegistrations(year),
            fetchTopEvents(year),
        ]);
        setLoading(false);
    };

    const fetchBasicStats = async (year: 'first' | 'second' | 'third' | 'fourth') => {
        const { count: studentsCount } = await supabase.from('students').select('id', { count: 'exact' }).eq('year', year);
        const { count: eventsCount } = await supabase.from('events').select('id', { count: 'exact' }).eq('is_active', true);
        const { data: regData } = await supabase.from('registrations').select(`id, status, student:students!inner(year)`).eq('student.year', year);

        const registrationsCount = regData?.length || 0;
        const pendingCount = regData?.filter(r => r.status === 'pending').length || 0;

        const { data: allStudents } = await supabase.from('students').select('id').eq('year', year);
        const { data: registeredStudents } = await supabase.from('registrations').select(`student_id, student:students!inner(year)`).eq('student.year', year);

        const registeredIds = new Set(registeredStudents?.map(r => r.student_id) || []);
        const unregisteredCount = (allStudents?.length || 0) - registeredIds.size;

        setStats({
            myYearStudents: studentsCount || 0,
            activeEvents: eventsCount || 0,
            myRegistrations: registrationsCount,
            pendingApprovals: pendingCount,
            unregisteredStudents: unregisteredCount > 0 ? unregisteredCount : 0,
        });
    };

    const fetchEventsAtLimit = async (year: 'first' | 'second' | 'third' | 'fourth') => {
        const { data: events } = await supabase.from('events').select('id, name, category, max_entries_per_year').eq('is_active', true).not('max_entries_per_year', 'is', null);
        if (!events) return;
        const limitedEvents: EventAtLimit[] = [];
        for (const event of events) {
            const { data: regs } = await supabase.from('registrations').select(`id, student:students!inner(year)`).eq('event_id', event.id).eq('student.year', year).neq('status', 'rejected');
            const currentCount = regs?.length || 0;
            const limit = event.max_entries_per_year || 999;
            if (currentCount >= limit * 0.8) {
                limitedEvents.push({ id: event.id, name: event.name, category: event.category as 'on_stage' | 'off_stage', max_entries_per_year: limit, currentCount });
            }
        }
        setEventsAtLimit(limitedEvents.sort((a, b) => (b.currentCount / b.max_entries_per_year) - (a.currentCount / a.max_entries_per_year)));
    };

    const fetchRecentRegistrations = async (year: 'first' | 'second' | 'third' | 'fourth') => {
        const { data } = await supabase.from('registrations').select(`id, status, created_at, student:students!inner(name, year), event:events!inner(name)`).eq('student.year', year).order('created_at', { ascending: false }).limit(5);
        if (data) {
            setRecentRegistrations(data.map((r: any) => ({ id: r.id, studentName: r.student.name, eventName: r.event.name, status: r.status, createdAt: r.created_at })));
        }
    };

    const fetchTopEvents = async (year: 'first' | 'second' | 'third' | 'fourth') => {
        const { data } = await supabase.from('registrations').select(`event_id, student:students!inner(year), event:events!inner(id, name, category)`).eq('student.year', year);
        if (data) {
            const eventCounts: Record<string, { name: string; category: string; count: number }> = {};
            data.forEach((r: any) => {
                const eventId = r.event_id;
                if (!eventCounts[eventId]) {
                    eventCounts[eventId] = { name: r.event.name, category: r.event.category, count: 0 };
                }
                eventCounts[eventId].count++;
            });
            const sorted = Object.entries(eventCounts).map(([id, info]) => ({ id, ...info })).sort((a, b) => b.count - a.count).slice(0, 5) as TopEvent[];
            setTopEvents(sorted);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Simple Light Header */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {coordinatorYear ? `${getYearLabel(coordinatorYear)} Year` : 'Year'} Coordinator
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Yearly Event Management
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-card px-4 py-2 rounded-full shadow-sm border border-border/50">
                    <div className="flex items-center gap-3 pr-4 border-r border-border/50">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {profile?.full_name?.charAt(0) || 'C'}
                        </div>
                        <div className="text-sm">
                            <p className="font-bold leading-none text-foreground">{profile?.full_name?.split(' ')[0]}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Coordinator</p>
                        </div>
                    </div>
                    <Button className="h-8 rounded-full px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate('/registrations')}>
                        <Shield className="h-3 w-3 mr-2" /> Verify
                    </Button>
                </div>
            </header>

            {/* Simple Light Bento Grid */}
            <div className="bento-grid">

                {/* 1. COHORT MOMENTUM (8 Cols) */}
                <Card className="md:col-span-8 md:row-span-2 border-none bg-primary text-primary-foreground shadow-lg shadow-primary/20 h-[380px] flex flex-col justify-between p-8 relative overflow-hidden group rounded-[2rem]">
                    {/* Decorative background */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-foreground/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

                    <div className="relative z-10 flex justify-between items-start">
                        <Badge className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none font-bold uppercase tracking-wider text-[10px]">Registrations</Badge>
                        <Target className="h-6 w-6 text-primary-foreground/50" />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <p className="text-[8rem] font-bold tracking-tighter leading-none text-primary-foreground">
                            {stats.myRegistrations.toLocaleString()}
                        </p>
                        <p className="text-lg text-primary-foreground/80 font-medium">Total Year Registrations</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-auto relative z-10 border-t border-primary-foreground/20 pt-8">
                        <div>
                            <p className="text-3xl font-bold text-primary-foreground">{stats.pendingApprovals}</p>
                            <p className="text-xs text-primary-foreground/60 font-semibold uppercase tracking-wider mt-1">Pending Review</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-primary-foreground">{stats.unregisteredStudents}</p>
                            <p className="text-xs text-primary-foreground/60 font-semibold uppercase tracking-wider mt-1">Not Yet Registered</p>
                        </div>
                    </div>
                </Card>

                {/* 2. BASELINE DATA (4 Cols) */}
                <Card className="md:col-span-4 bento-card border-none shadow-sm hover:shadow-md transition-shadow h-[180px] flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border/50">
                            <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold tracking-tight text-foreground">{stats.myYearStudents}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Total Students</p>
                    </div>
                </Card>

                {/* 3. SYNC NAV (4 Cols) */}
                <Card className={`md:col-span-4 bento-card border-none shadow-sm hover:shadow-md transition-shadow h-[180px] flex flex-col justify-between p-6 cursor-pointer group ${loading ? 'opacity-70 pointer-events-none' : ''}`} onClick={() => fetchAllData()}>
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border/50 group-hover:bg-primary/10 transition-colors">
                            <Activity className={`h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors ${loading ? 'animate-spin' : ''}`} />
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{loading ? 'Syncing...' : 'Refresh'}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">{loading ? 'Updating Dashboard...' : 'Sync Latest Data'}</p>
                    </div>
                </Card>

                {/* 4. CAPACITY GUARD (12 Cols) */}
                <Card className="md:col-span-12 bento-card border-none shadow-sm p-8 h-auto bg-card">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-bold text-foreground">Limit Reminder</h3>
                        </div>
                        {eventsAtLimit.length === 0 && (
                            <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20">All Clear</Badge>
                        )}
                    </div>

                    <div className="space-y-4">
                        {eventsAtLimit.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {eventsAtLimit.map(e => (
                                    <div key={e.id} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-bold text-amber-600">{e.name}</h3>
                                            <span className="text-xs font-bold text-amber-600">{e.currentCount} / {e.max_entries_per_year}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-amber-500/20 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${e.currentCount >= e.max_entries_per_year ? 'bg-destructive' : 'bg-amber-500'}`}
                                                style={{ width: `${(e.currentCount / e.max_entries_per_year) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl border-2 border-dashed border-border/50 text-center text-sm font-medium text-muted-foreground">
                                No events have reached their limit.
                            </div>
                        )}
                    </div>
                </Card>

                {/* 5. POPULARITY (6 Cols) */}
                <Card className="md:col-span-6 bento-card border-none shadow-sm h-[400px] p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-foreground">Top Events</h3>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full"><Trophy className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex-1 space-y-4">
                        {topEvents.map((event, index) => (
                            <div key={event.id} className="flex items-center justify-between group p-2 hover:bg-muted/50 rounded-xl transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                                        {index + 1}
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold text-foreground">{event.name}</p>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-60">{event.category.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="font-bold">{event.count}</Badge>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* 6. COHORT AUDIT (6 Cols) */}
                <Card className="md:col-span-6 bento-card border-none shadow-sm h-[400px] p-0 flex flex-col overflow-hidden">
                    <div className="p-8 pb-4 flex items-center justify-between border-b border-border/50">
                        <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
                    </div>
                    <ScrollArea className="flex-1 p-0">
                        <div className="divide-y divide-border/50">
                            {recentRegistrations.length > 0 ? (
                                recentRegistrations.map((reg) => (
                                    <div key={reg.id} className="p-4 px-8 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs ${reg.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                                {reg.studentName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{reg.studentName}</p>
                                                <p className="text-xs text-muted-foreground truncate w-40">{reg.eventName}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            {formatDistanceToNow(new Date(reg.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                                        <UserX className="h-6 w-6 text-muted-foreground/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-foreground">No Recent Registrations</p>
                                        <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">No students have registered recently.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </Card>

            </div>
        </div>
    );
}
