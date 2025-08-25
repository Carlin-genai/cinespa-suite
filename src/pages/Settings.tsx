
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Database, Download, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    taskReminders: true,
    weeklyReports: true,
    darkMode: false,
    compactView: false,
    autoSave: true,
    taskSounds: false,
  });

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: 'Settings Updated',
      description: 'Your preferences have been saved.',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-montserrat text-foreground flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-luxury-gold" />
          Settings
        </h1>
        <p className="text-muted-foreground font-opensans mt-1">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-luxury-gold" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                defaultValue={user?.user_metadata?.full_name || ''}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                defaultValue={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select defaultValue="employee">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="gradient-gold text-charcoal-black">
            Save Profile Changes
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-luxury-gold" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive task updates via email</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="pushNotifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Browser push notifications</p>
              </div>
              <Switch
                id="pushNotifications"
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="taskReminders">Task Reminders</Label>
                <p className="text-sm text-muted-foreground">Reminder notifications for due tasks</p>
              </div>
              <Switch
                id="taskReminders"
                checked={settings.taskReminders}
                onCheckedChange={(checked) => handleSettingChange('taskReminders', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weeklyReports">Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">Weekly task completion summaries</p>
              </div>
              <Switch
                id="weeklyReports"
                checked={settings.weeklyReports}
                onCheckedChange={(checked) => handleSettingChange('weeklyReports', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat text-foreground flex items-center gap-2">
            <Palette className="h-5 w-5 text-luxury-gold" />
            Display Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="darkMode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Switch to dark theme</p>
              </div>
              <Switch
                id="darkMode"
                checked={settings.darkMode}
                onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="compactView">Compact View</Label>
                <p className="text-sm text-muted-foreground">Use compact layout for task cards</p>
              </div>
              <Switch
                id="compactView"
                checked={settings.compactView}
                onCheckedChange={(checked) => handleSettingChange('compactView', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="taskSounds">Task Sounds</Label>
                <p className="text-sm text-muted-foreground">Play sounds for task completion</p>
              </div>
              <Switch
                id="taskSounds"
                checked={settings.taskSounds}
                onCheckedChange={(checked) => handleSettingChange('taskSounds', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-luxury-gold" />
            Data & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoSave">Auto-save</Label>
              <p className="text-sm text-muted-foreground">Automatically save changes</p>
            </div>
            <Switch
              id="autoSave"
              checked={settings.autoSave}
              onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black">
              <Download className="mr-2 h-4 w-4" />
              Export My Data
            </Button>
            
            <Button variant="outline" className="w-full justify-start border-blocked-red text-blocked-red hover:bg-blocked-red hover:text-white">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-luxury-gold" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black">
            Change Password
          </Button>
          
          <Button variant="outline" className="w-full justify-start border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black">
            Two-Factor Authentication
          </Button>
          
          <Button variant="outline" className="w-full justify-start border-luxury-gold text-luxury-gold hover:bg-luxury-gold hover:text-charcoal-black">
            Active Sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
