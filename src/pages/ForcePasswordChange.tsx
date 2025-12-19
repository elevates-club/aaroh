import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Check } from 'lucide-react';

export function ForcePasswordChange() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { profile } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const passwordRequirements = [
        { met: newPassword.length >= 8, text: 'At least 8 characters' },
        { met: /[A-Z]/.test(newPassword), text: 'One uppercase letter' },
        { met: /[a-z]/.test(newPassword), text: 'One lowercase letter' },
        { met: /[0-9]/.test(newPassword), text: 'One number' },
    ];

    const allRequirementsMet = passwordRequirements.every(req => req.met);
    const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!allRequirementsMet) {
            toast({
                title: 'Password Requirements Not Met',
                description: 'Please ensure all password requirements are satisfied.',
                variant: 'destructive',
            });
            return;
        }

        if (!passwordsMatch) {
            toast({
                title: 'Passwords Do Not Match',
                description: 'Please ensure both passwords are the same.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);

            // Update password
            const { error: passwordError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (passwordError) throw passwordError;

            if (passwordError) throw passwordError;

            // Mark first login as complete using RPC (bypasses RLS)
            if (profile?.user_id) {
                const { error: rpcError } = await supabase
                    .rpc('complete_first_login', {
                        p_user_id: profile.user_id
                    });

                if (rpcError) throw rpcError;
            } else {
                // Fallback if profile.user_id missing (unlikely)
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ is_first_login: false })
                    .eq('id', profile?.id);

                if (profileError) throw profileError;
            }

            toast({
                title: 'Password Changed Successfully',
                description: 'Now please complete your profile setup.',
            });

            // Navigate to profile setup with forced reload to update profile state
            window.location.href = '/setup-profile';

        } catch (error: any) {
            console.error('Error changing password:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to change password',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-md p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">Change Your Password</h1>
                    <p className="text-sm text-muted-foreground">
                        For security, you must change your password before continuing
                    </p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                        />
                    </div>

                    {/* Password Requirements */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Password Requirements:</p>
                        <div className="space-y-1">
                            {passwordRequirements.map((req, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                    <Check
                                        className={`w-4 h-4 ${req.met ? 'text-green-500' : 'text-muted-foreground'
                                            }`}
                                    />
                                    <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                                        {req.text}
                                    </span>
                                </div>
                            ))}
                            {confirmPassword && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Check
                                        className={`w-4 h-4 ${passwordsMatch ? 'text-green-500' : 'text-muted-foreground'
                                            }`}
                                    />
                                    <span className={passwordsMatch ? 'text-foreground' : 'text-muted-foreground'}>
                                        Passwords match
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading || !allRequirementsMet || !passwordsMatch}
                    >
                        {loading ? 'Changing Password...' : 'Change Password & Continue'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}
