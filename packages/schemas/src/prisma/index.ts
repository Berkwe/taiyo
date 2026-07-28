/**
 * Prisma Zod Generator - Single File (inlined)
 * Auto-generated. Do not edit.
 */

import * as z from 'zod';
// File: TransactionIsolationLevel.schema.ts

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted', 'ReadCommitted', 'RepeatableRead', 'Serializable'])

export type TransactionIsolationLevel = z.infer<typeof TransactionIsolationLevelSchema>;

// File: GroupScalarFieldEnum.schema.ts

export const GroupScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'deletedAt', 'name', 'description', 'logo', 'banner', 'website', 'discord', 'x', 'facebook', 'instagram', 'telegram', 'youtube', 'email', 'creatorId', 'deleterId'])

export type GroupScalarFieldEnum = z.infer<typeof GroupScalarFieldEnumSchema>;

// File: RelationLoadStrategy.schema.ts

export const RelationLoadStrategySchema = z.enum(['query', 'join'])

export type RelationLoadStrategy = z.infer<typeof RelationLoadStrategySchema>;

// File: MediaScalarFieldEnum.schema.ts

export const MediaScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'deletedAt', 'startDate', 'endDate', 'synopsis', 'contentRating', 'oneShot', 'trailer', 'type', 'status', 'source', 'demography', 'countryOfOrigin', 'genres', 'tags', 'flag', 'creatorId', 'deleterId'])

export type MediaScalarFieldEnum = z.infer<typeof MediaScalarFieldEnumSchema>;

// File: CoverScalarFieldEnum.schema.ts

export const CoverScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'deletedAt', 'volume', 'contentRating', 'isMainCover', 'language', 'mediaId', 'uploaderId', 'deleterId'])

export type CoverScalarFieldEnum = z.infer<typeof CoverScalarFieldEnumSchema>;

// File: BannerScalarFieldEnum.schema.ts

export const BannerScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'deletedAt', 'contentRating', 'mediaId', 'uploaderId', 'deleterId'])

export type BannerScalarFieldEnum = z.infer<typeof BannerScalarFieldEnumSchema>;

// File: TitleScalarFieldEnum.schema.ts

export const TitleScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'deletedAt', 'title', 'language', 'priority', 'isAcronym', 'isMainTitle', 'mediaId', 'creatorId', 'deleterId'])

export type TitleScalarFieldEnum = z.infer<typeof TitleScalarFieldEnumSchema>;

// File: TrackerScalarFieldEnum.schema.ts

export const TrackerScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'deletedAt', 'tracker', 'externalId', 'mediaId', 'creatorId', 'deleterId'])

export type TrackerScalarFieldEnum = z.infer<typeof TrackerScalarFieldEnumSchema>;

// File: ChapterScalarFieldEnum.schema.ts

export const ChapterScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'deletedAt', 'title', 'number', 'volume', 'language', 'pages', 'contentRating', 'flag', 'mediaId', 'uploaderId', 'deleterId'])

export type ChapterScalarFieldEnum = z.infer<typeof ChapterScalarFieldEnumSchema>;

// File: SeriesScalarFieldEnum.schema.ts

export const SeriesScalarFieldEnumSchema = z.enum(['id', 'slug', 'originalLanguage', 'type', 'status', 'contentRating', 'publicationYear', 'coverStorageKey', 'bannerStorageKey', 'defaultAccentColor', 'isFeatured', 'isSearchable', 'isIndexable', 'publishedAt', 'deletedAt', 'createdAt', 'updatedAt'])

export type SeriesScalarFieldEnum = z.infer<typeof SeriesScalarFieldEnumSchema>;

// File: SeriesLocalizationScalarFieldEnum.schema.ts

export const SeriesLocalizationScalarFieldEnumSchema = z.enum(['id', 'locale', 'title', 'shortTitle', 'description', 'seoTitleOverride', 'seoDescriptionOverride', 'createdAt', 'updatedAt', 'seriesId'])

export type SeriesLocalizationScalarFieldEnum = z.infer<typeof SeriesLocalizationScalarFieldEnumSchema>;

// File: SeriesAliasScalarFieldEnum.schema.ts

export const SeriesAliasScalarFieldEnumSchema = z.enum(['id', 'locale', 'alias', 'normalizedAlias', 'type', 'createdAt', 'seriesId'])

export type SeriesAliasScalarFieldEnum = z.infer<typeof SeriesAliasScalarFieldEnumSchema>;

// File: PlatformCreatorScalarFieldEnum.schema.ts

export const PlatformCreatorScalarFieldEnumSchema = z.enum(['id', 'slug', 'name', 'createdAt', 'updatedAt'])

export type PlatformCreatorScalarFieldEnum = z.infer<typeof PlatformCreatorScalarFieldEnumSchema>;

// File: SeriesCreatorScalarFieldEnum.schema.ts

export const SeriesCreatorScalarFieldEnumSchema = z.enum(['role', 'sortOrder', 'seriesId', 'creatorId'])

export type SeriesCreatorScalarFieldEnum = z.infer<typeof SeriesCreatorScalarFieldEnumSchema>;

// File: GenreScalarFieldEnum.schema.ts

export const GenreScalarFieldEnumSchema = z.enum(['id', 'slug', 'createdAt', 'updatedAt'])

export type GenreScalarFieldEnum = z.infer<typeof GenreScalarFieldEnumSchema>;

// File: GenreLocalizationScalarFieldEnum.schema.ts

export const GenreLocalizationScalarFieldEnumSchema = z.enum(['locale', 'name', 'genreId'])

export type GenreLocalizationScalarFieldEnum = z.infer<typeof GenreLocalizationScalarFieldEnumSchema>;

// File: SeriesGenreScalarFieldEnum.schema.ts

export const SeriesGenreScalarFieldEnumSchema = z.enum(['sortOrder', 'seriesId', 'genreId'])

export type SeriesGenreScalarFieldEnum = z.infer<typeof SeriesGenreScalarFieldEnumSchema>;

// File: PlatformTagScalarFieldEnum.schema.ts

export const PlatformTagScalarFieldEnumSchema = z.enum(['id', 'slug', 'createdAt', 'updatedAt'])

export type PlatformTagScalarFieldEnum = z.infer<typeof PlatformTagScalarFieldEnumSchema>;

// File: TagLocalizationScalarFieldEnum.schema.ts

export const TagLocalizationScalarFieldEnumSchema = z.enum(['locale', 'name', 'tagId'])

export type TagLocalizationScalarFieldEnum = z.infer<typeof TagLocalizationScalarFieldEnumSchema>;

// File: SeriesTagScalarFieldEnum.schema.ts

export const SeriesTagScalarFieldEnumSchema = z.enum(['seriesId', 'tagId'])

export type SeriesTagScalarFieldEnum = z.infer<typeof SeriesTagScalarFieldEnumSchema>;

// File: PlatformChapterScalarFieldEnum.schema.ts

export const PlatformChapterScalarFieldEnumSchema = z.enum(['id', 'chapterNumber', 'volumeNumber', 'sortKey', 'canonicalSlug', 'thumbnailStorageKey', 'originalPublishedAt', 'createdAt', 'updatedAt', 'deletedAt', 'seriesId'])

export type PlatformChapterScalarFieldEnum = z.infer<typeof PlatformChapterScalarFieldEnumSchema>;

