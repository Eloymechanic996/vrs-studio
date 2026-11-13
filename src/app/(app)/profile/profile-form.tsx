"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, Save, Settings, Trash2 } from "lucide-react";
import { setAvatar, updateProfile, type ProfileInput } from "@/app/(app)/actions";
import { Avatar } from "@/components/avatar";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { AVATAR_BUCKET, avatarUrl, displayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

const MAX_SIDE = 512;

/** Recorta al centro y reduce la imagen a un cuadrado WebP de 512 px antes de subirla. */
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(MAX_SIDE, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/webp", 0.85),
  );
}

const FIELDS: { key: keyof ProfileInput; label: string; max: number; placeholder?: string }[] = [
  { key: "display_name", label: "Nombre de piloto", max: 80, placeholder: "Cómo quieres que te llamen" },
  { key: "team", label: "Equipo", max: 120 },
  { key: "car_number", label: "Dorsal", max: 10, placeholder: "Ej. 27" },
  { key: "category", label: "Categoría", max: 120, placeholder: "Ej. X30 Senior" },
  { key: "country", label: "País", max: 80 },
];

export function ProfileForm({
  userId,
  email,
  memberSince,
  sessionsCount,
  profile,
}: {
  userId: string;
  email: string;
  memberSince: string;
  sessionsCount: number;
  profile: Profile | null;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState(profile?.avatar_path ?? null);
  const [values, setValues] = useState<Required<ProfileInput>>({
    display_name: profile?.display_name ?? "",
    team: profile?.team ?? "",
    car_number: profile?.car_number ?? "",
    category: profile?.category ?? "",
    country: profile?.country ?? "",
    bio: profile?.bio ?? "",
  });

  const name = displayName({ display_name: values.display_name }, email);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const result = await updateProfile(values);
        if (result.ok) {
          setError(null);
          toast({ message: "Perfil guardado.", tone: "success" });
        } else {
          setError(result.error);
        }
      } catch {
        setError("Sin conexión: inténtalo de nuevo.");
      }
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Elige una imagen (JPG, PNG o WebP).");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const blob = await toSquareWebp(file);
      const path = `${userId}/${Date.now()}.webp`;
      const { error: uploadError } = await createClient()
        .storage.from(AVATAR_BUCKET)
        .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (uploadError) throw uploadError;
      const result = await setAvatar(path);
      if (!result.ok) throw new Error(result.error);
      setAvatarPath(path);
      toast({ message: "Foto actualizada.", tone: "success" });
    } catch {
      setError("No se pudo subir la foto. Prueba con otra imagen o revisa la conexión.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    startTransition(async () => {
      try {
        const result = await setAvatar(null);
        if (result.ok) setAvatarPath(null);
        else setError(result.error);
      } catch {
        setError("Sin conexión: inténtalo de nuevo.");
      }
    });
  }

  const since = new Date(memberSince).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return (
    <>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:items-center">
          <Avatar src={avatarUrl(avatarPath)} name={name} size="lg" />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="truncate text-xl font-bold tracking-tight">
              {values.car_number ? <span className="mr-2 text-accent">#{values.car_number}</span> : null}
              {name}
            </p>
            <p className="truncate text-sm text-muted">
              {[values.team, values.category].filter(Boolean).join(" · ") || email}
            </p>
            <p className="mt-1 text-xs text-muted">
              Desde {since} · {sessionsCount} {sessionsCount === 1 ? "sesión" : "sesiones"}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onFile}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploading || pending}
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              {uploading ? "Subiendo…" : avatarPath ? "Cambiar foto" : "Subir foto"}
            </Button>
            {avatarPath ? (
              <Button
                type="button"
                variant="ghost"
                aria-label="Quitar foto"
                title="Quitar foto"
                disabled={uploading || pending}
                onClick={removePhoto}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos de piloto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ key, label, max, placeholder }) => (
                <Field key={key} label={label}>
                  <Input
                    value={values[key]}
                    maxLength={max}
                    placeholder={placeholder}
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  />
                </Field>
              ))}
            </div>
            <Field label="Presentación" hint="Opcional. Máximo 1000 caracteres.">
              <Textarea
                value={values.bio}
                maxLength={1000}
                rows={3}
                onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
              />
            </Field>
            {error ? <Notice tone="error">{error}</Notice> : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending || uploading}>
                <Save className="h-4 w-4" />
                Guardar perfil
              </Button>
              <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
                <Settings className="h-4 w-4" />
                Correo, contraseña y cuenta
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
