import { useState } from "react";

export const useRouteItemDetails = () => {
  const [loading, setLoading] = useState(true);

  return {
    loading,
  };
};
