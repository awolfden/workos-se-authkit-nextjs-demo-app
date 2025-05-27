import { Text, Flex, Grid } from "@radix-ui/themes";
import PortalButton from "./PortalButton";

interface EnterpriseIntegrationsProps {
  organizationId: string;
}

export function EnterpriseIntegrations({
  organizationId,
}: EnterpriseIntegrationsProps) {
  return (
    <Flex direction="column" gap="1" mb="0" pt="1">
      <Grid rows={{ initial: "1", sm: "1" }} gap={{ initial: "1", sm: "1" }}>
        <PortalButton organizationId={organizationId} intent="sso" />
        <PortalButton organizationId={organizationId} intent="dsync" />
        <PortalButton organizationId={organizationId} intent="audit_logs" />
      </Grid>
    </Flex>
  );
}
