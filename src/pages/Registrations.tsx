import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Download, Users, Palette, Calendar, Trash2, Loader2, MapPin, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { logRegistrationActivity, logEventActivity } from '@/utils/activityLogger';
import { RegistrationLimitBadge } from '@/components/ui/registration-limit-badge';
import { fetchRegistrationLimits } from '@/lib/registration-limits';

interface Registration {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  student: {
    id: string;
    name: string;
    roll_number: string;
    department: string;
    year: string;
  };
  event: {
    id: string;
    name: string;
    category: 'on_stage' | 'off_stage';
    venue: string;
    event_date: string | null;
  };
}

export default function Registrations() {
  const { profile } = useAuth();
  const { activeRole } = useRole();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'students' | 'on_stage' | 'off_stage'>('students');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null); // Added back
  const [registrationLimits, setRegistrationLimits] = useState({ maxOnStageRegistrations: 0, maxOffStageRegistrations: 0 });
  const [studentRegistrationCounts, setStudentRegistrationCounts] = useState<Record<string, { onStage: number; offStage: number }>>({});

  // Selected Student for Detail View
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistrations();
  }, [profile]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('registrations')
        .select(`
          id,
          status,
          created_at,
          student:students!inner(
            id,
            name,
            roll_number,
            department,
            year
          ),
          event:events!inner(
            id,
            name,
            category,
            venue,
            event_date
          )
        `);

      // Role-based filtering
      if (!hasRole(activeRole, USER_ROLES.ADMIN) && !hasRole(activeRole, USER_ROLES.EVENT_MANAGER)) {
        const year = getCoordinatorYear(activeRole);
        if (year) {
          query = query.eq('student.year', year);
        } else {
          console.warn("Coordinator role detected but no year found. Aborting fetch.");
          setRegistrations([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);

      if (hasRole(activeRole, USER_ROLES.ADMIN) || hasRole(activeRole, USER_ROLES.EVENT_MANAGER) || getCoordinatorYear(activeRole)) {
        await Promise.all([
          fetchRegistrationLimitsData(),
          fetchStudentRegistrationCounts(data || [])
        ]);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch registrations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationLimitsData = async () => {
    try {
      const limits = await fetchRegistrationLimits();
      setRegistrationLimits({
        maxOnStageRegistrations: limits.maxOnStageRegistrations,
        maxOffStageRegistrations: limits.maxOffStageRegistrations
      });
    } catch (error) {
      console.error('Error fetching registration limits:', error);
    }
  };

  const fetchStudentRegistrationCounts = async (registrations: Registration[]) => {
    try {
      const studentIds = [...new Set(registrations.map(r => r.student.id))];

      if (studentIds.length === 0) return;

      const { data, error } = await supabase
        .from('registrations')
        .select(`
          student_id,
          event:events!inner(category)
        `)
        .in('student_id', studentIds)
        .in('status', ['pending', 'approved']);

      if (error) throw error;

      const counts: Record<string, { onStage: number; offStage: number }> = {};

      studentIds.forEach(studentId => {
        counts[studentId] = { onStage: 0, offStage: 0 };
      });

      (data as any[]).forEach(reg => {
        if (counts[reg.student_id]) {
          if (reg.event.category === 'on_stage') {
            counts[reg.student_id].onStage++;
          } else {
            counts[reg.student_id].offStage++;
          }
        }
      });

      setStudentRegistrationCounts(counts);
    } catch (error) {
      console.error('Error fetching student registration counts:', error);
    }
  };

  const updateRegistrationStatus = async (registrationId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', registrationId);

      if (error) throw error;

      // Log activity
      if (profile?.id) {
        await logRegistrationActivity(
          profile.id,
          'registration_status_updated',
          {
            registration_id: registrationId,
            new_status: newStatus,
            registration_data: { id: registrationId, status: newStatus }
          }
        );
      }

      toast({
        title: 'Success',
        description: `Registration ${newStatus} successfully`,
      });

      fetchRegistrations(); // Refresh the list
    } catch (error) {
      console.error('Error updating registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to update registration status',
        variant: 'destructive',
      });
    }
  };

  const deleteRegistration = async (registrationId: string, studentName: string, eventName: string) => {
    try {
      setDeletingId(registrationId);
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: 'Registration Removed',
        description: `${studentName} has been removed from ${eventName}`,
      });

      if (profile?.id) {
        await logRegistrationActivity(profile.id, 'registration_deleted', {
          registration_id: registrationId,
          student_name: studentName,
          event_name: eventName
        });
      }

      fetchRegistrations();
    } catch (error) {
      console.error('Error deleting registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove registration',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Group registrations by view mode
  const getGroupedData = () => {
    const filtered = registrations.filter(reg => {
      const matchesSearch =
        reg.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.event.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
      const matchesViewMode = viewMode === 'students' || reg.event.category === viewMode;

      return matchesSearch && matchesStatus && matchesViewMode;
    });

    if (viewMode === 'students') {
      const studentGroups: Record<string, Registration[]> = {};
      filtered.forEach(reg => {
        const key = reg.student.id;
        if (!studentGroups[key]) studentGroups[key] = [];
        studentGroups[key].push(reg);
      });
      return studentGroups;
    } else {
      const eventGroups: Record<string, Registration[]> = {};
      filtered.forEach(reg => {
        const key = reg.event.id;
        if (!eventGroups[key]) eventGroups[key] = [];
        eventGroups[key].push(reg);
      });
      return eventGroups;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50';
      case 'rejected': return 'bg-red-500/10 text-red-600 border-red-200/50';
      default: return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
    }
  };

  const getCategoryColor = (category: string) => {
    return category === 'on_stage' ? 'bg-purple-500/10 text-purple-600 border-purple-200/50' :
      'bg-amber-500/10 text-amber-600 border-amber-200/50';
  };

  const groupedData = getGroupedData();
  const selectedStudentRegistrations = selectedStudentId && groupedData[selectedStudentId] ? groupedData[selectedStudentId] : [];

  return (
    <div className="min-h-screen bg-background p-2 sm:p-6 lg:p-8 space-y-3 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#0a0a0a] border border-[#facc15]/20 p-3.5 sm:p-6 lg:p-8 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-[#facc15]/5 to-transparent"></div>
        <div className="relative z-10">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 text-white">
            {(hasRole(activeRole, USER_ROLES.ADMIN) || hasRole(activeRole, USER_ROLES.EVENT_MANAGER)) ? (
              <><span className="text-[#facc15]">All</span> Registrations</>
            ) : (
              <>Registration <span className="text-[#facc15]">Details</span></>
            )}
          </h1>
          <p className="text-gray-300 text-[11px] sm:text-base opacity-80">Manage event registrations</p>
        </div>
      </div>

      {/* Controls */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-3 sm:p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center">
            <div className="flex bg-muted p-1 rounded-lg overflow-x-auto no-scrollbar flex-nowrap [&>button]:shrink-0 gap-1">
              <Button
                variant={viewMode === 'students' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('students')}
                className="flex-1 px-2 text-[11px] sm:text-sm h-8"
              >
                <Users className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> Students
              </Button>
              <Button
                variant={viewMode === 'on_stage' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('on_stage')}
                className="flex-1 px-2 text-[11px] sm:text-sm h-8"
              >
                <Palette className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> On-Stage
              </Button>
              <Button
                variant={viewMode === 'off_stage' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('off_stage')}
                className="flex-1 px-2 text-[11px] sm:text-sm h-8"
              >
                <Palette className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> Off-Stage
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : Object.keys(groupedData).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
          <FileText className="h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No registrations found</h3>
          <p>Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(groupedData).map(([key, regs]) => {
            if (viewMode === 'students') {
              const student = regs[0].student;
              const pendingCount = regs.filter(r => r.status === 'pending').length;
              const approvedCount = regs.filter(r => r.status === 'approved').length;

              const hasPending = pendingCount > 0;
              const allApproved = approvedCount === regs.length && regs.length > 0;

              // Theme-aware colors
              const cardBorder = hasPending ? 'border-amber-500/50 dark:border-amber-500/20' : (allApproved ? 'border-emerald-500/50 dark:border-emerald-500/20' : 'border-border dark:border-white/10');
              const glowEffect = hasPending ? 'shadow-amber-500/10 dark:shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]' : (allApproved ? 'shadow-emerald-500/10 dark:shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]' : 'shadow-sm');

              return (
                <div
                  key={key}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`
                                    group relative overflow-hidden rounded-xl border ${cardBorder}
                                    bg-white dark:bg-black/40 backdrop-blur-sm
                                    transition-all duration-500 hover:scale-[1.02] cursor-pointer shadow-md ${glowEffect}
                                    hover:border-amber-500/50 dark:hover:border-yellow-500/30
                                    hover:shadow-lg dark:hover:shadow-[0_0_20px_-5px_rgba(234,179,8,0.1)]
                                `}
                >
                  {/* Cinematic Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:dark:opacity-100 transition-opacity duration-500" />

                  {/* Light Mode Gradient - Subtle Warmth on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent opacity-0 group-hover:opacity-100 dark:hidden transition-opacity duration-500" />
                  <div className="p-4 sm:p-5 relative z-10 flex flex-col gap-3 sm:gap-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="font-bold text-base sm:text-lg leading-tight tracking-tight text-white group-hover:text-yellow-400 transition-colors break-words">
                          {student.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="text-[10px] sm:text-xs font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-gray-300">{student.roll_number}</span>
                          <span className="hidden xs:inline text-white/20 text-[10px]">•</span>
                          <span className="truncate max-w-[100px] text-[10px] sm:text-xs text-gray-400 font-medium">{student.department ?? 'No Dept'}</span>
                        </div>
                      </div>
                      <div className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-yellow-500/10 group-hover:text-yellow-500 group-hover:border-yellow-500/20 transition-all duration-300">
                        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border dark:border-white/5">
                      <div className="flex items-center gap-2">
                        {hasPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] sm:text-[10px] uppercase tracking-wider font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_-4px_rgba(245,158,11,0.5)]">
                            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {pendingCount} Pending
                          </span>
                        ) : allApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] sm:text-[10px] uppercase tracking-wider font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_10px_-4px_rgba(16,185,129,0.5)]">
                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
                            All Checked
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground dark:text-gray-500 uppercase tracking-widest group-hover:text-foreground dark:group-hover:text-gray-300 transition-colors">
                        {regs.length} EVENTS
                      </span>
                    </div>
                  </div>
                </div>
              );
            } else {
              const event = regs[0].event;
              return (
                <div
                  key={key}
                  className="group relative overflow-hidden rounded-xl border border-border dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-border dark:border-white/5 bg-muted/30 dark:bg-white/5 flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg leading-tight text-gray-900 dark:text-white">
                        {event.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${event.category === 'on_stage'
                          ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                          : 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
                          }`}>
                          {event.category.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {regs.length}
                        </span>
                      </div>
                    </div>

                    {/* PDF Download Action */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          setPdfDownloadingId(event.id);
                          const { generateEventParticipantsPDF } = await import('@/utils/pdfGeneratorV2');
                          await generateEventParticipantsPDF(event as any, activeRole);
                          if (profile?.id) {
                            await logEventActivity(profile.id, 'event_updated', {
                              event_id: event.id,
                              event_name: event.name,
                              action_detail: 'Downloaded participants list PDF from registrations page'
                            });
                          }
                          toast({
                            title: 'PDF Downloaded',
                            description: `Participants list for ${event.name} has been downloaded.`,
                          });
                        } catch (error) {
                          console.error('Error downloading PDF:', error);
                          toast({
                            title: 'Error',
                            description: 'Failed to generate PDF. Please try again.',
                            variant: 'destructive',
                          });
                        } finally {
                          setPdfDownloadingId(null);
                        }
                      }}
                      disabled={pdfDownloadingId === event.id}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      {pdfDownloadingId === event.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Content List */}
                  <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    {regs.map((registration) => {
                      // Use registeringId as the tracker for which row is expanded to show actions
                      const showActions = registeringId === registration.id;

                      return (
                        <div
                          key={registration.id}
                          onClick={() => setRegisteringId(showActions ? null : registration.id)}
                          className={`
                                    flex flex-col gap-3 p-3 rounded-lg border border-border/50 dark:border-white/5 bg-card/50 hover:bg-muted/50 dark:hover:bg-white/5 transition-all cursor-pointer
                                    ${showActions ? 'bg-muted/50 dark:bg-white/10 border-amber-500/30' : ''}
                                `}
                        >
                          <div className="flex sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <div className={`w-0.5 sm:w-1 h-8 shrink-0 rounded-full transition-colors ${registration.status === 'pending' ? 'bg-amber-500' : (registration.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500')
                                }`} />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs sm:text-sm text-foreground break-words leading-tight pr-1 sm:pr-2">{registration.student.name}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono mt-0.5">{registration.student.roll_number}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 justify-end shrink-0">
                              {/* Status Badge */}
                              <span className={`text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${registration.status === 'pending'
                                  ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-500/20'
                                  : (registration.status === 'approved'
                                    ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 border-emerald-200 dark:border-emerald-500/20'
                                    : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-500 border-red-200 dark:border-red-500/20')
                                }`}>
                                {registration.status}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Actions Area */}
                          {showActions && (hasRole(activeRole, USER_ROLES.ADMIN) || hasRole(activeRole, USER_ROLES.EVENT_MANAGER) || getCoordinatorYear(activeRole)) && (
                            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50 dark:border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                              {registration.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm grow sm:grow-0"
                                    onClick={(e) => { e.stopPropagation(); updateRegistrationStatus(registration.id, 'approved'); }}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1.5" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 px-2 text-xs shadow-sm grow sm:grow-0"
                                    onClick={(e) => { e.stopPropagation(); updateRegistrationStatus(registration.id, 'rejected'); }}
                                  >
                                    <XCircle className="h-3 w-3 mr-1.5" /> Reject
                                  </Button>
                                </>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-dashed grow sm:grow-0"
                                    disabled={deletingId === registration.id}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {deletingId === registration.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3 mr-1" />
                                    )}
                                    Remove
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Registration?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove <strong>{registration.student.name}</strong> from <strong>{event.name}</strong>?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteRegistration(registration.id, registration.student.name, event.name);
                                      }}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Confirm
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudentId} onOpenChange={(open) => !open && setSelectedStudentId(null)}>
        <DialogContent className="max-w-3xl max-h-[95vh] w-[95vw] sm:w-full overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {selectedStudentRegistrations[0]?.student.name}
              <Badge variant="outline" className="text-sm font-normal text-muted-foreground ml-2">
                {selectedStudentRegistrations[0]?.student.roll_number}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Managing registrations for {selectedStudentRegistrations[0]?.student.department} - {selectedStudentRegistrations[0]?.student.year} Year
            </DialogDescription>
          </DialogHeader>

          {/* Limits Badges */}
          {selectedStudentId && (
            <div className="flex flex-wrap gap-3 py-2 border-b">
              <RegistrationLimitBadge
                currentCount={studentRegistrationCounts[selectedStudentId]?.onStage || 0}
                limit={registrationLimits.maxOnStageRegistrations}
                eventType="on_stage"
                showIcon={true}
              />
              <RegistrationLimitBadge
                currentCount={studentRegistrationCounts[selectedStudentId]?.offStage || 0}
                limit={registrationLimits.maxOffStageRegistrations}
                eventType="off_stage"
                showIcon={true}
              />
            </div>
          )}

          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-4 pt-4">
              {selectedStudentRegistrations.map((registration) => (
                <div key={registration.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{registration.event.name}</h4>
                        <Badge className={`${getCategoryColor(registration.event.category)} text-[10px]`}>
                          {registration.event.category === 'on_stage' ? 'On-Stage' : 'Off-Stage'}
                        </Badge>
                        <Badge className={`${getStatusColor(registration.status)} text-[10px]`}>
                          {registration.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex gap-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {registration.event.venue}
                        </div>
                        {registration.event.event_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {format(new Date(registration.event.event_date), 'MMM dd')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {registration.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                            onClick={() => updateRegistrationStatus(registration.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            onClick={() => updateRegistrationStatus(registration.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Registration?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this registration?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteRegistration(registration.id, registration.student.name, registration.event.name)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
