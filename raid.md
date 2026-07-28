Sen bu görevde kıdemli ürün mühendisi, yazılım mimarı, frontend tasarımcısı ve teknik SEO uzmanı olarak hareket edeceksin.

Görevin, sıfırdan her şeyi yeniden icat etmek yerine uygun açık kaynak temellerden yararlanarak modern, sade, hızlı, çok dilli ve uzun vadede büyüyebilecek kaliteli bir comic/webtoon okuma platformunun ilk üretim temelini oluşturmaktır.

Bu görev yalnızca bir tasarım demosu değildir. Çalışan veri modeli, çalışan sayfalar, temel okuyucu, SEO altyapısı, örnek veriler, testler ve dokümantasyon oluşturulmalıdır.

Benden sürekli onay isteme. Belirsiz küçük ayrıntılarda makul ve geri alınabilir kararlar ver. Bir engel yoksa yalnızca plan yazıp durma; planı oluşturduktan sonra uygulamaya geç.


# YENİ EKLENEN DEĞİŞKENLER
* PROJE İÇİNDE RENKLERİN DİNAMİK OLMASINI AŞŞAĞIDAKİ PROMPTA BELİRTMİŞTİM. ŞUANLIK SADECE
Mürekkep mavisi
--background: #101112;
--surface: #181A1C;
--surface-raised: #212428;
--border: #2D3136;

--text: #EFF1F2;
--text-muted: #999EA4;

--brand: #486F91;
--brand-hover: #5A83A6;
--brand-soft: #192633;


* SİTENİN İSMİ NovoraScans OLACAK ONA GÖRE GEREKLİ YERLERİ DEĞİŞTİR.

* SİTENİN LOGOSU PROJENİN KÖK DİZİNİNDE LOGO.img OLARAK KONUMLANDIRILDI


# 1. Projenin amacı

Platform aşağıdaki içerik türlerini destekleyecek:

* Webtoon
* Manga
* Manhwa
* Manhua
* Comic
* İleride gerekirse light novel

Platformun ilk hedef dili Türkçedir ancak veri modeli ve URL mimarisi ilk günden çok dilli olmalıdır.

Platformun temel farklılaştırıcısı şudur:

Bir seri yalnızca farklı dillere ayrılmayacak; aynı dil altında birden fazla çeviri sürümü bulunabilecektir.

Örnek:

Seri

* Türkçe

  * AI Ultra
  * AI Standart
  * İnsan Düzenlemeli
  * Topluluk Çevirisi
* İngilizce

  * Resmî
  * AI
* Almanca

  * AI Standart

Çeviri sürümleri ve kalite profilleri sonradan eklenen metin etiketleri olarak değil, doğrudan veri modelinin birinci sınıf bileşenleri olarak tasarlanmalıdır.

Platformun marka mesajı ileride şu yaklaşımı taşıyabilmelidir:

“Yalnızca comic okuma sitesi değil, farklı kalite seviyelerinde en iyi AI destekli çevirileri sunan okuma platformu.”

Şu anda gerçek çeviri API’sini, ödeme sistemini ve gelişmiş okuyucu seçeneklerini bağlama. Bunlara uygun genişleme noktaları oluştur fakat ilk aşamayı gereksiz yere büyütme.

# 2. Kaynak kodların hazırlanması

Ana kaynak:

`https://github.com/taiyomoe/taiyo.git`

Okuyucu davranışları için referans:

`https://github.com/Suwayomi/Suwayomi-WebUI.git`

## 2.1 Ana repo

Önce mevcut çalışma dizinini incele.

Çalışma dizini boşsa ve Git reposu değilse:

1. `gh auth status` ile GitHub CLI oturumunu kontrol et.
2. GitHub CLI kullanılabiliyorsa:

   * Kullanıcının hesabında `taiyomoe/taiyo` fork’u bulunup bulunmadığını kontrol et.
   * Yoksa fork oluştur.
   * Kullanıcının fork’unu mevcut boş dizinin içine klonla.
   * Kullanıcının fork’unu `origin`, orijinal repoyu `upstream` olarak ayarla.
3. GitHub CLI veya yetki kullanılamıyorsa:

   * Ana repoyu mevcut boş dizine klonla.
   * Orijinal repoyu `upstream` olarak ayarla.
   * Fork işleminin daha sonra yapılabileceğini dokümantasyona yaz.
   * Bu durum nedeniyle çalışmayı durdurma.

Repo zaten mevcutsa yeniden klonlama. Remote’ları ve branch yapısını incele.

Upstream varsayılan branch’ini otomatik tespit et. Branch adını tahmin etme.

Çalışmak için yeni bir branch oluştur:

`feature/platform-foundation`

Mevcut kullanıcı değişikliklerini silme, ezme veya resetleme.

## 2.2 Referans repo

Suwayomi-WebUI reposunu ana Git reposunun içine nested repository olarak koyma.

Ana projenin kardeş dizininde aşağıdaki gibi bir referans alanı oluştur:

`../comic-platform-references/Suwayomi-WebUI`

Bu repoyu yalnızca aşağıdaki konuları incelemek için kullan:

* Webtoon dikey okuyucu davranışı
* Sonsuz bölüm akışı
* Sayfa yükleme ve hata durumları
* Okuma ilerlemesinin saklanması
* Mobil dokunma davranışı
* Okuyucu toolbar düzeni
* Dinamik tema mantığı
* Seri bazlı tema yaklaşımı
* Güvenli alan ve mobil ekran boşlukları

Suwayomi kodunu doğrudan kopyalama. Kod kopyalamak gerekirse önce lisans uyumluluğunu değerlendir ve hangi kısmın neden kullanıldığını açıkça belgelemeksizin kopyalama.

Ana proje ile referans projenin commit SHA’larını şu dosyada kaydet:

`docs/UPSTREAM_SOURCES.md`

# 3. İlk aşama: mevcut projeyi denetle

Kod değiştirmeden önce şunları incele:

* Root `README`
* Varsa `AGENTS.md`, `CONTRIBUTING.md` ve proje talimatları
* Root ve workspace `package.json` dosyaları
* `pnpm-workspace.yaml`
* `turbo.json`
* `apps/web`
* Veritabanı paketi
* Prisma şeması ve migration’lar
* Mevcut route yapısı
* next-intl yapılandırması
* Tema sistemi
* Mevcut okuyucu
* Mevcut arama yapısı
* tRPC router’ları
* Auth sistemi
* Docker Compose servisleri
* Storage/S3 katmanı
* Seed sistemi
* Test altyapısı
* ESLint/Biome/TypeScript kuralları
* Mevcut SEO ve metadata uygulaması

Mevcut bağımlılıkları körlemesine güncelleme.

Önce mevcut sürümlerle çalışan bir başlangıç noktası oluştur. Yalnızca somut bir gereksinim veya güvenlik problemi varsa bağımlılık yükselt.

Başlangıç durumunda mümkün olan komutları çalıştır:

* Bağımlılık kurulumu
* Typecheck
* Lint/format kontrolü
* Build
* Mevcut testler
* Gerekli altyapı servisleri

Bulduğun sorunları şu dosyaya yaz:

`docs/FOUNDATION_AUDIT.md`

Bu dosyada şunlar bulunsun:

* Mevcut mimarinin özeti
* Korunacak parçalar
* Değiştirilecek parçalar
* Eksik parçalar
* Teknik borçlar
* Lisans değerlendirmesi
* Kurulum sorunları
* Güvenlik riskleri
* SEO eksikleri
* Tasarım sistemi eksikleri
* Bu görevde uygulanacak kapsam
* Bilerek sonraya bırakılacak kapsam

Denetimden sonra uygulamayı durdurmadan devam et.

# 4. Mimari yaklaşım

Mümkün olduğunca Taiyō’nun mevcut mimarisini ve monorepo yapısını koru.

Tercih edilen mevcut yapı:

* Next.js App Router
* React
* TypeScript strict mode
* Tailwind CSS
* Mevcut erişilebilir component primitive’leri
* next-intl
* PostgreSQL
* Prisma
* tRPC
* Zod
* Better Auth
* Meilisearch
* Redis uyumlu cache
* S3 uyumlu storage
* pnpm workspace
* Turborepo

Sırf alışkanlık nedeniyle mevcut Base UI sistemini kaldırıp shadcn/ui ekleme. Mevcut component primitive’leri yeterliyse onları kullan. Yalnızca gerçek bir eksik varsa yeni UI bağımlılığı ekle.

Server Component varsayılan yaklaşım olsun.

Client Component yalnızca şu tür ihtiyaçlarda kullanılsın:

* Kullanıcı etkileşimi
* Local state
* Okuyucu ilerlemesi
* Tema seçimi
* Client-side arama kutusu
* Gerekli tarayıcı API’leri

Tüm sayfayı gereksiz yere client component yapma.

İş mantığını React component’lerinin içine gömme.

Aşağıdaki katmanları belirgin tut:

* Domain modelleri
* Veri erişimi
* API/tRPC
* Server-side query katmanı
* UI component’leri
* Feature component’leri
* SEO yardımcıları
* Tema sistemi
* Storage adapter’ları
* Arama adapter’ları

Aynı işi yapan birden fazla API veya repository katmanı oluşturma.

# 5. İlk sürüm kapsamı

Bu görevde aşağıdaki temel akışlar çalışmalıdır:

1. Ana sayfa
2. Keşfet/katalog sayfası
3. Arama
4. Seri detay sayfası
5. Dil seçimi
6. Çeviri kalite/sürüm seçimi
7. Bölüm listesi
8. Bölüm SEO landing sayfası
9. Basit dikey webtoon okuyucu
10. Önceki/sonraki bölüm geçişi
11. Okuma ilerlemesini yerel olarak saklama
12. Açık/koyu/sistem teması
13. Dinamik vurgu rengi sistemi
14. Türkçe ve İngilizce arayüz
15. Çalışan örnek veri ve seed
16. Sitemap, robots, canonical ve metadata
17. Structured data
18. Temel hata, loading, empty ve 404 durumları
19. Mobil ve masaüstü responsive görünüm
20. Temel otomatik testler

Şunları şu aşamada tam olarak geliştirme:

* Ödeme
* VIP
* Site içi para
* Reklam
* Yorumlar
* Forum
* Sosyal takip sistemi
* Gelişmiş bildirim sistemi
* Gerçek AI çeviri pipeline’ı
* OCR
* Görsel temizleme
* Başka sitelerden indirme veya scraping
* Gelişmiş yönetim paneli
* Mobil uygulama
* Karmaşık rol yönetimi
* Gelişmiş okuyucu filtreleri
* Çevrimdışı indirme
* Tam analitik altyapısı
* Tavsiye algoritması

Bunların ileride eklenebilmesi için mimariyi kilitleme ama sahte ve kullanılmayan soyutlamalarla sistemi gereksiz yere büyütme.

# 6. Veri modelinin yeniden tasarlanması

Önce mevcut Prisma şemasını incele. Mevcut modellerle uyumlu bir migration planı oluştur.

Aşağıdaki kavramsal modeli mevcut şemaya uygun biçimde uygula. Model isimleri mevcut kod standartlarına göre değişebilir ancak ilişkiler korunmalıdır.

## 6.1 Series

Serinin dil bağımsız ana kaydı.

Alan örnekleri:

* id
* slug
* originalLanguage
* type
* status
* contentRating
* coverAssetId
* bannerAssetId
* publicationYear
* createdAt
* updatedAt
* publishedAt
* deletedAt veya yayın durumu
* defaultAccentColor veya tema bilgisi
* isFeatured
* isSearchable
* isIndexable

Türler en azından şunları desteklesin:

* WEBTOON
* MANGA
* MANHWA
* MANHUA
* COMIC
* LIGHT_NOVEL

## 6.2 SeriesLocalization

Serinin dile göre görünen bilgileri.

* seriesId
* locale
* title
* shortTitle
* description
* seoTitleOverride
* seoDescriptionOverride

`seriesId + locale` benzersiz olmalıdır.

## 6.3 SeriesAlias

Arama ve eski/yabancı isimler için:

* seriesId
* locale
* alias
* normalizedAlias
* aliasType

Örnek alias türleri:

* ORIGINAL
* ROMANIZED
* ENGLISH
* TURKISH
* ALTERNATIVE
* FORMER_TITLE

## 6.4 Creator ve SeriesCreator

* Yazar
* Çizer
* Senarist
* Renklendirme
* Stüdyo

Roller genişletilebilir olsun.

## 6.5 Genre ve Tag

Genre ve Tag ayrı tutulabiliyorsa ayrı tut.

Genre daha kalıcı ve SEO landing sayfasına uygun olmalıdır.

Tag daha ayrıntılı filtreleme için kullanılabilir.

Her ikisinin de lokalize isimleri ve slug’ları bulunabilsin.

## 6.6 Chapter

Dil bağımsız bölüm kaydı:

* id
* seriesId
* chapterNumber
* volumeNumber
* sortKey
* canonicalSlug
* originalPublishedAt
* createdAt
* updatedAt

Ondalıklı bölüm numaralarını destekle.

Bölüm numarasını yalnızca float ile temsil edip kesinlik hatası oluşturma. Decimal veya uygun string/sort alanı kullan.

## 6.7 ChapterLocalization

* chapterId
* locale
* title
* description veya kısa özet

Bu kayıt çevirinin kendisi değildir. Bölümün lokalize görünen metadata’sıdır.

## 6.8 TranslationProfile

Kullanıcıya gösterilen çeviri kalite/sürüm profilidir.

Örnekler:

* Resmî
* İnsan Düzenlemeli
* AI Ultra
* AI Standart
* Topluluk

Alan örnekleri:

* id
* slug
* labelKey
* descriptionKey
* sortOrder
* badgeStyle
* isAiGenerated
* isHumanReviewed
* glossaryEnabled
* characterMemoryEnabled
* isPublic
* isIndexable
* createdAt
* updatedAt

Kalite sıralamasını yalnızca enum sırasına bağlama. `sortOrder` veya ayrı bir kalite önceliği olsun.

## 6.9 ReleaseGroup

Çeviriyi veya yayını oluşturan grup/ekip:

* id
* slug
* name
* description
* website
* verified
* type

Örnek türler:

* OFFICIAL
* INTERNAL
* COMMUNITY
* PARTNER

## 6.10 ChapterRelease veya ChapterVariant

Aynı bölümün belirli dil ve kalite profilindeki okunabilir sürümüdür.

Alan örnekleri:

* id
* chapterId
* targetLanguage
* sourceLanguage
* translationProfileId
* releaseGroupId
* revision
* status
* publishedAt
* updatedAt
* humanReviewed
* glossaryUsed
* characterMemoryUsed
* translationQualityScore
* ocrQualityScore
* cleanupQualityScore
* overallQualityScore
* internalEngineName
* internalEngineVersion
* pageCount
* storagePrefix veya manifestAssetId
* isCanonicalForLanguage
* isPublic
* isIndexable

Model sağlayıcı adı gibi teknik detaylar saklanabilsin fakat kullanıcıya gösterilmesi zorunlu olmasın.

Aynı bölüm, hedef dil, profil ve revision kombinasyonu için uygun benzersizlik kuralları oluştur.

Bir dilde birden fazla sürüm bulunabilir.

Her hedef dil için varsayılan veya önerilen bir sürüm işaretlenebilir.

## 6.11 ChapterPage veya ReleasePage

* releaseId
* pageNumber
* assetId
* width
* height
* blurData veya placeholder
* mimeType
* fileSize
* checksum

Sayfa sırası açık ve benzersiz olmalıdır.

Görsel boyutlarını veritabanında tut. Böylece okuyucuda layout shift oluşmasın.

## 6.12 ReadingProgress

İlk aşamada giriş yapmayan kullanıcı için localStorage kullanılabilir.

Veri modeli gelecekte giriş yapan kullanıcıyı desteklemeli:

* userId
* releaseId
* chapterId
* pageNumber
* scrollRatio
* updatedAt
* completedAt

Bu görevde gerekiyorsa yalnızca adapter/interface ve local implementation oluştur. Kullanılmayan karmaşık senkronizasyon sistemi yazma.

## 6.13 Slug geçmişi

Seri slug’ı değişirse eski bağlantıların bozulmaması için basit bir alias/redirect modeli tasarla.

* entityType
* entityId
* oldSlug
* locale
* createdAt

Eski seri URL’si bulunduğunda kalıcı yönlendirme yapılabilsin.

# 7. Örnek içerik

Gerçek ve telifli comic sayfalarını seed olarak projeye koyma.

Tamamen kurgusal en az 6 seri oluştur.

Şunlar örnek veride bulunmalı:

* Türkçe ve İngilizce başlıklar
* Farklı içerik türleri
* Farklı genre’lar
* En az 3 bölüm
* Bir bölüm için birden fazla Türkçe çeviri sürümü
* AI Ultra
* AI Standart
* Topluluk
* En az bir İngilizce sürüm
* Kalite metrikleri
* Farklı yayın tarihleri
* Devam eden ve tamamlanmış seriler
* Trend ve yeni yayın örnekleri

