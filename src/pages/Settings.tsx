import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Save, Users, Palette, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { toast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/logger';

interface SettingsData {
  maxOnStageRegistrations: number;
  maxOffStageRegistrations: number;
  autoApproveRegistrations: boolean;
  signUpEnabled: boolean;
}

export default function Settings() {
  const { profile } = useAuth();
  const { activeRole } = useRole();
  const [settings, setSettings] = useState<SettingsData>({
    maxOnStageRegistrations: 2,
    maxOffStageRegistrations: 2,
    autoApproveRegistrations: false,
    signUpEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalEvents: 0,
    totalRegistrations: 0,
  });

  useEffect(() => {
    if (hasRole(activeRole, USER_ROLES.ADMIN)) {
      fetchSettings();
      fetchStats();
    }
  }, [profile]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['max_on_stage_registrations', 'max_off_stage_registrations', 'auto_approve_registrations', 'sign_up_enabled']);

      if (error) throw error;

      const settingsMap = data.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, any>);

      setSettings({
        maxOnStageRegistrations: settingsMap.max_on_stage_registrations?.limit || 2,
        maxOffStageRegistrations: settingsMap.max_off_stage_registrations?.limit || 2,
        autoApproveRegistrations: settingsMap.auto_approve_registrations?.enabled || false,
        signUpEnabled: settingsMap.sign_up_enabled?.enabled !== false, // Default to true if not set
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersResult, studentsResult, eventsResult, registrationsResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('students').select('id', { count: 'exact' }),
        supabase.from('events').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('registrations').select('id', { count: 'exact' }),
      ]);

      setStats({
        totalUsers: usersResult.count || 0,
        totalStudents: studentsResult.count || 0,
        totalEvents: eventsResult.count || 0,
        totalRegistrations: registrationsResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const updates = [
        {
          key: 'max_on_stage_registrations',
          value: { limit: settings.maxOnStageRegistrations },
          updated_by: profile?.id,
        },
        {
          key: 'max_off_stage_registrations',
          value: { limit: settings.maxOffStageRegistrations },
          updated_by: profile?.id,
        },
        {
          key: 'auto_approve_registrations',
          value: { enabled: settings.autoApproveRegistrations },
          updated_by: profile?.id,
        },
        {
          key: 'sign_up_enabled',
          value: { enabled: settings.signUpEnabled },
          updated_by: profile?.id,
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: profile?.id,
        action: 'settings_updated',
        details: {
          max_on_stage_registrations: settings.maxOnStageRegistrations,
          max_off_stage_registrations: settings.maxOffStageRegistrations,
          auto_approve_registrations: settings.autoApproveRegistrations,
          sign_up_enabled: settings.signUpEnabled,
        },
      });

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Only admins can access settings
  if (!hasRole(activeRole, USER_ROLES.ADMIN)) {
    return (
      <div className="p-6">
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <SettingsIcon className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-muted-foreground">
                Only administrators can access system settings.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Badge variant="outline" className="w-fit rounded-full px-4 py-1 text-[10px] uppercase font-bold border-primary/20 bg-primary/5 text-primary tracking-widest">
          Admin Console
        </Badge>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              System <span className="text-primary">Settings</span>
            </h1>
            <p className="text-muted-foreground text-lg font-medium mt-1">
              Global configuration and platform statistics.
            </p>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Stats Row */}
        <Card className="md:col-span-3 border-border/50 bg-card shadow-sm hover:shadow-md p-6 flex flex-col justify-between h-[160px] rounded-[2rem]">
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-2xl bg-muted/50 text-foreground">
              <Users className="h-6 w-6" />
            </div>
            <Badge variant="secondary" className="bg-muted text-muted-foreground border-none font-bold">Total</Badge>
          </div>
          <div>
            <div className="text-4xl font-black text-foreground">{stats.totalUsers}</div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Registered Users</p>
          </div>
        </Card>

        <Card className="md:col-span-3 border-border/50 bg-card shadow-sm hover:shadow-md p-6 flex flex-col justify-between h-[160px] rounded-[2rem]">
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Users className="h-6 w-6" />
            </div>
            <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-500 border-none font-bold">Active</Badge>
          </div>
          <div>
            <div className="text-4xl font-black text-foreground">{stats.totalStudents}</div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Students</p>
          </div>
        </Card>

        <Card className="md:col-span-3 border-border/50 bg-card shadow-sm hover:shadow-md p-6 flex flex-col justify-between h-[160px] rounded-[2rem]">
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
              <Palette className="h-6 w-6" />
            </div>
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-none font-bold">Live</Badge>
          </div>
          <div>
            <div className="text-4xl font-black text-foreground">{stats.totalEvents}</div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">Total Events</p>
          </div>
        </Card>

        <Card className="md:col-span-3 border-none bg-primary text-primary-foreground shadow-lg shadow-primary/20 p-6 flex flex-col justify-between h-[160px] rounded-[2rem]">
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-2xl bg-white/20 text-white">
              <SettingsIcon className="h-6 w-6" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-black text-white">{stats.totalRegistrations}</div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mt-1">Registrations</p>
          </div>
        </Card>

        {/* Configuration Section */}

        {/* Registration Limits (8 cols) */}
        <Card className="md:col-span-8 border-border/50 bg-card shadow-sm hover:shadow-md p-8 flex flex-col justify-center min-h-[300px] rounded-[2rem]">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-12 w-12 rounded-[1.5rem] bg-muted flex items-center justify-center text-foreground">
              <SettingsIcon className="h-6 w-6" />
            </div>
            <div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Registration Limits</h3>
                <p className="text-sm font-medium text-muted-foreground">Set maximum events per student.</p>
              </div>
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
                min="1"
                max="10"
                value={settings.maxOnStageRegistrations}
                onChange={(e) => setSettings(prev => ({ ...prev, maxOnStageRegistrations: parseInt(e.target.value) || 1 }))}
                className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                disabled={saving}
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Off-Stage Max</Label>
                <span className="text-2xl font-black text-indigo-500">{settings.maxOffStageRegistrations}</span>
              </div>
              <Input
                type="range"
                min="1"
                max="10"
                value={settings.maxOffStageRegistrations}
                onChange={(e) => setSettings(prev => ({ ...prev, maxOffStageRegistrations: parseInt(e.target.value) || 1 }))}
                className="w-full accent-indigo-500 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                disabled={saving}
              />
            </div>
          </div>
        </Card>

        {/* Toggles (4 cols) */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <Card className="border-border/50 bg-card shadow-sm hover:shadow-md p-6 flex-1 flex flex-col justify-between rounded-[2rem]">
            <div className="flex justify-between items-start">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${settings.autoApproveRegistrations ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                <Users className="h-5 w-5" />
              </div>
              <Switch
                checked={settings.autoApproveRegistrations}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoApproveRegistrations: checked }))}
                disabled={saving}
              />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-bold text-foreground">Auto-Approval</h3>
              <p className="text-xs font-medium text-muted-foreground">Instantly approve new registrations.</p>
            </div>
          </Card>

          <Card className="border-border/50 bg-card shadow-sm hover:shadow-md p-6 flex-1 flex flex-col justify-between rounded-[2rem]">
            <div className="flex justify-between items-start">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${settings.signUpEnabled ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                <Users className="h-5 w-5" />
              </div>
              <Switch
                checked={settings.signUpEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, signUpEnabled: checked }))}
                disabled={saving}
              />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-bold text-foreground">Public Sign-up</h3>
              <p className="text-xs font-medium text-muted-foreground">Allow new users to register accounts.</p>
            </div>
          </Card>
        </div>

      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={saveSettings}
          disabled={saving}
          size="lg"
          className="h-14 rounded-[2rem] px-12 font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
