# Configuracion de `laberinto-config.json`

Este proyecto carga su configuracion desde [`public/config/laberinto-config.json`](public/config/laberinto-config.json).

## Ejemplo completo

```json
{
  "nombreApp": "STEAM-G",
  "descripcion": "Juego de laberinto para practicar pensamiento logico y secuencias de instrucciones con pseudocodigo",
  "autor": "Valeria C. Z.",
  "version": "1.0",
  "fecha": "2026-05-28",
  "plataformas": ["android", "ios", "web"],
  "nivel": "intermedio",
  "ar": {
    "inicio": {
      "activo": true,
      "contenido": {
        "texto": "Prepara la ruta del laberinto",
        "imagen": "/assets/personaje_saludando.gif",
        "audio": "/assets/intro.mp3",
        "video": "/assets/intro.mp4"
      }
    },
    "acierto": {
      "activo": true,
      "contenido": {
        "texto": "Ruta correcta",
        "imagen": "/assets/personaje_brincando.gif"
      }
    },
    "fin": {
      "activo": true,
      "contenido": {
        "texto": "Laberinto completado",
        "imagen": "/assets/personaje_caminar_derecha.gif"
      }
    }
  }
}
```

## Campos principales

| Campo | Tipo | Opciones / formato | Valor por defecto | Uso en la app |
| --- | --- | --- | --- | --- |
| `nombreApp` | string | Texto libre | `STEAM-G` | Nombre mostrado en la pantalla inicial e informacion. |
| `descripcion` | string | Texto libre | Descripcion interna del juego | Texto mostrado en informacion y popover. |
| `autor` | string | Texto libre | `Valeria C. Z.` | Tarjeta de informacion. |
| `version` | string | Texto libre, por ejemplo `1.0` | `1.0` | Tarjeta de informacion. |
| `fecha` | string | Recomendado `YYYY-MM-DD`, por ejemplo `2026-05-28` | `2 de Diciembre del 2025` | Se convierte a texto largo, por ejemplo `28 de mayo del 2026`. |
| `plataformas` | string[] | `["android"]`, `["ios"]`, `["web"]` o combinaciones | `android` | Tarjeta de informacion. Valores conocidos se muestran como Android, iOS y Web. |
| `nivel` | string | `basico`, `basic`, `intermedio`, `intermediate`, `avanzado`, `advanced` | `basic` | Selecciona dificultad, numero de ejercicios, puntos y oportunidades. |
| `ar` | object | Ver seccion AR | Sin ventanas AR | Configura ventanas multimedia de inicio, acierto y fin. |

Importante: los valores de `nivel` deben escribirse sin acentos. Si se usa un valor desconocido, la app cae a `basic`.

## Niveles

| `nivel` | Etiqueta | Ejercicios | Puntos por acierto | Oportunidades por ejercicio |
| --- | --- | ---: | ---: | ---: |
| `basico` o `basic` | Basico | 3 | 10 | 3 |
| `intermedio` o `intermediate` | Intermedio | 4 | 15 | 2 |
| `avanzado` o `advanced` | Avanzado | 5 | 20 | 1 |

El JSON solo selecciona el nivel. Los laberintos, rutas validas, puntajes base y oportunidades estan definidos en el codigo fuente.

## Configuracion AR

El objeto `ar` puede tener tres secciones:

| Seccion | Momento en que aparece |
| --- | --- |
| `inicio` | Despues de la cuenta regresiva, antes de comenzar el juego. |
| `acierto` | Despues de resolver correctamente un laberinto. Esta seccion intenta usar la camara frontal/webcam como fondo. |
| `fin` | Al terminar el juego, antes del resumen final. |

Cada seccion usa esta estructura:

```json
{
  "activo": true,
  "contenido": {
    "texto": "Mensaje",
    "imagen": "/assets/imagen.gif",
    "audio": "/assets/audio.mp3",
    "video": "/assets/video.mp4"
  }
}
```

### Opciones de cada seccion AR

| Campo | Tipo | Requerido | Descripcion |
| --- | --- | --- | --- |
| `activo` | boolean | Si, para mostrarla | Debe ser `true`. Si es `false` o se omite, la seccion se salta. |
| `contenido` | object | Si, para mostrarla | Debe contener al menos un valor no vacio en `texto`, `imagen`, `audio` o `video`. |

### Opciones de `contenido`

| Campo | Tipo | Formato | Comportamiento |
| --- | --- | --- | --- |
| `texto` | string | Texto libre; usa `\n` para saltos de linea | Se renderiza como texto 3D. Conviene que sea corto. |
| `imagen` | string | Ruta local o URL, por ejemplo `/assets/personaje.gif` | Se renderiza en una escena 3D. GIF, PNG, JPG y WebP dependen del soporte del navegador. |
| `audio` | string | Ruta local o URL, por ejemplo `/assets/audio.mp3` | Se reproduce en bucle. Si es el unico contenido, se muestra un reproductor. |
| `video` | string | Ruta local o URL, por ejemplo `/assets/video.mp4` | Se reproduce en bucle y sin sonido dentro de la escena 3D. |

Para imagenes y videos remotos, el servidor externo debe permitir CORS. Para evitar problemas, guarda los recursos en `public/assets` y referencialos con `/assets/nombre-del-archivo.ext`.

La seccion `acierto` intenta abrir la camara frontal o webcam. En navegador, la camara requiere HTTPS o `localhost`, y el usuario debe dar permiso.

## Ejemplos utiles

Configuracion minima:

```json
{
  "nivel": "basico"
}
```

Mostrar solo una ventana de inicio:

```json
{
  "nivel": "intermedio",
  "ar": {
    "inicio": {
      "activo": true,
      "contenido": {
        "texto": "Comienza el reto",
        "imagen": "/assets/personaje_saludando.gif"
      }
    }
  }
}
```

Desactivar una seccion AR:

```json
{
  "ar": {
    "acierto": {
      "activo": false
    }
  }
}
```

Usar solo audio:

```json
{
  "ar": {
    "inicio": {
      "activo": true,
      "contenido": {
        "audio": "/assets/intro.mp3"
      }
    }
  }
}
```

