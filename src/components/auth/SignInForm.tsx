"use client";

import {
  TaskChooseOrganization,
  TaskResetPassword,
  TaskSetupMFA,
  useSignIn,
} from "@clerk/nextjs";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

type FlowMode =
  | "signIn"
  | "forgotPassword"
  | "newPassword"
  | "verification"
  | "sessionTask"
  | "sessionTaskBlocked";
type RecoveryStep = "email" | "code" | "password";
type VerificationMethod = "email_code" | "email_link" | "phone_code" | "totp" | "backup_code";
type VerificationContext = "device" | "mfa";
type SessionTaskKey = "choose-organization" | "reset-password" | "setup-mfa";
type FinalizationState = {
  promise: Promise<void> | null;
  promiseGeneration: number | null;
  status: "idle" | "complete";
  generation: number;
};

const emailLinkVerificationPath = "/sign-in/verify";

const inputClassName =
  "block h-12 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-base text-on-surface shadow-none outline-none placeholder:text-outline focus:border-primary-fixed-dim focus:ring-2 focus:ring-primary-fixed-dim/30";
const secondaryButtonClassName =
  "text-sm font-medium text-primary-fixed-dim underline-offset-4 hover:text-on-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim";
const primaryButtonClassName =
  "flex h-12 w-full items-center justify-center rounded-lg border border-primary-fixed-dim/40 bg-primary-container px-4 text-base font-semibold text-on-primary transition-colors hover:bg-on-primary-fixed-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim focus-visible:ring-offset-2 focus-visible:ring-offset-primary disabled:cursor-not-allowed disabled:opacity-70";

function getErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as { longMessage?: unknown; message?: unknown };
  if (typeof candidate.longMessage === "string" && candidate.longMessage) {
    return candidate.longMessage;
  }

  return typeof candidate.message === "string" && candidate.message
    ? candidate.message
    : null;
}

function getGlobalErrorMessage(errors: unknown[] | null): string | null {
  if (!errors) {
    return null;
  }

  return errors.map(getErrorMessage).filter(Boolean).join(" ") || null;
}

function getSupportedSessionTaskKey(value: unknown): SessionTaskKey | null {
  if (value === "choose-organization" || value === "reset-password" || value === "setup-mfa") {
    return value;
  }

  return null;
}

