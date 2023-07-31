import type { settings } from '$lib/types';
import prisma from '$lib/server/prisma';

export async function getSettings(id: string): Promise<settings> {
	let settings = await prisma.settings.findUnique({
		select: {
			value: true
		},
		where: { userId: id }
	});
	if (settings == null) {
		settings = { value: {} };
		prisma.settings.create({
			data: { userId: id, value: {} }
		});
	}
	return settings.value as settings;
}

export async function setSettings(id: string, value: settings): Promise<settings> {
	const settings = await prisma.settings.update({
		data: { value: value },
		select: {
			value: true
		},
		where: { userId: id }
	});
	return settings.value as settings;
}

export async function setSetting(id: string, value: settings): Promise<settings> {
	let settings = await getSettings(id);
	settings = { ...settings, ...value };
	const newSettings = await prisma.settings.update({
		data: { value: settings },
		select: {
			value: true
		},
		where: { userId: id }
	});
	return newSettings.value as settings;
}
