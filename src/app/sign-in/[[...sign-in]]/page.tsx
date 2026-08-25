import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SignInForm from "@/components/auth/SignInForm";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main
      aria-labelledby="sign-in-title"
      className="relative isolate flex min-h-screen overflow-x-hidden bg-[#001e40] text-white"
    >
      <style>{`
        @keyframes g7-brand-ring {
          0% {
            transform: rotate(0deg);
          }

          12.5%, 100% {
            transform: rotate(360deg);
          }
        }

        .g7-brand-ring {
          animation: g7-brand-ring 8s ease-in-out infinite;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .g7-brand-ring {
            animation: none;
          }
        }
      `}</style>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 hidden bg-cover bg-no-repeat sm:block"
          style={{
            backgroundImage: "url('/brand/g7-signin-background.png')",
            backgroundPosition: "center 48%",
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-no-repeat sm:hidden"
          style={{
            backgroundImage: "url('/brand/g7-signin-background.png')",
            backgroundPosition: "center 36%",
          }}
        />
        <div className="absolute inset-0 bg-[#001e40]/40 sm:bg-[#001e40]/30" />
        <div className="absolute inset-0 bg-black/10 sm:bg-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-6 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section
          aria-labelledby="sign-in-title"
          className="relative isolate w-full max-w-[22rem]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-[-3rem] -z-10 rounded-[50%] bg-primary/45 blur-3xl"
          />

          <div className="mb-5 text-center">
            <div
              aria-label="G7 BLUE"
              className="relative mx-auto mb-4 flex h-[4.5rem] w-[4.5rem] items-center justify-center sm:h-24 sm:w-24"
            >
              <span
                aria-hidden="true"
                className="g7-brand-ring absolute inset-0 rounded-full border border-primary-fixed-dim/50 border-l-transparent"
              />
              <div className="relative z-10 text-center">
                <div className="text-[3rem] font-bold leading-none tracking-[-0.08em] text-white sm:text-[3.75rem]">
                  G7
                </div>
                <div className="mt-1 pl-[0.42em] text-[0.7rem] font-semibold uppercase tracking-[0.42em] text-primary-fixed-dim sm:text-xs">
                  BLUE
                </div>
              </div>
            </div>
            <h1 id="sign-in-title" className="text-2xl font-semibold tracking-[-0.02em] text-white">
              Sign in to your workspace
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#d5e3ff]">
              Secure access to your G7 workspace
            </p>
          </div>

          <SignInForm />
        </section>
      </div>
    </main>
  );
}
