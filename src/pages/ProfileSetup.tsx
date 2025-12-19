import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Users } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export function ProfileSetup() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [studentData, setStudentData] = useState<any>(null);

    // Form state
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [gender, setGender] = useState('');

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStudentData();
    }, [user]);

    const fetchStudentData = async () => {
        if (!user) return;
        setError(null);

        try {
            // 1. Try to find by linked user_id
            let { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle(); // Use maybeSingle to avoid 0-row errors

            // 2. Self-healing: If not found, try to find by roll_number from metadata
            if (!data && user.user_metadata?.roll_number) {
                console.log('⚠️ Student not linked. Attempting self-healing via metadata...');
                const rollNumber = user.user_metadata.roll_number;

                const { data: studentByRoll, error: rollError } = await supabase
                    .from('students')
                    .select('*')
                    .ilike('roll_number', rollNumber) // Case-insensitive match
                    .maybeSingle();

                if (studentByRoll) {
                    console.log('✅ Found student by roll number. Linking now...');
                    // Link the student to this user
                    const { error: linkError } = await supabase
                        .from('students')
                        .update({ user_id: user.id })
                        .eq('id', studentByRoll.id);

                    if (linkError) {
                        console.error('Failed to link student:', linkError);
                        // Continue anyway, maybe we can still show data? But saving will fail if RLS checks user_id.
                        // Actually, if we use the data, the next save will likely work if RLS allows.
                    }
                    data = studentByRoll;
                }
            }

            if (!data) {
                console.error('❌ No student profile found for this user.');
                setError('Could not find your student record. Please contact support.');
                return;
            }

            setStudentData(data);
        } catch (err: any) {
            console.error('Error in fetchStudentData:', err);
            setError(err.message || 'Failed to load profile.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !phoneNumber || !gender) {
            toast({
                title: 'Incomplete Information',
                description: 'Please fill in all fields',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);

            // Update student profile in database
            const { data: updateResult, error: updateError } = await supabase
                .rpc('update_student_auth_email', {
                    p_user_id: user?.id,
                    p_new_email: email
                });

            if (updateError) throw updateError;

            const result = updateResult as any;
            if (!result.success) {
                throw new Error(result.message);
            }

            // Update phone and gender
            const { error: studentError } = await supabase
                .from('students')
                .update({
                    phone_number: phoneNumber,
                    gender: gender
                })
                .eq('user_id', user?.id);

            if (studentError) throw studentError;

            // Mark profile as completed and sync email
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    profile_completed: true,
                    email: email
                })
                .eq('user_id', user?.id);

            if (profileError) throw profileError;



            toast({
                title: 'Profile Setup Complete!',
                description: 'You can now login with your email or register number.',
            });

            // Force reload to refresh session/profile and bypass stale state in ProtectedRoute
            window.location.href = '/dashboard';

        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update profile',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!studentData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                {error ? (
                    <Card className="p-6 text-center space-y-4 max-w-md border-red-200 bg-red-50 dark:bg-red-900/10">
                        <div className="text-red-500 font-semibold">Profile Error</div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
                        <Button onClick={() => window.location.reload()} variant="outline">
                            Retry
                        </Button>
                    </Card>
                ) : (
                    <p className="text-muted-foreground animate-pulse">Loading student details...</p>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-2xl p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <User className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                    <p className="text-sm text-muted-foreground">
                        Add your contact details to get started
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Pre-filled fields (read-only) */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <p className="font-medium">{studentData.name}</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Register Number</Label>
                            <p className="font-medium">{studentData.roll_number}</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Department</Label>
                            <p className="font-medium">{studentData.department}</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Year</Label>
                            <p className="font-medium capitalize">{studentData.year}</p>
                        </div>
                    </div>

                    {/* Editable fields */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email Address *
                                </div>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@example.com"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                You'll be able to login with this email
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Phone Number *
                                </div>
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+91 XXXXXXXXXX"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gender">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Gender *
                                </div>
                            </Label>
                            <Select value={gender} onValueChange={setGender} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? 'Saving...' : 'Complete Setup & Continue'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
