export const SCHEDULE_MAX_ADVANCE_MS = 48 * 60 * 60 * 1000;
const SCHEDULE_MIN_STEP_MS = 60 * 1000;

const formatLocalDateTime = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-") + `T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

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

  // The current minute itself is not a valid target — the earliest valid
  // selection is the next whole minute after "now".
  const minimum = new Date(roundDownToMinute(currentTime).getTime() + SCHEDULE_MIN_STEP_MS);
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

  // Only times strictly AFTER the current date & time are valid.
  // The current time (or anything in the past) must be rejected.
  if (selected.getTime() <= currentTime.getTime()) {
    return { valid: false, error: "Please choose a future time for your scheduled order." };
  }
  const maximumTime = currentTime.getTime() + SCHEDULE_MAX_ADVANCE_MS;
  if (selected.getTime() > maximumTime) {
    return { valid: false, error: "Scheduled orders can be placed up to 2 days in advance." };
  }

  return { valid: true, error: "" };
};
