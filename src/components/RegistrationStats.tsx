import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Palette, Edit, Trash2, Loader2, UserPlus, Eye, X, Calendar, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { StudentRegistrationDialog } from '@/components/forms/StudentRegistrationDialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RegistrationStatsProps {
  eventId: string;
  maxParticipants?: number | null;
  className?: string;
  event?: {
    id: string;
    name: string;
    category: 'on_stage' | 'off_stage';
    registration_deadline: string | null;
    description: string;
    max_participants: number | null;
    event_date: string | null;
    venue: string;
  };
  onRegistrationUpdate?: () => void;
}

interface RegistrationData {
  totalRegistrations: number;
  pendingRegistrations: number;
  approvedRegistrations: number;
  rejectedRegistrations: number;
  yearBreakdown: Record<string, number>;
}

interface StudentRegistration {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  department: string;
  year: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function RegistrationStats({ eventId, maxParticipants, className, event, onRegistrationUpdate }: RegistrationStatsProps) {
  const { profile } = useAuth();
  const { activeRole } = useRole();
  const [stats, setStats] = useState<RegistrationData>({
    totalRegistrations: 0,
    pendingRegistrations: 0,
    approvedRegistrations: 0,
    rejectedRegistrations: 0,
    yearBreakdown: {},
  });
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStudentDetails, setShowStudentDetails] = useState(false);

  useEffect(() => {
    fetchRegistrationStats();
  }, [eventId, profile]);

  const fetchRegistrationStats = async () => {
    try {
      setLoading(true);

      // Enhanced query to get detailed registration data
      let query = supabase
        .from('registrations')
        .select(`
          id,
          student_id,
          status,
          created_at,
          student:students!inner(
            id,
            name,
            roll_number,
            department,
            year
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      // Filter by coordinator's year if not admin
      if (!hasRole(activeRole, USER_ROLES.ADMIN)) {
        const year = getCoordinatorYear(activeRole);
        if (year) {
          query = query.eq('student.year', year);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process the data
      const registrationData = data || [];
      const yearBreakdown: Record<string, number> = {};

      let pending = 0, approved = 0, rejected = 0;

      // Transform data for detailed view
      const transformedRegistrations: StudentRegistration[] = registrationData.map(reg => ({
        id: reg.id,
        student_id: reg.student_id,
        student_name: reg.student.name,
        roll_number: reg.student.roll_number,
        department: reg.student.department,
        year: reg.student.year,
        status: reg.status as 'pending' | 'approved' | 'rejected',
        created_at: reg.created_at,
      }));

      registrationData.forEach(reg => {
        // Count by status
        switch (reg.status) {
          case 'pending':
            pending++;
            break;
          case 'approved':
            approved++;
            break;
          case 'rejected':
            rejected++;
            break;
        }

        // Count by year (only for admin view)
        if (hasRole(activeRole, USER_ROLES.ADMIN) && reg.student?.year) {
          const year = reg.student.year;
          yearBreakdown[year] = (yearBreakdown[year] || 0) + 1;
        }
      });

      setRegistrations(transformedRegistrations);
      setStats({
        totalRegistrations: registrationData.length,
        pendingRegistrations: pending,
        approvedRegistrations: approved,
        rejectedRegistrations: rejected,
        yearBreakdown,
      });
    } catch (error) {
      console.error('Error fetching registration stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyPercentage = () => {
    if (!maxParticipants) return null;
    return Math.round((stats.approvedRegistrations / maxParticipants) * 100);
  };

  const occupancyPercentage = getOccupancyPercentage();

  const handleDeleteRegistration = async (registrationId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this event?`)) {
      return;
    }

    try {
      setDeletingId(registrationId);
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      toast({
        title: 'Registration Removed',
        description: `${studentName} has been removed from the event.`,
      });

      // Refresh data
      await fetchRegistrationStats();
      onRegistrationUpdate?.();
    } catch (error) {
      console.error('Error deleting registration:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove registration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegistrationComplete = () => {
    fetchRegistrationStats();
    onRegistrationUpdate?.();
    setShowAddDialog(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const isRegistrationOpen = (deadline: string | null) => {
    if (!deadline) return true;
    return new Date(deadline) > new Date();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
            <div className="h-2 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="animate-pulse space-y-2">
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-2 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Registrations
            </h4>
            <p className="text-xs text-muted-foreground">
              {stats.totalRegistrations} total • {stats.approvedRegistrations} approved
            </p>
          </div>
          {registrations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStudentDetails(!showStudentDetails)}
              className="h-8 w-8 hover:bg-muted"
              title="View student details"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center p-3 bg-muted/30 rounded-xl border border-border/50">
            <span className="text-2xl font-bold text-foreground">{stats.totalRegistrations}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-1">Total</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
            <span className="text-2xl font-bold text-emerald-600">{stats.approvedRegistrations}</span>
            <span className="text-[10px] uppercase tracking-wider text-emerald-600/80 font-medium mt-1">Approved</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
            <span className="text-2xl font-bold text-amber-600">{stats.pendingRegistrations}</span>
            <span className="text-[10px] uppercase tracking-wider text-amber-600/80 font-medium mt-1">Pending</span>
          </div>
        </div>

        {/* Capacity Progress */}
        {maxParticipants && occupancyPercentage !== null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Capacity</span>
              <span className="text-primary font-bold">{occupancyPercentage}%</span>
            </div>
            <Progress value={occupancyPercentage} className="h-1.5 bg-muted" />
          </div>
        )}

        {/* Year Breakdown (Admin only) */}
        {hasRole(activeRole, USER_ROLES.ADMIN) && Object.keys(stats.yearBreakdown).length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-medium text-muted-foreground mr-1">Years:</span>
              {Object.entries(stats.yearBreakdown).map(([year, count]) => (
                <div key={year} className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md border border-border/50">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">{year}</span>
                  <span className="text-xs font-bold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {registrations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/50">
            <Users className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs">No registrations yet</p>
          </div>
        )}

        {/* Add Student Dialog */}
        {showAddDialog && event && (
          <StudentRegistrationDialog
            event={event}
            onRegistrationComplete={handleRegistrationComplete}
            onCancel={() => setShowAddDialog(false)}
          />
        )}
      </div>

      {/* Student Details Modal - Kept same logic but cleaner styles if needed */}
      {showStudentDetails && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
              <div>
                <h3 className="text-xl font-bold">Registered Students</h3>
                <p className="text-sm text-muted-foreground">
                  {registrations.length} student{registrations.length !== 1 ? 's' : ''} registered for {event?.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowStudentDetails(false)}
                className="h-8 w-8 rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto">
              {registrations.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {registrations.map((registration) => (
                    <div key={registration.id} className="group relative bg-card hover:bg-muted/30 border border-border rounded-xl p-4 transition-all duration-200 hover:shadow-md">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm truncate text-foreground">{registration.student_name}</h4>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{registration.roll_number}</p>
                        </div>
                        <Badge className={`${getStatusColor(registration.status)} text-[10px] px-1.5 py-0.5 h-5`}>
                          {registration.status}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
                          <span className="truncate">{registration.department}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
                          <span>{format(new Date(registration.created_at), 'MMM dd')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRegistration(registration.id, registration.student_name)}
                          disabled={deletingId === registration.id}
                          className="h-7 px-2 text-xs hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                        >
                          {deletingId === registration.id ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">No students registered yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
