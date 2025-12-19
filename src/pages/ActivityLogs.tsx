import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Activity, Search, User, Clock, FileText, Globe, Monitor, Smartphone, Tablet, MapPin, ChevronLeft, ChevronRight, Filter, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  ip_address?: string;
  mac_address?: string;
  user_agent?: string;
  device_info?: {
    browser?: string;
    os?: string;
    device_type?: string;
  };
  user: {
    id: string;
    full_name: string;
    role: string;
  } | null;
}

export default function ActivityLogs() {
  const { profile } = useAuth();
  const { activeRole } = useRole();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const logsPerPage = 10;

  useEffect(() => {
    fetchLogs();
  }, [profile, currentPage, actionFilter]);

  useEffect(() => {
    // Reset to first page when search term changes
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Don't fetch if profile is not loaded yet
      if (!profile) {
        setLoading(false);
        return;
      }

      // Calculate offset for pagination
      const offset = (currentPage - 1) * logsPerPage;

      let query = supabase
        .from('activity_logs')
        .select(`
          id,
          action,
          details,
          created_at,
          user:profiles(
            id,
            full_name,
            role
          )
        `, { count: 'exact' });

      // Role-based filtering - coordinators only see their own logs
      // Role-based filtering - coordinators only see their own logs
      if (profile.role && !profile.role.includes(USER_ROLES.ADMIN) && profile.id) {
        query = query.eq('user_id', profile.id);
      }

      // Apply action filter
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      // Apply search filter
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleActionFilter = (value: string) => {
    setActionFilter(value);
  };

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (action.includes('updated')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (action.includes('deleted')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    if (action.includes('registration')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    if (action.includes('login')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
    if (action.includes('logout')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('event')) return <FileText className="h-4 w-4" />;
    if (action.includes('registration')) return <User className="h-4 w-4" />;
    if (action.includes('login')) return <User className="h-4 w-4" />;
    if (action.includes('logout')) return <User className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatActionDescription = (log: ActivityLog) => {
    const { action, details } = log;

    switch (action) {
      case 'event_created':
        return `Created ${details?.event_type || 'event'} event: ${details?.event_name || 'Unknown'}`;
      case 'event_updated':
        return `Updated event event: ${details?.event_name || 'Unknown'}`;
      case 'event_deleted':
        return `Deleted event event: ${details?.event_name || 'Unknown'}`;
      case 'student_created':
        return `Added new student: ${details?.student_name || 'Unknown'}`;
      case 'student_updated':
        return `Updated student: ${details?.student_name || 'Unknown'}`;
      case 'student_deleted':
        return `Deleted student: ${details?.student_name || 'Unknown'}`;
      case 'registration_created':
        return `Student registered for events event`;
      case 'registration_updated':
        return `Registration updated`;
      case 'registration_deleted':
        return `Registration deleted`;
      case 'registration_status_updated':
        return `Registration status changed to ${details?.new_status || 'Unknown'}`;
      case 'user_login':
        return `User logged in successfully`;
      case 'user_logout':
        return `User logged out`;
      default:
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-4 sm:p-6 md:p-8 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                  {hasRole(activeRole, USER_ROLES.ADMIN) ? 'Activity Logs' : 'My Activity'}
                </h1>
                <p className="text-white/90 text-sm sm:text-base">
                  {hasRole(activeRole, USER_ROLES.ADMIN)
                    ? 'View all system activities and user actions with login details'
                    : 'View your activity history and login information'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search activities, users, or IP addresses..."
                    className="pl-10 h-10 sm:h-9"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                <Select value={actionFilter} onValueChange={handleActionFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] h-10 sm:h-9">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="user_login">User Login</SelectItem>
                    <SelectItem value="user_logout">User Logout</SelectItem>
                    <SelectItem value="student_created">Student Created</SelectItem>
                    <SelectItem value="student_updated">Student Updated</SelectItem>
                    <SelectItem value="student_deleted">Student Deleted</SelectItem>
                    <SelectItem value="event_created">Event Created</SelectItem>
                    <SelectItem value="event_updated">Event Updated</SelectItem>
                    <SelectItem value="event_deleted">Event Deleted</SelectItem>
                    <SelectItem value="registration_created">Registration Created</SelectItem>
                    <SelectItem value="registration_updated">Registration Updated</SelectItem>
                    <SelectItem value="registration_deleted">Registration Deleted</SelectItem>
                    <SelectItem value="registration_status_updated">Registration Status Updated</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-10 sm:h-9"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Stats */}
              <div className="flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span>Total Logs: {totalLogs.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Showing {((currentPage - 1) * logsPerPage) + 1}-{Math.min(currentPage * logsPerPage, totalLogs)} of {totalLogs}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Logs */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <Activity className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No Activity Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || actionFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No activity logs available yet.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4 sm:p-6">
                  {/* Mobile Card View */}
                  <div className="block sm:hidden">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            {getActionIcon(log.action)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatActionDescription(log)}
                            </p>
                            <Badge className={`${getActionColor(log.action)} text-xs mt-1`}>
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {log.user && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate font-medium">{log.user.full_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {Array.isArray(log.user.role)
                                ? log.user.role.map(r => r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')
                                : log.user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>{format(new Date(log.created_at), 'PPp')}</span>
                        </div>
                        {log.ip_address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-4 w-4 flex-shrink-0" />
                            <span>IP: {log.ip_address}</span>
                          </div>
                        )}
                        {log.device_info && log.device_info.browser && log.device_info.os && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getDeviceIcon(log.device_info.device_type)}
                            <span>{log.device_info.browser} on {log.device_info.os}</span>
                          </div>
                        )}
                        {log.details && log.details.session_id && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Session: {log.details.session_id.substring(0, 8)}...</span>
                          </div>
                        )}
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <details className="cursor-pointer">
                            <summary className="hover:text-foreground">View details</summary>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Card View */}
                  <div className="hidden sm:block">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          {getActionIcon(log.action)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                            {formatActionDescription(log)}
                          </p>
                          <Badge className={getActionColor(log.action)}>
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-muted-foreground">
                          {log.user && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate font-medium">{log.user.full_name}</span>
                              <p className="text-sm font-medium">
                                {Array.isArray(log.user.role)
                                  ? log.user.role.map(r => r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')
                                  : log.user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>{format(new Date(log.created_at), 'PPp')}</span>
                          </div>
                          {log.ip_address && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 flex-shrink-0" />
                              <span>IP: {log.ip_address}</span>
                            </div>
                          )}
                          {log.device_info && log.device_info.browser && log.device_info.os && (
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(log.device_info.device_type)}
                              <span>{log.device_info.browser} on {log.device_info.os}</span>
                            </div>
                          )}
                        </div>

                        {/* Additional Details Row */}
                        {(log.details && (log.details.session_id || log.details.login_method)) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-muted-foreground mt-2 pt-2 border-t">
                            {log.details.session_id && (
                              <div className="flex items-center gap-2">
                                <span>Session: {log.details.session_id.substring(0, 8)}...</span>
                              </div>
                            )}
                            {log.details.login_method && (
                              <div className="flex items-center gap-2">
                                <span>Method: {log.details.login_method}</span>
                              </div>
                            )}
                            {log.details.timestamp && (
                              <div className="flex items-center gap-2">
                                <span>Timestamp: {format(new Date(log.details.timestamp), 'PPp')}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            <details className="cursor-pointer">
                              <summary className="hover:text-foreground">View details</summary>
                              <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({totalLogs} total logs)
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="h-9"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className="h-9 w-9 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="h-9"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
