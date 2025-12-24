import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Calendar, MapPin, Users, Clock, Search, Filter, Loader2, Download, Edit, Layout, Layers, Trash2, Trophy } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES, EVENT_CATEGORIES, EVENT_MODES, REGISTRATION_METHODS } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { logEventActivity } from '@/utils/activityLogger';
import { CreateEventDialog } from '@/components/forms/CreateEventDialog';
import { EditEventDialog } from '@/components/forms/EditEventDialog';
import { StudentRegistrationDialog } from '@/components/forms/StudentRegistrationDialog';
import { StudentSelfRegistrationDialog } from '@/components/forms/StudentSelfRegistrationDialog';
import { RegistrationStats } from '@/components/RegistrationStats';
import { EventDetailsDialog } from '@/components/dialogs/EventDetailsDialog';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

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

export default function Events() {
  const { profile } = useAuth();
  const { activeRole } = useRole();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);

  const [globalRegistrationOpen, setGlobalRegistrationOpen] = useState(true);
  const [scoreboardVisible, setScoreboardVisible] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchGlobalSettings();
  }, []);

  const fetchGlobalSettings = async () => {
    try {
      const { data: regData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'global_registration_open')
        .single();

      if (regData) {
        const val = regData.value as any;
        setGlobalRegistrationOpen(val?.enabled !== false);
      }

      const { data: scoreData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'scoreboard_visible')
        .single();

      if (scoreData) {
        const val = scoreData.value as any;
        setScoreboardVisible(val?.enabled === true);
      }
    } catch (error) {
      console.error("Error fetching global settings:", error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEventUpdate = () => {
    fetchEvents();
  };

  const handleRegistrationComplete = () => {
    toast({
      title: 'Registration Updated',
      description: 'Your registration status has been updated.',
    });
  };

  const handleDownloadEventPDF = async (event: Event) => {
    try {
      setPdfDownloadingId(event.id);
      const { generateEventParticipantsPDF } = await import('@/utils/pdfGeneratorV2');
      await generateEventParticipantsPDF(event as any, activeRole);
      toast({
        title: 'PDF Downloaded',
        description: `Participants list for ${event.name} has been downloaded.`,
      });

      if (profile?.id) {
        await logEventActivity(profile.id, 'event_updated', {
          event_id: event.id,
          event_name: event.name,
          action_detail: 'Downloaded participants list PDF'
        });
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download participants list.',
        variant: 'destructive',
      });
    } finally {
      setPdfDownloadingId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Event Deleted',
        description: 'The event has been successfully removed.',
      });

      if (profile?.id) {
        await logEventActivity(profile.id, 'event_deleted', {
          event_id: eventId,
          event_name: events.find(e => e.id === eventId)?.name || 'Unknown'
        });
      }

      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case EVENT_CATEGORIES.ON_STAGE: return 'bg-purple-500/10 text-purple-600 border-purple-200/50';
      case EVENT_CATEGORIES.OFF_STAGE: return 'bg-amber-500/10 text-amber-600 border-amber-200/50';
      default: return 'bg-muted text-muted-foreground border-border/50';
    }
  };

  const isRegistrationOpen = (deadline: string | null) => {
    if (!deadline) return true;
    return new Date(deadline) > new Date();
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'open' && isRegistrationOpen(event.registration_deadline)) ||
      (statusFilter === 'closed' && !isRegistrationOpen(event.registration_deadline));

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-[#facc15]/20 p-6 sm:p-8 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-[#facc15]/5 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 text-white">
                  AAROH <span className="text-[#facc15]">Events</span>
                </h1>
                <p className="text-gray-300 text-sm sm:text-base max-w-2xl">
                  Browse and register for arts, culture, and events competitions.
                  Remember: max 3 individual entries per year.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {(hasRole(activeRole, USER_ROLES.ADMIN) || hasRole(activeRole, USER_ROLES.EVENT_MANAGER)) && (
                  <CreateEventDialog onEventCreated={handleEventUpdate} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/50 shadow-sm bg-card rounded-[2rem]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search events..."
                    className="pl-10 h-11 bg-background border-border"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] h-11">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value={EVENT_CATEGORIES.ON_STAGE}>On-Stage</SelectItem>
                      <SelectItem value={EVENT_CATEGORIES.OFF_STAGE}>Off-Stage</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px] h-11">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-[2rem] border border-border/50 shadow-sm">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-xl font-semibold text-foreground">No events found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col bg-card rounded-[2rem]">
                <div className="p-6 flex-1 flex flex-col space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight truncate text-foreground">{event.name}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={`${getCategoryColor(event.category)} border-0`}>
                          {event.category?.replace('_', '-') || 'Event'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {event.mode}
                        </Badge>
                      </div>
                    </div>

                    {(hasRole(activeRole, USER_ROLES.ADMIN) || hasRole(activeRole, USER_ROLES.EVENT_MANAGER)) && scoreboardVisible && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-yellow-500/10 hover:text-yellow-600"
                          title="Manage Results"
                          onClick={() => window.location.href = `/admin/events/${event.id}/results`}
                        >
                          <Trophy className="h-4 w-4" />
                        </Button>
                        <EditEventDialog
                          event={event}
                          onEventUpdated={handleEventUpdate}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
                              <Edit className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the event
                                and remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteEvent(event.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Event
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                      {event.description}
                    </p>
                    <EventDetailsDialog event={event} getCategoryColor={getCategoryColor} />
                  </div>

                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{event.venue || 'TBA'}</span>
                    </div>
                    {event.event_date && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{format(new Date(event.event_date), 'PPP')}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    {!hasRole(activeRole, USER_ROLES.STUDENT) && (
                      <RegistrationStats
                        eventId={event.id}
                        maxParticipants={event.max_participants}
                        event={event as any}
                        onRegistrationUpdate={handleRegistrationComplete}
                      />
                    )}

                    <div className="mt-4 flex gap-2">
                      {isRegistrationOpen(event.registration_deadline) && globalRegistrationOpen ? (
                        hasRole(activeRole, USER_ROLES.STUDENT) ? (
                          <StudentSelfRegistrationDialog
                            event={event as any}
                            onRegistrationComplete={handleRegistrationComplete}
                          />
                        ) : (
                          <StudentRegistrationDialog
                            event={event as any}
                            onRegistrationComplete={handleRegistrationComplete}
                          />
                        )
                      ) : (
                        <Button disabled className="w-full opacity-50">
                          {!globalRegistrationOpen ? "Registrations Closed" : "Registration Closed"}
                        </Button>
                      )}

                      {!hasRole(activeRole, USER_ROLES.STUDENT) && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDownloadEventPDF(event)}
                          disabled={pdfDownloadingId === event.id}
                        >
                          {pdfDownloadingId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}