import NextAuth, { AuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { clientPromise } from './mongodb'
import { initializeUserCredits } from '@/payment/creditService'
import connectDB from './mongodb'
import bcrypt from 'bcryptjs'

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: 'jwt'
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      httpOptions: {
        timeout: 10000, // Increase timeout to 10 seconds
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        phone: { label: 'Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if ((!credentials?.email && !credentials?.phone) || !credentials?.password) {
          throw new Error('Identifier and password are required');
        }

        await connectDB();
        const User = (await import('@/models/User')).default;

        let user: any = null;
        if (credentials.phone) {
          const digits = String(credentials.phone).replace(/\D/g, '');
          const e164 = digits.length === 10 ? `+91${digits}` : `+${digits}`;
          const syntheticEmail = `${e164.replace('+', '')}@gmail.com`.toLowerCase();
          user = await User.findOne({ $or: [{ phone: e164 }, { email: syntheticEmail }] }).select('+password');
        } else if (credentials.email) {
          user = await User.findOne({ email: String(credentials.email).toLowerCase() }).select('+password');
        }

        if (!user) {
          throw new Error('Invalid credentials');
        }

        if (user.provider === 'google') {
          throw new Error('Please sign in with Google');
        }

        if (user.provider === 'credentials') {
          if (!user.emailVerified) {
            throw new Error('Please verify your email before signing in');
          }
        }

        if (user.provider === 'phone') {
          if (!user.isVerified) {
            throw new Error('Phone not verified');
          }
        }

        if (!user.password) {
          throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: (user._id as any).toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionProvider: user.subscriptionProvider
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth
      if (account?.provider === 'google') {
        if (!profile?.email) {
          throw new Error('No Profile!');
        }

        try {
          await connectDB();
          const User = (await import('@/models/User')).default;
          let existingUser = await User.findOne({ email: profile.email });

          // Create or update Google user
          if (!existingUser) {
            existingUser = await User.create({
              email: profile.email,
              name: user.name || profile.name,
              image: user.image,
              provider: 'google',
              emailVerified: new Date(),
            });
          } else if (existingUser.provider !== 'google') {
            // Update provider if user exists with credentials
            existingUser.provider = 'google';
            existingUser.emailVerified = new Date();
            await existingUser.save();
          }

          // Pass subscription info to user object for JWT callback
          user.subscriptionStatus = existingUser.subscriptionStatus;
          user.subscriptionProvider = existingUser.subscriptionProvider;

          // Initialize credits
          const userId = (existingUser._id as any).toString();
          await initializeUserCredits(userId);
        } catch (error) {
          console.error('Error initializing user credits:', error);
        }
      }

      // Credentials provider sign-in is handled in authorize
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.subscriptionStatus = user.subscriptionStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.subscriptionStatus = token.subscriptionStatus as string | null | undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: '/signin',
  }
}

export default NextAuth(authOptions)
