"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { api } from "@/lib/client";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
};

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-ink">
        {label}
      </label>

      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 pr-11 text-[13.5px] text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }

    if (!newPassword) {
      setError("Enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setSaving(true);

    try {
      await api("/api/auth", {
        method: "POST",
        body: {
          action: "change-password",
          current: currentPassword,
          next: newPassword,
        },
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password changed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[24px] font-extrabold tracking-tight text-ink">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Manage your admin account settings.
        </p>
      </div>

      <section className="card max-w-2xl p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
            <LockKeyhole size={18} />
          </div>

          <div>
            <h2 className="text-[16px] font-bold text-ink">
              Change Password
            </h2>
            <p className="text-[12px] text-ink-3">
              Update the password for your admin account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Enter current password"
            show={showCurrent}
            onToggle={() => setShowCurrent((value) => !value)}
            autoComplete="current-password"
          />

          <PasswordField
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Enter new password"
            show={showNew}
            onToggle={() => setShowNew((value) => !value)}
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm new password"
            show={showConfirm}
            onToggle={() => setShowConfirm((value) => !value)}
            autoComplete="new-password"
          />

          <p className="text-[11.5px] text-ink-3">
            Password must be at least 8 characters.
          </p>

          {error && (
            <div className="rounded-xl border border-err/20 bg-err/5 px-3.5 py-3 text-[12.5px] font-medium text-err">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-brand/20 bg-brand-soft px-3.5 py-3 text-[12.5px] font-medium text-brand">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-xl bg-brand px-5 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );
}