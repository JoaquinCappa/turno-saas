import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';
import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      businessId: string;
      role: Role;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    businessId: string;
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    businessId: string;
    role: Role;
  }
}
