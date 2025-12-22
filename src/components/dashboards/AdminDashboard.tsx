import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Users,
    Calendar,
    Award,
    Clock,
    Activity,
    TrendingUp,
    Palette,
    GraduationCap,
    ArrowRight,
    Plus,
    Settings,
    Shield,
    Terminal,
    Zap,
    AlertCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ACADEMIC_YEARS, getYearLabel } from '@/lib/constants';
import { XCircle, CheckCircle } from 'lucide-react';

interface RecentActivity {
    id: string;
    action: string;
    details: any;
    created_at: string;
    user: {
        full_name: string;
    } | null;
}

interface YearStat {
    year: string;
    students: number;
    registrations: number;
}

export function AdminDashboard() {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalStudents: 0,
        totalEvents: 0,
        activeEvents: 0,
        totalRegistrations: 0,
        pendingApprovals: 0,
        todayRegistrations: 0,
    });
    const [yearStats, setYearStats] = useState<YearStat[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [attentionEvents, setAttentionEvents] = useState<{ atCapacity: any[], lowParticipation: any[] }>({ atCapacity: [], lowParticipation: [] });
    const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
    const [systemUsersCount, setSystemUsersCount] = useState(0);

    const containerRef = useEffect(() => {
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
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
            fetchGlobalStats(),
            fetchYearStats(),
            fetchRecentActivity(),
            fetchSystemUsers(),
            fetchAttentionEvents(),
            fetchPendingRegistrations()
        ]);
        setLoading(false);
    };

    const fetchAttentionEvents = async () => {
        const { data: eventsData } = await supabase.from('events').select('*, registrations(count)').eq('is_active', true);
        const processedEvents = (eventsData || []).map((event: any) => ({
            ...event,
            registrationCount: event.registrations?.[0]?.count || 0
        }));
        setAttentionEvents({
            atCapacity: processedEvents.filter(e => e.max_participants && e.registrationCount >= e.max_participants),
            lowParticipation: processedEvents.filter(e => e.registrationCount < 5 && (!e.max_participants || e.registrationCount < e.max_participants))
        });
    };

    const fetchPendingRegistrations = async () => {
        const { data } = await supabase.from('registrations').select('id, created_at, student:students(name, year), event:events(name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5);
        setPendingRegistrations(data || []);
    };

    const fetchSystemUsers = async () => {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        setSystemUsersCount(count || 0);
    };

    const fetchGlobalStats = async () => {
        const { count: studentsCount } = await supabase.from('students').select('id', { count: 'exact' });
        const { count: eventsCount } = await supabase.from('events').select('id', { count: 'exact' });
        const { count: activeEventsCount } = await supabase.from('events').select('id', { count: 'exact' }).eq('is_active', true);
        const { count: registrationsCount } = await supabase.from('registrations').select('id', { count: 'exact' });
        const { count: pendingCount } = await supabase.from('registrations').select('id', { count: 'exact' }).eq('status', 'pending');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase.from('registrations').select('id', { count: 'exact' }).gte('created_at', today.toISOString());
        setStats({
            totalStudents: studentsCount || 0,
            totalEvents: eventsCount || 0,
            activeEvents: activeEventsCount || 0,
            totalRegistrations: registrationsCount || 0,
            pendingApprovals: pendingCount || 0,
            todayRegistrations: todayCount || 0,
        });
    };

    const fetchYearStats = async () => {
        const years: ('first' | 'second' | 'third' | 'fourth')[] = ['first', 'second', 'third', 'fourth'];
        const yearData: YearStat[] = [];
        for (const year of years) {
            const { count: students } = await supabase.from('students').select('id', { count: 'exact' }).eq('year', year);
            const { data: regs } = await supabase.from('registrations').select('id, student:students!inner(year)').eq('student.year', year);
            yearData.push({ year, students: students || 0, registrations: regs?.length || 0 });
        }
        setYearStats(yearData);
    };

    const fetchRecentActivity = async () => {
        const { data } = await supabase.from('activity_logs').select(`id, action, details, created_at, user:profiles(full_name)`).order('created_at', { ascending: false }).limit(10);
        setRecentActivity(data || []);
    };

    const formatActionDescription = (log: RecentActivity) => {
        const { action, details, user } = log;
        const userName = user?.full_name || 'System';

        if (!action) return 'Unknown Action';

        switch (action) {
            case 'settings_updated': return `${userName} updated system settings`;
            case 'global_registration_status_changed': return `${userName} changed registration status to ${details?.status}`;
            case 'event_created': return `${userName} created event: ${details?.event_name}`;
            case 'registration_status_updated': return `${userName} updated a registration to ${details?.new_status}`;
            case 'user_login': return `${userName} logged in`;
            default: return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    const getYearColor = (year: string) => {
        switch (year) {
            case 'first': return 'bg-indigo-500';
            case 'second': return 'bg-purple-500';
            case 'third': return 'bg-blue-500';
            case 'fourth': return 'bg-emerald-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Simple Light Header */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        System Overview & Financials
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-card px-4 py-2 rounded-full shadow-sm border border-border/50">
                    <div className="flex items-center gap-3 pr-4 border-r border-border/50">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {profile?.full_name?.charAt(0) || 'A'}
                        </div>
                        <div className="text-sm">
                            <p className="font-bold leading-none text-foreground">{profile?.full_name ? profile.full_name.split(' ')[0] : 'Admin'}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Administrator</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => navigate('/settings')}>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
            </header>

            {/* Simple Light Bento Grid */}
            <div className="bento-grid">

                {/* TOP ROW: Key Metrics (4 Cards) */}
                <Card className="md:col-span-3 bento-card border-none shadow-sm hover:shadow-md transition-shadow h-[180px] flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border/50">
                            <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] uppercase font-bold border-emerald-500/20 text-emerald-600 bg-emerald-500/10">+12%</Badge>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold tracking-tight text-foreground">{stats.totalStudents}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Total Students</p>
                    </div>
                </Card>

                <Card className="md:col-span-3 bento-card border-none shadow-sm hover:shadow-md transition-shadow h-[180px] flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border/50">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] uppercase font-bold border-blue-500/20 text-blue-600 bg-blue-500/10">Active</Badge>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold tracking-tight text-foreground">{stats.activeEvents}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Live Events</p>
                    </div>
                </Card>

                <Card className="md:col-span-3 bento-card border-none shadow-sm hover:shadow-md transition-shadow h-[180px] flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border/50">
                            <Activity className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] uppercase font-bold border-primary/20 text-primary bg-primary/5">High</Badge>
                    </div>
                    <div>
                        <p className="text-4xl font-extrabold tracking-tight text-foreground">{stats.totalRegistrations.toLocaleString()}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Total Registrations</p>
                    </div>
                </Card>

                <Card className="md:col-span-3 border-none bg-primary text-primary-foreground shadow-lg shadow-primary/20 h-[180px] flex flex-col justify-between p-6 relative overflow-hidden group rounded-[2rem]">
                    {/* Decorative circle */}
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-primary-foreground/20 blur-2xl group-hover:bg-primary-foreground/30 transition-colors" />

                    <div className="flex justify-between items-start relative z-10">
                        <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center backdrop-blur-sm">
                            <Clock className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <ArrowRight className="h-5 w-5 text-primary-foreground/50 group-hover:translate-x-1 transition-transform cursor-pointer" onClick={() => navigate('/events')} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-4xl font-extrabold tracking-tight text-primary-foreground">{stats.todayRegistrations}</p>
                        <p className="text-sm font-medium text-primary-foreground/80 mt-1">Captured Today</p>
                    </div>
                </Card>

                {/* MIDDLE ROW: Charts & Lists */}

                {/* 1. Year Distribution (6 Cols) */}
                <Card className="md:col-span-6 bento-card border-none shadow-sm h-[320px] p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-foreground">Participation Density</h3>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-full px-4 border-border/50">View Report</Button>
                    </div>
                    <div className="flex-1 space-y-5">
                        {yearStats.map((ys) => (
                            <div key={ys.year} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>{getYearLabel(ys.year)}</span>
                                    <span>{ys.registrations} Regs</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${getYearColor(ys.year)}`}
                                        style={{ width: `${ys.students > 0 ? (ys.registrations / (ys.students * 1.5)) * 100 : 0}%` }} // normalized for visual
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* 2. Recent Activity (6 Cols) */}
                <Card className="md:col-span-6 bento-card border-none shadow-sm h-[320px] p-0 flex flex-col overflow-hidden">
                    <div className="p-8 pb-4 flex items-center justify-between border-b border-border/50">
                        <h3 className="text-lg font-bold text-foreground">Live Activity Feed</h3>
                        <div className="flex gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Real-time</span>
                        </div>
                    </div>
                    <ScrollArea className="flex-1 p-0">
                        <div className="divide-y divide-border/50">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((log) => (
                                    <div key={log.id} className="p-4 px-8 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                                {log.user?.full_name?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">{formatActionDescription(log)}</p>
                                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                                        <Activity className="h-6 w-6 text-muted-foreground/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-foreground">No Recent Activity</p>
                                        <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">System is quiet. No logs recorded yet.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </Card>

                {/* BOTTOM ROW: Alerts & Action (12 Cols) */}
                <Card className="md:col-span-12 bento-card border-none shadow-sm p-8 bg-card h-auto">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">System Attention Required</h3>
                                <p className="text-muted-foreground text-sm max-w-xl mt-1">
                                    {attentionEvents.atCapacity.length > 0
                                        ? `${attentionEvents.atCapacity.length} events have reached maximum capacity. Consider increasing limits.`
                                        : "All systems operational. No critical capacity alerts detected."}
                                </p>
                            </div>
                        </div>
                        {attentionEvents.atCapacity.length > 0 && (
                            <div className="flex gap-3">
                                {attentionEvents.atCapacity.slice(0, 3).map(e => (
                                    <Badge key={e.id} variant="secondary" className="px-3 py-1 bg-destructive/10 text-destructive border border-destructive/20">
                                        {e.name} (Full)
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <Button className="bg-foreground text-background rounded-full px-6 font-bold hover:bg-foreground/80 shadow-lg">
                            Open Control Center
                        </Button>
                    </div>
                </Card>

            </div>
        </div>
    );
}
