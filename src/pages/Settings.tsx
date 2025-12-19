import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure system-wide settings and view statistics
        </p>
      </div>

      {/* System Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">In database</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Palette className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Events available</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registrations</CardTitle>
            <SettingsIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
            <p className="text-xs text-muted-foreground">Total registrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Registration Limits
          </CardTitle>
          <CardDescription>
            Set the maximum number of events a student can register for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxOnStageRegistrations">
                    Maximum On-Stage Registrations per Student
                  </Label>
                  <Input
                    id="maxOnStageRegistrations"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxOnStageRegistrations}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maxOnStageRegistrations: parseInt(e.target.value) || 1
                    }))}
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Students can register for up to this many on-stage events
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxOffStageRegistrations">
                    Maximum Off-Stage Registrations per Student
                  </Label>
                  <Input
                    id="maxOffStageRegistrations"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxOffStageRegistrations}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      maxOffStageRegistrations: parseInt(e.target.value) || 1
                    }))}
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground">
                    Students can register for up to this many off-stage events
                  </p>
                </div>
              </div>

              <Separator />

              {/* Auto Approve Setting */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoApprove">Auto Approve Registrations</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, all new registrations will be automatically approved
                    </p>
                  </div>
                  <Switch
                    id="autoApprove"
                    checked={settings.autoApproveRegistrations}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      autoApproveRegistrations: checked
                    }))}
                    disabled={saving}
                  />
                </div>
              </div>

              <Separator />

              {/* Sign Up Setting */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="signUpEnabled">Enable User Sign Up</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, new users can create accounts through the sign-up form
                    </p>
                  </div>
                  <Switch
                    id="signUpEnabled"
                    checked={settings.signUpEnabled}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      signUpEnabled: checked
                    }))}
                    disabled={saving}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  onClick={saveSettings}
                  disabled={saving}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Additional Settings Card for Future Features */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Current system configuration and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Database Status</h4>
              <p className="text-sm text-muted-foreground">Connected and operational</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Last Updated</h4>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
