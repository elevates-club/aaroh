import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    User,
    Mail,
    Phone,
    GraduationCap,
    Building,
    Calendar,
    Shield,
    Save,
    Loader2,
    Lock,
    Users
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getRoleLabel, ACADEMIC_YEARS } from '@/lib/constants';
import { format } from 'date-fns';
import { logActivity } from '@/utils/activityLogger';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';

export default function Profile() {
    const { user, profile } = useAuth();
    const [studentData, setStudentData] = useState<{
        name: string;
        roll_number: string;
        department: string;
        year: string;
        created_at: string;
        gender?: string;
        phone_number?: string;
    } | null>(null);

    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        phone: '',
        gender: '',
        email: '',
    });

    // Password Change State
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        fetchData();
    }, [user?.id]);

    const fetchData = async () => {
        if (!user?.id) return;
        setLoading(true);

        const { data: student } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (student) {
            setStudentData(student);
            setFormData({
                phone: student.phone_number || '',
                gender: student.gender || '',
                email: profile?.email || user.email || '',
            });
        } else {
            // Fallback for non-students (e.g. admins)
            setFormData({
                phone: '',
                gender: '',
                email: profile?.email || user.email || '',
            });
        }

        setLoading(false);
    };

    const handleSaveProfile = async () => {
        if (!user?.id) return;
        setSaving(true);

        try {
            // 1. Update Student Details (Phone, Gender)
            if (studentData) {
                const { error: studentError } = await supabase
                    .from('students')
                    .update({
                        phone_number: formData.phone,
                        gender: formData.gender
                    })
                    .eq('user_id', user.id);

                if (studentError) throw studentError;
            }

            // 2. Update Email if changed
            if (formData.email !== (profile?.email || user.email)) {
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('update_student_auth_email', {
                        p_user_id: user.id,
                        p_new_email: formData.email
                    });

                if (rpcError) throw rpcError;

                const result = rpcData as any;
                if (!result.success) {
                    throw new Error(result.message);
                }

                // Sync profiles table
                await supabase
                    .from('profiles')
                    .update({ email: formData.email })
                    .eq('id', user.id);
            }

            toast({
                title: 'Success',
                description: 'Profile updated successfully',
            });
            if (user?.id) {
                await logActivity({
                    user_id: user.id,
                    action: 'profile_updated',
                    details: {
                        phone_changed: formData.phone !== (studentData?.phone_number || ''),
                        email_changed: formData.email !== (profile?.email || user.email),
                        gender_changed: formData.gender !== (studentData?.gender || '')
                    }
                });
            }

            setEditing(false);
            fetchData(); // Refresh data

        } catch (error: any) {
            console.error('Update error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update profile',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast({
                title: 'Error',
                description: 'Passwords do not match',
                variant: 'destructive',
            });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast({
                title: 'Error',
                description: 'Password must be at least 6 characters',
                variant: 'destructive',
            });
            return;
        }

        setChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;

            toast({
                title: 'Success',
                description: 'Password updated successfully',
            });
            if (user?.id) {
                await logActivity({
                    user_id: user.id,
                    action: 'password_updated',
                    details: { method: 'profile_page' }
                });
            }

            setPasswordOpen(false);
            setPasswordData({ newPassword: '', confirmPassword: '' });

        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update password',
                variant: 'destructive',
            });
        } finally {
            setChangingPassword(false);
        }
    };

    const getRoleColor = (role: string) => {
        if (role === 'admin') return 'bg-red-500/10 text-red-600 border-red-200/50';
        if (role === 'event_manager') return 'bg-orange-500/10 text-orange-600 border-orange-200/50';
        if (role === 'coordinator') return 'bg-purple-500/10 text-purple-600 border-purple-200/50';
        return 'bg-blue-500/10 text-blue-600 border-blue-200/50';
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-20">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    My Profile
                </h1>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">Manage your personal information and account security</p>
            </div>

            <div className="grid gap-6">
                {/* Identity Card */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold shrink-0">
                                {profile?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 space-y-2">
                                <div>
                                    <CardTitle className="text-xl md:text-2xl">{profile?.full_name}</CardTitle>
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                                        {Array.isArray(profile?.role) ? (
                                            profile.role.map(r => (
                                                <Badge key={r} variant="outline" className={getRoleColor(r)}>{getRoleLabel(r)}</Badge>
                                            ))
                                        ) : (
                                            <Badge variant="outline" className={getRoleColor(profile?.role || '')}>{getRoleLabel(profile?.role || '')}</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {!editing && (
                                <Button onClick={() => setEditing(true)} className="w-full sm:w-auto">
                                    Edit Profile
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                </Card>

                {/* Personal Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Personal Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Read Only Fields */}
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Full Name</Label>
                                <div className="p-2.5 bg-muted/50 rounded-md font-medium border border-transparent">
                                    {profile?.full_name}
                                </div>
                            </div>

                            {studentData && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Register Number</Label>
                                        <div className="p-2.5 bg-muted/50 rounded-md font-medium border border-transparent font-mono">
                                            {studentData.roll_number}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Department</Label>
                                        <div className="p-2.5 bg-muted/50 rounded-md font-medium border border-transparent">
                                            {studentData.department}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Academic Year</Label>
                                        <div className="p-2.5 bg-muted/50 rounded-md font-medium border border-transparent">
                                            {ACADEMIC_YEARS[studentData.year as keyof typeof ACADEMIC_YEARS] || studentData.year}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Editable Fields */}
                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wider flex items-center gap-2">
                                    <Phone className="h-3 w-3" /> Phone Number
                                </Label>
                                {editing ? (
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="Enter phone number"
                                    />
                                ) : (
                                    <div className="p-2.5 rounded-md font-medium border border-border/50">
                                        {formData.phone || 'Not set'}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wider flex items-center gap-2">
                                    <Users className="h-3 w-3" /> Gender
                                </Label>
                                {editing ? (
                                    <Select
                                        value={formData.gender}
                                        onValueChange={(val) => setFormData({ ...formData, gender: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="p-2.5 rounded-md font-medium border border-border/50">
                                        {formData.gender || 'Not set'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Account Security */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Account Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs uppercase tracking-wider flex items-center gap-2">
                                    <Mail className="h-3 w-3" /> Email Address
                                </Label>
                                {editing ? (
                                    <Input
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="Enter email address"
                                        className="max-w-md"
                                    />
                                ) : (
                                    <div className="p-2.5 rounded-md font-medium border border-border/50">
                                        {formData.email}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Used for login and notifications. {editing && "Changing this will update your login credentials."}
                                </p>
                            </div>

                            <div className="md:col-span-2 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Password</h4>
                                        <p className="text-sm text-muted-foreground">Ensure your account is secure with a strong password</p>
                                    </div>
                                    <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Lock className="mr-2 h-4 w-4" />
                                                Change Password
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Change Password</DialogTitle>
                                                <DialogDescription>
                                                    Enter a new password for your account. It must be at least 6 characters.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <Label>New Password</Label>
                                                    <Input
                                                        type="password"
                                                        value={passwordData.newPassword}
                                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Confirm Password</Label>
                                                    <Input
                                                        type="password"
                                                        value={passwordData.confirmPassword}
                                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancel</Button>
                                                <Button onClick={handleChangePassword} disabled={changingPassword}>
                                                    {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Update Password
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </div>

                        {editing && (
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button variant="ghost" onClick={() => {
                                    setEditing(false);
                                    fetchData(); // Reset form
                                }}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveProfile} disabled={saving} className="bg-gradient-to-r from-primary to-secondary">
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
