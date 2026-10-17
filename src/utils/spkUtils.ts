/**
 * Utility functions for SPK formatting and helpers
 */

export const formatSubTasks = (subTasks?: string[] | string): string => {
  if (!subTasks) return '';
  if (Array.isArray(subTasks)) {
    return subTasks
      .map((item) => (item !== null && item !== undefined ? String(item).trim() : ''))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof subTasks === 'string') {
    const trimmed = subTasks.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (item !== null && item !== undefined ? String(item).trim() : ''))
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  return '';
};