// File: ChapterSourceScalarFieldEnum.schema.ts

export const ChapterSourceScalarFieldEnumSchema = z.enum(['id', 'platform', 'language', 'displayLabel', 'description', 'priority', 'isDefault', 'sourceUrl', 'externalId', 'isActive', 'createdAt', 'updatedAt', 'chapterId'])

export type ChapterSourceScalarFieldEnum = z.infer<typeof ChapterSourceScalarFieldEnumSchema>;

// File: ChapterLocalizationScalarFieldEnum.schema.ts

export const ChapterLocalizationScalarFieldEnumSchema = z.enum(['locale', 'title', 'description', 'chapterId'])

export type ChapterLocalizationScalarFieldEnum = z.infer<typeof ChapterLocalizationScalarFieldEnumSchema>;

// File: TranslationProfileScalarFieldEnum.schema.ts

export const TranslationProfileScalarFieldEnumSchema = z.enum(['id', 'slug', 'labelKey', 'descriptionKey', 'sortOrder', 'badgeStyle', 'isAiGenerated', 'isHumanReviewed', 'glossaryEnabled', 'characterMemoryEnabled', 'isPublic', 'isIndexable', 'createdAt', 'updatedAt'])

export type TranslationProfileScalarFieldEnum = z.infer<typeof TranslationProfileScalarFieldEnumSchema>;

// File: ReleaseGroupScalarFieldEnum.schema.ts

export const ReleaseGroupScalarFieldEnumSchema = z.enum(['id', 'slug', 'name', 'description', 'website', 'verified', 'type', 'createdAt', 'updatedAt'])

export type ReleaseGroupScalarFieldEnum = z.infer<typeof ReleaseGroupScalarFieldEnumSchema>;

// File: ChapterReleaseScalarFieldEnum.schema.ts

export const ChapterReleaseScalarFieldEnumSchema = z.enum(['id', 'targetLanguage', 'sourceLanguage', 'revision', 'status', 'publishedAt', 'humanReviewed', 'glossaryUsed', 'characterMemoryUsed', 'translationQualityScore', 'ocrQualityScore', 'cleanupQualityScore', 'overallQualityScore', 'internalEngineName', 'internalEngineVersion', 'pageCount', 'storagePrefix', 'qualityTier', 'isActive', 'pipelineVersion', 'isCanonicalForLanguage', 'isPublic', 'isIndexable', 'deletedAt', 'createdAt', 'updatedAt', 'chapterId', 'sourceId', 'translationProfileId', 'releaseGroupId'])

export type ChapterReleaseScalarFieldEnum = z.infer<typeof ChapterReleaseScalarFieldEnumSchema>;

// File: ReleasePageScalarFieldEnum.schema.ts

export const ReleasePageScalarFieldEnumSchema = z.enum(['id', 'pageNumber', 'storageKey', 'width', 'height', 'blurData', 'mimeType', 'fileSize', 'checksum', 'createdAt', 'releaseId'])

export type ReleasePageScalarFieldEnum = z.infer<typeof ReleasePageScalarFieldEnumSchema>;

// File: ReadingProgressRecordScalarFieldEnum.schema.ts

export const ReadingProgressRecordScalarFieldEnumSchema = z.enum(['id', 'userId', 'chapterId', 'pageNumber', 'scrollRatio', 'updatedAt', 'completedAt', 'releaseId'])

export type ReadingProgressRecordScalarFieldEnum = z.infer<typeof ReadingProgressRecordScalarFieldEnumSchema>;

// File: ContentReportScalarFieldEnum.schema.ts

export const ContentReportScalarFieldEnumSchema = z.enum(['id', 'type', 'status', 'reasons', 'description', 'attachmentStorageKey', 'metadata', 'createdAt', 'updatedAt', 'adminNote', 'resolvedAt', 'userId', 'releaseId', 'assignedToId'])

export type ContentReportScalarFieldEnum = z.infer<typeof ContentReportScalarFieldEnumSchema>;

// File: SeriesFollowScalarFieldEnum.schema.ts

export const SeriesFollowScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'lastSeenReleaseAt', 'userId', 'seriesId'])

export type SeriesFollowScalarFieldEnum = z.infer<typeof SeriesFollowScalarFieldEnumSchema>;

// File: NotificationPreferenceScalarFieldEnum.schema.ts

export const NotificationPreferenceScalarFieldEnumSchema = z.enum(['followedSeriesUpdates', 'reportStatusUpdates', 'accountUpdates', 'translationUpdates', 'updatedAt', 'userId'])

export type NotificationPreferenceScalarFieldEnum = z.infer<typeof NotificationPreferenceScalarFieldEnumSchema>;

// File: SiteNotificationScalarFieldEnum.schema.ts

export const SiteNotificationScalarFieldEnumSchema = z.enum(['id', 'type', 'title', 'message', 'href', 'dedupeKey', 'readAt', 'createdAt', 'userId', 'seriesId', 'releaseId', 'reportId'])

export type SiteNotificationScalarFieldEnum = z.infer<typeof SiteNotificationScalarFieldEnumSchema>;

// File: ContentRevisionScalarFieldEnum.schema.ts

export const ContentRevisionScalarFieldEnumSchema = z.enum(['id', 'entityType', 'entityId', 'action', 'before', 'after', 'createdAt', 'actorId'])

export type ContentRevisionScalarFieldEnum = z.infer<typeof ContentRevisionScalarFieldEnumSchema>;

// File: SlugRedirectScalarFieldEnum.schema.ts

export const SlugRedirectScalarFieldEnumSchema = z.enum(['id', 'entityType', 'entityId', 'oldSlug', 'locale', 'createdAt'])

export type SlugRedirectScalarFieldEnum = z.infer<typeof SlugRedirectScalarFieldEnumSchema>;

// File: TaskScalarFieldEnum.schema.ts

export const TaskScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'type', 'status', 'payload', 'sessionId'])

export type TaskScalarFieldEnum = z.infer<typeof TaskScalarFieldEnumSchema>;

// File: CatalogSeriesScalarFieldEnum.schema.ts

export const CatalogSeriesScalarFieldEnumSchema = z.enum(['id', 'providerKey', 'externalSeriesId', 'canonicalKey', 'canonicalSeriesId', 'title', 'originalTitle', 'alternativeTitles', 'description', 'coverPath', 'publicationStatus', 'isActive', 'createdAt', 'updatedAt'])

export type CatalogSeriesScalarFieldEnum = z.infer<typeof CatalogSeriesScalarFieldEnumSchema>;

// File: CatalogSourceEditionScalarFieldEnum.schema.ts

export const CatalogSourceEditionScalarFieldEnumSchema = z.enum(['id', 'catalogSeriesId', 'externalEditionId', 'sourceUrl', 'backendPlatform', 'sourceLanguage', 'publicSourceLabel', 'publicDescription', 'priority', 'lastUpdatedAt', 'isActive', 'createdAt', 'updatedAt'])

export type CatalogSourceEditionScalarFieldEnum = z.infer<typeof CatalogSourceEditionScalarFieldEnumSchema>;

// File: CatalogSourceChapterScalarFieldEnum.schema.ts

export const CatalogSourceChapterScalarFieldEnumSchema = z.enum(['id', 'sourceEditionId', 'externalChapterId', 'chapterNumber', 'sortKey', 'title', 'publishedAt', 'isAvailable', 'createdAt', 'updatedAt'])

