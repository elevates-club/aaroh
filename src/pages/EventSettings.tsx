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
import { Loader2, Settings, Calendar, Users, ShieldAlert, Clock, Power, Bot, SlidersHorizontal, CheckCircle, Ban } from 'lucide-react';
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
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto text-foreground">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Badge variant="outline" className="w-fit rounded-full px-4 py-1 text-[10px] uppercase font-bold border-primary/20 bg-primary/5 text-primary tracking-widest">
                    System Configuration
                </Badge>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-foreground">
                            Event <span className="text-primary">Control</span>
                        </h1>
                        <p className="text-muted-foreground text-lg font-medium mt-1">
                            Manage registration rules and system-wide overrides.
                        </p>
                    </div>
                    <Button onClick={handleSave} size="lg" disabled={saving} className="h-14 rounded-[2rem] px-8 font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span className="text-primary-foreground">Saving...</span>
                            </>
                        ) : (
                            <>
                                <Settings className="h-4 w-4 mr-2" />
                                <span className="text-primary-foreground">Save Changes</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* 1. AUTO APPROVE (4 Cols) */}
                <Card className="md:col-span-4 border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow p-8 flex flex-col justify-between h-[280px] rounded-[2rem]">
                    <div className="flex justify-between items-start">
                        <div className="h-12 w-12 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary">
                            <Bot className="h-6 w-6" />
                        </div>
                        <Switch
                            checked={settings.autoApproveRegistrations}
                            disabled={saving}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, autoApproveRegistrations: checked }))
                            }
                            className="data-[state=checked]:bg-primary scale-125"
                        />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-foreground">Auto-Approval</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                            Automatically confirm all incoming student registrations without manual review.
                        </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Status: <span className={settings.autoApproveRegistrations ? "text-emerald-500" : "text-amber-500"}>{settings.autoApproveRegistrations ? "Active" : "Disabled"}</span>
                    </div>
                </Card>

                {/* 2. REGISTRATION LIMITS (8 Cols) */}
                <Card className="md:col-span-8 border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow p-8 h-[280px] flex flex-col justify-center rounded-[2rem]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 rounded-[1.5rem] bg-muted flex items-center justify-center text-foreground">
                            <SlidersHorizontal className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground">Participation Limits</h3>
                            <p className="text-sm font-medium text-muted-foreground">Define maximum engagements per student</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">On-Stage Max</Label>
                                <span className="text-2xl font-black text-primary">{settings.maxOnStageRegistrations}</span>
                            </div>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={settings.maxOnStageRegistrations}
                                    onChange={(e) => setSettings(prev => ({ ...prev, maxOnStageRegistrations: parseInt(e.target.value) || 0 }))}
                                    className="h-2 bg-muted border-none rounded-full text-transparent selection:text-transparent focus:ring-0 cursor-pointer w-full absolute top-0 opacity-0 z-10"
                                />
                                {/* Custom slider visual can go here if needed, for now Input works but is hidden for custom styling or just standard input */}
                                <Input
                                    type="range"
                                    min="0"
                                    max="10"
                                    value={settings.maxOnStageRegistrations}
                                    onChange={(e) => setSettings(prev => ({ ...prev, maxOnStageRegistrations: parseInt(e.target.value) || 0 }))}
                                    className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Off-Stage Max</Label>
                                <span className="text-2xl font-black text-emerald-500">{settings.maxOffStageRegistrations}</span>
                            </div>
                            <Input
                                type="range"
                                min="0"
                                max="10"
                                value={settings.maxOffStageRegistrations}
                                onChange={(e) => setSettings(prev => ({ ...prev, maxOffStageRegistrations: parseInt(e.target.value) || 0 }))}
                                className="w-full accent-emerald-500 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </Card>

                {/* 3. DEADLINE (6 Cols) */}
                <Card className="md:col-span-6 border-none bg-primary text-primary-foreground shadow-lg shadow-primary/20 p-8 h-[240px] flex flex-col justify-between group overflow-hidden relative rounded-[2rem]">
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />

                    <div className="relative z-10 flex justify-between items-start">
                        <div className="h-12 w-12 rounded-[1.5rem] bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 text-white">Global Cutoff</p>
                            <p className="text-4xl font-black text-white">{settings.registrationDeadlineDays} <span className="text-lg font-bold opacity-50">Days</span></p>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-white/60">Registration Buffer</Label>
                        <Input
                            type="number"
                            value={settings.registrationDeadlineDays}
                            onChange={(e) => setSettings(prev => ({ ...prev, registrationDeadlineDays: parseInt(e.target.value) || 0 }))}
                            className="bg-white/10 border-white/10 text-white placeholder:text-white/20 h-12 rounded-xl font-bold focus-visible:ring-offset-0 focus-visible:ring-white/20"
                        />
                        <p className="text-[10px] text-white/40">Days before event date to close registration.</p>
                    </div>
                </Card>

                {/* 4. EMERGENCY STOP (6 Cols) */}
                <Card className={`md:col-span-6 border-none shadow-lg p-8 h-[240px] flex flex-col justify-between transition-colors duration-500 rounded-[2rem] ${settings.globalRegistrationOpen ? 'bg-card' : 'bg-destructive/10'}`}>
                    <div className="flex justify-between items-start">
                        <div className={`h-12 w-12 rounded-[1.5rem] flex items-center justify-center ${settings.globalRegistrationOpen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/20 text-destructive'}`}>
                            {settings.globalRegistrationOpen ? <CheckCircle className="h-6 w-6" /> : <Ban className="h-6 w-6" />}
                        </div>
                        <Badge variant={settings.globalRegistrationOpen ? "default" : "destructive"} className="px-4 py-1.5 uppercase font-black tracking-widest text-[10px]">
                            {settings.globalRegistrationOpen ? "System Online" : "System Lockdown"}
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-foreground">Global Kill Switch</h3>
                        <p className="text-sm font-medium text-muted-foreground">Instantly halt all registration activity across the entire platform.</p>
                    </div>

                    <Button
                        onClick={handleGlobalStatusToggle}
                        variant={settings.globalRegistrationOpen ? "outline" : "destructive"}
                        className="w-full h-12 rounded-xl border-2 font-bold uppercase tracking-wider"
                    >
                        {settings.globalRegistrationOpen ? "Initiate Lockdown" : "Restore Systems"}
                    </Button>
                </Card>

            </div>
        </div>
    );
}
