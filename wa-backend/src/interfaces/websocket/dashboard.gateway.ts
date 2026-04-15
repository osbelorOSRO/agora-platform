import { Server as IOServer } from 'socket.io'
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import qrcode from 'qrcode-terminal'
import { WhatsAppGateway } from '../../application/whatsapp.gateway.js'
import { loadConfig, saveConfig } from '../../infrastructure/config/config.repository.js'
import { logger } from '../../shared/logger.js'
import { env } from '../../config/env.js'
import { runtimeState } from '../../shared/runtime-state.js'

let blockQueue: Promise<void> = Promise.resolve()
let lastQrData: string | null = null
let lastQrImage: string | null = null

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = blockQueue.then(job, job)
  blockQueue = run.then(() => undefined, () => undefined)
  return run
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function normalizePhone(input: string): string {
  return String(input || '').replace(/\D/g, '')
}

async function waitOpen(gateway: WhatsAppGateway, timeoutMs = 15000): Promise<void> {

  const start = Date.now()

  while (Date.now() - start < timeoutMs) {

    try {
      gateway.getSocket()
      return
    } catch {}

    await sleep(300)

  }

  throw new Error('Socket no disponible')
}

async function resolveCandidateJids(gateway: WhatsAppGateway, numero: string): Promise<string[]> {

  const sock = gateway.getSocket()
  const candidates = new Set<string>()

  try {

    const probe = await sock.onWhatsApp(numero)

    logger.info(`onWhatsApp resultado: ${JSON.stringify(probe)}`)

    if (Array.isArray(probe)) {

      for (const item of probe) {

        const i: any = item

        if (i?.jid) {
          candidates.add(String(i.jid))
        }

        if (i?.lid) {
          candidates.add(String(i.lid))
        }

      }

    }

  } catch (err) {

    logger.warn(`Error consultando onWhatsApp: ${JSON.stringify(err)}`)

  }

  candidates.add(`${numero}@s.whatsapp.net`)

  logger.info(`JIDs candidatos: ${JSON.stringify([...candidates])}`)

  return [...candidates]
}

async function updateBlockNative(
  gateway: WhatsAppGateway,
  numero: string,
  action: 'block' | 'unblock'
): Promise<void> {

  const sock = gateway.getSocket()

  logger.info(`Intentando bloqueo nativo numero=${numero} action=${action} botUser=${JSON.stringify(sock?.user)}`)

  try {

    const exists = await sock.onWhatsApp(numero)

    logger.info(`Verificación existencia WhatsApp: ${JSON.stringify(exists)}`)

  } catch (err) {

    logger.warn(`Error en onWhatsApp: ${JSON.stringify(err)}`)

  }

  try {

    const blocklist = await sock.fetchBlocklist()

    logger.info(`Blocklist actual total=${blocklist.length}`)

  } catch (err) {

    logger.warn(`Error obteniendo blocklist: ${JSON.stringify(err)}`)

  }

  let lastErr: any

  const jids = await resolveCandidateJids(gateway, numero)

  for (const jid of jids) {

    for (let i = 1; i <= 3; i++) {

      try {

        logger.info(`Intentando updateBlockStatus jid=${jid} intento=${i}`)

        await waitOpen(gateway)

        await gateway.getSocket().updateBlockStatus(jid, action)

        logger.info(`Bloqueo exitoso jid=${jid}`)

        return

      } catch (e) {

        logger.warn(`Error updateBlockStatus jid=${jid} intento=${i} error=${JSON.stringify(e)}`)

        lastErr = e

        await sleep(500 * i)

      }

    }

  }

  logger.error(`Bloqueo falló numero=${numero} action=${action} error=${JSON.stringify(lastErr)}`)

  throw lastErr || new Error(`No se pudo ${action} para ${numero}`)
}

