'use server';

import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Remove accents
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/(^-|-$)+/g, ''); // Remove leading/trailing hyphens
}

export async function registerBusiness(formData: FormData) {
  const businessName = formData.get('businessName')?.toString();
  const userName = formData.get('userName')?.toString();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();

  if (!businessName || !userName || !email || !password) {
    return { error: 'Todos los campos son obligatorios.' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. Comprobar que el email no esté registrado
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Evitamos enumeración de usuarios siendo algo genéricos
      return { error: 'Error al registrar la cuenta. Verificá los datos ingresados.' };
    }

    // 2. Generar slug válido para el Business y comprobar conflictos
    let baseSlug = generateSlug(businessName);
    if (!baseSlug) {
      baseSlug = 'negocio';
    }
    
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingBusiness = await prisma.business.findUnique({
        where: { slug },
      });
      if (!existingBusiness) {
        break; // Slug is available
      }
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 3. Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Crear Business y User en una única transacción
    await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: businessName,
          slug,
          isActive: true,
        },
      });

      await tx.user.create({
        data: {
          businessId: business.id,
          name: userName,
          email: normalizedEmail,
          password: hashedPassword,
          role: Role.OWNER, // Rol forzado en backend, nunca desde el cliente
          isActive: true,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'Ocurrió un error inesperado al procesar tu registro.' };
  }
}
