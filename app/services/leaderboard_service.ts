// --- Imports ---
import Redis from '@adonisjs/redis/services/main'
import leaderboardConfig from '#config/leaderboard'
import Player from '#models/player'
import Broadcast from '#services/broadcast'
import db from '@adonisjs/lucid/services/db'

// --- Key Helpers ---
function getBucketId(playerId: string | number) {
  return Number(playerId) % leaderboardConfig.bucketCount
}

// Week Bucket Key fonksiyonu
function weekBucketKey(bucketId: number, weekToDistributePrizesFor?: string, date = new Date()) {
  // Cron job'dan itibaren kaç hafta geçtiğini hesapla
  const weekNumber = getWeekSinceCronJob(
    leaderboardConfig.cronJobStartDate,
    weekToDistributePrizesFor
  )

  return `leaderboard:week:${date.getFullYear()}-W${weekNumber}:bucket:${bucketId}`
}

// Pool Key fonksiyonu
export function poolKey(date = new Date(), weekToDistributePrizesFor?: string) {
  // Cron job'dan itibaren kaç hafta geçtiğini hesapla
  const weekNumber = getWeekSinceCronJob(
    leaderboardConfig.cronJobStartDate,
    weekToDistributePrizesFor
  )

  return `prizepool:week:${date.getFullYear()}-W${weekNumber}`
}

// --- Add Earnings ---
export async function addEarnings(playerId: number, amount: number) {
  const redis = Redis.connection('cluster')

  const bucketId = getBucketId(playerId)
  const lbKey = weekBucketKey(bucketId)

  // 1) update the player's score
  await redis.zincrby(lbKey, amount, playerId.toString())

  // 2) compute integer prize-pool increment (e.g. rounded)
  const poolIncrement = Math.round(amount * 0.02)

  // 3) apply as integer
  await redis.incrby(poolKey(new Date()), poolIncrement)

  //console.log('Broadcasting update →', { playerId, money: updatedScore, pool: updatedPool })
}

export function getWeekSinceCronJob(
  cronJobStartDate: any,
  weekToDistributePrizesFor?: string,
  date?: Date
) {
  const currentDate = date ? new Date(date) : new Date()
  const startOfCronJob = new Date(cronJobStartDate) // Cron job'ın başladığı tarih
  //console.log(currentDate, startOfCronJob)

  //console.log(currentDate, startOfCronJob)
  // Farkı gün cinsinden hesaplıyoruz
  const timeDifference = currentDate.getTime() - startOfCronJob.getTime()

  // 1 hafta = 7 gün, 1 gün = 24 saat * 60 dakika * 60 saniye * 1000 milisaniye
  const intervalPeriodInmillisecs = leaderboardConfig.intervalPeriod * 60 * 1000

  let intervalsPassed = 0
  // Kaç hafta geçtiğini hesaplıyoruz
  if (weekToDistributePrizesFor) {
    intervalsPassed = weekToDistributePrizesFor as any
  } else {
    intervalsPassed = Math.floor(timeDifference / intervalPeriodInmillisecs) + 1
  }

  //console.log(intervalsPassed)

  //console.log(intervalsPassed, lastProcessedWeek)

  return intervalsPassed // G
}

export async function getPlayerScore(
  redis: ReturnType<typeof Redis.connection>,
  playerId: number
): Promise<number> {
  // 1) figure out which bucket this player lives in
  const bucketId = getBucketId(playerId)

  // 2) build the exact key for that bucket
  const key = weekBucketKey(bucketId)

  // 3) pull their score (zscore returns string or null)
  const raw = await redis.zscore(key, playerId.toString())
  return raw !== null ? Number.parseFloat(raw) : 0
}

export interface Neighbor {
  playerId: number
  score: number
}

/**
 * Across all buckets, find the 3 players whose scores are
 * just above targetScore, and the 2 players just below it.
 */
