export const PROPERTY_STORAGE_BUCKET = 'properties';
export const PROPERTY_STORAGE_FOLDER = 'property-images';

const getSanitizedStorageValue = (value: string) => {
  try {
    return decodeURIComponent(value).split('?')[0];
  } catch {
    return value.split('?')[0];
  }
};

export const buildPropertyImagePath = (userId: string, fileName: string) => {
  return `${PROPERTY_STORAGE_FOLDER}/${userId}/${fileName}`;
};

export const extractPropertyImagePath = (imageUrl: string) => {
  const sanitized = getSanitizedStorageValue(imageUrl);

  const folderIndex = sanitized.indexOf(`${PROPERTY_STORAGE_FOLDER}/`);
  if (folderIndex >= 0) {
    return sanitized.slice(folderIndex);
  }

  const storagePathMatch = sanitized.match(/(?:^|\/)properties\/(property-images\/.+)$/);
  if (storagePathMatch?.[1]) {
    return storagePathMatch[1];
  }

  const parts = sanitized.split('/').filter(Boolean);
  const fileName = parts[parts.length - 1];
  return fileName ? `${PROPERTY_STORAGE_FOLDER}/${fileName}` : null;
};