Görseller için yerel, lisans problemi olmayan basit demo placeholder’ları kullan.

Placeholder’lar sabit boyutlu ve görsel olarak temiz olsun. Haricî sitelerden görsel hotlink etme.

Seed komutu idempotent olsun veya açık biçimde reset/seed komutları sağla.

# 8. Tasarım yönü

Arayüz modern, sade, premium ve içerik odaklı görünmelidir.

Doğrudan herhangi bir sitenin görünümünü kopyalama.

Görsel yaklaşımda şu prensiplerden yararlan:

* AniList benzeri bilgi hiyerarşisi
* Netflix benzeri rahat içerik keşfi
* Steam benzeri seri detayları ve güçlü metadata sunumu
* MangaDex benzeri dil ve yayın sürümü ayrımı
* Suwayomi benzeri işlevsel okuyucu davranışı

Ancak ortaya çıkan tasarım kendi kimliğine sahip olmalıdır.

Kaçınılması gerekenler:

* WordPress/Madara görünümü
* Çok kalabalık ana sayfa
* Her yerde kart kutuları
* Aşırı yuvarlak köşeler
* Her yerde gradient
* Sürekli glassmorphism
* Aşırı büyük hero alanı
* Gereksiz carousel
* Sürekli animasyon
* Çok küçük yazılar
* Düşük kontrast
* İçeriği saklayan hover efektleri
* Mobilde yatay taşma
* Her alanda farklı vurgu rengi
* Component içinde rastgele hardcoded renkler

Animasyonlar kısa, anlamlı ve azaltılmış hareket tercihini destekler biçimde olsun.

# 9. Dinamik renk ve tema sistemi

Renk paleti gelecekte tamamen değişebileceği için hiçbir ürün component’i ham renk paletine bağımlı olmamalıdır.

Component’lerde aşağıdaki türde kullanım yapma:

* `bg-purple-600`
* `text-zinc-200`
* `border-blue-400`
* Doğrudan hex değerleri
* Component içinde sabit RGB/HSL

Bunun yerine semantik design token kullan:

* background
* foreground
* surface
* surfaceElevated
* surfaceMuted
* primary
* primaryForeground
* secondary
* secondaryForeground
* accent
* accentForeground
* muted
* mutedForeground
* border
* input
* ring
* success
* warning
* danger
* info
* overlay
* readerBackground
* readerForeground

Tailwind kullanılıyorsa bu token’ları CSS variable’larına bağla.

En az şu modlar çalışsın:

* System
* Light
* Dark

Tema tercihleri sayfa yenilenmeden uygulanmalı ve kalıcı olmalı.

Tema ilk yüklemede yanlış renkte parlayıp sonra değişmemeli.

Aşağıdaki genişleme noktalarını hazırla:

* Site genelinde admin tarafından değiştirilebilir accent
* Hazır tema preset’leri
* Seri kapağından ileride türetilebilecek seri accent’i
* Kullanıcının özel tema seçebilmesi
* Reader için site temasından bağımsız arka plan seçimi

Seri accent’i kullanıldığında yalnızca sınırlı alanlarda uygulanmalı:

* Hero veya banner vurgusu
* Ana CTA
* Seçili sekme
* Küçük badge
* Hafif dekoratif arka plan

Tüm sayfayı kapağın rengine boyama.

Accent rengi uygun kontrast üretmiyorsa güvenli foreground rengi seç.

Tema token’ları için şu belgeleri oluştur:

* `docs/DESIGN_SYSTEM.md`
* `docs/THEMING.md`

Tema değiştirmek için component dosyalarını düzenlemek gerekmemeli.

# 10. Temel component sistemi

Yeniden kullanılabilir ve erişilebilir component’ler oluştur veya mevcutları düzenle:

* AppHeader
* MobileNavigation
* DesktopNavigation
* SearchTrigger
* SearchCommand
* ThemeSwitcher
* LocaleSwitcher
* SeriesCard
* SeriesPoster
* SectionHeader
* HorizontalSeriesRail
* ReleaseCard
* TranslationProfileBadge
* LanguageSelector
* QualitySelector
* ChapterList
* ChapterListItem
* ContinueReadingCard
* EmptyState
* ErrorState
* LoadingSkeleton
* Breadcrumbs
* Pagination
* FilterPanel
* ReaderToolbar
* ReaderImage
* ReaderProgress
* PreviousNextChapter
* Footer

Component API’leri gereksiz prop kalabalığına dönüşmesin.

Her component farklı sayfa için özel koşullarla dolu olmamalı.

Önce erişilebilir HTML semantiği kullan, sonra görsel stil ekle.

# 11. Sayfa yapıları

## 11.1 Ana sayfa

Ana sayfa şu sıralamayı temel alabilir:

1. Header
2. Kısa ve kontrollü hero/introduction
3. Giriş yapan veya local progress bulunan kullanıcı için “Okumaya Devam Et”
4. Son Eklenen Bölümler
5. Trend Seriler
6. Yüksek Kaliteli AI Çeviriler
7. Yeni Seriler
8. Türlere Göre Keşfet
9. Platformu açıklayan kısa, özgün ve kullanıcıya yararlı SEO metni
10. Footer

Ana sayfada yalnızca posterlerden oluşan metinsiz bir ekran yapma.

Gerçek bir H1 bulunsun.

Türkçe ana sayfa H1’i doğal biçimde webtoon, manga ve manhwa okuma amacını anlatmalı. Anahtar kelime doldurma yapma.

Hero mobil ekranın tamamını kaplamamalı.

## 11.2 Keşfet/katalog

Şunları destekle:

* Arama
* Tür
* İçerik formatı
* Yayın durumu
* Orijinal dil
* Mevcut çeviri dili
* Çeviri kalite profili
* İçerik derecelendirmesi
* Güncellenme tarihi
* Popülerlik

