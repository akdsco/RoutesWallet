import Container from "@/components/Container";
import { ThemedText } from "@/components/ThemedText";
import { useRouteItemDetails } from "@/containers/RouteItemDetails/RouteItemDetails.hook";
import { Loader } from "@/components/Loader";
import { useRoute } from "@react-navigation/core";
import { useEffect } from "react";

export const RouteItemDetails = () => {
  const { loading } = useRouteItemDetails();
  const { params } = useRoute();

  useEffect(() => {
    console.log(params);
  }, []);

  if (loading) {
    return <Loader />;
  }

  return (
    <Container>
      <ThemedText>RouteItem data</ThemedText>
    </Container>
  );
};
