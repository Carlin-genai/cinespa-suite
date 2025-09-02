
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface RoleSelectionProps {
  onRoleSelected: () => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelected }) => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'employee' | null>(null);
  const [loading, setLoading] = useState(false);
  const { updateProfile, user } = useAuth();
  const { toast } = useToast();

  const handleRoleSelection = async () => {
    if (!selectedRole || !user) return;

    setLoading(true);
    try {
      const { error } = await updateProfile({
        role: selectedRole,
        full_name: user.user_metadata?.full_name || user.email || '',
        email: user.email || '',
      });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to set role. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Welcome!',
          description: `Your role has been set as ${selectedRole}.`,
        });
        onRoleSelected();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'admin' as const,
      title: 'Administrator',
      description: 'Manage teams, assign tasks, and oversee operations',
      icon: Shield,
      features: [
        'Create and assign tasks to employees',
        'View all team tasks and progress',
        'Access analytics and reports',
        'Manage team members',
        'Verify completed tasks'
      ]
    },
    {
      id: 'employee' as const,
      title: 'Employee',
      description: 'Complete assigned tasks and manage your personal workflow',
      icon: Users,
      features: [
        'View and update assigned tasks',
        'Create personal self-tasks',
        'Track your progress and deadlines',
        'Collaborate with team members',
        'Access your performance analytics'
      ]
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Mark Technologies</h1>
          <p className="text-muted-foreground">Please select your role to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;

            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  isSelected 
                    ? 'ring-2 ring-rose-400 shadow-lg shadow-rose-400/20' 
                    : 'hover:shadow-rose-400/10'
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${
                        isSelected ? 'bg-rose-400 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{role.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-6 w-6 text-rose-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {role.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-rose-400 rounded-full" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            onClick={handleRoleSelection}
            disabled={!selectedRole || loading}
            className="bg-rose-400 hover:bg-rose-500 text-white px-8 py-2"
          >
            {loading ? 'Setting up your account...' : 'Continue'}
          </Button>
          {selectedRole && (
            <p className="text-sm text-muted-foreground mt-2">
              You selected: <Badge variant="secondary" className="bg-rose-100 text-rose-700">{selectedRole}</Badge>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
