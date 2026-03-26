import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Trash2, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

interface EventMarker {
  id: number;
  eventDate: string;
  name: string;
  description?: string | null;
}

export function AddEventSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [events, setEvents] = useState<EventMarker[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [eventDate, setEventDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch("/api/events");
      if (res.ok) setEvents(await res.json());
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchEvents();
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEventDate(format(new Date(), 'yyyy-MM-dd'));
      setEventName("");
      setEventDescription("");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Event deleted", description: `"${name}" has been removed.` });
      // Reload the page so charts update
      window.location.reload();
    } catch {
      toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) {
      toast({ title: "Event name required", description: "Please enter a name.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventDate, name: eventName, description: eventDescription || null }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Event created", description: `"${eventName}" added to ${eventDate}.` });
      handleOpenChange(false);
      window.location.reload();
    } catch {
      toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="absolute bottom-6 right-24 text-xs">
          + Event
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Event Markers</SheetTitle>
          <SheetDescription>Add or remove events that appear as markers on your charts.</SheetDescription>
        </SheetHeader>

        {/* Existing events list */}
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current Events
          </p>
          {loadingEvents ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No events yet.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Flag className="w-3.5 h-3.5 mt-0.5 text-violet-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.name}</p>
                      <p className="text-xs text-muted-foreground">{event.eventDate}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    disabled={deletingId === event.id}
                    onClick={() => handleDelete(event.id, event.name)}
                  >
                    {deletingId === event.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="my-6 border-t border-border/50" />

        {/* Add new event form */}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Add New Event
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-date">Date</Label>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name *</Label>
            <Input
              id="event-name"
              placeholder="e.g., Doctor visit, Medication change"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              placeholder="Add any notes about this event..."
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
            ) : (
              "Create Event"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
