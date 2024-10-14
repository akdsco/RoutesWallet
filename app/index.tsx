import React from "react";
import { ConnectionScreen } from "@/containers/ConnectionScreen";
import { Routes } from "@/containers/StravaRoutes";

export default function Index() {
  const noRoutesAvailable = false;

  if (noRoutesAvailable) {
    return <ConnectionScreen />;
  }

  return <Routes />;
}