export function registerDashboardGateway(io: IOServer, gateway: WhatsAppGateway): void {

  gateway.onConnectionUpdate(async (update) => {

    runtimeState.setConnection(update.connection)

    if (update.connection === 'open') {
      lastQrData = null
      lastQrImage = null

      try {
        runtimeState.setNumero(gateway.getSocket().user?.id?.split(':')[0] ?? null)
      } catch {
        runtimeState.setNumero(null)
      }

      runtimeState.markConexionOpen()

    }

    if (update.qr) {
      lastQrData = update.qr

      try {

        const qrImage = await QRCode.toDataURL(update.qr, {
          width: 420,
          margin: 2,
          color: { dark: '#000000FF', light: '#FFFFFFFF' },
        })

        lastQrImage = qrImage
        io.emit('qrImage', qrImage)

      } catch {

        io.emit('qrData', update.qr)

      }

      io.emit('qrData', update.qr)

      qrcode.generate(update.qr, { small: true })

    }

    io.emit('estadoCompleto', runtimeState.snapshotEstado())
    io.emit('stats', runtimeState.snapshotStats())

  })

  gateway.onMessage(() => {

    runtimeState.markIncoming()

    io.emit('estadoCompleto', runtimeState.snapshotEstado())
    io.emit('stats', runtimeState.snapshotStats())

  })

  io.on('connection', (socket) => {

    socket.emit('estadoCompleto', runtimeState.snapshotEstado())
    socket.emit('stats', runtimeState.snapshotStats())
    socket.emit('config', loadConfig())
    if (lastQrImage) {
      socket.emit('qrImage', lastQrImage)
    } else if (lastQrData) {
      socket.emit('qrData', lastQrData)
    }

    socket.on('getStats', () => {
      socket.emit('stats', runtimeState.snapshotStats())
    })

    socket.on('getEstado', () => {
      socket.emit('estadoCompleto', runtimeState.snapshotEstado())
    })

    socket.on('restart', async () => {
      try {
        socket.emit('qrStatus', { status: 'info', message: 'Reiniciando bot...' })
        await enqueue(async () => {
          await gateway.restart({ refreshAuthState: true })
        })
        io.emit('estadoCompleto', runtimeState.snapshotEstado())
        io.emit('stats', runtimeState.snapshotStats())
        socket.emit('qrStatus', { status: 'success', message: 'Bot reiniciado' })
      } catch (error: any) {
        logger.error(`Error restart dashboard: ${JSON.stringify(error)}`)
        socket.emit('qrStatus', {
          status: 'error',
          message: error?.message || 'No se pudo reiniciar el bot',
        })
      }
    })

    socket.on('logout', async () => {
      try {
        socket.emit('qrStatus', { status: 'info', message: 'Cerrando sesión de WhatsApp...' })
        await enqueue(async () => {
          gateway.setPhase('PAIRING')
          await gateway.logout()
          await sleep(1200)
          await gateway.restart({ refreshAuthState: true, resetAuth: true })
        })
        socket.emit('qrStatus', { status: 'success', message: 'Sesión cerrada. Esperando QR...' })
      } catch (error: any) {
        logger.error(`Error logout dashboard: ${JSON.stringify(error)}`)
        socket.emit('qrStatus', {
          status: 'error',
          message: error?.message || 'No se pudo cerrar sesión',
        })
      }
    })

    socket.on('generateQR', async () => {
      try {
        socket.emit('qrStatus', { status: 'info', message: 'Generando nuevo QR...' })
        await enqueue(async () => {
          gateway.setPhase('PAIRING')
          await gateway.restart({ refreshAuthState: true, resetAuth: true })
        })
        socket.emit('qrStatus', {
          status: 'success',
          message: 'QR solicitado. Escanea cuando aparezca.',
        })
      } catch (error: any) {
        logger.error(`Error generateQR dashboard: ${JSON.stringify(error)}`)
        socket.emit('qrStatus', {
          status: 'error',
          message: error?.message || 'No se pudo generar QR',
        })
      }
    })

    socket.on('bloquear', async (numeroRaw: string) => {

      const numero = normalizePhone(numeroRaw)

      if (!numero) {

        socket.emit('bloqueado', { numero: numeroRaw, success: false, error: 'Número inválido' })
        return

      }

      try {

        logger.info(`Solicitud bloqueo dashboard numero=${numero}`)

        await enqueue(() => updateBlockNative(gateway, numero, 'block'))

        const config = loadConfig()

        if (!config.blocks.includes(numero)) {

          config.blocks.push(numero)
          saveConfig(config)

        }

        io.emit('config', config)

        socket.emit('bloqueado', { numero, success: true })

      } catch (error: any) {

        logger.warn(`No se pudo bloquear en WhatsApp nativo: ${numero} error=${JSON.stringify(error)}`)

        socket.emit('bloqueado', {
          numero,
          success: false,
          error: error?.message || 'Fallo bloqueo nativo',
        })

      }

    })

    socket.on('desbloquear', async (numeroRaw: string) => {

      const numero = normalizePhone(numeroRaw)

      if (!numero) {

        socket.emit('desbloqueado', { numero: numeroRaw, success: false, error: 'Número inválido' })
        return

      }

      try {

        logger.info(`Solicitud desbloqueo dashboard numero=${numero}`)

        await enqueue(() => updateBlockNative(gateway, numero, 'unblock'))

        const config = loadConfig()

        config.blocks = config.blocks.filter((n) => n !== numero)

        saveConfig(config)

        io.emit('config', config)

        socket.emit('desbloqueado', { numero, success: true })

      } catch (error: any) {

        logger.warn(`No se pudo desbloquear en WhatsApp nativo: ${numero} error=${JSON.stringify(error)}`)

        socket.emit('desbloqueado', {
          numero,
          success: false,
          error: error?.message || 'Fallo desbloqueo nativo',
        })

      }

    })

  })

}
