import "expo-dev-client";
import React, { useEffect, useState } from "react";
import { Routes } from "@/containers/StravaRoutes";
import { useRouter } from "expo-router";
import { Loader } from "@/components/Loader";

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [noRoutesAvailable, setNoRoutesAvailable] = useState(true);

  useEffect(() => {
    const checkRoutes = async () => {
      try {
        // TODO: write logic to check if routes are available in storage
        const routesAvailable = await checkIfRoutesAreAvailable();
        setNoRoutesAvailable(routesAvailable);
      } catch (error) {
        console.error("Error checking routes:", error);
        // Assume no routes on error
        // TODO: Handle error situation
        setNoRoutesAvailable(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkRoutes();
  }, []);

  useEffect(() => {
    if (!isLoading && noRoutesAvailable) {
      router.replace("/authorise");
    }
  }, [isLoading, noRoutesAvailable, router]);

  if (isLoading) {
    // TODO: if end up using this loader, improve this
    return <Loader />;
  }

  if (noRoutesAvailable) {
    return null;
  }

  return <Routes />;
}

const checkIfRoutesAreAvailable = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Replace this with your actual check
      resolve(true);
    }, 500);
  });
};
