import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, AlertCircle, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACADEMIC_YEARS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { logStudentActivity } from '@/utils/activityLogger';

const addStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  roll_number: z.string().min(3, 'Roll number must be at least 3 characters'),
  department: z.string().min(2, 'Department must be at least 2 characters'),
  year: z.enum(['first', 'second', 'third', 'fourth'], {
    required_error: 'Please select an academic year',
  }),
});

type AddStudentFormData = z.infer<typeof addStudentSchema>;

interface AddStudentFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function AddStudentForm({ onSuccess, onCancel }: AddStudentFormProps) {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<AddStudentFormData>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: '',
      roll_number: '',
      department: '',
      year: undefined,
    },
  });

  const selectedYear = watch('year');

  const onSubmit = async (data: AddStudentFormData) => {
    const roles = Array.isArray(profile?.role) ? profile.role : [profile?.role].filter(Boolean) as string[];
    if (!roles.includes('admin')) {
      setError('Only administrators can add students');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('students')
        .insert([
          {
            name: data.name.trim(),
            roll_number: data.roll_number.trim().toUpperCase(),
            department: data.department.trim(),
            year: data.year,
          },
        ]);

      if (insertError) {
        if (insertError.code === '23505') {
          setError('A student with this roll number already exists');
        } else {
          setError(insertError.message || 'Failed to add student');
        }
        return;
      }

      // Log activity
      if (profile?.id) {
        await logStudentActivity(profile.id, 'student_created', {
          student_name: data.name,
          roll_number: data.roll_number,
          department: data.department,
          year: data.year,
        });
      }

      toast({
        title: 'Success',
        description: 'Student added successfully',
      });

      reset();
      onSuccess();
    } catch (err) {
      console.error('Error adding student:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <UserPlus className="h-5 w-5 text-primary" />
          Add New Student
        </CardTitle>
        <CardDescription className="text-sm">
          Enter the student's information to add them to the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter student's full name"
                {...register('name')}
                className={`h-10 ${errors.name ? 'border-destructive' : ''}`}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="roll_number" className="text-sm font-medium">Roll Number *</Label>
              <Input
                id="roll_number"
                placeholder="e.g., CS2021001"
                {...register('roll_number')}
                className={`h-10 ${errors.roll_number ? 'border-destructive' : ''}`}
              />
              {errors.roll_number && (
                <p className="text-xs text-destructive">{errors.roll_number.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">Department *</Label>
              <Input
                id="department"
                placeholder="e.g., Computer Science"
                {...register('department')}
                className={`h-10 ${errors.department ? 'border-destructive' : ''}`}
              />
              {errors.department && (
                <p className="text-xs text-destructive">{errors.department.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">Academic Year *</Label>
              <Select
                value={selectedYear}
                onValueChange={(value) => setValue('year', value as any)}
              >
                <SelectTrigger className={`h-10 ${errors.year ? 'border-destructive' : ''}`}>
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
                <p className="text-xs text-destructive">{errors.year.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Adding Student...</span>
                  <span className="sm:hidden">Adding...</span>
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Add Student</span>
                  <span className="sm:hidden">Add</span>
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 sm:flex-none h-10"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
