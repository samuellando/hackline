const SECOUND = 1000;
const MINUTE = 60 * SECOUND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 28 * DAY;
const YEAR = 365 * DAY;

import moment from 'moment';

export function durationToString(millis: number, format: string, pad = 2) {
  /*
   * %y %m %d %H %M %S 
   */

  let dur = moment.duration(millis);

  let s = format;
  let first = true;
  function replace(f: string, nFirst: number, n: number, pad = 0) {
    let use: number = first ? Math.floor(nFirst) : n;
    if (first && s.indexOf(f) >= 0) {
      s = f + s.split(f)[1]
    }
    if (s.indexOf(f) >= 0 && (f == "%S" || !first || first && use != 0)) {
      let uses = `${use}`.padStart(pad, '0')
      s = s.replaceAll(f, uses);
      first = false;
    }
  }

  replace("%y", dur.asYears(), dur.years());
  replace("%m", dur.asMonths(), dur.months());
  replace("%d", dur.asDays(), dur.days());
  replace("%H", dur.asHours(), dur.hours(), pad);
  replace("%M", dur.asMinutes(), dur.minutes(), pad);
  replace("%S", dur.asSeconds(), dur.seconds(), pad);

  return s;
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
