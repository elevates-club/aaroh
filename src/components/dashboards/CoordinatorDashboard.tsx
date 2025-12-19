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
    GraduationCap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES, getYearLabel } from '@/lib/constants';
import { hasRole, getCoordinatorYear as getYearFromRole } from '@/lib/roleUtils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

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
        // Students in my year
        const { count: studentsCount } = await supabase
            .from('students')
            .select('id', { count: 'exact' })
            .eq('year', year);

        // Active events
        const { count: eventsCount } = await supabase
            .from('events')
            .select('id', { count: 'exact' })
            .eq('is_active', true);

        // My year registrations
        const { data: regData } = await supabase
            .from('registrations')
            .select(`id, status, student:students!inner(year)`)
            .eq('student.year', year);

        const registrationsCount = regData?.length || 0;
        const pendingCount = regData?.filter(r => r.status === 'pending').length || 0;

        // Unregistered students - students with no registrations
        const { data: allStudents } = await supabase
            .from('students')
            .select('id')
            .eq('year', year);

        const { data: registeredStudents } = await supabase
            .from('registrations')
            .select(`student_id, student:students!inner(year)`)
            .eq('student.year', year);

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
        // Get events with max_entries_per_year set
        const { data: events } = await supabase
            .from('events')
            .select('id, name, category, max_entries_per_year')
            .eq('is_active', true)
            .not('max_entries_per_year', 'is', null);

        if (!events) return;

        const limitedEvents: EventAtLimit[] = [];

        for (const event of events) {
            const { data: regs } = await supabase
                .from('registrations')
                .select(`id, student:students!inner(year)`)
                .eq('event_id', event.id)
                .eq('student.year', year)
                .neq('status', 'rejected');

            const currentCount = regs?.length || 0;
            const limit = event.max_entries_per_year || 999;

            if (currentCount >= limit * 0.8) { // Show if >= 80% full
                limitedEvents.push({
                    id: event.id,
                    name: event.name,
                    category: event.category as 'on_stage' | 'off_stage',
                    max_entries_per_year: limit,
                    currentCount,
                });
            }
        }

        setEventsAtLimit(limitedEvents.sort((a, b) =>
            (b.currentCount / b.max_entries_per_year) - (a.currentCount / a.max_entries_per_year)
        ));
    };

    const fetchRecentRegistrations = async (year: 'first' | 'second' | 'third' | 'fourth') => {
        const { data } = await supabase
            .from('registrations')
            .select(`
                id,
                status,
                created_at,
                student:students!inner(name, year),
                event:events!inner(name)
            `)
            .eq('student.year', year)
            .order('created_at', { ascending: false })
            .limit(5);

        if (data) {
            setRecentRegistrations(data.map((r: any) => ({
                id: r.id,
                studentName: r.student.name,
                eventName: r.event.name,
                status: r.status,
                createdAt: r.created_at,
            })));
        }
    };

    const fetchTopEvents = async (year: 'first' | 'second' | 'third' | 'fourth') => {
        const { data } = await supabase
            .from('registrations')
            .select(`
                event_id,
                student:students!inner(year),
                event:events!inner(id, name, category)
            `)
            .eq('student.year', year);

        if (data) {
            const eventCounts: Record<string, { name: string; category: string; count: number }> = {};

            data.forEach((r: any) => {
                const eventId = r.event_id;
                if (!eventCounts[eventId]) {
                    eventCounts[eventId] = {
                        name: r.event.name,
                        category: r.event.category,
                        count: 0
                    };
                }
                eventCounts[eventId].count++;
            });

            const sorted = Object.entries(eventCounts)
                .map(([id, info]) => ({ id, ...info }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5) as TopEvent[];

            setTopEvents(sorted);
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

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Welcome, {profile?.full_name || 'Coordinator'}!
                </h1>
                <p className="text-muted-foreground mt-1">
                    {coordinatorYear ? `${getYearLabel(coordinatorYear)} Year` : 'Year'} Coordinator Dashboard
                </p>
            </div>

            {/* Main Stats */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card className="border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Year Students</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.myYearStudents}</div>
                        <p className="text-xs text-muted-foreground">Total students</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-secondary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                        <Calendar className="h-4 w-4 text-secondary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeEvents}</div>
                        <p className="text-xs text-muted-foreground">Ongoing events</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <Award className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.myRegistrations}</div>
                        <p className="text-xs text-muted-foreground">Total registrations</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500 cursor-pointer hover:bg-muted/50 transition" onClick={() => navigate('/registrations')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</div>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-400">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unregistered</CardTitle>
                        <UserX className="h-4 w-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{stats.unregisteredStudents}</div>
                        <p className="text-xs text-muted-foreground">No registrations yet</p>
                    </CardContent>
                </Card>
            </div>

            {/* Second Row: Events at Limit & Top Events */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Events at Year Limit */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Events at Year Limit
                        </CardTitle>
                        <CardDescription>Events approaching or at capacity for your year</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {eventsAtLimit.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No events at capacity yet 🎉
                            </p>
                        ) : (
                            <ScrollArea className="h-[200px]">
                                <div className="space-y-3">
                                    {eventsAtLimit.map(event => (
                                        <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <div className="flex items-center gap-2">
                                                {event.category === 'on_stage' ? (
                                                    <Palette className="h-4 w-4 text-purple-500" />
                                                ) : (
                                                    <GraduationCap className="h-4 w-4 text-green-500" />
                                                )}
                                                <span className="font-medium text-sm">{event.name}</span>
                                            </div>
                                            <Badge
                                                variant={event.currentCount >= event.max_entries_per_year ? 'destructive' : 'secondary'}
                                                className="font-mono"
                                            >
                                                {event.currentCount}/{event.max_entries_per_year}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                {/* Top Events */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            Top Events
                        </CardTitle>
                        <CardDescription>Most popular events for your year</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topEvents.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No registrations yet
                            </p>
                        ) : (
                            <ScrollArea className="h-[200px]">
                                <div className="space-y-3">
                                    {topEvents.map((event, index) => (
                                        <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-gray-200 text-gray-700' :
                                                        index === 2 ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {event.category === 'on_stage' ? (
                                                        <Palette className="h-4 w-4 text-purple-500" />
                                                    ) : (
                                                        <GraduationCap className="h-4 w-4 text-green-500" />
                                                    )}
                                                    <span className="font-medium text-sm">{event.name}</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline">{event.count} students</Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-500" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription>Latest registrations from your year</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/registrations')}>
                            View All <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {recentRegistrations.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No recent registrations
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {recentRegistrations.map(reg => (
                                <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg border">
                                    <div className="space-y-1">
                                        <p className="font-medium text-sm">{reg.studentName}</p>
                                        <p className="text-xs text-muted-foreground">{reg.eventName}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={getStatusColor(reg.status)}>{reg.status}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(reg.createdAt), 'MMM dd, HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start text-left"
                        onClick={() => navigate('/students')}
                    >
                        <Users className="h-5 w-5 mb-2 text-primary" />
                        <h3 className="font-medium">View My Students</h3>
                        <p className="text-sm text-muted-foreground">Manage {getYearLabel(coordinatorYear || '')} year students</p>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start text-left"
                        onClick={() => navigate('/events')}
                    >
                        <Calendar className="h-5 w-5 mb-2 text-secondary" />
                        <h3 className="font-medium">Register Students</h3>
                        <p className="text-sm text-muted-foreground">Register students for events</p>
                    </Button>
                    {stats.pendingApprovals > 0 && (
                        <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start text-left border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20"
                            onClick={() => navigate('/registrations')}
                        >
                            <Clock className="h-5 w-5 mb-2 text-yellow-600" />
                            <h3 className="font-medium">Approve Registrations</h3>
                            <p className="text-sm text-muted-foreground">{stats.pendingApprovals} pending approvals</p>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
