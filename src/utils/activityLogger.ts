import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogData {
  user_id?: string | null;
  action: string;
  details?: Record<string, any>;
}

// Database trigger handles ip_address and user_agent automatically now.

/**
 * Log user activity to the activity_logs table
 * This function automatically captures IP address and device information
 */
export const logActivity = async (data: ActivityLogData | { userId: string, action: string, details: any }): Promise<void> => {
  try {
    // Handle both old and new parameter formats for compatibility during migration
    const userId = (data as any).user_id || (data as any).userId || null;
    const action = (data as any).action;
    const details = (data as any).details || {};

    // System activities can have null userId, but we still need an action
    if (!action) return;

    // Database handle_activity_log_metadata trigger will fill ip_address and user_agent
    // if we don't provide them, which is more reliable.
    const user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Server/Unknown';

    const { error } = await supabase
      .from('activity_logs')
      .insert([
        {
          user_id: userId,
          action: action,
          details: details,
          user_agent,
        }
      ]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

/**
 * Log user login activity using the database function
 */
export const logUserLogin = async (userId: string, details?: Record<string, any>): Promise<void> => {
  try {
    const user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Server/Unknown';

    const { error } = await supabase.rpc('log_user_login', {
      p_user_id: userId,
      p_action: 'user_login',
      p_details: {
        ...(details || {}),
        user_agent
      }
    });

    if (error) {
      console.error('Error logging user login:', error);
    }
  } catch (error) {
    console.error('Error logging user login:', error);
  }
};

/**
 * Log user logout activity using the database function
 */
export const logUserLogout = async (userId: string, sessionId?: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('log_user_logout' as any, {
      p_user_id: userId,
      p_session_id: sessionId
    });

    if (error) {
      console.error('Error logging user logout:', error);
    }
  } catch (error) {
    console.error('Error logging user logout:', error);
  }
};

/**
 * Log student-related activities
 */
export const logStudentActivity = async (
  userId: string,
  action: 'student_created' | 'student_updated' | 'student_deleted',
  studentData: Record<string, any>
): Promise<void> => {
  await logActivity({
    user_id: userId,
    action,
    details: studentData
  });
};

/**
 * Log event-related activities
 */
export const logEventActivity = async (
  userId: string,
  action: 'event_created' | 'event_updated' | 'event_deleted',
  eventData: Record<string, any>
): Promise<void> => {
  await logActivity({
    user_id: userId,
    action,
    details: eventData
  });
};

/**
 * Log registration-related activities
 */
export const logRegistrationActivity = async (
  userId: string,
  action: 'registration_created' | 'registration_updated' | 'registration_deleted' | 'registration_status_updated' | 'students_registered',
  registrationData: Record<string, any>
): Promise<void> => {
  await logActivity({
    user_id: userId,
    action,
    details: registrationData
  });
};

/**
 * Log system-wide settings changes
 */
export const logSystemActivity = async (
  userId: string,
  action: 'settings_updated' | 'global_registration_status_changed',
  details: Record<string, any>
): Promise<void> => {
  await logActivity({
    user_id: userId,
    action,
    details
  });
};

/**
 * Log user management activities
 */
export const logUserManagementActivity = async (
  userId: string,
  action: 'user_created' | 'user_updated' | 'user_deleted',
  details: Record<string, any>
): Promise<void> => {
  await logActivity({
    user_id: userId,
    action,
    details
  });
};
