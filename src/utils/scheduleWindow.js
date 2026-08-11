export const SCHEDULE_MIN_NOTICE_MS = 60 * 60 * 1000;
export const SCHEDULE_MAX_ADVANCE_MS = 48 * 60 * 60 * 1000;

const formatLocalDateTime = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-") + `T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const roundUpToMinute = (date) => {
  const rounded = new Date(date);
  const hasPartialMinute = rounded.getSeconds() !== 0 || rounded.getMilliseconds() !== 0;
  rounded.setSeconds(0, 0);
  if (hasPartialMinute) rounded.setMinutes(rounded.getMinutes() + 1);
  return rounded;
};

const roundDownToMinute = (date) => {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  return rounded;
};

const parseLocalDateTime = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (year < 1900 || year > 9999) return null;

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) return null;

  return date;
};

export const getSchedulePickerBounds = (now = new Date()) => {
  const currentTime = new Date(now);
  if (Number.isNaN(currentTime.getTime())) {
    throw new TypeError("A valid current time is required.");
  }

  const minimum = roundUpToMinute(new Date(currentTime.getTime() + SCHEDULE_MIN_NOTICE_MS));
  const maximum = roundDownToMinute(new Date(currentTime.getTime() + SCHEDULE_MAX_ADVANCE_MS));

  return {
    min: formatLocalDateTime(minimum),
    max: formatLocalDateTime(maximum),
  };
};

export const validateScheduledOrderTime = (value, now = new Date()) => {
  if (!String(value || "").trim()) {
    return { valid: false, error: "Please select a schedule time." };
  }

  const selected = parseLocalDateTime(value);
  const currentTime = new Date(now);
  if (!selected || Number.isNaN(currentTime.getTime())) {
    return { valid: false, error: "Please select a valid date and time." };
  }

  const minimumTime = currentTime.getTime() + SCHEDULE_MIN_NOTICE_MS;
  const maximumTime = currentTime.getTime() + SCHEDULE_MAX_ADVANCE_MS;
  if (selected.getTime() < minimumTime) {
    return { valid: false, error: "Scheduled orders must be at least 1 hour in advance." };
  }
  if (selected.getTime() > maximumTime) {
    return { valid: false, error: "Scheduled orders can be placed up to 2 days in advance." };
  }

  return { valid: true, error: "" };
};
