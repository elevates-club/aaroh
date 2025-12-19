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
    Settings
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

    useEffect(() => {
        fetchAllData();
    }, []);

    // Fetch system users count
    const [systemUsersCount, setSystemUsersCount] = useState(0);

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
        const { data: eventsData } = await supabase
            .from('events')
            .select('*, registrations(count)')
            .eq('is_active', true);

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
        const { data } = await supabase
            .from('registrations')
            .select('id, created_at, student:students(name, year), event:events(name)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5);
        setPendingRegistrations(data || []);
    };

    const fetchSystemUsers = async () => {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        setSystemUsersCount(count || 0);
    };

    const fetchGlobalStats = async () => {
        // Total students
        const { count: studentsCount } = await supabase
            .from('students')
            .select('id', { count: 'exact' });

        // Total events
        const { count: eventsCount } = await supabase
            .from('events')
            .select('id', { count: 'exact' });

        // Active events
        const { count: activeEventsCount } = await supabase
            .from('events')
            .select('id', { count: 'exact' })
            .eq('is_active', true);

        // Total registrations
        const { count: registrationsCount } = await supabase
            .from('registrations')
            .select('id', { count: 'exact' });

        // Pending approvals
        const { count: pendingCount } = await supabase
            .from('registrations')
            .select('id', { count: 'exact' })
            .eq('status', 'pending');

        // Today's registrations
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase
            .from('registrations')
            .select('id', { count: 'exact' })
            .gte('created_at', today.toISOString());

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

    const fetchRecentActivity = async () => {
        const { data } = await supabase
            .from('activity_logs')
            .select(`
                id,
                action,
                details,
                created_at,
                user:profiles(full_name)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        setRecentActivity(data || []);
    };

    const formatActionDescription = (log: RecentActivity) => {
        const { action, details, user } = log;
        const userName = user?.full_name || 'System';

        switch (action) {
            case 'settings_updated': return `${userName} updated system settings`;
            case 'global_registration_status_changed': return `${userName} changed registration status to ${details?.status}`;
            case 'event_created': return `${userName} created event: ${details?.event_name}`;
            case 'student_created': return `${userName} added student: ${details?.student_name}`;
            case 'registration_status_updated': return `${userName} updated a registration to ${details?.new_status}`;
            case 'user_login': return `${userName} logged in`;
            default: return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        System Administration
                    </h1>
                    <p className="text-muted-foreground mt-1">Global system control and monitoring</p>
                </div>
                <Badge variant="outline" className="px-4 py-1 border-primary/20 bg-primary/5 text-primary">
                    System Status: Operational
                </Badge>
            </div>

            {/* System Overview Row */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-primary cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/users')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Users</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{systemUsersCount}</div>
                        <p className="text-xs text-muted-foreground">Total accounts</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-secondary cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/settings')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Config</CardTitle>
                        <Settings className="h-4 w-4 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Settings</div>
                        <p className="text-xs text-muted-foreground">Manage variables</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/activity-logs')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Logs</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Audit</div>
                        <p className="text-xs text-muted-foreground">View all actions</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/students')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Student Database</CardTitle>
                        <GraduationCap className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        <p className="text-xs text-muted-foreground">Enrolled students</p>
                    </CardContent>
                </Card>
            </div>

            {/* Critical Status Monitoring */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Events Needing Attention */}
                <Card className="border-orange-200 dark:border-orange-900 shadow-sm">
                    <CardHeader className="pb-3 text-orange-600 dark:text-orange-400">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-5 w-5" /> Events Needing Attention
                        </CardTitle>
                        <CardDescription>Critical status updates for active events</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                    Low Participation ({attentionEvents.lowParticipation.length})
                                </h3>
                                <div className="space-y-2">
                                    {attentionEvents.lowParticipation.slice(0, 3).map((event: any) => (
                                        <div key={event.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs">
                                            <span className="font-medium truncate max-w-[100px]">{event.name}</span>
                                            <Badge variant="secondary" className="px-1.5 py-0 h-5">{event.registrationCount} regs</Badge>
                                        </div>
                                    ))}
                                    {attentionEvents.lowParticipation.length === 0 && <p className="text-xs text-muted-foreground italic">None</p>}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold flex items-center gap-2 text-red-600 dark:text-red-400 uppercase tracking-wider">
                                    <XCircle className="h-3 w-3" /> At Capacity ({attentionEvents.atCapacity.length})
                                </h3>
                                <div className="space-y-2">
                                    {attentionEvents.atCapacity.slice(0, 3).map((event: any) => (
                                        <div key={event.id} className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-900/10 text-xs text-red-600 dark:text-red-400">
                                            <span className="font-medium truncate max-w-[100px]">{event.name}</span>
                                            <Badge variant="destructive" className="px-1.5 py-0 h-5">Full</Badge>
                                        </div>
                                    ))}
                                    {attentionEvents.atCapacity.length === 0 && <p className="text-xs text-muted-foreground italic">None</p>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Approvals Widget */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" /> Pending Approvals
                        </CardTitle>
                        <CardDescription>Recent registrations awaiting action</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pendingRegistrations.length > 0 ? (
                                pendingRegistrations.map((reg) => (
                                    <div key={reg.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30 text-xs">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{reg.student?.name}</p>
                                            <p className="text-muted-foreground truncate">{reg.event?.name}</p>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => navigate('/registrations')}>Review</Button>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                                    <CheckCircle className="h-6 w-6 mb-2 text-green-500" />
                                    <p className="text-xs">No pending approvals</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Participation Overview */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            Participation Metrics
                        </CardTitle>
                        <CardDescription>Enrollment and registration distribution</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-muted/50 text-center">
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Total Registrations</p>
                                <p className="text-3xl font-bold">{stats.totalRegistrations}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 text-center">
                                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Total Events</p>
                                <p className="text-3xl font-bold">{stats.totalEvents}</p>
                            </div>
                        </div>
                        {/* Year Stats */}
                        <div className="space-y-3 pt-2">
                            {yearStats.map(ys => (
                                <div key={ys.year} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/30 transition">
                                    <Badge variant="outline" className={`${getYearColor(ys.year)} px-2 py-0`}>
                                        {getYearLabel(ys.year)}
                                    </Badge>
                                    <div className="flex gap-4 items-center">
                                        <span className="text-muted-foreground">{ys.registrations} regs</span>
                                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${ys.students > 0 ? Math.min(100, (ys.registrations / ys.students) * 100) : 0}%` }}
                                            />
                                        </div>
                                        <span className="font-medium min-w-[30px] text-right">{ys.students}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Audit Logs Preview */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-500" />
                                Recent System Activity
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/activity-logs')}>
                                View Full Log
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[280px]">
                            <div className="space-y-3">
                                {recentActivity.map(log => (
                                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/10 text-xs">
                                        <div className="mt-0.5">
                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <p className="font-medium text-foreground">{formatActionDescription(log)}</p>
                                            <p className="text-muted-foreground text-[10px]">
                                                {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {recentActivity.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8 text-xs italic">No recent system activity found.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