export default function SignInForm() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [mode, setMode] = useState<FlowMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("email");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod | null>(null);
  const [verificationContext, setVerificationContext] = useState<VerificationContext>("mfa");
  const [pendingSessionTask, setPendingSessionTask] = useState<SessionTaskKey | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const finalizationStateRef = useRef<FinalizationState>({
    promise: null,
    promiseGeneration: null,
    status: "idle",
    generation: 0,
  });

  const isBusy = fetchStatus === "fetching";
  const identifierError = getErrorMessage(errors.fields.identifier);
  const passwordError = getErrorMessage(errors.fields.password);
  const codeError = getErrorMessage(errors.fields.code);
  const globalError = getGlobalErrorMessage(errors.global);
  const emailLinkVerification = signIn.emailLink.verification;

  const finalizeSignIn = useCallback(() => {
    const state = finalizationStateRef.current;
    function startFinalization(): Promise<void> {
      if (state.status === "complete") {
        return Promise.resolve();
      }

      if (state.promise) {
        if (state.promiseGeneration !== state.generation) {
          const stalePromise = state.promise;
          return stalePromise.then(startFinalization, startFinalization);
        }

        return state.promise;
      }

      const generation = state.generation;
      const attempt = (async () => {
        const { error } = await signIn.finalize({
          navigate: ({ session, decorateUrl }) => {
            if (state.generation !== generation) {
              return;
            }

            if (session?.currentTask) {
              const taskKey = getSupportedSessionTaskKey(session.currentTask.key);
              setPendingSessionTask(taskKey);
              setFormError(null);
              setMode(taskKey ? "sessionTask" : "sessionTaskBlocked");
              return;
            }

            const url = decorateUrl("/dashboard");
            if (url.startsWith("http")) {
              window.location.assign(url);
              return;
            }

            router.push(url);
          },
        });

        if (error && state.generation === generation) {
          setPendingSessionTask(null);
          setMode("signIn");
          setFormError(getErrorMessage(error) ?? "Unable to complete sign in.");
          return;
        }

        if (!error && state.generation === generation) {
          state.status = "complete";
        }
      })();

      state.promise = attempt;
      state.promiseGeneration = generation;
      void attempt.then(
        () => {
          if (state.promise === attempt) {
            state.promise = null;
            state.promiseGeneration = null;
          }
        },
        () => {
          if (state.promise === attempt) {
            state.promise = null;
            state.promiseGeneration = null;
          }
        },
      );
      return attempt;
    }

    return startFinalization();
  }, [router, signIn]);

  async function waitForEmailLinkVerification() {
    const { error } = await signIn.emailLink.waitForVerification();
    if (error) {
      setFormError(getErrorMessage(error) ?? "Unable to verify the email link.");
      return;
    }

    if (signIn.status === "complete") {
      await finalizeSignIn();
    }
  }

  useEffect(() => {
    if (emailLinkVerification?.status === "verified" && signIn.status === "complete") {
      void finalizeSignIn();
    }
  }, [emailLinkVerification, finalizeSignIn, signIn.status]);

  async function prepareVerification(context: VerificationContext) {
    const supportedStrategies = signIn.supportedSecondFactors.map((factor) => factor.strategy);
    const method = (["email_code", "email_link", "phone_code", "totp", "backup_code"] as const).find((strategy) =>
      supportedStrategies.includes(strategy),
    );

    if (!method) {
      setFormError("Additional verification is required to finish signing in.");
      return;
    }

    setVerificationContext(context);
    setVerificationMethod(method);
    setVerificationCode("");
    setFormError(null);

    if (method === "email_code") {
      const { error } = await signIn.mfa.sendEmailCode();
      if (error) {
        setFormError(getErrorMessage(error) ?? "Unable to send the verification code.");
        return;
      }
    }

    if (method === "email_link") {
      const { error } = await signIn.emailLink.sendLink({
        verificationUrl: `${window.location.origin}${emailLinkVerificationPath}`,
      });
      if (error) {
        setFormError(getErrorMessage(error) ?? "Unable to send the verification link.");
        return;
      }

      setMode("verification");
      void waitForEmailLinkVerification();
      return;
    }

    if (method === "phone_code") {
      const { error } = await signIn.mfa.sendPhoneCode();
      if (error) {
        setFormError(getErrorMessage(error) ?? "Unable to send the verification code.");
        return;
      }
    }

    setMode("verification");
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setFormError("Enter your email and password.");
      return;
    }

    const { error } = await signIn.password({
      emailAddress: trimmedEmail,
      password,
    });

    if (error) {
      return;
    }

    if (signIn.status === "complete") {
      await finalizeSignIn();
      return;
    }

    if (signIn.status === "needs_client_trust") {
      await prepareVerification("device");
      return;
    }

    if (signIn.status === "needs_second_factor") {
      await prepareVerification("mfa");
      return;
    }

    if (signIn.status === "needs_new_password") {
      setRecoveryPassword("");
      setMode("newPassword");
      return;
    }

    setFormError("Additional verification is required to finish signing in.");
  }

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!verificationCode.trim() || !verificationMethod) {
      setFormError("Enter the verification code.");
      return;
    }

    const code = verificationCode.trim();
    let error = null;

    if (verificationMethod === "email_code") {
      ({ error } = await signIn.mfa.verifyEmailCode({ code }));
    } else if (verificationMethod === "phone_code") {
      ({ error } = await signIn.mfa.verifyPhoneCode({ code }));
    } else if (verificationMethod === "totp") {
      ({ error } = await signIn.mfa.verifyTOTP({ code }));
    } else {
      ({ error } = await signIn.mfa.verifyBackupCode({ code }));
    }

    if (error) {
      setFormError(getErrorMessage(error));
      return;
    }

    if (signIn.status === "complete") {
      await finalizeSignIn();
      return;
    }

    setFormError("Additional verification is required to finish signing in.");
  }

  async function resendVerificationCode() {
    setFormError(null);
    const { error } =
      verificationMethod === "email_code"
        ? await signIn.mfa.sendEmailCode()
        : await signIn.mfa.sendPhoneCode();

    if (error) {
      setFormError(getErrorMessage(error) ?? "Unable to send the verification code.");
    }
  }

  async function openRecovery() {
    await signIn.reset();
    setRecoveryEmail(email);
    setRecoveryStep("email");
    setFormError(null);
    setMode("forgotPassword");
  }

  async function returnToSignIn() {
    await signIn.reset();
    finalizationStateRef.current.generation += 1;
    finalizationStateRef.current.status = "idle";
    setFormError(null);
    setPasswordVisible(false);
    setPendingSessionTask(null);
    setRecoveryStep("email");
    setRecoveryCode("");
    setRecoveryPassword("");
    setVerificationCode("");
    setVerificationMethod(null);
    setMode("signIn");
  }

  async function sendRecoveryCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedEmail = recoveryEmail.trim();
    if (!trimmedEmail) {
      setFormError("Enter your email address.");
      return;
    }

    const { error: createError } = await signIn.create({ identifier: trimmedEmail });
    if (createError) {
      return;
    }

    const { error: sendCodeError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendCodeError) {
      setFormError(getErrorMessage(sendCodeError) ?? "Unable to send the password reset code.");
      return;
    }

    setRecoveryStep("code");
  }

  async function verifyRecoveryCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!recoveryCode.trim()) {
      setFormError("Enter the password reset code.");
      return;
    }

    const { error } = await signIn.resetPasswordEmailCode.verifyCode({
      code: recoveryCode.trim(),
    });
    if (error) {
      return;
    }

    setRecoveryStep("password");
  }

  async function submitRecoveryPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!recoveryPassword) {
      setFormError("Enter a new password.");
      return;
    }

    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password: recoveryPassword,
    });
    if (error) {
      setFormError(getErrorMessage(error));
      return;
    }

    if (signIn.status === "complete") {
      await finalizeSignIn();
    }
  }

  function renderError(message: string | null, id = "sign-in-error") {
    if (!message) {
      return null;
    }

    return (
      <p id={id} role="alert" className="mt-2 text-sm leading-5 text-white">
        {message}
      </p>
    );
  }

  function renderBlockedSessionTask() {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Additional setup required</h2>
          <p className="mt-1 text-sm leading-5 text-[#d5e3ff]">
            Additional account setup is required, but this sign-in client cannot complete it.
          </p>
        </div>
        <button type="button" className={secondaryButtonClassName} onClick={() => void returnToSignIn()}>
          Back to sign in
        </button>
      </div>
    );
  }

  if (mode === "sessionTaskBlocked") {
    return renderBlockedSessionTask();
  }

  if (mode === "sessionTask") {
    if (pendingSessionTask === "choose-organization") {
      return (
        <div className="space-y-5">
          <TaskChooseOrganization redirectUrlComplete="/dashboard" />
        </div>
      );
    }

    if (pendingSessionTask === "reset-password") {
      return (
        <div className="space-y-5">
          <TaskResetPassword redirectUrlComplete="/dashboard" />
        </div>
      );
    }

    if (pendingSessionTask === "setup-mfa") {
      return (
        <div className="space-y-5">
          <TaskSetupMFA redirectUrlComplete="/dashboard" />
        </div>
      );
    }

    return renderBlockedSessionTask();
  }

  if (mode === "verification" || emailLinkVerification) {
    const emailLinkError =
      emailLinkVerification?.status === "client_mismatch"
        ? "Open the verification link on the same device and browser where sign-in started."
        : emailLinkVerification && emailLinkVerification.status !== "verified"
          ? "The email verification link could not be used. Request a new link to try again."
          : null;

    if (verificationMethod === "email_link" || emailLinkVerification) {
      return (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Check your email</h2>
            <p className="mt-1 text-sm leading-5 text-[#d5e3ff]">
              Open the verification link to finish securing this sign-in.
            </p>
          </div>
          {renderError(formError ?? emailLinkError ?? globalError)}
          <button type="button" className={secondaryButtonClassName} onClick={() => void returnToSignIn()}>
            Back to sign in
          </button>
        </div>
      );
    }

    const verificationTitle =
      verificationContext === "device" ? "Verify this device" : "Verify your sign-in";
    const verificationDescription =
      verificationMethod === "email_code"
        ? "Enter the code sent to your email."
        : verificationMethod === "phone_code"
          ? "Enter the code sent to your phone."
          : verificationMethod === "totp"
            ? "Enter the code from your authenticator app."
            : "Enter one of your backup codes.";
    const verificationLabel =
      verificationMethod === "email_code"
        ? "Email verification code"
        : verificationMethod === "phone_code"
          ? "Phone verification code"
          : verificationMethod === "totp"
            ? "Authenticator code"
            : "Backup code";

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">{verificationTitle}</h2>
          <p className="mt-1 text-sm leading-5 text-[#d5e3ff]">{verificationDescription}</p>
        </div>
        <form onSubmit={handleVerification} className="space-y-4">
          <div>
            <label htmlFor="verification-code" className="mb-2 block text-sm font-medium text-white/90">
              {verificationLabel}
            </label>
            <input
              id="verification-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              className={inputClassName}
              aria-describedby="verification-code-error"
            />
            {renderError(codeError, "verification-code-error")}
          </div>
          {renderError(formError ?? globalError)}
          <button type="submit" className={primaryButtonClassName} disabled={isBusy}>
            {isBusy ? "Verifying…" : "Verify"}
          </button>
        </form>
        {(verificationMethod === "email_code" || verificationMethod === "phone_code") && (
          <button type="button" className={secondaryButtonClassName} onClick={() => void resendVerificationCode()}>
            Send a new code
          </button>
        )}
        <button type="button" className={secondaryButtonClassName} onClick={() => void returnToSignIn()}>
          Back to sign in
        </button>
      </div>
    );
  }

  if (mode === "forgotPassword" || mode === "newPassword") {
    const isForcedPasswordChange = mode === "newPassword";

    if (isForcedPasswordChange || recoveryStep === "password") {
      return (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isForcedPasswordChange ? "Set a new password" : "Choose a new password"}
            </h2>
            <p className="mt-1 text-sm leading-5 text-[#d5e3ff]">
              {isForcedPasswordChange
                ? "Choose a new password to continue."
                : "Enter your new password to finish recovery."}
            </p>
          </div>
          <form onSubmit={submitRecoveryPassword} className="space-y-4">
            <div>
              <label htmlFor="recovery-password" className="mb-2 block text-sm font-medium text-white/90">
                New password
              </label>
              <input
                id="recovery-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={recoveryPassword}
                onChange={(event) => setRecoveryPassword(event.target.value)}
                className={inputClassName}
                aria-describedby="recovery-password-error"
              />
              {renderError(passwordError, "recovery-password-error")}
            </div>
            {renderError(formError ?? globalError)}
            <button type="submit" className={primaryButtonClassName} disabled={isBusy}>
              {isBusy ? "Saving…" : "Save password"}
            </button>
          </form>
          <button type="button" className={secondaryButtonClassName} onClick={() => void returnToSignIn()}>
            Back to sign in
          </button>
        </div>
      );
    }

    if (recoveryStep === "code") {
      return (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Reset your password</h2>
            <p className="mt-1 text-sm leading-5 text-[#d5e3ff]">Enter the code sent to your email.</p>
          </div>
          <form onSubmit={verifyRecoveryCode} className="space-y-4">
            <div>
              <label htmlFor="recovery-code" className="mb-2 block text-sm font-medium text-white/90">
                Password reset code
              </label>
              <input
                id="recovery-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                className={inputClassName}
                aria-describedby="recovery-code-error"
              />
              {renderError(codeError, "recovery-code-error")}
            </div>
            {renderError(formError ?? globalError)}
            <button type="submit" className={primaryButtonClassName} disabled={isBusy}>
              {isBusy ? "Checking…" : "Verify code"}
            </button>
          </form>
          <button type="button" className={secondaryButtonClassName} onClick={() => void returnToSignIn()}>
            Back to sign in
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Reset your password</h2>
          <p className="mt-1 text-sm leading-5 text-[#d5e3ff]">Enter your email to receive a reset code.</p>
        </div>
        <form onSubmit={sendRecoveryCode} className="space-y-4">
          <div>
            <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium text-white/90">
              Email
            </label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              value={recoveryEmail}
              onChange={(event) => setRecoveryEmail(event.target.value)}
              className={inputClassName}
              aria-describedby="recovery-email-error"
            />
            {renderError(identifierError, "recovery-email-error")}
          </div>
          {renderError(formError ?? globalError)}
          <button type="submit" className={primaryButtonClassName} disabled={isBusy}>
            {isBusy ? "Sending…" : "Send reset code"}
          </button>
        </form>
        <button type="button" className={secondaryButtonClassName} onClick={() => void returnToSignIn()}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      <div>
        <label htmlFor="sign-in-email" className="mb-2 block text-sm font-medium text-white/90">
          Email
        </label>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline"
                strokeWidth={1.8}
              />
              <input
                id="sign-in-email"
                name="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`${inputClassName} pl-11`}
                aria-describedby="sign-in-email-error"
                required
              />
            </div>
        {renderError(identifierError, "sign-in-email-error")}
      </div>

      <div>
        <label htmlFor="sign-in-password" className="mb-2 block text-sm font-medium text-white/90">
          Password
        </label>
        <div className="relative">
          <LockKeyhole
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline"
            strokeWidth={1.8}
          />
          <input
            id="sign-in-password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`${inputClassName} pl-11 pr-14`}
            aria-describedby="sign-in-password-error"
            required
          />
          <button
            type="button"
            className="absolute inset-y-0 right-2 flex h-12 w-10 items-center justify-center rounded-md text-outline hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible}
          >
            {passwordVisible ? (
              <EyeOff aria-hidden="true" className="size-4" strokeWidth={1.8} />
            ) : (
              <Eye aria-hidden="true" className="size-4" strokeWidth={1.8} />
            )}
            <span className="sr-only">{passwordVisible ? "Hide password" : "Show password"}</span>
          </button>
        </div>
        {renderError(passwordError, "sign-in-password-error")}
      </div>

      <div className="flex items-center justify-end pt-0.5">
        <button type="button" className={secondaryButtonClassName} onClick={() => void openRecovery()}>
          Forgot password?
        </button>
      </div>

      {renderError(formError ?? globalError)}
      <button type="submit" className={primaryButtonClassName} disabled={isBusy}>
        {isBusy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
