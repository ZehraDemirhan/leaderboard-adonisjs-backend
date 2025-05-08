import Redis from '@adonisjs/redis/services/main'
import leaderboardConfig from '#config/leaderboard'
import Player from '#models/player'
import Broadcast from '#services/broadcast'
import db from '@adonisjs/lucid/services/db'

function getBucketId(playerId: string | number) {
  return Number(playerId) % leaderboardConfig.bucketCount
}

async function weekBucketKey(
  bucketId: number,
  weekToDistributePrizesFor?: string,
  date = new Date()
) {
  const redis = Redis.connection('cluster')
  const cronJobStartDate = await redis.get('cron:first')
  const weekNumber = getWeekSinceCronJob(cronJobStartDate, weekToDistributePrizesFor)

  return `leaderboard:week:${date.getFullYear()}-W${weekNumber}:bucket:${bucketId}`
}

export async function poolKey(date = new Date(), weekToDistributePrizesFor?: string) {
  const redis = Redis.connection('cluster')
  const cronJobStartDate = await redis.get('cron:first')
  const weekNumber = getWeekSinceCronJob(cronJobStartDate, weekToDistributePrizesFor)

  return `prizepool:week:${date.getFullYear()}-W${weekNumber}`
}

export async function addEarnings(playerId: number, amount: number) {
  const redis = Redis.connection('cluster')

  const bucketId = getBucketId(playerId)
  const lbKey = await weekBucketKey(bucketId)

  await redis.zincrby(lbKey, amount, playerId.toString())

  const poolIncrement = Math.round(amount * 0.02)

  await redis.incrby(await poolKey(new Date()), poolIncrement)
}

export function getWeekSinceCronJob(
  cronJobStartDate: any,
  weekToDistributePrizesFor?: string,
  date?: Date
) {
  const currentDate = date ? new Date(date) : new Date()
  const startOfCronJob = new Date(cronJobStartDate) // Cron job'ın başladığı tarih
  const timeDifference = currentDate.getTime() - startOfCronJob.getTime()

  const intervalPeriodInmillisecs = leaderboardConfig.intervalPeriod * 60 * 1000

  let intervalsPassed = 0
  // Kaç interval geçtiğini hesaplıyoruz
  if (weekToDistributePrizesFor) {
    intervalsPassed = weekToDistributePrizesFor as any
  } else {
    intervalsPassed = Math.floor(timeDifference / intervalPeriodInmillisecs) + 1
  }

  return intervalsPassed
}

export async function getPlayerScore(
  redis: ReturnType<typeof Redis.connection>,
  playerId: number
): Promise<number> {
  const bucketId = getBucketId(playerId)

  const key = await weekBucketKey(bucketId)
  const raw = await redis.zscore(key, playerId.toString())
  return raw !== null ? Number.parseFloat(raw) : 0
}

export interface Neighbor {
  playerId: number
  score: number
  rank?: number
}

async function getPlayerRank(
  redis: ReturnType<typeof Redis.connection>,
  targetScore: number
): Promise<number> {
  let higherCount = 0

  // Sum, in each bucket, how many have score > targetScore
  for (let i = 0; i < leaderboardConfig.bucketCount; i++) {
    const key = await weekBucketKey(i, '')
    const cnt = await redis.zcount(key, `(${targetScore}`, '+inf')
    higherCount += cnt
  }

  return higherCount + 1
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

  // scan each bucket
  for (let i = 0; i < leaderboardConfig.bucketCount; i++) {
    const key = await weekBucketKey(i, '')

    // all scores > targetScore
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

    // all scores < targetScore
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
    above: higherCandidates.slice(0, numAbove).reverse(),
    below: lowerCandidates.slice(0, numBelow),
  }
}

