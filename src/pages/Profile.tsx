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
    Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getRoleLabel, getYearLabel, ACADEMIC_YEARS } from '@/lib/constants';
import { format } from 'date-fns';

export default function Profile() {
    const { user, profile } = useAuth();
    const [studentData, setStudentData] = useState<{
        name: string;
        roll_number: string;
        department: string;
        year: string;
        created_at: string;
    } | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        phone: '',
    });

    useEffect(() => {
        fetchData();
    }, [user?.id]);

    const fetchData = async () => {
        if (!user?.id) return;
        setLoading(true);

        // Fetch student data (includes phone_number)
        const { data: student } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (student) {
            setStudentData(student);
            setFormData({
                phone: student.phone_number || '',
            });
        }

        setLoading(false);
    };

    const handleSave = async () => {
        if (!user?.id || !studentData) return;
        setSaving(true);

        const { error } = await supabase
            .from('students')
            .update({ phone_number: formData.phone })
            .eq('user_id', user.id);

        if (error) {
            toast({
                title: 'Error',
                description: 'Failed to update profile',
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Success',
                description: 'Profile updated successfully',
            });
            setEditing(false);
        }

        setSaving(false);
    };

    const getRoleColor = (role: string) => {
        if (role === 'admin') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        if (role === 'student') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    My Profile
                </h1>
                <p className="text-muted-foreground mt-1">View and manage your profile information</p>
            </div>

            {/* Profile Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                                {profile?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <CardTitle className="text-xl">{profile?.full_name}</CardTitle>
                                <CardDescription className="flex flex-wrap gap-2 mt-2">
                                    {Array.isArray(profile?.role) ? (
                                        profile.role.map(r => (
                                            <Badge key={r} className={getRoleColor(r)}>{getRoleLabel(r)}</Badge>
                                        ))
                                    ) : (
                                        <Badge className={getRoleColor(profile?.role || '')}>{getRoleLabel(profile?.role || '')}</Badge>
                                    )}
                                </CardDescription>
                            </div>
                        </div>
                        {!editing && (
                            <Button variant="outline" onClick={() => setEditing(true)}>
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Account Information */}
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Account Information
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-muted-foreground flex items-center gap-2">
                                    <Mail className="h-3 w-3" /> Email
                                </Label>
                                <p className="font-medium">{profile?.email || user?.email}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-muted-foreground flex items-center gap-2">
                                    <Phone className="h-3 w-3" /> Phone
                                </Label>
                                {editing ? (
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="Enter phone number"
                                    />
                                ) : (
                                    <p className="font-medium">{formData.phone || 'Not set'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Student Information */}
                    {studentData && (
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="font-semibold flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" />
                                Student Information
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Roll Number</Label>
                                    <p className="font-medium font-mono">{studentData.roll_number}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground flex items-center gap-2">
                                        <Building className="h-3 w-3" /> Department
                                    </Label>
                                    <p className="font-medium">{studentData.department}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-3 w-3" /> Academic Year
                                    </Label>
                                    <Badge variant="outline">
                                        {ACADEMIC_YEARS[studentData.year as keyof typeof ACADEMIC_YEARS] || studentData.year}
                                    </Badge>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Member Since</Label>
                                    <p className="font-medium">{format(new Date(studentData.created_at), 'MMMM dd, yyyy')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    {editing && (
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => setEditing(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Save Changes
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
