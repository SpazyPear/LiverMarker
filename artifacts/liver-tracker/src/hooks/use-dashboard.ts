import { useGetDashboard } from "@workspace/api-client-react";

export function useDashboardData() {
  return useGetDashboard({
    query: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });
}