Filtreler URL query parametreleriyle temsil edilsin.

Browser back/forward düzgün çalışsın.

Filtre kombinasyonlarının tamamını indeksletme.

Sabit ve değerli landing sayfaları ayrı route olarak oluştur:

* Türkçe webtoon
* Türkçe manga
* Türkçe manhwa
* AI çevrilmiş webtoon
* Belirli ana genre sayfaları

Rastgele query kombinasyonları canonical landing sayfası üretmemeli.

## 11.3 Seri detay sayfası

Seri sayfasında:

* Cover
* Banner varsa banner
* Lokalize başlık
* Alternatif isimler
* Açıklama
* Yazar/çizer
* Türler ve tag’ler
* Format
* Durum
* Yayın yılı
* İçerik derecelendirmesi
* Dil seçenekleri
* Her dil altında kalite profilleri
* Önerilen sürüm
* Son bölüm
* Okumaya başla/devam et butonu
* Bölüm listesi
* Benzer seriler için ileride kullanılacak sınırlı alan
* Breadcrumb
* Güncellenme tarihi

Dil ve kalite seçimi anlaşılır olmalıdır.

Kullanıcının “AI Ultra ile AI Standart arasındaki fark nedir?” sorusuna arayüz kısa açıklamayla cevap verebilmelidir.

Kalite bilgisi yalnızca renkle anlatılmamalıdır.

## 11.4 Bölüm landing sayfası

SEO için gerçek bölüm landing sayfası oluştur.

Bu sayfada:

* Seri adı
* Bölüm numarası
* Bölüm başlığı
* Yayın tarihi
* Kullanılabilir diller
* Kullanılabilir çeviri sürümleri
* Önceki ve sonraki bölüm
* Seri sayfasına bağlantı
* Okumaya başla butonu
* Kısa açıklayıcı metadata
* Breadcrumb
* Structured data

Aynı bölümün farklı okuyucu varyantlarının birbirleriyle SEO rekabetine girmesini engelle.

## 11.5 Okuyucu

İlk sürümde yalnızca kaliteli bir temel dikey webtoon okuyucu uygula.

Gerekli özellikler:

* Sürekli dikey okuma
* Görsellerin doğru sıralanması
* Bilinen width/height ile layout shift önleme
* İlk kritik görseli öncelikli yükleme
* Aşağıdaki görselleri lazy load etme
* Hatalı görsel için retry
* Okuma ilerlemesini localStorage’da tutma
* Sayfa veya scroll oranını kaydetme
* Üst toolbar
* Seri ve bölüm bilgisi
* Önceki/sonraki bölüm
* Dil seçici
* Kalite profili seçici
* Seçenek değiştirilince mümkünse aynı bölümde kalma
* Basit reader arka planı seçimi
* Mobil safe area
* Klavyeyle temel gezinme
* Loading ve boş bölüm durumu

Şimdilik ekleme:

* Çift sayfa
* Sağdan sola manga modu
* Gelişmiş zoom
* Otomatik scroll
* Görsel filtreleri
* Dokunma bölgeleri
* Gelişmiş keybind editörü
* Sonsuz birden fazla bölüm
* Offline download

Ancak okuyucu mimarisi bu modların ileride eklenmesini imkânsızlaştırmamalı.

Reader route’larının varsayılan olarak arama sonuçlarında çoğalan ince sayfalar oluşturmasını engelle.

Önerilen ayrım:

* Bölüm landing sayfası: indekslenebilir
* Gerçek reader sayfası: `noindex, follow`
* Seri sayfası: indekslenebilir
* Arama sonuçları: `noindex, follow`
* Hesap ve özel sayfalar: `noindex`

# 12. URL ve çok dil mimarisi

URL’ler locale prefix içersin.

En az:

* `/tr`
* `/en`

Türkçe kullanıcıya mümkün olduğunca Türkçe path gösterilebilir:

* `/tr/kesfet`
* `/tr/seri/[slug]`
* `/tr/seri/[slug]/bolum/[chapter]`
* `/tr/oku/[seriesSlug]/[chapter]/[releaseId]`
* `/tr/tur/[genre]`

İngilizce karşılıkları:

* `/en/discover`
* `/en/series/[slug]`
* `/en/series/[slug]/chapter/[chapter]`
* `/en/read/[seriesSlug]/[chapter]/[releaseId]`
* `/en/genre/[genre]`

Mevcut next-intl route düzeni localized pathname’i güvenli biçimde desteklemiyorsa sistemi kıracak büyük bir yeniden yazım yapma. En azından locale prefix kullan ve path lokalizasyonunu belgelenmiş ikinci adıma bırak.

URL’lerde:

* Küçük harf
* Gereksiz ID yok
* Stabil slug
* Temiz chapter numarası
* Tracking parametresi canonical’a taşınmamalı
* Query parametre sırası canonical URL’yi değiştirmemeli

Slug değişikliği eski bağlantıyı kırmamalı.

# 13. Teknik SEO

Next.js’in App Router metadata özelliklerini kullan.

Her indekslenebilir sayfa için gerçek ve benzersiz metadata üret:

* title
* description
* canonical
* alternates
* hreflang
* Open Graph
* Twitter card
* robots
* locale
* image
* published time
* modified time

Root layout’ta doğru `metadataBase` kullan.

Site adı ve domain tek bir merkezi config üzerinden yönetilsin.

Örnek:

`apps/web/src/config/site.ts`

Bu config en az şunları içersin:

* siteName
* shortName
* description
* baseUrl
* defaultLocale
* supportedLocales
* social accounts
* theme defaults
* contact
* legal links

Kodun farklı yerlerinde site adını veya domaini tekrar tekrar hardcode etme.

