import { pgTable, uuid, text, jsonb, timestamp, unique } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  googleId: text('google_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  tokens: jsonb('tokens').notNull(),
  previewImage: text('preview_image'),
})

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(),
  themeId: uuid('theme_id').notNull().references(() => themes.id),
  tokenOverrides: jsonb('token_overrides').notNull().default({}),
  status: text('status').notNull().default('draft'),
  musicMediaId: uuid('music_media_id'),
  draftDocument: jsonb('draft_document').notNull().default({ sections: [] }),
  publishedDocument: jsonb('published_document'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const guests = pgTable('guests', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  name: text('name').notNull(),
  code: text('code').notNull(),
  groupLabel: text('group_label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({ uniqCode: unique().on(t.invitationId, t.code) }))

export const rsvps = pgTable('rsvps', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  guestId: uuid('guest_id').references(() => guests.id),
  name: text('name').notNull(),
  attendance: text('attendance'),
  message: text('message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  type: text('type').notNull(),
  r2Key: text('r2_key').notNull(),
  url: text('url').notNull(),
  meta: jsonb('meta').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
