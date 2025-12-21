import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { logActivity } from '@/lib/logger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

const editStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  roll_number: z.string().min(3, 'Roll number must be at least 3 characters'),
  department: z.string().min(2, 'Department must be at least 2 characters'),
  year: z.enum(['first', 'second', 'third', 'fourth'], {
    required_error: 'Please select an academic year',
  }),
});

type EditStudentFormData = z.infer<typeof editStudentSchema>;

interface Student {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: 'first' | 'second' | 'third' | 'fourth';
  created_at: string;
  updated_at: string;
}

interface EditStudentDialogProps {
  student: Student;
  onStudentUpdated?: () => void;
  trigger?: React.ReactNode;
}

export function EditStudentDialog({ student, onStudentUpdated, trigger }: EditStudentDialogProps) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<EditStudentFormData>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      name: student.name,
      roll_number: student.roll_number,
      department: student.department,
      year: student.year,
    },
  });

  const selectedYear = watch('year');

  // Reset form when student changes
  useEffect(() => {
    reset({
      name: student.name,
      roll_number: student.roll_number,
      department: student.department,
      year: student.year,
    });
  }, [student, reset]);

  const onSubmit = async (data: EditStudentFormData) => {
    if (profile?.role !== 'admin') {
      setError('Only administrators can edit students');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('students')
        .update({
          name: data.name.trim(),
          roll_number: data.roll_number.trim().toUpperCase(),
          department: data.department.trim(),
          year: data.year,
        })
        .eq('id', student.id);

      if (updateError) {
        if (updateError.code === '23505') {
          setError('A student with this roll number already exists');
        } else {
          setError(updateError.message || 'Failed to update student');
        }
        return;
      }

      // Log activity
      await logActivity(
        profile.id,
        'student_updated',
        {
          student_id: student.id,
          old_data: {
            name: student.name,
            roll_number: student.roll_number,
            department: student.department,
            year: student.year,
          },
          new_data: {
            name: data.name,
            roll_number: data.roll_number,
            department: data.department,
            year: data.year,
          },
        }
      );

      toast({
        title: 'Success',
        description: 'Student updated successfully',
      });

      setOpen(false);
      onStudentUpdated?.();
    } catch (err) {
      console.error('Error updating student:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Edit className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student information
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[95vh] p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Edit Student</h2>
              <p className="text-muted-foreground">
                Update the information for {student.name}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter student's full name"
                    {...register('name')}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roll_number">Roll Number *</Label>
                  <Input
                    id="roll_number"
                    placeholder="e.g., CS2021001"
                    {...register('roll_number')}
                    className={errors.roll_number ? 'border-destructive' : ''}
                  />
                  {errors.roll_number && (
                    <p className="text-sm text-destructive">{errors.roll_number.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Computer Science"
                    {...register('department')}
                    className={errors.department ? 'border-destructive' : ''}
                  />
                  {errors.department && (
                    <p className="text-sm text-destructive">{errors.department.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Academic Year *</Label>
                  <Select
                    value={selectedYear}
                    onValueChange={(value) => setValue('year', value as any)}
                  >
                    <SelectTrigger className={errors.year ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACADEMIC_YEARS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.year && (
                    <p className="text-sm text-destructive">{errors.year.message}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Student...
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Update Student
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
