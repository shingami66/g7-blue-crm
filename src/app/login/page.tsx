"use client";

import { Mail, Lock } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="bg-surface min-h-screen flex items-center justify-center p-4 md:p-6">
      <main className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.05)] p-8 flex flex-col items-center">
          {/* Branding */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-24 h-24 mb-2 rounded-full overflow-hidden border border-outline-variant/20 flex items-center justify-center bg-primary">
              <span className="text-white text-[28px] font-bold">G7</span>
            </div>
            <h1 className="text-[28px] leading-[36px] tracking-[-0.01em] font-semibold text-primary mt-2">
              G7 BLUE
            </h1>
            <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
              Events | Exhibitions | Production | Logistics
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Email */}
            <div>
              <label
                className="block text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface mb-1"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-outline" />
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-[14px] leading-[20px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-outline/50 transition-colors"
                  id="email"
                  name="email"
                  placeholder="name@g7blue.com"
                  required
                  type="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  className="block text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-primary hover:text-primary-container transition-colors"
                  href="#"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-outline" />
                </div>
                <input
                  className="block w-full pl-10 pr-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-[14px] leading-[20px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-outline/50 transition-colors"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary bg-surface-container-lowest"
                id="remember-me"
                name="remember-me"
                type="checkbox"
              />
              <label
                className="ml-2 block text-[14px] leading-[20px] text-on-surface-variant"
                htmlFor="remember-me"
              >
                Remember me
              </label>
            </div>

            {/* Submit */}
            <button
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded bg-primary text-on-primary text-[12px] leading-[16px] tracking-[0.05em] font-semibold hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors mt-8 ${
                loading ? "opacity-75 cursor-not-allowed" : ""
              }`}
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-[14px] leading-[20px] text-on-surface-variant text-sm">
            Need access? Contact your system administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
