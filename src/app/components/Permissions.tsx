import { withAuth } from "@workos-inc/authkit-nextjs";
import { Text, Heading, Card, Flex, Box } from "@radix-ui/themes";
import { CheckCircledIcon, PersonIcon } from "@radix-ui/react-icons";

interface PermissionsProps {
  role: string;
}

export default async function Permissions({ role }: PermissionsProps) {
  const { user, permissions } = await withAuth({ ensureSignedIn: true });
  if (!user) {
    throw new Error("Authentication required");
  }

  return (
    <Flex direction="column" gap="4">
      {/* User Info Card */}
      <Card size="2">
        <Flex direction="column" gap="2">
          <Heading size="4">User Information</Heading>
          <Flex direction="column" gap="2">
            <Flex gap="2" align="center">
              <Text weight="medium" size="2">
                User ID:
              </Text>
              <Text size="2" color="gray">
                {user.id}
              </Text>
            </Flex>
            <Flex gap="2" align="center">
              <Text weight="medium" size="2">
                Email:
              </Text>
              <Text size="2" color="gray">
                {user.email}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {/* Role Information Card */}
      <Card size="2">
        <Flex direction="column" gap="3">
          <Heading size="4">Role Information</Heading>
          <Flex direction="column" gap="3">
            <Flex gap="2" align="center">
              <PersonIcon width="16" height="16" />
              <Text weight="medium" size="2">
                Current Role:
              </Text>
              <Text size="2" color="gray">
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {/* Permissions Card */}
      <Card size="2">
        <Flex direction="column" gap="3">
          <Heading size="4">Permissions</Heading>
          <Flex direction="column" gap="2">
            {permissions?.map((permission, index) => (
              <Flex key={index} gap="2" align="center">
                <CheckCircledIcon color="green" width="16" height="16" />
                <Text size="2" color="gray">
                  {permission.trim()}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
