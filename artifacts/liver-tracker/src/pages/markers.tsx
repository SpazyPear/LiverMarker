import { useState } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
import Layout from "@/components/layout";
import { useMarkersData, useAddMarker, useRemoveMarker } from "@/hooks/use-markers";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Markers() {
  const { data: markers, isLoading } = useMarkersData();
  const { mutateAsync: addMarker, isPending: isAdding } = useAddMarker();
  const { mutateAsync: removeMarker, isPending: isRemoving } = useRemoveMarker();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    refMin: "",
    refMax: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMarker({
        data: {
          name: formData.name,
          unit: formData.unit,
          refMin: Number(formData.refMin),
          refMax: Number(formData.refMax)
        }
      });
      toast({ title: "Marker added successfully" });
      setIsFormOpen(false);
      setFormData({ name: "", unit: "", refMin: "", refMax: "" });
    } catch (error) {
      toast({ 
        title: "Failed to add marker", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? All associated readings will be lost.`)) return;
    
    try {
      await removeMarker({ markerId: id });
      toast({ title: "Marker deleted" });
    } catch (error) {
      toast({ 
        title: "Failed to delete marker", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Manage Markers
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure the specific liver enzymes and markers you want to track.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          {isFormOpen ? "Cancel" : <><Plus className="w-5 h-5" /> Add Marker</>}
        </button>
      </div>

      {isFormOpen && (
        <div className="mb-8 p-6 bg-card rounded-2xl border border-border shadow-sm animate-in slide-in-from-top-4 fade-in">
          <h2 className="text-lg font-bold mb-4">Add New Marker</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-semibold">Name (e.g. ALT, AST)</label>
              <input
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary"
                placeholder="ALT"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Unit (e.g. U/L)</label>
              <input
                required
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary"
                placeholder="U/L"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 lg:col-span-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Ref. Min</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  value={formData.refMin}
                  onChange={e => setFormData({...formData, refMin: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Ref. Max</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  value={formData.refMax}
                  onChange={e => setFormData({...formData, refMax: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary"
                  placeholder="40"
                />
              </div>
            </div>
            <div className="lg:col-span-5 flex justify-end mt-2">
              <button
                type="submit"
                disabled={isAdding}
                className="px-6 py-2.5 bg-foreground text-background font-bold rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Marker
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : markers && markers.length > 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-6 py-4">Marker Name</th>
                  <th className="px-6 py-4">Unit</th>
                  <th className="px-6 py-4">Reference Range</th>
                  <th className="px-6 py-4">Added On</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {markers.map((marker) => (
                  <tr key={marker.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{marker.name}</td>
                    <td className="px-6 py-4 font-medium text-muted-foreground">{marker.unit}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium text-xs">
                        {marker.refMin} - {marker.refMax}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(marker.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(marker.id, marker.name)}
                        disabled={isRemoving}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete Marker"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border">
          <p className="text-muted-foreground mb-4">No markers configured yet.</p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="text-primary font-bold hover:underline"
          >
            Add your first marker
          </button>
        </div>
      )}
    </Layout>
  );
}
