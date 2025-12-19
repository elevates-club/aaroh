import { supabase } from '@/integrations/supabase/client';

export interface StudentRegistrationInfo {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: string;
  currentCount: number;
  limit: number;
  registrations: Array<{
    event_name: string;
    category: 'on_stage' | 'off_stage';
  }>;
}

export interface RegistrationLimits {
  maxOnStageRegistrations: number;
  maxOffStageRegistrations: number;
}

/**
 * Fetches registration limits from settings
 */
export async function fetchRegistrationLimits(): Promise<RegistrationLimits> {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['max_on_stage_registrations', 'max_off_stage_registrations']);

  if (error) throw error;

  const settingsMap = data.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>);

  return {
    maxOnStageRegistrations: settingsMap.max_on_stage_registrations?.limit || 0,
    maxOffStageRegistrations: settingsMap.max_off_stage_registrations?.limit || 0,
  };
}

/**
 * Gets detailed registration information for students
 */
export async function getStudentRegistrationInfo(
  studentIds: string[],
  category: 'on_stage' | 'off_stage'
): Promise<StudentRegistrationInfo[]> {
  if (studentIds.length === 0) return [];

  // Fetch registration limits
  const limits = await fetchRegistrationLimits();
  const limit = category === 'on_stage'
    ? limits.maxOnStageRegistrations
    : limits.maxOffStageRegistrations;

  // Fetch students
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, name, roll_number, department, year')
    .in('id', studentIds);

  if (studentsError) throw studentsError;

  // Fetch their registrations
  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select(`
      student_id,
      event:events!inner(
        name,
        category
      )
    `)
    .in('student_id', studentIds)
    .in('status', ['pending', 'approved']);

  if (regError) throw regError;

  // Process the data
  const result: StudentRegistrationInfo[] = students.map(student => {
    const studentRegistrations = registrations.filter(reg => reg.student_id === student.id);
    const relevantRegistrations = studentRegistrations.filter(reg => reg.event.category === category);

    return {
      id: student.id,
      name: student.name,
      roll_number: student.roll_number,
      department: student.department,
      year: student.year,
      currentCount: relevantRegistrations.length,
      limit,
      registrations: relevantRegistrations.map(reg => ({
        event_name: reg.event.name,
        category: reg.event.category as 'on_stage' | 'off_stage'
      }))
    };
  });

  return result;
}

/**
 * Checks if students exceed registration limits
 */
export function checkRegistrationLimits(
  students: StudentRegistrationInfo[],
  category: 'on_stage' | 'off_stage'
): {
  studentsAtLimit: StudentRegistrationInfo[];
  studentsOverLimit: StudentRegistrationInfo[];
  canRegister: boolean;
} {
  const studentsAtLimit = students.filter(s => s.currentCount >= s.limit);
  const studentsOverLimit = students.filter(s => s.currentCount > s.limit);

  return {
    studentsAtLimit,
    studentsOverLimit,
    canRegister: studentsAtLimit.length === 0
  };
}

/**
 * Gets students that would exceed limits if registered
 */
export function getStudentsExceedingLimits(
  students: StudentRegistrationInfo[],
  category: 'on_stage' | 'off_stage'
): StudentRegistrationInfo[] {
  return students.filter(s => s.currentCount >= s.limit);
}
