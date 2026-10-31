import { Dimensions } from 'react-native';

// Keep the existing import path, but subscribe to resizing and rotation.
export { useWindowDimensions } from 'react-native';

// Width percentage (0-100)
export const wp = (percentage: number): number => {
  const { width } = Dimensions.get('window');
  return (width * percentage) / 100;
};

// Height percentage (0-100)
export const hp = (percentage: number): number => {
  const { height } = Dimensions.get('window');
  return (height * percentage) / 100;
};

// Scale size based on a reference width (e.g., 375 for iPhone X)
export const scaleSize = (size: number, referenceWidth = 375): number => {
  const { width } = Dimensions.get('window');
  return (size * width) / referenceWidth;
};
