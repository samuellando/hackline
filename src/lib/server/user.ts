import prisma from "$lib/server/prisma";

export async function newUser(id: string) {
    await prisma.user.create({ data: { id: id } });
    await prisma.running.create({
        data: {
            userId: id,
            title: "Setting up HackLine.io",
            start: new Date(),
        }
    });
    await prisma.interval.create({
        data: {
            userId: id,
            title: "Before HackLine.io",
            start: new Date(0),
            end: new Date(),
        }
    });
    await prisma.settings.create({
        data: {
            userId: id,
            value: {
              "background-color": "#413C58",
              "colormap": {
                "Before HackLine.io": "#806443",
                "Setting up HackLine.io": "#129143",
              },
              "default-title": "productive",
              "running-duration-format": "%H:%M:%S",
              "summary-duration-format": "%H hours %M minutes %S seconds",
              "text-color": "#FFF1D0",
              "timeline-background": "#b3b0ad",
              "timeline-blur": "#00000040",
              "timeline-cursor": "#FFF1D0",
              "timeline-duration-format": "%H hours %M minutes %S seconds",
              "timeline-highlight": "#FFF1D0",
              "timeline-x-axis-font": "15px serif",
              "timeline-x-axis-hashes": "#FFF1D0",
              "timeline-x-axis-text": "#FFF1D0"
            }
        }
    });
    return await prisma.user.findUniqueOrThrow({
        select: {
            intervals: true,
            running: true,
            settings: true,
        },
        where: { id }
    });
}
