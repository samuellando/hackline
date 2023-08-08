import prisma from '$lib/server/prisma';
import type { stripeInfo } from '$lib/types';

export async function getStripeInfo(userId: string): Promise<stripeInfo> {
    const res = await prisma.user.findUniqueOrThrow({
        select: {
            customerId: true,
            createdAt: true,
            paymentStatus: true
        },
        where: { id: userId }
    });

    return res;
}

export async function updateStripeInfo(info: { customerId: string, paymentStatus: string }, userId?: string): Promise<stripeInfo> {
    if (!userId) {
        const user = await prisma.user.findFirstOrThrow({
            select: {
                id: true,
            },
            where: {
                customerId: info.customerId
            }
        });

        userId = user.id;
    }

    const res = await prisma.user.update({
        data: {
            customerId: info.customerId,
            paymentStatus: info.paymentStatus
        },
        select: {
            customerId: true,
            createdAt: true,
            paymentStatus: true
        },
        where: { id: userId }
    });

    return res;
}
