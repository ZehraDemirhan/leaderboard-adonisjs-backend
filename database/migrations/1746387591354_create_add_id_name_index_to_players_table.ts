import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddSeparateIndexesToPlayers extends BaseSchema {
  protected tableName = 'players'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Add an index on the `id` column (note: `id` is already primary key, so this is usually redundant)
      table.index(['id'], 'players_id_idx')

      // Add an index on the `name` column for fast lookups by exact name
      table.index(['name'], 'players_name_idx')
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Drop the indexes by name
      table.dropIndex(['id'], 'players_id_idx')
      table.dropIndex(['name'], 'players_name_idx')
    })
  }
}
