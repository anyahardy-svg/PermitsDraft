import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

/**
 * Compress an image file before upload
 * @param {object} fileData - File object with { uri, name, type }
 * @param {object} options - Compression options
 * @returns {Promise<object>} - Compressed file with { uri, name, type, size }
 */
export const compressImage = async (fileData, options = {}) => {
  try {
    // Default compression settings
    const compressionOptions = {
      width: options.width || 1920,        // Max width
      height: options.height || 1920,      // Max height
      compress: options.compress !== false ? (options.compress || 0.7) : 1, // 70% quality by default
      format: options.format || 'jpeg',
      ...options
    };

    let imageUri = fileData.uri;

    // Only compress actual image files (not PDFs or documents)
    const isImageFile = fileData.type && fileData.type.startsWith('image/');
    
    if (!isImageFile) {
      return fileData; // Return original for non-image files
    }

    // Perform image manipulation (resize and compress)
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: compressionOptions.width,
            height: compressionOptions.height
          }
        }
      ],
      {
        compress: compressionOptions.compress,
        format: compressionOptions.format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
        base64: false
      }
    );

    // Get file size info
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();
    const originalSize = (fileData.size || 0) / (1024 * 1024); // MB
    const compressedSize = blob.size / (1024 * 1024); // MB
    const compressionRatio = ((1 - blob.size / (fileData.size || blob.size)) * 100).toFixed(1);

    console.log(`Image compressed: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB (${compressionRatio}% reduction)`);

    return {
      uri: manipulatedImage.uri,
      name: fileData.name,
      type: `image/${compressionOptions.format}`,
      size: blob.size,
      originalSize: fileData.size,
      compressionRatio: compressionRatio
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original file on error
    return fileData;
  }
};

/**
 * Compress multiple image files
 * @param {array} files - Array of file objects
 * @param {object} options - Compression options
 * @returns {Promise<array>} - Array of compressed files
 */
export const compressMultipleImages = async (files, options = {}) => {
  if (!files || files.length === 0) return [];

  try {
    const compressed = [];
    for (const file of files) {
      const result = await compressImage(file, options);
      compressed.push(result);
    }
    return compressed;
  } catch (error) {
    console.error('Error compressing multiple images:', error);
    return files; // Return original files on error
  }
};

/**
 * Get optimized compression settings based on connection speed
 * @param {string} connectionType - 'wifi', '4g', '3g', 'slow'
 * @returns {object} - Optimized compression options
 */
export const getOptimizedCompressionSettings = (connectionType = 'wifi') => {
  const settings = {
    wifi: {
      width: 1920,
      height: 1920,
      compress: 0.8
    },
    '4g': {
      width: 1280,
      height: 1280,
      compress: 0.6
    },
    '3g': {
      width: 800,
      height: 800,
      compress: 0.5
    },
    slow: {
      width: 640,
      height: 640,
      compress: 0.4
    }
  };

  return settings[connectionType] || settings.wifi;
};
