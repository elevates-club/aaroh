import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Loader2, Users, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES, ACADEMIC_YEARS } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { toast } from '@/hooks/use-toast';
import { 
  generateAdminAllRegistrationsPDF,
  generateAdminYearWiseRegistrationsPDF,
  generateCoordinatorRegistrationsPDF,
  generateEventWiseRegistrationsPDF,
  type StudentRegistrationData
} from '@/utils/pdfGeneratorV2';

interface PDFDownloadButtonProps {
  variant?: 'button' | 'card' | 'dropdown';
  className?: string;
}

export function PDFDownloadButton({ variant = 'button', className }: PDFDownloadButtonProps) {
  const { profile } = useAuth();
  const { activeRole } = useRole();
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const fetchRegistrationData = async (yearFilter?: string): Promise<StudentRegistrationData[]> => {
    let query = supabase
      .from('registrations')
      .select(`
        id,
        status,
        created_at,
        student:students!inner(
          name,
          roll_number,
          department,
          year
        ),
        event:events!inner(
          name,
          type,
          venue,
          event_date
        )
      `);

    // Apply role-based filtering
    if (!hasRole(activeRole, USER_ROLES.ADMIN)) {
      const coordinatorYear = getCoordinatorYear(activeRole) as 'first' | 'second' | 'third' | 'fourth';
      query = query.eq('student.year', coordinatorYear);
    } else if (yearFilter && yearFilter !== 'all') {
      query = query.eq('student.year', yearFilter);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      student_name: item.student.name,
      roll_number: item.student.roll_number,
      department: item.student.department,
      year: item.student.year,
      event_name: item.event.name,
      event_type: item.event.type,
      venue: item.event.venue,
      event_date: item.event.event_date,
      registration_date: item.created_at,
      status: item.status,
    }));
  };

  const handleDownloadAll = async () => {
    try {
      setLoading(true);
      const data = await fetchRegistrationData();
      
      if (data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No registrations found to download.',
          variant: 'destructive',
        });
        return;
      }

      await generateAdminAllRegistrationsPDF(data);
      
      toast({
        title: 'Success',
        description: `Downloaded ${data.length} registrations as PDF`,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadByYear = async (year: string) => {
    try {
      setLoading(true);
      const data = await fetchRegistrationData(year);
      
      if (data.length === 0) {
        toast({
          title: 'No Data',
          description: `No registrations found for ${year} year students.`,
          variant: 'destructive',
        });
        return;
      }

      await generateAdminYearWiseRegistrationsPDF(data, year);
      
      toast({
        title: 'Success',
        description: `Downloaded ${data.length} ${year} year registrations as PDF`,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCoordinator = async () => {
    try {
      setLoading(true);
      const data = await fetchRegistrationData();
      
      if (data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No registrations found for your students.',
          variant: 'destructive',
        });
        return;
      }

      const coordinatorYear = getCoordinatorYear(activeRole) as string;
      await generateCoordinatorRegistrationsPDF(data, coordinatorYear);
      
      toast({
        title: 'Success',
        description: `Downloaded ${data.length} student registrations as PDF`,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadEventWise = async () => {
    try {
      setLoading(true);
      const data = await fetchRegistrationData(selectedYear !== 'all' ? selectedYear : undefined);
      
      if (data.length === 0) {
        toast({
          title: 'No Data',
          description: 'No registrations found.',
          variant: 'destructive',
        });
        return;
      }

      // Group by event
      const registrationsByEvent = data.reduce((acc, registration) => {
        const eventName = registration.event_name;
        if (!acc[eventName]) {
          acc[eventName] = [];
        }
        acc[eventName].push(registration);
        return acc;
      }, {} as Record<string, StudentRegistrationData[]>);

      const title = selectedYear === 'all' ? 'Event-wise Registrations' : `${selectedYear.charAt(0).toUpperCase() + selectedYear.slice(1)} Year Event-wise Registrations`;
      const filename = selectedYear === 'all' ? 'event-wise-registrations' : `${selectedYear}-year-event-wise`;

      await generateEventWiseRegistrationsPDF(registrationsByEvent, title, filename);
      
      toast({
        title: 'Success',
        description: `Downloaded event-wise registrations as PDF`,
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Download Reports
          </CardTitle>
          <CardDescription>
            {hasRole(activeRole, USER_ROLES.ADMIN) 
              ? 'Generate PDF reports for all registrations or filter by year'
              : 'Download your students\' registration details'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasRole(activeRole, USER_ROLES.ADMIN) ? (
            <>
              {/* Year filter for admin */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value={ACADEMIC_YEARS.FIRST}>First Year</SelectItem>
                    <SelectItem value={ACADEMIC_YEARS.SECOND}>Second Year</SelectItem>
                    <SelectItem value={ACADEMIC_YEARS.THIRD}>Third Year</SelectItem>
                    <SelectItem value={ACADEMIC_YEARS.FOURTH}>Fourth Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Button
                  onClick={selectedYear === 'all' ? handleDownloadAll : () => handleDownloadByYear(selectedYear)}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download {selectedYear === 'all' ? 'All' : `${selectedYear.charAt(0).toUpperCase() + selectedYear.slice(1)} Year`} Registrations
                </Button>

                <Button
                  onClick={handleDownloadEventWise}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Palette className="mr-2 h-4 w-4" />
                  )}
                  Download Event-wise Report
                </Button>
              </div>
            </>
          ) : (
            <Button
              onClick={handleDownloadCoordinator}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download My Students' Registrations
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={className} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Download Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {hasRole(activeRole, USER_ROLES.ADMIN) ? (
            <>
              <DropdownMenuItem onClick={handleDownloadAll}>
                <Users className="mr-2 h-4 w-4" />
                All Registrations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadByYear('first')}>
                <Users className="mr-2 h-4 w-4" />
                First Year Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadByYear('second')}>
                <Users className="mr-2 h-4 w-4" />
                Second Year Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadByYear('third')}>
                <Users className="mr-2 h-4 w-4" />
                Third Year Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadByYear('fourth')}>
                <Users className="mr-2 h-4 w-4" />
                Fourth Year Only
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadEventWise}>
                <Palette className="mr-2 h-4 w-4" />
                Event-wise Report
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={handleDownloadCoordinator}>
              <Users className="mr-2 h-4 w-4" />
              My Students' Registrations
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default button variant
  return (
    <Button
      onClick={hasRole(activeRole, USER_ROLES.ADMIN) ? handleDownloadAll : handleDownloadCoordinator}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Download PDF
    </Button>
  );
}
