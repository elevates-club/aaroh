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
import { Loader2, Settings, Calendar, Users, ShieldAlert, Clock, Power, Bot, SlidersHorizontal, CheckCircle, Ban, Trophy } from 'lucide-react';
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
        scoreboardVisible: false,
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
                    const val = s.value as any; // Cast to any to safely access properties if object
                    if (s.key === 'auto_approve_registrations') newSettings.autoApproveRegistrations = val?.enabled === true;
                    if (s.key === 'max_on_stage_registrations') newSettings.maxOnStageRegistrations = val?.limit || 5;
                    if (s.key === 'max_off_stage_registrations') newSettings.maxOffStageRegistrations = val?.limit || 5;
                    if (s.key === 'registration_deadline_days') newSettings.registrationDeadlineDays = val?.days || 2;
                    if (s.key === 'global_registration_open') newSettings.globalRegistrationOpen = val?.enabled !== false;
                    if (s.key === 'scoreboard_visible') newSettings.scoreboardVisible = val?.enabled === true;
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
                { key: 'auto_approve_registrations', value: { enabled: settings.autoApproveRegistrations }, updated_by: user?.id },
                { key: 'max_on_stage_registrations', value: { limit: settings.maxOnStageRegistrations }, updated_by: user?.id },
                { key: 'max_off_stage_registrations', value: { limit: settings.maxOffStageRegistrations }, updated_by: user?.id },
                { key: 'registration_deadline_days', value: { days: settings.registrationDeadlineDays }, updated_by: user?.id },
                { key: 'global_registration_open', value: { enabled: settings.globalRegistrationOpen }, updated_by: user?.id },
                { key: 'scoreboard_visible', value: { enabled: settings.scoreboardVisible }, updated_by: user?.id },
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
                    value: { enabled: newValue },
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
                            <h3 className="text-xl font-bold text-foreground">Registration Limits</h3>
                            <p className="text-sm font-medium text-muted-foreground">Define maximum engagements per student</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">On-Stage Max</Label>
                                <span className="text-2xl font-black text-primary">{settings.maxOnStageRegistrations}</span>
                            </div>
                            <Input
                                type="range"
                                min="0"
                                max="10"
                                value={settings.maxOnStageRegistrations}
                                onChange={(e) => setSettings(prev => ({ ...prev, maxOnStageRegistrations: parseInt(e.target.value) || 0 }))}
                                className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                            />
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
                <Card className="md:col-span-6 border-none bg-primary text-primary-foreground shadow-lg shadow-primary/20 p-8 h-[240px] flex flex-col justify-between group rounded-[2rem]">

                    <div className="flex justify-between items-start">
                        <div className="h-12 w-12 rounded-[1.5rem] bg-primary-foreground/10 flex items-center justify-center text-primary-foreground">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-primary-foreground/80">Registration Deadline</p>
                            <p className="text-4xl font-black text-primary-foreground">{settings.registrationDeadlineDays} <span className="text-lg font-bold opacity-80">Days</span></p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-primary-foreground">Days Before Event</Label>
                        <Input
                            type="number"
                            value={settings.registrationDeadlineDays}
                            onChange={(e) => setSettings(prev => ({ ...prev, registrationDeadlineDays: parseInt(e.target.value) || 0 }))}
                            className="bg-primary-foreground/10 border-none text-primary-foreground placeholder:text-primary-foreground/50 h-12 rounded-xl font-bold focus-visible:ring-0"
                        />
                        <p className="text-[10px] text-primary-foreground/70">Number of days before event to close registration.</p>
                    </div>
                </Card>

                {/* 4. EMERGENCY STOP (6 Cols) */}
                <Card className={`md:col-span-6 border-none shadow-lg p-8 h-[240px] flex flex-col justify-between transition-colors duration-500 rounded-[2rem] ${settings.globalRegistrationOpen ? 'bg-card' : 'bg-destructive/10'}`}>
                    <div className="flex justify-between items-start">
                        <div className={`h-12 w-12 rounded-[1.5rem] flex items-center justify-center ${settings.globalRegistrationOpen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/20 text-destructive'}`}>
                            {settings.globalRegistrationOpen ? <CheckCircle className="h-6 w-6" /> : <Ban className="h-6 w-6" />}
                        </div>
                        <Badge variant={settings.globalRegistrationOpen ? "default" : "destructive"} className="px-4 py-1.5 uppercase font-black tracking-widest text-[10px]">
                            {settings.globalRegistrationOpen ? "System Online" : "System Paused"}
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-foreground">System Control</h3>
                        <p className="text-sm font-medium text-muted-foreground">Pause or resume all registration activity.</p>
                    </div>

                    <Button
                        onClick={handleGlobalStatusToggle}
                        variant={settings.globalRegistrationOpen ? "outline" : "destructive"}
                        className="w-full h-12 rounded-xl border-2 font-bold uppercase tracking-wider"
                    >
                        {settings.globalRegistrationOpen ? "Pause Registrations" : "Resume Registrations"}
                    </Button>
                </Card>

                {/* 5. SCOREBOARD VISIBILITY (12 Cols) */}
                <Card className="md:col-span-12 border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow p-8 flex flex-col md:flex-row justify-between items-center gap-6 rounded-[2rem]">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-[1.5rem] bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                            <Trophy className="h-7 w-7" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                Scoreboard Visibility
                                <Badge variant={settings.scoreboardVisible ? "default" : "outline"} className="uppercase text-[10px] tracking-widest">
                                    {settings.scoreboardVisible ? "Live Publicly" : "Hidden"}
                                </Badge>
                            </h3>
                            <p className="text-sm font-medium text-muted-foreground mt-1">
                                Control when the scoreboard and results are visible to the public.
                                <span className="block text-xs mt-1 opacity-70">
                                    Turn this ON only during event days to reveal scores. Result entry buttons will also be hidden when OFF.
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className={`text-sm font-bold uppercase tracking-wider ${settings.scoreboardVisible ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {settings.scoreboardVisible ? "Visible" : "Hidden"}
                        </span>
                        <Switch
                            checked={settings.scoreboardVisible}
                            disabled={saving}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, scoreboardVisible: checked }))
                            }
                            className="data-[state=checked]:bg-yellow-500 scale-150 mr-2"
                        />
                    </div>
                </Card>

            </div>
        </div>
    );
}
