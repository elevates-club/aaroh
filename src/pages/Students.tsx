import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  Users,
  GraduationCap,
  Building,
  Calendar,
  Edit,
  Trash2,
  Upload,
  Download,
  Loader2,
  AlertCircle,
  Eye,
  Palette,
  Users2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES, ACADEMIC_YEARS, getYearLabel } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { AddStudentDialog, EditStudentDialog, CSVUploadDialog } from '@/components/forms';
import { toast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/logger';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Student {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: 'first' | 'second' | 'third' | 'fourth';
  created_at: string;
  updated_at: string;
}

export default function Students() {
  const { profile } = useAuth();
  const { activeRole } = useRole();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentRegistrations, setStudentRegistrations] = useState<{
    onStage: { id: string; name: string; status: string }[];
    offStage: { id: string; name: string; status: string }[];
    group: { id: string; name: string; status: string; mode: string }[];
  }>({ onStage: [], offStage: [], group: [] });
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchStudents();
    }
  }, [profile]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      if (!profile) {
        setLoading(false);
        return;
      }

      let query = supabase.from('students').select('*').order('created_at', { ascending: false });

      if (!hasRole(activeRole, USER_ROLES.ADMIN)) {
        const year = getCoordinatorYear(activeRole) as 'first' | 'second' | 'third' | 'fourth';
        if (year) {
          query = query.eq('year', year);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching students:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch students',
          variant: 'destructive',
        });
        return;
      }

      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(studentId);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete student',
          variant: 'destructive',
        });
        return;
      }

      // Log activity
      // Log activity
      await logActivity(
        profile?.id,
        'student_deleted',
        {
          student_name: studentName,
          student_id: studentId,
        }
      );

      toast({
        title: 'Success',
        description: 'Student deleted successfully',
      });

      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const fetchStudentRegistrations = async (student: Student) => {
    setViewingStudent(student);
    setLoadingRegistrations(true);

    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          id,
          status,
          event:events!inner(
            id,
            name,
            category,
            mode
          )
        `)
        .eq('student_id', student.id);

      if (error) throw error;

      const onStage: { id: string; name: string; status: string }[] = [];
      const offStage: { id: string; name: string; status: string }[] = [];
      const group: { id: string; name: string; status: string; mode: string }[] = [];

      (data || []).forEach((reg: any) => {
        const event = reg.event;
        if (event.mode === 'group' || event.mode === 'team') {
          group.push({ id: event.id, name: event.name, status: reg.status, mode: event.mode });
        } else if (event.category === 'on_stage') {
          onStage.push({ id: event.id, name: event.name, status: reg.status });
        } else {
          offStage.push({ id: event.id, name: event.name, status: reg.status });
        }
      });

      setStudentRegistrations({ onStage, offStage, group });
    } catch (error) {
      console.error('Error fetching student registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student registrations',
        variant: 'destructive',
      });
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const downloadStudentsCSV = () => {
    const csvData = filteredStudents.map(student => [
      student.name,
      student.roll_number,
      student.department,
      student.year,
      format(new Date(student.created_at), 'yyyy-MM-dd')
    ]);

    const csvContent = [
      ['Name', 'Roll Number', 'Department', 'Year', 'Created Date'],
      ...csvData
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Download Complete',
      description: 'Students data downloaded as CSV',
    });
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesYear = yearFilter === 'all' || student.year === yearFilter;

    return matchesSearch && matchesYear;
  });

  const getYearColor = (year: string) => {
    switch (year) {
      case 'first': return 'bg-blue-500/10 text-blue-600 border-blue-200/50';
      case 'second': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200/50';
      case 'third': return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
      case 'fourth': return 'bg-purple-500/10 text-purple-600 border-purple-200/50';
      default: return 'bg-muted text-muted-foreground border-border/50';
    }
  };

  const stats = {
    total: students.length,
    byYear: students.reduce((acc, student) => {
      acc[student.year] = (acc[student.year] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <div className="w-full max-w-[100vw] overflow-x-hidden p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Students</h1>
              <Badge variant="secondary" className="flex-shrink-0 px-2 py-1 text-xs sm:text-sm font-bold bg-muted text-muted-foreground border-border/50">
                {stats.total} Total
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {hasRole(profile?.role, USER_ROLES.ADMIN)
                ? 'Manage all students across all years'
                : `View students from ${getCoordinatorYear(profile?.role)} year`
              }
            </p>
          </div>

          {hasRole(profile?.role, USER_ROLES.ADMIN) && (
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
              <AddStudentDialog onStudentAdded={fetchStudents} />
              <CSVUploadDialog onStudentsAdded={fetchStudents} />
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search..."
            className="pl-10 h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {hasRole(profile?.role, USER_ROLES.ADMIN) && (
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="flex-1 sm:w-[180px] h-10">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {Object.entries(ACADEMIC_YEARS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filteredStudents.length > 0 && (
            <Button onClick={downloadStudentsCSV} variant="outline" className="h-10 px-3 flex-shrink-0">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Download CSV</span>
              <span className="inline sm:hidden">CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Students List</CardTitle>
          <CardDescription className="text-sm">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 px-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || yearFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No students have been added yet'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden">
                <div className="space-y-3 p-4">
                  {filteredStudents.map((student) => (
                    <Card key={student.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-base truncate">{student.name}</h3>
                            <p className="text-sm text-muted-foreground font-mono">{student.roll_number}</p>
                          </div>
                          <Badge className={getYearColor(student.year)}>
                            {ACADEMIC_YEARS[student.year]}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{student.department}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>{format(new Date(student.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fetchStudentRegistrations(student)}
                            title="View registrations"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {hasRole(profile?.role, USER_ROLES.ADMIN) && (
                            <>
                              <EditStudentDialog
                                student={student}
                                onStudentUpdated={fetchStudents}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteStudent(student.id, student.name)}
                                disabled={deletingId === student.id}
                              >
                                {deletingId === student.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="font-mono text-sm">{student.roll_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              {student.department}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getYearColor(student.year)}>
                              {ACADEMIC_YEARS[student.year]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(student.created_at), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchStudentRegistrations(student)}
                                title="View registrations"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {hasRole(profile?.role, USER_ROLES.ADMIN) && (
                                <>
                                  <EditStudentDialog
                                    student={student}
                                    onStudentUpdated={fetchStudents}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteStudent(student.id, student.name)}
                                    disabled={deletingId === student.id}
                                  >
                                    {deletingId === student.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Student Registrations Dialog */}
      <Dialog open={!!viewingStudent} onOpenChange={(open) => !open && setViewingStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {viewingStudent?.name}
            </DialogTitle>
            <DialogDescription>
              {viewingStudent?.roll_number} • {viewingStudent?.department}
            </DialogDescription>
          </DialogHeader>

          {loadingRegistrations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                {/* On-Stage Events */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4 text-purple-500" />
                    On-Stage Events ({studentRegistrations.onStage.length})
                  </h4>
                  {studentRegistrations.onStage.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-6">No on-stage registrations</p>
                  ) : (
                    <div className="space-y-1 pl-6">
                      {studentRegistrations.onStage.map((event) => (
                        <div key={event.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                          <span>{event.name}</span>
                          <Badge variant={event.status === 'approved' ? 'default' : event.status === 'pending' ? 'secondary' : 'destructive'}>
                            {event.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Off-Stage Events */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-green-500" />
                    Off-Stage Events ({studentRegistrations.offStage.length})
                  </h4>
                  {studentRegistrations.offStage.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-6">No off-stage registrations</p>
                  ) : (
                    <div className="space-y-1 pl-6">
                      {studentRegistrations.offStage.map((event) => (
                        <div key={event.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                          <span>{event.name}</span>
                          <Badge variant={event.status === 'approved' ? 'default' : event.status === 'pending' ? 'secondary' : 'destructive'}>
                            {event.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group Events */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-blue-500" />
                    Group Events ({studentRegistrations.group.length})
                  </h4>
                  {studentRegistrations.group.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-6">No group registrations</p>
                  ) : (
                    <div className="space-y-1 pl-6">
                      {studentRegistrations.group.map((event) => (
                        <div key={event.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                          <div>
                            <span>{event.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{event.mode}</Badge>
                          </div>
                          <Badge variant={event.status === 'approved' ? 'default' : event.status === 'pending' ? 'secondary' : 'destructive'}>
                            {event.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {studentRegistrations.onStage.length === 0 &&
                  studentRegistrations.offStage.length === 0 &&
                  studentRegistrations.group.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No registrations found for this student</p>
                    </div>
                  )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}