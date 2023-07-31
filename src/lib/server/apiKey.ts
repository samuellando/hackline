import prisma from '$lib/server/prisma';
import bcrypt from 'bcrypt';

export async function getUser(apiKey: string | null): Promise<string | null> {
	if (!apiKey) {
		return null;
	}
	const prefix = apiKey.split('.')[0];
	const key = apiKey.split('.')[1];
	const res = await prisma.apiKey.findUnique({
		select: {
			userId: true,
			key: true
		},
		where: { prefix }
	});

	if (res != null && (await bcrypt.compare(key, res?.key))) {
		return res.userId;
	} else {
		return null;
	}
}

export async function getApiKey(userId: string) {
	try {
		await prisma.apiKey.findUniqueOrThrow({
			where: { userId }
		});
		return 'already provided';
	} catch (e) {
		return generateKey(userId);
	}
}

export async function deleteApiKey(userId: string) {
	try {
		await prisma.apiKey.delete({
			where: { userId }
		});
	} catch (e) {
		//pass;
	}
}

export async function generateKey(userId: string): Promise<string> {
	const saltRounds = 10;
	const prefix = crypto.randomUUID();
	const token = crypto.randomUUID();
	const key = await bcrypt.hash(token, saltRounds);
	const apiKey = prefix + '.' + token;

	try {
		await prisma.apiKey.delete({
			where: { userId }
		});
	} catch (e) {
		//pass
	}

	try {
		await prisma.apiKey.create({
			data: {
				userId,
				prefix,
				key
			}
		});
	} catch (e) {
		return generateKey(userId);
	}

	return apiKey;
}
