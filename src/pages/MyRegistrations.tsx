import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Trophy, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Registration {
    id: string;
    status: string;
    created_at: string;
    event: {
        id: string;
        name: string;
        category: string;
        event_date: string | null;
        venue: string | null;
    };
}

export default function MyRegistrations() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyRegistrations();
    }, [user]);

    const fetchMyRegistrations = async () => {
        if (!user) return;

        try {
            setLoading(true);

            // First get the student record for this user
            const { data: studentData } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (!studentData) {
                setLoading(false);
                return;
            }

            // Then get their registrations
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    id,
                    status,
                    created_at,
                    event:events(id, name, category, event_date, venue)
                `)
                .eq('student_id', studentData.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRegistrations(data || []);
        } catch (error) {
            console.error('Error fetching registrations:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
            case 'rejected':
                return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getCategoryBadge = (category: string) => {
        return category === 'on_stage'
            ? <Badge variant="outline" className="border-purple-500 text-purple-600">On-Stage</Badge>
            : <Badge variant="outline" className="border-blue-500 text-blue-600">Off-Stage</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">
                        My <span className="text-primary">Registrations</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg font-medium">
                        Track your event registrations and status
                    </p>
                </div>
                <Button onClick={() => navigate('/events')} className="rounded-full h-12 px-6 font-bold shadow-lg shadow-primary/20">
                    <Calendar className="h-4 w-4 mr-2" />
                    Browse Events
                </Button>
            </div>

            {/* Stats Summary - Bento Grid */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="rounded-[2rem] border-none shadow-sm bg-card hover:shadow-md transition-all p-6 flex flex-col justify-between h-[160px] group">
                    <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Trophy className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                        <div className="text-4xl font-black text-foreground">{registrations.length}</div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Events Registered</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[2rem] border-none shadow-sm bg-card hover:shadow-md transition-all p-6 flex flex-col justify-between h-[160px] group">
                    <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Approved</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <CheckCircle className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                        <div className="text-4xl font-black text-emerald-500">{registrations.filter(r => r.status === 'approved').length}</div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Confirmed Spots</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[2rem] border-none shadow-sm bg-card hover:shadow-md transition-all p-6 flex flex-col justify-between h-[160px] group">
                    <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pending</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                            <Clock className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                        <div className="text-4xl font-black text-amber-500">{registrations.filter(r => r.status === 'pending').length}</div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Awaiting Approval</p>
                    </CardContent>
                </Card>
                <Card className="rounded-[2rem] border-none shadow-sm bg-card hover:shadow-md transition-all p-6 flex flex-col justify-between h-[160px] group">
                    <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Rejected</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
                            <XCircle className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-4">
                        <div className="text-4xl font-black text-destructive">{registrations.filter(r => r.status === 'rejected').length}</div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">Not Selected</p>
                    </CardContent>
                </Card>
            </div>

            {/* Registrations List */}
            <Card className="rounded-[2rem] border-none shadow-sm bg-card p-8">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Trophy className="h-5 w-5" />
                        </div>
                        Your Event Registrations
                    </CardTitle>
                    <CardDescription className="ml-14 text-sm font-medium">All events you have registered for</CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    {registrations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-[2rem] mt-4">
                            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                <Calendar className="h-8 w-8 opacity-50" />
                            </div>
                            <p className="text-lg font-bold text-foreground">No registrations yet</p>
                            <p className="text-sm font-medium">Browse events and register to participate!</p>
                            <Button className="mt-6 rounded-full" onClick={() => navigate('/events')}>
                                Explore Events
                            </Button>
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px] w-full pr-4">
                            <div className="space-y-4">
                                {registrations.map((reg) => (
                                    <div key={reg.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-[1.5rem] border border-border/50 bg-muted/20 hover:bg-muted/50 transition-colors gap-4 group">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <p className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{reg.event?.name}</p>
                                                {getCategoryBadge(reg.event?.category || '')}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                {reg.event?.venue && <span className="flex items-center gap-1"><span className="text-primary">📍</span> {reg.event.venue}</span>}
                                                <span className="flex items-center gap-1"><span className="text-primary">🕒</span> Registered {formatDistanceToNow(new Date(reg.created_at), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {getStatusBadge(reg.status)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
