import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-4 md:p-6">
      <SignIn />
    </div>
  );
}
