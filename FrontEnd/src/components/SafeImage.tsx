import React, { useEffect, useState } from 'react';
import { Image, type ImageProps } from 'react-native';
import { resolveLogPhoto } from '../services/plantLogPhotos';
import { LOG_PHOTO_PREFIX } from '../utils/logPhotoData';

const FALLBACK_IMAGE = require('../../assets/images/slide1.jpg');

/** Renders a local greenhouse image if a remote or uploaded image cannot load. */
export default function SafeImage({ source, onError, ...props }: ImageProps) {
  const uri = source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source
    ? source.uri || null
    : null;
  const [savedSource, setSavedSource] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);

  useEffect(() => {
    setFailedUri(null);
    setSavedSource(null);
    let active = true;
    if (uri?.startsWith(LOG_PHOTO_PREFIX)) {
      void resolveLogPhoto(uri).then((value) => { if (active) setSavedSource(value); }).catch(() => { if (active) setFailedUri(uri); });
    }
    return () => { active = false; };
  }, [uri]);

  const shouldUseFallback = Boolean(uri && failedUri === uri);

  return (
    <Image
      {...props}
      source={shouldUseFallback ? FALLBACK_IMAGE : uri?.startsWith(LOG_PHOTO_PREFIX) ? savedSource ? { uri: savedSource } : undefined : source}
      onError={(event) => {
        if (uri) setFailedUri(uri);
        onError?.(event);
      }}
    />
  );
}
