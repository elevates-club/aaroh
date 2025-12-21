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
import { Plus, Palette } from 'lucide-react';
import { CreateEventForm } from './CreateEventForm';

interface CreateEventDialogProps {
  onEventCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CreateEventDialog({ onEventCreated, trigger }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onEventCreated?.();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const defaultTrigger = (
    <Button className="bg-gradient-to-r from-primary to-secondary">
      <Plus className="mr-2 h-4 w-4" /> Create Event
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
            <DialogTitle className="text-xl">Create Event</DialogTitle>
          </div>
          <DialogDescription>
            Configure a new AAROH event for students and coordinators
          </DialogDescription>
        </DialogHeader>
        <CreateEventForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
