import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-4 md:p-6">
      <SignUp />
    </div>
  );
}
