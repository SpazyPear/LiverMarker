import { useState } from "react";
import { format } from "date-fns";
import { Plus, X, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useMarkersData } from "@/hooks/use-markers";
import { useAddReading } from "@/hooks/use-readings";
import { useToast } from "@/hooks/use-toast";

export function AddReadingsSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: markers = [], isLoading: isLoadingMarkers } = useMarkersData();
  const { mutateAsync: addReading, isPending: isSubmitting } = useAddReading();
  const { toast } = useToast();

  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [values, setValues] = useState<Record<number, string>>({});

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form on close
      setValues({});
      setDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty values
    const entriesToSubmit = Object.entries(values)
      .filter(([_, val]) => val.trim() !== "")
      .map(([id, val]) => ({
        markerId: Number(id),
        value: Number(val),
        recordedAt: new Date(date).toISOString(),
      }));

    if (entriesToSubmit.length === 0) {
      toast({
        title: "No data entered",
        description: "Please enter at least one marker value to save.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Execute all creations sequentially or in parallel.
      // Assuming parallel is fine for the backend.
      await Promise.all(
        entriesToSubmit.map(entry => addReading({ data: entry }))
      );

      toast({
        title: "Success",
        description: `Successfully saved ${entriesToSubmit.length} reading(s).`,
      });
      handleOpenChange(false);
    } catch (error) {
      toast({
        title: "Error saving readings",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => handleOpenChange(true)}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/40 active:translate-y-0 active:shadow-md transition-all duration-300"
        aria-label="Add new readings"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Custom Slide-up Sheet/Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div 
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm transition-opacity"
            onClick={() => handleOpenChange(false)}
          />
          
          <div className="relative w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50 bg-muted/30">
              <div>
                <h2 className="text-xl font-bold text-foreground">Log Readings</h2>
                <p className="text-sm text-muted-foreground mt-1">Enter your latest lab results.</p>
              </div>
              <button 
                onClick={() => handleOpenChange(false)}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Date Picker */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    Date of Test
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Marker Values</h3>
                  
                  {isLoadingMarkers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : markers.length === 0 ? (
                    <div className="text-center py-6 bg-secondary/50 rounded-xl border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">No markers configured.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {markers.map((marker) => (
                        <div key={marker.id} className="flex items-center gap-3">
                          <label className="w-20 text-sm font-bold text-foreground text-right shrink-0">
                            {marker.name}
                          </label>
                          <div className="relative flex-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="0.0"
                              value={values[marker.id] || ""}
                              onChange={(e) => setValues(prev => ({ ...prev, [marker.id]: e.target.value }))}
                              className="w-full px-4 py-2.5 pr-12 rounded-xl border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground pointer-events-none">
                              {marker.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Footer / Submit */}
              <div className="p-6 pt-4 border-t border-border/50 bg-muted/30">
                <button
                  type="submit"
                  disabled={isSubmitting || markers.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Readings"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
