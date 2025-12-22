import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Event {
    id: string;
    name: string;
    category: 'on_stage' | 'off_stage';
    description: string;
    max_participants: number | null;
    registration_deadline: string | null;
    event_date: string | null;
    venue: string;
}

interface StudentSelfRegistrationDialogProps {
    event: Event;
    onRegistrationComplete?: () => void;
    trigger?: React.ReactNode;
}

export function StudentSelfRegistrationDialog({
    event,
    onRegistrationComplete,
    trigger
}: StudentSelfRegistrationDialogProps) {
    const { user, profile } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
    const [limitStatus, setLimitStatus] = useState<{ canRegister: boolean; message?: string }>({ canRegister: true });

    useEffect(() => {
        if (open && user) {
            checkRegistrationStatus();
        }
    }, [open, user, event.id]);

    const checkRegistrationStatus = async () => {
        try {
            setCheckingStatus(true);

            // 1. Get student ID from user ID
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (studentError) throw studentError;
            if (!studentData) {
                console.warn('No student record found for current user');
                setLimitStatus({ canRegister: false, message: 'Student profile not linked. Contact admin.' });
                return;
            }

            const studentId = studentData.id;

            // 2. Check existing registration for THIS event
            const { data: existingReg } = await supabase
                .from('registrations')
                .select('status')
                .eq('student_id', studentId)
                .eq('event_id', event.id)
                .maybeSingle();

            if (existingReg) {
                setRegistrationStatus(existingReg.status);
                setLimitStatus({ canRegister: false, message: 'You are already registered for this event.' });
                return;
            }

            // 3. Check registration limits (max 3 per category)
            // Get all registrations for this student
            const { data: allRegs } = await supabase
                .from('registrations')
                .select('event:events!inner(category)')
                .eq('student_id', studentId)
                .in('status', ['pending', 'approved']);

            const currentCount = allRegs?.filter((r: any) => r.event.category === event.category).length || 0;

            // Get system limits
            const limitKey = event.category === 'on_stage' ? 'max_on_stage_registrations' : 'max_off_stage_registrations';
            // Note: DB keys are 'max_on_stage_registrations' and 'max_off_stage_registrations'
            // Previous code might have used incorrect keys like 'max_game_registrations'

            const { data: limitData, error: limitError } = await supabase
                .from('settings')
                .select('value')
                .eq('key', limitKey)
                .maybeSingle();

            if (limitError) console.error('Error fetching limit:', limitError);

            // Default fallbacks: 5 for On-Stage, 4 for Off-Stage (as per user dashboard stats)
            const defaultLimit = event.category === 'on_stage' ? 5 : 4;
            const limit = (limitData?.value as any)?.limit || defaultLimit;

            console.log(`[Registration Check] Key: ${limitKey}, DB Limit: ${(limitData?.value as any)?.limit}, Applied: ${limit}`);

            if (currentCount >= limit) {
                setLimitStatus({
                    canRegister: false,
                    message: `You have reached the maximum limit of ${limit} ${event.category === 'on_stage' ? 'On-Stage' : 'Off-Stage'} events.`
                });
            } else {
                setLimitStatus({ canRegister: true });
            }

        } catch (error) {
            console.error('Error checking status:', error);
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleRegister = async () => {
        try {
            setLoading(true);

            // Get student ID
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('id')
                .eq('user_id', user?.id)
                .maybeSingle(); // Changed from single() to avoid error if missing

            if (studentError) throw studentError;
            if (!studentData) throw new Error('Student record not found. Please contact support.');

            // Determine status (auto-approve check)
            const { data: autoApproveSetting } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'auto_approve_registrations')
                .maybeSingle(); // Changed from single()

            const autoApprove = (autoApproveSetting?.value as any)?.enabled || false;
            const initialStatus = autoApprove ? 'approved' : 'pending';

            // Insert registration
            const { error } = await supabase
                .from('registrations')
                .insert({
                    student_id: studentData.id,
                    event_id: event.id,
                    registered_by: profile?.id,
                    status: initialStatus
                });

            if (error) throw error;

            // Log activity
            await supabase.from('activity_logs').insert({
                user_id: profile?.id,
                action: 'self_registration',
                details: {
                    event_id: event.id,
                    event_name: event.name,
                    category: event.category
                }
            });

            toast({
                title: 'Registration Successful',
                description: `You have successfully registered for ${event.name}`,
            });

            onRegistrationComplete?.();
            setOpen(false);

        } catch (error: any) {
            console.error('Registration error:', error);
            toast({
                title: 'Registration Failed',
                description: error.message || 'Could not complete registration',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const defaultTrigger = (
        <Button size="sm" className="w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            Register for Event
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Register for {event.name}</DialogTitle>
                    <DialogDescription>
                        {event.category === 'on_stage' ? 'On-Stage Event' : 'Off-Stage Event'} • Confirm your registration
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {checkingStatus ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">Checking eligibility...</span>
                        </div>
                    ) : !limitStatus.canRegister ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Cannot Register</AlertTitle>
                            <AlertDescription>{limitStatus.message}</AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Event:</span>
                                    <span className="font-medium">{event.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span className="font-medium">{event.event_date ? new Date(event.event_date).toLocaleDateString() : 'TBA'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Venue:</span>
                                    <span className="font-medium">{event.venue || 'TBA'}</span>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                By clicking confirm, you will be registered for this individual event.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRegister}
                        disabled={loading || checkingStatus || !limitStatus.canRegister}
                        className="bg-primary text-primary-foreground"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Registering...
                            </>
                        ) : (
                            'Confirm Registration'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
