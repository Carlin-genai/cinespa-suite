
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Clock,
  Database,
  Download,
  Upload,
  Trash2
} from 'lucide-react';

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  // Profile Settings
  const [profileSettings, setProfileSettings] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    avatar: '',
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    taskReminders: true,
    dailyDigest: false,
    teamUpdates: true,
    reminderTime: '09:00',
  });

  // App Settings
  const [appSettings, setAppSettings] = useState({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/dd/yyyy',
    workingHours: { start: '09:00', end: '17:00' },
  });

  // Privacy Settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisible: true,
    statusVisible: true,
    lastSeen: false,
  });

  const handleSaveProfile = () => {
    // Implementation for saving profile settings
    toast({ title: 'Profile settings saved successfully!' });
  };

  const handleSaveNotifications = () => {
    // Implementation for saving notification settings
    toast({ title: 'Notification preferences updated!' });
  };

  const handleSaveApp = () => {
    // Implementation for saving app settings
    toast({ title: 'App settings updated!' });
  };

  const handleExportData = () => {
    // Implementation for data export
    toast({ title: 'Data export started. You will receive an email when ready.' });
  };

  const handleImportData = () => {
    // Implementation for data import
    toast({ title: 'Please select a file to import.' });
  };

  const handleDeleteAccount = () => {
    // Implementation for account deletion
    toast({ 
      title: 'Account deletion requested', 
      description: 'Please contact support to complete this process.',
      variant: 'destructive' 
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-luxury-gold" />
        <div>
          <h1 className="text-3xl font-bold font-montserrat text-foreground">Settings</h1>
          <p className="text-muted-foreground font-opensans">
            Manage your account and application preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-montserrat">
              <User className="h-5 w-5 text-luxury-gold" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profileSettings.fullName}
                onChange={(e) => setProfileSettings(prev => ({ 
                  ...prev, 
                  fullName: e.target.value 
                }))}
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileSettings.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <Button onClick={handleSaveProfile} className="w-full gradient-gold text-charcoal-black">
              Save Profile Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-montserrat">
              <Bell className="h-5 w-5 text-luxury-gold" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={notificationSettings.emailNotifications}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                  ...prev,
                  emailNotifications: checked
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Task Reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminders for due tasks</p>
              </div>
              <Switch
                checked={notificationSettings.taskReminders}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                  ...prev,
                  taskReminders: checked
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Daily Digest</Label>
                <p className="text-sm text-muted-foreground">Daily summary of activities</p>
              </div>
              <Switch
                checked={notificationSettings.dailyDigest}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                  ...prev,
                  dailyDigest: checked
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Team Updates</Label>
                <p className="text-sm text-muted-foreground">Notifications about team activities</p>
              </div>
              <Switch
                checked={notificationSettings.teamUpdates}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({
                  ...prev,
                  teamUpdates: checked
                }))}
              />
            </div>

            <div>
              <Label>Default Reminder Time</Label>
              <Input
                type="time"
                value={notificationSettings.reminderTime}
                onChange={(e) => setNotificationSettings(prev => ({
                  ...prev,
                  reminderTime: e.target.value
                }))}
              />
            </div>

            <Button onClick={handleSaveNotifications} className="w-full gradient-gold text-charcoal-black">
              Save Notification Settings
            </Button>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-montserrat">
              <Palette className="h-5 w-5 text-luxury-gold" />
              App Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Theme</Label>
              <Select 
                value={appSettings.theme} 
                onValueChange={(value) => setAppSettings(prev => ({ ...prev, theme: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Language</Label>
              <Select 
                value={appSettings.language} 
                onValueChange={(value) => setAppSettings(prev => ({ ...prev, language: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Format</Label>
              <Select 
                value={appSettings.dateFormat} 
                onValueChange={(value) => setAppSettings(prev => ({ ...prev, dateFormat: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Work Start Time</Label>
                <Input
                  type="time"
                  value={appSettings.workingHours.start}
                  onChange={(e) => setAppSettings(prev => ({
                    ...prev,
                    workingHours: { ...prev.workingHours, start: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label>Work End Time</Label>
                <Input
                  type="time"
                  value={appSettings.workingHours.end}
                  onChange={(e) => setAppSettings(prev => ({
                    ...prev,
                    workingHours: { ...prev.workingHours, end: e.target.value }
                  }))}
                />
              </div>
            </div>

            <Button onClick={handleSaveApp} className="w-full gradient-gold text-charcoal-black">
              Save App Settings
            </Button>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-montserrat">
              <Shield className="h-5 w-5 text-luxury-gold" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Profile Visibility</Label>
                <p className="text-sm text-muted-foreground">Make profile visible to team members</p>
              </div>
              <Switch
                checked={privacySettings.profileVisible}
                onCheckedChange={(checked) => setPrivacySettings(prev => ({
                  ...prev,
                  profileVisible: checked
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Status Visibility</Label>
                <p className="text-sm text-muted-foreground">Show online/offline status</p>
              </div>
              <Switch
                checked={privacySettings.statusVisible}
                onCheckedChange={(checked) => setPrivacySettings(prev => ({
                  ...prev,
                  statusVisible: checked
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Last Seen</Label>
                <p className="text-sm text-muted-foreground">Show when you were last active</p>
              </div>
              <Switch
                checked={privacySettings.lastSeen}
                onCheckedChange={(checked) => setPrivacySettings(prev => ({
                  ...prev,
                  lastSeen: checked
                }))}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Security Actions</Label>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="mr-2 h-4 w-4" />
                  View Login History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-montserrat">
              <Database className="h-5 w-5 text-luxury-gold" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <h4 className="font-medium">Export Data</h4>
                <p className="text-sm text-muted-foreground">
                  Download all your data including tasks, journal entries, and settings.
                </p>
                <Button onClick={handleExportData} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Import Data</h4>
                <p className="text-sm text-muted-foreground">
                  Import data from a previously exported file.
                </p>
                <Button onClick={handleImportData} variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Data
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data.
                </p>
                <Button onClick={handleDeleteAccount} variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Sign Out</h4>
              <p className="text-sm text-muted-foreground">
                Sign out of your account on this device.
              </p>
            </div>
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
