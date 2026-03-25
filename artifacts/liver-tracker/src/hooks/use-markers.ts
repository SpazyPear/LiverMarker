import { useQueryClient } from "@tanstack/react-query";
import { 
  useListMarkers, 
  useCreateMarker, 
  useDeleteMarker,
  getListMarkersQueryKey,
  getGetDashboardQueryKey
} from "@workspace/api-client-react";

export function useMarkersData() {
  return useListMarkers({
    query: {
      staleTime: 1000 * 60 * 60, // 1 hour, markers rarely change
    }
  });
}

export function useAddMarker() {
  const queryClient = useQueryClient();
  
  return useCreateMarker({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMarkersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      }
    }
  });
}

export function useRemoveMarker() {
  const queryClient = useQueryClient();
  
  return useDeleteMarker({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMarkersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      }
    }
  });
}
