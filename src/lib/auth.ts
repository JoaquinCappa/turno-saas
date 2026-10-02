import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      businessId: string;
      role: 'OWNER' | 'ADMIN' | 'STAFF';
      passwordVersion?: number;
    };
  }

  interface User {
    id: string;
    businessId: string;
    role: 'OWNER' | 'ADMIN' | 'STAFF';
    passwordVersion: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    businessId: string;
    role: 'OWNER' | 'ADMIN' | 'STAFF';
    passwordVersion?: number;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son obligatorios');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { business: true },
        });

        if (!user) {
          throw new Error('Credenciales inválidas');
        }

        if (!user.isActive) {
          throw new Error('El usuario está inactivo');
        }

        if (!user.business) {
          throw new Error('Negocio no encontrado');
        }

        if (!user.business.isActive) {
          throw new Error('El negocio está inactivo');
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error('Credenciales inválidas');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          businessId: user.businessId,
          role: user.role,
          passwordVersion: user.passwordVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.businessId = user.businessId;
        token.role = user.role;
        token.passwordVersion = user.passwordVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.businessId = token.businessId;
        session.user.role = token.role;
        session.user.passwordVersion = token.passwordVersion;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET,
};

export async function getAuthenticatedContext() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session?.user?.businessId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { business: true }
  });

  if (
    !user ||
    !user.isActive ||
    user.businessId !== session.user.businessId ||
    !user.business ||
    !user.business.isActive
  ) {
    return null;
  }

  const tokenVersion = session.user.passwordVersion ?? 0;
  if (user.passwordVersion !== tokenVersion) {
    return null;
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      businessId: user.businessId,
      role: user.role,
    }
  };
}
