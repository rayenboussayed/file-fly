import { Card } from '@astryxdesign/core/Card';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

/**
Props for {@link KpiCard}.
 */
export interface KpiCardProperties {
  /**
  Metric name shown above the value.
   */
  label: string;
  /**
  Optional detail line below the value.
   */
  supporting?: string;
  /**
  Pre-formatted value string.
   */
  value: string;
}

/**
 * Single headline KPI tile.
 * @param properties - Tile props.
 * @param properties.label - Metric name shown above the value.
 * @param properties.value - Pre-formatted value string.
 * @param properties.supporting - Optional detail line below the value.
 * @returns The KPI card element.
 */
export function KpiCard(properties: KpiCardProperties) {
  const { label, supporting, value } = properties;
  return (
    <Card>
      <VStack gap={1}>
        <Text type="supporting">{label}</Text>
        <Text hasTabularNumbers type="display-2">
          {value}
        </Text>
        {supporting ? <Text type="supporting">{supporting}</Text> : undefined}
      </VStack>
    </Card>
  );
}
