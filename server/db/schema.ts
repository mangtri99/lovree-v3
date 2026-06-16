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

export const musicTracks = pgTable('music_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  r2Key: text('r2_key').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  key: text('key').notNull().default('base'),
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
  seo: jsonb('seo').notNull().default({ title: '', description: '', ogImage: { mediaId: '', url: '' } }),
  status: text('status').notNull().default('draft'),
  musicTrackId: uuid('music_track_id').references(() => musicTracks.id),
  waTemplate: text('wa_template').notNull().default(''),
  draftDocument: jsonb('draft_document').notNull().default({ sections: [] }),
  publishedDocument: jsonb('published_document'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  targetEvent: text('target_event').notNull(),
  timeStart: text('time_start').notNull().default(''),
  timeEnd: text('time_end').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const guests = pgTable('guests', {
  id: uuid('id').primaryKey().defaultRandom(),
  invitationId: uuid('invitation_id').notNull().references(() => invitations.id),
  name: text('name').notNull(),
  code: text('code').notNull(),
  groupLabel: text('group_label'),
  sessionId: uuid('session_id').references(() => sessions.id),
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

export const invitationWords = pgTable('invitation_words', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  openingGreeting: text('opening_greeting').notNull().default(''),
  openingBody: text('opening_body').notNull().default(''),
  closingGreeting: text('closing_greeting').notNull().default(''),
  closingBody: text('closing_body').notNull().default(''),
  quote: text('quote').notNull().default(''),
  quoteSource: text('quote_source').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
