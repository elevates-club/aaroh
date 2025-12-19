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
import { Plus } from 'lucide-react';
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
        <DialogHeader className="sr-only">
          <DialogTitle>Create Events Event</DialogTitle>
          <DialogDescription>
            Create a new game or athletic event for student registration
          </DialogDescription>
        </DialogHeader>
        <CreateEventForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
