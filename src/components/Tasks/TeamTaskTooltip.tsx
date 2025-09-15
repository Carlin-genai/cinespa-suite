import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Users, User } from 'lucide-react';
import { GroupedTeamTask } from '@/lib/teamTaskUtils';
import { useTeamMemberProfiles } from '@/hooks/useTeamMemberProfiles';

interface TeamTaskTooltipProps {
  teamTask: GroupedTeamTask;
  children: React.ReactNode;
}

const TeamTaskTooltip: React.FC<TeamTaskTooltipProps> = ({ teamTask, children }) => {
  const memberIds = teamTask.members.map(m => m.id).filter(Boolean);
  const { data: profiles = [] } = useTeamMemberProfiles(memberIds);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-completed-green text-white';
      case 'in-progress': return 'bg-progress-blue text-white';
      case 'overdue': return 'bg-overdue-red text-white';
      case 'pending': return 'bg-pending-yellow text-foreground';
      default: return 'bg-not-started-beige text-foreground';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-gold" />
              <span className="font-medium text-sm">Team Members ({teamTask.memberCount})</span>
            </div>
            <div className="space-y-2">
              {teamTask.members.map((member, index) => {
                const profile = profiles.find(p => p?.id === member.id);
                const displayName = profile?.full_name || profile?.email || `Member ${index + 1}`;
                
                return (
                  <div key={member.id || index} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs truncate" title={displayName}>
                        {displayName}
                      </span>
                    </div>
                    <Badge 
                      className={`text-xs px-2 py-0.5 ${getStatusColor(member.status)}`}
                    >
                      {member.status.replace('-', ' ')}
                    </Badge>
                  </div>
                );
              })}
            </div>
            {teamTask.members.length === 0 && (
              <p className="text-xs text-muted-foreground">No members assigned</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TeamTaskTooltip;