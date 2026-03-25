import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X, Loader2 } from "lucide-react";
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

export function AddEventSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [eventDate, setEventDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEventDate(format(new Date(), 'yyyy-MM-dd'));
      setEventName("");
      setEventDescription("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName.trim()) {
      toast({
        title: "Event name required",
        description: "Please enter a name for the event.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate,
          name: eventName,
          description: eventDescription || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      toast({
        title: "Event created",
        description: `"${eventName}" has been added to ${eventDate}.`,
      });

      handleOpenChange(false);
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-6 right-24 text-xs"
        >
          + Event
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Event Marker</SheetTitle>
          <SheetDescription>
            Mark important events on your health timeline
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          <div className="space-y-2">
            <Label htmlFor="event-date">Date</Label>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
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
              rows={4}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
