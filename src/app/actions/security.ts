'use server';

import { getAuthenticatedContext } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/notifications';

export async function changePassword(current: string, newPass: string, confirmPass: string) {
  const session = await getAuthenticatedContext();
  if (!session?.user?.id) {
    return { success: false, error: 'No autorizado' };
  }

  if (!newPass || newPass.length < 8) {
    return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' };
  }

  if (newPass !== confirmPass) {
    return { success: false, error: 'Las contraseñas no coinciden' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const isValid = await bcrypt.compare(current, user.password);
    if (!isValid) {
      return { success: false, error: 'La contraseña actual es incorrecta' };
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        passwordVersion: { increment: 1 }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'Error al cambiar la contraseña' };
  }
}

export async function requestPasswordReset(email: string) {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Email inválido' };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const genericResponse = { success: true, message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' };

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || !user.isActive) {
      // Return success silently
      return genericResponse;
    }

    // Delete existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    await sendPasswordResetEmail(user.email, user.name, token);

    return genericResponse;
  } catch (error) {
    console.error('Error requesting password reset:', error);
    // Even on error, don't reveal info.
    return { success: false, error: 'Ocurrió un error inesperado. Intenta nuevamente.' };
  }
}

export async function resetPassword(token: string, newPass: string, confirmPass: string) {
  if (!newPass || newPass.length < 8) {
    return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' };
  }

  if (newPass !== confirmPass) {
    return { success: false, error: 'Las contraseñas no coinciden' };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    return await prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { tokenHash }
      });

      if (!resetToken || resetToken.expiresAt <= new Date()) {
        throw new Error('El enlace es inválido o ha expirado');
      }

      const deletedCount = await tx.passwordResetToken.deleteMany({
        where: { tokenHash }
      });

      if (deletedCount.count !== 1) {
        throw new Error('El enlace es inválido o ha expirado');
      }

      const hashedPassword = await bcrypt.hash(newPass, 10);

      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          passwordVersion: { increment: 1 }
        }
      });

      return { success: true };
    });
  } catch (error: unknown) {
    console.error('Error resetting password:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error al restablecer la contraseña' };
  }
}
