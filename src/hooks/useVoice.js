// hooks/useVoice.js
//
// A simple hook encapsulating voice recognition using
// react-native-voice.  It abstracts the start/stop logic and
// surfaces a boolean `listening` flag.  It accepts a callback
// `onResult` that will be invoked with the transcription result.

import { useState, useEffect } from 'react';

// Optional dynamic import for react-native-voice.  If the module
// isn’t available (e.g. on web), the hook will no-op.
let Voice;
try {
  // eslint-disable-next-line global-require
  Voice = require('react-native-voice').default || require('react-native-voice');
} catch {
  Voice = undefined;
}

/**
 * useVoice provides voice recognition functionality.  It manages the
 * listening state and handles results/errors.  When speech is
 * recognized, it calls the provided `onResult` with the top result.
 *
 * @param {function} onResult Called with recognized text when speech results
 */
export default function useVoice(onResult) {
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!Voice) return undefined;
    const handleResults = (e) => {
      const val = e.value && e.value[0];
      if (val) onResult(val.trim());
      setListening(false);
    };
    const handleError = () => setListening(false);
    Voice.onSpeechResults = handleResults;
    Voice.onSpeechError = handleError;
    return () => {
      Voice.destroy().then(() => Voice.removeAllListeners());
    };
  }, [onResult]);

  const startMic = async () => {
    if (!Voice) return;
    try {
      setListening(true);
      await Voice.start('en-US');
    } catch {
      setListening(false);
    }
  };
  const stopMic = async () => {
    if (!Voice) return;
    try {
      await Voice.stop();
    } finally {
      setListening(false);
    }
  };

  return { listening, startMic, stopMic };
}

// Also export whether voice is available.  If false, calling
// useVoice still returns no-op functions.
export const voiceAvailable = !!Voice;