## 13.1 Metadata örnek yaklaşımı

Türkçe ana sayfa:

`{SITE_NAME} | Türkçe Webtoon, Manga ve Manhwa Oku`

Seri sayfası:

`{SERIES_TITLE} Türkçe Oku | {SITE_NAME}`

Bölüm:

`{SERIES_TITLE} Bölüm {NUMBER} Türkçe Oku | {SITE_NAME}`

Ancak title’ları zorla aynı kalıba sokma. Lokalizasyonu ve kullanıcı niyetini dikkate al.

Meta description özgün ve sayfa verisinden türemiş olsun.

Meta description içinde var olmayan özellikleri iddia etme.

## 13.2 Sitemap

Programatik sitemap oluştur.

Sitemap’e yalnızca şu URL’leri ekle:

* Ana sayfalar
* Keşfet landing sayfaları
* Genre sayfaları
* Yayında ve indexable seri sayfaları
* Indexable bölüm landing sayfaları
* Statik bilgi sayfaları

Şunları ekleme:

* Reader varyantları
* İç arama
* Hesap sayfaları
* Admin
* Preview/draft
* Boş seri
* Silinmiş içerik
* Query filtre kombinasyonları
* Test sayfaları

URL sayısı büyüdüğünde sitemap parçalamaya uygun yapı kur.

`lastModified` gerçek veriden gelsin.

## 13.3 Robots

Dinamik `robots.ts` oluştur.

Production ve preview ortamlarını ayır.

Production dışındaki deployment’larda yanlışlıkla indekslenmeyi engelle.

Production robots içinde sitemap bağlantısı bulunsun.

Private ve teknik route’ları engelle.

CSS, JS ve indekslenmesi gereken görselleri gereksiz yere engelleme.

## 13.4 Canonical ve hreflang

Her indekslenebilir sayfada self canonical bulunmalı.

Türkçe ve İngilizce lokalizasyonlar arasında hreflang üret.

Mevcut olmayan locale için sahte alternate üretme.

Reader varyantları canonical olarak bölüm landing sayfasını gösterebilir veya noindex olmalıdır.

Filtre query’leri uygun sabit landing sayfasına canonical vermeli; alakasız tüm filtreleri ana sayfaya canonical verme.

## 13.5 Structured data

JSON-LD üretimi için merkezi ve type-safe yardımcılar oluştur.

Gerçek sayfa içeriğiyle tutarlı olduğu sürece şunları kullan:

Ana sayfa:

* Organization
* WebSite

Seri sayfası:

* ComicSeries
* BreadcrumbList

Bölüm landing sayfası:

* ComicIssue veya uygun CreativeWork/Chapter tipi
* BreadcrumbList
* isPartOf ilişkisi

Liste sayfaları:

* ItemList yalnızca görünen gerçek öğeleri temsil ettiğinde

Structured data’yı rich result garantisi gibi sunma.

Sayfada görünmeyen bilgileri JSON-LD’ye ekleme.

Kullanıcı puanı veya review verisi yoksa uydurma rating schema üretme.

JSON-LD içeriğini güvenli biçimde serialize et.

## 13.6 Open Graph görselleri

Ana sayfa, seri ve bölüm için dinamik veya şablon tabanlı Open Graph görselleri oluştur.

Seri OG görselinde:

* Cover
* Seri başlığı
* Platform adı
* İçerik türü
* Hedef dil veya bölüm bilgisi

bulunabilir.

Metin taşmalarını, uzun Korece/Japonca başlıkları ve Türkçe karakterleri test et.

## 13.7 İç bağlantılar

Googlebot ve JavaScript kapalı senaryolar için kritik navigasyon gerçek `<a>` bağlantıları üzerinden çalışmalıdır.

Şunlar birbirine bağlanmalı:

* Ana sayfa → seri
* Ana sayfa → genre
* Genre → seri
* Seri → bölüm
* Bölüm → seri
* Bölüm → önceki/sonraki
* Seri → yazar/çizer veya arama
* Çeviri profili açıklaması → ilgili bilgi sayfası

Sadece onClick ile çalışan navigasyon yapma.

## 13.8 Görsel SEO

Her poster ve banner için anlamlı alt metin oluştur.

Dekoratif görsellerde boş alt kullan.

Comic sayfasının içindeki metinleri alt attribute içine doldurma.

Cover görselleri crawl edilebilir URL’lerde olsun.

Width ve height bilgilerini sağla.

Görsel URL’lerini gereksiz query parametreleriyle sürekli değiştirme.

## 13.9 SEO metinleri

Ana sayfaya ve önemli landing sayfalarına kullanıcıya gerçekten yararlı kısa metinler ekle.

Örnek konu başlıkları:

* Türkçe webtoon nedir?
* Manga, manhwa ve webtoon farkları
* Çeviri kalite profilleri nasıl çalışır?
* AI Ultra ve AI Standart arasındaki fark
* Bölümlerin hangi aşamalardan geçtiği

Metinleri sırf anahtar kelime için tekrar etme.

Otomatik olarak yüzlerce düşük değerli landing sayfası üretme.

# 14. Arama

Mevcut Meilisearch entegrasyonunu kullan veya düzelt.

Arama index’i en az şunları içersin:

* Lokalize seri başlıkları
* Orijinal başlık
* Romanize başlık
* Alias’lar
* Yazar
* Çizer
* Genre
* Tag
* İçerik türü
* Yayın durumu
* Mevcut diller
* Mevcut çeviri profilleri
* Son güncellenme tarihi
* Popülerlik alanı

Türkçe karakterleri ve yazım farklılıklarını test et.

Arama input’u debounce kullansın.

Keyboard navigation desteklesin.

Loading, boş sonuç ve hata durumu olsun.

