
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trophy, Medal, Star, Activity, ChevronRight, TrendingUp, ListOrdered } from 'lucide-react';

interface ScoreParams {
    year: string;
    total_points: number;
}

interface RecentResult {
    id: string;
    points: number;
    position: string;
    status: string; // 'participated' | 'did_not_participate'
    created_at: string;
    registration: {
        student: {
            name: string;
            year: string;
        };
        event: {
            name: string;
            category: string;
        };
    };
}

interface YearLeagueStats {
    year: string;
    played: number;
    won: number; // 1st
    second: number;
    third: number;
    dna: number; // Negative/Penalty
    points: number;
}

export default function Scoreboard() {
    const [scores, setScores] = useState<ScoreParams[]>([]);
    const [allResults, setAllResults] = useState<RecentResult[]>([]);
    const [leagueStats, setLeagueStats] = useState<YearLeagueStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [isScoreboardVisible, setIsScoreboardVisible] = useState(false);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('public:event_results')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_results' }, () => {
                fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchData = async () => {
        try {
            // 1. Check Visibility
            const { data: settingsData } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'scoreboard_visible')
                .single();

            const isVisible = (settingsData?.value as any)?.enabled === true;
            setIsScoreboardVisible(isVisible);

            // If not visible, we can stop here to save resources, but for now let's load everything
            // so admins might see it (if we add admin override later). 
            // For now, if we want to validly show "Coming Soon", we assume we don't need data.
            if (!isVisible) {
                setLoading(false);
                return;
            }

            // 2. Fetch Aggregated Stats (for cards)
            const { data: stats, error: statsError } = await supabase
                .from('scoreboard_stats' as any)
                .select('*');

            if (statsError) throw statsError;

            const allYears = ['first', 'second', 'third', 'fourth'];
            const mergedScores = allYears.map(year => {
                const found = (stats as any)?.find((s: any) => s.year === year);
                return {
                    year,
                    total_points: found ? found.total_points : 0
                };
            }).sort((a, b) => b.total_points - a.total_points);

            setScores(mergedScores);



            // 3. Fetch ALL Detailed Results (No limit, for League Table)
            const { data: results, error: resError } = await supabase
                .from('event_results' as any)
                .select(`
                    id, 
                    points, 
                    position,
                    status,
                    created_at,
                    registration:registrations (
                        student:students (name, year),
                        event:events (name, category)
                    )
                `)
                .order('created_at', { ascending: false });

            if (resError) throw resError;

            const typedResults = (results as any) || [];
            setAllResults(typedResults);
            calculateLeagueStats(typedResults, allYears);

        } catch (error) {
            console.error('Error loading scoreboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateLeagueStats = (results: RecentResult[], years: string[]) => {
        const statsMap: Record<string, YearLeagueStats> = {};

        // Initialize
        years.forEach(year => {
            statsMap[year] = { year, played: 0, won: 0, second: 0, third: 0, dna: 0, points: 0 };
        });

        // Aggregate
        results.forEach(r => {
            const year = r.registration?.student?.year;
            if (statsMap[year]) {
                statsMap[year].points += r.points;
                statsMap[year].played += 1;

                if (r.position === 'first') statsMap[year].won += 1;
                else if (r.position === 'second') statsMap[year].second += 1;
                else if (r.position === 'third') statsMap[year].third += 1;

                if (r.points < 0) statsMap[year].dna += 1; // Count negatives
            }
        });

        // Convert to array and sort
        const statsArray = Object.values(statsMap).sort((a, b) => b.points - a.points);
        setLeagueStats(statsArray);
    };

    const getYearLabel = (year: string) => {
        switch (year) {
            case 'first': return 'First Year';
            case 'second': return 'Second Year';
            case 'third': return 'Third Year';
            case 'fourth': return 'Fourth Year';
            default: return year;
        }
    };

    const getRankIcon = (index: number) => {
        if (index === 0) return <Trophy className="h-12 w-12 text-yellow-500 animate-pulse" />;
        if (index === 1) return <Medal className="h-10 w-10 text-gray-400" />;
        if (index === 2) return <Medal className="h-10 w-10 text-orange-400" />;
        return <Star className="h-8 w-8 text-white/20" />;
    };

    const getPositionColor = (pos: string) => {
        switch (pos) {
            case 'first': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'second': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
            case 'third': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            default: return 'text-muted-foreground';
        }
    };

    // Helper to get the latest win for a specific year
    const getLatestWin = (year: string) => {
        return allResults.find(r => r.registration?.student?.year === year && r.points > 0);
    };

    // Filter results for the modal
    const getYearResults = (year: string) => {
        return allResults.filter(r => r.registration?.student?.year === year);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 text-yellow-500 animate-spin" />
            </div>
        );
    }

    if (!isScoreboardVisible) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
                <div className="text-center space-y-6 max-w-lg mx-auto">
                    <Trophy className="h-24 w-24 text-yellow-500/20 mx-auto" />
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                        COMING <span className="text-yellow-500">SOON</span>
                    </h1>
                    <p className="text-white/40 text-lg">
                        The AAROH 2026 Scoreboard will be live once the events begin. Stay tuned for real-time updates!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-['Outfit'] overflow-hidden relative">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/20 via-slate-950 to-slate-950 pointer-events-none" />
            <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
                {/* Header */}
                <div className="text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-sm">
                        <Activity className="h-3 w-3" /> Live Standings
                    </div>
                    <div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-4">
                            SCORE<span className="text-yellow-500">BOARD</span>
                        </h1>
                        <p className="text-xl text-white/40 max-w-2xl mx-auto font-light">
                            Real-time updates of AAROH 2026 Championship Points
                        </p>
                    </div>
                </div>

                {/* Leaderboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {scores.map((score, index) => {
                        const latestWin = getLatestWin(score.year);
                        const isLeader = index === 0;

                        return (
                            <Card
                                key={score.year}
                                onClick={() => setSelectedYear(score.year)}
                                className={`
                                    relative overflow-hidden border-0 bg-slate-900/40 backdrop-blur-xl transition-all duration-300 group cursor-pointer
                                    ${isLeader
                                        ? 'ring-1 ring-yellow-500/20 shadow-[0_0_30px_-10px_rgba(234,179,8,0.2)]'
                                        : 'hover:bg-slate-900/60 ring-1 ring-white/5 hover:ring-white/10'
                                    }
                                `}
                            >
                                {/* Rank Watermark */}
                                <div className={`absolute -top-6 -right-6 text-[120px] font-black leading-none select-none transition-opacity duration-500 ${isLeader ? 'text-yellow-500/5' : 'text-white/5 group-hover:text-white/10'}`}>
                                    {index + 1}
                                </div>

                                <CardContent className="p-0 flex flex-col h-full relative z-10">
                                    {/* Card Header & Points */}
                                    <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="space-y-1">
                                            <div className={`text-xs font-bold tracking-[0.2em] uppercase ${isLeader ? 'text-yellow-500' : 'text-slate-400'}`}>
                                                {getYearLabel(score.year)}
                                            </div>
                                            {isLeader && (
                                                <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-0 text-[10px] font-bold px-2 py-0.5 h-auto">
                                                    LEADING
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <div className={`text-7xl font-black tracking-tighter tabular-nums ${isLeader ? 'text-white drop-shadow-lg' : 'text-white/80'}`}>
                                                {score.total_points}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-1">
                                                Points
                                            </div>
                                        </div>
                                    </div>

                                    {/* Latest Win Footer */}
                                    {latestWin && (
                                        <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex items-center justify-between group-hover:bg-black/30 transition-colors">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <TrendingUp className={`h-3.5 w-3.5 flex-shrink-0 ${isLeader ? 'text-yellow-500' : 'text-slate-500'}`} />
                                                <span className="text-xs font-medium text-slate-300 truncate">
                                                    {latestWin.registration.event.name}
                                                </span>
                                            </div>
                                            <span className={`text-xs font-bold px-1.5 rounded ml-2 flex-shrink-0 ${latestWin.position === 'first' ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-400 bg-white/5'}`}>
                                                +{latestWin.points}
                                            </span>
                                        </div>
                                    )}

                                    {!latestWin && (
                                        <div className="px-6 py-4 bg-black/20 border-t border-white/5 text-center">
                                            <span className="text-xs text-slate-600 font-medium">No wins yet</span>
                                        </div>
                                    )}

                                    {/* Hover Chevron */}
                                    <div className="absolute top-4 right-4 text-white/20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                </CardContent>

                                {/* Active Selection Border Effect */}
                                <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 rounded-xl transition-all duration-300 pointer-events-none" />
                            </Card>
                        );
                    })}
                </div>

                {/* League Table Section */}
                <div className="max-w-5xl mx-auto w-full pt-12 pb-20">
                    <div className="flex items-center gap-3 mb-8 justify-center">
                        <ListOrdered className="h-6 w-6 text-yellow-500" />
                        <h2 className="text-2xl font-bold text-white tracking-tight">League Table</h2>
                    </div>

                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="hover:bg-white/5 border-white/10">
                                    <TableHead className="w-[80px] text-center text-white/50 font-bold uppercase tracking-wider text-xs">Pos</TableHead>
                                    <TableHead className="text-white/50 font-bold uppercase tracking-wider text-xs">Team</TableHead>
                                    <TableHead className="text-center text-white/50 font-bold uppercase tracking-wider text-xs" title="Played">P</TableHead>
                                    <TableHead className="text-center text-yellow-500 font-bold text-xs" title="First Place">🥇</TableHead>
                                    <TableHead className="text-center text-gray-400 font-bold text-xs" title="Second Place">🥈</TableHead>
                                    <TableHead className="text-center text-orange-400 font-bold text-xs" title="Third Place">🥉</TableHead>
                                    <TableHead className="text-center text-red-500 font-bold text-xs" title="Penalties/DNA">DNA</TableHead>
                                    <TableHead className="text-right text-white font-black uppercase tracking-wider text-xs pr-8">PTS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leagueStats.map((stat, index) => (
                                    <TableRow
                                        key={stat.year}
                                        className="border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedYear(stat.year)}
                                    >
                                        <TableCell className="text-center font-bold text-white/50 group-hover:text-white transition-colors">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell className="font-bold text-lg text-white group-hover:text-yellow-400 transition-colors capitalize">
                                            <div className="flex items-center gap-3">
                                                {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                                {stat.year} Year
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center text-white/70 font-mono">{stat.played}</TableCell>
                                        <TableCell className="text-center text-white/70 font-mono">{stat.won}</TableCell>
                                        <TableCell className="text-center text-white/70 font-mono">{stat.second}</TableCell>
                                        <TableCell className="text-center text-white/70 font-mono">{stat.third}</TableCell>
                                        <TableCell className="text-center text-red-400 font-mono font-bold">{stat.dna}</TableCell>
                                        <TableCell className="text-right pr-8">
                                            <Badge className={`text-lg px-3 py-1 font-black border-0 ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}>
                                                {stat.points}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* Year Details Dialog */}
            <Dialog open={!!selectedYear} onOpenChange={() => setSelectedYear(null)}>
                <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                            <span className="text-yellow-500">{selectedYear && getYearLabel(selectedYear)}</span>
                            <span className="text-white/40 font-light">Detailed History</span>
                        </DialogTitle>
                        <DialogDescription className="text-white/50">
                            Breakdown of played events, wins, and penalties.
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="h-[60vh] pr-4 mt-4">
                        <div className="space-y-3">
                            {selectedYear && getYearResults(selectedYear).map((result) => (
                                <div
                                    key={result.id}
                                    className={`border rounded-lg p-4 flex items-center justify-between ${result.points < 0
                                        ? 'bg-red-500/5 border-red-500/20'
                                        : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center border font-bold ${result.points < 0 ? 'text-red-500 border-red-500/20 bg-red-500/10' : getPositionColor(result.position)
                                            }`}>
                                            {result.points < 0 ? 'DNA' : (
                                                <>
                                                    {result.position === 'first' && '1'}
                                                    {result.position === 'second' && '2'}
                                                    {result.position === 'third' && '3'}
                                                    {result.position === 'none' && '-'}
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-white">
                                                {result.registration?.event?.name}
                                            </div>
                                            <div className="text-xs text-white/40">
                                                {result.registration?.student?.name} • {new Date(result.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge className={`border-0 font-bold ${result.points < 0
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                            : 'bg-white/10 text-white'
                                            }`}>
                                            {result.points > 0 ? '+' : ''}{result.points} PTS
                                        </Badge>
                                    </div>
                                </div>
                            ))}

                            {selectedYear && getYearResults(selectedYear).length === 0 && (
                                <div className="text-center py-10 text-white/30">
                                    No activity recorded yet for this year.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
