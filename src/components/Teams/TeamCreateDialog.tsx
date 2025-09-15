import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useQuery } from '@tanstack/react-query';
import { supabaseApi } from '@/lib/supabaseApi';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeamsRealTimeSync, useUsersRealTimeSync } from '@/hooks/useRealTimeSync';
import { Check, ChevronDown, X, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (team: { name: string; description?: string; memberIds: string[]; teamHeadId?: string }) => void;
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
  const [teamHead, setTeamHead] = useState<string>('');

  // Real-time sync for teams and users
  useTeamsRealTimeSync();
  useUsersRealTimeSync();

  // Fetch available users with optimized caching and real-time sync
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => supabaseApi.getUsers(),
    enabled: open,
    staleTime: 1000 * 60 * 3, // 3 minutes caching for users
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
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
      teamHeadId: teamHead,
    });

    // Reset form
    setName('');
    setDescription('');
    setSelectedMembers([]);
    setTeamHead('');
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setSelectedMembers([]);
    setTeamHead('');
    onOpenChange(false);
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(id => id !== userId));
  };

  const addMember = (userId: string) => {
    setSelectedMembers(prev => [...prev, userId]);
  };

  const selectedUsers = users.filter(user => selectedMembers.includes(user.id));
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

          {/* Team Head Selection */}
          <div className="space-y-2">
            <Label className="font-opensans font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Team Head (Optional)
            </Label>
            <Select value={teamHead || 'none'} onValueChange={(v) => setTeamHead(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select team head..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team head</SelectItem>
                {users.filter(user => selectedMembers.includes(user.id)).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Crown className="h-3 w-3 text-amber-500" />
                      {user.full_name || user.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamHead && !selectedMembers.includes(teamHead) && (
              <p className="text-xs text-amber-600">
                Team head must be selected as a team member first
              </p>
            )}
          </div>

          {/* Team Members Selection */}
          <div className="space-y-4">
            <Label className="font-opensans font-medium">
              Team Members ({selectedMembers.length} selected)
            </Label>
            
            {/* Selected Members Display */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/50">
                {selectedUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                    {user.full_name || user.email}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeMember(user.id)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {/* Multi-Select Dropdown */}
            <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={dropdownOpen}
                  className="w-full justify-between"
                  disabled={usersLoading}
                >
                  {usersLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Loading employees...
                    </div>
                  ) : (
                    "Select team members..."
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search employees..." />
                  <CommandList>
                    <CommandEmpty>No employees found.</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => {
                        const isSelected = selectedMembers.includes(user.id);
                        return (
                          <CommandItem
                            key={user.id}
                            value={user.full_name || user.email}
                            onSelect={() => {
                              if (isSelected) {
                                removeMember(user.id);
                              } else {
                                addMember(user.id);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">
                                {user.full_name || 'Unnamed User'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                              {user.role && (
                                <div className="text-xs text-muted-foreground capitalize">
                                  {user.role}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Create Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamCreateDialog;