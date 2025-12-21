import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, RefreshCw, Filter, Calendar, User, Clock, CheckCircle, XCircle, AlertCircle, Trophy, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityItem {
    id: string;
    created_at: string;
    status: 'pending' | 'approved' | 'rejected';
    student: {
        id: string;
        name: string;
        year: string;
        roll_number: string;
        department: string;
    };
    event: {
        name: string;
        category: string;
    };
    approver?: {
        full_name: string;
    } | null;
}

interface StudentHistoryRegistration {
    id: string;
    status: string;
    created_at: string;
    event: {
        name: string;
        category: string;
        event_date: string | null;
        venue: string | null;
    };
}

export default function EventActivity() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Student History Dialog State
    const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
    const [studentHistory, setStudentHistory] = useState<StudentHistoryRegistration[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        fetchActivities(true);
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentHistory(selectedStudent.id);
        }
    }, [selectedStudent]);

    const fetchActivities = async (reset = false) => {
        try {
            if (reset) {
                setLoading(true);
                setPage(1);
            } else {
                setRefreshing(true);
            }

            let query = supabase
                .from('registrations')
                .select(`
          id,
          created_at,
          status,
          student:students!inner(id, name, year, roll_number, department),
          event:events!inner(name, category),
          approver:profiles!registered_by(full_name)
        `)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter as any);
            }

            if (searchTerm) {
                query.ilike('student.name', `%${searchTerm}%`);
            }

            const from = reset ? 0 : (page * ITEMS_PER_PAGE);
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error } = await query.range(from, to);

            if (error) throw error;

            if (data) {
                const typedData = data.map((item: any) => ({
                    ...item,
                    approver: item.approver // Map the joined profile data
                })) as ActivityItem[];

                if (reset) {
                    setActivities(typedData);
                } else {
                    setActivities(prev => [...prev, ...typedData]);
                }
                setHasMore(typedData.length === ITEMS_PER_PAGE);
                if (!reset) setPage(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchStudentHistory = async (studentId: string) => {
        try {
            setHistoryLoading(true);
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    id,
                    status,
                    created_at,
                    event:events(name, category, event_date, venue)
                `)
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setStudentHistory(data || []);
        } catch (error) {
            console.error('Error fetching student history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const loadMore = () => {
        setPage(prev => prev + 1);
        fetchActivities(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50';
            case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
            case 'rejected': return 'bg-red-500/10 text-red-600 border-red-200/50';
            default: return 'bg-slate-500/10 text-slate-600 border-slate-200/50';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle className="h-4 w-4" />;
            case 'pending': return <Clock className="h-4 w-4" />;
            case 'rejected': return <XCircle className="h-4 w-4" />;
            default: return <AlertCircle className="h-4 w-4" />;
        }
    };

    const getYearLabel = (year: string) => {
        const map: Record<string, string> = {
            'first': '1st Year',
            'second': '2nd Year',
            'third': '3rd Year',
            'fourth': '4th Year'
        };
        return map[year] || year;
    };

    return (
        <div className="w-full max-w-[100vw] px-4 py-8 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 md:max-w-[1600px] mx-auto text-foreground overflow-x-hidden">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">
                        Event Activity
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">
                        Real-time feed of registrations and participation
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => fetchActivities(true)}
                    disabled={loading || refreshing}
                    className="rounded-xl"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing || loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card className="border-none bg-card shadow-sm p-4 rounded-[2rem] flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search by student name..."
                        className="pl-12 h-11 rounded-xl bg-muted border-none font-medium focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/70"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-[200px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-11 rounded-xl bg-muted border-none font-bold text-xs uppercase tracking-wide">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Activity Feed */}
            <div className="space-y-4">
                {loading && activities.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50">
                        <p>No activity found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {activities.map((item) => (
                            <div
                                key={item.id}
                                className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-card hover:bg-muted/50 border border-border/40 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${item.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                                        item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' :
                                            'bg-slate-100 text-slate-500'
                                        }`}
                                        onClick={() => setSelectedStudent({ id: item.student.id, name: item.student.name })}
                                    >
                                        {item.student.name.charAt(0)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className="font-bold text-base text-foreground truncate cursor-pointer hover:underline decoration-primary decoration-2 underline-offset-2"
                                            onClick={() => setSelectedStudent({ id: item.student.id, name: item.student.name })}
                                        >
                                            {item.student.name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                            <span className="font-medium text-foreground/80">{item.event.name}</span>
                                            <span>•</span>
                                            <span>{getYearLabel(item.student.year)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mt-3 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                                    <div className="flex flex-col items-end mr-4">
                                        {item.approver ? (
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                                {item.status === 'approved' ? 'Approved by' : 'Processed by'} <span className="text-foreground font-bold">{item.approver.full_name}</span>
                                            </p>
                                        ) : (
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide opacity-50">
                                                Self-Registered
                                            </p>
                                        )}
                                    </div>

                                    <Badge variant="outline" className={`h-7 px-3 gap-1.5 font-bold uppercase text-[10px] tracking-wider border-none ${getStatusColor(item.status)}`}>
                                        {getStatusIcon(item.status)}
                                        {item.status}
                                    </Badge>

                                    <div className="text-right min-w-[100px]">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {hasMore && !loading && activities.length > 0 && (
                    <div className="flex justify-center pt-6">
                        <Button variant="ghost" onClick={loadMore} disabled={refreshing} className="rounded-full">
                            {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Load More Activity
                        </Button>
                    </div>
                )}
            </div>

            {/* Student History Dialog */}
            <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-6 rounded-[2rem]">
                    <DialogHeader className="pb-4 border-b border-border/50">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {selectedStudent?.name.charAt(0)}
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">{selectedStudent?.name}</DialogTitle>
                                <DialogDescription>
                                    Reviewing participation history and results
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {historyLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <ScrollArea className="flex-1 pr-4 -mr-4">
                            <div className="space-y-6 pt-4">
                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-center">
                                        <p className="text-2xl font-black text-foreground">{studentHistory.length}</p>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                                        <p className="text-2xl font-black text-emerald-600">
                                            {studentHistory.filter(h => h.status === 'approved').length}
                                        </p>
                                        <p className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider">Approved</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center">
                                        <p className="text-2xl font-black text-amber-600">
                                            {studentHistory.filter(h => h.status === 'pending').length}
                                        </p>
                                        <p className="text-[10px] uppercase font-bold text-amber-600/70 tracking-wider">Pending</p>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">Recent Events</p>
                                    {studentHistory.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground italic">
                                            No event history found.
                                        </div>
                                    ) : (
                                        studentHistory.map((historyItem) => (
                                            <div key={historyItem.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors group">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                                        {historyItem.event.name}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {historyItem.event.event_date ? format(new Date(historyItem.event.event_date), 'MMM dd') : 'TBA'}
                                                        </span>
                                                        <span className="capitalize px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-bold">
                                                            {historyItem.event.category.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={`h-6 px-2.5 font-bold uppercase text-[10px] tracking-wider border-none ${getStatusColor(historyItem.status)}`}>
                                                    {historyItem.status}
                                                </Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
