import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, CheckCircle, AlertTriangle } from 'lucide-react';

export type StatusFilterType = 'all' | 'pending' | 'in-progress' | 'completed' | 'overdue';

interface StatusFilterProps {
  activeFilter: StatusFilterType;
  onFilterChange: (filter: StatusFilterType) => void;
  counts: {
    pending: number;
    'in-progress': number;
    completed: number;
    overdue: number;
  };
}

const StatusFilter: React.FC<StatusFilterProps> = ({ activeFilter, onFilterChange, counts }) => {
  const filters = [
    {
      key: 'all' as StatusFilterType,
      label: 'All Tasks',
      icon: null,
      count: counts.pending + counts['in-progress'] + counts.completed + counts.overdue,
      variant: 'secondary' as const,
      activeClass: 'bg-primary text-primary-foreground'
    },
    {
      key: 'pending' as StatusFilterType,
      label: 'Pending',
      icon: Clock,
      count: counts.pending,
      variant: 'outline' as const,
      activeClass: 'bg-secondary text-secondary-foreground border-secondary'
    },
    {
      key: 'in-progress' as StatusFilterType,
      label: 'In Progress',
      icon: Play,
      count: counts['in-progress'],
      variant: 'outline' as const,
      activeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800'
    },
    {
      key: 'completed' as StatusFilterType,
      label: 'Completed',
      icon: CheckCircle,
      count: counts.completed,
      variant: 'outline' as const,
      activeClass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800'
    },
    {
      key: 'overdue' as StatusFilterType,
      label: 'Overdue',
      icon: AlertTriangle,
      count: counts.overdue,
      variant: 'outline' as const,
      activeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800'
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const IconComponent = filter.icon;
        const isActive = activeFilter === filter.key;
        
        return (
          <Button
            key={filter.key}
            variant={isActive ? 'default' : filter.variant}
            size="sm"
            onClick={() => onFilterChange(filter.key)}
            className={`flex items-center gap-2 ${isActive ? filter.activeClass : ''} transition-all duration-200`}
          >
            {IconComponent && <IconComponent className="h-4 w-4" />}
            <span>{filter.label}</span>
            <Badge 
              variant="secondary" 
              className={`ml-1 ${isActive ? 'bg-white/20 text-current' : 'bg-muted text-muted-foreground'}`}
            >
              {filter.count}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
};

export default StatusFilter;