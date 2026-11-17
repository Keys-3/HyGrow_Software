import React, { useEffect, useState } from 'react';
import { Image, type ImageProps } from 'react-native';

const FALLBACK_IMAGE = require('../../assets/images/slide1.jpg');

/** Renders a local greenhouse image if a remote or uploaded image cannot load. */
export default function SafeImage({ source, onError, ...props }: ImageProps) {
  const uri = source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source
    ? source.uri || null
    : null;
  const [failedUri, setFailedUri] = useState<string | null>(null);

  useEffect(() => {
    setFailedUri(null);
  }, [uri]);

  const shouldUseFallback = Boolean(uri && failedUri === uri);

  return (
    <Image
      {...props}
      source={shouldUseFallback ? FALLBACK_IMAGE : source}
      onError={(event) => {
        if (uri) setFailedUri(uri);
        onError?.(event);
      }}
    />
  );
}