export type CatalogSourceChapterScalarFieldEnum = z.infer<typeof CatalogSourceChapterScalarFieldEnumSchema>;

// File: TranslationSourcePreferenceScalarFieldEnum.schema.ts

export const TranslationSourcePreferenceScalarFieldEnumSchema = z.enum(['userId', 'canonicalKey', 'sourceEditionId', 'createdAt', 'updatedAt'])

export type TranslationSourcePreferenceScalarFieldEnum = z.infer<typeof TranslationSourcePreferenceScalarFieldEnumSchema>;

// File: TranslationCampaignScalarFieldEnum.schema.ts

export const TranslationCampaignScalarFieldEnumSchema = z.enum(['id', 'catalogSeriesId', 'sourceEditionId', 'sourceLanguage', 'outputLanguage', 'qualityTier', 'kind', 'targetCredits', 'fundedCredits', 'status', 'expiresAt', 'createdById', 'createdAt', 'updatedAt', 'fundedAt', 'completedAt', 'publicAt', 'translationJobId', 'idempotencyKey'])

export type TranslationCampaignScalarFieldEnum = z.infer<typeof TranslationCampaignScalarFieldEnumSchema>;

// File: TranslationCampaignChapterScalarFieldEnum.schema.ts

export const TranslationCampaignChapterScalarFieldEnumSchema = z.enum(['campaignId', 'sourceChapterId', 'activeKey', 'allocatedCredits', 'status', 'externalTranslationJobId', 'externalPreviousActiveKey', 'externalPreviousCampaignStatus', 'completedAt'])

export type TranslationCampaignChapterScalarFieldEnum = z.infer<typeof TranslationCampaignChapterScalarFieldEnumSchema>;

// File: TranslationContributionScalarFieldEnum.schema.ts

export const TranslationContributionScalarFieldEnumSchema = z.enum(['id', 'campaignId', 'userId', 'credits', 'refundedCredits', 'status', 'createdAt', 'refundedAt', 'idempotencyKey'])

export type TranslationContributionScalarFieldEnum = z.infer<typeof TranslationContributionScalarFieldEnumSchema>;

// File: CreditAccountScalarFieldEnum.schema.ts

export const CreditAccountScalarFieldEnumSchema = z.enum(['userId', 'cachedBalance', 'createdAt', 'updatedAt'])

export type CreditAccountScalarFieldEnum = z.infer<typeof CreditAccountScalarFieldEnumSchema>;

// File: CreditTransactionScalarFieldEnum.schema.ts

export const CreditTransactionScalarFieldEnumSchema = z.enum(['id', 'userId', 'amount', 'type', 'status', 'referenceType', 'referenceId', 'idempotencyKey', 'metadata', 'createdAt'])

export type CreditTransactionScalarFieldEnum = z.infer<typeof CreditTransactionScalarFieldEnumSchema>;

// File: TranslationJobScalarFieldEnum.schema.ts

export const TranslationJobScalarFieldEnumSchema = z.enum(['id', 'campaignId', 'status', 'provider', 'payload', 'failureReason', 'idempotencyKey', 'createdAt', 'updatedAt', 'completedAt'])

export type TranslationJobScalarFieldEnum = z.infer<typeof TranslationJobScalarFieldEnumSchema>;

// File: BatchTranslationRequestScalarFieldEnum.schema.ts

export const BatchTranslationRequestScalarFieldEnumSchema = z.enum(['id', 'userId', 'catalogSeriesId', 'sourceEditionId', 'outputLanguage', 'qualityTier', 'status', 'requestedCount', 'eligibleCount', 'excludedCount', 'totalCredits', 'idempotencyKey', 'createdAt', 'updatedAt', 'completedAt'])

export type BatchTranslationRequestScalarFieldEnum = z.infer<typeof BatchTranslationRequestScalarFieldEnumSchema>;

// File: BatchTranslationRequestItemScalarFieldEnum.schema.ts

export const BatchTranslationRequestItemScalarFieldEnumSchema = z.enum(['id', 'batchRequestId', 'sourceChapterId', 'chapterNumber', 'status', 'credits', 'exclusionReason', 'campaignId', 'translationJobId', 'createdAt', 'updatedAt', 'completedAt'])

export type BatchTranslationRequestItemScalarFieldEnum = z.infer<typeof BatchTranslationRequestItemScalarFieldEnumSchema>;

// File: TranslationEarlyAccessGrantScalarFieldEnum.schema.ts

export const TranslationEarlyAccessGrantScalarFieldEnumSchema = z.enum(['id', 'userId', 'sourceChapterId', 'translationJobId', 'expiresAt', 'createdAt'])

export type TranslationEarlyAccessGrantScalarFieldEnum = z.infer<typeof TranslationEarlyAccessGrantScalarFieldEnumSchema>;

// File: UserScalarFieldEnum.schema.ts

export const UserScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'name', 'username', 'displayUsername', 'email', 'emailVerified', 'normalizedEmail', 'image', 'banned', 'banReason', 'banExpires', 'deletedAt', 'role', 'settings'])

export type UserScalarFieldEnum = z.infer<typeof UserScalarFieldEnumSchema>;

// File: UserProfileScalarFieldEnum.schema.ts

export const UserProfileScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'banner', 'birthDate', 'gender', 'city', 'country', 'about', 'points', 'userId'])

export type UserProfileScalarFieldEnum = z.infer<typeof UserProfileScalarFieldEnumSchema>;

// File: UserLibraryScalarFieldEnum.schema.ts

export const UserLibraryScalarFieldEnumSchema = z.enum(['reading', 'rereading', 'planToRead', 'completed', 'onHold', 'dropped', 'userId'])

export type UserLibraryScalarFieldEnum = z.infer<typeof UserLibraryScalarFieldEnumSchema>;

// File: UserHistoryScalarFieldEnum.schema.ts

export const UserHistoryScalarFieldEnumSchema = z.enum(['progression', 'mediaId', 'userId'])

export type UserHistoryScalarFieldEnum = z.infer<typeof UserHistoryScalarFieldEnumSchema>;

// File: AccountScalarFieldEnum.schema.ts

export const AccountScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'accessToken', 'refreshToken', 'accessTokenExpiresAt', 'refreshTokenExpiresAt', 'scope', 'password', 'idToken', 'accountId', 'providerId', 'userId'])

export type AccountScalarFieldEnum = z.infer<typeof AccountScalarFieldEnumSchema>;

// File: SessionScalarFieldEnum.schema.ts

export const SessionScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'expiresAt', 'token', 'ipAddress', 'userAgent', 'impersonatedBy', 'userId'])

export type SessionScalarFieldEnum = z.infer<typeof SessionScalarFieldEnumSchema>;

// File: VerificationScalarFieldEnum.schema.ts

export const VerificationScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'expiresAt', 'identifier', 'value'])

export type VerificationScalarFieldEnum = z.infer<typeof VerificationScalarFieldEnumSchema>;

// File: SortOrder.schema.ts

export const SortOrderSchema = z.enum(['asc', 'desc'])

export type SortOrder = z.infer<typeof SortOrderSchema>;

// File: NullableJsonNullValueInput.schema.ts

export const NullableJsonNullValueInputSchema = z.enum(['DbNull', 'JsonNull'])

export type NullableJsonNullValueInput = z.infer<typeof NullableJsonNullValueInputSchema>;

// File: JsonNullValueInput.schema.ts

