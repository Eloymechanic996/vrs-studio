# VRS Studio Movil

Version movil offline basada en Kivy para convertirla en app Android real.

## Estructura

- `main.py`: aplicacion movil principal.
- `buildozer.spec`: configuracion base para empaquetar APK.
- `requirements.txt`: dependencias de Python.

## Que hace ahora

- Funciona como base de app movil nativa empaquetable.
- Mantiene sesion, tiempos, setup y logica de `Pit Out` y `Pit In`.
- Guarda los datos en local dentro del dispositivo.
- Exporta la sesion a `JSON` en el almacenamiento interno de la app.

## Importante

Esta carpeta ahora esta orientada a una app Android offline.
Los archivos web antiguos pueden seguir aqui mientras esten bloqueados, pero la ruta valida de trabajo pasa a ser `main.py`.

## Siguiente paso para tener APK

1. Usar Linux o WSL con Python.
2. Instalar `buildozer` y sus dependencias.
3. Ejecutar `buildozer android debug`.

Luego se generara el APK para instalarlo en Android.
