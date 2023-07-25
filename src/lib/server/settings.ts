import type { settings } from '$lib/types';
import prisma from '$lib/server/prisma';

export async function getSettings(id: string): Promise<settings> {
    let settings = await prisma.settings.findUnique({
        select: {
            value: true,
        },
        where: {userId: id},
    });
    if (settings == null) {
        settings = {value: "{}"};
        prisma.settings.create({
            data: {userId: id, value: settings.value},
        });
    }
    return JSON.parse(settings.value);
}

export async function setSettings(id: string, value: settings): Promise<settings> {
    let settings = await prisma.settings.update({
        data: {value: JSON.stringify(value)},
        select: {
            value: true,
        },
        where: {userId: id},
    });
    return JSON.parse(settings.value);
}
