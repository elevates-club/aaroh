import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings, Calendar, Users, ShieldAlert, Clock, Power } from 'lucide-react';
import { logSystemActivity } from '@/utils/activityLogger';
import { useAuth } from '@/contexts/AuthContext';

export default function EventSettings() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        autoApproveRegistrations: false,
        maxOnStageRegistrations: 5,
        maxOffStageRegistrations: 5,
        registrationDeadlineDays: 2,
        globalRegistrationOpen: true,
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('settings')
                .select('*');

            if (error) throw error;

            if (data) {
                const newSettings = { ...settings };
                data.forEach(s => {
                    const val = String(s.value);
                    if (s.key === 'auto_approve_registrations') newSettings.autoApproveRegistrations = val === 'true';
                    if (s.key === 'max_on_stage_registrations') newSettings.maxOnStageRegistrations = parseInt(val) || 5;
                    if (s.key === 'max_off_stage_registrations') newSettings.maxOffStageRegistrations = parseInt(val) || 5;
                    if (s.key === 'registration_deadline_days') newSettings.registrationDeadlineDays = parseInt(val) || 2;
                    if (s.key === 'global_registration_open') newSettings.globalRegistrationOpen = val === 'true';
                });
                setSettings(newSettings);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast({
                title: "Error",
                description: "Failed to load settings. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const settingsToSave = [
                { key: 'auto_approve_registrations', value: String(settings.autoApproveRegistrations), updated_by: user?.id },
                { key: 'max_on_stage_registrations', value: String(settings.maxOnStageRegistrations), updated_by: user?.id },
                { key: 'max_off_stage_registrations', value: String(settings.maxOffStageRegistrations), updated_by: user?.id },
                { key: 'registration_deadline_days', value: String(settings.registrationDeadlineDays), updated_by: user?.id },
                { key: 'global_registration_open', value: String(settings.globalRegistrationOpen), updated_by: user?.id },
            ];

            const { error } = await supabase
                .from('settings')
                .upsert(settingsToSave, { onConflict: 'key' });

            if (error) throw error;

            if (user) {
                await logSystemActivity(user.id, 'settings_updated', settings);
            }

            toast({
                title: "Settings Saved",
                description: "Event settings have been updated successfully.",
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            toast({
                title: "Error",
                description: "Failed to save settings. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleGlobalStatusToggle = async () => {
        const newValue = !settings.globalRegistrationOpen;
        try {
            setSaving(true);
            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: 'global_registration_open',
                    value: String(newValue),
                    updated_by: user?.id
                }, { onConflict: 'key' });

            if (error) throw error;

            if (user) {
                await logSystemActivity(user.id, 'global_registration_status_changed', { status: newValue ? 'OPEN' : 'CLOSED' });
            }

            setSettings(prev => ({ ...prev, globalRegistrationOpen: newValue }));
            toast({
                title: newValue ? "Registrations Opened" : "Registrations Stopped",
                description: `Global registration status has been updated to ${newValue ? 'OPEN' : 'CLOSED'}.`,
            });
        } catch (error) {
            console.error('Error updating global status:', error);
            toast({
                title: "Error",
                description: "Failed to update global registration status.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading settings...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Event Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                    Configure event registration and management preferences
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Auto Approve Registrations */}
                <Card className="border-l-4 border-l-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Settings className="h-5 w-5 text-primary" />
                            Auto Approve Registrations
                        </CardTitle>
                        <CardDescription>
                            When enabled, all new registrations will be automatically approved
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                            <div className="space-y-0.5">
                                <Label className="text-base">Enable Auto-Approval</Label>
                                <p className="text-sm text-muted-foreground">
                                    Instant approval for every new registration
                                </p>
                            </div>
                            <Switch
                                checked={settings.autoApproveRegistrations}
                                disabled={saving}
                                onCheckedChange={(checked) =>
                                    setSettings(prev => ({ ...prev, autoApproveRegistrations: checked }))
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Registration Limits */}
                <Card className="border-l-4 border-l-secondary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-secondary" />
                            Registration Limits
                        </CardTitle>
                        <CardDescription>
                            Set the maximum number of events a student can register for
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Maximum On-Stage Registrations per Student</Label>
                                <Input
                                    type="number"
                                    value={settings.maxOnStageRegistrations}
                                    disabled={saving}
                                    onChange={(e) =>
                                        setSettings(prev => ({ ...prev, maxOnStageRegistrations: parseInt(e.target.value) || 0 }))
                                    }
                                    className="h-10 text-lg font-bold"
                                />
                                <p className="text-xs text-muted-foreground italic">
                                    Students can register for up to this many on-stage events
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Maximum Off-Stage Registrations per Student</Label>
                                <Input
                                    type="number"
                                    value={settings.maxOffStageRegistrations}
                                    disabled={saving}
                                    onChange={(e) =>
                                        setSettings(prev => ({ ...prev, maxOffStageRegistrations: parseInt(e.target.value) || 0 }))
                                    }
                                    className="h-10 text-lg font-bold"
                                />
                                <p className="text-xs text-muted-foreground italic">
                                    Students can register for up to this many off-stage events
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* System Control */}
                <Card className="md:col-span-2 border-l-4 border-l-red-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="h-5 w-5" />
                            System Control
                        </CardTitle>
                        <CardDescription>Advanced system-wide settings and maintenance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                            <div className="space-y-0.5">
                                <Label className="text-base flex items-center gap-2">
                                    Global Registration Status
                                    {settings.globalRegistrationOpen ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">OPEN</Badge>
                                    ) : (
                                        <Badge variant="destructive">CLOSED</Badge>
                                    )}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    When closed, no student can register for any event regardless of individual event status
                                </p>
                            </div>
                            <Button
                                variant={settings.globalRegistrationOpen ? "destructive" : "default"}
                                disabled={saving}
                                onClick={handleGlobalStatusToggle}
                            >
                                <Power className="h-4 w-4 mr-2" />
                                {settings.globalRegistrationOpen ? "Stop Registrations" : "Open Registrations"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} size="lg" disabled={saving}>
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Settings className="h-4 w-4 mr-2" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
