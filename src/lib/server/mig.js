import fs from 'fs';

let rawdata = fs.readFileSync('demoTimeline.json');
let timeline = JSON.parse(rawdata);

let out = [];

let i = 0;
timeline.forEach((interval) => {
    let n = {};
    n.id = i++;
    n.start = new Date(interval.start);
    n.end = new Date(interval.end);
    n.title = interval.title;
    out.push(n);
});

fs.writeFileSync('demoTimelineMig.json', JSON.stringify(out));