// --- Leaderboard Fetch ---
export async function getLeaderboard(searchTerm: string): Promise<LeaderboardEntry[]> {
  const redis = Redis.connection('cluster')

  // Always load the top 100
  const top100 = await getTop100(redis)

  // If no search, just return top100 (merging name/country as you already do)
  if (!searchTerm) {
    return enrichWithPlayerData(top100)
  }

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
  const playerRank = await getPlayerRank(redis, targetScore)

  const { above: rawAbove, below: rawBelow } = await getScoreNeighbors(redis, targetScore)

  const above: Neighbor[] = rawAbove.map((n, idx) => ({
    ...n,
    rank: playerRank - (rawAbove.length - idx),
  }))
  const below: Neighbor[] = rawBelow.map((n, idx) => ({
    ...n,
    rank: playerRank + idx + 1,
  }))

  // Merge all IDs we care about
  const allIds = new Set<number>(top100.map((p) => p.playerId))
  above.forEach((n) => allIds.add(n.playerId))
  below.forEach((n) => allIds.add(n.playerId))
  allIds.add(searched.id)

  // Build final list: pull scores from Redis, then name/country from DB
  const playersData = await Player.query()
    .whereIn('id', [...allIds])
    .select('id', 'name', 'country')

  const final: LeaderboardEntry[] = []

  for (const id of allIds) {
    const money = await getPlayerScore(redis, id)
    const pd = playersData.find((p) => p.id === id)

    let rank: number | undefined
    if (id === searched.id) {
      rank = playerRank
    } else {
      const neighbor = above.find((n) => n.playerId === id) ?? below.find((n) => n.playerId === id)
      if (neighbor) {
        rank = neighbor.rank
      }
    }

    final.push({
      playerId: id,
      money,
      name: pd?.name || null,
      country: pd?.country || null,
      rank,
    })
  }

  final.sort((a, b) => b.money - a.money)

  return final
}

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
  const redis = Redis.connection('cluster')
  const weekToDistributePrizesFor = await redis.get('weekToDistributePrizesFor')

  const poolKeyName = await poolKey(new Date(), weekToDistributePrizesFor!)
  const poolAmount = await getPrizePool(redis, weekToDistributePrizesFor!)
  if (poolAmount <= 0) {
    console.info('No prize pool to distribute.')
    return
  }

  const top100 = await getTop100(redis, weekToDistributePrizesFor!)
  const prizes = calculatePrizes(poolAmount, top100.length)
  let sum = 0
  prizes.forEach((p) => (sum += p))

  await applyPrizesToPlayers(top100, prizes, poolAmount)
  await clearRedisState(redis, poolKeyName)

  console.info(`Distributed ${poolAmount} among top 100 and reset leaderboard.`)
}

async function getPrizePool(
  redis: ReturnType<typeof Redis.connection>,
  weekToDistributePrizesFor: string
) {
  const poolKeyName = await poolKey(new Date(), weekToDistributePrizesFor)
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
      await weekBucketKey(i, weekToDistributePrizesFor ? weekToDistributePrizesFor : ''),
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

export async function applyPrizesToPlayers(
  topPlayers: { playerId: number }[],
  prizes: number[],
  pool: number
) {

  for (const [i, { playerId }] of topPlayers.entries()) {
    const awardAmount = prizes[i]
    const awardInt = Math.round(awardAmount)
    const isLast = i === topPlayers.length - 1
    const isFirst = i === 0

    await Player.query().where('id', playerId).increment('money', awardInt)

    if (!isLast) {
      pool = Math.max(0, pool - awardInt)
    }

    const poolToReport = isLast ? 0 : pool
    console.log(`After awarding ${awardInt} to ${playerId}, pool is now ${poolToReport}`)

    await Broadcast.channel('leaderboard', 'prize', {
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
  for (let i = 0; i < leaderboardConfig.bucketCount; i++) {
    await redis.del(await weekBucketKey(i, weekToDistributePrizesFor!))
  }
}

export interface LeaderboardEntry {
  playerId: number
  money: number
  name: string | null
  country: string | null
  rank?: number
}
