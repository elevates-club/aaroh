import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegistrationLimitBadgeProps {
  currentCount: number;
  limit: number;
  eventType: 'on_stage' | 'off_stage';
  className?: string;
  showIcon?: boolean;
}

export function RegistrationLimitBadge({
  currentCount,
  limit,
  eventType,
  className,
  showIcon = true
}: RegistrationLimitBadgeProps) {
  const isAtLimit = currentCount >= limit;
  const isOverLimit = currentCount > limit;
  const isNearLimit = currentCount >= limit * 0.8; // 80% of limit

  const getStatus = () => {
    if (isOverLimit) return 'over';
    if (isAtLimit) return 'at-limit';
    if (isNearLimit) return 'near-limit';
    return 'ok';
  };

  const status = getStatus();

  const getBadgeProps = () => {
    switch (status) {
      case 'over':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
          icon: <XCircle className="h-3 w-3" />,
          text: `${currentCount}/${limit} (Exceeded)`
        };
      case 'at-limit':
        return {
          variant: 'secondary' as const,
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
          icon: <AlertTriangle className="h-3 w-3" />,
          text: `${currentCount}/${limit} (At Limit)`
        };
      case 'near-limit':
        return {
          variant: 'outline' as const,
          className: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
          icon: <AlertTriangle className="h-3 w-3" />,
          text: `${currentCount}/${limit} (Near Limit)`
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800',
          icon: <CheckCircle className="h-3 w-3" />,
          text: `${currentCount}/${limit}`
        };
    }
  };

  const badgeProps = getBadgeProps();

  return (
    <Badge
      variant={badgeProps.variant}
      className={cn(
        'text-xs font-medium flex items-center gap-1',
        badgeProps.className,
        className
      )}
    >
      {showIcon && badgeProps.icon}
      <span>
        {badgeProps.text} {eventType === 'on_stage' ? 'On-Stage' : 'Off-Stage'}
      </span>
    </Badge>
  );
}
