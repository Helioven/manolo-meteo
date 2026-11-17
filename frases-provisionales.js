/* Catálogo del piloto 008: pendiente de aprobación, no activado. */
globalThis.MeteoPhraseCatalog = {
  "schemaVersion": 1,
  "catalogVersion": "005.0",
  "messages": [
    {
      "id": "clear-01",
      "condition": "clear",
      "risk": "normal",
      "style": "cotidiano",
      "requirements": [
        "code",
        "temperature",
        "probability",
        "wind"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Se espera cielo despejado {windowWhen}, con {temp} y una probabilidad máxima de precipitación del {prob} %.",
          "practical": "Puede ser un buen momento para salir.",
          "humor": "El cielo se ha levantado con ganas de colaborar."
        },
        "en": {
          "observation": "Clear skies are expected {windowWhen}, with temperatures of {temp} and a maximum {prob}% chance of precipitation.",
          "practical": "It could be a good time to head out.",
          "humor": "The sky seems ready to cooperate."
        }
      }
    },
    {
      "id": "clear-02",
      "condition": "clear",
      "risk": "normal",
      "style": "ironia",
      "requirements": [
        "code",
        "temperature",
        "probability",
        "wind"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Se espera cielo despejado {windowWhen}, con {temp} y una probabilidad máxima de precipitación del {prob} %.",
          "practical": "Puede ser un buen momento para salir.",
          "humor": "Una previsión sin sobresaltos. Qué detalle."
        },
        "en": {
          "observation": "Clear skies are expected {windowWhen}, with temperatures of {temp} and a maximum {prob}% chance of precipitation.",
          "practical": "It could be a good time to head out.",
          "humor": "A forecast without surprises. How thoughtful."
        }
      }
    },
    {
      "id": "clear-03",
      "condition": "clear",
      "risk": "normal",
      "style": "absurdo",
      "requirements": [
        "code",
        "temperature",
        "probability",
        "wind"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Se espera cielo despejado {windowWhen}, con {temp} y una probabilidad máxima de precipitación del {prob} %.",
          "practical": "Puede ser un buen momento para salir.",
          "humor": "Las nubes han pedido el día libre."
        },
        "en": {
          "observation": "Clear skies are expected {windowWhen}, with temperatures of {temp} and a maximum {prob}% chance of precipitation.",
          "practical": "It could be a good time to head out.",
          "humor": "The clouds have requested a day off."
        }
      }
    },
    {
      "id": "clear-04",
      "condition": "clear",
      "risk": "normal",
      "style": "ingenio",
      "requirements": [
        "code",
        "temperature",
        "probability",
        "wind"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Se espera cielo despejado {windowWhen}, con {temp} y una probabilidad máxima de precipitación del {prob} %.",
          "practical": "Puede ser un buen momento para salir.",
          "humor": "Un buen claro para aclarar las ideas."
        },
        "en": {
          "observation": "Clear skies are expected {windowWhen}, with temperatures of {temp} and a maximum {prob}% chance of precipitation.",
          "practical": "It could be a good time to head out.",
          "humor": "A clear spell might clear the mind."
        }
      }
    },
    {
      "id": "clear-05",
      "condition": "clear",
      "risk": "normal",
      "style": "natural",
      "requirements": [
        "code",
        "temperature",
        "probability",
        "wind"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Se espera cielo despejado {windowWhen}, con {temp} y una probabilidad máxima de precipitación del {prob} %.",
          "practical": "Puede ser un buen momento para salir.",
          "humor": null
        },
        "en": {
          "observation": "Clear skies are expected {windowWhen}, with temperatures of {temp} and a maximum {prob}% chance of precipitation.",
          "practical": "It could be a good time to head out.",
          "humor": null
        }
      }
    },
    {
      "id": "clear-06",
      "condition": "clear",
      "risk": "normal",
      "style": "cotidiano",
      "requirements": [
        "code",
        "temperature",
        "probability",
        "wind"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Se espera cielo despejado {windowWhen}, con {temp} y una probabilidad máxima de precipitación del {prob} %.",
          "practical": "Puede ser un buen momento para salir.",
          "humor": "Parece un buen momento para tomar el aire."
        },
        "en": {
          "observation": "Clear skies are expected {windowWhen}, with temperatures of {temp} and a maximum {prob}% chance of precipitation.",
          "practical": "It could be a good time to head out.",
          "humor": "It looks like a nice time for fresh air."
        }
      }
    },
    {
      "id": "clear-07",
      "condition": "clear",
      "risk": "normal",
      "style": "ironia",
      "requirements": [
        "code",
        "temperature",
        "probability",
        "wind"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Se espera cielo despejado {windowWhen}, con {temp} y una probabilidad máxima de precipitación del {prob} %.",
          "practical": "Puede ser un buen momento para salir.",
          "humor": "El cielo no parece buscar protagonismo."
        },
        "en": {
          "observation": "Clear skies are expected {windowWhen}, with temperatures of {temp} and a maximum {prob}% chance of precipitation.",
          "practical": "It could be a good time to head out.",
          "humor": "The sky is keeping a low profile."
        }
      }
    },
    {
      "id": "rain-01",
      "condition": "rain",
      "risk": "caution",
      "style": "cotidiano",
      "requirements": [
        "probability"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Podría haber {precip} {eventWhen}, con una probabilidad máxima del {prob} %.",
          "practical": "Un paraguas puede venir bien.",
          "humor": "Por si el cielo cambia de planes."
        },
        "en": {
          "observation": "There is a chance of {precip} {eventWhen}, with a maximum probability of {prob}%.",
          "practical": "An umbrella might come in handy.",
          "humor": "In case the sky changes its plans."
        }
      }
    },
    {
      "id": "rain-02",
      "condition": "rain",
      "risk": "caution",
      "style": "ironia",
      "requirements": [
        "probability"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Podría haber {precip} {eventWhen}, con una probabilidad máxima del {prob} %.",
          "practical": "Un paraguas puede venir bien.",
          "humor": "El cielo aún está decidiendo. Muy suyo."
        },
        "en": {
          "observation": "There is a chance of {precip} {eventWhen}, with a maximum probability of {prob}%.",
          "practical": "An umbrella might come in handy.",
          "humor": "The sky is still making up its mind. Typical."
        }
      }
    },
    {
      "id": "rain-03",
      "condition": "rain",
      "risk": "caution",
      "style": "absurdo",
      "requirements": [
        "probability"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Podría haber {precip} {eventWhen}, con una probabilidad máxima del {prob} %.",
          "practical": "Un paraguas puede venir bien.",
          "humor": "Las gotas están deliberando en asamblea."
        },
        "en": {
          "observation": "There is a chance of {precip} {eventWhen}, with a maximum probability of {prob}%.",
          "practical": "An umbrella might come in handy.",
          "humor": "The raindrops are holding a meeting."
        }
      }
    },
    {
      "id": "rain-04",
      "condition": "rain",
      "risk": "caution",
      "style": "ingenio",
      "requirements": [
        "probability"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Podría haber {precip} {eventWhen}, con una probabilidad máxima del {prob} %.",
          "practical": "Un paraguas puede venir bien.",
          "humor": "Planes con margen de remojo."
        },
        "en": {
          "observation": "There is a chance of {precip} {eventWhen}, with a maximum probability of {prob}%.",
          "practical": "An umbrella might come in handy.",
          "humor": "Plans with a chance of a little damp."
        }
      }
    },
    {
      "id": "rain-05",
      "condition": "rain",
      "risk": "caution",
      "style": "natural",
      "requirements": [
        "probability"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Podría haber {precip} {eventWhen}, con una probabilidad máxima del {prob} %.",
          "practical": "Un paraguas puede venir bien.",
          "humor": null
        },
        "en": {
          "observation": "There is a chance of {precip} {eventWhen}, with a maximum probability of {prob}%.",
          "practical": "An umbrella might come in handy.",
          "humor": null
        }
      }
    },
    {
      "id": "rain-06",
      "condition": "rain",
      "risk": "caution",
      "style": "cotidiano",
      "requirements": [
        "probability"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Podría haber {precip} {eventWhen}, con una probabilidad máxima del {prob} %.",
          "practical": "Un paraguas puede venir bien.",
          "humor": "Conviene tener un plan bajo techo."
        },
        "en": {
          "observation": "There is a chance of {precip} {eventWhen}, with a maximum probability of {prob}%.",
          "practical": "An umbrella might come in handy.",
          "humor": "A plan indoors might come in handy."
        }
      }
    },
    {
      "id": "rain-07",
      "condition": "rain",
      "risk": "caution",
      "style": "ironia",
      "requirements": [
        "probability"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Podría haber {precip} {eventWhen}, con una probabilidad máxima del {prob} %.",
          "practical": "Un paraguas puede venir bien.",
          "humor": "La previsión nos deja elegir con un poco de suspense."
        },
        "en": {
          "observation": "There is a chance of {precip} {eventWhen}, with a maximum probability of {prob}%.",
          "practical": "An umbrella might come in handy.",
          "humor": "The forecast leaves us with a little suspense."
        }
      }
    },
    {
      "id": "storm-01",
      "condition": "storm",
      "risk": "high",
      "style": "seguridad",
      "requirements": [
        "stormCode"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Podría haber tormenta {eventWhen}.",
          "practical": "Si se acerca, busca refugio adecuado y consulta los avisos oficiales.",
          "humor": null
        },
        "en": {
          "observation": "A thunderstorm is possible {eventWhen}.",
          "practical": "If one approaches, find suitable shelter and check official warnings.",
          "humor": null
        }
      }
    },
    {
      "id": "storm-02",
      "condition": "storm",
      "risk": "high",
      "style": "seguridad",
      "requirements": [
        "stormCode"
      ],
      "active": true,
      "translations": {
        "es": {
          "observation": "Podría haber tormenta {eventWhen}.",
          "practical": "Si se acerca, busca refugio adecuado y consulta los avisos oficiales.",
          "humor": null
        },
        "en": {
          "observation": "A thunderstorm is possible {eventWhen}.",
          "practical": "If one approaches, find suitable shelter and check official warnings.",
          "humor": null
        }
      }
    }
  ]
};
