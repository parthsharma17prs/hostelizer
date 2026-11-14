import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'Hostelizer Partner Studio | PG & Hostel Management Operating System',
  description: 'Enterprise PG & Hostel Discovery Marketplace, Property Management System & Media Asset Pipeline',
};

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const hasValidClerkKey = clerkKey.startsWith('pk_') && !clerkKey.includes('aG9zdGVsaXplci1kZW1v');

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.filename && (e.filename.includes('chrome-extension://') || e.filename.includes('moz-extension://'))) {
                  e.stopImmediatePropagation();
                }
              }, true);
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.stack && (e.reason.stack.includes('chrome-extension://') || e.reason.stack.includes('moz-extension://'))) {
                  e.stopImmediatePropagation();
                }
              }, true);
            `,
          }}
        />
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body className="antialiased bg-slate-50 text-slate-900">{children}</body>
    </html>
  );

  if (hasValidClerkKey) {
    return (
      <ClerkProvider
        publishableKey={clerkKey}
        clerkJSUrl="https://verified-racer-9830.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
        clerkJSVersion="6"
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/"
        afterSignUpUrl="/apply-approval"
      >
        {content}
      </ClerkProvider>
    );
  }

  return content;
}