export async function getScoreNeighbors(
  redis: ReturnType<typeof Redis.connection>,
  targetScore: number,
  numAbove = 3,
  numBelow = 2
): Promise<{ above: Neighbor[]; below: Neighbor[] }> {
  const higherCandidates: Neighbor[] = []
  const lowerCandidates: Neighbor[] = []

  // 1) scan each bucket
  for (let i = 0; i < leaderboardConfig.bucketCount; i++) {
    const key = weekBucketKey(i, '')

    // a) all scores > targetScore
    const aboveRaw = await redis.zrangebyscore(
      key,
      `(${targetScore}`, // exclusive min
      '+inf',
      'WITHSCORES'
    )
    for (let j = 0; j < aboveRaw.length; j += 2) {
      higherCandidates.push({
        playerId: Number(aboveRaw[j]),
        score: Number.parseFloat(aboveRaw[j + 1]),
      })
    }

    // b) all scores < targetScore
    const belowRaw = await redis.zrevrangebyscore(
      key,
      `(${targetScore}`, // exclusive max
      '-inf',
      'WITHSCORES'
    )
    for (let j = 0; j < belowRaw.length; j += 2) {
      lowerCandidates.push({
        playerId: Number(belowRaw[j]),
        score: Number.parseFloat(belowRaw[j + 1]),
      })
    }
  }

  // 2) sort and slice
  higherCandidates.sort((a, b) => a.score - b.score) // smallest above first
  lowerCandidates.sort((a, b) => b.score - a.score) // largest below first

  return {
    above: higherCandidates.slice(0, numAbove),
    below: lowerCandidates.slice(0, numBelow),
  }
}

// --- Leaderboard Fetch ---
export async function getLeaderboard(searchTerm: string): Promise<LeaderboardEntry[]> {
  const redis = Redis.connection('cluster')

  // 1) Always load the top 100
  const top100 = await getTop100(redis)

  // 2) If no search, just return top100 (merging name/country as you already do)
  if (!searchTerm) {
    return enrichWithPlayerData(top100)
  }

  // 3) Find the searched player in your DB, ıt is faster this way
  console.log('searched term', searchTerm)
  const result = await db.rawQuery(
    `
      SELECT
        id,
        name,
        country
      FROM players
      WHERE LOWER(name) = LOWER(?)
        LIMIT 1
    `,
    [searchTerm]
  )
  // rawQuery returns an object with .rows on it
  const searched = result.rows[0] as {
    id: number
    name: string
    country: string
  }

  if (!searched) {
    return enrichWithPlayerData(top100)
  }

  // 4) Get their score from Redis

  const targetScore = await getPlayerScore(redis, searched.id)
  console.log(targetScore)

  // 5) Fetch the 3 above / 2 below
  const { above, below } = await getScoreNeighbors(redis, targetScore)
  console.log(above, below)

  // 6) Merge all IDs we care about
  const allIds = new Set<number>(top100.map((p) => p.playerId))
  above.forEach((n) => allIds.add(n.playerId))
  below.forEach((n) => allIds.add(n.playerId))
  allIds.add(searched.id)

  // 7) Build final list: pull scores from Redis, then name/country from DB
  const playersData = await Player.query()
    .whereIn('id', [...allIds])
    .select('id', 'name', 'country')

  const final: LeaderboardEntry[] = []

  for (const id of allIds) {
    const money = await getPlayerScore(redis, id)
    const pd = playersData.find((p) => p.id === id)
    final.push({
      playerId: id,
      money,
      name: pd?.name || null,
      country: pd?.country || null,
    })
  }

  // 8) Sort however you like: highest money first
  final.sort((a, b) => b.money - a.money)

  return final
}

// helper to merge name/country into top100 entries
async function enrichWithPlayerData(entries: any[]) {
  if (entries.length === 0) {
    return []
  }
  const ids = entries.map((e) => e.playerId)
  const placeholders = ids.map(() => '?').join(', ')
  const result = await db.rawQuery(
    `
      SELECT
        id,
        name,
        country
      FROM players
      WHERE id IN (${placeholders})
    `,
    ids
  )
  // Depending on your setup, rawQuery results live in .rows or .[0]
  const playersData: Array<{ id: number; name: string; country: string }> =
    'rows' in result ? result.rows : (result as any)[0]
  return entries.map((e) => {
    const pd = playersData.find((p) => p.id === e.playerId)
    return {
      playerId: e.playerId,
      money: e.score,
      name: pd?.name || null,
      country: pd?.country || null,
    }
  })
}

