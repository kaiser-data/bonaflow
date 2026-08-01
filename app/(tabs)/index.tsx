import { Typography } from 'heroui-native';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MonoText } from '@/components/ui/MonoText';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';

export default function Home() {
  return (
    // Header supplies the top inset, the tab bar supplies the bottom inset.
    <Screen scroll edges={['left', 'right']} contentClassName="gap-4 px-4 py-6">
      <View className="gap-1">
        <Typography.Heading type="h2">Shift ready</Typography.Heading>
        <Typography.Paragraph color="muted">
          Cross-platform foundations are in place. Screens can be built on top of them.
        </Typography.Paragraph>
      </View>

      <Card className="gap-2">
        <Typography.Paragraph type="body-sm" color="muted">
          Service code
        </Typography.Paragraph>
        <MonoText className="text-xl tracking-widest">BF-1042-KTN</MonoText>
      </Card>

      <Touchable
        className="bg-accent flex-none items-center rounded-2xl px-5 py-3"
        pressedClassName="bg-accent-hover opacity-90"
        accessibilityLabel="Start station round"
      >
        <Typography.Paragraph className="text-accent-foreground font-semibold">
          Start station round
        </Typography.Paragraph>
      </Touchable>
    </Screen>
  );
}
