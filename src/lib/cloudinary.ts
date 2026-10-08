export const getOptimizedImageUrl = (url: string, width: number = 800): string => {
  if (!url || typeof url !== 'string') return url;

  if (!url.includes('cloudinary.com')) return url;

  const transform = `f_auto,q_auto,c_limit,w_${width}`;
  
  if (url.includes('/upload/')) {
    // Prevent double transformations if already applied
    if (url.includes('/upload/f_auto') || url.includes(`/upload/${transform}`)) {
        return url;
    }
    return url.replace('/upload/', `/upload/${transform}/`);
  }

  return url;
};
