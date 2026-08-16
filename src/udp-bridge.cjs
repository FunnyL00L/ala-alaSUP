const dgram = require('dgram');

// ============================================================
// CONFIG
// ============================================================

const UDP_HOST = '0.0.0.0';
const UDP_PORT = 4000;

// REST server lama kamu.
// UDP bridge akan meneruskan data ke REST API ini.
const API_BASE =
  process.env.API_BASE ||
  'http://127.0.0.1:3000/api/v1';

// ============================================================
// UDP SERVER
// ============================================================

const udpServer =
  dgram.createSocket('udp4');

// ============================================================
// CLIENT STATE
// ============================================================

let lastClient = null;

let cachedState = {
  sensors: [],
  servos: [],
};

let lastServoSignature = '';

let totalUdpRx = 0;
let totalUdpTx = 0;

// ============================================================
// UTILITY
// ============================================================

function clamp(value) {
  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, number)
  );
}

function now() {
  return new Date().toISOString();
}

// ============================================================
// SEND UDP
// ============================================================

function sendUdp(
  payload,
  client = lastClient
) {
  if (!client) {
    return;
  }

  try {
    const json =
      JSON.stringify(payload);

    const buffer =
      Buffer.from(json);

    udpServer.send(
      buffer,
      client.port,
      client.address,
      (error) => {
        if (error) {
          console.error(
            '[UDP TX ERROR]',
            error
          );

          return;
        }

        totalUdpTx++;
      }
    );
  } catch (error) {
    console.error(
      '[UDP SEND ERROR]',
      error
    );
  }
}

// ============================================================
// API GET
// ============================================================

async function apiGet(
  endpoint
) {
  const response =
    await fetch(
      API_BASE + endpoint,
      {
        method: 'GET',

        headers: {
          Accept:
            'application/json',
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `API GET ${endpoint} => ${response.status}`
    );
  }

  return response.json();
}

// ============================================================
// API PUT
// ============================================================

async function apiPut(
  endpoint,
  body
) {
  const response =
    await fetch(
      API_BASE + endpoint,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(body),
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `API PUT ${endpoint} => ${response.status} ${text}`
    );
  }

  try {
    return await response.json();
  } catch {
    return {};
  }
}

// ============================================================
// REFRESH CACHE
//
// Kita tidak GET REST setiap satu paket UDP.
// Bridge mengambil /state berkala lalu menyimpannya.
// ============================================================

async function refreshCache() {
  try {
    const state =
      await apiGet('/state');

    const sensors = state.sensors || state.finger_sensor;
    if (sensors && Array.isArray(sensors)) {
      cachedState.sensors = sensors;
    }

    const servos = state.servos || state.servo_control;
    if (servos && Array.isArray(servos)) {
      cachedState.servos = servos;
    }

    // ------------------------------------
    // Detect perubahan servo
    // ------------------------------------

    const signature =
      JSON.stringify(
        cachedState.servos.map(
          (servo) => ({
            id:
              servo.id,

            limit_genggam:
              servo.limit_genggam,
          })
        )
      );

    // Kalau servo berubah di dashboard,
    // langsung push ke Unity via UDP.
    if (
      lastServoSignature &&
      signature !==
        lastServoSignature
    ) {
      sendUdp({
        type:
          'SERVO_STATE',

        servos:
          cachedState.servos,

        timestamp:
          now(),
      });
    }

    lastServoSignature =
      signature;
  } catch (error) {
    // Jangan spam terminal.
    // REST server mungkin sedang restart.
  }
}

// Refresh cache 20 kali / detik.
setInterval(
  refreshCache,
  50
);

refreshCache();

// ============================================================
// UPDATE SINGLE SENSOR
// ============================================================

async function updateSensor(
  id,
  nilai
) {
  const sensorId =
    Number(id);

  const value =
    clamp(nilai);

  return apiPut(
    `/finger_sensor/${sensorId}`,
    {
      nilai: value,
    }
  );
}

// ============================================================
// UPDATE SINGLE SERVO
// ============================================================

async function updateServo(
  id,
  value
) {
  const servoId =
    Number(id);

  const clamped =
    clamp(value);

  return apiPut(
    `/servo_control/${servoId}`,
    {
      limit_genggam:
        clamped,
    }
  );
}

// ============================================================
// SENSOR BATCH
// ============================================================

async function handleSensorBatch(
  sensors
) {
  if (
    !Array.isArray(sensors)
  ) {
    return;
  }

  const promises =
    sensors.map(
      (sensor) =>
        updateSensor(
          sensor.id,
          sensor.nilai
        )
    );

  await Promise.all(
    promises
  );
}

// ============================================================
// UDP MESSAGE
// ============================================================

