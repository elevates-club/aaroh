import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Users,
    Calendar,
    FileText,
    Clock,
    TrendingUp,
    Activity,
    ArrowRight,
    Trophy,
    CheckCircle,
    XCircle,
    Palette,
    Award,
    Sparkles,
    Zap,
    LayoutDashboard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getYearLabel } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

interface Stats {
    totalStudents: number;
    totalEvents: number;
    activeEvents: number;
    totalRegistrations: number;
    pendingRegistrations: number;
    todayRegistrations: number;
    rejectedRegistrations: number;
}

interface YearStat {
    year: string;
    students: number;
    registrations: number;
}

export function EventManagerDashboard() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [stats, setStats] = useState<Stats>({
        totalStudents: 0,
        totalEvents: 0,
        activeEvents: 0,
        totalRegistrations: 0,
        pendingRegistrations: 0,
        todayRegistrations: 0,
        rejectedRegistrations: 0
    });
    const [yearStats, setYearStats] = useState<YearStat[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [attentionEvents, setAttentionEvents] = useState<{ atCapacity: any[], lowParticipation: any[] }>({ atCapacity: [], lowParticipation: [] });

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
        fetchDashboardData().then(data => {
            if (data) setAttentionEvents(data);
        });
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const [
                { count: studentsCount },
                { count: eventsCount },
                { count: activeEventsCount },
                { count: registrationsCount },
                { count: pendingCount },
                { count: todayCount },
                { data: eventsData }
            ] = await Promise.all([
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('events').select('*', { count: 'exact', head: true }),
                supabase.from('events').select('*', { count: 'exact', head: true }).eq('is_active', true),
                supabase.from('registrations').select('*', { count: 'exact', head: true }).neq('status', 'rejected'),
                supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('registrations')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', new Date().toISOString().split('T')[0])
                    .neq('status', 'rejected'),
                supabase.from('events')
                    .select('*, registrations(count)')
                    .eq('is_active', true),
                supabase.from('registrations')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'rejected')
            ]);

            setStats({
                totalStudents: studentsCount || 0,
                totalEvents: eventsCount || 0,
                activeEvents: activeEventsCount || 0,
                totalRegistrations: registrationsCount || 0,
                pendingRegistrations: pendingCount || 0,
                todayRegistrations: todayCount || 0,
                rejectedRegistrations: (await supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'rejected')).count || 0
            });

            const processedEvents = (eventsData || []).map((event: any) => ({
                ...event,
                registrationCount: event.registrations?.[0]?.count || 0
            }));

            const atCapacity = processedEvents.filter(e =>
                e.max_participants && e.registrationCount >= e.max_participants
            );

            const lowParticipation = processedEvents.filter(e =>
                e.registrationCount < 5 &&
                (!e.max_participants || e.registrationCount < e.max_participants)
            );

            await fetchYearStats();

            const { data: activity } = await supabase
                .from('registrations')
                .select(`
                    id,
                    created_at,
                    status,
                    student:students(name, year, roll_number),
                    event:events(name, category)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (activity) {
                setRecentActivity(activity);
            }

            return { atCapacity, lowParticipation };

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            return { atCapacity: [], lowParticipation: [] };
        } finally {
            setLoading(false);
        }
    };

    const fetchYearStats = async () => {
        const years: ('first' | 'second' | 'third' | 'fourth')[] = ['first', 'second', 'third', 'fourth'];
        const yearData: YearStat[] = [];
        for (const year of years) {
            const { count: students } = await supabase.from('students').select('id', { count: 'exact' }).eq('year', year);
            const { data: regs } = await supabase.from('registrations').select('id, student:students!inner(year)').eq('student.year', year).neq('status', 'rejected');
            yearData.push({ year, students: students || 0, registrations: regs?.length || 0 });
        }
        setYearStats(yearData);
    };

    const getYearColor = (year: string) => {
        switch (year) {
            case 'first': return 'bg-indigo-500';
            case 'second': return 'bg-purple-500';
            case 'third': return 'bg-pink-500';
            case 'fourth': return 'bg-orange-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Simple Light Header */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Event Management
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Festival Logistics & Telemetry
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-card px-4 py-2 rounded-full shadow-sm border border-border/50">
                    <div className="flex items-center gap-3 pr-4 border-r border-border/50">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {profile?.full_name?.charAt(0) || 'E'}
                        </div>
                        <div className="text-sm">
                            <p className="font-bold leading-none text-foreground">{profile?.full_name ? profile.full_name.split(' ')[0] : 'Manager'}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Manager</p>
                        </div>
                    </div>
                    <Button className="h-8 rounded-full px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate('/events')}>
                        <LayoutDashboard className="h-3 w-3 mr-2" /> New Event
                    </Button>
                </div>
            </header>

            {/* Apple-Style Symmetrical Bento Grid */}
            <div className="bento-grid">

                {/* 1. MASTER METRICS (8 Cols) */}
                <Card className="md:col-span-8 md:row-span-2 border-none bg-primary text-primary-foreground shadow-lg shadow-primary/20 h-[380px] flex flex-col justify-between p-8 relative overflow-hidden group rounded-[2rem]">
                    {/* Decorative background */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-foreground/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

                    <div className="relative z-10 flex justify-between items-start">
                        <Badge className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none font-bold uppercase tracking-wider text-[10px]">Real-time Registrations</Badge>
                        <Trophy className="h-6 w-6 text-primary-foreground/50" />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <p className="text-[8rem] font-bold tracking-tighter leading-none text-primary-foreground">
                            {stats.totalRegistrations.toLocaleString()}
                        </p>
                        <p className="text-lg text-primary-foreground/80 font-medium">Total Registrations</p>
                    </div>

                    <div className="grid grid-cols-3 gap-8 mt-auto relative z-10 border-t border-primary-foreground/20 pt-8">
                        <div>
                            <p className="text-3xl font-bold text-primary-foreground">{stats.pendingRegistrations}</p>
                            <p className="text-xs text-primary-foreground/60 font-semibold uppercase tracking-wider mt-1">Pending Approval</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-primary-foreground">{stats.todayRegistrations}</p>
                            <p className="text-xs text-primary-foreground/60 font-semibold uppercase tracking-wider mt-1">New Today</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-primary-foreground">{stats.rejectedRegistrations}</p>
                            <p className="text-xs text-primary-foreground/60 font-semibold uppercase tracking-wider mt-1">Rejected</p>
                        </div>
                    </div>
                </Card>

                {/* 2. INFRASTRUCTURE (4 Cols) */}
                <Card className="md:col-span-4 bento-card border-none shadow-sm hover:shadow-md transition-shadow h-[180px] flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border/50">
                            <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold tracking-tight text-foreground">{stats.totalStudents}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Total Participants</p>
                    </div>
                </Card>

                {/* 3. QUICK NAV (4 Cols) */}
                <Card className="md:col-span-4 bento-card border-none shadow-sm hover:shadow-md transition-shadow h-[180px] flex flex-col justify-between p-6 cursor-pointer group" onClick={() => navigate('/events')}>
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border/50 group-hover:bg-primary/10 transition-colors">
                            <Zap className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Manage Events</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Edit & Delete Events</p>
                    </div>
                </Card>

                {/* 4. OPERATIONAL VIGILANCE (12 Cols) */}
                <Card className="md:col-span-12 bento-card border-none shadow-sm p-8 h-auto bg-card">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-bold text-foreground">Limit Reminder</h3>
                        </div>
                        {attentionEvents.atCapacity.length === 0 && (
                            <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20">No Reminders</Badge>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Saturation Alerts */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Events</p>
                            {attentionEvents.atCapacity.length > 0 ? (
                                <div className="space-y-3">
                                    {attentionEvents.atCapacity.slice(0, 3).map(e => (
                                        <div key={e.id} className="flex items-center justify-between p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                                            <span className="text-sm font-bold text-destructive">{e.name}</span>
                                            <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-none font-bold text-[10px]">FULL</Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 rounded-2xl border-2 border-dashed border-border/50 text-center text-sm font-medium text-muted-foreground">
                                    No events are at capacity.
                                </div>
                            )}
                        </div>

                        {/* Low Activity */}
                        <div className="space-y-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Low Participation</p>
                            <div className="flex flex-wrap gap-2">
                                {attentionEvents.lowParticipation.slice(0, 6).map(e => (
                                    <Badge key={e.id} variant="secondary" className="px-3 py-1.5 bg-muted text-muted-foreground border border-border/50 font-medium">
                                        {e.name} • <span className="text-muted-foreground/60 ml-1">{e.registrationCount}</span>
                                    </Badge>
                                ))}
                                {attentionEvents.lowParticipation.length === 0 && (
                                    <span className="text-sm text-muted-foreground italic">All events have healthy engagement.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 5. COHORT ANALYTICS (6 Cols) */}
                <Card className="md:col-span-6 bento-card border-none shadow-sm h-[400px] p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-foreground">Yearly Registrations</h3>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full"><TrendingUp className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex-1 space-y-6">
                        {yearStats.map(ys => (
                            <div key={ys.year} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{getYearLabel(ys.year)}</span>
                                    <span className="text-sm font-bold">{ys.registrations}</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${getYearColor(ys.year)}`}
                                        style={{ width: `${ys.students > 0 ? (ys.registrations / ys.students) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* 6. LIVE TELEMETRY (6 Cols) */}
                <Card className="md:col-span-6 bento-card border-none shadow-sm h-[400px] p-0 flex flex-col overflow-hidden">
                    <div className="p-8 pb-4 flex items-center justify-between border-b border-border/50">
                        <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
                    </div>
                    <ScrollArea className="flex-1 p-0">
                        <div className="divide-y divide-border/50">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((log) => (
                                    <div key={log.id} className="p-4 px-8 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs ${log.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                                {log.student?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{log.student?.name}</p>
                                                <p className="text-xs text-muted-foreground truncate w-48">{log.event?.name}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                                        <Activity className="h-6 w-6 text-muted-foreground/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-foreground">No Recent Activity</p>
                                        <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">No recent registration activity recorded.</p>
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

