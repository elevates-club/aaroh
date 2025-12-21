import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Search, User, Clock, FileText, Globe, Monitor, Smartphone, Tablet, MapPin, ChevronLeft, ChevronRight, Filter, Download, RefreshCw, Eye, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  user: {
    id: string;
    full_name: string;
    role: string | string[];
  } | null;
}

export default function ActivityLogs() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const logsPerPage = 10;

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchLogs();
  }, [profile, currentPage, actionFilter, searchTerm]); // Added searchTerm to dependency array for automatic fetching or keep manual? 
  // Actually, keeping original logic: useEffect triggers fetchLogs when dependencies change.
  // But wait, in the original code, fetchLogs uses searchTerm state.
  // The original fetchLogs call was in useEffect dependent on [profile, currentPage, actionFilter].
  // If we want search to trigger fetch, we should add searchTerm to useEffect dep array.

  useEffect(() => {
    // Debounce search could be better but for now let's just let the effect run
    const timer = setTimeout(() => {
      fetchLogs();
    }, 500);
    return () => clearTimeout(timer);
  }, [profile, currentPage, actionFilter, searchTerm]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      if (!profile) {
        setLoading(false);
        return;
      }

      const offset = (currentPage - 1) * logsPerPage;

      let query = supabase
        .from('activity_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          ip_address,
          user_agent,
          user:profiles(
            id,
            full_name,
            role
          )
        `, { count: 'exact' });

      if (profile.role &&
        !hasRole(profile.role, USER_ROLES.ADMIN) &&
        !hasRole(profile.role, USER_ROLES.EVENT_MANAGER) &&
        profile.id) {
        query = query.eq('user_id', profile.id);
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,details::text.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + logsPerPage - 1);

      if (error) throw error;

      setLogs(data || []);
      setTotalLogs(count || 0);
      setTotalPages(Math.ceil((count || 0) / logsPerPage));
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch activity logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const handleExportCSV = () => {
    try {
      if (!logs.length) return;

      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Description', 'IP Address', 'Details'];
      const csvData = logs.map(log => {
        const timestamp = format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss');
        const user = log.user?.full_name || 'N/A';
        const role = Array.isArray(log.user?.role) ? log.user?.role.join(', ') : log.user?.role || 'N/A';
        const action = log.action;
        const description = formatActionDescription(log);
        const ip = log.ip_address || 'N/A';
        const details = JSON.stringify(log.details).replace(/"/g, '""'); // Escape quotes

        return `"${timestamp}","${user}","${role}","${action}","${description}","${ip}","${details}"`;
      });

      const csvContent = [headers.join(','), ...csvData].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      toast({ title: 'Export Failed', variant: 'destructive' });
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50 hover:bg-emerald-500/20';
    if (action.includes('updated')) return 'bg-amber-500/10 text-amber-600 border-amber-200/50 hover:bg-amber-500/20';
    if (action.includes('deleted')) return 'bg-red-500/10 text-red-600 border-red-200/50 hover:bg-red-500/20';
    if (action.includes('registration')) return 'bg-purple-500/10 text-purple-600 border-purple-200/50 hover:bg-purple-500/20';
    if (action.includes('login')) return 'bg-blue-500/10 text-blue-600 border-blue-200/50 hover:bg-blue-500/20';
    if (action.includes('logout')) return 'bg-slate-500/10 text-slate-600 border-slate-200/50 hover:bg-slate-500/20';
    return 'bg-muted text-muted-foreground border-border/50';
  };

  const formatActionDescription = (log: ActivityLog) => {
    const { action, details } = log;
    switch (action) {
      case 'event_created': return `Created event: ${details?.event_name || 'Unknown'}`;
      case 'event_updated': return `Updated event: ${details?.event_name || 'Unknown'}`;
      case 'event_deleted': return `Deleted event: ${details?.event_name || 'Unknown'}`;
      case 'student_created': return `Added student: ${details?.student_name || 'Unknown'}`;
      case 'student_updated': return `Updated student: ${details?.student_name || 'Unknown'}`;
      case 'student_deleted': return `Deleted student: ${details?.student_name || 'Unknown'}`;
      case 'registration_created': return `New registration for ${details?.event_name || 'event'}`;
      case 'registration_status_updated': return `Status changed to ${details?.new_status}`;
      case 'user_login': return `User logged in`;
      case 'user_logout': return `User logged out`;
      default:
        // Handle "System deleted a request" format or generic formatting
        if (!log.user && action.includes('deleted')) return `System deleted a request`;
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getActionSeverity = (action: string) => {
    if (action.includes('login')) return 'info';
    if (action.includes('logout')) return 'info';
    if (action.includes('created')) return 'success';
    if (action.includes('updated')) return 'warning';
    if (action.includes('deleted')) return 'error';
    return 'default';
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))];

  return (
    <div className="w-full max-w-[100vw] px-4 py-8 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 md:max-w-[1600px] mx-auto text-foreground overflow-x-hidden">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            System Activity Log
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            Complete audit trail of system activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-10 border-border/50 bg-card rounded-xl font-bold text-xs uppercase tracking-wider" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-none bg-card shadow-sm p-4 rounded-[2rem] flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search logs..."
            className="pl-12 h-11 rounded-xl bg-muted border-none font-medium focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/70"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-11 rounded-xl bg-muted border-none font-bold text-xs uppercase tracking-wide">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="user_login">Login</SelectItem>
              <SelectItem value="event_created">Event Created</SelectItem>
              <SelectItem value="event_updated">Event Updated</SelectItem>
              <SelectItem value="student_created">Student Created</SelectItem>
              <SelectItem value="registration_created">Registration</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="h-11 w-11 rounded-xl bg-muted border-none p-0 flex items-center justify-center hover:bg-muted/80"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="border-none bg-card shadow-sm rounded-[2rem] overflow-hidden max-w-full">
        <div className="w-full max-w-[calc(100vw-3rem)] overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground pl-8 py-6">Timestamp</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-6">User</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-6">Action</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-6">Description</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-6">IP Address</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground pr-8 py-6 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading Skeleton
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i} className="border-border/50">
                    <TableCell colSpan={6} className="py-6 px-8">
                      <div className="h-6 bg-muted rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                // Empty State
                <TableRow className="border-none">
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                      <Activity className="h-8 w-8 opacity-20" />
                      <p className="font-medium">No activity found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // Data Rows
                logs.map((log) => (
                  <TableRow key={log.id} className="border-border/50 hover:bg-muted/30 transition-colors group">
                    <TableCell className="pl-8 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'MM/dd/yyyy, h:mm:ss a')}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{log.user ? log.user.full_name : 'System'}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          {log.user ? (Array.isArray(log.user.role) ? log.user.role[0] : (log.user.role || 'ID: ' + log.user.id.substring(0, 6))) : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className={`rounded-md px-2.5 py-0.5 text-[10px] uppercase font-black tracking-widest border-none shadow-none ${getActionColor(log.action)}`}>
                        {log.action.split('_')[1] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 max-w-[300px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground truncate" title={formatActionDescription(log)}>
                          {formatActionDescription(log)}
                        </span>
                        {log.details?.event_type && <span className="text-xs text-muted-foreground">{log.details.event_type}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-xs font-mono text-muted-foreground">
                      {log.ip_address || 'N/A'}
                    </TableCell>
                    <TableCell className="pr-8 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-4 border-t border-border/50 bg-muted/20">
            <div className="text-xs font-bold text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 rounded-lg border-border/50 bg-card"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 rounded-lg border-border/50 bg-card"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase">Timestamp</p>
                  <p className="font-mono">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase">User</p>
                  <p className="font-medium">{selectedLog.user?.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase">Action</p>
                  <Badge className={`mt-1 ${getActionColor(selectedLog.action)}`}>{selectedLog.action}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase">IP Address</p>
                  <p className="font-mono">{selectedLog.ip_address || 'N/A'}</p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground">JSON Payload</p>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              {selectedLog.user_agent && (
                <div>
                  <p className="text-muted-foreground text-xs font-bold uppercase">User Agent</p>
                  <p className="text-xs text-muted-foreground break-all">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