Meilisearch çalışmıyorsa development ortamında kullanıcıya anlaşılır hata göster veya sınırlı DB fallback sağla. Tüm sayfanın çökmesine izin verme.

İç arama sonuçlarını indeksletme.

Arama query’sini URL’de tut.

# 15. Performans

Aşağıdaki performans yaklaşımını uygula:

* Server Component varsayılanı
* Veri fetch işlemlerini paralel yap
* Client waterfall oluşturma
* Büyük JavaScript kütüphanelerini gerekmedikçe yükleme
* Kritik olmayan component’leri dinamik yükleme
* Görsellerde doğru `sizes`
* Poster ve banner için doğru responsive source
* İlk ekran görselini bilinçli priority etme
* Her görsele priority verme
* Reader görsellerini kademeli yükleme
* Fontları `next/font` veya mevcut optimize font sistemiyle yükleme
* Skeleton boyutlarını gerçek içerikle eşleştirme
* Layout shift önleme
* Cache ve revalidation stratejisini route türüne göre belirleme
* Seri ve katalog verileri için uygun server cache
* Kullanıcıya özel veriyi public cache’e koymama
* Meilisearch sorgularını gereksiz tekrar etmemek
* Bundle analiz edilebilir yapı

Seed verileriyle şu hedefleri amaçla:

* Lighthouse Performance: mobilde en az 90
* Accessibility: en az 90
* Best Practices: en az 90
* SEO: en az 95

Bu skorlar için işlevselliği bozma veya sahte optimizasyon yapma. Gerçek darboğazları ölç.

# 16. Erişilebilirlik

En az şunları uygula:

* Klavye navigasyonu
* Görünür focus state
* Skip-to-content
* Semantik heading sırası
* Form label’ları
* Dialog focus trap
* Escape ile kapanma
* Screen reader açıklamaları
* Sadece renkle anlatılmayan durumlar
* Yeterli kontrast
* Reduced motion
* Dokunmatik hedef boyutları
* Reader toolbar için erişilebilir isimler
* Locale switcher için doğru dil isimleri
* HTML `lang` değerinin locale’e göre değişmesi

# 17. Güvenlik ve yasal temel

Platformun temeli lisanslı, izinli veya kullanıcıya ait içerikler düşünülerek hazırlanmalıdır.

Başka sitelerden scraping veya izinsiz indirme kodu ekleme.

Haricî kaynak URL’lerini doğrudan proxy’leyen kontrolsüz endpoint yazma.

Şunlar için temel statik sayfalar veya placeholder metin alanları oluştur:

* Kullanım şartları
* Gizlilik
* Telif/hak sahibi iletişimi
* İçerik kaldırma talebi
* İletişim

Bu metinlerin hukuk danışmanlığı yerine geçmediğini README’de belirt.

Form veya API endpoint’i oluşturulursa:

* Zod validation
* Boyut sınırı
* Rate limiting için uygun hook
* CSRF/auth değerlendirmesi
* Güvenli hata mesajı
* Secret sızdırmama

uygula.

UGC bağlantıları ileride eklendiğinde `ugc` ve gerektiğinde `nofollow` desteğine uygun component oluştur.

Environment secret’larını client bundle’a koyma.

`.env.example` gerçek anahtar içermemeli.

# 18. Local development

Yeni geliştiricinin sistemi mümkün olduğunca az adımla çalıştırabilmesini sağla.

Mevcut Docker Compose altyapısını değerlendir.

İlk temel geliştirme için zorunlu olmayan ağır servisleri opsiyonel profile taşıyabilirsin.

Örneğin:

Zorunlu:

* PostgreSQL
* Meilisearch
* Cache
* Gerekliyse local S3/MinIO veya development storage adapter

Opsiyonel:

* ClickHouse
* HyperDX
* Gelişmiş monitoring

Ama mevcut mimariyi rastgele bozma.

Aşağıdaki akışı çalışır hâle getir:

1. Environment dosyasını kopyala
2. Docker servislerini başlat
3. Bağımlılıkları kur
4. Migration çalıştır
5. Seed çalıştır
6. Development server başlat

Root README’de kopyalanabilir komutlarla anlat.

Mümkünse tek bir bootstrap komutu ekle:

`pnpm setup:local`

Bu komut güvenli ve tekrar çalıştırılabilir olsun.

Production secret’ı üretip repoya kaydetme.

# 19. Testler

Mevcut test altyapısını kullan.

Yoksa projenin yapısına uygun hafif bir test sistemi kur.

En az şu testleri ekle:

## Unit

* Slug normalizasyonu
* Chapter sort
* Locale fallback
* Translation profile sıralaması
* Canonical URL üretimi
* Metadata title üretimi
* Robots kararı
* Structured data serialization
* Reader progress parse/validation

## Integration

* Bir serinin lokalizasyonları
* Bir bölümün çoklu çeviri sürümleri
* Varsayılan dil sürümünün seçilmesi
* Draft içeriğin public query’de görünmemesi
* Sitemap’e yalnızca indexable kayıtların girmesi
* Search document üretimi

## E2E

En az şu akışları Playwright ile test et:

1. Ana sayfa açılır.
2. Kullanıcı katalogdan seri seçer.
3. Seri sayfasında Türkçe dili seçer.
4. AI Ultra sürümünü seçer.
5. Bir bölümün landing sayfasına gider.
6. Reader’ı açar.
7. İlerleme kaydedilir.
8. Sayfa yenilenince ilerleme geri gelir.
9. Sonraki bölüme geçilir.
10. Tema değiştirilir.
11. Mobil viewport’ta navigasyon çalışır.
12. 404 sayfası doğru görünür.

SEO smoke test ekle:

* Tek H1
* Canonical mevcut
* Description mevcut
* Hreflang yalnızca var olan diller için
* Reader noindex
* Series indexable
* JSON-LD parse edilebilir
* Sitemap 200 döner
* Robots 200 döner

