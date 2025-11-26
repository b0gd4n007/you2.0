import { useEffect, useState, useRef } from 'react';

/**
 * Hook for speech-to-text.  Provides state variables for whether
 * recording is active and the last recognized text.  The hook binds
 * global event listeners on mount and cleans them up on unmount.
 */
export function useSpeech() {
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState('');
  const cleanup = useRef(() => {});

  useEffect(() => {
    const onResults = (e) => {
      const val = (e.value && e.value[0]) || '';
      setText(val);
    };
    const onError = () => setRecording(false);
    Voice.onSpeechResults = onResults;
    Voice.onSpeechError = onError;
    cleanup.current = () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
    return () => cleanup.current();
  }, []);

  const start = async () => {
    setText('');
    setRecording(true);
    try {
      await Voice.start('en-US');
    } catch (e) {
      setRecording(false);
    }
  };
  const stop = async () => {
    try {
      await Voice.stop();
    } finally {
      setRecording(false);
    }
  };
  return { recording, text, start, stop };
}