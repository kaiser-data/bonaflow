import { Text } from 'react-native';

import { Screen } from '@/components/ui/Screen';

export type ModePlaceholderProps = {
  title: string;
  description: string;
};

/** Plain placeholder for a mode whose view is not part of this build. */
export function ModePlaceholder({ title, description }: ModePlaceholderProps) {
  return (
    <Screen edges={['left', 'right', 'bottom']} contentClassName="justify-center gap-3 px-6">
      <Text className="text-foreground text-2xl font-semibold">{title}</Text>
      <Text className="text-muted text-base">{description}</Text>
    </Screen>
  );
}
