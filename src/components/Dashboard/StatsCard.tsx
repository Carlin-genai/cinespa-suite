
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

const StatsCard = ({ title, value, change, icon: Icon, trend = 'neutral', className }: StatsCardProps) => {
  return (
    <Card className={cn("transition-all duration-300 hover:shadow-lg hover:shadow-rose-gold/20 animate-fade-in", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-opensans text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4" style={{ color: 
          title.toLowerCase().includes('completed') ? 'hsl(120, 100%, 0.8%)' :
          title.toLowerCase().includes('progress') ? 'hsl(206.6, 89.7%, 54.1%)' :
          title.toLowerCase().includes('overdue') ? 'hsl(9.4, 100%, 50%)' :
          'hsl(var(--rose-gold))'
        }} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-montserrat text-rose-gold-contrast">
          {value}
        </div>
        {change && (
          <p className={cn(
            "text-xs font-opensans mt-1",
            trend === 'up' ? 'text-completed-green' : 
            trend === 'down' ? 'text-overdue-red' : 
            'text-muted-foreground'
          )}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
