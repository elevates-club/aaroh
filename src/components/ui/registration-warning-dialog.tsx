import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Palette, X } from 'lucide-react';

interface StudentLimitInfo {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  year: string;
  currentCount: number;
  limit: number;
  registrations: Array<{
    event_name: string;
    category: 'on_stage' | 'off_stage';
  }>;
}

interface RegistrationWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentLimitInfo[];
  category: 'on_stage' | 'off_stage';
  eventName: string;
  onConfirm: () => void;
  onCancel: () => void;
  userRole: 'coordinator' | 'admin';
}

export function RegistrationWarningDialog({
  open,
  onOpenChange,
  students,
  category,
  eventName,
  onConfirm,
  onCancel,
  userRole
}: RegistrationWarningDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const getYearColor = (year: string) => {
    switch (year) {
      case 'first': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'second': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'third': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'fourth': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getYearLabel = (year: string) => {
    switch (year) {
      case 'first': return 'First Year';
      case 'second': return 'Second Year';
      case 'third': return 'Third Year';
      case 'fourth': return 'Fourth Year';
      default: return year;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Registration Limit Warning
              </DialogTitle>
              <DialogDescription className="text-base">
                {userRole === 'coordinator' 
                  ? 'The following students have reached their registration limit for this type of event.'
                  : 'The following students have exceeded their registration limit for this type of event.'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Event Info */}
          <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="h-5 w-5 text-primary" />
              <span className="font-medium">{eventName}</span>
              <Badge variant="outline" className="ml-auto">
                {category === 'on_stage' ? 'Team Event' : 'Athletic Event'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {userRole === 'coordinator' 
                ? 'These students cannot be registered due to limit restrictions.'
                : 'These students have exceeded their allowed registrations.'
              }
            </p>
          </div>

          {/* Students List */}
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="p-4 border rounded-lg bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{student.name}</h4>
                      <p className="text-sm text-muted-foreground font-mono">
                        {student.roll_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getYearColor(student.year)}>
                      {getYearLabel(student.year)}
                    </Badge>
                    <div className="mt-2">
                      <Badge 
                        variant={userRole === 'admin' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {student.currentCount}/{student.limit} {category === 'on_stage' ? 'Games' : 'Athletics'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Current Registrations */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-medium mb-2">Current {category === 'on_stage' ? 'Game' : 'Athletic'} Registrations:</p>
                  <div className="flex flex-wrap gap-2">
                    {student.registrations.length > 0 ? (
                      student.registrations.map((reg, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {reg.event_name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No registrations</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isConfirming}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            variant={userRole === 'admin' ? 'default' : 'destructive'}
            className="w-full sm:w-auto"
          >
            {isConfirming ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                {userRole === 'coordinator' ? 'Continue Anyway' : 'Proceed with Registration'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
