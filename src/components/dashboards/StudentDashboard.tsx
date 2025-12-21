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
    CalendarClock,
    Sparkles,
    Zap,
    LayoutDashboard,
    Flame,
    UserX,
    MapPin
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
    venue?: string;
    description?: string;
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
        fetchStudentId();
    }, [user?.id]);

    useEffect(() => {
        if (studentId) {
            fetchAllData();
        }
    }, [studentId]);

    // Real-time subscription for settings changes
    useEffect(() => {
        const channel = supabase
            .channel('settings-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'settings',
                    filter: `key=in.(max_on_stage_registrations,max_off_stage_registrations)`
                },
                (payload) => {
                    // When settings change, refetch stats to get new limits
                    if (studentId) {
                        fetchStats();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [studentId]);

    const fetchStudentId = async () => {
        if (!user?.id) return;
        const { data } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
        if (data) setStudentId(data.id);
    };

    const fetchAllData = async () => {
        if (!studentId) return;
        setLoading(true);
        await Promise.all([fetchStats(), fetchMyRegistrations(), fetchUpcomingEvents()]);
        setLoading(false);
    };

    const fetchStats = async () => {
        if (!studentId) return;
        const { data: settings } = await supabase.from('settings').select('key, value').in('key', ['max_on_stage_registrations', 'max_off_stage_registrations']);
        let onStageLimit = 2;
        let offStageLimit = 3;
        settings?.forEach(s => {
            const val = s.value as any;
            if (s.key === 'max_on_stage_registrations') onStageLimit = val?.limit || 2;
            if (s.key === 'max_off_stage_registrations') offStageLimit = val?.limit || 3;
        });
        const { data: registrations } = await supabase.from('registrations').select(`id, status, event:events!inner(category)`).eq('student_id', studentId);
        const approved = registrations?.filter(r => r.status === 'approved').length || 0;
        const pending = registrations?.filter(r => r.status === 'pending').length || 0;
        const rejected = registrations?.filter(r => r.status === 'rejected').length || 0;
        const activeRegs = registrations?.filter(r => r.status !== 'rejected') || [];
        const onStageUsed = activeRegs.filter(r => (r.event as any).category === 'on_stage').length;
        const offStageUsed = activeRegs.filter(r => (r.event as any).category === 'off_stage').length;
        setStats({ totalRegistrations: registrations?.length || 0, approved, pending, rejected, onStageUsed, offStageUsed, onStageLimit, offStageLimit });
    };

    const fetchMyRegistrations = async () => {
        if (!studentId) return;
        const { data } = await supabase.from('registrations').select(`id, status, event:events!inner(id, name, category, event_date, venue, description)`).eq('student_id', studentId).order('created_at', { ascending: false });
        if (data) {
            setMyRegistrations(data.map((r: any) => ({
                id: r.id,
                eventId: r.event.id,
                eventName: r.event.name,
                category: r.event.category,
                status: r.status,
                eventDate: r.event.event_date,
                venue: r.event.venue,
                description: r.event.description
            })));
        }
    };

    const fetchUpcomingEvents = async () => {
        if (!studentId) return;
        const { data: registeredEventIds } = await supabase.from('registrations').select('event_id').eq('student_id', studentId);
        const registeredIds = registeredEventIds?.map(r => r.event_id) || [];
        let query = supabase.from('events').select('*').eq('is_active', true).gte('registration_deadline', new Date().toISOString()).order('registration_deadline', { ascending: true }).limit(5);
        if (registeredIds.length > 0) query = query.not('id', 'in', `(${registeredIds.join(',')})`);
        const { data } = await query;
        setUpcomingEvents(data || []);
    };

    const getDeadlineUrgency = (deadline: string) => {
        const deadlineDate = parseISO(deadline);
        const hoursLeft = Math.floor((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60));
        if (hoursLeft < 24) return 'text-red-500 font-extrabold';
        if (hoursLeft < 72) return 'text-amber-500 font-bold';
        return 'text-muted-foreground font-medium';
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Simple Light Header */}
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        My Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Welcome back, {profile?.full_name?.split(' ')[0]}
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-card px-4 py-2 rounded-full shadow-sm border border-border/50">
                    <div className="flex items-center gap-3 pr-4 border-r border-border/50">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {profile?.full_name?.charAt(0) || 'S'}
                        </div>
                        <div className="text-sm">
                            <p className="font-bold leading-none text-foreground">{profile?.full_name?.split(' ')[0]}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Student</p>
                        </div>
                    </div>
                    <Button className="h-8 rounded-full px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate('/events')}>
                        <Zap className="h-3 w-3 mr-2" /> Explore Events
                    </Button>
                </div>
            </header>

            {/* Simple Light Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* 1. PARTICIPATION CORE (8 Cols) */}
                <Card className="md:col-span-8 md:row-span-2 border-none bg-primary text-primary-foreground shadow-lg shadow-primary/20 h-[380px] flex flex-col justify-between p-8 relative overflow-hidden group rounded-[2rem]">
                    {/* Decorative background */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-foreground/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

                    <div className="relative z-10 flex justify-between items-start">
                        <Badge className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none font-bold uppercase tracking-wider text-[10px]">Your Registrations</Badge>
                        <Flame className="h-6 w-6 text-primary-foreground/50" />
                    </div>

                    <div className="relative z-10 space-y-4">
                        <p className="text-[8rem] font-bold tracking-tighter leading-none text-primary-foreground">
                            {stats.totalRegistrations}
                        </p>
                        <p className="text-lg text-primary-foreground/80 font-medium">Total Registrations</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mt-auto relative z-10 border-t border-primary-foreground/20 pt-8">
                        <div>
                            <p className="text-3xl font-bold text-primary-foreground">{stats.approved}</p>
                            <p className="text-xs text-primary-foreground/60 font-semibold uppercase tracking-wider mt-1">Confirmed Spots</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-primary-foreground">{stats.pending}</p>
                            <p className="text-xs text-primary-foreground/60 font-semibold uppercase tracking-wider mt-1">Pending Approval</p>
                        </div>
                    </div>
                </Card>

                {/* 2. ALLOCATION MATRIX (4 Cols) */}
                <Card className="md:col-span-4 border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow h-[180px] flex flex-col justify-between p-6 rounded-[2rem]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-md font-bold text-foreground flex items-center gap-2"><LayoutDashboard className="h-4 w-4 text-primary" /> Quota Usage</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                                <span>On-Stage</span>
                                <span>{stats.onStageUsed} / {stats.onStageLimit}</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${(stats.onStageUsed / stats.onStageLimit) * 100}%` }} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                                <span>Off-Stage</span>
                                <span>{stats.offStageUsed} / {stats.offStageLimit}</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.offStageUsed / stats.offStageLimit) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 3. QUICK NAV (4 Cols) */}
                <Card className="md:col-span-4 border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow h-[180px] flex flex-col justify-between p-6 cursor-pointer group rounded-[2rem]" onClick={() => navigate('/my-registrations')}>
                    <div className="flex justify-between items-start">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border/50 group-hover:bg-primary/10 transition-colors">
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <CheckCircle className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">My Registrations</p>
                        <p className="text-sm font-medium text-muted-foreground mt-1">View Status & Details</p>
                    </div>
                </Card>

                {/* 4. OPPORTUNITIES (12 Cols) */}
                <Card className="md:col-span-12 border-none shadow-sm p-8 h-auto bg-transparent">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-bold text-foreground">Open Opportunities</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map(event => (
                                <div key={event.id} className="group relative p-0 rounded-[2rem] bg-card border border-border/50 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-orange-300 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

                                    <div className="p-8 pb-4 flex-1 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">{event.category.replace('_', ' ')}</Badge>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                <CalendarClock className="h-3 w-3" />
                                                <span>{format(parseISO(event.event_date), 'MMM dd')}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-foreground leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                                {event.name}
                                            </h3>
                                            <p className="text-xs font-medium text-muted-foreground line-clamp-2 leading-relaxed">
                                                {event.description || "Join this event to showcase your talents and compete with the best."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-8 pt-0 mt-auto space-y-4">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-t border-border/50 pt-4">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" /> {event.venue || 'Main Stage'}
                                            </span>
                                            <span className={`${getDeadlineUrgency(event.registration_deadline)}`}>
                                                Ends {formatDistanceToNow(parseISO(event.registration_deadline))}
                                            </span>
                                        </div>

                                        <StudentSelfRegistrationDialog
                                            event={event as any}
                                            onRegistrationComplete={fetchAllData}
                                            trigger={
                                                <Button className="w-full rounded-2xl h-12 bg-muted text-foreground border border-border/50 font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                                                    Register Interest
                                                </Button>
                                            }
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-muted-foreground text-sm font-medium border-2 border-dashed border-border/50 rounded-2xl">
                                No upcoming events open for registration.
                            </div>
                        )}
                    </div>
                </Card>

                {/* 5. HISTORY (6 Cols) */}
                <Card className="md:col-span-6 border-border/50 bg-card shadow-sm h-[400px] p-8 flex flex-col rounded-[2rem]">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-foreground">Recent Registrations</h3>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full"><Clock className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex-1 space-y-4">
                        <ScrollArea className="h-[280px] -mr-4 pr-4">
                            <div className="space-y-4">
                                {myRegistrations.map((reg) => (
                                    <div key={reg.id} className="flex items-center justify-between group p-2 hover:bg-muted/50 rounded-xl transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${reg.category === 'on_stage' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {reg.category === 'on_stage' ? <Palette className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold text-foreground">{reg.eventName}</p>
                                                <p className="text-[10px] font-medium text-muted-foreground">{reg.eventDate ? format(parseISO(reg.eventDate), 'MMM dd, yyyy') : 'Date TBD'}</p>
                                            </div>
                                        </div>
                                        <Badge className={`text-[10px] font-bold uppercase rounded-md px-2 py-0.5 ${reg.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20' :
                                            reg.status === 'pending' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20' :
                                                'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20'
                                            }`}>
                                            {reg.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </Card>

                {/* 6. NEXT EVENT / STATUS (6 Cols) */}
                <Card className="md:col-span-6 border-none bg-foreground text-background shadow-lg h-[400px] p-8 flex flex-col justify-between relative overflow-hidden group rounded-[2rem]">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <Badge className="bg-background/20 hover:bg-background/30 text-background border-none font-bold uppercase tracking-wider text-[10px]">
                                {myRegistrations.some(r => r.status === 'approved' && !isPast(parseISO(r.eventDate))) ? 'Next Up' : 'Status'}
                            </Badge>
                            <Calendar className="h-6 w-6 text-background/50" />
                        </div>

                        {(() => {
                            const nextEvent = myRegistrations
                                .filter(r => r.status === 'approved' && !isPast(parseISO(r.eventDate)))
                                .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())[0];

                            if (nextEvent) {
                                return (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div className="space-y-2">
                                            <h3 className="text-3xl font-black text-background leading-tight line-clamp-2">
                                                {nextEvent.eventName}
                                            </h3>
                                            <div className="flex items-center gap-2 text-background/80 font-medium text-sm">
                                                <CalendarClock className="h-4 w-4" />
                                                <span>{format(parseISO(nextEvent.eventDate), 'EEEE, MMMM do, h:mm a')}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-background/80 font-medium text-sm">
                                                <MapPin className="h-4 w-4" />
                                                <span>{nextEvent.venue || 'Venue TBD'}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-background/10 backdrop-blur-md border border-background/10">
                                            <p className="text-xs text-background/80 leading-relaxed line-clamp-3">
                                                {nextEvent.description || "Get ready to showcase your talent! Make sure to arrive 30 minutes early for check-in."}
                                            </p>
                                        </div>

                                        <Button className="w-full bg-background text-foreground hover:bg-background/90 font-bold rounded-xl h-12">
                                            View Ticket
                                        </Button>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="h-full flex flex-col justify-center items-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
                                        <div className="h-16 w-16 rounded-full bg-background/10 flex items-center justify-center mb-2">
                                            <Sparkles className="h-8 w-8 text-background" />
                                        </div>
                                        <h3 className="text-xl font-bold text-background">All Caught Up!</h3>
                                        <p className="text-background/70 text-sm max-w-[250px]">
                                            You don't have any upcoming approved events. Check out the "Opportunities" section to register!
                                        </p>
                                        <Button
                                            variant="secondary"
                                            className="mt-4 bg-background text-foreground hover:bg-background/90 font-bold rounded-xl"
                                            onClick={() => navigate('/events')}
                                        >
                                            Find Events
                                        </Button>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </Card>

            </div>
        </div>
    );
}