export const JsonNullValueInputSchema = z.enum(['JsonNull'])

export type JsonNullValueInput = z.infer<typeof JsonNullValueInputSchema>;

// File: QueryMode.schema.ts

export const QueryModeSchema = z.enum(['default', 'insensitive'])

export type QueryMode = z.infer<typeof QueryModeSchema>;

// File: NullsOrder.schema.ts

export const NullsOrderSchema = z.enum(['first', 'last'])

export type NullsOrder = z.infer<typeof NullsOrderSchema>;

// File: JsonNullValueFilter.schema.ts

export const JsonNullValueFilterSchema = z.enum(['DbNull', 'JsonNull', 'AnyNull'])

export type JsonNullValueFilter = z.infer<typeof JsonNullValueFilterSchema>;

// File: ContentRating.schema.ts

export const ContentRatingSchema = z.enum(['NORMAL', 'SUGGESTIVE', 'NSFW', 'NSFL'])

export type ContentRating = z.infer<typeof ContentRatingSchema>;

// File: MediaType.schema.ts

export const MediaTypeSchema = z.enum(['MANGA', 'MANHWA', 'MANHUA', 'LIGHT_NOVEL', 'OTHER'])

export type MediaType = z.infer<typeof MediaTypeSchema>;

// File: MediaStatus.schema.ts

