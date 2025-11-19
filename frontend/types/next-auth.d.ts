import 'next-auth';
import 'next-auth/jwt';

/**
 * Type augmentation for NextAuth.js
 * Extends the default Session and JWT types to include custom fields
 */

declare module 'next-auth' {
  /**
   * Extended Session interface
   * Adds id and username to the user object
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      username: string;
      image?: string | null;
    };
  }

  /**
   * Extended User interface
   * Adds username field for the authorize callback
   */
  interface User {
    id: string;
    email: string;
    name?: string | null;
    username: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT interface
   * Adds id and username to the token
   */
  interface JWT {
    id: string;
    username: string;
  }
}
