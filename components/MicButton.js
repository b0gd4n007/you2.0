// components/MicButton.js
import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, Text } from 'react-native';

let Voice;
try {
  Voice = require('react-native-voice').default || require('react-native-voice');
} catch {}

export default function MicButton({ onResult, style, size = 14 }) {
  const [listening, setListening] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!Voice) return;
    Voice.onSpeechResults = e => {
      const words = e.value?.[0] || '';
      onResult?.(words);
    };
    Voice.onSpeechError = () => {
      if (!mounted.current) return;
      setListening(false);
    };
    return () => {
      Voice.destroy?.().catch(() => {});
      Voice.removeAllListeners?.();
    };
  }, [onResult]);

  const toggle = async () => {
    if (!Voice) {
      // No library installed; pretend we listened to keep UI sane
      onResult?.('');
      return;
    }
    try {
      if (listening) {
        await Voice.stop();
        setListening(false);
      } else {
        await Voice.start('en-US');
        setListening(true);
      }
    } catch {
      setListening(false);
    }
  };

  return (
    <TouchableOpacity onPress={toggle} style={[{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: listening ? '#fde047' : '#e5e7eb' }, style]}>
      <Text style={{ fontWeight: '700', fontSize: size }}>{listening ? '🎙 Stop' : '🎤 Mic'}</Text>
    </TouchableOpacity>
  );
}
