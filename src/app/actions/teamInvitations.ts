'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendTeamInvitationEmail } from '@/lib/notifications';
import { revalidatePath } from 'next/cache';

export async function createInvitation(data: { email: string; role: 'ADMIN' | 'STAFF' }) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId || session.user.role !== 'OWNER') {
    return { success: false, error: 'No autorizado' };
  }

  if (!data.email || !data.email.includes('@')) {
    return { success: false, error: 'El email es inválido' };
  }

  if (data.role !== 'ADMIN' && data.role !== 'STAFF') {
    return { success: false, error: 'Rol inválido' };
  }

  const normalizedEmail = data.email.toLowerCase().trim();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return { success: false, error: 'Este email ya está registrado en la plataforma' };
    }

    const pendingInvite = await prisma.teamInvitation.findFirst({
      where: {
        businessId: session.user.businessId,
        email: normalizedEmail,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (pendingInvite) {
      return { success: false, error: 'Ya existe una invitación pendiente para este email' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // 72 hours expiration
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { name: true }
    });

    await prisma.teamInvitation.create({
      data: {
        businessId: session.user.businessId,
        email: normalizedEmail,
        role: data.role,
        tokenHash,
        expiresAt
      }
    });

    // Send email
    const emailResult = await sendTeamInvitationEmail(
      normalizedEmail, 
      business?.name || 'Turnos SaaS', 
      data.role, 
      token
    );

    revalidatePath('/dashboard/equipo');

    if (!emailResult.success) {
      return { 
        success: false, 
        error: 'Invitación creada, pero ocurrió un error al enviar el correo. Por favor, revócala e intenta nuevamente.' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating team invitation:', error);
    return { success: false, error: 'Error al crear la invitación' };
  }
}

export async function revokeInvitation(id: string) {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId || session.user.role !== 'OWNER') {
    return { success: false, error: 'No autorizado' };
  }

  try {
    const invite = await prisma.teamInvitation.findUnique({
      where: { id }
    });

    if (!invite || invite.businessId !== session.user.businessId) {
      return { success: false, error: 'Invitación no encontrada' };
    }

    if (invite.acceptedAt) {
      return { success: false, error: 'La invitación ya fue aceptada' };
    }

    if (invite.revokedAt) {
      return { success: false, error: 'La invitación ya fue revocada' };
    }

    await prisma.teamInvitation.update({
      where: { id },
      data: { revokedAt: new Date() }
    });

    revalidatePath('/dashboard/equipo');
    return { success: true };
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return { success: false, error: 'Error al revocar la invitación' };
  }
}

export async function listTeamInvitations() {
  const session = await getAuthenticatedContext();

  if (!session?.user?.businessId || session.user.role !== 'OWNER') {
    return { success: false, error: 'No autorizado' };
  }

  try {
    const invitations = await prisma.teamInvitation.findMany({
      where: { businessId: session.user.businessId },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: invitations };
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return { success: false, error: 'Error al obtener invitaciones' };
  }
}

export async function getInvitationDetails(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const invite = await prisma.teamInvitation.findUnique({
    where: { tokenHash },
    include: { business: { select: { name: true } } }
  });

  if (!invite) {
    return { success: false, error: 'not_found' };
  }

  if (invite.acceptedAt) {
    return { success: false, error: 'accepted' };
  }

  if (invite.revokedAt) {
    return { success: false, error: 'revoked' };
  }

  if (invite.expiresAt < new Date()) {
    return { success: false, error: 'expired' };
  }

  return { 
    success: true, 
    data: {
      email: invite.email,
      role: invite.role,
      businessName: invite.business.name,
      expiresAt: invite.expiresAt
    } 
  };
}

export async function acceptInvitation(token: string, name: string, password: string) {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'El nombre es obligatorio' };
  }

  if (!password || password.length < 8) {
    return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    return await prisma.$transaction(async (tx) => {
      // Intentar consumir la invitación (concurrencia optimista)
      const updated = await tx.teamInvitation.updateMany({
        where: { 
          tokenHash,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() }
        },
        data: { acceptedAt: new Date() }
      });

      if (updated.count !== 1) {
        throw new Error('La invitación no es válida, expiró o ya fue aceptada');
      }

      // Recuperar los datos de la invitación que acabamos de marcar
      const invite = await tx.teamInvitation.findUnique({
        where: { tokenHash }
      });

      if (!invite) {
        throw new Error('No se encontró la invitación');
      }

      // Validar si el email ya existe
      const existingUser = await tx.user.findUnique({
        where: { email: invite.email }
      });

      if (existingUser) {
        throw new Error('El email ya está registrado en la plataforma');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await tx.user.create({
        data: {
          businessId: invite.businessId,
          name: name.trim(),
          email: invite.email,
          password: hashedPassword,
          role: invite.role,
          isActive: true
        }
      });

      return { success: true };
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error al aceptar la invitación' };
  }
}
