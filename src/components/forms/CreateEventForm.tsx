import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Palette, Users, Layers, Layout, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { EVENT_CATEGORIES, EVENT_MODES, REGISTRATION_METHODS } from '@/lib/constants';

interface CreateEventFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface EventFormData {
  name: string;
  category: string;
  mode: string;
  registrationMethod: string;
  description: string;
  maxParticipants: string;
  maxEntriesPerYear: string;
  minTeamSize: string;
  maxTeamSize: string;
  registrationDeadline: Date | undefined;
  eventDate: Date | undefined;
  venue: string;
}

export function CreateEventForm({ onSuccess, onCancel }: CreateEventFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    category: EVENT_CATEGORIES.ON_STAGE,
    mode: EVENT_MODES.INDIVIDUAL,
    registrationMethod: REGISTRATION_METHODS.COORDINATOR,
    description: '',
    maxParticipants: '',
    maxEntriesPerYear: '3',
    minTeamSize: '1',
    maxTeamSize: '1',
    registrationDeadline: undefined,
    eventDate: undefined,
    venue: '',
  });

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // Auto-adjust fields based on mode
      if (field === 'mode') {
        if (value === EVENT_MODES.INDIVIDUAL) {
          newData.minTeamSize = '1';
          newData.maxTeamSize = '1';
          newData.maxEntriesPerYear = '3';
        } else {
          newData.maxEntriesPerYear = '1';
          newData.registrationMethod = REGISTRATION_METHODS.COORDINATOR;
        }
      }

      return newData;
    });
  };

  const handleDateChange = (field: 'registrationDeadline' | 'eventDate', date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Event name is required';
    if (!formData.description.trim()) return 'Description is required';
    if (!formData.venue.trim()) return 'Venue is required';
    if (formData.maxParticipants && parseInt(formData.maxParticipants) <= 0) {
      return 'Max participants must be a positive number';
    }
    if (formData.mode === EVENT_MODES.GROUP) {
      if (parseInt(formData.minTeamSize) <= 0 || parseInt(formData.maxTeamSize) <= 0) return 'Team sizes must be positive';
      if (parseInt(formData.minTeamSize) > parseInt(formData.maxTeamSize)) return 'Min team size cannot exceed max team size';
    }
    if (formData.registrationDeadline && formData.eventDate) {
      if (formData.registrationDeadline >= formData.eventDate) {
        return 'Registration deadline must be before event date';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('events').insert({
        name: formData.name.trim(),
        category: formData.category as any,
        mode: formData.mode as any,
        registration_method: formData.registrationMethod as any,
        description: formData.description.trim(),
        max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        max_entries_per_year: parseInt(formData.maxEntriesPerYear),
        min_team_size: parseInt(formData.minTeamSize),
        max_team_size: parseInt(formData.maxTeamSize),
        registration_deadline: formData.registrationDeadline?.toISOString(),
        event_date: formData.eventDate?.toISOString(),
        venue: formData.venue.trim(),
        created_by: profile?.id,
        is_active: true,
      });

      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: profile?.id,
        action: 'event_created',
        details: {
          event_name: formData.name,
          event_category: formData.category,
        },
      });

      toast({
        title: 'Success',
        description: `Event "${formData.name}" created successfully!`,
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error creating.event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Event Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Event Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Solo Dance, Painting"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => handleInputChange('category', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EVENT_CATEGORIES.ON_STAGE}>On-Stage</SelectItem>
              <SelectItem value={EVENT_CATEGORIES.OFF_STAGE}>Off-Stage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mode */}
        <div className="space-y-1.5">
          <Label htmlFor="mode">Mode *</Label>
          <Select
            value={formData.mode}
            onValueChange={(value) => handleInputChange('mode', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EVENT_MODES.INDIVIDUAL}>Individual</SelectItem>
              <SelectItem value={EVENT_MODES.GROUP}>Group</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Registration Method */}
        <div className="space-y-1.5">
          <Label htmlFor="registrationMethod">Registration Method *</Label>
          <Select
            value={formData.registrationMethod}
            onValueChange={(value) => handleInputChange('registrationMethod', value)}
            disabled={loading || formData.mode === EVENT_MODES.GROUP}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={REGISTRATION_METHODS.COORDINATOR}>Coordinator Only</SelectItem>
              <SelectItem value={REGISTRATION_METHODS.STUDENT}>Student Self-Reg</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Participation Limit per Year */}
        <div className="space-y-1.5">
          <Label htmlFor="maxEntriesPerYear">Entries per Year *</Label>
          <Input
            id="maxEntriesPerYear"
            type="number"
            value={formData.maxEntriesPerYear}
            onChange={(e) => handleInputChange('maxEntriesPerYear', e.target.value)}
            disabled={loading || formData.mode === EVENT_MODES.GROUP}
            min="1"
          />
        </div>
      </div>

      {formData.mode === EVENT_MODES.GROUP && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg border border-dashed border-primary/20">
          <div className="space-y-1.5">
            <Label htmlFor="minTeamSize">Min Team Size</Label>
            <Input
              id="minTeamSize"
              type="number"
              value={formData.minTeamSize}
              onChange={(e) => handleInputChange('minTeamSize', e.target.value)}
              disabled={loading}
              min="2"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxTeamSize">Max Team Size</Label>
            <Input
              id="maxTeamSize"
              type="number"
              value={formData.maxTeamSize}
              onChange={(e) => handleInputChange('maxTeamSize', e.target.value)}
              disabled={loading}
              min="2"
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Provide details about the event, rules, requirements, etc."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          disabled={loading}
          rows={2}
          className="min-h-[80px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="venue">Venue *</Label>
          <Input
            id="venue"
            placeholder="e.g., Auditorium"
            value={formData.venue}
            onChange={(e) => handleInputChange('venue', e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxParticipants">Global Cap</Label>
          <Input
            id="maxParticipants"
            type="number"
            placeholder="Unlimited"
            value={formData.maxParticipants}
            onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 flex flex-col">
          <Label>Registration Deadline</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.registrationDeadline && 'text-muted-foreground'
                )}
                disabled={loading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.registrationDeadline ? format(formData.registrationDeadline, 'PPP') : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.registrationDeadline}
                onSelect={(date) => handleDateChange('registrationDeadline', date)}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1.5 flex flex-col">
          <Label>Event Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !formData.eventDate && 'text-muted-foreground'
                )}
                disabled={loading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.eventDate ? format(formData.eventDate, 'PPP') : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.eventDate}
                onSelect={(date) => handleDateChange('eventDate', date)}
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-primary to-secondary">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />}
          Create Event
        </Button>
      </div>
    </form>
  );
}