// --- Prize Distribution ---
export async function distributePrizesAndReset() {
  // Diğer işlemler uzun sürebilir o yüzden işlemler başlamadan önce pool key'i alıyorum

  const redis = Redis.connection('cluster')
  const weekToDistributePrizesFor = await redis.get('weekToDistributePrizesFor')
  console.log('DISTRUBUTE INSIDE', weekToDistributePrizesFor)
  const poolKeyName = poolKey(new Date(), weekToDistributePrizesFor!)
  const poolAmount = await getPrizePool(redis, weekToDistributePrizesFor!)
  console.log('POOL AMOUNT', poolAmount)
  if (poolAmount <= 0) {
    console.info('No prize pool to distribute.')
    return
  }

  const top100 = await getTop100(redis, weekToDistributePrizesFor!)
  const prizes = calculatePrizes(poolAmount, top100.length)
  let sum = 0
  prizes.forEach((p) => (sum += p))
  console.log(prizes, prizes.length, sum)

  await applyPrizesToPlayers(top100, prizes, poolAmount)
  await clearRedisState(redis, poolKeyName)

  console.info(`Distributed ${poolAmount} among top 100 and reset leaderboard.`)
}

async function getPrizePool(
  redis: ReturnType<typeof Redis.connection>,
  weekToDistributePrizesFor: string
) {
  const poolKeyName = poolKey(new Date(), weekToDistributePrizesFor)
  const poolRaw = await redis.get(poolKeyName)
  const amount = Number.parseFloat(poolRaw || '0')
  return amount
}

async function getTop100(
  redis: ReturnType<typeof Redis.connection>,
  weekToDistributePrizesFor?: string
) {
  const rawMap: Record<string, number> = {}

  for (let i = 0; i < leaderboardConfig.bucketCount; i++) {
    const slice = await redis.zrevrange(
      weekBucketKey(i, weekToDistributePrizesFor ? weekToDistributePrizesFor : ''),
      0,
      -1,
      'WITHSCORES'
    )
    for (let j = 0; j < slice.length; j += 2) {
      const id = slice[j]
      rawMap[id] = (rawMap[id] || 0) + Number.parseFloat(slice[j + 1])
    }
  }

  return Object.entries(rawMap)
    .map(([id, score]) => ({ playerId: Number(id), score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100)
}

function calculatePrizes(poolAmount: number, count: number) {
  const first = poolAmount * 0.2
  const second = poolAmount * 0.15
  const third = poolAmount * 0.1
  const remaining = poolAmount - (first + second + third)
  const weightsSum = (97 * 98) / 2

  return Array.from({ length: count }, (_, i) => {
    const rank = i + 1
    if (rank === 1) return first
    if (rank === 2) return second
    if (rank === 3) return third
    return (remaining * (101 - rank)) / weightsSum
  })
}

// services/leaderboard_service.ts

export async function applyPrizesToPlayers(
  topPlayers: { playerId: number }[],
  prizes: number[],
  pool: number
) {
  console.log('Starting pool:', pool)

  for (const [i, { playerId }] of topPlayers.entries()) {
    const awardAmount = prizes[i]
    const awardInt = Math.round(awardAmount)
    const isLast = i === topPlayers.length - 1
    const isFirst = i === 0

    // 1) Increment DB balance
    await Player.query().where('id', playerId).increment('money', awardInt)

    // 2) Subtract from your local tracker, unless it's the last one
    if (!isLast) {
      pool = Math.max(0, pool - awardInt)
    }

    // 3) Decide what pool value to broadcast
    const poolToReport = isLast ? 0 : pool
    console.log(`After awarding ${awardInt} to ${playerId}, pool is now ${poolToReport}`)

    // 4) Broadcast
    await Broadcast.channel('private-leaderboard', 'prize', {
      playerId,
      award: awardInt,
      pool: poolToReport,
      isLast,
      isFirst,
    })

    if (!isLast) {
      await sleep(100)
    }
  }
}

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms))
}

async function clearRedisState(redis: ReturnType<typeof Redis.connection>, poolKeyName: string) {
  await redis.del(poolKeyName)

  const weekToDistributePrizesFor = await redis.get('weekToDistributePrizesFor')
  console.log('DELETING', weekBucketKey(0, weekToDistributePrizesFor!))
  for (let i = 0; i < leaderboardConfig.bucketCount; i++) {
    await redis.del(weekBucketKey(i, weekToDistributePrizesFor!))
  }
}

// --- Types ---
export interface LeaderboardEntry {
  playerId: number
  money: number
  name: string | null
  country: string | null
}