# 20. Dokümantasyon

Aşağıdaki dosyaları oluştur veya güncelle:

* `README.md`
* `AGENTS.md`
* `docs/FOUNDATION_AUDIT.md`
* `docs/ARCHITECTURE.md`
* `docs/DATA_MODEL.md`
* `docs/DESIGN_SYSTEM.md`
* `docs/THEMING.md`
* `docs/SEO.md`
* `docs/READER.md`
* `docs/LOCAL_DEVELOPMENT.md`
* `docs/UPSTREAM_SOURCES.md`
* `docs/ROADMAP.md`
* `docs/IMPLEMENTATION_STATUS.md`

`AGENTS.md`, sonraki Codex oturumlarında şu kuralları açıkça belirtmeli:

* Semantik renk token’ları kullan.
* Ham renk class’larını feature component’lerinde kullanma.
* Server Component varsayılan.
* SEO metadata olmadan public route ekleme.
* Yeni indexable route eklenirse sitemap kararını belirt.
* Yeni locale eklenirse hreflang ve metadata ekle.
* Yeni çeviri yapısı `ChapterRelease` modelini kullanmalı.
* Seri ve bölüm kavramlarını çeviri sürümüyle karıştırma.
* Reader route’ları varsayılan noindex olmalı.
* Telifli demo içerik ekleme.
* Mevcut lisansları koru.
* Typecheck, lint, test ve build çalıştır.
* Gerekmedikçe yeni bağımlılık ekleme.

# 21. Uygulama sırası

Çalışmayı şu sırayla yap:

## Aşama 1 — Kaynak ve baseline

* Repo hazırlığı
* Upstream ayarı
* Referans repo
* Mevcut build
* Denetim belgesi

## Aşama 2 — Veri temeli

* Prisma model değişiklikleri
* Migration
* Seed
* Repository/query katmanı
* Arama document modeli

## Aşama 3 — Design system

* Semantik token’lar
* Light/dark/system
* Site config
* Temel component’ler
* Storybook varsa örnekler

## Aşama 4 — Public sayfalar

* Ana sayfa
* Keşfet
* Genre landing
* Seri sayfası
* Bölüm landing
* 404/error/loading

## Aşama 5 — Reader

* Dikey okuyucu
* Release seçimi
* Progress
* Previous/next
* Noindex

## Aşama 6 — SEO

* Metadata
* Canonical
* Hreflang
* Sitemap
* Robots
* JSON-LD
* OG images
* Internal links

## Aşama 7 — Test ve kalite

* Unit
* Integration
* E2E
* Accessibility
* Build
* Lighthouse kontrolü

## Aşama 8 — Dokümantasyon

* README
* Mimari
* Roadmap
* Implementation status

Bir aşama kısmen tamamlandıysa bunu gizleme.

# 22. Git çalışma biçimi

Mümkünse mantıksal commit’ler oluştur:

1. `chore: audit upstream project and document foundation`
2. `feat: add multilingual comic and release domain model`
3. `feat: add semantic theme and design system`
4. `feat: build public discovery and series pages`
5. `feat: add chapter landing and basic webtoon reader`
6. `feat: implement technical seo foundation`
7. `test: cover critical platform flows`
8. `docs: document architecture and local setup`

Commit oluşturmadan önce:

* Format
* Lint
* Typecheck
* İlgili testler

çalıştır.

Kullanıcının mevcut commit geçmişini değiştirme.

Force push yapma.

# 23. Kabul kriterleri

Görev şu koşullar sağlanmadan tamamlanmış sayılmamalıdır:

* Proje temiz ortamda kurulabiliyor.
* Ana sayfa gerçek seed verisi gösteriyor.
* Katalog çalışıyor.
* Seri detay sayfası çalışıyor.
* Bir dil altında birden fazla çeviri kalite profili gösteriliyor.
* Bölüm landing sayfası çalışıyor.
* Basit dikey reader çalışıyor.
* Reader progress saklanıyor.
* Tema renkleri merkezi token’lardan değiştirilebiliyor.
* Feature component’lerinde rastgele ham renk bulunmuyor.
* Türkçe ve İngilizce arayüz çalışıyor.
* Public sayfalarda metadata bulunuyor.
* Canonical doğru.
* Hreflang doğru.
* Sitemap doğru.
* Robots doğru.
* Reader noindex.
* Structured data parse edilebilir.
* Mobil görünüm kullanılabilir.
* Typecheck geçiyor.
* Lint geçiyor.
* Build geçiyor.
* Kritik testler geçiyor.
* README kurulumu açıklıyor.
* Eksikler açık biçimde belgelenmiş.

# 24. Son rapor

İş bittikten sonra bana aşağıdaki formatta sonuç ver:

## Tamamlananlar

Gerçekten tamamlanan özellikler.

## Mimari kararlar

Önemli model ve teknoloji kararları.

## Değiştirilen temel dosyalar

Dosya yolları ve kısa açıklamaları.

## Veritabanı değişiklikleri

Yeni modeller, migration ve seed bilgisi.

## SEO durumu

Metadata, sitemap, robots, canonical, hreflang ve schema durumu.

## Test sonuçları

Çalıştırılan komutlar ve sonuçları.

## Çalıştırma komutları

Projeyi yerelde başlatmak için gereken kesin komutlar.

## Bilinen eksikler

Tamamlanamayan veya sonraya bırakılan işler.

## Sonraki en mantıklı adım

Yalnızca bir sonraki geliştirme aşamasını öner.

Rapor verirken yapılmayan bir şeyi yapılmış gibi gösterme.

Şimdi önce çalışma dizinini ve repoyu incele, kısa uygulama planını oluştur ve ardından doğrudan uygulamaya başla.
