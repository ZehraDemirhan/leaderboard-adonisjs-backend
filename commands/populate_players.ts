import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
//import leaderboardConfig from '#config/leaderboard'
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

    /*
    // 1) Ensure API key is set
    const apiKey = leaderboardConfig.apiNinjakey
    if (!apiKey) {
      this.logger.error(
        'Please set API_NINJAS_KEY in your environment before running this command.'
      )
      return
    }
    */

    // 2) Fetch base names
    /*
    const resp = await fetch('https://api.api-ninjas.com/v1/babynames?gender=neutral', {
      headers: { 'X-Api-Key': apiKey },
    })
    if (!resp.ok) {
      this.logger.error(`Failed to fetch names: ${resp.status} ${resp.statusText}`)
      return
    }
    */
    //const names: string[] = (await resp.json()) as any

    // 2) Base names array (gender-neutral)
    const names: string[] = [
      'Alex',
      'Taylor',
      'Jordan',
      'Morgan',
      'Casey',
      'Riley',
      'Cameron',
      'Jamie',
      'Avery',
      'Quinn',
      'Reese',
      'Dakota',
      'Emerson',
      'Finley',
      'Harper',
      'Kai',
      'Ariel',
      'Rowan',
      'Skyler',
      'Peyton',
    ]

    // 3) Static list of countries for random assignment
    const countries = [
      'AD', // Andorra :contentReference[oaicite:0]{index=0}
      'AE', // United Arab Emirates :contentReference[oaicite:1]{index=1}
      'AF', // Afghanistan :contentReference[oaicite:2]{index=2}
      'AG', // Antigua and Barbuda :contentReference[oaicite:3]{index=3}
      'AI', // Anguilla :contentReference[oaicite:4]{index=4}
      'AL', // Albania :contentReference[oaicite:5]{index=5}
      'AM', // Armenia :contentReference[oaicite:6]{index=6}
      'AN', // Netherlands Antilles :contentReference[oaicite:7]{index=7}
      'AO', // Angola :contentReference[oaicite:8]{index=8}
      'AQ', // Antarctica :contentReference[oaicite:9]{index=9}
      'AR', // Argentina :contentReference[oaicite:10]{index=10}
      'AS', // American Samoa :contentReference[oaicite:11]{index=11}
      'AT', // Austria :contentReference[oaicite:12]{index=12}
      'AU', // Australia :contentReference[oaicite:13]{index=13}
      'AW', // Aruba :contentReference[oaicite:14]{index=14}
      'AX', // Åland Islands :contentReference[oaicite:15]{index=15}
      'AZ', // Azerbaijan :contentReference[oaicite:16]{index=16}
      'BA', // Bosnia and Herzegovina :contentReference[oaicite:17]{index=17}
      'BB', // Barbados :contentReference[oaicite:18]{index=18}
      'BD', // Bangladesh :contentReference[oaicite:19]{index=19}
      'BE', // Belgium :contentReference[oaicite:20]{index=20}
    ]

    // 4) Batch settings
    const TOTAL = 100
    const BATCH_SIZE = 10
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
