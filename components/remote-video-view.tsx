import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Mocha } from '@/constants/mocha';

type Props = {
  uri: string;
};

export function RemoteVideoView({ uri }: Props) {
  const { width: winW } = useWindowDimensions();
  const [measuredW, setMeasuredW] = useState(0);

  const fallbackW = Math.max(280, Math.floor(winW - (Platform.OS === 'web' ? 48 : 130)));
  const boxW = measuredW > 0 ? measuredW : fallbackW;
  const boxH = Math.round((boxW * 9) / 16);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  const statusEvent = useEvent(player, 'statusChange', {
    status: player.status,
  });
  const status = statusEvent.status;
  const loadError = status === 'error' ? statusEvent.error : undefined;

  const onBoxLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== measuredW) setMeasuredW(w);
  };

  const videoView = useMemo(
    () => (
      <VideoView
        player={player}
        style={{ width: boxW, height: boxH, borderRadius: 14, backgroundColor: Mocha.bg0 }}
        nativeControls
        contentFit="contain"
        {...(Platform.OS === 'android' ? { surfaceType: 'textureView' as const } : {})}
      />
    ),
    [player, boxW, boxH],
  );

  if (!uri?.trim()) {
    return null;
  }

  return (
    <View style={styles.column}>
      <View style={styles.measureRow} onLayout={onBoxLayout}>
        <View style={[styles.videoSlot, { width: boxW, height: boxH }]}>
          {status === 'loading' ? (
            <View style={[styles.loadingOverlay, { width: boxW, height: boxH }]}>
              <ActivityIndicator color={Mocha.fg3} size="large" />
            </View>
          ) : null}
          {videoView}
        </View>
      </View>

      {loadError ? (
        <Text style={styles.errorText} numberOfLines={3}>
          {loadError.message ?? 'Video could not be loaded.'}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 8, alignSelf: 'stretch' },
  measureRow: { alignSelf: 'stretch' },
  videoSlot: {
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    pointerEvents: 'none',
  },
  errorText: { color: Mocha.red, fontSize: 12 },
});
