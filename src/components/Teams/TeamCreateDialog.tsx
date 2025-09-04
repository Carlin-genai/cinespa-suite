import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';
import { useToast } from '@/hooks/use-toast';

interface TeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (team: { name: string; description?: string; memberIds: string[] }) => void;
}

const TeamCreateDialog: React.FC<TeamCreateDialogProps> = ({
  open,
  onOpenChange,
  onSave,
}) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Fetch available users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => supabaseApi.getUsers(),
    enabled: open,
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      memberIds: selectedMembers,
    });

    // Reset form
    setName('');
    setDescription('');
    setSelectedMembers([]);
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setSelectedMembers([]);
    onOpenChange(false);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-montserrat">Create New Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="team-name" className="font-opensans font-medium">
                Team Name *
              </Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter team name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="team-description" className="font-opensans font-medium">
                Description
              </Label>
              <Textarea
                id="team-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter team description (optional)"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Team Members Selection */}
          <div className="space-y-4">
            <Label className="font-opensans font-medium">
              Team Members ({selectedMembers.length} selected)
            </Label>
            
            {usersLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-gold mx-auto"></div>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-3">
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No users available
                  </p>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedMembers.includes(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
                      />
                      <Label
                        htmlFor={`user-${user.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div>
                          <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          {user.role && (
                            <div className="text-xs text-muted-foreground capitalize">
                              {user.role}
                            </div>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-rose-gold hover:bg-rose-gold-dark text-white"
          >
            Create Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamCreateDialog;