import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Player from '#models/player'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export default class PlayerSeeder extends BaseSeeder {
  async run() {
    const filePath = join(import.meta.dirname, '..', 'MOCK_DATA.json')
    const rawData = readFileSync(filePath, 'utf-8')
    const players = JSON.parse(rawData)

    const BATCH_SIZE = 10_000

    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE)
      await Player.createMany(batch)
      console.log(`Inserted records ${i + 1} to ${i + batch.length}`)
    }
  }
}
