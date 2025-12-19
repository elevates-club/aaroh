import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Calendar,
    Award,
    CheckCircle,
    Clock,
    Palette,
    GraduationCap,
    ArrowRight,
    AlertCircle,
    CalendarClock
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { StudentSelfRegistrationDialog } from '@/components/forms/StudentSelfRegistrationDialog';

interface MyRegistration {
    id: string;
    eventId: string;
    eventName: string;
    category: 'on_stage' | 'off_stage';
    status: string;
    eventDate: string;
}

interface UpcomingEvent {
    id: string;
    name: string;
    category: 'on_stage' | 'off_stage';
    registration_deadline: string;
    event_date: string;
    description: string;
    venue: string;
    max_participants: number;
}

export function StudentDashboard() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalRegistrations: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        onStageUsed: 0,
        offStageUsed: 0,
        onStageLimit: 2,
        offStageLimit: 3,
    });
    const [myRegistrations, setMyRegistrations] = useState<MyRegistration[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudentId();
    }, [user?.id]);

    useEffect(() => {
        if (studentId) {
            fetchAllData();
        }
    }, [studentId]);

    const fetchStudentId = async () => {
        if (!user?.id) return;

        const { data } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data) {
            setStudentId(data.id);
        }
    };

    const fetchAllData = async () => {
        if (!studentId) return;

        setLoading(true);
        await Promise.all([
            fetchStats(),
            fetchMyRegistrations(),
            fetchUpcomingEvents(),
        ]);
        setLoading(false);
    };

    const fetchStats = async () => {
        if (!studentId) return;

        // Get registration limits from settings
        const { data: settings } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', ['max_on_stage_registrations', 'max_off_stage_registrations']);

        let onStageLimit = 2;
        let offStageLimit = 3;

        settings?.forEach(s => {
            const val = String(s.value);
            if (s.key === 'max_on_stage_registrations') onStageLimit = parseInt(val) || 2;
            if (s.key === 'max_off_stage_registrations') offStageLimit = parseInt(val) || 3;
        });

        // Get registrations with event category
        const { data: registrations } = await supabase
            .from('registrations')
            .select(`
                id,
                status,
                event:events!inner(category)
            `)
            .eq('student_id', studentId);

        const approved = registrations?.filter(r => r.status === 'approved').length || 0;
        const pending = registrations?.filter(r => r.status === 'pending').length || 0;
        const rejected = registrations?.filter(r => r.status === 'rejected').length || 0;

        // Count by category (non-rejected only)
        const activeRegs = registrations?.filter(r => r.status !== 'rejected') || [];
        const onStageUsed = activeRegs.filter(r => (r.event as any).category === 'on_stage').length;
        const offStageUsed = activeRegs.filter(r => (r.event as any).category === 'off_stage').length;

        setStats({
            totalRegistrations: registrations?.length || 0,
            approved,
            pending,
            rejected,
            onStageUsed,
            offStageUsed,
            onStageLimit,
            offStageLimit,
        });
    };

    const fetchMyRegistrations = async () => {
        if (!studentId) return;

        const { data } = await supabase
            .from('registrations')
            .select(`
                id,
                status,
                event:events!inner(id, name, category, event_date)
            `)
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

        if (data) {
            setMyRegistrations(data.map((r: any) => ({
                id: r.id,
                eventId: r.event.id,
                eventName: r.event.name,
                category: r.event.category,
                status: r.status,
                eventDate: r.event.event_date,
            })));
        }
    };

    const fetchUpcomingEvents = async () => {
        if (!studentId) return;

        // Get events with open registration that student hasn't registered for
        const { data: registeredEventIds } = await supabase
            .from('registrations')
            .select('event_id')
            .eq('student_id', studentId);

        const registeredIds = registeredEventIds?.map(r => r.event_id) || [];

        let query = supabase
            .from('events')
            .select('*')
            .eq('is_active', true)
            .gte('registration_deadline', new Date().toISOString())
            .order('registration_deadline', { ascending: true })
            .limit(5);

        if (registeredIds.length > 0) {
            query = query.not('id', 'in', `(${registeredIds.join(',')})`);
        }

        const { data } = await query;
        setUpcomingEvents(data || []);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getDeadlineUrgency = (deadline: string) => {
        const deadlineDate = parseISO(deadline);
        const hoursLeft = Math.floor((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60));

        if (hoursLeft < 24) return 'text-red-500';
        if (hoursLeft < 72) return 'text-amber-500';
        return 'text-muted-foreground';
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Welcome, {profile?.full_name}!
                </h1>
                <p className="text-muted-foreground mt-1">Student Dashboard</p>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Registrations</CardTitle>
                        <Award className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
                        <p className="text-xs text-muted-foreground">Total events</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                        <p className="text-xs text-muted-foreground">Confirmed</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registration Slots</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1">
                                    <Palette className="h-3 w-3 text-purple-500" /> On-Stage
                                </span>
                                <span className="font-mono">{stats.onStageUsed}/{stats.onStageLimit}</span>
                            </div>
                            <Progress value={(stats.onStageUsed / stats.onStageLimit) * 100} className="h-1" />
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1">
                                    <GraduationCap className="h-3 w-3 text-green-500" /> Off-Stage
                                </span>
                                <span className="font-mono">{stats.offStageUsed}/{stats.offStageLimit}</span>
                            </div>
                            <Progress value={(stats.offStageUsed / stats.offStageLimit) * 100} className="h-1" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Two Column Layout */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* My Registered Events */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Award className="h-4 w-4 text-primary" />
                                    My Registered Events
                                </CardTitle>
                                <CardDescription>Your event registrations</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/registrations')}>
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {myRegistrations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">You haven't registered for any events yet</p>
                                <Button variant="link" size="sm" onClick={() => navigate('/events')}>
                                    Browse Events
                                </Button>
                            </div>
                        ) : (
                            <ScrollArea className="h-[280px]">
                                <div className="space-y-3">
                                    {myRegistrations.map(reg => (
                                        <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                {reg.category === 'on_stage' ? (
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                                        <Palette className="h-4 w-4 text-purple-600" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                        <GraduationCap className="h-4 w-4 text-green-600" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-sm">{reg.eventName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {reg.eventDate ? format(parseISO(reg.eventDate), 'MMM dd, yyyy') : 'Date TBD'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge className={getStatusColor(reg.status)}>{reg.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Events */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4 text-secondary" />
                                    Upcoming Events
                                </CardTitle>
                                <CardDescription>Events you can register for</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {upcomingEvents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No upcoming events available</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-[280px]">
                                <div className="space-y-3">
                                    {upcomingEvents.map(event => (
                                        <div key={event.id} className="p-3 rounded-lg border space-y-2">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    {event.category === 'on_stage' ? (
                                                        <Palette className="h-4 w-4 text-purple-500" />
                                                    ) : (
                                                        <GraduationCap className="h-4 w-4 text-green-500" />
                                                    )}
                                                    <span className="font-medium text-sm">{event.name}</span>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {event.category === 'on_stage' ? 'On-Stage' : 'Off-Stage'}
                                                </Badge>
                                            </div>
                                            <div className={`flex items-center gap-1 text-xs ${getDeadlineUrgency(event.registration_deadline)}`}>
                                                <AlertCircle className="h-3 w-3" />
                                                Deadline: {formatDistanceToNow(parseISO(event.registration_deadline), { addSuffix: true })}
                                            </div>
                                            <StudentSelfRegistrationDialog
                                                event={event as any}
                                                onRegistrationComplete={fetchAllData}
                                                trigger={
                                                    <Button size="sm" className="w-full">
                                                        Register Now
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start text-left"
                        onClick={() => navigate('/events')}
                    >
                        <Calendar className="h-5 w-5 mb-2 text-primary" />
                        <h3 className="font-medium">Browse Events</h3>
                        <p className="text-sm text-muted-foreground">Discover and register for events</p>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start text-left"
                        onClick={() => navigate('/registrations')}
                    >
                        <Award className="h-5 w-5 mb-2 text-secondary" />
                        <h3 className="font-medium">My Registrations</h3>
                        <p className="text-sm text-muted-foreground">View all your event registrations</p>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
