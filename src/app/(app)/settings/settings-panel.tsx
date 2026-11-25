"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download, KeyRound, Mail, Palette, Timer, Trash2, UserRound, Wrench } from "lucide-react";
import { changeEmail, changePassword, deleteAccount } from "@/app/(app)/actions";
import { useSettings } from "@/components/settings-provider";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { MODALITIES, SESSION_TYPE_LABELS, SESSION_TYPES } from "@/lib/labels";
import { CLOCK_STYLES, setClockStyle, useClockStyle } from "@/lib/clock-style";
import { APPEARANCES, THEMES, type UserSettings } from "@/lib/settings";
import type { Modality, SessionType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

function Section({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Palette;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          {title}
        </CardTitle>
        {description ? <p className="mt-1 text-xs text-muted">{description}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
      />
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Estilo del reloj: se guarda en este dispositivo y también se cambia desde la sesión. */
function ClockStylePicker() {
  const clockStyle = useClockStyle();
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
        Estilo del reloj <span className="normal-case tracking-normal">(en este dispositivo)</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CLOCK_STYLES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={clockStyle === c.id}
            onClick={() => setClockStyle(c.id)}
            className={choiceClass(clockStyle === c.id)}
          >
            <span>
              <span className="block text-sm font-semibold text-foreground">{c.name}</span>
              <span className="block text-xs text-muted">{c.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const choiceClass = (active: boolean) =>
  cn(
    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
    active ? "border-accent bg-accent/10" : "border-border hover:bg-surface-hover",
  );

const DEFAULT_TEXT_FIELDS: { key: keyof UserSettings; label: string }[] = [
  { key: "defaultTeam", label: "Equipo" },
  { key: "defaultDriver", label: "Piloto" },
  { key: "defaultChassis", label: "Chasis" },
  { key: "defaultEngine", label: "Motor" },
  { key: "defaultCircuit", label: "Circuito" },
];

export function SettingsPanel({
  email,
  notice,
  hasPassword,
  socialName,
}: {
  email: string;
  notice?: string;
  hasPassword: boolean;
  /** Con qué cuenta entra quien no tiene contraseña: "Google" o "Microsoft". */
  socialName: string;
}) {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await changePassword(currentPassword, password);
        if (result.ok) {
          setPassword("");
          setCurrentPassword("");
          setPasswordError(null);
          toast({ message: "Contraseña actualizada.", tone: "success" });
        } else {
          setPasswordError(result.error);
        }
      } catch {
        setPasswordError("Sin conexión: inténtalo de nuevo.");
      }
    });
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await changeEmail(newEmail, emailPassword);
        if (result.ok) {
          setEmailSent(newEmail.trim());
          setNewEmail("");
          setEmailPassword("");
          setEmailError(null);
        } else {
          setEmailSent(null);
          setEmailError(result.error);
        }
      } catch {
        setEmailError("Sin conexión: inténtalo de nuevo.");
      }
    });
  }

  function submitDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Esto borrará tu cuenta y todas tus sesiones de forma definitiva. ¿Continuar?")) return;
    startTransition(async () => {
      try {
        const result = await deleteAccount(confirmDelete);
        if (result && !result.ok) setDeleteError(result.error);
      } catch {
        setDeleteError("Sin conexión: inténtalo de nuevo.");
      }
    });
  }

  return (
    <>
      <Section icon={Palette} title="Apariencia" description="Elige los colores de la aplicación. El cambio se aplica al momento.">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Tema</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={settings.theme === t.id}
                onClick={() => update({ theme: t.id })}
                className={choiceClass(settings.theme === t.id)}
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">{t.name}</span>
                  <span className="block text-xs text-muted">{t.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Estilo</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {APPEARANCES.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={settings.appearance === a.id}
                onClick={() => update({ appearance: a.id })}
                className={choiceClass(settings.appearance === a.id)}
              >
                <span className="flex shrink-0 gap-0.5" aria-hidden="true">
                  {a.swatches.map((color) => (
                    <i key={color} className="block h-7 w-3 rounded-sm" style={{ background: color }} />
                  ))}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{a.name}</span>
                  <span className="block text-xs text-muted">{a.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section icon={Timer} title="Cronómetro">
        <ClockStylePicker />
        <Field label="Tiempo mínimo por vuelta (segundos)" hint="Evita vueltas falsas por doble toque. Usa 0 para desactivarlo.">
          <Input
            type="number"
            min="0"
            max="600"
            step="1"
            className="max-w-32"
            value={settings.minLapSeconds}
            onChange={(e) =>
              update({ minLapSeconds: Math.min(600, Math.max(0, Number(e.target.value) || 0)) })
            }
          />
        </Field>
        <Toggle
          label="Mantener la pantalla encendida"
          hint="Mientras el cronómetro está en marcha."
          checked={settings.keepAwake}
          onChange={(keepAwake) => update({ keepAwake })}
        />
        <Toggle
          label="Vibrar al marcar"
          hint="Confirma cada pulsación en móviles compatibles."
          checked={settings.vibrate}
          onChange={(vibrate) => update({ vibrate })}
        />
      </Section>

      <Section icon={Wrench} title="Datos por defecto" description="Se rellenan solos al crear una sesión nueva.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Modalidad">
            <Select
              value={settings.defaultModality}
              onChange={(e) => update({ defaultModality: e.target.value as Modality })}
            >
              {MODALITIES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo de sesión">
            <Select
              value={settings.defaultSessionType}
              onChange={(e) => update({ defaultSessionType: e.target.value as SessionType })}
            >
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SESSION_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sectores por vuelta">
            <Input
              type="number"
              min="0"
              max="10"
              value={settings.defaultSectors}
              onChange={(e) =>
                update({ defaultSectors: Math.min(10, Math.max(0, Math.trunc(Number(e.target.value) || 0))) })
              }
            />
          </Field>
          {DEFAULT_TEXT_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label}>
              <Input
                value={settings[key] as string}
                maxLength={120}
                onChange={(e) => update({ [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section icon={UserRound} title="Cuenta" description={email}>
        {notice ? <Notice tone="info">{notice}</Notice> : null}
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 self-start text-sm text-accent hover:underline"
        >
          Editar perfil de piloto y foto
        </Link>
        {!hasPassword ? (
          <Notice tone="info">
            Entras con tu cuenta de {socialName}: tu correo y tu contraseña se cambian en{" "}
            {socialName}, no aquí.
          </Notice>
        ) : null}
        {hasPassword ? (
          <>
            <form onSubmit={submitEmail} className="flex flex-col gap-3 border-t border-border/60 pt-4">
              <Field
                label="Nuevo correo"
                hint="Te enviaremos un enlace de confirmación. El cambio no se aplica hasta que lo abras."
              >
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </Field>
              <Field label="Tu contraseña actual">
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={72}
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                />
              </Field>
              {emailError ? <Notice tone="error">{emailError}</Notice> : null}
              {emailSent ? (
                <Notice tone="success">
                  Revisa la bandeja de {emailSent}
                  {" "}(y la de tu correo actual si te llega aviso) y abre el enlace para confirmar el cambio.
                </Notice>
              ) : null}
              <Button type="submit" variant="secondary" disabled={pending} className="self-start">
                <Mail className="h-4 w-4" />
                Cambiar correo
              </Button>
            </form>
            <form onSubmit={submitPassword} className="flex flex-col gap-3 border-t border-border/60 pt-4">
              <Field label="Contraseña actual">
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={72}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Field>
              <Field label="Nueva contraseña" hint="Mínimo 8 caracteres">
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {passwordError ? <Notice tone="error">{passwordError}</Notice> : null}
              <Button type="submit" variant="secondary" disabled={pending} className="self-start">
                <KeyRound className="h-4 w-4" />
                Cambiar contraseña
              </Button>
            </form>
          </>
        ) : null}
        <div className="border-t border-border/60 pt-4">
          <p className="mb-2 text-sm text-muted">
            Descarga una copia de todas tus sesiones, vueltas, eventos y setups.
          </p>
          <a href="/api/account/export">
            <Button type="button" variant="secondary">
              <Download className="h-4 w-4" />
              Descargar mis datos
            </Button>
          </a>
        </div>
      </Section>

      <Section icon={Trash2} title="Borrar cuenta" className="border-danger/40">
        <form onSubmit={submitDelete} className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Se eliminarán tu cuenta y todas tus sesiones. No se puede deshacer.
          </p>
          <Field label="Escribe BORRAR para confirmar">
            <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} className="max-w-48" />
          </Field>
          {deleteError ? <Notice tone="error">{deleteError}</Notice> : null}
          <Button
            type="submit"
            variant="danger"
            disabled={pending || confirmDelete !== "BORRAR"}
            className="self-start"
          >
            <Trash2 className="h-4 w-4" />
            Borrar mi cuenta
          </Button>
        </form>
      </Section>
    </>
  );
}
