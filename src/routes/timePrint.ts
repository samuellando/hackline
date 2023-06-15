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

export function toDateTimeString(now: Date) {
  let month = '' + (now.getMonth() + 1);
  let day = '' + now.getDate();
  let year = now.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-') + 'T' + now.toLocaleTimeString();
}

export function makeStepIterator(start: number, end: number, step: number): Iterator<moment.Moment> {
  // Align on to midnigth.
  let s = moment(start);
  let e = moment(end);
  let next = moment(start);
  next.startOf('day');
  while (next < s) {
    next.add(step);
  }

  const rangeIterator = {
    next() {
      let done = true;
      let value = next.clone();
      if (next < e) {
        done = false;
        next.add(step);
      }
      return { value: value, done: done };
    },
  };
  return rangeIterator;
}

let bounds: [number, Function][] = [
  [MINUTE, makeStepIterator],
  [10 * MINUTE, makeStepIterator],
  [30 * MINUTE, makeStepIterator],
  [HOUR, makeStepIterator],
  [6 * HOUR, makeStepIterator],
  [12 * HOUR, makeStepIterator],
  [DAY, makeStepIterator],
  [WEEK, makeStepIterator]
  /*(MONTH),
  (6 * MONTH),
  (YEAR, )*/
]

export function getTimeDivisions(start: number, end: number): [number, string][] {
  let itterator;
  let duration = end - start;
  for (let i = bounds.length - 1; i < bounds.length; i--) {
    if (duration >= 3 * bounds[i][0]) {
      itterator = bounds[i][1](start, end, bounds[i][0])
      break;
    }
  }
  let v = itterator.next();
  let a: [number, string][] = []
  while (!v.done) {
    let m = v.value;
    let s = m.hour() == 0 && m.minute() == 0 ? m.format("MMM D") : m.format("HH:mm");
    a.push([m.valueOf(), s]);
    v = itterator.next();
  }

  return a;
}
