import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
    id: string;
    name: string;
    category: 'on_stage' | 'off_stage';
    mode: string;
    description: string;
    max_participants: number | null;
    max_entries_per_year: number | null;
    min_team_size: number | null;
    max_team_size: number | null;
    registration_deadline: string | null;
    event_date: string | null;
    venue: string;
}

interface EventDetailsDialogProps {
    event: Event;
    trigger?: React.ReactNode;
    getCategoryColor: (category: string) => string;
}

export function EventDetailsDialog({ event, trigger, getCategoryColor }: EventDetailsDialogProps) {
    const defaultTrigger = (
        <Button variant="link" size="sm" className="text-primary hover:text-primary/80 h-auto p-0 font-semibold text-xs">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Read More
        </Button>
    );

    const isRegistrationOpen = (deadline: string | null) => {
        if (!deadline) return true;
        return new Date(deadline) > new Date();
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-2xl font-bold text-foreground mb-3">
                                {event.name}
                            </DialogTitle>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <Badge className={`${getCategoryColor(event.category)} border-0`}>
                                    {event.category?.replace('_', '-') || 'Event'}
                                </Badge>
                                <Badge variant="outline" className="text-xs uppercase tracking-wider">
                                    {event.mode}
                                </Badge>
                                {event.registration_deadline && (
                                    <Badge
                                        variant={isRegistrationOpen(event.registration_deadline) ? "default" : "secondary"}
                                        className={isRegistrationOpen(event.registration_deadline) ? "bg-green-500" : ""}
                                    >
                                        {isRegistrationOpen(event.registration_deadline) ? "Open" : "Closed"}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Description */}
                    <div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">
                            Description
                        </h3>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {event.description}
                        </p>
                    </div>

                    {/* Event Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Venue</p>
                                <p className="text-sm font-medium text-foreground">{event.venue || 'TBA'}</p>
                            </div>
                        </div>

                        {event.event_date && (
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Event Date</p>
                                    <p className="text-sm font-medium text-foreground">
                                        {format(new Date(event.event_date), 'PPP')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {event.registration_deadline && (
                            <div className="flex items-start gap-3">
                                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                                        Registration Deadline
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                        {format(new Date(event.registration_deadline), 'PPP')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {event.max_participants && (
                            <div className="flex items-start gap-3">
                                <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                                        Max Participants
                                    </p>
                                    <p className="text-sm font-medium text-foreground">{event.max_participants}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Team Size Info - Only show for actual team events */}
                    {((event.min_team_size && event.min_team_size > 1) || (event.max_team_size && event.max_team_size > 1)) && (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                Team Requirements
                            </h3>
                            <div className="flex flex-wrap gap-4 text-sm">
                                {event.min_team_size && event.min_team_size > 1 && (
                                    <div>
                                        <span className="text-muted-foreground">Minimum: </span>
                                        <span className="font-bold text-foreground">{event.min_team_size} members</span>
                                    </div>
                                )}
                                {event.max_team_size && event.max_team_size > 1 && (
                                    <div>
                                        <span className="text-muted-foreground">Maximum: </span>
                                        <span className="font-bold text-foreground">{event.max_team_size} members</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
