import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Mocha } from '@/constants/mocha';

type Props = {
  uri: string;
};

export function RemoteVideoView({ uri }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  const statusEvent = useEvent(player, 'statusChange', {
    status: player.status,
  });
  const status = statusEvent.status;
  const loadError = status === 'error' ? statusEvent.error : undefined;

  const videoView = useMemo(
    () => (
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="cover"
      />
    ),
    [player],
  );

  if (!uri?.trim()) {
    return null;
  }

  return (
    <View style={styles.column}>
      <View style={styles.measureRow}>
        <View style={styles.videoSlot}>
          {status === 'loading' ? (
            <View style={styles.loadingOverlay}>
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
    alignSelf: 'stretch',
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: Mocha.bg0,
  },
  video: { width: '100%', height: '100%', backgroundColor: Mocha.bg0 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    pointerEvents: 'none',
  },
  errorText: { color: Mocha.red, fontSize: 12 },
});
