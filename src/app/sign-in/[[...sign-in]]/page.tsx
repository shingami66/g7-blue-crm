import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-4 md:p-6">
      <SignIn fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
