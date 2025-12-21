import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit, Palette } from 'lucide-react';
import { EditEventForm } from './EditEventForm';

interface Event {
  id: string;
  name: string;
  category: 'on_stage' | 'off_stage';
  mode: string;
  registration_method: string;
  description: string;
  max_participants: number | null;
  max_entries_per_year: number | null;
  min_team_size: number | null;
  max_team_size: number | null;
  registration_deadline: string | null;
  event_date: string | null;
  venue: string;
  created_at: string;
  is_active: boolean;
}

interface EditEventDialogProps {
  event: Event;
  onEventUpdated?: () => void;
  trigger?: React.ReactNode;
}

export function EditEventDialog({ event, onEventUpdated, trigger }: EditEventDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onEventUpdated?.();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
      <Edit className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Palette className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-xl">Edit Event</DialogTitle>
          </div>
          <DialogDescription>
            Update the configuration for "{event.name}"
          </DialogDescription>
        </DialogHeader>
        <EditEventForm event={event} onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
