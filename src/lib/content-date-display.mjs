// @ts-check
export const CONTENT_TIME_ZONE = 'Asia/Shanghai';

/** @param {Date} date @param {boolean} [withYear] */
export function formatContentDate(date, withYear = true) {
  return date.toLocaleDateString('zh-CN', {
    year: withYear ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
    timeZone: CONTENT_TIME_ZONE,
  });
}

/** @param {Date} published @param {Date | undefined} updated */
export function shouldShowUpdated(published, updated) {
  if (!updated || updated <= published) return false;
  /** @param {Date} date */
  const day = (date) => date.toLocaleDateString('en-CA', { timeZone: CONTENT_TIME_ZONE });
  return day(published) !== day(updated);
}
