import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddLowercaseNameIndex extends BaseSchema {
  protected tableName = 'players'

  public async up() {
    // Create a case-insensitive B-tree index on LOWER(name) using the "C" collation for reliable text_pattern_ops behavior
    this.schema.raw(
      `CREATE INDEX IF NOT EXISTS players_lower_name_c_idx
          ON "${this.tableName}" (LOWER(name) COLLATE "C" text_pattern_ops)`
    )
  }

  public async down() {
    // Drop the index if it exists
    this.schema.raw(`DROP INDEX IF EXISTS players_lower_name_c_idx`)
  }
}
