"use client";

import { useEffect, useState } from "react";
import { Flex, Spinner } from "@radix-ui/themes";

export default function GlobalLoading() {
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  useEffect(() => {
    // Check if we're in the middle of an organization switch
    const inProgress = localStorage.getItem("orgSwitchInProgress") === "true";

    if (inProgress) {
      // Clear the flag
      localStorage.removeItem("orgSwitchInProgress");
    }

    // Function to check if the page is fully loaded
    const checkPageLoaded = () => {
      if (document.readyState === "complete") {
        // Add a small delay to ensure CSS is applied
        setTimeout(() => {
          setIsLoading(false);
        }, 200);
      }
    };

    // Check if the page is already loaded
    checkPageLoaded();

    // Add event listener for when the page loads
    window.addEventListener("load", checkPageLoaded);

    // Cleanup
    return () => {
      window.removeEventListener("load", checkPageLoaded);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "white", // Use solid white to prevent any content from showing
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <Flex direction="column" align="center" gap="2">
        <Spinner size="2" />
        <div>Loading...</div>
      </Flex>
    </div>
  );
}
