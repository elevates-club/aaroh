import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Download, Users, Palette, Calendar, Edit, Trash2, Loader2, Building, MapPin, Clock, Eye } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { logRegistrationActivity, logEventActivity } from '@/utils/activityLogger';
import { PDFDownloadButton } from '@/components/PDFDownloadButton';
import { RegistrationLimitBadge } from '@/components/ui/registration-limit-badge';
import { getStudentRegistrationInfo, fetchRegistrationLimits } from '@/lib/registration-limits';

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
  const [viewMode, setViewMode] = useState<'students' | 'on_stage' | 'off_stage'>('students');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);
  const [registrationLimits, setRegistrationLimits] = useState({ maxOnStageRegistrations: 0, maxOffStageRegistrations: 0 });
  const [studentRegistrationCounts, setStudentRegistrationCounts] = useState<Record<string, { onStage: number; offStage: number }>>({});

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
          // STRICT SECURITY: If user is not admin/manager but we can't determine the year,
          // DO NOT fetch all data. Instead, return valid empty set to prevent data leakage.
          console.warn("Coordinator role detected but no year found. Aborting fetch.");
          setRegistrations([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);

      // Fetch registration limits and student counts for admin, event manager, and coordinators
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
      // Group by student
      const studentGroups: Record<string, Registration[]> = {};
      filtered.forEach(reg => {
        const key = reg.student.id;
        if (!studentGroups[key]) {
          studentGroups[key] = [];
        }
        studentGroups[key].push(reg);
      });
      return studentGroups;
    } else {
      // Group by event
      const eventGroups: Record<string, Registration[]> = {};
      filtered.forEach(reg => {
        const key = reg.event.id;
        if (!eventGroups[key]) {
          eventGroups[key] = [];
        }
        eventGroups[key].push(reg);
      });
      return eventGroups;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 border-red-200/50';
      default:
        return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
    }
  };

  const getCategoryColor = (category: string) => {
    return category === 'on_stage' ? 'bg-purple-500/10 text-purple-600 border-purple-200/50' :
      'bg-amber-500/10 text-amber-600 border-amber-200/50';
  };

  const groupedData = getGroupedData();

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-[#facc15]/20 p-6 sm:p-8 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-[#facc15]/5 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-white">
                  {(hasRole(activeRole, USER_ROLES.ADMIN) || hasRole(activeRole, USER_ROLES.EVENT_MANAGER)) ? (
                    <><span className="text-[#facc15]">All</span> Registrations</>
                  ) : (
                    <>Registration <span className="text-[#facc15]">Details</span></>
                  )}
                </h1>
                <p className="text-gray-300 text-sm sm:text-base">
                  Manage event registrations
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              </div>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col sm:flex-row gap-2 flex-1">
                <Button
                  variant={viewMode === 'students' ? 'default' : 'outline'}
                  onClick={() => setViewMode('students')}
                  className="flex-1 sm:flex-none"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Students
                </Button>
                <Button
                  variant={viewMode === 'on_stage' ? 'default' : 'outline'}
                  onClick={() => setViewMode('on_stage')}
                  className="flex-1 sm:flex-none"
                >
                  <Palette className="mr-2 h-4 w-4" />
                  On-Stage
                </Button>
                <Button
                  variant={viewMode === 'off_stage' ? 'default' : 'outline'}
                  onClick={() => setViewMode('off_stage')}
                  className="flex-1 sm:flex-none"
                >
                  <Palette className="mr-2 h-4 w-4" />
                  Off-Stage
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by student name, roll number, or event..."
                    className="pl-10 h-11 bg-card border-border/50 shadow-sm focus:bg-card transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-11 bg-card border-border/50 shadow-sm focus:bg-card transition-colors">
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

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-lg">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.keys(groupedData).length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 sm:p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="p-4 bg-primary/10 rounded-full">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">No Registrations Found</h3>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No events registrations available yet.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(groupedData).map(([key, registrations]) => {
              if (viewMode === 'students') {
                const student = registrations[0].student;
                return (
                  <Card key={key} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 min-w-0 flex-1">
                          <CardTitle className="text-lg font-bold truncate">{student.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono">{student.roll_number}</span>
                            <span>•</span>
                            <span className="truncate">{student.department}</span>
                          </div>
                          {/* Registration Limit Badges for Admin and Coordinator */}
                          {(hasRole(activeRole, USER_ROLES.ADMIN) || hasRole(activeRole, USER_ROLES.EVENT_MANAGER) || getCoordinatorYear(activeRole)) && (
                            <div className="flex gap-2 mt-2">
                              <RegistrationLimitBadge
                                currentCount={studentRegistrationCounts[student.id]?.onStage || 0}
                                limit={registrationLimits.maxOnStageRegistrations}
                                eventType="on_stage"
                                showIcon={true}
                              />
                              <RegistrationLimitBadge
                                currentCount={studentRegistrationCounts[student.id]?.offStage || 0}
                                limit={registrationLimits.maxOffStageRegistrations}
                                eventType="off_stage"
                                showIcon={true}
                              />
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {registrations.length} event{registrations.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {registrations.map((registration) => (
                          <div key={registration.id} className="p-3 bg-muted/50 rounded-lg border">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Palette className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{registration.event.name}</span>
                                <Badge className={`${getCategoryColor(registration.event.category)} text-xs`}>
                                  {registration.event.category === 'on_stage' ? 'On-Stage' : 'Off-Stage'}
                                </Badge>
                              </div>
                              <Badge className={`${getStatusColor(registration.status)} text-xs`}>
                                {registration.status}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{registration.event.venue}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Registered: {format(new Date(registration.created_at), 'MMM dd')}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t">
                              {(hasRole(activeRole, USER_ROLES.ADMIN) || hasRole(activeRole, USER_ROLES.EVENT_MANAGER) || getCoordinatorYear(activeRole)) && registration.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => updateRegistrationStatus(registration.id, 'approved')}
                                    className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateRegistrationStatus(registration.id, 'rejected')}
                                    className="h-7 px-2 text-xs"
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
                                    disabled={deletingId === registration.id}
                                    className="h-7 px-2 text-xs"
                                  >
                                    {deletingId === registration.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Registration?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove <strong>{student.name}</strong> from <strong>{registration.event.name}</strong>? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRegistration(registration.id, student.name, registration.event.name)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remove Registration
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              } else {
                const event = registrations[0].event;
                return (
                  <Card key={key} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 min-w-0 flex-1">
                          <CardTitle className="text-lg font-bold truncate">{event.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getCategoryColor(event.category)} text-xs`}>
                              {event.category === 'on_stage' ? 'On-Stage' : 'Off-Stage'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {registrations.length} participant{registrations.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              setPdfDownloadingId(event.id);
                              // PDF download for this specific event
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
                          className="h-8 w-8 p-0"
                          title="Download participants list"
                        >
                          {pdfDownloadingId === event.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{event.venue}</span>
                        </div>
                        {event.event_date && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Event: {format(new Date(event.event_date), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Participants</div>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {registrations.map((registration) => (
                            <div key={registration.id} className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{registration.student.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{registration.student.roll_number}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`${getStatusColor(registration.status)} text-xs`}>
                                  {registration.status}
                                </Badge>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={deletingId === registration.id}
                                      className="h-6 w-6 p-0"
                                    >
                                      {deletingId === registration.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Registration?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove <strong>{registration.student.name}</strong> from <strong>{event.name}</strong>? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteRegistration(registration.id, registration.student.name, event.name)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remove Registration
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