export const MediaStatusSchema = z.enum(['RELEASING', 'FINISHED', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'])

export type MediaStatus = z.infer<typeof MediaStatusSchema>;

// File: MediaSource.schema.ts

export const MediaSourceSchema = z.enum(['ORIGINAL', 'LIGHT_NOVEL', 'VISUAL_NOVEL', 'WEB_NOVEL', 'VIDEO_GAME'])

export type MediaSource = z.infer<typeof MediaSourceSchema>;

// File: MediaDemography.schema.ts

export const MediaDemographySchema = z.enum(['SHOUNEN', 'SHOUJO', 'SEINEN', 'JOSEI'])

export type MediaDemography = z.infer<typeof MediaDemographySchema>;

// File: MediaCountryOfOrigin.schema.ts

export const MediaCountryOfOriginSchema = z.enum(['JAPAN', 'KOREA', 'CHINA', 'USA', 'FRANCE', 'BRAZIL'])

export type MediaCountryOfOrigin = z.infer<typeof MediaCountryOfOriginSchema>;

// File: Flag.schema.ts

export const FlagSchema = z.enum(['OK', 'STAFF_ONLY', 'VIP_ONLY', 'LOCKED'])

export type Flag = z.infer<typeof FlagSchema>;

// File: MediaGenres.schema.ts

export const MediaGenresSchema = z.enum(['ACTION', 'ADVENTURE', 'COMEDY', 'DRAMA', 'ECCHI', 'FANTASY', 'HENTAI', 'HORROR', 'MAHOU_SHOUJO', 'MECHA', 'MUSIC', 'MYSTERY', 'PSYCHOLOGICAL', 'ROMANCE', 'SCI_FI', 'SLICE_OF_LIFE', 'SPORTS', 'SUPERNATURAL', 'THRILLER'])

export type MediaGenres = z.infer<typeof MediaGenresSchema>;

// File: Languages.schema.ts

export const LanguagesSchema = z.enum(['ab', 'aa', 'af', 'ak', 'sq', 'am', 'ar', 'an', 'hy', 'as', 'av', 'ae', 'ay', 'az', 'bm', 'ba', 'eu', 'be', 'bn', 'bi', 'bs', 'br', 'bg', 'my', 'ca', 'ch', 'ce', 'ny', 'cu', 'cv', 'kw', 'co', 'cr', 'hr', 'cs', 'da', 'dv', 'nl', 'dz', 'en', 'eo', 'et', 'ee', 'fo', 'fj', 'fi', 'fr', 'fy', 'ff', 'gd', 'gl', 'lg', 'ka', 'de', 'el', 'kl', 'gn', 'gu', 'ht', 'ha', 'he', 'hz', 'hi', 'ho', 'hu', 'is', 'io', 'ig', 'id', 'ia', 'ie', 'iu', 'ik', 'ga', 'it', 'jv', 'kn', 'kr', 'ks', 'kk', 'km', 'ki', 'rw', 'ky', 'kv', 'kg', 'kj', 'ku', 'lo', 'la', 'lv', 'li', 'ln', 'lt', 'lu', 'lb', 'mk', 'mg', 'ms', 'ml', 'mt', 'gv', 'mi', 'mr', 'mh', 'mn', 'na', 'nv', 'nd', 'nr', 'ng', 'ne', 'no', 'nb', 'nn', 'ii', 'oc', 'oj', 'or', 'om', 'os', 'pi', 'ps', 'fa', 'pl', 'pa', 'qu', 'ro', 'rm', 'rn', 'ru', 'se', 'sm', 'sg', 'sa', 'sc', 'sr', 'sn', 'sd', 'si', 'sk', 'sl', 'so', 'st', 'su', 'sw', 'ss', 'sv', 'tl', 'ty', 'tg', 'ta', 'tt', 'te', 'th', 'bo', 'ti', 'to', 'ts', 'tn', 'tr', 'tk', 'tw', 'ug', 'uk', 'ur', 'uz', 've', 'vi', 'vo', 'wa', 'cy', 'wo', 'xh', 'yi', 'yo', 'za', 'zu', 'es', 'es_la', 'pt_br', 'pt_pt', 'ja', 'ja_ro', 'ko', 'ko_ro', 'zh', 'zh_hk', 'zh_ro'])

export type Languages = z.infer<typeof LanguagesSchema>;

// File: Trackers.schema.ts

export const TrackersSchema = z.enum(['MANGADEX', 'MYANIMELIST', 'ANILIST'])

export type Trackers = z.infer<typeof TrackersSchema>;

// File: SeriesType.schema.ts

export const SeriesTypeSchema = z.enum(['WEBTOON', 'MANGA', 'MANHWA', 'MANHUA', 'COMIC', 'LIGHT_NOVEL'])

export type SeriesType = z.infer<typeof SeriesTypeSchema>;

// File: SeriesStatus.schema.ts

export const SeriesStatusSchema = z.enum(['ONGOING', 'COMPLETED', 'HIATUS', 'ANNOUNCED', 'CANCELLED'])

export type SeriesStatus = z.infer<typeof SeriesStatusSchema>;

// File: PlatformContentRating.schema.ts

export const PlatformContentRatingSchema = z.enum(['EVERYONE', 'TEEN', 'MATURE'])

export type PlatformContentRating = z.infer<typeof PlatformContentRatingSchema>;

// File: SeriesAliasType.schema.ts

export const SeriesAliasTypeSchema = z.enum(['ORIGINAL', 'ROMANIZED', 'ENGLISH', 'TURKISH', 'ALTERNATIVE', 'FORMER_TITLE'])

export type SeriesAliasType = z.infer<typeof SeriesAliasTypeSchema>;

// File: CreatorRole.schema.ts

export const CreatorRoleSchema = z.enum(['AUTHOR', 'ARTIST', 'WRITER', 'COLORIST', 'STUDIO'])

export type CreatorRole = z.infer<typeof CreatorRoleSchema>;

// File: SourcePlatform.schema.ts

export const SourcePlatformSchema = z.enum(['NAVER', 'WEBTOONS', 'KAKAO', 'OTHER'])

export type SourcePlatform = z.infer<typeof SourcePlatformSchema>;

// File: ReleaseGroupType.schema.ts

export const ReleaseGroupTypeSchema = z.enum(['OFFICIAL', 'INTERNAL', 'COMMUNITY', 'PARTNER'])

export type ReleaseGroupType = z.infer<typeof ReleaseGroupTypeSchema>;

// File: ReleaseStatus.schema.ts

export const ReleaseStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'])

export type ReleaseStatus = z.infer<typeof ReleaseStatusSchema>;

// File: TranslationQualityTier.schema.ts

export const TranslationQualityTierSchema = z.enum(['BALANCED', 'PREMIUM'])

export type TranslationQualityTier = z.infer<typeof TranslationQualityTierSchema>;

// File: ReportType.schema.ts

export const ReportTypeSchema = z.enum(['CHAPTER', 'PANEL'])

export type ReportType = z.infer<typeof ReportTypeSchema>;

// File: ReportStatus.schema.ts

export const ReportStatusSchema = z.enum(['OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED'])

export type ReportStatus = z.infer<typeof ReportStatusSchema>;

// File: SiteNotificationType.schema.ts

export const SiteNotificationTypeSchema = z.enum(['FOLLOWED_SERIES_RELEASE', 'REPORT_STATUS', 'ACCOUNT_UPDATE', 'TRANSLATION_CAMPAIGN'])

export type SiteNotificationType = z.infer<typeof SiteNotificationTypeSchema>;

// File: RevisionEntityType.schema.ts

export const RevisionEntityTypeSchema = z.enum(['SERIES', 'CHAPTER', 'RELEASE', 'REPORT', 'USER', 'TRANSLATION_CAMPAIGN', 'CATALOG_SOURCE'])

export type RevisionEntityType = z.infer<typeof RevisionEntityTypeSchema>;

// File: RevisionAction.schema.ts

export const RevisionActionSchema = z.enum(['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'BULK_UPDATE'])

export type RevisionAction = z.infer<typeof RevisionActionSchema>;

// File: SlugEntityType.schema.ts

export const SlugEntityTypeSchema = z.enum(['SERIES', 'CHAPTER', 'GENRE', 'CREATOR'])

export type SlugEntityType = z.infer<typeof SlugEntityTypeSchema>;

// File: TaskType.schema.ts

export const TaskTypeSchema = z.enum(['CREATE_MEDIA', 'IMPORT_MEDIA', 'IMPORT_COVER', 'IMPORT_CHAPTER', 'UPLOAD_CHAPTER', 'UPLOAD_COVER', 'UPLOAD_BANNER'])

export type TaskType = z.infer<typeof TaskTypeSchema>;

// File: TaskStatus.schema.ts

export const TaskStatusSchema = z.enum(['PENDING', 'DOWNLOADING', 'UPLOADING', 'FINISHED', 'FAILED'])

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// File: CatalogPublicationStatus.schema.ts

export const CatalogPublicationStatusSchema = z.enum(['ONGOING', 'COMPLETED', 'HIATUS'])

export type CatalogPublicationStatus = z.infer<typeof CatalogPublicationStatusSchema>;

// File: TranslationCampaignKind.schema.ts

export const TranslationCampaignKindSchema = z.enum(['COMMUNITY_PACKAGE', 'INSTANT', 'BATCH_INSTANT'])

export type TranslationCampaignKind = z.infer<typeof TranslationCampaignKindSchema>;

// File: TranslationCampaignStatus.schema.ts

export const TranslationCampaignStatusSchema = z.enum(['FUNDING', 'FUNDED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'])

export type TranslationCampaignStatus = z.infer<typeof TranslationCampaignStatusSchema>;

// File: TranslationCampaignChapterStatus.schema.ts

export const TranslationCampaignChapterStatusSchema = z.enum(['PENDING', 'COMPLETED', 'COMPLETED_EXTERNALLY'])

export type TranslationCampaignChapterStatus = z.infer<typeof TranslationCampaignChapterStatusSchema>;

// File: TranslationContributionStatus.schema.ts

export const TranslationContributionStatusSchema = z.enum(['COMMITTED', 'REFUNDED'])

export type TranslationContributionStatus = z.infer<typeof TranslationContributionStatusSchema>;

// File: CreditTransactionType.schema.ts

export const CreditTransactionTypeSchema = z.enum(['PURCHASE', 'CAMPAIGN_CONTRIBUTION', 'CONTRIBUTION_REFUND', 'READING_REWARD', 'AD_REWARD', 'ADMIN_ADJUSTMENT'])

export type CreditTransactionType = z.infer<typeof CreditTransactionTypeSchema>;

// File: CreditTransactionStatus.schema.ts

export const CreditTransactionStatusSchema = z.enum(['COMMITTED', 'REVERSED'])

export type CreditTransactionStatus = z.infer<typeof CreditTransactionStatusSchema>;

// File: TranslationJobStatus.schema.ts

export const TranslationJobStatusSchema = z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'])

export type TranslationJobStatus = z.infer<typeof TranslationJobStatusSchema>;

// File: BatchTranslationStatus.schema.ts

export const BatchTranslationStatusSchema = z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED'])

export type BatchTranslationStatus = z.infer<typeof BatchTranslationStatusSchema>;

// File: BatchTranslationItemStatus.schema.ts

export const BatchTranslationItemStatusSchema = z.enum(['EXCLUDED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'])

export type BatchTranslationItemStatus = z.infer<typeof BatchTranslationItemStatusSchema>;

// File: Roles.schema.ts

export const RolesSchema = z.enum(['USER', 'UPLOADER', 'EDITOR', 'ADMIN'])

export type Roles = z.infer<typeof RolesSchema>;

// File: Genders.schema.ts

export const GendersSchema = z.enum(['MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED'])

export type Genders = z.infer<typeof GendersSchema>;

// File: Countries.schema.ts

export const CountriesSchema = z.enum(['ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bl', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'eh', 'er', 'es', 'et', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mf', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'um', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'xk', 'ye', 'yt', 'za', 'zm', 'zw'])

export type Countries = z.infer<typeof CountriesSchema>;

// File: GroupMemberRoles.schema.ts

export const GroupMemberRolesSchema = z.enum(['OWNER', 'ADMIN', 'TRANSLATOR', 'PROOFREADER', 'CLEANER', 'REDRAWER', 'TYPESETTER', 'QUALITY_CHECKER', 'RAW_PROVIDER', 'OTHER'])

export type GroupMemberRoles = z.infer<typeof GroupMemberRolesSchema>;

// File: GroupMemberPermissions.schema.ts

export const GroupMemberPermissionsSchema = z.enum(['UPLOAD', 'EDIT', 'DELETE'])

export type GroupMemberPermissions = z.infer<typeof GroupMemberPermissionsSchema>;

// File: Group.schema.ts

export const GroupSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  logo: z.string().nullish(),
  banner: z.string().nullish(),
  website: z.string().nullish(),
  discord: z.string().nullish(),
  x: z.string().nullish(),
  facebook: z.string().nullish(),
  instagram: z.string().nullish(),
  telegram: z.string().nullish(),
  youtube: z.string().nullish(),
  email: z.string().nullish(),
  creatorId: z.string(),
  deleterId: z.string().nullish(),
});

export type GroupType = z.infer<typeof GroupSchema>;


// File: Media.schema.ts

export const MediaSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullish(),
  startDate: z.date().nullish(),
  endDate: z.date().nullish(),
  synopsis: z.string().nullish(),
  contentRating: ContentRatingSchema.default("NORMAL"),
  oneShot: z.boolean(),
  trailer: z.string().nullish(),
  type: MediaTypeSchema,
  status: MediaStatusSchema,
  source: MediaSourceSchema,
  demography: MediaDemographySchema,
  countryOfOrigin: MediaCountryOfOriginSchema,
  genres: z.array(MediaGenresSchema),
  tags: z.array(z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10")),
  flag: FlagSchema.default("OK"),
  creatorId: z.string(),
  deleterId: z.string().nullish(),
});

export type MediaModel = z.infer<typeof MediaSchema>;

// File: Cover.schema.ts

export const CoverSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullish(),
  volume: z.number().int().nullish(),
  contentRating: ContentRatingSchema.default("NORMAL"),
  isMainCover: z.boolean(),
  language: LanguagesSchema,
  mediaId: z.string(),
  uploaderId: z.string(),
  deleterId: z.string().nullish(),
});

export type CoverType = z.infer<typeof CoverSchema>;


// File: Banner.schema.ts

export const BannerSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullish(),
  contentRating: ContentRatingSchema.default("NORMAL"),
  mediaId: z.string(),
  uploaderId: z.string(),
  deleterId: z.string().nullish(),
});

