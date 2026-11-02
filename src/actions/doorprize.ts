"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function getPrizes(eventId: string) {
  return await prisma.prize.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    include: {
      prizeDraws: {
        where: { status: "VALID" },
        include: {
          registration: true,
        },
      },
    },
  });
}

export async function createPrize(eventId: string, name: string, quantity: number = 1) {
  const count = await prisma.prize.count({ where: { eventId } });
  const prize = await prisma.prize.create({
    data: {
      eventId,
      name,
      quantity,
      order: count + 1,
    },
  });
  revalidatePath(`/dashboard/events/${eventId}/doorprize`);
  return prize;
}

export async function deletePrize(id: string) {
  const prize = await prisma.prize.delete({
    where: { id },
  });
  revalidatePath(`/dashboard/events/${prize.eventId}/doorprize`);
  return prize;
}

export async function getEligibleParticipants(
  eventId: string,
  options: {
    poolType: "CHECKED_IN" | "APPROVED";
    excludePreviousWinners: boolean;
  }
) {
  const statuses =
    options.poolType === "CHECKED_IN"
      ? ["CHECKED_IN"]
      : ["APPROVED", "CHECKED_IN"];

  let excludedRegistrationIds: string[] = [];

  if (options.excludePreviousWinners) {
    const validDraws = await prisma.prizeDraw.findMany({
      where: {
        eventId,
        status: "VALID",
      },
      select: { registrationId: true },
    });
    excludedRegistrationIds = validDraws.map((d) => d.registrationId);
  }

  const participants = await prisma.registration.findMany({
    where: {
      eventId,
      status: { in: statuses },
      id: { notIn: excludedRegistrationIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
    },
  });

  return participants;
}

export async function drawWinner(
  eventId: string,
  prizeId: string,
  options: {
    poolType: "CHECKED_IN" | "APPROVED";
    excludePreviousWinners: boolean;
  }
) {
  const eligible = await getEligibleParticipants(eventId, options);

  if (eligible.length === 0) {
    return {
      success: false,
      message: "Tidak ada peserta yang memenuhi syarat di pool undian saat ini.",
    };
  }

  // Fair cryptographic random selection on the server
  const randomIndex = crypto.randomInt(0, eligible.length);
  const selectedWinner = eligible[randomIndex];

  // Save the draw in the database
  const draw = await prisma.prizeDraw.create({
    data: {
      eventId,
      prizeId,
      registrationId: selectedWinner.id,
      status: "VALID",
    },
    include: {
      prize: true,
      registration: true,
    },
  });

  revalidatePath(`/dashboard/events/${eventId}/doorprize`);

  return {
    success: true,
    winner: selectedWinner,
    winnerIndex: randomIndex,
    totalPoolCount: eligible.length,
    drawId: draw.id,
  };
}

export async function redrawWinner(drawId: string) {
  const draw = await prisma.prizeDraw.update({
    where: { id: drawId },
    data: { status: "REDRAWN" },
  });
  revalidatePath(`/dashboard/events/${draw.eventId}/doorprize`);
  return draw;
}

export async function getWinnerHistory(eventId: string) {
  return await prisma.prizeDraw.findMany({
    where: { eventId },
    orderBy: { drawnAt: "desc" },
    include: {
      prize: true,
      registration: true,
    },
  });
}