udpServer.on(
  'message',
  async (
    messageBuffer,
    remote
  ) => {
    totalUdpRx++;

    // Simpan alamat Unity/Oculus terakhir.
    lastClient = {
      address:
        remote.address,

      port:
        remote.port,
    };

    let data;

    try {
      const raw =
        messageBuffer.toString(
          'utf8'
        );

      data =
        JSON.parse(raw);
    } catch (error) {
      console.log(
        '[UDP] Invalid JSON from',
        remote.address
      );

      sendUdp(
        {
          type:
            'ERROR',

          error:
            'INVALID_JSON',
        },
        remote
      );

      return;
    }

    try {
      switch (
        data.type
      ) {
        // ====================================================
        // REGISTER
        // ====================================================

        case 'REGISTER': {
          console.log(
            `[UDP] Unity registered: ${remote.address}:${remote.port}`
          );

          sendUdp(
            {
              type:
                'REGISTERED',

              message:
                'DB_HyperMedia UDP connected',

              serverTime:
                now(),

              udpPort:
                UDP_PORT,
            },
            remote
          );

          sendUdp(
            {
              type:
                'STATE',

              sensors:
                cachedState.sensors,

              servos:
                cachedState.servos,

              timestamp:
                now(),
            },
            remote
          );

          break;
        }

        // ====================================================
        // PING
        // ====================================================

        case 'PING': {
          sendUdp(
            {
              type:
                'PONG',

              timestamp:
                now(),

              rx:
                totalUdpRx,

              tx:
                totalUdpTx,
            },
            remote
          );

          break;
        }

        // ====================================================
        // UPDATE SINGLE SENSOR
        // ====================================================

        case 'UPDATE_SENSOR': {
          await updateSensor(
            data.id,
            data.nilai
          );

          sendUdp(
            {
              type:
                'SENSOR_ACK',

              id:
                Number(
                  data.id
                ),

              nilai:
                clamp(
                  data.nilai
                ),

              timestamp:
                now(),
            },
            remote
          );

          break;
        }

        // ====================================================
        // UPDATE 5 SENSOR SEKALIGUS
        // ====================================================

        case 'SENSOR_BATCH': {
          await handleSensorBatch(
            data.sensors
          );

          sendUdp(
            {
              type:
                'SENSOR_BATCH_ACK',

              count:
                Array.isArray(
                  data.sensors
                )
                  ? data
                      .sensors
                      .length
                  : 0,

              timestamp:
                now(),
            },
            remote
          );

          break;
        }

        // ====================================================
        // SET SERVO DARI UNITY
        // ====================================================

        case 'SET_SERVO': {
          await updateServo(
            data.id,
            data.limit_genggam
          );

          sendUdp(
            {
              type:
                'SERVO_ACK',

              id:
                Number(
                  data.id
                ),

              limit_genggam:
                clamp(
                  data.limit_genggam
                ),

              timestamp:
                now(),
            },
            remote
          );

          break;
        }

        // ====================================================
        // GET SERVO
        // ====================================================

        case 'GET_SERVOS': {
          sendUdp(
            {
              type:
                'SERVO_STATE',

              servos:
                cachedState.servos,

              timestamp:
                now(),
            },
            remote
          );

          break;
        }

        // ====================================================
        // GET SENSOR
        // ====================================================

        case 'GET_SENSORS': {
          sendUdp(
            {
              type:
                'SENSOR_STATE',

              sensors:
                cachedState.sensors,

              timestamp:
                now(),
            },
            remote
          );

          break;
        }

        // ====================================================
        // GET ALL
        // ====================================================

        case 'GET_STATE': {
          sendUdp(
            {
              type:
                'STATE',

              sensors:
                cachedState.sensors,

              servos:
                cachedState.servos,

              timestamp:
                now(),
            },
            remote
          );

          break;
        }

        // ====================================================
        // UNKNOWN
        // ====================================================

        default: {
          sendUdp(
            {
              type:
                'ERROR',

              error:
                'UNKNOWN_MESSAGE_TYPE',

              receivedType:
                data.type,
            },
            remote
          );
        }
      }
    } catch (error) {
      console.error(
        '[UDP HANDLE ERROR]',
        error.message
      );

      sendUdp(
        {
          type:
            'ERROR',

          error:
            error.message,

          timestamp:
            now(),
        },
        remote
      );
    }
  }
);

// ============================================================
// UDP LISTENING
// ============================================================

udpServer.on(
  'listening',
  () => {
    const address =
      udpServer.address();

    console.log(
      ''
    );

    console.log(
      '=============================================='
    );

    console.log(
      ' DB_HyperMedia UDP Bridge'
    );

    console.log(
      '=============================================='
    );

    console.log(
      `UDP Server : udp://${address.address}:${address.port}`
    );

    console.log(
      `REST API   : ${API_BASE}`
    );

    console.log(
      '=============================================='
    );

    console.log(
      ''
    );
  }
);

// ============================================================
// UDP ERROR
// ============================================================

udpServer.on(
  'error',
  (error) => {
    console.error(
      '[UDP SERVER ERROR]',
      error
    );
  }
);

// ============================================================
// BIND
// ============================================================

udpServer.bind(
  UDP_PORT,
  UDP_HOST
);

// ============================================================
// SHUTDOWN
// ============================================================

function shutdown() {
  console.log(
    '\nClosing UDP server...'
  );

  try {
    udpServer.close();
  } catch {
    // ignore
  }

  process.exit(0);
}

process.on(
  'SIGINT',
  shutdown
);

process.on(
  'SIGTERM',
  shutdown
);
