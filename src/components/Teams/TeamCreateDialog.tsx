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
import { motion } from 'framer-motion';
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
  const [searchTerm, setSearchTerm] = useState('');

  // Real-time sync for teams and users
  useTeamsRealTimeSync();
  useUsersRealTimeSync();

  // Fetch available users with optimized caching and real-time sync
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('[TeamCreateDialog] Fetching users...');
      const result = await supabaseApi.getUsers();
      console.log('[TeamCreateDialog] Users fetched:', result.length, result);
      return result;
    },
    enabled: open,
    staleTime: 1000 * 60 * 3, // 3 minutes caching for users
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  // Log users error if any
  if (usersError) {
    console.error('[TeamCreateDialog] Users fetch error:', usersError);
  }

    const handleSave = () => {
      console.log('[TeamCreateDialog] Attempting to save team:', { name, description, memberIds: selectedMembers, teamHeadId: teamHead });

      const trimmedName = name.trim();
      const trimmedDesc = description.trim();

      if (!trimmedName) {
        toast({ title: "Error", description: "Team name is required", variant: "destructive" });
        return;
      }

      if (!trimmedDesc) {
        toast({ title: "Error", description: "Description is required", variant: "destructive" });
        return;
      }

      if (!teamHead) {
        toast({ title: "Error", description: "Please select a Team Head", variant: "destructive" });
        return;
      }

      if (selectedMembers.length === 0) {
        toast({ title: "Error", description: "Select at least one team member", variant: "destructive" });
        return;
      }

      try {
        // Ensure head is included in members
        const members = selectedMembers.includes(teamHead)
          ? selectedMembers
          : [...selectedMembers, teamHead];

        onSave({
          name: trimmedName,
          description: trimmedDesc,
          memberIds: members,
          teamHeadId: teamHead,
        });

        // Reset form
        setName('');
        setDescription('');
        setSelectedMembers([]);
        setTeamHead('');
        setSearchTerm('');
      } catch (error) {
        console.error('[TeamCreateDialog] Error in handleSave:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create team. Please try again.",
          variant: "destructive",
        });
      }
    };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setSelectedMembers([]);
    setTeamHead('');
    setSearchTerm('');
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-montserrat">Create New Team</DialogTitle>
        </DialogHeader>

        <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.2 }} className="space-y-6">
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
                required
              />
            </div>

            <div>
              <Label htmlFor="team-description" className="font-opensans font-medium">
                Description *
              </Label>
              <Textarea
                id="team-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter team description"
                className="mt-1"
                rows={3}
                required
              />
            </div>
          </div>

          {/* Team Head Selection */}
          <div className="space-y-2">
            <Label className="font-opensans font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Team Head (Required)
            </Label>
            <Select value={teamHead || 'none'} onValueChange={(v) => {
              const newHeadId = v === 'none' ? '' : v;
              setTeamHead(newHeadId);
              
              // Auto-include selected head in team members if not already included
              if (newHeadId && !selectedMembers.includes(newHeadId)) {
                setSelectedMembers(prev => [...prev, newHeadId]);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select team head..." />
              </SelectTrigger>
              <SelectContent className="z-[1000] bg-background border shadow-md">
                <SelectItem value="none">No team head</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Crown className="h-3 w-3 text-amber-500" />
                      {user.full_name || user.email}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamHead && (
              <p className="text-xs text-green-600">
                {selectedMembers.includes(teamHead) ? 
                  `${users.find(u => u.id === teamHead)?.full_name || users.find(u => u.id === teamHead)?.email} will be the team head` :
                  `${users.find(u => u.id === teamHead)?.full_name || users.find(u => u.id === teamHead)?.email} was automatically added as team member`
                }
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
              <PopoverContent className="w-full max-h-72 overflow-y-auto z-[1000] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Search employees..." 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    {(() => {
                      const filteredUsers = users.filter((user) => {
                        if (!searchTerm) return true;
                        const name = user.full_name?.toLowerCase() || '';
                        const email = user.email?.toLowerCase() || '';
                        return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
                      });
                      
                      console.log('[TeamCreateDialog] Filtered users:', filteredUsers.length, 'from total:', users.length, 'searchTerm:', searchTerm);
                      
                      if (filteredUsers.length === 0) {
                        return (
                          <CommandEmpty>
                            {users.length === 0 ? "No employees found." : "No employees match your search."}
                          </CommandEmpty>
                        );
                      }
                      
                      return (
                        <CommandGroup>
                          {filteredUsers.map((user) => {
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
                      );
                    })()}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>

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
    </motion.div>
  );
};

export default TeamCreateDialog;