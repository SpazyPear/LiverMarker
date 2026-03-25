import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateReading,
  getGetDashboardQueryKey,
  getListReadingsQueryKey
} from "@workspace/api-client-react";

export function useAddReading() {
  const queryClient = useQueryClient();
  
  return useCreateReading({
    mutation: {
      onSuccess: () => {
        // Invalidate dashboard stats and raw readings list
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListReadingsQueryKey() });
      }
    }
  });
}