export type BannerType = z.infer<typeof BannerSchema>;


// File: Title.schema.ts

export const TitleSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullish(),
  title: z.string(),
  language: LanguagesSchema,
  priority: z.number().int(),
  isAcronym: z.boolean(),
  isMainTitle: z.boolean(),
  mediaId: z.string(),
  creatorId: z.string(),
  deleterId: z.string().nullish(),
});

export type TitleType = z.infer<typeof TitleSchema>;


// File: Tracker.schema.ts

export const TrackerSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullish(),
  tracker: TrackersSchema,
  externalId: z.string(),
  mediaId: z.string(),
  creatorId: z.string(),
  deleterId: z.string().nullish(),
});

export type TrackerType = z.infer<typeof TrackerSchema>;


// File: Chapter.schema.ts

export const ChapterSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullish(),
  title: z.string().nullish(),
  number: z.number(),
  volume: z.number().nullish(),
  language: LanguagesSchema,
  pages: z.array(z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10")),
  contentRating: ContentRatingSchema.default("NORMAL"),
  flag: FlagSchema.default("OK"),
  mediaId: z.string(),
  uploaderId: z.string(),
  deleterId: z.string().nullish(),
});

export type ChapterType = z.infer<typeof ChapterSchema>;


// File: Series.schema.ts

