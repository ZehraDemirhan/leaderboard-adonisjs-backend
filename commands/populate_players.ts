import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import leaderboardConfig from '#config/leaderboard'
// Bu komutla
// 10 milyon oyuncu kaydını "players" tablosuna toplu olarak ekliyorum.
// Raw SQL INSERT ifadelerini batch halinde üretip çalıştırıyorum.
// Raw SQL’i tercih ediyorum çünkü Lucid ORM’e kıyasla çok daha hızlı çalışıyor ve
export default class PopulatePlayers extends BaseCommand {
  public static commandName = 'populate:players'
  static options: CommandOptions = {
    startApp: true,
  }

  /**
   * Generates a batched INSERT SQL for player records.
   */
  private generateInsertSQLForPlayers(
    batch: Array<{ id: number; name: string; country: string; money: bigint }>,
    timestamp: string
  ): string {
    const columns = ['id', 'name', 'country', 'money', 'created_at', 'updated_at']
    const values = batch
      .map(({ id, name, country, money }) => {
        // Escape single quotes in strings
        const escName = name.replace(/'/g, "''")
        const escCountry = country.replace(/'/g, "''")
        return `(${id}, '${escName}', '${escCountry}', ${money.toString()}, '${timestamp}', '${timestamp}')`
      })
      .join(',\n')

    return `INSERT INTO players (${columns.join(', ')}) VALUES\n${values};`
  }

  public async run() {
    this.logger.info('Populating 10,000,000 players via raw SQL in batches...')

    // 1) Ensure API key is set
    const apiKey = leaderboardConfig.apiNinjakey
    if (!apiKey) {
      this.logger.error(
        'Please set API_NINJAS_KEY in your environment before running this command.'
      )
      return
    }

    // 2) Fetch base names
    const resp = await fetch('https://api.api-ninjas.com/v1/babynames?gender=neutral', {
      headers: { 'X-Api-Key': apiKey },
    })
    if (!resp.ok) {
      this.logger.error(`Failed to fetch names: ${resp.status} ${resp.statusText}`)
      return
    }
    const names: string[] = await resp.json()

    // 3) Static list of countries for random assignment
    const countries = [
      'US',
      'CN',
      'JP',
      'DE',
      'FR',
      'BR',
      'IN',
      'RU',
      'CA',
      'GB',
      'AU',
      'SE',
      'NO',
      'FI',
      'NL',
      'BE',
      'CH',
      'ES',
      'IT',
      'MX',
    ]

    // 4) Batch settings
    const TOTAL = 10_000_000
    const BATCH_SIZE = 100_000
    const now = new Date().toISOString()

    for (let start = 1; start <= TOTAL; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, TOTAL)
      const batch: Array<{ id: number; name: string; country: string; money: bigint }> = []

      for (let i = start; i <= end; i++) {
        const baseName = names[(i - 1) % names.length]
        const playerName = `${baseName}${i}`
        const country = countries[Math.floor(Math.random() * countries.length)]
        batch.push({ id: i, name: playerName, country, money: BigInt(0) })
      }

      // 5) Generate and execute raw INSERT SQL
      const sql = this.generateInsertSQLForPlayers(batch, now)
      await db.rawQuery(sql)
      this.logger.info(`Inserted records ${start}-${end}`)
    }

    this.logger.info(`Successfully inserted ${TOTAL.toLocaleString()} players.`)
  }
}
