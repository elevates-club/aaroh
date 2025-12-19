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
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Registrations
              </CardTitle>
              <CardDescription className="text-sm">
                {stats.totalRegistrations} total, {stats.approvedRegistrations} approved
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              {registrations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStudentDetails(!showStudentDetails)}
                  className="h-8 w-8 p-0"
                  title="View student details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modern Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border">
              <div className="text-2xl font-bold text-primary">{stats.totalRegistrations}</div>
              <div className="text-xs text-muted-foreground font-medium">Total</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{stats.approvedRegistrations}</div>
              <div className="text-xs text-muted-foreground font-medium">Approved</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/10 rounded-lg border">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingRegistrations}</div>
              <div className="text-xs text-muted-foreground font-medium">Pending</div>
            </div>
          </div>

          {/* Enhanced Capacity Progress */}
          {maxParticipants && occupancyPercentage !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Event Capacity</span>
                <span className="font-bold text-primary">{stats.approvedRegistrations}/{maxParticipants}</span>
              </div>
              <Progress
                value={occupancyPercentage}
                className="h-2"
              />
              <div className="text-xs text-muted-foreground text-center">
                {occupancyPercentage}% filled
              </div>
            </div>
          )}

          {/* Year Breakdown (Admin only) */}
          {hasRole(activeRole, USER_ROLES.ADMIN) && Object.keys(stats.yearBreakdown).length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Year Breakdown</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.yearBreakdown).map(([year, count]) => (
                  <Badge key={year} variant="outline" className="text-xs px-2 py-1">
                    {year.charAt(0).toUpperCase() + year.slice(1)}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {registrations.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No registrations yet</p>
            </div>
          )}
        </CardContent>

        {/* Add Student Dialog */}
        {showAddDialog && event && (
          <StudentRegistrationDialog
            event={event}
            onRegistrationComplete={handleRegistrationComplete}
            onCancel={() => setShowAddDialog(false)}
          />
        )}
      </Card>

      {/* Student Details Modal */}
      {showStudentDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Registered Students</CardTitle>
                <CardDescription>
                  {registrations.length} student{registrations.length !== 1 ? 's' : ''} registered for this event
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStudentDetails(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {registrations.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {registrations.map((registration) => (
                    <Card key={registration.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm truncate">{registration.student_name}</h3>
                            <p className="text-xs text-muted-foreground font-mono">{registration.roll_number}</p>
                          </div>
                          <Badge className={`${getStatusColor(registration.status)} text-xs`}>
                            {registration.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{registration.department}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>Registered: {format(new Date(registration.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRegistration(registration.id, registration.student_name)}
                            disabled={deletingId === registration.id}
                            className="h-7 px-2 text-xs"
                          >
                            {deletingId === registration.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No students registered yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