export const SeriesSchema = z.object({
  id: z.string(),
  slug: z.string(),
  originalLanguage: LanguagesSchema,
  type: SeriesTypeSchema,
  status: SeriesStatusSchema,
  contentRating: PlatformContentRatingSchema.default("TEEN"),
  publicationYear: z.number().int().nullish(),
  coverStorageKey: z.string().nullish(),
  bannerStorageKey: z.string().nullish(),
  defaultAccentColor: z.string().nullish(),
  isFeatured: z.boolean(),
  isSearchable: z.boolean().default(true),
  isIndexable: z.boolean().default(true),
  publishedAt: z.date().nullish(),
  deletedAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SeriesModel = z.infer<typeof SeriesSchema>;

// File: SeriesLocalization.schema.ts

export const SeriesLocalizationSchema = z.object({
  id: z.string(),
  locale: LanguagesSchema,
  title: z.string(),
  shortTitle: z.string().nullish(),
  description: z.string(),
  seoTitleOverride: z.string().nullish(),
  seoDescriptionOverride: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  seriesId: z.string(),
});

export type SeriesLocalizationType = z.infer<typeof SeriesLocalizationSchema>;


// File: SeriesAlias.schema.ts

export const SeriesAliasSchema = z.object({
  id: z.string(),
  locale: LanguagesSchema.nullish(),
  alias: z.string(),
  normalizedAlias: z.string(),
  type: SeriesAliasTypeSchema.default("ALTERNATIVE"),
  createdAt: z.date(),
  seriesId: z.string(),
});

export type SeriesAliasModel = z.infer<typeof SeriesAliasSchema>;

// File: PlatformCreator.schema.ts

export const PlatformCreatorSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PlatformCreatorType = z.infer<typeof PlatformCreatorSchema>;


// File: SeriesCreator.schema.ts

export const SeriesCreatorSchema = z.object({
  role: CreatorRoleSchema,
  sortOrder: z.number().int(),
  seriesId: z.string(),
  creatorId: z.string(),
});

export type SeriesCreatorType = z.infer<typeof SeriesCreatorSchema>;


// File: Genre.schema.ts

export const GenreSchema = z.object({
  id: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type GenreType = z.infer<typeof GenreSchema>;


// File: GenreLocalization.schema.ts

export const GenreLocalizationSchema = z.object({
  locale: LanguagesSchema,
  name: z.string(),
  genreId: z.string(),
});

export type GenreLocalizationType = z.infer<typeof GenreLocalizationSchema>;


// File: SeriesGenre.schema.ts

export const SeriesGenreSchema = z.object({
  sortOrder: z.number().int(),
  seriesId: z.string(),
  genreId: z.string(),
});

export type SeriesGenreType = z.infer<typeof SeriesGenreSchema>;


// File: PlatformTag.schema.ts

export const PlatformTagSchema = z.object({
  id: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PlatformTagType = z.infer<typeof PlatformTagSchema>;


// File: TagLocalization.schema.ts

export const TagLocalizationSchema = z.object({
  locale: LanguagesSchema,
  name: z.string(),
  tagId: z.string(),
});

export type TagLocalizationType = z.infer<typeof TagLocalizationSchema>;


// File: SeriesTag.schema.ts

export const SeriesTagSchema = z.object({
  seriesId: z.string(),
  tagId: z.string(),
});

export type SeriesTagType = z.infer<typeof SeriesTagSchema>;


// File: PlatformChapter.schema.ts

export const PlatformChapterSchema = z.object({
  id: z.string(),
  chapterNumber: z.string(),
  volumeNumber: z.string().nullish(),
  sortKey: z.number().int(),
  canonicalSlug: z.string(),
  thumbnailStorageKey: z.string().nullish(),
  originalPublishedAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullish(),
  seriesId: z.string(),
});

export type PlatformChapterType = z.infer<typeof PlatformChapterSchema>;


// File: ChapterSource.schema.ts

export const ChapterSourceSchema = z.object({
  id: z.string(),
  platform: SourcePlatformSchema,
  language: LanguagesSchema,
  displayLabel: z.string().nullish(),
  description: z.string(),
  priority: z.number().int(),
  isDefault: z.boolean(),
  sourceUrl: z.string().nullish(),
  externalId: z.string().nullish(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  chapterId: z.string(),
});

export type ChapterSourceType = z.infer<typeof ChapterSourceSchema>;


// File: ChapterLocalization.schema.ts

export const ChapterLocalizationSchema = z.object({
  locale: LanguagesSchema,
  title: z.string().nullish(),
  description: z.string().nullish(),
  chapterId: z.string(),
});

export type ChapterLocalizationType = z.infer<typeof ChapterLocalizationSchema>;


// File: TranslationProfile.schema.ts

export const TranslationProfileSchema = z.object({
  id: z.string(),
  slug: z.string(),
  labelKey: z.string(),
  descriptionKey: z.string(),
  sortOrder: z.number().int(),
  badgeStyle: z.string().nullish(),
  isAiGenerated: z.boolean(),
  isHumanReviewed: z.boolean(),
  glossaryEnabled: z.boolean(),
  characterMemoryEnabled: z.boolean(),
  isPublic: z.boolean().default(true),
  isIndexable: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TranslationProfileType = z.infer<typeof TranslationProfileSchema>;


// File: ReleaseGroup.schema.ts

export const ReleaseGroupSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  website: z.string().nullish(),
  verified: z.boolean(),
  type: ReleaseGroupTypeSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ReleaseGroupModel = z.infer<typeof ReleaseGroupSchema>;

// File: ChapterRelease.schema.ts

export const ChapterReleaseSchema = z.object({
  id: z.string(),
  targetLanguage: LanguagesSchema,
  sourceLanguage: LanguagesSchema,
  revision: z.number().int().default(1),
  status: ReleaseStatusSchema.default("DRAFT"),
  publishedAt: z.date().nullish(),
  humanReviewed: z.boolean(),
  glossaryUsed: z.boolean(),
  characterMemoryUsed: z.boolean(),
  translationQualityScore: z.number().int().nullish(),
  ocrQualityScore: z.number().int().nullish(),
  cleanupQualityScore: z.number().int().nullish(),
  overallQualityScore: z.number().int().nullish(),
  internalEngineName: z.string().nullish(),
  internalEngineVersion: z.string().nullish(),
  pageCount: z.number().int(),
  storagePrefix: z.string().nullish(),
  qualityTier: TranslationQualityTierSchema.default("BALANCED"),
  isActive: z.boolean().default(true),
  pipelineVersion: z.string().nullish(),
  isCanonicalForLanguage: z.boolean(),
  isPublic: z.boolean(),
  isIndexable: z.boolean(),
  deletedAt: z.date().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  chapterId: z.string(),
  sourceId: z.string().nullish(),
  translationProfileId: z.string(),
  releaseGroupId: z.string().nullish(),
});

export type ChapterReleaseType = z.infer<typeof ChapterReleaseSchema>;


// File: ReleasePage.schema.ts

export const ReleasePageSchema = z.object({
  id: z.string(),
  pageNumber: z.number().int(),
  storageKey: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  blurData: z.string().nullish(),
  mimeType: z.string(),
  fileSize: z.bigint().nullish(),
  checksum: z.string().nullish(),
  createdAt: z.date(),
  releaseId: z.string(),
});

export type ReleasePageType = z.infer<typeof ReleasePageSchema>;


// File: ReadingProgressRecord.schema.ts

export const ReadingProgressRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  chapterId: z.string(),
  pageNumber: z.number().int(),
  scrollRatio: z.number(),
  updatedAt: z.date(),
  completedAt: z.date().nullish(),
  releaseId: z.string(),
});

export type ReadingProgressRecordType = z.infer<typeof ReadingProgressRecordSchema>;


// File: ContentReport.schema.ts

export const ContentReportSchema = z.object({
  id: z.string(),
  type: ReportTypeSchema,
  status: ReportStatusSchema.default("OPEN"),
  reasons: z.array(z.string()),
  description: z.string().nullish(),
  attachmentStorageKey: z.string().nullish(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  adminNote: z.string().nullish(),
  resolvedAt: z.date().nullish(),
  userId: z.string(),
  releaseId: z.string(),
  assignedToId: z.string().nullish(),
});

export type ContentReportType = z.infer<typeof ContentReportSchema>;


// File: SeriesFollow.schema.ts

export const SeriesFollowSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastSeenReleaseAt: z.date().nullish(),
  userId: z.string(),
  seriesId: z.string(),
});

export type SeriesFollowType = z.infer<typeof SeriesFollowSchema>;


// File: NotificationPreference.schema.ts

export const NotificationPreferenceSchema = z.object({
  followedSeriesUpdates: z.boolean().default(true),
  reportStatusUpdates: z.boolean().default(true),
  accountUpdates: z.boolean().default(true),
  translationUpdates: z.boolean().default(true),
  updatedAt: z.date(),
  userId: z.string(),
});

export type NotificationPreferenceType = z.infer<typeof NotificationPreferenceSchema>;


// File: SiteNotification.schema.ts

export const SiteNotificationSchema = z.object({
  id: z.string(),
  type: SiteNotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  href: z.string().nullish(),
  dedupeKey: z.string(),
  readAt: z.date().nullish(),
  createdAt: z.date(),
  userId: z.string(),
  seriesId: z.string().nullish(),
  releaseId: z.string().nullish(),
  reportId: z.string().nullish(),
});

export type SiteNotificationModel = z.infer<typeof SiteNotificationSchema>;

// File: ContentRevision.schema.ts

export const ContentRevisionSchema = z.object({
  id: z.string(),
  entityType: RevisionEntityTypeSchema,
  entityId: z.string(),
  action: RevisionActionSchema,
  before: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  after: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  createdAt: z.date(),
  actorId: z.string(),
});

export type ContentRevisionType = z.infer<typeof ContentRevisionSchema>;


// File: SlugRedirect.schema.ts

export const SlugRedirectSchema = z.object({
  id: z.string(),
  entityType: SlugEntityTypeSchema,
  entityId: z.string(),
  oldSlug: z.string(),
  locale: LanguagesSchema.nullish(),
  createdAt: z.date(),
});

export type SlugRedirectType = z.infer<typeof SlugRedirectSchema>;


// File: Task.schema.ts

export const TaskSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  type: TaskTypeSchema,
  status: TaskStatusSchema,
  payload: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10"),
  sessionId: z.string(),
});

export type TaskModel = z.infer<typeof TaskSchema>;

// File: CatalogSeries.schema.ts

export const CatalogSeriesSchema = z.object({
  id: z.string(),
  providerKey: z.string(),
  externalSeriesId: z.string(),
  canonicalKey: z.string(),
  canonicalSeriesId: z.string().nullish(),
  title: z.string(),
  originalTitle: z.string(),
  alternativeTitles: z.array(z.string()),
  description: z.string(),
  coverPath: z.string(),
  publicationStatus: CatalogPublicationStatusSchema,
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CatalogSeriesType = z.infer<typeof CatalogSeriesSchema>;


// File: CatalogSourceEdition.schema.ts

export const CatalogSourceEditionSchema = z.object({
  id: z.string(),
  catalogSeriesId: z.string(),
  externalEditionId: z.string(),
  sourceUrl: z.string().nullish(),
  backendPlatform: SourcePlatformSchema,
  sourceLanguage: LanguagesSchema,
  publicSourceLabel: z.string(),
  publicDescription: z.string(),
  priority: z.number().int(),
  lastUpdatedAt: z.date().nullish(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CatalogSourceEditionType = z.infer<typeof CatalogSourceEditionSchema>;


// File: CatalogSourceChapter.schema.ts

export const CatalogSourceChapterSchema = z.object({
  id: z.string(),
  sourceEditionId: z.string(),
  externalChapterId: z.string(),
  chapterNumber: z.string(),
  sortKey: z.number().int(),
  title: z.string().nullish(),
  publishedAt: z.date().nullish(),
  isAvailable: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CatalogSourceChapterType = z.infer<typeof CatalogSourceChapterSchema>;


// File: TranslationSourcePreference.schema.ts

export const TranslationSourcePreferenceSchema = z.object({
  userId: z.string(),
  canonicalKey: z.string(),
  sourceEditionId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TranslationSourcePreferenceType = z.infer<typeof TranslationSourcePreferenceSchema>;


// File: TranslationCampaign.schema.ts

export const TranslationCampaignSchema = z.object({
  id: z.string(),
  catalogSeriesId: z.string(),
  sourceEditionId: z.string(),
  sourceLanguage: LanguagesSchema,
  outputLanguage: LanguagesSchema,
  qualityTier: TranslationQualityTierSchema,
  kind: TranslationCampaignKindSchema.default("COMMUNITY_PACKAGE"),
  targetCredits: z.number().int(),
  fundedCredits: z.number().int(),
  status: TranslationCampaignStatusSchema.default("FUNDING"),
  expiresAt: z.date().nullish(),
  createdById: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  fundedAt: z.date().nullish(),
  completedAt: z.date().nullish(),
  publicAt: z.date().nullish(),
  translationJobId: z.string().nullish(),
  idempotencyKey: z.string(),
});

export type TranslationCampaignType = z.infer<typeof TranslationCampaignSchema>;


// File: TranslationCampaignChapter.schema.ts

export const TranslationCampaignChapterSchema = z.object({
  campaignId: z.string(),
  sourceChapterId: z.string(),
  activeKey: z.string().nullish(),
  allocatedCredits: z.number().int(),
  status: TranslationCampaignChapterStatusSchema.default("PENDING"),
  externalTranslationJobId: z.string().nullish(),
  externalPreviousActiveKey: z.string().nullish(),
  externalPreviousCampaignStatus: TranslationCampaignStatusSchema.nullish(),
  completedAt: z.date().nullish(),
});

export type TranslationCampaignChapterType = z.infer<typeof TranslationCampaignChapterSchema>;


// File: TranslationContribution.schema.ts

export const TranslationContributionSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  userId: z.string(),
  credits: z.number().int(),
  refundedCredits: z.number().int(),
  status: TranslationContributionStatusSchema.default("COMMITTED"),
  createdAt: z.date(),
  refundedAt: z.date().nullish(),
  idempotencyKey: z.string(),
});

export type TranslationContributionType = z.infer<typeof TranslationContributionSchema>;


// File: CreditAccount.schema.ts

export const CreditAccountSchema = z.object({
  userId: z.string(),
  cachedBalance: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreditAccountType = z.infer<typeof CreditAccountSchema>;


// File: CreditTransaction.schema.ts

export const CreditTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amount: z.number().int(),
  type: CreditTransactionTypeSchema,
  status: CreditTransactionStatusSchema.default("COMMITTED"),
  referenceType: z.string().nullish(),
  referenceId: z.string().nullish(),
  idempotencyKey: z.string(),
  metadata: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  createdAt: z.date(),
});

export type CreditTransactionModel = z.infer<typeof CreditTransactionSchema>;

// File: TranslationJob.schema.ts

export const TranslationJobSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  status: TranslationJobStatusSchema.default("QUEUED"),
  provider: z.string().default("mandown"),
  payload: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10"),
  failureReason: z.string().nullish(),
  idempotencyKey: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullish(),
});

export type TranslationJobType = z.infer<typeof TranslationJobSchema>;


// File: BatchTranslationRequest.schema.ts

export const BatchTranslationRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  catalogSeriesId: z.string(),
  sourceEditionId: z.string(),
  outputLanguage: LanguagesSchema,
  qualityTier: TranslationQualityTierSchema,
  status: BatchTranslationStatusSchema.default("QUEUED"),
  requestedCount: z.number().int(),
  eligibleCount: z.number().int(),
  excludedCount: z.number().int(),
  totalCredits: z.number().int(),
  idempotencyKey: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullish(),
});

export type BatchTranslationRequestType = z.infer<typeof BatchTranslationRequestSchema>;


// File: BatchTranslationRequestItem.schema.ts

export const BatchTranslationRequestItemSchema = z.object({
  id: z.string(),
  batchRequestId: z.string(),
  sourceChapterId: z.string(),
  chapterNumber: z.string(),
  status: BatchTranslationItemStatusSchema,
  credits: z.number().int(),
  exclusionReason: z.string().nullish(),
  campaignId: z.string().nullish(),
  translationJobId: z.string().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullish(),
});

export type BatchTranslationRequestItemType = z.infer<typeof BatchTranslationRequestItemSchema>;


// File: TranslationEarlyAccessGrant.schema.ts

export const TranslationEarlyAccessGrantSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sourceChapterId: z.string(),
  translationJobId: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

export type TranslationEarlyAccessGrantType = z.infer<typeof TranslationEarlyAccessGrantSchema>;


// File: User.schema.ts

export const UserSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string(),
  username: z.string(),
  displayUsername: z.string(),
  email: z.string().nullish(),
  emailVerified: z.boolean(),
  normalizedEmail: z.string().nullish(),
  image: z.string().nullish(),
  banned: z.boolean().nullish(),
  banReason: z.string().nullish(),
  banExpires: z.date().nullish(),
  deletedAt: z.date().nullish(),
  role: RolesSchema.default("USER"),
  settings: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").default({}),
});

export type UserType = z.infer<typeof UserSchema>;


// File: UserProfile.schema.ts

export const UserProfileSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  banner: z.string().nullish(),
  birthDate: z.date().nullish(),
  gender: GendersSchema.default("NOT_SPECIFIED"),
  city: z.string().nullish(),
  country: CountriesSchema.nullish(),
  about: z.string().nullish(),
  points: z.number().int(),
  userId: z.string(),
});

export type UserProfileType = z.infer<typeof UserProfileSchema>;


// File: UserLibrary.schema.ts

export const UserLibrarySchema = z.object({
  reading: z.array(z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10")),
  rereading: z.array(z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10")),
  planToRead: z.array(z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10")),
  completed: z.array(z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10")),
  onHold: z.array(z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10")),
  dropped: z.array(z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10")),
  userId: z.string(),
});

export type UserLibraryType = z.infer<typeof UserLibrarySchema>;


// File: UserHistory.schema.ts

export const UserHistorySchema = z.object({
  progression: z.array(z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10")),
  mediaId: z.string(),
  userId: z.string(),
});

export type UserHistoryType = z.infer<typeof UserHistorySchema>;


// File: Account.schema.ts

export const AccountSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  accessToken: z.string().nullish(),
  refreshToken: z.string().nullish(),
  accessTokenExpiresAt: z.date().nullish(),
  refreshTokenExpiresAt: z.date().nullish(),
  scope: z.string().nullish(),
  password: z.string().nullish(),
  idToken: z.string().nullish(),
  accountId: z.string(),
  providerId: z.string(),
  userId: z.string(),
});

export type AccountType = z.infer<typeof AccountSchema>;


// File: Session.schema.ts

export const SessionSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),
  token: z.string(),
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  impersonatedBy: z.string().nullish(),
  userId: z.string(),
});

export type SessionType = z.infer<typeof SessionSchema>;


// File: Verification.schema.ts

export const VerificationSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),
  identifier: z.string(),
  value: z.string(),
});

export type VerificationType = z.infer<typeof VerificationSchema>;

