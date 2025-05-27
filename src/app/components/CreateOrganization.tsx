"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  Flex,
  Text,
  TextField,
  Heading,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { WorkOS } from "@workos-inc/node";

export function CreateOrganization() {
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call your server action to create the organization
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: orgName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      // Close the dialog and reset form
      setOpen(false);
      setOrgName("");

      // Refresh the page to show the new organization
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="soft" size="2">
        <PlusIcon />
        Create Organization
      </Button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content>
          <Dialog.Title>Create New Organization</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Create a new organization in your WorkOS account.
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Organization Name
              </Text>
              <TextField.Root
                placeholder="Enter organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </label>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleCreateOrganization} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Organization"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
