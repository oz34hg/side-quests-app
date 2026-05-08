import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import SkeletonContent from 'react-native-reanimated-skeleton';

type SkeletonProps = {
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ style }: SkeletonProps) {
  const bone = (StyleSheet.flatten(style) as ViewStyle | undefined) ?? { width: '100%', height: 16 };
  return (
    <SkeletonContent
      isLoading
      animationType="shiver"
      animationDirection="diagonalDownRight"
      duration={1350}
      boneColor="rgba(255,255,255,0.08)"
      highlightColor="rgba(255,255,255,0.22)"
      layout={[bone]}
      containerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
});
