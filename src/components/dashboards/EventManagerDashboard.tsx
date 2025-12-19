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
    Award
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
        todayRegistrations: 0
    });
    const [yearStats, setYearStats] = useState<YearStat[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [attentionEvents, setAttentionEvents] = useState<{ atCapacity: any[], lowParticipation: any[] }>({ atCapacity: [], lowParticipation: [] });

    useEffect(() => {
        fetchDashboardData().then(data => {
            if (data) setAttentionEvents(data);
        });
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch core stats in parallel
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
                supabase.from('registrations').select('*', { count: 'exact', head: true }),
                supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('registrations')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', new Date().toISOString().split('T')[0]),
                supabase.from('events')
                    .select('*, registrations(count)')
                    .eq('is_active', true)
            ]);

            setStats({
                totalStudents: studentsCount || 0,
                totalEvents: eventsCount || 0,
                activeEvents: activeEventsCount || 0,
                totalRegistrations: registrationsCount || 0,
                pendingRegistrations: pendingCount || 0,
                todayRegistrations: todayCount || 0
            });

            // Process events for "Needing Attention"
            const processedEvents = (eventsData || []).map((event: any) => ({
                ...event,
                registrationCount: event.registrations?.[0]?.count || 0
            }));

            // Filter "At Capacity" (if max_participants set and count >= max)
            const atCapacity = processedEvents.filter(e =>
                e.max_participants && e.registrationCount >= e.max_participants
            );

            // Filter "Low Participation" (if active, count < 5, and not full)
            const lowParticipation = processedEvents.filter(e =>
                e.registrationCount < 5 &&
                (!e.max_participants || e.registrationCount < e.max_participants)
            );

            // Fetch year stats
            await fetchYearStats();

            // Fetch recent activity
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
            const { count: students } = await supabase
                .from('students')
                .select('id', { count: 'exact' })
                .eq('year', year);

            const { data: regs } = await supabase
                .from('registrations')
                .select('id, student:students!inner(year)')
                .eq('student.year', year);

            yearData.push({
                year,
                students: students || 0,
                registrations: regs?.length || 0,
            });
        }

        setYearStats(yearData);
    };

    const getYearColor = (year: string) => {
        switch (year) {
            case 'first': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'second': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'third': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'fourth': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Welcome, {profile?.full_name || 'Event Manager'}!
                </h1>
                <p className="text-muted-foreground mt-1">
                    Event Control Center • {stats.activeEvents} active events
                </p>
            </div>

            {/* 5 Stat Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card className="border-l-4 border-l-primary cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/students')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        <p className="text-xs text-muted-foreground">All years</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-secondary cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/events')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                        <Calendar className="h-4 w-4 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalEvents}</div>
                        <p className="text-xs text-muted-foreground">{stats.activeEvents} active</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/registrations')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <Award className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
                        <p className="text-xs text-muted-foreground">Total</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500 cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/registrations?status=pending')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.pendingRegistrations}</div>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/events')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                        <Palette className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeEvents}</div>
                        <p className="text-xs text-muted-foreground">Open for registration</p>
                    </CardContent>
                </Card>
            </div>

            {/* Year-wise Breakdown & Events Needing Attention */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Year-wise Stats */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Year-wise Breakdown
                        </CardTitle>
                        <CardDescription>Students and registrations per year</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {yearStats.map(ys => (
                                <div key={ys.year} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <Badge className={getYearColor(ys.year)}>
                                            {getYearLabel(ys.year)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="text-right">
                                            <p className="font-medium">{ys.students}</p>
                                            <p className="text-xs text-muted-foreground">Students</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">{ys.registrations}</p>
                                            <p className="text-xs text-muted-foreground">Registrations</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">
                                                {ys.students > 0 ? Math.round((ys.registrations / ys.students) * 100) : 0}%
                                            </p>
                                            <p className="text-xs text-muted-foreground">Avg/Student</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Events Needing Attention */}
                <Card className="border-orange-200 dark:border-orange-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                            <Activity className="h-5 w-5" /> Events Needing Attention
                        </CardTitle>
                        <CardDescription>Critical status updates for active events</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Low Participation */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    Low Participation ({attentionEvents.lowParticipation.length})
                                </h3>
                                <div className="space-y-2">
                                    {attentionEvents.lowParticipation.slice(0, 4).map((event: any) => (
                                        <div key={event.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                                            <span className="font-medium truncate max-w-[150px]">{event.name}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {event.registrationCount} {event.max_participants ? `/ ${event.max_participants}` : 'reg'}
                                            </Badge>
                                        </div>
                                    ))}
                                    {attentionEvents.lowParticipation.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">No events with low participation.</p>
                                    )}
                                </div>
                            </div>

                            {/* At Capacity */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                                    <XCircle className="h-4 w-4" />
                                    At Capacity ({attentionEvents.atCapacity.length})
                                </h3>
                                <div className="space-y-2">
                                    {attentionEvents.atCapacity.slice(0, 4).map((event: any) => (
                                        <div key={event.id} className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-900/10 text-sm">
                                            <span className="font-medium truncate max-w-[150px]">{event.name}</span>
                                            <Badge variant="destructive" className="text-xs">
                                                Full ({event.registrationCount})
                                            </Badge>
                                        </div>
                                    ))}
                                    {attentionEvents.atCapacity.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic">No events at capacity.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity & Pending Approvals */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Pending Actions Feed */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-yellow-500" /> Pending Approvals
                        </CardTitle>
                        <CardDescription>Recent registrations awaiting review</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px] pr-4">
                            {recentActivity.filter(a => a.status === 'pending').length > 0 ? (
                                <div className="space-y-4">
                                    {recentActivity.filter(a => a.status === 'pending').slice(0, 5).map((log) => (
                                        <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30">
                                            <div className="mt-1">
                                                <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                                    <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none">
                                                    {log.student?.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    registered for <span className="font-medium text-foreground">{log.event?.name}</span>
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                    <Badge variant="outline" className="text-[10px] h-4">
                                                        {log.student?.year ? getYearLabel(log.student.year) : 'Unknown Year'}
                                                    </Badge>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => navigate('/registrations')}>Review</Button>
                                        </div>
                                    ))}
                                    {recentActivity.filter(a => a.status === 'pending').length > 5 && (
                                        <Button variant="link" className="w-full" onClick={() => navigate('/registrations?status=pending')}>
                                            View all pending
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                                    <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                                    <p>All caught up! No pending approvals.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Recent Activity Feed */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" /> Recent Activity
                        </CardTitle>
                        <CardDescription>Latest system-wide actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-4">
                                {recentActivity.map((log) => (
                                    <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                                        <div className="mt-1">
                                            <div className="h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {log.student?.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {log.status === 'pending' ? 'requested to join' :
                                                    log.status === 'approved' ? 'was approved for' : 'was rejected for'}
                                                {' '}
                                                <span className="font-medium text-foreground">{log.event?.name}</span>
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Badge variant={
                                                    log.status === 'approved' ? 'default' :
                                                        log.status === 'rejected' ? 'destructive' : 'secondary'
                                                } className="text-[10px] h-4">
                                                    {log.status}
                                                </Badge>
                                                <span>•</span>
                                                <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

