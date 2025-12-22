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
import { AddStudentForm } from './AddStudentForm';

interface AddStudentDialogProps {
  onStudentAdded?: () => void;
  trigger?: React.ReactNode;
}

export function AddStudentDialog({ onStudentAdded, trigger }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onStudentAdded?.();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const defaultTrigger = (
    <Button className="w-full sm:w-auto">
      <Plus className="mr-2 h-4 w-4" />
      <span className="hidden xs:inline">Add Student</span>
      <span className="xs:hidden">Add</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Add a new student to the system with their details
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[95vh] p-3 sm:p-6">
          <AddStudentForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
