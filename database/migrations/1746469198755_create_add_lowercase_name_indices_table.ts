import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddLowercaseNameIndex extends BaseSchema {
  protected tableName = 'players'

  public async up() {
    // Create a case-insensitive B-tree index on lower(name) for fast prefix searches
    this.schema.raw(
      `CREATE INDEX IF NOT EXISTS players_lower_name_idx 
       ON "${this.tableName}" (LOWER(name) text_pattern_ops)`
    )
  }

  public async down() {
    // Drop the index if it exists
    this.schema.raw(`DROP INDEX IF EXISTS players_lower_name_idx`)
  }
}
