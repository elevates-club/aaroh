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
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        My Registrations
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Track your event registrations and status
                    </p>
                </div>
                <Button onClick={() => navigate('/events')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Browse Events
                </Button>
            </div>

            {/* Stats Summary */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{registrations.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {registrations.filter(r => r.status === 'approved').length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {registrations.filter(r => r.status === 'pending').length}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {registrations.filter(r => r.status === 'rejected').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Registrations List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        Your Event Registrations
                    </CardTitle>
                    <CardDescription>All events you have registered for</CardDescription>
                </CardHeader>
                <CardContent>
                    {registrations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Calendar className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No registrations yet</p>
                            <p className="text-sm">Browse events and register to participate!</p>
                            <Button className="mt-4" onClick={() => navigate('/events')}>
                                Explore Events
                            </Button>
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-4">
                                {registrations.map((reg) => (
                                    <div key={reg.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">{reg.event?.name}</p>
                                                {getCategoryBadge(reg.event?.category || '')}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                {reg.event?.venue && <span>📍 {reg.event.venue}</span>}
                                                <span>•</span>
                                                <span>Registered {formatDistanceToNow(new Date(reg.created_at), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                        <div>
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
