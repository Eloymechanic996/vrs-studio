# VRS Studio - Registro de karting

Aplicacion de escritorio en Python para que un mecanico registre setup, vueltas y eventos de pista, y luego exporte todo a un Excel real.

## Requisitos

- Python 3
- `tkinter`
- `openpyxl`

## Ejecutar

```powershell
python app.py
```

## Que hace esta primera version

- Pantalla de sesion con datos generales del test o carrera.
- Pestana de tiempos con cronometro integrado.
- Registro manual de vueltas, `Pit In`, `Pit Out`, `Safety Car` y estado de pista.
- Pestanas de setup de direccion, eje trasero y motor.
- Exportacion a `.xlsx` usando una plantilla base opcional.

## Plantilla Excel

Si seleccionas un archivo `.xlsx` en la aplicacion:

- Se cargara como plantilla base.
- La app rellenara o creara las hojas `Resumen`, `Tiempos` y `Setup`.

Si no seleccionas ninguna plantilla, la aplicacion generara un Excel nuevo con esa estructura.
