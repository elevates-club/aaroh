
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Trophy, AlertCircle, Save } from 'lucide-react';

interface Registration {
    id: string;
    student: {
        name: string;
        roll_number: string;
        year: string;
        department: string;
    };
    group_id: string | null;
    status: string; // registration status
}

interface Result {
    id: string | null; // null if new
    registration_id: string;
    position: 'first' | 'second' | 'third' | 'none';
    status: 'participated' | 'did_not_participate';
    points: number;
}

export default function EventResultEntry() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [results, setResults] = useState<Record<string, Result>>({}); // Map reg_id -> Result
    const [eventDetails, setEventDetails] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (eventId) fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Event Details
            const { data: event, error: eventError } = await supabase
                .from('events' as any)
                .select('*')
                .eq('id', eventId)
                .single();

            if (eventError) throw eventError;
            setEventDetails(event as any);

            // 2. Fetch Registrations (Approved only)
            const { data: regs, error: regError } = await supabase
                .from('registrations' as any)
                .select(`
                    id,
                    status,
                    group_id,
                    student:student_id (name, roll_number, year, department)
                `)
                .eq('event_id', eventId)
                .eq('status', 'approved') as any; // Cast entire response

            if (regError) throw regError;
            setRegistrations((regs as any) || []);

            // 3. Fetch Existing Results
            const { data: existingResults, error: resError } = await supabase
                .from('event_results' as any)
                .select('*')
                .in('registration_id', (regs || []).map((r: any) => r.id));

            if (resError) throw resError;

            // Map results
            const resultsMap: Record<string, Result> = {};
            // Initialize default state for all regs
            (regs as any)?.forEach((r: any) => {
                const existing = (existingResults as any)?.find((er: any) => er.registration_id === r.id);
                if (existing) {
                    resultsMap[r.id] = existing;
                } else {
                    resultsMap[r.id] = {
                        id: null,
                        registration_id: r.id,
                        position: 'none',
                        status: 'participated',
                        points: 0 // placeholder
                    };
                }
            });
            setResults(resultsMap);

        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast({ title: 'Error', description: 'Failed to load event data', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (regId: string, field: keyof Result, value: any) => {
        setResults(prev => {
            const current = { ...prev[regId] };

            if (field === 'status' && value === 'did_not_participate') {
                // If DNA, force position to none
                current.position = 'none';
            }

            return {
                ...prev,
                [regId]: { ...current, [field]: value }
            };
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            const updates = Object.values(results).map(r => ({
                registration_id: r.registration_id,
                position: r.position,
                status: r.status,
                // points are calculated by trigger
            }));

            // Upsert all
            const { error } = await supabase
                .from('event_results' as any)
                .upsert(updates, { onConflict: 'registration_id' });

            if (error) throw error;

            toast({ title: 'Success', description: 'Results updated successfully!' });
            fetchData(); // Refresh to get calculated points

        } catch (error: any) {
            console.error('Error saving results:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const getPositionBadge = (points: number) => {
        if (points === 5 || points === 10) return <Badge className="bg-yellow-500 text-white">1st Place</Badge>;
        if (points === 3 || points === 5) return <Badge className="bg-gray-400 text-white">2nd Place</Badge>; // 5 for group 2nd
        if (points === 1) return <Badge className="bg-orange-400 text-white">3rd Place</Badge>;
        if (points < 0) return <Badge variant="destructive">DNA ({points})</Badge>;
        return <span className="text-muted-foreground">-</span>;
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-5xl">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                <div>
                    <h1 className="text-3xl font-black">{eventDetails?.name} Results</h1>
                    <p className="text-muted-foreground">Manage winners and negative points</p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Participants</CardTitle>
                        <CardDescription>
                            Mark "Did Not Participate" assigns negative points automatically.
                        </CardDescription>
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Publish Results
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student / Group</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead className="text-right">Points</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {registrations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No approved participants found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                registrations.map(reg => {
                                    const res = results[reg.id];
                                    if (!res) return null;

                                    return (
                                        <TableRow key={reg.id} className={res.status === 'did_not_participate' ? 'bg-destructive/5' : ''}>
                                            <TableCell className="font-medium">
                                                {reg.student.name} <br />
                                                <span className="text-xs text-muted-foreground">{reg.student.roll_number}</span>
                                            </TableCell>
                                            <TableCell className="capitalize">{reg.student.year}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={res.status}
                                                    onValueChange={(v) => handleUpdate(reg.id, 'status', v)}
                                                >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="participated">Participated</SelectItem>
                                                        <SelectItem value="did_not_participate">Did Not Participate</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={res.position}
                                                    onValueChange={(v) => handleUpdate(reg.id, 'position', v)}
                                                    disabled={res.status === 'did_not_participate'}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None</SelectItem>
                                                        <SelectItem value="first">🥇 1st Place</SelectItem>
                                                        <SelectItem value="second">🥈 2nd Place</SelectItem>
                                                        <SelectItem value="third">🥉 3rd Place</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {res.points !== 0 ? (
                                                    <Badge variant={res.points > 0 ? 'default' : 'destructive'} className={res.points > 0 ? 'bg-green-600' : ''}>
                                                        {res.points > 0 ? '+' : ''}{res.points}
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
