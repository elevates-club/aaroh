import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Activity,
    BarChart3,
    AlertTriangle,
    Search,
    Filter,
    Users,
    Trophy,
    GraduationCap,
    PieChart,
    Mic2,
    CalendarCheck,
    Download,
    XCircle
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface EventParticipation {
    id: string;
    name: string;
    category: string;
    max_entries_per_year: number | null;
    registrations: {
        first: number;
        second: number;
        third: number;
        fourth: number;
    };
    total: number;
    occupancyRates: {
        first: number;
        second: number;
        third: number;
        fourth: number;
    };
}

interface YearStats {
    year: string;
    count: number;
}

export default function EventAnalytics() {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<EventParticipation[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGap, setFilterGap] = useState<string>('all'); // 'all', 'first', 'second', 'third', 'fourth'
    const [totalUniqueStudents, setTotalUniqueStudents] = useState(0);
    const [yearStats, setYearStats] = useState<YearStats[]>([]);
    const [categoryStats, setCategoryStats] = useState({ onStage: 0, offStage: 0, onStageEvents: 0, offStageEvents: 0 });
    const [rejectedCount, setRejectedCount] = useState(0);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);

            // Fetch all active events with limits
            const { data: allEvents, error: eventError } = await supabase
                .from('events')
                .select('id, name, category, max_entries_per_year')
                .eq('is_active', true)
                .order('name');

            if (eventError) throw eventError;
            if (!allEvents) return;

            // Fetch all non-rejected registrations with student year info
            const { data: allRegs, error: regError } = await supabase
                .from('registrations')
                .select(`
                    student_id,
                    event_id,
                    student:students!inner(year)
                `)
                .neq('status', 'rejected');

            if (regError) throw regError;

            // Fetch rejected count
            const { count: rejected } = await supabase
                .from('registrations')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'rejected');

            setRejectedCount(rejected || 0);

            // Process data in memory
            const participationMap: Record<string, EventParticipation> = {};
            const uniqueStudentIds = new Set<string>();
            const yearCounts: Record<string, number> = {
                first: 0,
                second: 0,
                third: 0,
                fourth: 0
            };
            let onStageCount = 0;
            let offStageCount = 0;
            let onStageEventsCount = 0;
            let offStageEventsCount = 0;

            // Initialize map with all events
            allEvents.forEach(event => {
                participationMap[event.id] = {
                    id: event.id,
                    name: event.name,
                    category: event.category,
                    max_entries_per_year: event.max_entries_per_year,
                    registrations: { first: 0, second: 0, third: 0, fourth: 0 },
                    total: 0,
                    occupancyRates: { first: 0, second: 0, third: 0, fourth: 0 }
                };

                if (event.category === 'on_stage') onStageEventsCount++;
                else offStageEventsCount++;
            });

            // Aggregate counts
            if (allRegs) {
                allRegs.forEach((reg: any) => {
                    const eId = reg.event_id;
                    const year = reg.student?.year as 'first' | 'second' | 'third' | 'fourth';

                    uniqueStudentIds.add(reg.student_id);

                    if (year && yearCounts[year] !== undefined) {
                        yearCounts[year]++;
                    }

                    if (participationMap[eId] && year) {
                        if (participationMap[eId].registrations[year] !== undefined) {
                            participationMap[eId].registrations[year]++;
                            participationMap[eId].total++;

                            if (participationMap[eId].category === 'on_stage') onStageCount++;
                            else offStageCount++;
                        }
                    }
                });
            }

            // Calculate occupancy rates
            Object.values(participationMap).forEach(event => {
                if (event.max_entries_per_year && event.max_entries_per_year > 0) {
                    event.occupancyRates.first = (event.registrations.first / event.max_entries_per_year) * 100;
                    event.occupancyRates.second = (event.registrations.second / event.max_entries_per_year) * 100;
                    event.occupancyRates.third = (event.registrations.third / event.max_entries_per_year) * 100;
                    event.occupancyRates.fourth = (event.registrations.fourth / event.max_entries_per_year) * 100;
                }
            });

            setEvents(Object.values(participationMap));
            setTotalUniqueStudents(uniqueStudentIds.size);
            setCategoryStats({
                onStage: onStageCount,
                offStage: offStageCount,
                onStageEvents: onStageEventsCount,
                offStageEvents: offStageEventsCount
            });

            const yearStatsArray = [
                { year: 'First Year', count: yearCounts.first },
                { year: 'Second Year', count: yearCounts.second },
                { year: 'Third Year', count: yearCounts.third },
                { year: 'Fourth Year', count: yearCounts.fourth },
            ].sort((a, b) => b.count - a.count);

            setYearStats(yearStatsArray);

        } catch (error) {
            console.error("Error fetching event analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    // Derived & Filtered Data
    const filteredEvents = useMemo(() => {
        return events.filter(event => {
            const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (filterGap === 'all') return true;

            // Check for specific year gaps (0 registrations)
            return event.registrations[filterGap as keyof typeof event.registrations] === 0;
        });
    }, [events, searchTerm, filterGap]);

    const topEvents = [...events].sort((a, b) => b.total - a.total).slice(0, 5);
    const totalRegistrations = events.reduce((sum, e) => sum + e.total, 0);
    const zeroParticipationCount = events.filter(e =>
        e.registrations.first === 0 || e.registrations.second === 0 ||
        e.registrations.third === 0 || e.registrations.fourth === 0
    ).length;

    // Filter for capacity watch (any year > 80% full)
    const capacityWatchEvents = events.filter(e =>
        e.occupancyRates.first >= 80 || e.occupancyRates.second >= 80 ||
        e.occupancyRates.third >= 80 || e.occupancyRates.fourth >= 80
    ).sort((a, b) => {
        const maxOccA = Math.max(...Object.values(a.occupancyRates));
        const maxOccB = Math.max(...Object.values(b.occupancyRates));
        return maxOccB - maxOccA;
    }).slice(0, 6); // Top 6 critical ones

    return (
        <div className="p-4 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Event Insights</h1>
                    <p className="text-muted-foreground">
                        Comprehensive view of participation, occupancy, and trends.
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unique Students</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUniqueStudents}</div>
                        <p className="text-xs text-muted-foreground">Total distinct participants</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Generic Registrations</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRegistrations}</div>
                        <p className="text-xs text-muted-foreground">Total event signups</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Participation Gaps</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">{zeroParticipationCount}</div>
                        <p className="text-xs text-muted-foreground">Events with 0 regs from a year</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Full Capacity Events</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{capacityWatchEvents.length}</div>
                        <p className="text-xs text-muted-foreground">Events near capacity (&gt;80%)</p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected Registrations</CardTitle>
                        <XCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{rejectedCount}</div>
                        <p className="text-xs text-muted-foreground">Total rejected entries</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Top 5 Events */}
                <Card className="lg:col-span-4 border-none shadow-sm h-[420px] flex flex-col">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                Top 5 Events
                            </CardTitle>
                        </div>
                        <CardDescription>Most popular events by total registrations</CardDescription>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <CardContent className="space-y-4">
                            {topEvents.map((event, i) => (
                                <div key={event.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm
                                            ${i === 0 ? 'bg-yellow-500/20 text-yellow-600' : ''}
                                            ${i === 1 ? 'bg-slate-300 text-slate-600' : ''}
                                            ${i === 2 ? 'bg-amber-700/20 text-amber-800' : ''}
                                            ${i > 2 ? 'bg-muted text-muted-foreground' : ''}
                                        `}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm truncate max-w-[120px]">{event.name}</p>
                                            <Badge variant="outline" className="text-[10px] mt-1">{event.category.replace('_', ' ')}</Badge>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="font-mono">{event.total}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </ScrollArea>
                </Card>

                {/* Year-wise Breakdown */}
                <Card className="lg:col-span-4 border-none shadow-sm h-[420px] flex flex-col">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-purple-500" />
                                Participation by Year
                            </CardTitle>
                        </div>
                        <CardDescription>Total registrations by academic year</CardDescription>
                    </CardHeader>
                    <ScrollArea className="flex-1">
                        <CardContent className="space-y-4">
                            {yearStats.map((stat, i) => (
                                <div key={stat.year} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                                        <span className="font-medium text-sm">{stat.year}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 rounded-full"
                                                style={{ width: totalRegistrations > 0 ? `${(stat.count / totalRegistrations) * 100}%` : '0%' }}
                                            />
                                        </div>
                                        <span className="font-mono text-sm font-bold">{stat.count}</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </ScrollArea>
                </Card>

                {/* Category Distribution */}
                <Card className="lg:col-span-4 border-none shadow-sm h-[420px] flex flex-col">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-green-500" />
                                Category Split
                            </CardTitle>
                        </div>
                        <CardDescription>Event types & registration volume</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-center space-y-8">
                        {/* On-Stage */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Mic2 className="h-4 w-4 text-green-600" />
                                    <span className="font-medium">On-Stage</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg">{categoryStats.onStage}</div>
                                    <div className="text-[10px] text-muted-foreground">{categoryStats.onStageEvents} Events</div>
                                </div>
                            </div>
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full"
                                    style={{ width: totalRegistrations > 0 ? `${(categoryStats.onStage / totalRegistrations) * 100}%` : '0%' }}
                                />
                            </div>
                        </div>

                        {/* Off-Stage */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-blue-600" />
                                    <span className="font-medium">Off-Stage</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg">{categoryStats.offStage}</div>
                                    <div className="text-[10px] text-muted-foreground">{categoryStats.offStageEvents} Events</div>
                                </div>
                            </div>
                            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full"
                                    style={{ width: totalRegistrations > 0 ? `${(categoryStats.offStage / totalRegistrations) * 100}%` : '0%' }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Capacity Watch */}
            {capacityWatchEvents.length > 0 && (
                <Card className="border-none shadow-sm bg-red-500/5 border-red-200">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            <CardTitle>Capacity Watch</CardTitle>
                        </div>
                        <CardDescription>Events where at least one year group is &gt;80% full</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {capacityWatchEvents.map(event => (
                                <div key={event.id} className="p-4 bg-background rounded-lg border border-red-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-semibold text-sm truncate">{event.name}</h4>
                                        <Badge variant="outline" className="text-[10px]">{event.max_entries_per_year} / year</Badge>
                                    </div>
                                    <div className="space-y-2">
                                        {/* Show only years with high occupancy */}
                                        {(['first', 'second', 'third', 'fourth'] as const).map(year => {
                                            const occupancy = event.occupancyRates[year];
                                            if (occupancy < 50) return null; // Only show significant usage
                                            return (
                                                <div key={year} className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold">
                                                        <span>{year} Year</span>
                                                        <span className={occupancy >= 80 ? 'text-red-600' : 'text-green-600'}>
                                                            {Math.round(occupancy)}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${occupancy >= 100 ? 'bg-red-600' : occupancy >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                                                            style={{ width: `${Math.min(occupancy, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search events..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filterGap} onValueChange={setFilterGap}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Filter by Gap" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Show All Events</SelectItem>
                            <SelectItem value="first">Missing 1st Year</SelectItem>
                            <SelectItem value="second">Missing 2nd Year</SelectItem>
                            <SelectItem value="third">Missing 3rd Year</SelectItem>
                            <SelectItem value="fourth">Missing 4th Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Participation Matrix */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader>
                    <CardTitle>Participation Matrix</CardTitle>
                    <CardDescription>Breakdown of registrations by academic year</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <div className="min-w-[800px]"> {/* Ensure horizontal scroll on small screens */}
                            <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/30 font-medium text-sm text-muted-foreground sticky top-0 backdrop-blur-sm">
                                <div className="col-span-4">Event Name</div>
                                <div className="col-span-2 text-center">1st Year</div>
                                <div className="col-span-2 text-center">2nd Year</div>
                                <div className="col-span-2 text-center">3rd Year</div>
                                <div className="col-span-2 text-center">4th Year</div>
                            </div>

                            {filteredEvents.length > 0 ? (
                                <div className="divide-y divide-border/50">
                                    {filteredEvents.map(event => (
                                        <div key={event.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/20 transition-colors">
                                            <div className="col-span-4">
                                                <div className="font-medium">{event.name}</div>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                        {event.category.replace('_', ' ')}
                                                    </Badge>
                                                    {Object.values(event.occupancyRates).some(r => r >= 100) && (
                                                        <Badge variant="destructive" className="text-[8px] h-4">FULL</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Year Columns */}
                                            {(['first', 'second', 'third', 'fourth'] as const).map(year => (
                                                <div key={year} className="col-span-2 flex justify-center">
                                                    {event.registrations[year] === 0 ? (
                                                        <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">
                                                            0
                                                        </Badge>
                                                    ) : (
                                                        <div className="text-center">
                                                            <span className={`font-mono font-medium block ${event.registrations[year] < 5 ? 'text-amber-500' : ''}`}>
                                                                {event.registrations[year]}
                                                            </span>
                                                            {event.max_entries_per_year && (
                                                                <span className="text-[10px] text-muted-foreground block">
                                                                    / {event.max_entries_per_year}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-muted-foreground">
                                    No events found matching your criteria.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
