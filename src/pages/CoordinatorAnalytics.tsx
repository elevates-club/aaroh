import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Trophy,
    TrendingDown,
    AlertTriangle,
    BarChart3,
    Activity,
    Users,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    UserCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { getCoordinatorYear as getYearFromRole } from '@/lib/roleUtils';
import { SystemError } from '@/components/SystemError';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fetchRegistrationLimits } from '@/lib/registration-limits';

interface EventAnalytics {
    id: string;
    name: string;
    category: 'on_stage' | 'off_stage';
    max_entries_per_year: number | null;
    currentCount: number;
    occupancyRate: number;
}

interface StudentParticipation {
    studentId: string;
    studentName: string;
    rollNumber: string;
    onStageCount: number;
    offStageCount: number;
    totalCount: number;
    events: Array<{ name: string; category: string }>;
}

export default function CoordinatorAnalytics() {
    const { profile } = useAuth();
    const { activeRole } = useRole();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<EventAnalytics[]>([]);
    const [studentStats, setStudentStats] = useState<StudentParticipation[]>([]);
    const [limits, setLimits] = useState({ maxOnStage: 0, maxOffStage: 0 });
    const [selectedStudent, setSelectedStudent] = useState<StudentParticipation | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const coordinatorYear = getYearFromRole(activeRole);

    if (!coordinatorYear) {
        return (
            <SystemError
                title="Configuration Error"
                message="We could not determine which year you are coordinating. Please check your role assignments."
            />
        );
    }

    useEffect(() => {
        fetchAnalytics();
    }, [activeRole]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const year = coordinatorYear as 'first' | 'second' | 'third' | 'fourth';

            // 1. Fetch Limits
            const limitsData = await fetchRegistrationLimits();
            setLimits({
                maxOnStage: limitsData.maxOnStageRegistrations,
                maxOffStage: limitsData.maxOffStageRegistrations
            });

            // 2. Fetch all active events and their analytics
            const { data: allEvents, error: eventError } = await supabase
                .from('events')
                .select('id, name, category, max_entries_per_year')
                .eq('is_active', true);

            if (eventError) throw eventError;

            if (allEvents) {
                const eventAnalytics: EventAnalytics[] = [];
                for (const event of allEvents) {
                    const { data: regs } = await supabase
                        .from('registrations')
                        .select(`id, student:students!inner(year)`)
                        .eq('event_id', event.id)
                        .eq('student.year', year)
                        .neq('status', 'rejected');

                    const currentCount = regs?.length || 0;
                    const max = event.max_entries_per_year || 0;
                    const occupancyRate = max > 0 ? (currentCount / max) * 100 : 0; // Prevent division by zero

                    eventAnalytics.push({
                        id: event.id,
                        name: event.name,
                        category: event.category as 'on_stage' | 'off_stage',
                        max_entries_per_year: event.max_entries_per_year,
                        currentCount,
                        occupancyRate
                    });
                }
                setEvents(eventAnalytics);
            }

            // 3. Fetch Student Participation Data
            const { data: studentRegs, error: studentError } = await supabase
                .from('registrations')
                .select(`
                    student:students!inner(id, name, roll_number, year),
                    event:events!inner(name, category)
                `)
                .eq('student.year', year)
                .neq('status', 'rejected');

            if (studentError) throw studentError;

            if (studentRegs) {
                const statsMap: Record<string, StudentParticipation> = {};

                studentRegs.forEach((reg: any) => {
                    const sId = reg.student.id;
                    if (!statsMap[sId]) {
                        statsMap[sId] = {
                            studentId: sId,
                            studentName: reg.student.name,
                            rollNumber: reg.student.roll_number,
                            onStageCount: 0,
                            offStageCount: 0,
                            totalCount: 0,
                            events: []
                        };
                    }

                    const category = reg.event.category;
                    if (category === 'on_stage') statsMap[sId].onStageCount++;
                    else statsMap[sId].offStageCount++;

                    statsMap[sId].totalCount++;
                    statsMap[sId].events.push({
                        name: reg.event.name,
                        category: reg.event.category
                    });
                });

                // Convert map to array and filter for students with significant participation
                // We show students who have at least 1 registration, sorted by total count
                const statsArray = Object.values(statsMap).sort((a, b) => b.totalCount - a.totalCount);
                setStudentStats(statsArray);
            }

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    // Derived states
    const topPerforming = [...events].sort((a, b) => b.currentCount - a.currentCount).slice(0, 5);
    const lowParticipation = [...events].filter(e => e.currentCount < 3).sort((a, b) => a.currentCount - b.currentCount).slice(0, 5);
    const nearCapacity = events.filter(e => e.max_entries_per_year && e.occupancyRate >= 80).sort((a, b) => b.occupancyRate - a.occupancyRate);

    // Filter students at or near limit
    const studentsAtLimit = studentStats.filter(s =>
        s.onStageCount >= limits.maxOnStage || s.offStageCount >= limits.maxOffStage
    );

    // Calculate totals
    const totalRegistrations = events.reduce((acc, curr) => acc + curr.currentCount, 0);
    const avgParticipation = events.length > 0 ? Math.round(totalRegistrations / events.length) : 0;

    return (
        <div className="p-4 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
                <p className="text-muted-foreground">
                    Performance metrics for {coordinatorYear} year participation.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRegistrations}</div>
                        <p className="text-xs text-muted-foreground">Across all events</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Participation</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgParticipation}</div>
                        <p className="text-xs text-muted-foreground">Students per event</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{events.length}</div>
                        <p className="text-xs text-muted-foreground">Open for registration</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Near Capacity</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">{nearCapacity.length}</div>
                        <p className="text-xs text-muted-foreground">Events &gt; 80% full</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Top Performing Events */}
                <Card className="lg:col-span-6 border-none shadow-sm h-[400px] flex flex-col">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                    Top Performing
                                </CardTitle>
                                <CardDescription>Highest registration numbers</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <CardContent className="space-y-4">
                            {topPerforming.map((event, i) => (
                                <div key={event.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="font-bold text-muted-foreground w-6">#{i + 1}</div>
                                        <div>
                                            <p className="font-medium text-sm">{event.name}</p>
                                            <Badge variant="outline" className="text-[10px] mt-1">{event.category}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="font-mono">{event.currentCount}</Badge>
                                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </ScrollArea>
                </Card>

                {/* Low Participation */}
                <Card className="lg:col-span-6 border-none shadow-sm h-[400px] flex flex-col">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingDown className="h-5 w-5 text-red-500" />
                                    Needs Attention
                                </CardTitle>
                                <CardDescription>Lowest participation (Bootom 5)</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <CardContent className="space-y-4">
                            {lowParticipation.map((event, i) => (
                                <div key={event.id} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg hover:bg-red-500/10 transition-colors border border-red-500/10">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="font-medium text-sm">{event.name}</p>
                                            <Badge variant="outline" className="text-[10px] mt-1">{event.category}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Only</span>
                                        <Badge variant="destructive" className="font-mono bg-red-500/20 text-red-600 hover:bg-red-500/30 border-none">{event.currentCount}</Badge>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </ScrollArea>
                </Card>

                {/* Student Participation (Limit Reached) */}
                <Card className="lg:col-span-12 border-none shadow-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2">
                                    <UserCheck className="h-5 w-5 text-blue-500" />
                                    Limit Reached / High Engagement
                                </CardTitle>
                                <CardDescription>Students who have reached max registrations (On-Stage: {limits.maxOnStage}, Off-Stage: {limits.maxOffStage})</CardDescription>
                            </div>
                            <Badge variant="outline" className="font-mono">
                                Total: {studentsAtLimit.length} Students
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {studentsAtLimit.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {studentsAtLimit.map(student => (
                                    <div
                                        key={student.studentId}
                                        onClick={() => {
                                            setSelectedStudent(student);
                                            setDetailsOpen(true);
                                        }}
                                        className="p-4 border border-border/50 rounded-xl bg-card hover:shadow-md transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{student.studentName}</h4>
                                                <p className="text-xs text-muted-foreground font-mono">{student.rollNumber}</p>
                                            </div>
                                            <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200">
                                                {student.totalCount} Reg
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 text-xs">
                                            <div className={`flex-1 px-2 py-1 rounded bg-muted/50 flex flex-col items-center ${student.onStageCount >= limits.maxOnStage ? 'bg-red-500/10 text-red-600 border border-red-500/20' : ''}`}>
                                                <span className="font-bold">{student.onStageCount}</span>
                                                <span className="text-[10px] opacity-70">On-Stage</span>
                                            </div>
                                            <div className={`flex-1 px-2 py-1 rounded bg-muted/50 flex flex-col items-center ${student.offStageCount >= limits.maxOffStage ? 'bg-red-500/10 text-red-600 border border-red-500/20' : ''}`}>
                                                <span className="font-bold">{student.offStageCount}</span>
                                                <span className="text-[10px] opacity-70">Off-Stage</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                                <p>No students have reached the registration limits yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Capacity Watch */}
                <Card className="lg:col-span-12 border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Capacity Watch
                        </CardTitle>
                        <CardDescription>Events nearing registration limits</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {nearCapacity.length > 0 ? nearCapacity.map(event => (
                                <div key={event.id} className="p-4 border border-border/50 rounded-xl bg-card hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-sm truncate pr-2">{event.name}</h4>
                                        <Badge variant={event.occupancyRate >= 100 ? "destructive" : "default"} className="text-[10px]">
                                            {Math.round(event.occupancyRate)}% Full
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>{event.currentCount} registered</span>
                                            <span>Limit: {event.max_entries_per_year}</span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${event.occupancyRate >= 100 ? 'bg-red-500' : 'bg-primary'}`}
                                                style={{ width: `${Math.min(event.occupancyRate, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                                    <p>No events are currently near capacity limits.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Student Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedStudent?.studentName}</DialogTitle>
                        <DialogDescription>
                            Registered Events ({selectedStudent?.totalCount} total)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex gap-4 text-sm">
                            <div className="flex-1 bg-muted/50 p-2 rounded text-center">
                                <div className="font-bold">{selectedStudent?.onStageCount}</div>
                                <div className="text-xs text-muted-foreground">On-Stage</div>
                            </div>
                            <div className="flex-1 bg-muted/50 p-2 rounded text-center">
                                <div className="font-bold">{selectedStudent?.offStageCount}</div>
                                <div className="text-xs text-muted-foreground">Off-Stage</div>
                            </div>
                        </div>

                        <ScrollArea className="h-[200px] pr-4">
                            <div className="space-y-2">
                                {selectedStudent?.events.map((event, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded border bg-card/50">
                                        <span className="text-sm font-medium">{event.name}</span>
                                        <Badge variant="outline" className="text-[10px]">{event.category.replace('_', ' ')}</Badge>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
