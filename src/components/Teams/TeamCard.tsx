import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Edit2, Trash2 } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Team {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  team_members: TeamMember[];
}

interface TeamCardProps {
  team: Team;
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onEdit, onDelete }) => {
  const memberCount = team.team_members?.length || 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="font-montserrat text-lg mb-1">
              {team.name}
            </CardTitle>
            {team.description && (
              <p className="text-sm text-muted-foreground font-opensans line-clamp-2">
                {team.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(team)}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(team.id)}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Members Count */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="font-opensans">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Badge>
          </div>

          {/* Members Preview */}
          {memberCount > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Members
              </p>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {team.team_members.slice(0, 4).map((member) => (
                    <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.profiles?.full_name || member.profiles?.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {memberCount > 4 && (
                    <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs font-medium">+{memberCount - 4}</span>
                    </div>
                  )}
                </div>
                {memberCount <= 4 && (
                  <div className="text-xs text-muted-foreground">
                    {team.team_members.slice(0, 2).map(member => 
                      member.profiles?.full_name || member.profiles?.email
                    ).join(', ')}
                    {memberCount > 2 && ` +${memberCount - 2} more`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Created Date */}
          <div className="text-xs text-muted-foreground">
            Created {new Date(team.created_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamCard;