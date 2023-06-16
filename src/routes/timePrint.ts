const SECOUND = 1000;
const MINUTE = 60 * SECOUND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 28 * DAY;
const YEAR = 365 * DAY;

import moment from 'moment';

export function durationToString(millis: number, recur = 0) {
  let d = millis;
  let m = 1;
  let s = "millis";


  if (d >= DAY) {
    d = Math.floor(d / DAY);
    m = DAY;
    s = 'day' + ((d > 1) ? "s" : "");
  } else if (d >= HOUR) {
    d = Math.floor(d / HOUR);
    m = HOUR;
    s = 'hour' + ((d > 1) ? "s" : "");
  } else if (d >= MINUTE) {
    d = Math.floor(d / MINUTE);
    m = MINUTE;
    s = 'min' + ((d > 1) ? "s" : "");
  } else if (d >= SECOUND) {
    d = Math.floor(d / SECOUND);
    m = SECOUND;
    s = 'sec' + ((d > 1) ? "s" : "");
  }

  let r = "";
  if (d != 0) {
    r += d + " " + s;
  }
  if (recur > 0) {
    r += " " + durationToString(millis - d * m)
  }

  return r;
}

export function toDateTimeString(now: number) {
  return moment(now).format(moment.HTML5_FMT.DATETIME_LOCAL);
}

export function makeStepIterator(start: number, end: number, step: number, unit: moment.unitOfTime.DurationConstructor): Iterator<moment.Moment> {
  // Align on to midnigth.
  let s = moment(start);
  let e = moment(end);
  let next = moment(start);
  if (moment.duration(step, unit).asMilliseconds() > DAY) {
    next.startOf('year');
  } else {
    next.startOf('day');
  }
  while (next < s) {
    next.add(step, unit);
  }

  const rangeIterator = {
    next() {
      let done = true;
      let value = next.clone();
      if (next < e) {
        done = false;
        next.add(step, unit);
      }
      return { value: value, done: done };
    },
  };
  return rangeIterator;
}

let bounds: [number, number, moment.unitOfTime.DurationConstructor][] = [
  [MINUTE, 1, 'minutes'],
  [5 * MINUTE, 5, 'minutes'],
  [15 * MINUTE, 15, 'minutes'],
  [30 * MINUTE, 30, 'minutes'],
  [HOUR, 1, 'hours'],
  [2 * HOUR, 2, 'hours'],
  [3 * HOUR, 3, 'hours'],
  [6 * HOUR, 6, 'hours'],
  [12 * HOUR, 12, 'hours'],
  [DAY, 1, 'days'],
  [3 * DAY, 3, 'days'],
  [WEEK, 1, 'weeks'],
  [MONTH, 1, 'months'],
  [3 * MONTH, 3, 'months'],
  [6 * MONTH, 6, 'months'],
  [YEAR, 1, 'years']
]

export function getTimeDivisions(start: number, end: number): [number, string][] {
  let itterator = makeStepIterator(start, end, 1, "minutes");
  let duration = end - start;
  for (let i = bounds.length - 1; i < bounds.length; i--) {
    if (duration >= 6 * bounds[i][0]) {
      itterator = makeStepIterator(start, end, bounds[i][1], bounds[i][2]);
      break;
    }
  }
  let v = itterator.next();
  let a: [number, string][] = []
  while (!v.done) {
    let m = v.value;
    let s;
    if (m.hour() == 0 && m.minute() == 0) {
      s = m.format("MMM")
      if (m.date() == 1) {
        s += " " + m.format("YYYY");
      } else {
        s += " " + m.format("D")
      }
    } else {
      s = m.format("HH:mm");
    }

    a.push([m.valueOf(), s]);
    v = itterator.next();
  }

  return a;
}
