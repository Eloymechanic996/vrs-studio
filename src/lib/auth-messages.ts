/**
 * Avisos que las páginas de login y de nueva contraseña pueden mostrar.
 * Llegan por la URL (?error=... / ?notice=...), así que solo se enseñan si son
 * uno de estos: un texto inventado en un enlace nunca aparece como aviso oficial.
 */
export const MIN_PASSWORD = 8;

export const AUTH_MESSAGES = {
  wrongCredentials: "Correo o contraseña incorrectos.",
  emailNotConfirmed: "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.",
  alreadyRegistered: "Ya existe una cuenta con ese correo.",
  rateLimited: "Demasiados intentos. Espera unos minutos.",
  generic: "No se ha podido completar la operación.",
  missingCredentials: "Faltan el correo o la contraseña.",
  signupInvalid: `Indica un correo y una contraseña de al menos ${MIN_PASSWORD} caracteres.`,
  checkEmail: "Revisa tu correo para confirmar la cuenta.",
  missingEmail: "Indica tu correo.",
  resetSent: "Si ese correo tiene cuenta, recibirás un enlace para cambiar la contraseña.",
  passwordTooShort: `Usa al menos ${MIN_PASSWORD} caracteres.`,
  passwordTooLong: "Usa como máximo 72 caracteres.",
  passwordRejected: "No se pudo cambiar. Prueba con otra contraseña.",
  resetExpired: "El enlace ha caducado. Solicita uno nuevo.",
  accountDeleted: "Tu cuenta y todos tus datos se han borrado.",
  emailConfirmedLogin: "Correo confirmado. Inicia sesión para continuar.",
  accountConfirmed: "Cuenta confirmada. Ya puedes iniciar sesión.",
  sameBrowser: "Abre el enlace en el mismo navegador donde lo solicitaste.",
  invalidLink: "El enlace no es válido o ha caducado. Solicita uno nuevo.",
  microsoftFailed:
    "No se pudo entrar con Microsoft. Inténtalo de nuevo o entra con tu correo y contraseña.",
  googleFailed:
    "No se pudo entrar con Google. Inténtalo de nuevo o entra con tu correo y contraseña.",
  googleCancelled: "Has cancelado el inicio de sesión con Google.",
  microsoftCancelled: "Has cancelado el inicio de sesión con Microsoft.",
  microsoftBlocked:
    "Tu cuenta de Microsoft no ha dado permiso a VRS Studio (puede que el centro lo tenga bloqueado). Entra con tu correo y contraseña.",
} as const;

const KNOWN = new Set<string>(Object.values(AUTH_MESSAGES));

/** Devuelve el aviso solo si es uno de los propios de la app. */
export function knownMessage(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  return text && KNOWN.has(text) ? text : undefined;
}
